// src/lib/smartMoney.types.ts
// Client-sichere Typen für den Smart-Money-Layer im Kurschart.
// Bewusst OHNE Daten-Imports — smartMoney.ts zieht die komplette Holdings-
// Historie (~38 MB) und darf deshalb nie client-seitig importiert werden.

export type SmartMoneyAction = 'new' | 'add' | 'trim' | 'exit'

export interface SmartMoneyEvent {
  /** Phase 2/3 ergänzen: 'insider' | 'congress' */
  source: 'superinvestor'
  action: SmartMoneyAction
  /** Berichtsquartal, in dem gehandelt wurde, z. B. "2026-Q2" */
  reportQuarter: string
  /** Erster Kalendertag des Berichtsquartals (YYYY-MM-DD) */
  quarterStart: string
  /** Letzter Kalendertag des Berichtsquartals (YYYY-MM-DD) */
  quarterEnd: string
  /** Einreichungsdatum des 13F — erst ab dann war die Info öffentlich */
  filedDate: string | null
  actor: {
    slug: string
    name: string
    imageUrl: string | null
  }
  /** Bestand nach der Transaktion (Aktien) */
  shares: number
  sharesChange: number
  /** Veränderung ggü. Vorquartal in % — null bei Neuposition */
  changePct: number | null
  /** Positionswert in USD zum Quartalsende (bei Exit: letzter bekannter Wert) */
  valueUsd: number
  /** Anteil am 13F-Portfolio in % — null wenn nicht bestimmbar */
  pctOfPortfolio: number | null
  /** Link zum SEC-Filing */
  sourceUrl: string | null
}

/** Insider-Transaktion (Form 4) — im Gegensatz zu 13F tagesgenau */
export interface InsiderEvent {
  source: 'insider'
  action: 'buy' | 'sell'
  /** Transaktionsdatum (YYYY-MM-DD) */
  date: string
  actor: {
    name: string
    /** z. B. "CEO", "Director", "10% Owner" — aus typeOfOwner abgeleitet */
    role: string | null
  }
  shares: number
  /** Transaktionspreis pro Aktie — Positionierung des Markers auf der Y-Achse */
  price: number | null
  valueUsd: number
  /** Teil eines Cluster-Buys: ≥3 verschiedene Insider kaufen binnen 30 Tagen */
  clusterBuy: boolean
  /** Link zum SEC Form 4 */
  sourceUrl: string | null
}

/** Kongress-Trade (PTR-Meldung) — tagesgenau, Betrag nur als Spanne */
export interface CongressEvent {
  source: 'congress'
  action: 'buy' | 'sell'
  /** Transaktionsdatum (YYYY-MM-DD) */
  date: string
  /** Offenlegungsdatum — erst ab dann war der Trade öffentlich */
  disclosedDate: string | null
  actor: {
    slug: string
    name: string
    /** 'R' | 'D' | sonstiges Kürzel */
    party: string | null
    chamber: 'house' | 'senate' | null
    state: string | null
    photoUrl: string | null
  }
  /** Formatierte Spanne, z. B. "500K–1M $" — PTRs nennen keine exakten Beträge */
  amountRange: string
  /** Mitte der Spanne in USD — für Sortierung/Deckelung */
  amountMidUsd: number
  /** "Self" | "Spouse" | "Joint" | "Dependent Child" */
  owner: string | null
  /** Link zur Original-PTR (PDF) */
  sourceUrl: string | null
}
