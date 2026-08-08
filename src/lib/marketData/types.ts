// src/lib/marketData/types.ts
// Gemeinsame Typen des Kurs-Systems.
//
// Grundidee: Ein Instrument wird über seine ISIN identifiziert, nicht über einen
// Broker-Ticker. Je Datenanbieter hängt am Instrument das Symbol, unter dem der
// Anbieter es kennt (EODHD: VGWD.XETRA, FMP: VHYL.AS, Yahoo: VGWD.DE).

export type QuoteSource = 'eodhd' | 'fmp' | 'yahoo'

export interface Instrument {
  isin: string
  name: string
  type: string
  /** Notierungswährung der Hauptquelle. 'GBX' = Pence. */
  currency: string | null
  exchange: string | null
  eodhdSymbol: string | null
  fmpSymbol: string | null
  yahooSymbol: string | null
  verified: boolean
}

/** Kurs in seiner nativen Notierungswährung — Umrechnung passiert erst an der Route. */
export interface NormalizedQuote {
  /** Symbol so, wie der Aufrufer es angefragt hat. */
  symbol: string
  price: number
  currency: string
  change: number
  changePercent: number
  previousClose: number
  name?: string
  source: QuoteSource
  /** Symbol, unter dem der Anbieter den Kurs geliefert hat — für Debugging. */
  sourceSymbol: string
  /** Rohantwort des Anbieters. Die Route reicht Zusatzfelder (marketCap, pe,
   *  dayHigh …) unverändert an bestehende Konsumenten weiter. */
  raw?: Record<string, unknown>
}

export interface RawQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  previousClose: number
  currency?: string
  name?: string
  raw?: Record<string, unknown>
}
