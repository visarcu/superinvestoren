// scripts/buildHomepageHighlights.ts
// Verdichtet die aktuelle 13F-Saison zu einer kleinen JSON-Datei für die
// Startseite (meistgekaufte/-verkaufte Aktien, größte neue Positionen).
//
// Warum vorberechnet: Die komplette Holdings-Historie ist ~38 MB groß. Auf der
// Startseite importiert würde sie jeden Kaltstart und den Vercel-Build
// belasten. Die Daten ändern sich nur mit neuen 13F-Filings, deshalb läuft das
// Skript automatisch im Anschluss an `npm run update-holdings`.
//
// Manuell: npx tsx scripts/buildHomepageHighlights.ts

import fs from 'fs'
import path from 'path'
import holdingsHistory from '@/data/holdings'
import { investors } from '@/data/investors'
import { stocks } from '@/data/stocks'
import { getPositionTicker } from '@/lib/holdingsTicker'

// Ab dieser Veränderung zählt eine bestehende Position als aufgestockt/reduziert.
// Filtert Rundungs- und Mini-Anpassungen heraus.
const MIN_CHANGE_RATIO = 0.05

type Position = {
  name?: string
  cusip?: string
  ticker?: string
  shares: number
  value: number
  putCall?: string | null
  optionType?: string
}

type Snapshot = { quarter: string; data: { date?: string; positions: Position[] } }

// Puts/Calls sind keine Käufe/Verkäufe der Aktie selbst (gleiche Regel wie smartMoney.ts).
function isStockPosition(p: Position): boolean {
  if (p.putCall) return false
  return !p.optionType || p.optionType === 'STOCK'
}

// 13F-Dateien sind nach Einreichungsquartal benannt — gehandelt wurde im Quartal davor.
function reportQuarterLabel(filingDate: string): string {
  const year = Number(filingDate.slice(0, 4))
  const filingQ = Math.ceil(Number(filingDate.slice(5, 7)) / 3)
  return filingQ === 1 ? `Q4 ${year - 1}` : `Q${filingQ - 1} ${year}`
}

function aggregate(positions: Position[]): Map<string, { shares: number; value: number }> {
  const map = new Map<string, { shares: number; value: number }>()
  for (const p of positions) {
    if (!isStockPosition(p)) continue
    const ticker = getPositionTicker(p)
    if (!ticker) continue
    const prev = map.get(ticker)
    if (prev) {
      prev.shares += p.shares
      prev.value += p.value
    } else {
      map.set(ticker, { shares: p.shares, value: p.value })
    }
  }
  return map
}

const stockNames = new Map(stocks.map(s => [s.ticker, s.name]))
// "Warren Buffett – Berkshire Hathaway" / "Daniel Loeb - Third Point" → nur die Person
const investorNames = new Map(investors.map(i => [i.slug, i.name.split(/\s*–\s*|\s+-\s+/)[0].trim()]))

function investorName(slug: string): string {
  return investorNames.get(slug) ?? slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Quadratisches Icon aus public/logos, falls vorhanden. Die gleichnamigen SVGs
// dort sind teils breite Schriftzüge und wirken in kleinen Kacheln unruhig.
function localSquareLogo(ticker: string): string | null {
  const file = `${ticker.toLowerCase()}.png`
  const fullPath = path.join(process.cwd(), 'public/logos', file)
  if (!fs.existsSync(fullPath)) return null
  // PNG-Header: Breite/Höhe ab Byte 16. Nicht-quadratische Dateien (z. B. AMD)
  // sind Schriftzüge → dann lieber das Icon von logo.dev.
  const header = fs.readFileSync(fullPath).subarray(16, 24)
  return header.readUInt32BE(0) === header.readUInt32BE(4) ? `/logos/${file}` : null
}

const history = holdingsHistory as unknown as Record<string, Snapshot[]>
const withData = Object.entries(history).filter(([, snaps]) => Array.isArray(snaps) && snaps.length > 0)

const latestQuarter = withData
  .map(([, snaps]) => snaps[snaps.length - 1].quarter)
  .sort()
  .at(-1)

if (!latestQuarter) {
  console.error('Keine Holdings-Daten gefunden.')
  process.exit(1)
}

type Move = { slug: string; ticker: string; deltaValue: number; value: number }
const buys: Move[] = []
const sells: Move[] = []
const newPositions: Move[] = []
let latestFilingDate = ''
let reportedInvestors = 0

for (const [slug, snaps] of withData) {
  const current = snaps[snaps.length - 1]
  if (current.quarter !== latestQuarter) continue
  reportedInvestors++
  if (current.data.date && current.data.date > latestFilingDate) latestFilingDate = current.data.date
  if (snaps.length < 2) continue

  const cur = aggregate(current.data.positions)
  const prev = aggregate(snaps[snaps.length - 2].data.positions)

  for (const [ticker, c] of cur) {
    const p = prev.get(ticker)
    const price = c.shares > 0 ? c.value / c.shares : 0
    if (!p || p.shares === 0) {
      buys.push({ slug, ticker, deltaValue: c.value, value: c.value })
      newPositions.push({ slug, ticker, deltaValue: c.value, value: c.value })
      continue
    }
    const delta = c.shares - p.shares
    if (Math.abs(delta) / p.shares < MIN_CHANGE_RATIO) continue
    const move = { slug, ticker, deltaValue: Math.abs(delta) * price, value: c.value }
    if (delta > 0) buys.push(move)
    else sells.push(move)
  }
  for (const [ticker, p] of prev) {
    if (!cur.has(ticker) && p.shares > 0) {
      sells.push({ slug, ticker, deltaValue: p.value, value: 0 })
    }
  }
}

function rankByInvestorCount(moves: Move[], limit: number) {
  const byTicker = new Map<string, Move[]>()
  for (const m of moves) {
    const list = byTicker.get(m.ticker) ?? []
    list.push(m)
    byTicker.set(m.ticker, list)
  }
  return Array.from(byTicker.entries())
    .map(([ticker, list]) => ({
      ticker,
      name: stockNames.get(ticker) ?? ticker,
      logo: localSquareLogo(ticker),
      investorCount: list.length,
      totalValue: Math.round(list.reduce((sum, m) => sum + m.deltaValue, 0)),
      investors: list
        .sort((a, b) => b.deltaValue - a.deltaValue)
        .slice(0, 3)
        .map(m => ({ slug: m.slug, name: investorName(m.slug) })),
    }))
    .sort((a, b) => b.investorCount - a.investorCount || b.totalValue - a.totalValue)
    .slice(0, limit)
}

const highlights = {
  generatedAt: new Date().toISOString(),
  filingQuarter: latestQuarter,
  reportQuarter: latestFilingDate ? reportQuarterLabel(latestFilingDate) : null,
  latestFilingDate: latestFilingDate || null,
  trackedInvestors: withData.length,
  reportedInvestors,
  mostBought: rankByInvestorCount(buys, 6),
  mostSold: rankByInvestorCount(sells, 6),
  biggestNewPositions: newPositions
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map(m => ({
      ticker: m.ticker,
      name: stockNames.get(m.ticker) ?? m.ticker,
      logo: localSquareLogo(m.ticker),
      value: Math.round(m.value),
      investor: { slug: m.slug, name: investorName(m.slug) },
    })),
}

const outFile = path.join(process.cwd(), 'src/data/homepageHighlights.json')
fs.writeFileSync(outFile, JSON.stringify(highlights, null, 2) + '\n')
console.log(
  `✅ Startseiten-Highlights geschrieben: ${highlights.reportQuarter} (${reportedInvestors}/${withData.length} Investoren gemeldet) → ${path.relative(process.cwd(), outFile)}`
)
