// src/lib/marketData/splits.ts
// Aktiensplits aus EODHD.
//
// Der Import verrechnet nur Splits, die im Broker-Report stehen. Ein Split, der
// NACH dem letzten Import passiert, bleibt sonst unbemerkt — die Position zeigt
// dann den Kurs nach dem Split gegen den Einstand davor (bei 200:1 also −99 %).

export interface SplitEvent {
  /** ISO-Datum des Splits. */
  date: string
  /** Faktor: 200:1 → 200 (Stückzahl × 200, Kurs ÷ 200). */
  ratio: number
  /** Rohwert von EODHD, für Notizen und Nachvollziehbarkeit. */
  raw: string
}

/** "200.000000/1.000000" → 200 */
export function parseSplitRatio(raw: string): number | null {
  const [numerator, denominator] = String(raw || '').split('/').map(Number)
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null
  const ratio = numerator / denominator
  if (!Number.isFinite(ratio) || ratio <= 0) return null
  return ratio
}

/**
 * Splits eines Papiers ab einem Datum. Leeres Array bei jedem Problem —
 * ein Ausfall der Abfrage darf keine Korrektur auslösen.
 */
export async function fetchSplits(eodhdSymbol: string, fromDate: string): Promise<SplitEvent[]> {
  if (!process.env.EODHD_API_KEY || !eodhdSymbol || !fromDate) return []

  try {
    const res = await fetch(
      `https://eodhd.com/api/splits/${encodeURIComponent(eodhdSymbol)}?from=${fromDate}` +
        `&api_token=${process.env.EODHD_API_KEY}&fmt=json`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []

    const data = await res.json()
    if (!Array.isArray(data)) return []

    return data
      .map(entry => {
        const ratio = parseSplitRatio(entry?.split)
        if (!ratio || ratio === 1 || !entry?.date) return null
        return { date: String(entry.date), ratio, raw: String(entry.split) } satisfies SplitEvent
      })
      .filter((s): s is SplitEvent => s !== null)
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

/**
 * Ist der Split in den gespeicherten Zahlen noch NICHT enthalten?
 *
 * Der Marker in den Notizen allein reicht nicht: Wer seinen Broker-Report nach
 * dem Split exportiert, hat die neuen Stückzahlen schon in der Datei — ein
 * zweites Anwenden würde die Position um den Faktor verfälschen. Deshalb der
 * Vergleich mit dem aktuellen Kurs: Nur wenn der Einstand ohne den Split
 * plausibel ist und mit ihm nicht, wird gerechnet.
 */
export function splitLooksUnapplied(
  purchasePrice: number,
  currentPrice: number,
  ratio: number,
  tolerance = 5
): boolean {
  if (!(purchasePrice > 0) || !(currentPrice > 0) || !(ratio > 1)) return false

  const inBand = (value: number) => {
    const factor = value / currentPrice
    return factor >= 1 / tolerance && factor <= tolerance
  }

  // Einstand durch den Split geteilt liegt in derselben Größenordnung wie der
  // Kurs, der ungeteilte Einstand aber nicht → Split fehlt in den Daten.
  return inBand(purchasePrice / ratio) && !inBand(purchasePrice)
}
