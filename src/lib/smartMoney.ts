// src/lib/smartMoney.ts
// Server-only: aggregiert Käufe/Verkäufe der Superinvestoren über die gesamte
// 13F-Historie zu Events für den Smart-Money-Layer im Kurschart.
// ACHTUNG: importiert die komplette Holdings-Historie (~38 MB) — nie client-
// seitig importieren; Typen dafür liegen separat in smartMoney.types.ts.

import fs from 'fs'
import path from 'path'
import holdingsHistory from '@/data/holdings'
import { investors } from '@/data/investors'
import { investorCiks } from '@/lib/cikMapping'
import { getPositionTicker } from '@/lib/holdingsTicker'
import type { CongressEvent, InsiderEvent, SmartMoneyAction, SmartMoneyEvent } from './smartMoney.types'

// Nur echte Aktienpositionen werten: Puts/Calls würden falsche Kauf-/Verkaufs-
// signale erzeugen (Burrys Put-Position ist kein "Kauf"). Options-Events
// können später als eigener Event-Typ dazukommen.
function isStockPosition(p: { putCall?: string | null; optionType?: string }): boolean {
  if (p.putCall) return false
  return !p.optionType || p.optionType === 'STOCK'
}

// 13F-Dateien sind nach Filing-Quartal benannt (Einreichung bis 45 Tage nach
// Quartalsende) — gehandelt wurde im Quartal davor. Bevorzugt aus dem
// Filing-Datum abgeleitet, Fallback über den Quartals-Key des Snapshots.
function reportQuarterOf(snapshotQuarter: string, filedDate?: string | null): {
  quarter: string
  start: string
  end: string
} | null {
  let year: number
  let filingQ: number

  if (filedDate && /^\d{4}-\d{2}/.test(filedDate)) {
    year = Number(filedDate.slice(0, 4))
    filingQ = Math.ceil(Number(filedDate.slice(5, 7)) / 3)
  } else {
    const m = snapshotQuarter.match(/^(\d{4})-Q([1-4])$/)
    if (!m) return null
    year = Number(m[1])
    filingQ = Number(m[2])
  }

  let q = filingQ - 1
  if (q === 0) {
    q = 4
    year -= 1
  }

  const QUARTER_RANGES: Record<number, [string, string]> = {
    1: ['01-01', '03-31'],
    2: ['04-01', '06-30'],
    3: ['07-01', '09-30'],
    4: ['10-01', '12-31'],
  }
  const [start, end] = QUARTER_RANGES[q]
  return { quarter: `${year}-Q${q}`, start: `${year}-${start}`, end: `${year}-${end}` }
}

function filingUrl(slug: string, accession?: string | null): string | null {
  if (!accession) return null
  const clean = accession.trim()
  const cikRaw = (investorCiks as Record<string, string>)[slug]
  if (cikRaw) {
    const cik = parseInt(cikRaw, 10)
    if (Number.isFinite(cik)) {
      return `https://www.sec.gov/Archives/edgar/data/${cik}/${clean.replace(/-/g, '')}/${clean}-index.htm`
    }
  }
  // Ohne CIK: EDGAR-Volltextsuche nach der Accession-Nummer
  return `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(`"${clean}"`)}`
}

export function getSuperinvestorEvents(ticker: string): SmartMoneyEvent[] {
  const upper = ticker.toUpperCase()
  const events: SmartMoneyEvent[] = []

  for (const [slug, snapshots] of Object.entries(holdingsHistory)) {
    if (!snapshots || snapshots.length < 2) continue
    const investorInfo = investors.find(inv => inv.slug === slug)

    const sorted = [...snapshots].sort((a, b) => a.quarter.localeCompare(b.quarter))

    // Bestand des Tickers pro Snapshot (gemergt über CUSIP-Varianten)
    const series = sorted.map(snap => {
      let shares = 0
      let value = 0
      let totalValue = 0
      for (const p of snap.data?.positions ?? []) {
        const v = p.value || 0
        totalValue += v
        if (!isStockPosition(p)) continue
        if (getPositionTicker(p) === upper) {
          shares += p.shares || 0
          value += v
        }
      }
      return { snap, shares, value, totalValue }
    })

    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1]
      const curr = series[i]
      const delta = curr.shares - prev.shares

      let action: SmartMoneyAction | null = null
      if (prev.shares === 0 && curr.shares > 0) {
        action = 'new'
      } else if (prev.shares > 0 && curr.shares === 0) {
        action = 'exit'
      } else if (prev.shares > 0 && curr.shares > 0) {
        // Schwellen wie im Super-Investors-Tab: ≥1 % und ≥ max(1000, 0,1 % Bestand)
        const pct = (delta / prev.shares) * 100
        const minShares = Math.max(1000, prev.shares * 0.001)
        if (Math.abs(delta) >= minShares && Math.abs(pct) >= 1.0) {
          action = delta > 0 ? 'add' : 'trim'
        }
      }
      if (!action) continue

      const filedDate = curr.snap.data?.date ?? null
      const rq = reportQuarterOf(curr.snap.quarter, filedDate)
      if (!rq) continue

      events.push({
        source: 'superinvestor',
        action,
        reportQuarter: rq.quarter,
        quarterStart: rq.start,
        quarterEnd: rq.end,
        filedDate,
        actor: {
          slug,
          name: investorInfo?.name || slug,
          imageUrl: investorInfo?.imageUrl ?? null,
        },
        shares: curr.shares,
        sharesChange: delta,
        changePct: action === 'new' ? null
          : action === 'exit' ? -100
          : (delta / prev.shares) * 100,
        valueUsd: action === 'exit' ? prev.value : curr.value,
        pctOfPortfolio: action !== 'exit' && curr.totalValue > 0
          ? (curr.value / curr.totalValue) * 100
          : null,
        sourceUrl: filingUrl(slug, curr.snap.data?.accession),
      })
    }
  }

  events.sort((a, b) =>
    a.quarterStart.localeCompare(b.quarterStart) || b.valueUsd - a.valueUsd
  )
  return events
}

// ─── Insider-Events (Form 4 via FMP) ─────────────────────────────────────────

// typeOfOwner kommt als "officer: SVP, GC and Secretary" / "director" /
// "10 percent owner" — auf eine kurze Rolle eindampfen
function shortRole(typeOfOwner?: string | null): string | null {
  if (!typeOfOwner) return null
  const t = typeOfOwner.toLowerCase()
  if (t.includes('chief executive') || /\bceo\b/.test(t)) return 'CEO'
  if (t.includes('chief financial') || /\bcfo\b/.test(t)) return 'CFO'
  if (t.includes('10 percent')) return '10%-Eigner'
  if (t.includes('director')) return 'Director'
  if (t.startsWith('officer')) {
    const detail = typeOfOwner.split(':')[1]?.trim()
    return detail ? detail.slice(0, 28) : 'Officer'
  }
  return typeOfOwner.slice(0, 28)
}

// Cluster-Buy: ≥3 verschiedene Insider kaufen innerhalb von 30 Tagen —
// das statistisch stärkste Insider-Signal
function flagClusterBuys(events: InsiderEvent[]): void {
  const buys = events
    .filter(e => e.action === 'buy')
    .sort((a, b) => a.date.localeCompare(b.date))

  const DAY_MS = 24 * 60 * 60 * 1000
  for (let i = 0; i < buys.length; i++) {
    const start = new Date(buys[i].date).getTime()
    const window: InsiderEvent[] = []
    for (let j = i; j < buys.length; j++) {
      if (new Date(buys[j].date).getTime() - start > 30 * DAY_MS) break
      window.push(buys[j])
    }
    const distinct = new Set(window.map(e => e.actor.name))
    if (distinct.size >= 3) {
      for (const e of window) e.clusterBuy = true
    }
  }
}

/**
 * Insider-Käufe/-Verkäufe (Form 4, tagesgenau) via FMP.
 * Nur echte Open-Market-Trades (P-Purchase / S-Sale) — Options-Ausübungen,
 * Awards und Steuer-Einbehalte (M/A/F/G…) sind Signal-Rauschen.
 * Fehler ⇒ leere Liste, damit die Route nie am Insider-Teil scheitert.
 */
export async function getInsiderEvents(ticker: string): Promise<InsiderEvent[]> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return []

  const upper = ticker.toUpperCase()
  const PAGES = 3 // 3 × 100 Transaktionen ≈ mehrere Jahre Historie

  try {
    const pages = await Promise.all(
      Array.from({ length: PAGES }, (_, page) =>
        fetch(
          `https://financialmodelingprep.com/api/v4/insider-trading?symbol=${upper}&page=${page}&apikey=${apiKey}`,
          { signal: AbortSignal.timeout(10000), next: { revalidate: 3600 } }
        )
          .then(res => (res.ok ? res.json() : []))
          .catch(() => [])
      )
    )

    const events: InsiderEvent[] = []
    for (const raw of pages.flat()) {
      const type: string = raw?.transactionType || ''
      const isBuy = type.startsWith('P-')
      const isSell = type.startsWith('S-')
      if (!isBuy && !isSell) continue

      const shares = Number(raw.securitiesTransacted) || 0
      const price = Number(raw.price) || 0
      if (shares <= 0 || price <= 0 || !raw.transactionDate || !raw.reportingName) continue

      const valueUsd = shares * price
      // Mikro-Trades (< 10K $) sind Chart-Rauschen
      if (valueUsd < 10_000) continue

      events.push({
        source: 'insider',
        action: isBuy ? 'buy' : 'sell',
        date: String(raw.transactionDate).slice(0, 10),
        actor: {
          name: raw.reportingName,
          role: shortRole(raw.typeOfOwner),
        },
        shares,
        price,
        valueUsd,
        clusterBuy: false,
        sourceUrl: raw.link || null,
      })
    }

    flagClusterBuys(events)
    events.sort((a, b) => a.date.localeCompare(b.date))
    return events
  } catch {
    return []
  }
}

// ─── Kongress-Events (PTR-Meldungen) ─────────────────────────────────────────

const CONGRESS_DATA_DIR = path.join(process.cwd(), 'src/data/politician-trades')

// PTR-Beträge kommen als Spanne: "$500,001 - $1,000,000"
function parseAmountRange(amount?: string | null): { min: number; max: number } {
  if (!amount) return { min: 0, max: 0 }
  const clean = amount.replace(/[\$,\s]/g, '')
  const match = clean.match(/(\d+)-(\d+)/)
  if (match) return { min: parseInt(match[1], 10), max: parseInt(match[2], 10) }
  const over = clean.match(/over(\d+)/i)
  if (over) return { min: parseInt(over[1], 10), max: parseInt(over[1], 10) * 2 }
  const num = parseInt(clean.replace(/\D/g, ''), 10)
  return { min: num || 0, max: num || 0 }
}

function formatAmountCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return String(v)
}

function formatAmountRangeDE(amount?: string | null): { label: string; mid: number } {
  const { min, max } = parseAmountRange(amount)
  if (max <= 0) return { label: 'Betrag unbekannt', mid: 0 }
  return {
    label: `${formatAmountCompact(min)}–${formatAmountCompact(max)} $`,
    mid: (min + max) / 2,
  }
}

function shortParty(party?: string | null): string | null {
  if (!party) return null
  const p = party.toLowerCase()
  if (p.startsWith('republican')) return 'R'
  if (p.startsWith('democrat')) return 'D'
  if (p.startsWith('independent')) return 'I'
  return party.charAt(0).toUpperCase()
}

// Einmalig beim ersten Zugriff: alle Politiker-Dateien (~130 Stück, ~9K Trades)
// zu einem Per-Ticker-Index aggregieren und im Modul-Scope cachen.
// Gleiches fs-Pattern wie /api/politicians/top-buys — läuft so bereits in Prod.
let congressIndexCache: Map<string, CongressEvent[]> | null = null

function loadCongressIndex(): Map<string, CongressEvent[]> {
  if (congressIndexCache) return congressIndexCache

  const map = new Map<string, CongressEvent[]>()
  try {
    // Meta (Partei, Kammer, Foto) aus dem Index
    const meta = new Map<string, { party: string | null; chamber: 'house' | 'senate' | null; photoUrl: string | null }>()
    try {
      const indexRaw = JSON.parse(fs.readFileSync(path.join(CONGRESS_DATA_DIR, 'index.json'), 'utf8'))
      for (const p of indexRaw as any[]) {
        if (p?.slug) {
          meta.set(p.slug, {
            party: shortParty(p.party),
            chamber: p.chamber === 'house' || p.chamber === 'senate' ? p.chamber : null,
            photoUrl: p.photoUrl || null,
          })
        }
      }
    } catch {
      // Index fehlt → Events kommen ohne Partei/Foto
    }

    for (const file of fs.readdirSync(CONGRESS_DATA_DIR)) {
      if (!file.endsWith('.json') || file === 'index.json') continue
      let parsed: any
      try {
        parsed = JSON.parse(fs.readFileSync(path.join(CONGRESS_DATA_DIR, file), 'utf8'))
      } catch {
        continue
      }
      const slug: string = parsed?.slug || file.replace(/\.json$/, '')
      const m = meta.get(slug)

      for (const t of parsed?.trades ?? []) {
        const ticker = String(t?.ticker || '').toUpperCase().trim()
        if (!ticker || !t?.transactionDate) continue
        const type = String(t?.type || '').toLowerCase()
        // exchange/receive sind keine Kauf-/Verkaufssignale
        const action = type === 'purchase' ? 'buy' : type.startsWith('sale') ? 'sell' : null
        if (!action) continue

        const { label, mid } = formatAmountRangeDE(t.amount)
        const event: CongressEvent = {
          source: 'congress',
          action,
          date: String(t.transactionDate).slice(0, 10),
          disclosedDate: t.disclosureDate ? String(t.disclosureDate).slice(0, 10) : null,
          actor: {
            slug,
            name: parsed?.name || t.representative || slug,
            party: m?.party ?? null,
            chamber: m?.chamber ?? (parsed?.chamber === 'house' || parsed?.chamber === 'senate' ? parsed.chamber : null),
            state: parsed?.state || t.state || null,
            photoUrl: m?.photoUrl ?? null,
          },
          amountRange: label,
          amountMidUsd: mid,
          owner: t.owner || null,
          sourceUrl: t.link || null,
        }

        const list = map.get(ticker)
        if (list) list.push(event)
        else map.set(ticker, [event])
      }
    }

    map.forEach(list => list.sort((a, b) => a.date.localeCompare(b.date)))
  } catch {
    // Verzeichnis nicht lesbar → leerer Index, Route funktioniert trotzdem
  }

  congressIndexCache = map
  return map
}

export function getCongressEvents(ticker: string): CongressEvent[] {
  return loadCongressIndex().get(ticker.toUpperCase()) ?? []
}
