// src/lib/investorQuarterSummary.ts
// Server-only: verdichtet das letzte 13F-Filing eines Investors zu einer
// Quartals-Zusammenfassung (Metadaten + Einstiegstext der Investor-Seite).
//
// Rechnet bewusst wie die Positions-Tabelle der Investor-Seite: Positionen
// werden je CUSIP zusammengeführt und über die Stückzahl mit dem Vorquartal
// verglichen. So passen "X neue Positionen" und die Tabelle darunter zusammen.

import type { Snapshot } from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { investorCiks } from '@/lib/cikMapping'
import { joinGerman, shortCompanyName } from '@/lib/displayFormat'

export type MoveKind = 'new' | 'increased' | 'reduced' | 'sold'

export interface QuarterMove {
  cusip: string
  ticker: string | null
  name: string
  kind: MoveKind
  /** Veränderung der Stückzahl in Prozent (nur aufgestockt/reduziert) */
  pctChange: number | null
  /** Ungefährer Wert der gekauften/verkauften Stücke in USD */
  deltaValue: number
}

export interface InvestorQuarterSummaryData {
  periodLabel: string // "Q3 2026"
  periodLong: string // "3. Quartal 2026"
  filingDate: string | null // ISO
  filingUrl: string | null
  positionCount: number
  totalValue: number
  top3: { name: string; ticker: string | null }[]
  top3Share: number // 0..1
  hasPrevious: boolean
  counts: Record<MoveKind, number>
  topBuys: QuarterMove[]
  topSells: QuarterMove[]
}

const stockByCusip = new Map(stocks.filter(s => s.cusip).map(s => [s.cusip as string, s]))

// 13F-Dateien sind nach Einreichungsquartal benannt — gehandelt wurde im Quartal davor.
export function reportQuarter(filingDate: string): { q: number; year: number } {
  const year = Number(filingDate.slice(0, 4))
  const filingQ = Math.ceil(Number(filingDate.slice(5, 7)) / 3)
  return filingQ === 1 ? { q: 4, year: year - 1 } : { q: filingQ - 1, year }
}

function titleCase(name: string): string {
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function describe(cusip: string, positions: Snapshot['data']['positions']) {
  const stock = stockByCusip.get(cusip)
  const original = positions.find(p => p.cusip === cusip)
  const ticker = original?.ticker || stock?.ticker || null
  const name = stock?.name ? shortCompanyName(stock.name) : titleCase(original?.name ?? cusip)
  return { ticker, name }
}

function mergeByCusip(positions: Snapshot['data']['positions']) {
  const map = new Map<string, { shares: number; value: number }>()
  for (const p of positions) {
    const prev = map.get(p.cusip)
    if (prev) {
      prev.shares += p.shares
      prev.value += p.value
    } else {
      map.set(p.cusip, { shares: p.shares, value: p.value })
    }
  }
  return map
}

function secFilingUrl(slug: string, accession?: string): string | null {
  if (!accession) return null
  const cik = parseInt(investorCiks[slug] ?? '', 10)
  if (!Number.isFinite(cik)) return null
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/${accession}-index.htm`
}

export function buildInvestorQuarterSummary(slug: string, snapshots: Snapshot[]): InvestorQuarterSummaryData | null {
  if (!snapshots.length) return null
  const latest = snapshots[snapshots.length - 1].data
  const previous = snapshots.length >= 2 ? snapshots[snapshots.length - 2].data : null
  if (!latest.date) return null

  const { q, year } = reportQuarter(latest.date)
  const current = mergeByCusip(latest.positions)
  const prev = previous ? mergeByCusip(previous.positions) : new Map<string, { shares: number; value: number }>()

  const sorted = Array.from(current.entries()).sort((a, b) => b[1].value - a[1].value)
  const totalValue = sorted.reduce((sum, [, p]) => sum + p.value, 0)

  const moves: QuarterMove[] = []
  if (previous) {
    for (const [cusip, cur] of current) {
      const before = prev.get(cusip)?.shares ?? 0
      const delta = cur.shares - before
      if (delta === 0) continue
      const price = cur.shares > 0 ? cur.value / cur.shares : 0
      const kind: MoveKind = before === 0 ? 'new' : delta > 0 ? 'increased' : 'reduced'
      moves.push({
        cusip,
        ...describe(cusip, latest.positions),
        kind,
        pctChange: before > 0 ? (delta / before) * 100 : null,
        deltaValue: Math.abs(delta) * price,
      })
    }
    for (const [cusip, before] of prev) {
      if (!current.has(cusip) && before.shares > 0) {
        moves.push({ cusip, ...describe(cusip, previous.positions), kind: 'sold', pctChange: null, deltaValue: before.value })
      }
    }
  }

  const counts: Record<MoveKind, number> = { new: 0, increased: 0, reduced: 0, sold: 0 }
  for (const m of moves) counts[m.kind]++

  const byValue = (a: QuarterMove, b: QuarterMove) => b.deltaValue - a.deltaValue
  const top3 = sorted.slice(0, 3)

  return {
    periodLabel: `Q${q} ${year}`,
    periodLong: `${q}. Quartal ${year}`,
    filingDate: latest.date,
    filingUrl: secFilingUrl(slug, latest.accession),
    positionCount: current.size,
    totalValue,
    top3: top3.map(([cusip]) => describe(cusip, latest.positions)),
    top3Share: totalValue > 0 ? top3.reduce((sum, [, p]) => sum + p.value, 0) / totalValue : 0,
    hasPrevious: !!previous,
    counts,
    topBuys: moves.filter(m => m.kind === 'new' || m.kind === 'increased').sort(byValue).slice(0, 3),
    topSells: moves.filter(m => m.kind === 'reduced' || m.kind === 'sold').sort(byValue).slice(0, 3),
  }
}

// 1 → "eine neue Position", 4 → "4 neue Positionen"
function count(n: number, singular: string, pluralForm: string) {
  return n === 1 ? `eine ${singular}` : `${n.toLocaleString('de-DE')} ${pluralForm}`
}

/** "Im 3. Quartal 2026 hat Warren Buffett eine neue Position eröffnet, 2 Positionen aufgestockt …" */
export function describeChanges(name: string, s: InvestorQuarterSummaryData): string {
  if (!s.hasPrevious) return `Das ist das erste erfasste 13F-Filing von ${name} auf Finclue.`
  const parts = [
    s.counts.new ? `${count(s.counts.new, 'neue Position', 'neue Positionen')} eröffnet` : '',
    s.counts.increased ? `${count(s.counts.increased, 'Position', 'Positionen')} aufgestockt` : '',
    s.counts.reduced ? `${count(s.counts.reduced, 'Position', 'Positionen')} reduziert` : '',
    s.counts.sold ? `${count(s.counts.sold, 'Position', 'Positionen')} komplett verkauft` : '',
  ].filter(Boolean)
  if (parts.length === 0) return `Im ${s.periodLong} hat ${name} keine Position verändert.`
  return `Im ${s.periodLong} hat ${name} ${joinGerman(parts)}.`
}
