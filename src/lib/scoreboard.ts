// src/lib/scoreboard.ts
import fs from 'fs/promises'
import path from 'path'
import { investors, Investor } from '../data/investors'

export interface ScoreItem {
  slug: string
  name: string
  period: string     // z.B. "Q1 2025"
  changePct: number  // z.B. 0.1234 für +12.34 %
}

export async function getQuarterlyScores(): Promise<ScoreItem[]> {
  const dir = path.resolve('src/data/holdings')
  const scores: ScoreItem[] = []

  for (const inv of investors as Investor[]) {
    const slug     = inv.slug
    const currFile = path.join(dir, `${slug}.json`)
    const prevFile = path.join(dir, `${slug}-previous.json`)

    // 1) aktuelle Datei laden
    let current: { date: string; positions: { value: number }[] }
    try {
      current = JSON.parse(await fs.readFile(currFile, 'utf-8'))
    } catch {
      // kein aktuelles Depot → überspringen
      continue
    }

    // 2) Vorperiode laden oder fallback auf "leeres Depot"
    let previous: { date: string; positions: { value: number }[] }
    try {
      previous = JSON.parse(await fs.readFile(prevFile, 'utf-8'))
    } catch {
      // keine Vorperiode → treat as unchanged
      previous = { date: current.date, positions: [] }
    }

    // 3) Quartal bestimmen
    const d = new Date(current.date)
    const q = Math.floor(d.getMonth() / 3) + 1
    const period = `Q${q} ${d.getFullYear()}`

    // 4) Gesamtwerte berechnen
    const sum = (arr: { value: number }[]) =>
      arr.reduce((s, p) => s + p.value, 0)

    const currTotal = sum(current.positions)
    const prevTotal = sum(previous.positions)

    // 5) Veränderung berechnen (0 wenn prevTotal == 0)
    const changePct =
      prevTotal > 0
        ? (currTotal - prevTotal) / prevTotal
        : 0

    scores.push({
      slug,
      name: inv.name,
      period,
      changePct,
    })
  }

  // 6) sortiere nach Veränderung absteigend
  return scores.sort((a, b) => b.changePct - a.changePct)
}