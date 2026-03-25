// src/app/api/guru-trades/route.ts
// Returns the biggest superinvestor moves from the latest quarter
// Logic mirrors LatestGuruTrades component but runs server-side
import { NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'

const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett',
  ackman: 'Bill Ackman',
  gates: 'Bill Gates Foundation',
  burry: 'Michael Burry',
  pabrai: 'Mohnish Pabrai',
  klarman: 'Seth Klarman',
  akre: 'Chuck Akre',
  greenblatt: 'Joel Greenblatt',
  fisher: 'Ken Fisher',
  soros: 'George Soros',
  gayner: 'Thomas Gayner',
  kantesaria: 'Dev Kantesaria',
  torray: 'Torray Investment Partners',
  davis: 'Christopher Davis',
  altarockpartners: 'Mark Massey',
  greenhaven: 'Edgar Wachenheim III',
  vinall: 'Robert Vinall',
  meridiancontrarian: 'Meridian Contrarian Fund',
  hawkins: 'Mason Hawkins',
  olstein: 'Robert Olstein',
  peltz: 'Nelson Peltz',
  gregalexander: 'Greg Alexander',
  miller: 'Bill Miller',
  tangen: 'Nicolai Tangen',
  haley: 'Connor Haley',
  vandenberg: 'Arnold Van Den Berg',
  dodgecox: 'Dodge & Cox',
  pzena: 'Richard Pzena',
  mairspower: 'Mairs & Power',
  weitz: 'Wallace Weitz',
  yacktman: 'Yacktman Asset Management',
  armitage: 'John Armitage',
  burn: 'Harry Burn',
  cantillon: 'William von Mueffling',
  jensen: 'Eric Schoenstein',
  abrams: 'David Abrams',
  firsteagle: 'First Eagle Investment',
  polen: 'Polen Capital',
  russo: 'Thomas Russo',
  rochon: 'Francois Rochon',
  tarasoff: 'Josh Tarasoff',
  whitman: 'Marty Whitman',
  patientcapital: 'Samantha McLemore',
  train: 'Lindsell Train',
  triplefrond: 'Triple Frond Partners',
  ketterer: 'Sarah Ketterer',
  makaira: 'Tom Bancroft',
}

const cusipIndex = new Map<string, string>()
for (const s of stocks) {
  if (s.cusip) cusipIndex.set(s.cusip, s.ticker)
}

function getTicker(pos: any): string | null {
  if (pos.ticker) return pos.ticker
  if (pos.cusip) return cusipIndex.get(pos.cusip) || null
  return null
}

function getStockName(pos: any): string {
  if (pos.name) {
    return pos.name.includes(' - ') ? pos.name.split(' - ')[1].trim() : pos.name
  }
  const ticker = getTicker(pos)
  const stock = stocks.find(s => s.ticker === ticker)
  return stock?.name || pos.name || 'Unknown'
}

function formatValue(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Mrd. $`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} Mio. $`
  return `${v.toLocaleString('de-DE')} $`
}

export async function GET() {
  try {
    // One best trade per investor, sorted by dollarChange
    const investorBestTrade = new Map<string, any>()

    Object.entries(holdingsHistory).forEach(([slug, snapshots]: [string, any]) => {
      if (!snapshots || snapshots.length < 2) return

      const cur = snapshots[snapshots.length - 1]
      const prev = snapshots[snapshots.length - 2]
      if (!cur?.data?.positions || !prev?.data?.positions) return

      const curMap = new Map<string, any>()
      const prevMap = new Map<string, any>()

      cur.data.positions.forEach((p: any) => {
        const t = getTicker(p)
        if (t) curMap.set(t, p)
      })
      prev.data.positions.forEach((p: any) => {
        const t = getTicker(p)
        if (t) prevMap.set(t, p)
      })

      const trades: any[] = []

      // NEW positions
      curMap.forEach((pos, ticker) => {
        if (!prevMap.has(ticker) && pos.value > 1_000_000) {
          trades.push({
            investor: slug,
            investorName: investorNames[slug] || slug,
            type: 'NEW',
            ticker,
            name: getStockName(pos),
            value: pos.value,
            dollarChange: pos.value,
            quarterKey: cur.quarter,
            date: cur.data.date,
          })
        }
      })

      // ADD / REDUCE
      curMap.forEach((pos, ticker) => {
        const prevPos = prevMap.get(ticker)
        if (!prevPos) return
        const delta = pos.shares - prevPos.shares
        const pct = (delta / prevPos.shares) * 100
        const pricePerShare = pos.shares > 0 ? pos.value / pos.shares : 0
        const dollarChange = Math.abs(delta * pricePerShare)

        if (Math.abs(pct) > 5 && dollarChange > 1_000_000) {
          trades.push({
            investor: slug,
            investorName: investorNames[slug] || slug,
            type: delta > 0 ? 'ADD' : 'REDUCE',
            ticker,
            name: getStockName(pos),
            value: pos.value,
            dollarChange,
            percentChange: Math.abs(pct),
            quarterKey: cur.quarter,
            date: cur.data.date,
          })
        }
      })

      // SOLD
      prevMap.forEach((pos, ticker) => {
        if (!curMap.has(ticker) && pos.value > 1_000_000) {
          trades.push({
            investor: slug,
            investorName: investorNames[slug] || slug,
            type: 'SOLD',
            ticker,
            name: getStockName(pos),
            value: pos.value,
            dollarChange: pos.value,
            quarterKey: cur.quarter,
            date: cur.data.date,
          })
        }
      })

      if (trades.length > 0) {
        const best = trades.sort((a, b) => b.dollarChange - a.dollarChange)[0]
        investorBestTrade.set(slug, best)
      }
    })

    const result = Array.from(investorBestTrade.values())
      .sort((a, b) => b.dollarChange - a.dollarChange)
      .slice(0, 10)
      .map(t => ({
        ...t,
        dollarChangeFormatted: formatValue(t.dollarChange),
        valueFormatted: formatValue(t.value),
        percentChangeFormatted: t.percentChange ? `${t.percentChange.toFixed(0)}%` : null,
      }))

    return NextResponse.json({ trades: result }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' },
    })
  } catch (e) {
    console.error('[guru-trades]', e)
    return NextResponse.json({ error: 'Failed to compute guru trades' }, { status: 500 })
  }
}
