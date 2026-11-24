// src/lib/splitAdjustment.ts — Gemeinsame Helfer für Aktiensplit-Verrechnung
//
// Ein Split wird rückwirkend auf Transaktionen angewendet:
//   quantity × ratio, price ÷ ratio, total_value bleibt (Kapitaleinsatz unverändert).
//
// Jede angepasste Transaktion bekommt eine Marker-Note angehängt. Die Note ist
// gleichzeitig der Idempotenz-Schutz: Beim Anwenden eines Splits auf bereits
// gespeicherte DB-Transaktionen (CSVImportModal) werden Zeilen übersprungen,
// die den Marker für dieses Split-Datum schon tragen — sonst würde ein
// Re-Import derselben Datei den Bestand erneut halbieren/verdoppeln.

/** "1:10" für ratio 10 (Split), "2:1" für ratio 0.5 (Zusammenlegung) */
export function formatSplitLabel(ratio: number): string {
  const fmt = (v: number) => {
    const rounded = Math.round(v * 10000) / 10000
    return Number.isInteger(rounded) ? String(rounded) : String(rounded)
  }
  if (ratio >= 1) return `1:${fmt(ratio)}`
  return `${fmt(1 / ratio)}:1`
}

/**
 * Marker-Note für eine durch Split angepasste Transaktion.
 * WICHTIG: `hasSplitApplied` prüft auf genau diese Struktur — Format nicht
 * ändern, ohne beide Funktionen anzupassen.
 */
export function splitAppliedNote(ratio: number, splitDate: string): string {
  return `Aktiensplit ${formatSplitLabel(ratio)} vom ${splitDate} verrechnet`
}

export interface AppliedSplit {
  date: string
  /** neue Stücke je altem Stück */
  ratio: number
}

// Ein Split steht nicht überall unter demselben Tag: Kursanbieter nennen den
// Ex-Tag, der Broker seine Buchung (Booking 25:1: 06.04.2026 und 07.04.2026).
const SAME_SPLIT_DAYS = 10

/** Liegen zwei Termine so nah beieinander, dass sie denselben Split meinen können? */
export function isNearSplitDate(a: string, b: string): boolean {
  return Math.abs(Date.parse(a) - Date.parse(b)) <= SAME_SPLIT_DAYS * 86400000
}

/** Derselbe Split, auch wenn zwei Quellen ihn unter nahen Tagen führen. */
export function isSameSplit(a: AppliedSplit, b: AppliedSplit): boolean {
  return isNearSplitDate(a.date, b.date) && Math.abs(a.ratio / b.ratio - 1) < 0.01
}

/**
 * Prüft, ob eine Transaktion den Split zu diesem Datum bereits verrechnet hat.
 * Mit `ratio` zählt auch derselbe Split unter einem nahen Datum, sonst würde
 * eine vom Split-Abgleich verrechnete Buchung beim Re-Import noch einmal
 * umgerechnet.
 */
export function hasSplitApplied(
  notes: string | null | undefined,
  splitDate: string,
  ratio?: number
): boolean {
  if (!notes) return false
  if (notes.includes('Aktiensplit') && notes.includes(`vom ${splitDate} verrechnet`)) return true
  if (!ratio) return false
  return appliedSplits(notes).some(split => isSameSplit(split, { date: splitDate, ratio }))
}

/** Note anhängen (bestehende Notes bleiben erhalten). */
export function appendSplitNote(
  notes: string | null | undefined,
  ratio: number,
  splitDate: string
): string {
  const marker = splitAppliedNote(ratio, splitDate)
  return notes && notes.trim().length > 0 ? `${notes} · ${marker}` : marker
}

/**
 * Notes ohne die Split-Marker. Der Marker hängt an gewöhnlichen Buchungen und
 * sagt nichts über ihre Art — wer an den Notes eine Corporate Action erkennen
 * will, darf ihn nicht mitlesen.
 */
export function stripSplitMarkers(notes: string | null | undefined): string {
  return (notes || '').replace(/Aktiensplit \S+ vom \d{4}-\d{2}-\d{2} verrechnet/g, '')
}

/** Die Splits, die diese Buchung laut ihren Marker-Notes schon verrechnet hat. */
export function appliedSplits(notes: string | null | undefined): AppliedSplit[] {
  return [...(notes || '').matchAll(/Aktiensplit ([\d.]+):([\d.]+) vom (\d{4}-\d{2}-\d{2}) verrechnet/g)]
    .map(([, from, to, date]) => ({ date, ratio: Number(to) / Number(from) }))
    .filter(split => split.ratio > 0)
}

// Kursabweichung zwischen zwei Quellen, die noch als "gleich bereinigt" gilt
const REFERENCE_TOLERANCE = 0.005

/**
 * Bringt eine Kurshistorie, die der Anbieter nur zum Teil um einen Split
 * bereinigt hat, vor dem Split durchgehend auf die neue Stückzahl-Basis. Gibt
 * die Zahl der korrigierten Tage zurück.
 *
 * FMP hat ULVR.L nach der Zusammenlegung 8:9 (09.12.2025) nur bis zum
 * 12.11.2025 zurück bereinigt, davor stehen Rohkurse. Auf umgerechnete
 * Buchungen angewendet springt die Position am 12.11. um 12,5 %. Yahoo
 * bereinigt durchgehend: Der Abstand beider Reihen ändert sich genau dort um
 * das Split-Verhältnis. Andere Stufen im Abstand (Yahoo bereinigt auch den
 * Magnum-Abgang, FMP nicht) bleiben unangetastet.
 */
export function completeSplitAdjustment(
  prices: Map<string, number>,
  reference: Map<string, number>,
  split: { date: string; ratio: number }
): number {
  const { date: splitDate, ratio } = split
  if (!(ratio > 0) || Math.abs(ratio - 1) < 2 * REFERENCE_TOLERANCE) return 0

  const gap = (date: string): number | null => {
    const price = prices.get(date) || 0
    const ref = reference.get(date) || 0
    return price > 0 && ref > 0 ? price / ref : null
  }
  const dates = [...prices.keys()].sort()

  // Abstand der bereinigten Reihe: erster Tag nach dem Split, von dort rückwärts
  const firstAfter = dates.find(date => date >= splitDate && gap(date) !== null)
  if (!firstAfter) return 0
  let level = gap(firstAfter)!
  let unadjusted = false
  let repaired = 0

  for (const date of dates.filter(d => d < splitDate).reverse()) {
    const current = gap(date)
    if (current !== null) {
      const step = current / level
      if (Math.abs(step - 1) < REFERENCE_TOLERANCE) unadjusted = false
      else if (Math.abs(step / ratio - 1) < REFERENCE_TOLERANCE) unadjusted = true
      else level = unadjusted ? current / ratio : current
    }
    if (unadjusted) {
      prices.set(date, prices.get(date)! / ratio)
      repaired++
    }
  }
  return repaired
}
