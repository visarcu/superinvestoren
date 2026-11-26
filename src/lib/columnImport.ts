// src/lib/columnImport.ts — Spalten-Import für Tabellen, die kein Parser kennt
//
// Ein Premium-Nutzer trug seine Käufe von Hand ein, weil seine Hausbank
// (Gladbacher Bank) keinen Parser hat. Statt für jede Bank einen zu bauen,
// zeigt der Import ihm Kopfzeile und Beispielzeilen, er sagt, was in welcher
// Spalte steht, und die Zahlen werden hier deterministisch gelesen: deutsche
// Zahlen ("1.439,36") und Daten ("26.11.2026") wie in flatexXLSXParser.ts.
//
// Die Datei läuft danach durch denselben Ablauf wie jeder andere Import
// (ISINs auflösen, Cash, Vorschau, Import). Ohne ISIN sind WKN oder Name der
// Schlüssel, unter dem der Nutzer das Papier im Schritt "Wertpapiere zuordnen"
// einem Kürzel zuordnet.
//
// Keine Server-Abhängigkeiten: Das Modal nutzt die Vorschläge und die Prüfung
// der Zuordnung, die Route liest damit die Buchungen.

import type { FlatexParsedTransaction } from './flatexPDFParser'

export type ColumnField =
  | 'date'
  | 'isin'
  | 'wkn'
  | 'name'
  | 'kind'
  | 'quantity'
  | 'price'
  | 'amount'
  | 'fee'
  | 'currency'

export const COLUMN_FIELDS: { field: ColumnField; label: string; hint: string }[] = [
  { field: 'date', label: 'Datum', hint: 'Handels- oder Buchungstag' },
  { field: 'isin', label: 'ISIN', hint: '12 Zeichen, z. B. DE0007164600' },
  { field: 'wkn', label: 'WKN', hint: '6 Zeichen, z. B. 716460' },
  { field: 'name', label: 'Wertpapier', hint: 'Name des Papiers' },
  { field: 'kind', label: 'Art', hint: 'Kauf, Verkauf oder Dividende' },
  { field: 'quantity', label: 'Stückzahl', hint: 'Anzahl der Anteile' },
  { field: 'price', label: 'Kurs', hint: 'Preis je Stück' },
  { field: 'amount', label: 'Betrag', hint: 'Gesamtbetrag der Buchung' },
  { field: 'fee', label: 'Gebühren', hint: 'Provision und Spesen' },
  { field: 'currency', label: 'Währung', hint: 'EUR, USD, CHF' },
]

export type ColumnKindType = 'buy' | 'sell' | 'dividend'

export const KIND_TYPES: ColumnKindType[] = ['buy', 'sell', 'dividend']

export const KIND_LABELS: Record<ColumnKindType | 'ignore', string> = {
  buy: 'Kauf',
  sell: 'Verkauf',
  dividend: 'Dividende',
  ignore: 'Überspringen',
}

/** Wörter der Art-Spalte, die Kauf, Verkauf oder Dividende bedeuten */
export interface ColumnKinds {
  buy: string[]
  sell: string[]
  dividend: string[]
}

export interface ColumnMapping {
  /** Feld → Spaltenindex (0-basiert) */
  columns: Partial<Record<ColumnField, number>>
  kinds: ColumnKinds
}

/** Gelesene Tabelle: Kopf und Datenzeilen mit den Rohwerten der Zellen */
export interface ColumnTable {
  header: string[]
  rows: unknown[][]
  /** Zeile der Datei (0-basiert), in der der Kopf stand */
  headerRow: number
  sheet?: string
  delimiter?: string
}

/** Was das Modal für den Zuordnungsschritt braucht, ohne die ganze Datei */
export interface ColumnTablePreview {
  fileName: string
  header: string[]
  /** Bis zu drei Beispielzeilen als Text, Zahlen deutsch formatiert */
  sampleRows: string[][]
  /** Datenzeilen insgesamt */
  rowCount: number
  /** Je Spalte die verschiedenen Werte, wenn es höchstens MAX_DISTINCT_VALUES sind */
  distinctValues: Record<number, string[]>
  sheet?: string
  delimiter?: string
  /** Zuordnung aus den Kopfzeilen, deterministisch */
  suggestedColumns: Partial<Record<ColumnField, number>>
}

export interface ColumnParseResult {
  transactions: FlatexParsedTransaction[]
  errors: string[]
  /** Was nicht übernommen wurde und warum, für die Vorschau */
  notices: string[]
  /** Werte der Art-Spalte ohne Zuordnung, mit Anzahl */
  skippedKinds: Record<string, number>
}

export const SAMPLE_ROWS = 3
export const MAX_DISTINCT_VALUES = 12
/** So viele Zeilen werden nach einem Spaltenkopf durchsucht */
const HEADER_SEARCH_ROWS = 20
const MAX_ROW_ERRORS = 10
const MAX_CELL_TEXT = 80

export const COLUMN_IMPORT_FORMAT = 'columns'
export const COLUMN_IMPORT_LABEL = 'Spalten-Import'

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/
const WKN_PATTERN = /^[A-Z0-9]{6}$/

// ---------------------------------------------------------------------------
// Zellen lesen
// ---------------------------------------------------------------------------

// Excel zählt Tage ab 1899-12-30 (Lotus-1-2-3-Fehler: 1900 gilt als Schaltjahr)
function excelSerialToDate(serial: number): string {
  const epoch = Date.UTC(1899, 11, 30)
  return new Date(epoch + Math.round(serial) * 86400000).toISOString().slice(0, 10)
}

// SheetJS liest einen Tag ohne Uhrzeit als Mitternacht in der Zeitzone des
// Servers; auf den Tag gerundet ergibt das überall dasselbe Datum.
function dateToISO(date: Date): string {
  return new Date(Math.round(date.getTime() / 86400000) * 86400000).toISOString().slice(0, 10)
}

function isoIfValid(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.toISOString().slice(0, 10)
}

/**
 * Datum einer Zelle als YYYY-MM-DD. Versteht Excel-Daten und -Seriennummern
 * sowie Text: "26.11.2026", "6.4.26", "2026-11-26", "26/11/2026", jeweils
 * auch mit Uhrzeit dahinter. null, wenn die Zelle kein Datum enthält.
 */
export function parseCellDate(cell: unknown): string | null {
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? null : dateToISO(cell)
  if (typeof cell === 'number') {
    // Seriennummern zwischen 1954 und 2119; alles andere ist eine Zahl, kein Datum
    return cell > 20000 && cell < 80000 ? excelSerialToDate(cell) : null
  }
  const text = String(cell ?? '').trim()
  if (!text) return null

  let m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]|$)/)
  if (m) return isoIfValid(Number(m[1]), Number(m[2]), Number(m[3]))

  m = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?:\s|$)/)
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return isoIfValid(year, Number(m[2]), Number(m[1]))
  }

  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/)
  if (m) return isoIfValid(Number(m[3]), Number(m[2]), Number(m[1]))

  m = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s|$)/)
  if (m) return isoIfValid(Number(m[1]), Number(m[2]), Number(m[3]))

  return null
}

/**
 * Zahl einer Zelle. Deutsch ("1.439,36"), englisch ("1,439.36" oder "1439.36"),
 * mit Währungszeichen oder Einheit ("12,50 EUR", "10 Stk."), nachgestelltem
 * Minus ("12,50-") oder in Klammern. Steht nur ein Komma darin, trennt es die
 * Dezimalen (wie bei Flatex); steht nur ein Punkt darin, ebenfalls.
 * null, wenn die Zelle keine Zahl enthält (anders als 0).
 */
export function parseCellNumber(cell: unknown): number | null {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null
  if (cell == null || cell instanceof Date) return null
  let text = String(cell).trim()
  if (!text) return null

  text = text
    .replace(/[€$£]/g, '')
    .replace(/\b(eur|usd|gbp|chf|stk|st|stück|stueck|anteile)\b\.?/gi, '')
    .replace(/[\s ']/g, '')

  let sign = 1
  if (/^\(.*\)$/.test(text)) {
    sign = -1
    text = text.slice(1, -1)
  }
  if (text.endsWith('-')) {
    sign = -1
    text = text.slice(0, -1)
  }
  if (text.startsWith('-')) {
    sign = -sign
    text = text.slice(1)
  } else if (text.startsWith('+')) {
    text = text.slice(1)
  }
  if (!/^\d[\d.,]*$/.test(text) && !/^[.,]\d+$/.test(text)) return null

  const commas = (text.match(/,/g) ?? []).length
  const dots = (text.match(/\./g) ?? []).length
  let normalized: string
  if (commas > 0 && dots > 0) {
    // Beide Zeichen: Das hintere trennt die Dezimalen
    normalized = text.lastIndexOf(',') > text.lastIndexOf('.')
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '')
  } else if (commas === 1) {
    normalized = text.replace(',', '.')
  } else if (commas > 1) {
    normalized = text.replace(/,/g, '')
  } else if (dots > 1) {
    normalized = text.replace(/\./g, '')
  } else {
    normalized = text
  }

  const value = Number(normalized)
  return Number.isFinite(value) ? sign * value : null
}

/** Zelle als Text, Daten deutsch ("26.11.2026"), Zahlen so wie gespeichert. */
export function cellText(cell: unknown): string {
  if (cell == null) return ''
  if (cell instanceof Date) {
    const iso = parseCellDate(cell)
    return iso ? iso.split('-').reverse().join('.') : ''
  }
  return String(cell).trim()
}

/** Zelle für die Anzeige: Zahlen deutsch formatiert, lange Texte gekürzt. */
export function displayText(cell: unknown): string {
  if (typeof cell === 'number' && Number.isFinite(cell)) {
    return cell.toLocaleString('de-DE', { maximumFractionDigits: 8 })
  }
  const text = cellText(cell)
  return text.length > MAX_CELL_TEXT ? `${text.slice(0, MAX_CELL_TEXT - 1)}…` : text
}

function isTextCell(cell: unknown): boolean {
  if (cell == null || cell instanceof Date || typeof cell === 'number') return false
  const text = String(cell).trim()
  if (!text) return false
  return parseCellNumber(text) === null && parseCellDate(text) === null
}

// ---------------------------------------------------------------------------
// Tabelle aus Zeilen
// ---------------------------------------------------------------------------

/**
 * Zeile des Spaltenkopfs: die erste mit mindestens zwei Textzellen, die weder
 * Zahl noch Datum sind. Exporte tragen oft Titel, Zeitraum und Depotnummer
 * über dem Kopf.
 */
export function findHeaderRow(rows: unknown[][]): number {
  const limit = Math.min(rows.length, HEADER_SEARCH_ROWS)
  for (let i = 0; i < limit; i++) {
    const row = rows[i]
    if (!Array.isArray(row)) continue
    if (row.filter(isTextCell).length >= 2) return i
  }
  return -1
}

function isEmptyRow(row: unknown): boolean {
  return !Array.isArray(row) || !row.some(cell => cell != null && String(cell).trim() !== '')
}

/** Kopf und Datenzeilen aus den Rohzeilen einer Datei (CSV oder Tabellenblatt). */
export function tableFromRows(rows: unknown[][], meta: { sheet?: string; delimiter?: string } = {}): ColumnTable {
  const headerRow = findHeaderRow(rows)
  const start = headerRow >= 0 ? headerRow : 0
  const headerCells = headerRow >= 0 && Array.isArray(rows[headerRow]) ? rows[headerRow] : []
  const dataRows = rows.slice(start + 1).filter(row => !isEmptyRow(row)) as unknown[][]
  const columnCount = Math.max(headerCells.length, ...dataRows.map(row => row.length), 0)

  const header: string[] = []
  for (let i = 0; i < columnCount; i++) {
    const text = cellText(headerCells[i])
    header.push(text || `Spalte ${i + 1}`)
  }

  return { header, rows: dataRows, headerRow, ...meta }
}

// ---------------------------------------------------------------------------
// CSV lesen
// ---------------------------------------------------------------------------

const DELIMITERS = [';', ',', '\t', '|']

/** Das Trennzeichen, das in der ersten Zeile außerhalb von Anführungszeichen am häufigsten steht. */
export function detectDelimiter(line: string): string {
  let best = ';'
  let bestCount = -1
  for (const delimiter of DELIMITERS) {
    const count = splitCsvLine(line, delimiter).length - 1
    if (count > bestCount) {
      best = delimiter
      bestCount = count
    }
  }
  return best
}

/** CSV-Zeile mit Anführungszeichen ("" als Anführungszeichen im Text) */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

/** CSV-Text als Tabelle; Trennzeichen und Kopfzeile werden erkannt. */
export function readCsvTable(text: string): ColumnTable {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(line => line.trim())
  const delimiter = detectDelimiter(lines[0] ?? '')
  const rows = lines.map(line => splitCsvLine(line, delimiter))
  return tableFromRows(rows, { delimiter })
}

// ---------------------------------------------------------------------------
// Vorschläge aus den Kopfzeilen
// ---------------------------------------------------------------------------

// Reihenfolge je Feld = Vorrang: "Handelstag" schlägt "Valuta", "Kurs" schlägt "Limit".
const HEADER_PATTERNS: { field: ColumnField; patterns: RegExp[]; exclude?: RegExp }[] = [
  { field: 'isin', patterns: [/isin/] },
  { field: 'wkn', patterns: [/\bwkn\b/, /wertpapierkenn/] },
  {
    field: 'date',
    patterns: [
      /^(handels|ausführungs|ausfuehrungs|buchungs|order|transaktions|geschäfts|geschaefts)?(datum|tag|date)\b/,
      /^(trade|transaction|booking|execution)\s?date/,
      /^datum/,
      /^date/,
      /zeitpunkt/,
      /^valuta/,
    ],
  },
  {
    field: 'kind',
    patterns: [
      /^art\b/,
      /(geschäfts|geschaefts|transaktions|umsatz|buchungs|order|vorgangs|geschäft)art/,
      /^(typ|type|vorgang|transaktion|transaction|buchungstext|side|richtung|aktion|action)\b/,
      /^kauf\s?\/\s?verkauf/,
    ],
  },
  {
    field: 'quantity',
    patterns: [/^(stück|stueck|stk|anzahl|nominal|menge|quantity|shares|anteile|qty|units)/, /stück|stueck|anzahl|menge/],
    exclude: /kurs|preis|wert|betrag/,
  },
  {
    field: 'price',
    patterns: [/^(ausführungs|ausfuehrungs|stück|stueck)?kurs\b/, /^(preis|price)/, /kurs\s?(je|pro|\/)/, /preis|price/, /limit/],
    exclude: /devisen|wechsel|kurswert|wert$|fx|umrechnung/,
  },
  {
    field: 'amount',
    patterns: [/^(betrag|kurswert|gesamt|summe|amount|total|umsatz|volumen|wert|endbetrag|nettobetrag)\b/, /betrag|amount|kurswert|total/],
    exclude: /gebühr|gebuehr|steuer|devisen|provision|spesen|fee/,
  },
  {
    field: 'fee',
    patterns: [/gebühr|gebuehr|provision|spesen|kosten|fee|entgelt|commission/],
  },
  {
    field: 'currency',
    patterns: [/^(währung|waehrung|currency|whg|ccy|curr)\b/, /währung|waehrung|currency/],
  },
  {
    field: 'name',
    patterns: [
      /^(wertpapier|bezeichnung|name|instrument|titel|security|produkt|gattung|wertpapiername|wertpapierbezeichnung)/,
      /bezeichnung|wertpapier|instrument|security|^name/,
    ],
    exclude: /art|typ|kenn|nummer|isin|wkn/,
  },
]

/** Spalten anhand ihrer Kopfzeile zuordnen. Jede Spalte höchstens einmal. */
export function guessColumns(header: string[]): Partial<Record<ColumnField, number>> {
  const lower = header.map(h => h.toLowerCase().replace(/\s+/g, ' ').trim())
  const taken = new Set<number>()
  const result: Partial<Record<ColumnField, number>> = {}

  for (const { field, patterns, exclude } of HEADER_PATTERNS) {
    for (const pattern of patterns) {
      const index = lower.findIndex((cell, i) => !taken.has(i) && cell && pattern.test(cell) && !(exclude && exclude.test(cell)))
      if (index >= 0) {
        result[field] = index
        taken.add(index)
        break
      }
    }
  }
  return result
}

/** Werte der Art-Spalte nach bekannten Wörtern vorbelegen. Verkauf vor Kauf: "Verkauf" enthält "kauf". */
export function guessKindType(value: string): ColumnKindType | 'ignore' {
  const text = value.toLowerCase()
  if (/verkauf|sell|sale|veräußer|veraeusser|abgang|ausbuchung|verkäufe|verkaeufe/.test(text)) return 'sell'
  if (/dividend|ausschütt|ausschuett|ertrag|distribution|gutschrift/.test(text)) return 'dividend'
  if (/kauf|buy|purchase|sparplan|zeichnung|zugang|einbuchung|käufe|kaeufe|ausführung|ausfuehrung/.test(text)) return 'buy'
  return 'ignore'
}

export function guessKindAssignments(values: string[]): Record<string, ColumnKindType | 'ignore'> {
  const result: Record<string, ColumnKindType | 'ignore'> = {}
  for (const value of values) result[value] = guessKindType(value)
  return result
}

/** Zuordnung je Wert → Wortlisten, wie die Route sie erwartet */
export function kindsFromAssignments(assignments: Record<string, ColumnKindType | 'ignore'>): ColumnKinds {
  const kinds: ColumnKinds = { buy: [], sell: [], dividend: [] }
  for (const [value, type] of Object.entries(assignments)) {
    if (type !== 'ignore') kinds[type].push(value)
  }
  return kinds
}

/** Wörter aus einem Textfeld, durch Komma oder Zeilenumbruch getrennt */
export function splitKindWords(text: string): string[] {
  return [...new Set(text.split(/[,\n;]/).map(word => word.trim()).filter(Boolean))]
}

// ---------------------------------------------------------------------------
// Vorschau für das Modal
// ---------------------------------------------------------------------------

export function buildColumnPreview(table: ColumnTable, fileName: string): ColumnTablePreview {
  const columnCount = table.header.length
  const distinctValues: Record<number, string[]> = {}

  for (let col = 0; col < columnCount; col++) {
    const counts = new Map<string, number>()
    let textCells = 0
    let tooMany = false
    for (const row of table.rows) {
      const text = cellText(row[col])
      if (!text) continue
      if (isTextCell(row[col])) textCells++
      counts.set(text, (counts.get(text) ?? 0) + 1)
      if (counts.size > MAX_DISTINCT_VALUES) {
        tooMany = true
        break
      }
    }
    // Nur Spalten mit Text: Eine Spalte voller Zahlen ist keine Art-Spalte
    if (tooMany || counts.size === 0 || textCells === 0) continue
    distinctValues[col] = [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([value]) => value.length > MAX_CELL_TEXT ? `${value.slice(0, MAX_CELL_TEXT - 1)}…` : value)
  }

  return {
    fileName,
    header: table.header,
    sampleRows: table.rows.slice(0, SAMPLE_ROWS).map(row =>
      Array.from({ length: columnCount }, (_, col) => displayText(row[col]))
    ),
    rowCount: table.rows.length,
    distinctValues,
    sheet: table.sheet,
    delimiter: table.delimiter,
    suggestedColumns: guessColumns(table.header),
  }
}

// ---------------------------------------------------------------------------
// Zuordnung prüfen
// ---------------------------------------------------------------------------

/** Meldung für den Nutzer, null wenn die Zuordnung reicht. */
export function validateColumnMapping(mapping: ColumnMapping, columnCount: number): string | null {
  const columns = mapping.columns
  const used = new Map<number, ColumnField>()
  for (const [field, index] of Object.entries(columns) as [ColumnField, number | undefined][]) {
    if (index == null) continue
    if (!Number.isInteger(index) || index < 0 || index >= columnCount) return `Die Spalte für "${labelOf(field)}" gibt es nicht.`
    const other = used.get(index)
    if (other) return `"${labelOf(other)}" und "${labelOf(field)}" zeigen auf dieselbe Spalte.`
    used.set(index, field)
  }
  if (columns.date == null) return 'Bitte die Spalte mit dem Datum zuordnen.'
  if (columns.isin == null && columns.wkn == null && columns.name == null) {
    return 'Bitte ISIN, WKN oder den Namen des Wertpapiers zuordnen.'
  }
  if (columns.quantity == null && columns.amount == null) return 'Bitte Stückzahl oder Betrag zuordnen.'
  if (columns.price == null && columns.amount == null) return 'Bitte Kurs oder Betrag zuordnen.'
  if (columns.kind != null) {
    const words = KIND_TYPES.flatMap(type => mapping.kinds[type])
    if (words.length === 0) return 'Bitte angeben, welche Werte der Art-Spalte Kauf, Verkauf oder Dividende bedeuten.'
  }
  return null
}

function labelOf(field: ColumnField): string {
  return COLUMN_FIELDS.find(f => f.field === field)?.label ?? field
}

// ---------------------------------------------------------------------------
// Buchungen lesen
// ---------------------------------------------------------------------------

function normalizeKind(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Buchungsart eines Art-Werts. Erst der ganze Wert, dann das Wort darin
 * ("Kauf" trifft "Order Kauf", nicht "Verkauf"). Passt mehr als eine Art,
 * bleibt die Zeile liegen.
 */
export function classifyKind(text: string, kinds: ColumnKinds): ColumnKindType | null {
  const value = normalizeKind(text)
  if (!value) return null

  const exact = KIND_TYPES.filter(type => kinds[type].some(word => normalizeKind(word) === value))
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) return null

  const partial = KIND_TYPES.filter(type =>
    kinds[type].some(word => {
      const normalized = normalizeKind(word)
      if (normalized.length < 3) return false
      return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(normalized)}($|[^\\p{L}\\p{N}])`, 'u').test(value)
    })
  )
  return partial.length === 1 ? partial[0] : null
}

function normalizeCurrency(text: string): string {
  const value = text.trim().toUpperCase()
  if (!value) return 'EUR'
  if (value === '€') return 'EUR'
  if (value === '$') return 'USD'
  if (value === '£') return 'GBP'
  return value.slice(0, 3)
}

function formatKinds(kinds: Record<string, number>): string {
  return Object.entries(kinds)
    .sort(([, a], [, b]) => b - a)
    .map(([kind, count]) => `"${kind}" (${count})`)
    .join(', ')
}

/**
 * Liest die Buchungen einer Tabelle nach der Zuordnung des Nutzers.
 *
 * Kauf und Verkauf brauchen Stückzahl und Kurs; fehlt der Kurs, ergibt er sich
 * aus Betrag und Stückzahl. Gebühren kommen aus der Gebührenspalte oder, wenn
 * es keine gibt, aus der Differenz zwischen Betrag und Kurswert wie bei Flatex.
 * Dividenden brauchen den Betrag; die Stückzahl ist dann 1, wenn die Datei
 * keine nennt. Ohne Art-Spalte gilt jede Zeile als Kauf, mit negativer
 * Stückzahl als Verkauf.
 */
export function parseColumnTable(table: ColumnTable, mapping: ColumnMapping, fileName: string): ColumnParseResult {
  const transactions: FlatexParsedTransaction[] = []
  const errors: string[] = []
  const notices: string[] = []
  const skippedKinds: Record<string, number> = {}
  const currencies: Record<string, number> = {}
  let rowErrors = 0
  let derivedFees = 0

  const problem = mapping.columns.date == null ? validateColumnMapping(mapping, table.header.length) : null
  if (problem) return { transactions, errors: [problem], notices, skippedKinds }

  const col = mapping.columns
  const read = (field: ColumnField, row: unknown[]): unknown => (col[field] == null ? undefined : row[col[field]!])
  const text = (field: ColumnField, row: unknown[]): string => cellText(read(field, row))
  const number = (field: ColumnField, row: unknown[]): number | null =>
    col[field] == null ? null : parseCellNumber(read(field, row))

  const rowError = (index: number, message: string) => {
    rowErrors++
    if (rowErrors <= MAX_ROW_ERRORS) {
      errors.push(`Zeile ${table.headerRow + 2 + index}: ${message}`)
    }
  }

  table.rows.forEach((row, index) => {
    let type: ColumnKindType
    if (col.kind != null) {
      const kindText = text('kind', row)
      const classified = classifyKind(kindText, mapping.kinds)
      if (!classified) {
        const key = kindText || '(leer)'
        skippedKinds[key] = (skippedKinds[key] ?? 0) + 1
        return
      }
      type = classified
    } else {
      const quantity = number('quantity', row)
      type = quantity != null && quantity < 0 ? 'sell' : 'buy'
    }

    const date = parseCellDate(read('date', row))
    if (!date) {
      rowError(index, `Datum "${text('date', row)}" nicht lesbar.`)
      return
    }

    const isinRaw = text('isin', row).toUpperCase().replace(/\s/g, '')
    const isin = ISIN_PATTERN.test(isinRaw) ? isinRaw : ''
    const wknRaw = text('wkn', row).toUpperCase().replace(/\s/g, '')
    const wkn = WKN_PATTERN.test(wknRaw) ? wknRaw : ''
    const name = text('name', row)
    if (!isin && !wkn && !name) {
      rowError(index, `Kein Wertpapier erkennbar${isinRaw ? ` ("${isinRaw}" ist keine ISIN)` : wknRaw ? ` ("${wknRaw}" ist keine WKN)` : ''}.`)
      return
    }
    const label = name || isin || wkn

    const quantityCell = number('quantity', row)
    const priceCell = number('price', row)
    const amountCell = number('amount', row)
    const feeCell = number('fee', row)
    const currency = normalizeCurrency(text('currency', row))
    currencies[currency] = (currencies[currency] ?? 0) + 1
    const fees = feeCell != null ? Math.abs(feeCell) : 0

    if (type === 'dividend') {
      const total = amountCell != null
        ? Math.abs(amountCell)
        : quantityCell != null && priceCell != null ? Math.abs(quantityCell * priceCell) : null
      if (total == null || total <= 0) {
        rowError(index, `Dividende ${label} ohne Betrag, nicht übernommen.`)
        return
      }
      const quantity = quantityCell != null && quantityCell > 0 ? Math.abs(quantityCell) : 1
      transactions.push({
        type,
        name,
        isin,
        wkn,
        quantity,
        price: total / quantity,
        totalValue: total,
        fees,
        endAmount: total - fees,
        date,
        currency,
        exchange: '',
        notes: `${COLUMN_IMPORT_LABEL} — ${fileName}`,
      })
      return
    }

    const quantity = quantityCell != null ? Math.abs(quantityCell) : 0
    if (quantity <= 0) {
      rowError(index, `${KIND_LABELS[type]} ${label} ohne Stückzahl, nicht übernommen.`)
      return
    }
    let price = priceCell != null && priceCell !== 0 ? Math.abs(priceCell) : 0
    if (price <= 0 && amountCell != null && amountCell !== 0) price = Math.abs(amountCell) / quantity
    if (price <= 0) {
      rowError(index, `${KIND_LABELS[type]} ${label} ohne Kurs, nicht übernommen.`)
      return
    }

    const isBuy = type === 'buy'
    const totalValue = quantity * price
    let rowFees = fees
    if (col.fee == null && col.amount != null && amountCell != null && amountCell !== 0 && priceCell != null) {
      // Betrag = Kurswert + Gebühren beim Kauf, Kurswert - Gebühren beim Verkauf.
      // Rundungsrauschen unter einem Cent zählt nicht.
      const diff = isBuy ? Math.abs(amountCell) - totalValue : totalValue - Math.abs(amountCell)
      rowFees = Math.abs(diff) >= 0.01 ? Math.max(0, Math.round(diff * 100) / 100) : 0
      if (rowFees > 0) derivedFees++
    }

    transactions.push({
      type,
      name,
      isin,
      wkn,
      quantity,
      price,
      totalValue,
      fees: rowFees,
      endAmount: isBuy ? totalValue + rowFees : totalValue - rowFees,
      date,
      currency,
      exchange: '',
      notes: `${COLUMN_IMPORT_LABEL} — ${fileName}`,
    })
  })

  if (rowErrors > MAX_ROW_ERRORS) {
    errors.push(`… und ${rowErrors - MAX_ROW_ERRORS} weitere Zeilen nicht übernommen.`)
  }

  const skippedCount = Object.values(skippedKinds).reduce((sum, n) => sum + n, 0)
  if (skippedCount > 0) {
    notices.push(
      `${skippedCount} ${skippedCount === 1 ? 'Zeile' : 'Zeilen'} nicht übernommen, weil die Art keiner Buchungsart ` +
      `zugeordnet ist: ${formatKinds(skippedKinds)}.`
    )
  }

  if (derivedFees > 0) {
    notices.push(
      `Die Datei nennt keine Gebühren. Bei ${derivedFees} ${derivedFees === 1 ? 'Buchung' : 'Buchungen'} ergibt sich ` +
      `die Gebühr aus der Differenz zwischen Betrag und Stückzahl mal Kurs.`
    )
  }

  const foreign = Object.entries(currencies).filter(([currency]) => currency !== 'EUR')
  if (foreign.length > 0) {
    const list = foreign.map(([currency, count]) => `${count} in ${currency}`).join(', ')
    notices.push(
      `Buchungen in Fremdwährung (${list}): Kurse und Beträge werden so übernommen, wie sie in der Datei stehen. ` +
      `Einen Umrechnungskurs nennt die Datei nicht.`
    )
  }

  if (transactions.length === 0 && errors.length === 0) {
    errors.push(
      skippedCount > 0
        ? `Keine Buchung übernommen: Kein Wert der Art-Spalte ist Kauf, Verkauf oder Dividende zugeordnet (${formatKinds(skippedKinds)}).`
        : `Keine Buchungen in "${fileName}" gefunden.`
    )
  }

  return { transactions, errors, notices, skippedKinds }
}
