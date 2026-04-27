'use client'

// Zeigt den Live-Status einer Aktie basierend auf Ticker-Suffix, aktueller Zeit
// und dem Quote-Timestamp. Vier Zustände:
//
//   live            — Markt offen + Kurs < 3min alt                grün (pulsiert)
//   außerbörslich   — Markt zu, Kurs aus Pre-Market/After-Hours    amber
//   Markt geschlossen + Uhrzeit/Datum des letzten Kurses           grau
//   (hidden)        — Zeitstempel ungültig oder Markt offen + Kurs aktuell
//
// Die Handelszeiten sind für die wichtigsten Börsen hart kodiert (US/DE/UK/EU).
// Wochenenden sind außerhalb ALLER Handelszeiten → "Markt geschlossen".

import React from 'react'

interface MarketStatusBadgeProps {
  ticker: string
  /** Unix-Timestamp (Sekunden) des letzten Quotes */
  quoteTs?: number
}

/** Börsenzuordnung via Ticker-Suffix (grob — deckt ~95% der Fälle ab) */
type Market = 'us' | 'xetra' | 'lse' | 'euro' | 'asia' | 'crypto' | 'unknown'

function detectMarket(ticker: string): Market {
  const upper = ticker.toUpperCase()
  if (upper.endsWith('-USD') || upper.endsWith('.CC')) return 'crypto'
  if (upper.endsWith('.DE') || upper.endsWith('.F') || upper.endsWith('.XETRA')) return 'xetra'
  if (upper.endsWith('.L') || upper.endsWith('.LSE')) return 'lse'
  if (/\.(PA|AS|MI|MC|BR|LI|VI|CP|HE|SW|ST|OL)$/i.test(upper)) return 'euro'
  if (/\.(HK|T|TO|SS|SZ|KS)$/i.test(upper)) return 'asia'
  // Kein Suffix oder .US → US-Handelsplatz
  if (!upper.includes('.') || upper.endsWith('.US')) return 'us'
  return 'unknown'
}

/** Minuten seit Mitternacht deutsche Zeit für ein Date */
function minutesOfDayBerlin(date: Date): number {
  // Berlin-Zeit: wir approximieren mit getUTCHours+2 (CEST) — für "Markt offen" Check
  // reicht das (Stunden-Granularität).
  const utcH = date.getUTCHours()
  const utcM = date.getUTCMinutes()
  // Deutschland: CEST (UTC+2) von März bis Oktober, CET (UTC+1) sonst.
  // Einfachste Heuristik: +2h als Default — Fehler von 1h an Umstellungstagen akzeptabel.
  const berlinH = (utcH + 2) % 24
  return berlinH * 60 + utcM
}

/** Ist der Markt zur aktuellen Zeit offen? */
function isMarketOpen(market: Market, now: Date): boolean {
  // Crypto handelt 24/7
  if (market === 'crypto') return true

  const day = now.getUTCDay() // 0=Sun, 6=Sat (UTC approximation)
  if (day === 0 || day === 6) return false

  const berlinMinutes = minutesOfDayBerlin(now)

  switch (market) {
    case 'us':
      // Regular Hours NYSE/NASDAQ: 15:30–22:00 dt (9:30–16:00 ET)
      return berlinMinutes >= 15 * 60 + 30 && berlinMinutes < 22 * 60
    case 'xetra':
      // XETRA: 9:00–17:30 dt
      return berlinMinutes >= 9 * 60 && berlinMinutes < 17 * 60 + 30
    case 'lse':
      // LSE: 9:00–17:30 London = 10:00–18:30 dt
      return berlinMinutes >= 10 * 60 && berlinMinutes < 18 * 60 + 30
    case 'euro':
      // Euronext Paris/Amsterdam/Milan: 9:00–17:30 dt (gleiche Zeitzone)
      return berlinMinutes >= 9 * 60 && berlinMinutes < 17 * 60 + 30
    case 'asia':
      // Asien: variiert — Tokio 9:00-15:00 JST = 2:00-8:00 dt
      // Pragmatisch: nie open from a Berlin-POV außer frühmorgens
      return berlinMinutes >= 2 * 60 && berlinMinutes < 8 * 60
    default:
      return false
  }
}

/** US-Extended-Hours (Pre-Market + After-Hours) */
function isUsExtendedHours(now: Date): boolean {
  const day = now.getUTCDay()
  if (day === 0 || day === 6) return false
  const m = minutesOfDayBerlin(now)
  // Pre-Market: 10:00-15:30 dt (4:00-9:30 ET)
  // After-Hours: 22:00-02:00 dt am nächsten Tag (16:00-20:00 ET)
  const preMarket = m >= 10 * 60 && m < 15 * 60 + 30
  const afterHours = m >= 22 * 60 || m < 2 * 60
  return preMarket || afterHours
}

/**
 * Minimaler Status-Dot — nur sichtbar wenn der Markt LIVE ist.
 * Für premium-Stock-Header neben dem Preis.
 */
export function MarketStatusDot({ ticker, quoteTs }: MarketStatusBadgeProps) {
  if (!quoteTs || quoteTs <= 0) return null
  const market = detectMarket(ticker)
  const now = new Date()
  const ageMin = (Date.now() / 1000 - quoteTs) / 60
  if (!isMarketOpen(market, now) || ageMin >= 3) return null

  return (
    <span className="relative inline-flex h-2 w-2 flex-shrink-0" title="Live">
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  )
}

/**
 * Minimaler Status-Text — nur sichtbar bei nicht-live Zuständen.
 * Rendert kompakt ohne Pill/Border, passt sich an die umgebende Zeile an.
 */
export function MarketStatusText({ ticker, quoteTs }: MarketStatusBadgeProps) {
  if (!quoteTs || quoteTs <= 0) return null
  const market = detectMarket(ticker)
  const now = new Date()
  const ageMin = (Date.now() / 1000 - quoteTs) / 60
  const open = isMarketOpen(market, now)

  if (open && ageMin < 3) return null

  if (open && ageMin >= 3 && ageMin < 30) {
    return (
      <span
        className="text-[10px] text-white/30 tabular-nums"
        title={`Letzter Kurs vor ${Math.round(ageMin)} Minuten`}
      >
        verzögert
      </span>
    )
  }

  if (market === 'us' && !open && isUsExtendedHours(now) && ageMin < 120) {
    const tsDate = new Date(quoteTs * 1000)
    return (
      <span
        className="text-[10px] text-amber-400/60"
        title={`Außerbörslich · ${tsDate.toLocaleString('de-DE')}`}
      >
        außerbörslich
      </span>
    )
  }

  const tsDate = new Date(quoteTs * 1000)
  const label =
    ageMin < 24 * 60
      ? tsDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      : tsDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })

  return (
    <span
      className="text-[10px] text-white/30 tabular-nums"
      title={`Markt geschlossen — letzter Kurs ${tsDate.toLocaleString('de-DE')}`}
    >
      {label}
    </span>
  )
}

export default function MarketStatusBadge({ ticker, quoteTs }: MarketStatusBadgeProps) {
  if (!quoteTs || quoteTs <= 0) return null

  const market = detectMarket(ticker)
  const now = new Date()
  const ageMin = (Date.now() / 1000 - quoteTs) / 60
  const open = isMarketOpen(market, now)

  // 1) Markt offen + Kurs frisch → "live"
  if (open && ageMin < 3) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-0.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/70 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        Live
      </span>
    )
  }

  // 2) Markt offen aber Kurs veraltet → "verzögert"
  if (open && ageMin >= 3 && ageMin < 30) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5"
        title={`Letzter Kurs vor ${Math.round(ageMin)} Minuten`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
        verzögert
      </span>
    )
  }

  // 3) US-Markt zu, aber Pre-Market / After-Hours Daten → "außerbörslich"
  if (market === 'us' && !open && isUsExtendedHours(now) && ageMin < 120) {
    const tsDate = new Date(quoteTs * 1000)
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-0.5"
        title={`Außerbörslicher Handel, letzter Kurs ${tsDate.toLocaleString('de-DE')}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Außerbörslich
      </span>
    )
  }

  // 4) Markt zu / Kurs alt → Zeit oder Datum des letzten Kurses
  const tsDate = new Date(quoteTs * 1000)
  const label =
    ageMin < 24 * 60
      ? tsDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      : tsDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5"
      title={`Markt geschlossen — letzter Kurs ${tsDate.toLocaleString('de-DE')}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
      {label}
    </span>
  )
}
