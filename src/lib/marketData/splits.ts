// src/lib/marketData/splits.ts
// Aktiensplits aus FMP.
//
// Der Import verrechnet nur Splits, die im Broker-Report stehen. Ein Split, der
// NACH dem letzten Import passiert, bleibt sonst unbemerkt — die Position zeigt
// dann den Kurs nach dem Split gegen den Einstand davor (bei 200:1 also −99 %).

export interface SplitEvent {
  /** ISO-Datum des Splits. */
  date: string
  /** Faktor: 200:1 → 200 (Stückzahl × 200, Kurs ÷ 200). */
  ratio: number
  /** Verhältnis als Text ("200/1"), für Notizen und Nachvollziehbarkeit. */
  raw: string
}

export interface FmpSplit {
  date: string
  numerator: number
  denominator: number
}

/**
 * Alle Splits eines Papiers laut FMP (Symbol in FMP-Schreibweise: AAPL,
 * SAP.DE), neueste zuerst. Leeres Array bei jedem Problem.
 */
export async function fetchFmpSplits(fmpSymbol: string): Promise<FmpSplit[]> {
  if (!process.env.FMP_API_KEY || !fmpSymbol) return []
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/splits?symbol=${encodeURIComponent(fmpSymbol)}` +
        `&apikey=${process.env.FMP_API_KEY}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data
      .map(entry => ({
        date: String(entry?.date || '').slice(0, 10),
        numerator: Number(entry?.numerator),
        denominator: Number(entry?.denominator),
      }))
      .filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s.date) && s.numerator > 0 && s.denominator > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

/**
 * Splits eines Papiers ab einem Datum, älteste zuerst. Leeres Array bei jedem
 * Problem — ein Ausfall der Abfrage darf keine Korrektur auslösen.
 */
export async function fetchSplits(fmpSymbol: string, fromDate: string): Promise<SplitEvent[]> {
  if (!fromDate) return []
  const splits = await fetchFmpSplits(fmpSymbol)
  return splits
    .filter(s => s.date >= fromDate)
    .map(s => ({ date: s.date, ratio: s.numerator / s.denominator, raw: `${s.numerator}/${s.denominator}` }))
    .filter(s => Number.isFinite(s.ratio) && s.ratio !== 1)
    .sort((a, b) => a.date.localeCompare(b.date))
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
