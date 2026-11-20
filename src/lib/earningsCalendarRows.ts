// Hilfen für die Tabelle "SecEarningsCalendar" (NASDAQ + SEC 8-K).
//
// Verschiebt NASDAQ einen Termin, legt der Import (Upsert auf ticker+date)
// eine neue Zeile an und die alte, vorläufige bleibt liegen — z.B. TSLA Q3/26:
// vorläufig 28.10. ohne Uhrzeit, tatsächlich 21.10. nach Börsenschluss. Ohne
// Bereinigung steht die Firma dann zweimal im Kalender, oft in verschiedenen
// Wochen oder Monaten.
//
// Überholte Zeilen werden nicht gelöscht, sondern mit confirmed=false markiert.
// Listet NASDAQ den alten Termin wieder, setzt der Import confirmed=true zurück.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface EarningsRowRankFields {
  date: string
  source: string | null
  call_time: string | null
  eps_actual: number | null
  revenue_actual: number | null
  updated_at?: string | null
}

/**
 * Ist `row` eher der echte Termin als `current` (beide dasselbe Quartal)?
 *   1) NASDAQ vor SEC-8-K (ein 8-K kann auch Produktionszahlen o.ä. sein)
 *   2) mit Ist-Zahlen vor ohne — dann hat der Termin stattgefunden
 *   3) mit bestätigter Uhrzeit (vor/nach Börse) vor ohne
 *   4) zuletzt vom Import aktualisiert (vorläufige Zeilen veralten)
 *   5) späteres Datum
 */
export function isBetterEarningsRow(row: EarningsRowRankFields, current: EarningsRowRankFields): boolean {
  const keys: Array<(r: EarningsRowRankFields) => number | string> = [
    r => (r.source === 'nasdaq-public' ? 1 : 0),
    r => (r.eps_actual !== null || r.revenue_actual !== null ? 1 : 0),
    r => (r.call_time ? 1 : 0),
    r => r.updated_at ?? '',
    r => r.date,
  ]
  for (const key of keys) {
    const a = key(row)
    const b = key(current)
    if (a !== b) return a > b
  }
  return false
}

interface DedupRow extends EarningsRowRankFields {
  id: string
  ticker: string
  fiscal_quarter: string | null
  fiscal_year: number | null
  confirmed: boolean
}

const PAGE_SIZE = 1000
const UPSERT_BATCH = 500

/**
 * Markiert in [from, to] je Ticker+Quartal alle NASDAQ-Zeilen außer der
 * besten als überholt (confirmed=false) und die beste als bestätigt.
 * Den Zeitraum großzügig wählen (± einige Wochen), damit beide Zeilen einer
 * Verschiebung im Fenster liegen.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tabelle ist nicht im generierten Schema
export async function markSupersededEarningsRows(supabase: SupabaseClient<any, 'public', any>, from: string, to: string) {
  const rows: DedupRow[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('SecEarningsCalendar')
      .select('id, ticker, date, fiscal_quarter, fiscal_year, source, call_time, eps_actual, revenue_actual, updated_at, confirmed')
      .eq('source', 'nasdaq-public')
      .not('fiscal_quarter', 'is', null)
      .gte('date', from)
      .lte('date', to)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`Duplikate lesen: ${error.message}`)
    const page = (data as DedupRow[] | null) ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  const groups = new Map<string, DedupRow[]>()
  for (const r of rows) {
    const key = `${r.ticker}|${r.fiscal_quarter}|${r.fiscal_year}`
    const list = groups.get(key) ?? []
    list.push(r)
    groups.set(key, list)
  }

  const changes: Array<{ id: string; ticker: string; date: string; confirmed: boolean }> = []
  let duplicateGroups = 0
  for (const list of groups.values()) {
    if (list.length < 2) continue
    duplicateGroups++
    const winner = list.reduce((best, r) => (isBetterEarningsRow(r, best) ? r : best))
    for (const r of list) {
      const confirmed = r === winner
      if (r.confirmed !== confirmed) changes.push({ id: r.id, ticker: r.ticker, date: r.date, confirmed })
    }
  }

  for (let i = 0; i < changes.length; i += UPSERT_BATCH) {
    const { error } = await supabase
      .from('SecEarningsCalendar')
      .upsert(changes.slice(i, i + UPSERT_BATCH), { onConflict: 'id' })
    if (error) throw new Error(`Duplikate markieren: ${error.message}`)
  }

  return {
    rows: rows.length,
    duplicateGroups,
    superseded: changes.filter(c => !c.confirmed).length,
    reconfirmed: changes.filter(c => c.confirmed).length,
  }
}
