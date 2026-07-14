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

/** Prüft, ob eine Transaktion den Split zu diesem Datum bereits verrechnet hat. */
export function hasSplitApplied(notes: string | null | undefined, splitDate: string): boolean {
  if (!notes) return false
  return notes.includes('Aktiensplit') && notes.includes(`vom ${splitDate} verrechnet`)
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
