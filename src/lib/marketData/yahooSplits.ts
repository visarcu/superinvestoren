// src/lib/marketData/yahooSplits.ts
// Splits, die Yahoo als Ereignis führt, aber nicht in die Kurse eingerechnet hat.
//
// Yahoo liefert Kurse normalerweise split-bereinigt. Bei einzelnen Notierungen
// fehlt das: L8I7.DE (Amundi Nasdaq-100 2x) wurde am 09.07.2026 200:1 geteilt,
// davor stehen weiter 1.882,80 €, danach 9,87 €. Die Pariser Notierung LQQ.PA
// derselben ISIN ist bereinigt. Die Buchungen stehen nach dem Import auf der
// neuen Stückzahl, der Depotverlauf zählte die Position vor dem Split also
// 200-fach (241.000 statt 62.000 €).
//
// Reine Logik ohne Netzwerk. Die Abfrage muss `events=splits` mitschicken,
// sonst nennt Yahoo keine Splits.

export interface YahooSplitEvent {
  /** Sekunden seit 1970, wie die Zeitstempel der Kursreihe */
  date: number
  numerator: number
  denominator: number
}

/** Split-Ereignisse einer Chart-Antwort (`chart.result[0]`). */
export function yahooSplitEvents(result: any): YahooSplitEvent[] {
  return Object.values((result?.events?.splits || {}) as Record<string, YahooSplitEvent>)
    .filter(split => split?.date > 0 && split.numerator > 0 && split.denominator > 0)
}

// Kleinere Verhältnisse (Spin-offs 1057:1000, Gratisaktien 11:10) lassen sich an
// einem einzelnen Kurstag nicht von einer normalen Bewegung unterscheiden.
const MIN_RATIO = 1.5
// So weit darf die Kursstufe vom Split-Verhältnis abweichen, als Anteil am
// Verhältnis (logarithmisch): 2:1 ab −40 %, 200:1 ab −98 % am Split-Tag.
const STEP_TOLERANCE = 0.25
// Ereignis und erster geteilter Kurs fallen nicht immer auf denselben Tag;
// über zehn Jahre liefert Yahoo außerdem Wochenkurse.
const WINDOW_SECONDS = 7 * 86400

/**
 * Teiler je Kurs, der die Reihe durchgehend auf die heutige Stückzahl bringt:
 * 1, wo Yahoo schon bereinigt hat, sonst das Produkt der fehlenden Splits.
 *
 * Ein Split fehlt nur dann, wenn die Reihe rund um seinen Tag genau um sein
 * Verhältnis springt. Eine bereinigte Reihe zeigt dort einen gewöhnlichen
 * Kurstag und bleibt unverändert.
 */
export function missedSplitDivisors(
  timestamps: number[],
  closes: (number | null | undefined)[],
  events: YahooSplitEvent[]
): number[] {
  const divisors: number[] = new Array(timestamps.length).fill(1)
  // Jede Stufe zählt einmal, auch wenn Yahoo denselben Split doppelt führt
  const usedSteps = new Set<number>()
  for (const event of events) {
    const ratio = event.numerator / event.denominator
    const size = Math.abs(Math.log(ratio))
    if (!(size >= Math.log(MIN_RATIO))) continue

    let splitIndex = -1
    let bestMiss = STEP_TOLERANCE * size
    let previous = -1
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i]
      if (!close || close <= 0) continue
      if (
        previous >= 0 &&
        !usedSteps.has(i) &&
        timestamps[i] >= event.date - WINDOW_SECONDS &&
        timestamps[previous] <= event.date + WINDOW_SECONDS
      ) {
        const miss = Math.abs(Math.log(closes[previous]! / close / ratio))
        if (miss < bestMiss) {
          bestMiss = miss
          splitIndex = i
        }
      }
      previous = i
    }
    if (splitIndex < 0) continue
    usedSteps.add(splitIndex)
    for (let i = 0; i < splitIndex; i++) divisors[i] *= ratio
  }
  return divisors
}
