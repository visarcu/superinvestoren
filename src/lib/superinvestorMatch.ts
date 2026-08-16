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

// Cross-Listings: lokale Börsen-Ticker → US-Listing/ADR, wie es in
// 13F-Filings auftaucht. Ohne diese Map bekämen ETF-Bestandteile wie
// 2330.TW (TSMC) oder Direktpositionen wie NOV.DE (Novo Nordisk) nie
// Superinvestor-Treffer, obwohl die Investoren dieselbe Firma via ADR halten.
// Kuratiert auf Werte mit realer 13F-Präsenz — bei Neuzugängen hier ergänzen.
export const US_LISTING_BY_LOCAL: Record<string, string> = {
  // Taiwan / Asien
  '2330.TW': 'TSM', '2330.TWO': 'TSM',
  '9988.HK': 'BABA', 'BABA.SW': 'BABA',
  '0700.HK': 'TCEHY', '700.HK': 'TCEHY',
  '7203.T': 'TM',   // Toyota
  '6758.T': 'SONY', // Sony
  '005930.KS': 'SSNLF', // Samsung (OTC, selten in 13F — schadet nicht)
  // Europa: Ordinaries → NYSE/Nasdaq-Listing bzw. ADR
  'ASML.AS': 'ASML', 'ASME.DE': 'ASML',
  'SAP.DE': 'SAP',
  'NOV.DE': 'NVO', 'NOVO-B.CO': 'NVO', 'NOVOB.CO': 'NVO',
  'AZN.L': 'AZN', 'AZN.ST': 'AZN',
  'SHEL.L': 'SHEL',
  'ULVR.L': 'UL',
  'BATS.L': 'BTI',
  'HSBA.L': 'HSBC',
  'RIO.L': 'RIO',
  'BHP.L': 'BHP', 'BHP.AX': 'BHP',
  'GSK.L': 'GSK',
  'BP.L': 'BP',
  'NESN.SW': 'NSRGY',  // Nestlé
  'ROG.SW': 'RHHBY',   // Roche
  'NOVN.SW': 'NVS',    // Novartis
  'MC.PA': 'LVMUY',    // LVMH
  'TTE.PA': 'TTE',     // TotalEnergies
  'SAN.PA': 'SNY',     // Sanofi
  'SPOT.SW': 'SPOT',
}

/** Lokalen Ticker auf sein US-Listing normalisieren (für 13F-Matching) */
function toUsListing(ticker: string): string {
  return US_LISTING_BY_LOCAL[ticker.toUpperCase()] || ticker.toUpperCase()
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
 * Lokale Listings (2330.TW, NOV.DE, ULVR.L …) werden vor dem Matching auf
 * ihr US-Listing normalisiert — das Ergebnis bleibt unter dem ORIGINAL-Ticker
 * abrufbar. Mini-Positionen (<100k$) werden ignoriert.
 */
export function getSuperinvestorActivity(tickers: string[]): Record<string, SuperinvestorActivity> {
  buildIndexes()

  // Original → US-Listing; das Matching läuft über die US-Ticker
  const usByOriginal = new Map<string, string>()
  for (const t of tickers) usByOriginal.set(t.toUpperCase(), toUsListing(t))

  const tickerSet = new Set(usByOriginal.values())
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

  // Ergebnis zurück auf die Original-Ticker mappen (2330.TW zeigt TSM-Treffer)
  const byOriginal: Record<string, SuperinvestorActivity> = {}
  for (const [original, usTicker] of Array.from(usByOriginal.entries())) {
    byOriginal[original] = result[usTicker] || { count: 0, investors: [] }
  }
  return byOriginal
}
