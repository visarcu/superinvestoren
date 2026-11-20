// Einmaliger Backfill: Earnings-Termine aus FMP für die Zeit vor dem
// NASDAQ-Import (der läuft erst seit 21.04.2026) in SecEarningsCalendar ergänzen.
//
// Hintergrund: Für die "typische Kursbewegung nach Zahlen" braucht jede Aktie
// mindestens 4 vergangene Termine. Vor April 2026 gibt es in der Tabelle nur
// die SEC-8-K-Termine (bei weitem nicht alle Firmen). FMP kennt die Termine
// samt Ist-Zahlen.
//
// Eingefügt wird nur, was fehlt:
//   • nur Ticker, die schon in der Tabelle stehen (also bekannte US-Listings)
//   • nur Termine mit Ist-Zahlen (= haben stattgefunden)
//   • nur wenn für den Ticker kein Termin in ±4 Tagen existiert
// Ohne Uhrzeit (FMP liefert keine); die Kursreaktion nimmt dann den größeren
// der beiden Tagesschritte um den Termin.
//
// Aufruf: npx tsx --tsconfig tsconfig.json scripts/backfillEarningsHistory.ts [from] [to]
// Default: 2024-01-01 bis 2026-04-20

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import {
  addDays,
  dayDiff,
  fetchFmpEarningsRange,
  isIsoDate,
  normalizeSymbol,
  num,
  plausibleEps,
  plausibleRevenue,
} from '../src/lib/earningsData'

dotenv.config({ path: '.env.local' })

const MATCH_WINDOW_DAYS = 4
const CHUNK_DAYS = 7
const PAGE_SIZE = 1000
const INSERT_BATCH = 500

interface ExistingRow {
  ticker: string
  date: string
  company_name: string | null
  market_cap: number | null
}

async function main() {
  const from = process.argv[2] ?? '2024-01-01'
  const to = process.argv[3] ?? '2026-04-20'
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) throw new Error('from/to als YYYY-MM-DD, from ≤ to')

  const apiKey = process.env.FMP_API_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!apiKey || !url || !key) throw new Error('FMP_API_KEY / Supabase-Variablen fehlen')
  const supabase = createClient(url, key)

  // Bestehende Termine je Ticker (alle Zeilen, auch überholte, damit nichts doppelt entsteht)
  const byTicker = new Map<string, { dates: string[]; name: string | null; marketCap: number | null }>()
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('SecEarningsCalendar')
      .select('ticker, date, company_name, market_cap')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`DB lesen: ${error.message}`)
    const page = (data as ExistingRow[] | null) ?? []
    for (const r of page) {
      const entry = byTicker.get(r.ticker) ?? { dates: [], name: null, marketCap: null }
      entry.dates.push(r.date)
      entry.name = entry.name ?? r.company_name
      if (r.market_cap !== null && (entry.marketCap === null || r.market_cap > entry.marketCap)) entry.marketCap = r.market_cap
      byTicker.set(r.ticker, entry)
    }
    if (page.length < PAGE_SIZE) break
  }
  console.log(`${byTicker.size} Ticker in der Tabelle`)

  const nowIso = new Date().toISOString()
  let inserted = 0
  let skippedExisting = 0
  for (let chunkFrom = from; chunkFrom <= to; chunkFrom = addDays(chunkFrom, CHUNK_DAYS)) {
    const chunkTo = addDays(chunkFrom, CHUNK_DAYS - 1) < to ? addDays(chunkFrom, CHUNK_DAYS - 1) : to
    const fmpRows = await fetchFmpEarningsRange(chunkFrom, chunkTo, apiKey)

    const records = new Map<string, Record<string, unknown>>()
    for (const r of fmpRows) {
      if (!r.symbol || !isIsoDate(r.date)) continue
      let epsActual = num(r.epsActual)
      let revenueActual = num(r.revenueActual)
      if (epsActual === null && revenueActual === null) continue // nicht gemeldet

      const ticker = normalizeSymbol(r.symbol)
      const entry = byTicker.get(ticker)
      if (!entry) continue
      if (entry.dates.some(d => dayDiff(d, r.date!) <= MATCH_WINDOW_DAYS)) {
        skippedExisting++
        continue
      }

      let epsEstimate = num(r.epsEstimated)
      if (!plausibleEps(epsActual, epsEstimate)) {
        epsActual = null
        epsEstimate = null
      }
      let revenueEstimate = num(r.revenueEstimated)
      if (!plausibleRevenue(revenueActual, revenueEstimate)) {
        revenueActual = null
        revenueEstimate = null
      }

      records.set(`${ticker}|${r.date}`, {
        ticker,
        company_name: entry.name,
        date: r.date,
        fiscal_quarter: null,
        fiscal_year: null,
        eps_actual: epsActual,
        eps_estimate: epsEstimate,
        revenue_actual: revenueActual !== null ? Math.round(revenueActual) : null,
        revenue_estimate: revenueEstimate !== null ? Math.round(revenueEstimate) : null,
        call_time: null,
        market_cap: entry.marketCap,
        is_upcoming: false,
        confirmed: true,
        source: 'fmp-history',
        updated_at: nowIso,
      })
      entry.dates.push(r.date!) // innerhalb des Laufs keine zweite Zeile im ±4-Tage-Fenster
    }

    const batch = Array.from(records.values())
    for (let i = 0; i < batch.length; i += INSERT_BATCH) {
      const { error } = await supabase
        .from('SecEarningsCalendar')
        .upsert(batch.slice(i, i + INSERT_BATCH), { onConflict: 'ticker,date', ignoreDuplicates: true })
      if (error) throw new Error(`DB schreiben ${chunkFrom}: ${error.message}`)
    }
    inserted += batch.length
    console.log(`${chunkFrom} bis ${chunkTo}: ${fmpRows.length} FMP-Zeilen, ${batch.length} neu`)
  }

  console.log(`Fertig: ${inserted} Termine ergänzt, ${skippedExisting} schon vorhanden`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
