// src/lib/workbookFormat.ts — Beschreibt eine Tabellendatei, die kein Parser erkennt.
//
// Bisher lief jede unbekannte XLSX als "Freedom24 Auftragshistorie" und scheiterte
// mit Freedom24-Meldungen, auch der Export einer Hausbank. Die Beschreibung steht
// in der Meldung an den Nutzer und im Server-Log, damit der Support sieht, welche
// Datei ankam, ohne ihre Inhalte zu kennen.

// So viele Zeilen werden nach einem Spaltenkopf durchsucht
const HEADER_SEARCH_ROWS = 20
const MAX_COLUMNS_NAMED = 12

function textCells(row: unknown): string[] {
  if (!Array.isArray(row)) return []
  return row.map(cell => String(cell ?? '').trim()).filter(Boolean)
}

/** Die erste Zeile mit mindestens zwei Textzellen gilt als Spaltenkopf. */
export function guessHeaderRow(rows: unknown[][]): string[] {
  const limit = Math.min(rows.length, HEADER_SEARCH_ROWS)
  for (let i = 0; i < limit; i++) {
    const cells = textCells(rows[i])
    if (cells.length >= 2 && cells.filter(c => Number.isNaN(Number(c))).length >= 2) return cells
  }
  return []
}

/** Z. B. `Tabellenblatt "Umsätze", Spalten: Datum, Wertpapier, Stück, Kurs` */
export function describeWorkbook(sheetNames: string[], rows: unknown[][]): string {
  const header = guessHeaderRow(rows)
  const columns = header.slice(0, MAX_COLUMNS_NAMED).join(', ') + (header.length > MAX_COLUMNS_NAMED ? ', …' : '')
  const sheet = sheetNames[0] ?? '?'
  const more = sheetNames.length > 1 ? ` und ${sheetNames.length - 1} weitere` : ''
  return `Tabellenblatt "${sheet}"${more}, ${columns ? `Spalten: ${columns}` : 'ohne erkennbare Kopfzeile'}`
}

/**
 * Freedom24-Auftragshistorie: Nummer | Datum | Abrechnungen | Ticker | Transaktion |
 * Anzahl | Preis | Menge | Gewinn | Gebühr. Ohne diese Spalten ist es eine andere Datei.
 */
export function looksLikeFreedom24Orders(rows: Record<string, unknown>[]): boolean {
  const keys = Object.keys(rows[0] ?? {}).map(key => key.trim().toLowerCase())
  return ['ticker', 'transaktion', 'datum'].every(key => keys.includes(key))
}
