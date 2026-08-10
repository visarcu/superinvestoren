// Einheitliche Sentiment-Berechnung für das Dashboard.
// Bewusst NUR die Leitindizes – Rohstoffe und Crypto (Gold, Silber, Öl, BTC) laufen
// unabhängig vom Aktienmarkt und würden das Marktbild sonst verfälschen.
// Achtung: Die US-Werte sind Futures (ESUSD/NQUSD/YMUSD), das Sentiment bezieht sich
// also auf die 24h-Veränderung, nicht auf den Kassaschluss.

export const SENTIMENT_INDEX_KEYS = ['spx', 'ixic', 'dji', 'dax', 'stoxx'] as const

export interface SentimentQuote {
  positive?: boolean
  changePct?: number
}

export interface MarketSentiment {
  isBullish: boolean
  positiveCount: number
  total: number
}

export function calculateMarketSentiment(
  quotes: Record<string, SentimentQuote | undefined> | null | undefined
): MarketSentiment | null {
  if (!quotes) return null

  const indexQuotes = SENTIMENT_INDEX_KEYS
    .map(key => quotes[key])
    .filter((quote): quote is SentimentQuote => !!quote)

  if (indexQuotes.length === 0) return null

  const positiveCount = indexQuotes.filter(
    quote => quote.positive ?? (quote.changePct ?? 0) >= 0
  ).length

  return {
    // Gleichstand zählt als bullisch (wie bisher)
    isBullish: positiveCount * 2 >= indexQuotes.length,
    positiveCount,
    total: indexQuotes.length,
  }
}
