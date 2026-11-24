// src/lib/t212Sync.ts
// Automatischer Trading-212-Abgleich: Bericht anfordern, abholen, ins Depot
// übernehmen, danach Stückzahlen und Cash gegen Trading 212 prüfen. Nur lesend.
//
// Trading 212 erlaubt eine Berichtsanforderung je 30 Sekunden und eine Abfrage
// der Berichtsliste je Minute. Ein Lauf dauert deshalb ein bis zwei Minuten.

import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptSecret } from '@/lib/brokerSecrets'
import { importT212Reports } from '@/lib/t212Import'
import { accountCash, downloadReport, getAccountSummary, listPositions, listReports, requestReport, T212ApiError, type T212Position } from '@/lib/trading212'

const DAY = 86_400_000
/** Ein Bericht deckt höchstens ein Jahr ab */
const WINDOW_DAYS = 364
const MAX_WINDOWS = 8
/** Nachträglich gebuchte Dividenden und Korrekturen mitnehmen */
const OVERLAP_DAYS = 10
const POST_GAP_MS = 31_000
const LIST_GAP_MS = 61_000
const REPORT_READY_MS = 28_000
/** Ein Lauf, der so lange nichts meldet, gilt als abgebrochen */
const STALE_MS = 6 * 60_000

export interface T212Check {
  geprueft: number
  stimmen: number
  abweichungen: Array<{ name: string; symbol: string | null; trading212: number; finclue: number }>
  cash: { trading212: number; finclue: number } | null
  neu: number
  hinweise: string[]
}

export function t212ErrorMessage(err: unknown): string {
  if (err instanceof T212ApiError) {
    if (err.status === 401) return 'Trading 212 lehnt den Schlüssel ab. Bitte neu verbinden.'
    if (err.status === 403) return 'Dem Schlüssel fehlt eine Leseberechtigung (Konto, Portfolio, Verlauf).'
    if (err.status === 429) return 'Trading 212 bremst gerade. Der nächste Versuch läuft automatisch.'
    if (err.status === 408 || err.status >= 500) return 'Trading 212 antwortet gerade nicht. Der nächste Versuch läuft automatisch.'
  }
  return err instanceof Error && err.message.length < 200 ? err.message : 'Abgleich fehlgeschlagen'
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Ein Abgleich für einen Nutzer. `deadline` ist die Uhrzeit (ms), bis zu der
 * der Lauf fertig sein muss. Gibt null zurück, wenn schon einer läuft.
 */
export async function runT212Sync(db: SupabaseClient, userId: string, deadline: number, now = () => Date.now()): Promise<T212Check | null> {
  const startedAt = new Date(now()).toISOString()
  const { data: locked, error: readError } = await db
    .from('broker_t212_connections')
    .select('api_key_enc, api_secret_enc, portfolio_id, synced_until, sync_state, sync_started_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (readError) throw new Error(`Verbindung nicht lesbar (${readError.message})`)
  if (!locked) return null
  // Nur ein Lauf je Verbindung, abgebrochene Läufe blockieren nicht. Der Vergleich
  // mit dem gelesenen Startzeitpunkt entscheidet, wenn zwei gleichzeitig kommen.
  if (locked.sync_state === 'laeuft' && locked.sync_started_at && now() - Date.parse(locked.sync_started_at) < STALE_MS) return null
  const claim = db
    .from('broker_t212_connections')
    .update({ sync_state: 'laeuft', sync_started_at: startedAt, sync_message: 'Verbinde mit Trading 212', updated_at: startedAt }, { count: 'exact' })
    .eq('user_id', userId)
  const { count: claimed, error: lockError } = await (locked.sync_started_at ? claim.eq('sync_started_at', locked.sync_started_at) : claim.is('sync_started_at', null))
  if (lockError) throw new Error(`Verbindung nicht beschreibbar (${lockError.message})`)
  if (!claimed) return null

  const say = async (sync_message: string) => {
    await db.from('broker_t212_connections').update({ sync_message }).eq('user_id', userId)
  }
  try {
    if (!locked.portfolio_id) throw new Error('Kein Depot für Trading 212 ausgewählt.')
    const { data: portfolio } = await db.from('portfolios').select('id').eq('id', locked.portfolio_id).eq('user_id', userId).maybeSingle()
    if (!portfolio) throw new Error('Das verbundene Depot gibt es nicht mehr.')
    const key = decryptSecret(locked.api_key_enc)
    const secret = decryptSecret(locked.api_secret_enc)

    const summary = await getAccountSummary(key, secret)
    if ((summary.currency || '').toUpperCase() !== 'EUR') throw new Error(`Kontowährung ${summary.currency || 'unbekannt'} wird noch nicht unterstützt, nur EUR.`)

    // Geleertes oder neues Depot: ganzen Verlauf holen
    const { count } = await db.from('portfolio_transactions').select('id', { count: 'exact', head: true }).eq('portfolio_id', portfolio.id)
    const full = !locked.synced_until || !count
    const end = new Date(now())
    const reports = await fetchReports(key, secret, full ? null : new Date(Date.parse(locked.synced_until) - OVERLAP_DAYS * DAY), end, deadline, now, say)

    await say('Buchungen werden übernommen')
    const result = await importT212Reports(db, portfolio.id, reports)

    await say('Bestände werden geprüft')
    const check = await compare(db, portfolio.id, await listPositions(key, secret), result.symbolByIsin)
    const finished: T212Check = {
      ...check, neu: result.neu, hinweise: result.hinweise,
      cash: result.cash === null ? null : { trading212: accountCash(summary), finclue: result.cash },
    }
    const doneAt = new Date(now()).toISOString()
    await db.from('broker_t212_connections').update({
      sync_state: 'bereit', sync_message: null, synced_until: end.toISOString(), last_synced_at: doneAt, last_check: finished, status: 'connected', updated_at: doneAt,
    }).eq('user_id', userId)
    return finished
  } catch (err) {
    await db.from('broker_t212_connections').update({ sync_state: 'fehler', sync_message: t212ErrorMessage(err), updated_at: new Date(now()).toISOString() }).eq('user_id', userId)
    throw err
  }
}

/** from = null: rückwärts in Jahresschritten, bis ein Bericht leer ist */
async function fetchReports(
  key: string, secret: string, from: Date | null, end: Date, deadline: number, now: () => number, say: (text: string) => Promise<void>,
): Promise<string[]> {
  const windows: Array<{ id: number; from: Date; csv?: string }> = []
  let lastPost = -Infinity
  let lastList = -Infinity
  const wait = async (since: number, gap: number) => {
    const ms = since + gap - now()
    if (now() + Math.max(0, ms) > deadline) throw new Error('Trading 212 braucht länger als gedacht. Der nächste Versuch läuft automatisch.')
    if (ms > 0) await sleep(ms)
  }
  // Kurz vorher lief schon ein Abgleich (oder eine andere App): warten statt aufgeben
  const patient = async <T,>(call: () => Promise<T>, gap: number): Promise<T> => {
    try {
      return await call()
    } catch (err) {
      if (!(err instanceof T212ApiError) || err.status !== 429) throw err
      await say('Trading 212 bremst kurz, gleich geht es weiter')
      await wait(now(), gap)
      return call()
    }
  }
  const post = async (windowEnd: Date) => {
    const start = from && windowEnd.getTime() - from.getTime() <= WINDOW_DAYS * DAY ? from : new Date(windowEnd.getTime() - WINDOW_DAYS * DAY)
    await wait(lastPost, POST_GAP_MS)
    lastPost = now()
    windows.push({ id: await patient(() => requestReport(key, secret, start, windowEnd), POST_GAP_MS), from: start })
    lastPost = now()
  }
  const oldest = () => windows[windows.length - 1]

  await say('Bericht bei Trading 212 angefordert')
  await post(end)
  // Beim ersten Mal gleich das Jahr davor mit anfordern, das spart eine Runde
  if (!from) await post(oldest().from)
  else while (oldest().from.getTime() > from.getTime() && windows.length < MAX_WINDOWS) await post(oldest().from)
  for (;;) {
    // Der Bericht braucht meist 15 bis 25 Sekunden. Zu früh gefragt kostet eine ganze Minute.
    await wait(lastPost, REPORT_READY_MS)
    await wait(lastList, LIST_GAP_MS)
    lastList = now()
    const list = await patient(() => listReports(key, secret), LIST_GAP_MS)
    lastList = now()
    for (const w of windows) {
      if (w.csv !== undefined) continue
      const report = list.find(r => r.reportId === w.id)
      if (report?.status === 'Failed' || report?.status === 'Canceled') throw new Error('Trading 212 konnte den Bericht nicht erstellen. Der nächste Versuch läuft automatisch.')
      if (report?.status === 'Finished' && report.downloadLink) w.csv = await downloadReport(report.downloadLink)
    }
    if (windows.every(w => w.csv !== undefined)) {
      if (from || windows.length >= MAX_WINDOWS || rowCount(oldest().csv!) === 0) return windows.map(w => w.csv!)
      await say(`Verlauf vor ${oldest().from.getUTCFullYear() + 1} angefordert`)
      await post(oldest().from)
    } else {
      await say('Trading 212 erstellt den Bericht')
    }
  }
}

function rowCount(csv: string): number {
  return Math.max(0, csv.split(/\r?\n/).filter(l => l.trim()).length - 1)
}

async function compare(db: SupabaseClient, portfolioId: string, positions: T212Position[], symbolByIsin: Map<string, string>): Promise<Pick<T212Check, 'geprueft' | 'stimmen' | 'abweichungen'>> {
  const { data } = await db.from('portfolio_holdings').select('symbol, isin, name, quantity').eq('portfolio_id', portfolioId)
  const holdings = (data ?? []).map(h => ({ ...h, quantity: Number(h.quantity) || 0 }))
  const abweichungen: T212Check['abweichungen'] = []
  const used = new Set<string>()
  let stimmen = 0
  let geprueft = 0
  for (const p of positions) {
    if (!(p.quantity > 0)) continue
    geprueft++
    const isin = p.instrument?.isin?.toUpperCase() ?? ''
    const symbol = symbolByIsin.get(isin)
    const holding = holdings.find(h => (isin && h.isin?.toUpperCase() === isin) || (symbol && h.symbol === symbol))
    if (holding) used.add(holding.symbol)
    if (holding && Math.abs(holding.quantity - p.quantity) <= Math.max(0.0005, p.quantity * 0.0005)) stimmen++
    else abweichungen.push({ name: p.instrument?.name || isin, symbol: holding?.symbol ?? symbol ?? null, trading212: p.quantity, finclue: holding?.quantity ?? 0 })
  }
  for (const h of holdings) {
    if (used.has(h.symbol) || !(h.quantity > 0.0005)) continue
    geprueft++
    abweichungen.push({ name: h.name || h.symbol, symbol: h.symbol, trading212: 0, finclue: h.quantity })
  }
  return { geprueft, stimmen, abweichungen }
}
