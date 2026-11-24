// src/lib/ai/depot/themes.ts
// Themen-Anteil eines Depots (z. B. KI), nachvollziehbar statt nach Gefühl.
//
// Was zu einem Thema gehört, entscheiden die Bestände echter Themen-ETFs:
// "eng" heißt, dass mindestens die Hälfte dieser ETFs die Firma hält (bei zwei
// ETFs: beide), "weit", dass es mindestens einer tut. Bestände kommen von FMP und sind 24 Stunden
// zwischengespeichert.

import { US_LISTING_BY_LOCAL } from '@/data/crossListings'
import { fmpList, finite } from '../data/fmp'

export interface Theme {
  name: string
  /** US-ETFs, deren Bestände das Thema abgrenzen */
  koerbe: string[]
  /** Themen-ETFs im Depot, die sich nicht zerlegen lassen, zählen ganz mit */
  etfName?: RegExp
}

export const THEMES = {
  ki: { name: 'Künstliche Intelligenz', koerbe: ['AIQ', 'ARTY', 'CHAT', 'WTAI', 'THNQ', 'AIS'], etfName: /artificial intelligence|\bAI\b|\bR&AI\b|künstliche intelligenz/i },
  halbleiter: { name: 'Halbleiter', koerbe: ['SMH', 'SOXX'], etfName: /semicond/i },
  cybersicherheit: { name: 'Cybersicherheit', koerbe: ['CIBR', 'BUG'], etfName: /cyber|digital security/i },
  cloud: { name: 'Cloud-Software', koerbe: ['SKYY', 'CLOU'], etfName: /\bcloud\b/i },
  robotik: { name: 'Robotik und Automatisierung', koerbe: ['BOTZ', 'ROBO'], etfName: /robotic|automation/i },
  quantencomputer: { name: 'Quantencomputer', koerbe: ['QTUM'], etfName: /quantum/i },
  ruestung: { name: 'Rüstung', koerbe: ['ITA', 'SHLD'], etfName: /defen[cs]e|aerospace/i },
  kernenergie: { name: 'Kernenergie und Uran', koerbe: ['URA', 'NLR'], etfName: /uranium|nuclear/i },
  saubere_energie: { name: 'Saubere Energie', koerbe: ['ICLN'], etfName: /clean energy|new energy|renewable/i },
  wasserstoff: { name: 'Wasserstoff', koerbe: ['HYDR'], etfName: /hydrogen/i },
  batterien_elektroautos: { name: 'Batterien und Elektroautos', koerbe: ['LIT', 'DRIV'], etfName: /battery|electric vehicle|future mobility/i },
  biotech: { name: 'Biotechnologie', koerbe: ['IBB', 'XBI'], etfName: /biotech/i },
  fintech: { name: 'Fintech', koerbe: ['FINX'], etfName: /fintech|digital payments/i },
  blockchain: { name: 'Blockchain- und Kryptofirmen', koerbe: ['BLOK', 'BKCH'], etfName: /blockchain/i },
  videospiele: { name: 'Videospiele', koerbe: ['ESPO'], etfName: /video gam|esports/i },
  goldminen: { name: 'Goldminen', koerbe: ['GDX'], etfName: /gold (?:miners|producers)/i },
  raumfahrt: { name: 'Raumfahrt', koerbe: ['ARKX', 'UFO'], etfName: /\bspace\b/i },
  dividendenaristokraten: { name: 'US-Dividendenaristokraten', koerbe: ['NOBL'] },
} satisfies Record<string, Theme>

export type ThemeId = keyof typeof THEMES
export const THEME_IDS = Object.keys(THEMES) as ThemeId[]

/** gängige Bezeichnung, feste Mitglieder */
export const MAGNIFICENT_7 = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA']

const SHARE_CLASS: Record<string, string> = { GOOG: 'GOOGL', 'BRK-A': 'BRK-B', 'BRK.A': 'BRK-B', 'BRK.B': 'BRK-B', FOX: 'FOXA', NWS: 'NWSA' }

/** Heimatnotierung, ADR und Aktienklasse auf ein Symbol */
export function companySymbol(symbol: string): string {
  const upper = symbol.toUpperCase()
  const listing = US_LISTING_BY_LOCAL[upper] ?? upper
  return SHARE_CLASS[listing] ?? listing
}

export interface ThemeMembers {
  koerbe: Array<{ symbol: string; firmen: number }>
  /** so viele ETFs müssen die Firma halten, damit sie eng gefasst dazugehört */
  eng: number
  /** Anzahl der ETFs, die die Firma halten */
  treffer: (symbol: string, isin: string | null) => number
}

export async function loadTheme(id: ThemeId): Promise<ThemeMembers | null> {
  const theme: Theme = THEMES[id]
  const loaded = await Promise.all(
    theme.koerbe.map(async etf => {
      const rows = await fmpList(`/api/v3/etf-holder/${etf}`, {}, { revalidate: 86_400 })
      const keys = new Set<string>()
      const firms = new Set<string>()
      for (const row of rows) {
        // Bestände ohne Gewicht sind Geldmarkt, Reste oder fehlerhafte Zeilen
        if (!row.asset || (finite(row.weightPercentage) ?? 0) <= 0) continue
        const symbol = companySymbol(String(row.asset))
        keys.add(symbol)
        firms.add(symbol)
        if (row.isin) keys.add(String(row.isin).toUpperCase())
      }
      return { symbol: etf, keys, firmen: firms.size }
    })
  )
  const usable = loaded.filter(l => l.firmen > 0)
  if (usable.length === 0) return null
  return {
    koerbe: usable.map(l => ({ symbol: l.symbol, firmen: l.firmen })),
    eng: usable.length <= 2 ? usable.length : Math.ceil(usable.length / 2),
    treffer: (symbol, isin) => usable.filter(l => l.keys.has(companySymbol(symbol)) || (isin != null && l.keys.has(isin.toUpperCase()))).length,
  }
}
