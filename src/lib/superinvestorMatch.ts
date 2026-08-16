// src/lib/superinvestorMatch.ts
// Superinvestor-Aktivität für eine Ticker-Liste aus den lokalen 13F-Daten.
// Extrahiert aus api/portfolio/ai-analyse — wird auch vom Look-Through
// (/api/portfolio/lookthrough) genutzt, um effektive Positionen mit
// Superinvestor-Haltungen zu verschränken.
//
// Nur serverseitig verwenden: holdingsHistory ist ein großer statischer Import.

import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'

export interface SuperinvestorHolding {
  name: string
  trend: 'neu gekauft' | 'aufgestockt' | 'reduziert' | 'hält'
}

export interface SuperinvestorActivity {
  count: number
  investors: SuperinvestorHolding[]
}

const NOISE = new Set(['INC', 'INCORPORATED', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'LTD', 'LIMITED', 'PLC', 'LP', 'LLC', 'NV', 'SA', 'AG', 'SE', 'THE', 'OF', 'AND', '&', 'A', 'AN', 'CLASS', 'CL', 'SHS', 'NEW', 'DEL', 'COM', 'ORD', 'SER', 'SERIES'])
const ABBREVS: Record<string, string> = { 'HLDGS': 'HOLDINGS', 'CORP': 'CORPORATION', 'INC': 'INCORPORATED', 'INTL': 'INTERNATIONAL', 'TECH': 'TECHNOLOGY', 'TECHS': 'TECHNOLOGIES', 'GRP': 'GROUP', 'SVCS': 'SERVICES', 'FINL': 'FINANCIAL', 'MGMT': 'MANAGEMENT' }

function nameKey(name: string): string {
  const w = name.toUpperCase().replace(/[.,\-\/\\()&'"!]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ')
  return w.filter(x => !NOISE.has(x)).map(x => ABBREVS[x] || x).filter(x => !NOISE.has(x)).join('|')
}

// CUSIP- und Namens-Indizes einmal pro Prozess aufbauen (statische Daten)
let cusipIdx: Map<string, string> | null = null
let nameIdx: Map<string, string> | null = null

function buildIndexes() {
  if (cusipIdx && nameIdx) return
  cusipIdx = new Map<string, string>()
  nameIdx = new Map<string, string>()
  for (const s of stocks) {
    if (s.cusip) cusipIdx.set(s.cusip, s.ticker)
    const k = nameKey(s.name)
    if (k) nameIdx.set(k, s.ticker)
  }
}

function resolveTicker(pos: { ticker?: string | null; cusip?: string | null; name?: string | null }): string | null {
  if (pos.ticker) return pos.ticker
  if (pos.cusip) {
    const t = cusipIdx!.get(pos.cusip)
    if (t) return t
  }
  if (pos.name) {
    const k = nameKey(pos.name)
    if (k) {
      const t = nameIdx!.get(k)
      if (t) return t
    }
  }
  return null
}

/**
 * Ermittelt pro Ticker, welche Superinvestoren die Aktie aktuell halten und
 * wie sich ihre Position im letzten Quartal verändert hat.
 * Mini-Positionen (<100k$) werden ignoriert.
 */
export function getSuperinvestorActivity(tickers: string[]): Record<string, SuperinvestorActivity> {
  buildIndexes()

  const tickerSet = new Set(tickers.map(t => t.toUpperCase()))
  const result: Record<string, SuperinvestorActivity> = {}
  for (const t of tickerSet) result[t] = { count: 0, investors: [] }

  Object.entries(holdingsHistory).forEach(([slug, snapshots]) => {
    const inv = investors.find(i => i.slug === slug)
    if (!inv || !snapshots || snapshots.length === 0) return

    const latest = snapshots[snapshots.length - 1]?.data
    if (!latest?.positions) return

    const prev = snapshots.length >= 2 ? snapshots[snapshots.length - 2]?.data : null

    const holdsTickers = new Set<string>()
    for (const pos of latest.positions) {
      const t = resolveTicker(pos)
      if (!t || !tickerSet.has(t)) continue
      if ((pos.shares || 0) <= 0 || (pos.value || 0) < 100000) continue
      holdsTickers.add(t)
    }

    for (const ticker of holdsTickers) {
      let trend: SuperinvestorHolding['trend'] = 'hält'
      if (prev?.positions) {
        const curShares = latest.positions.filter((p: any) => resolveTicker(p) === ticker).reduce((s: number, p: any) => s + (p.shares || 0), 0)
        const prevShares = prev.positions.filter((p: any) => resolveTicker(p) === ticker).reduce((s: number, p: any) => s + (p.shares || 0), 0)
        if (prevShares === 0 && curShares > 0) trend = 'neu gekauft'
        else if (prevShares > 0) {
          const pct = ((curShares - prevShares) / prevShares) * 100
          if (pct > 5) trend = 'aufgestockt'
          else if (pct < -5) trend = 'reduziert'
        }
      }
      result[ticker].count++
      result[ticker].investors.push({ name: inv.name, trend })
    }
  })

  return result
}
