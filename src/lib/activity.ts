// src/lib/activity.ts
import fs from 'fs/promises'
import path from 'path'
import type { Investor } from '../data/investors'
import { investors } from '../data/investors'  
import { stocks } from '../data/stocks'

export interface ActivityItem {
  slug: string
  name: string
  period: string           // z.B. "Q1 2025"
  topAdds:   { ticker: string; pct: number }[]
  topRemovals: { ticker: string; pct: number }[]
}

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const dir = path.resolve('src/data/holdings')
  const result: ActivityItem[] = []

  // Map CUSIP → Ticker
  const cusipToTicker = new Map<string,string>()
  for (const s of stocks) {
    if (s.cusip) cusipToTicker.set(s.cusip, s.ticker)
  }

  for (const inv of investors as Investor[]) {
    const slug = inv.slug
    const currFile = path.join(dir, `${slug}.json`)
    const prevFile = path.join(dir, `${slug}-previous.json`)

    // 1) Lade aktuelle Periode
    let current: { date: string; positions: { cusip: string; shares: number }[] }
    try {
      current = JSON.parse(await fs.readFile(currFile, 'utf-8'))
    } catch {
      continue  // kein aktuelles Depot → überspringen
    }

    // 2) Lade Vorperiode (falls vorhanden)
    let previous: typeof current | null = null
    try {
      previous = JSON.parse(await fs.readFile(prevFile, 'utf-8'))
    } catch {
      previous = null
    }

    // 3) Berechne Quartal
    const d = new Date(current.date)
    const q = Math.floor(d.getMonth() / 3) + 1
    const period = `Q${q} ${d.getFullYear()}`

    // 4) Map der Vorperiode: CUSIP → shares
    const prevMap = new Map<string,number>()
    if (previous) {
      for (const p of previous.positions) {
        prevMap.set(p.cusip, p.shares)
      }
    }

    // 5) Veränderungen berechnen
    const diffs: { cusip: string; pct: number }[] = []
    for (const { cusip, shares } of current.positions) {
      const prev = prevMap.get(cusip) ?? 0
      if (prev === 0) {
        diffs.push({ cusip, pct: 1 })        // 100 % neu
      } else if (shares !== prev) {
        const change = (shares - prev) / prev
        diffs.push({ cusip, pct: change })
      }
    }

    // 6) Sortiere adds / removals und nimm Top 5
    const adds = diffs
      .filter(d => d.pct > 0)
      .sort((a,b) => b.pct - a.pct)
      .slice(0,5)
      .map(d => ({
        ticker: cusipToTicker.get(d.cusip) ?? d.cusip,
        pct: d.pct
      }))

    const removals = diffs
      .filter(d => d.pct < 0)
      .sort((a,b) => a.pct - b.pct) // negativer → stärkerer Verkauf zuerst
      .slice(0,5)
      .map(d => ({
        ticker: cusipToTicker.get(d.cusip) ?? d.cusip,
        pct: Math.abs(d.pct)
      }))

    result.push({
      slug,
      name: inv.name,
      period,
      topAdds: adds,
      topRemovals: removals
    })
  }

  return result
}