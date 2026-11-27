// src/lib/flatexXLSXParser.ts — Parser für Flatex "Depotumsätze" XLSX-Export
//
// Quelle: Flatex → Konto/Depot → Depotumsätze → Export als XLSX
//
// Spalten der bekannten Dateien (der Kopf hat Lücken ohne Namen):
//   [0] Buchungstag     (Datum, in anderen Exporten auch "26.11.2026" als Text)
//   [1] Valuta
//   [2] Bezeichnung      (Wertpapiername)
//   [3] ISIN
//   [4] Nominal (Stk.)   (kann fractional sein, negativ bei Ausbuchungen)
//   [5] "Stück"          (Einheit-Label)
//   [6] Betrag            (Gesamtwert)
//   [7] Währung Betrag    ("€" oder "$")
//   [8] Kurs              (Preis pro Stück)
//   [9] Währung Kurs
//  [10] Devisenkurs       (1 für EUR, z.B. 1.12294 für USD)
//  [11] TA.-Nr.          (Buchungsnummer, je Zeile verschieden)
//  [12] Buchungsinformation (enthält Transaktionstyp + ISIN + Ordernummer)
//
// Die Spalten werden über die Kopfzeile gefunden, die Position oben ist nur der
// Rückfall. Ein Export mit einer Titelzeile über dem Kopf oder einer Spalte mehr
// ergab vorher stumm "keine Transaktionen", und niemand konnte sagen, warum.
//
// Transaktionstypen in Buchungsinformation:
//   "Ausführung ORDER Kauf ..."    → buy
//   "Ausführung ORDER Verkauf ..." → sell
//   "Erträgnisausschüttung ..."    → nicht buchen, nur Hinweis (Einstandskorrektur ohne
//                                    ausgezahlten Betrag, siehe unten)
//   "Thesaurierung transparenter Fonds ..." → ignorieren (Steuerevent)
//   "Lagerstellenwechsel in ..."   → ignorieren (interner Transfer)
//   alles andere (Depoteingang, Einbuchung, Kapitalmaßnahme, ...) → nicht
//   übernommen, aber in der Meldung mit Art und Anzahl genannt

import type { FlatexParsedTransaction } from './flatexPDFParser'

export interface FlatexXLSXDiagnostics {
  /** Zeile (0-basiert), in der der Spaltenkopf stand, -1 wenn keiner gefunden */
  headerRow: number
  /** Kopfzellen als Text, für das Server-Log bei leerem Ergebnis */
  header: string[]
  /** Datenzeilen (ohne Kopf, ohne leere Zeilen) */
  dataRows: number
  /** Buchungsarten mit Anzahl, ISINs und Nummern entfernt */
  kinds: Record<string, number>
}

export interface FlatexXLSXParseResult {
  transactions: FlatexParsedTransaction[]
  errors: string[]
  /** Was die Datei nicht hergibt, für die Import-Vorschau */
  notices: string[]
  /** Wo vermutlich Buchungen fehlen, für die Import-Vorschau */
  warnings: string[]
  /** Struktur der Dateien, für das Server-Log, nicht für die Oberfläche */
  diagnostics: FlatexXLSXDiagnostics[]
}

export interface FlatexDepotFile {
  /** Raw-Array-Daten (sheet_to_json mit header: 1) */
  rows: unknown[][]
  fileName: string
}

// Ein Flatex-Export endete nach genau 100 Zeilen mitten in einer Ausschüttung,
// obwohl die Orderliste vom selben Tag noch 27 spätere ausgeführte Orders nannte.
const EXPORT_ROW_LIMIT = 100

// So viele Zeilen über dem Spaltenkopf werden durchsucht (Titel, Zeitraum, Depotnummer)
const HEADER_SEARCH_ROWS = 20

interface FlatexColumns {
  buchungstag: number
  bezeichnung: number
  isin: number
  nominal: number
  betrag: number
  waehrungBetrag: number
  kurs: number
  devisenkurs: number
  taNr: number
  buchungsinformation: number
}

const DEFAULT_COLUMNS: FlatexColumns = {
  buchungstag: 0,
  bezeichnung: 2,
  isin: 3,
  nominal: 4,
  betrag: 6,
  waehrungBetrag: 7,
  kurs: 8,
  devisenkurs: 10,
  taNr: 11,
  buchungsinformation: 12,
}

// Kopfzellen, klein geschrieben. "Kurs" darf nicht auf "Devisenkurs" passen,
// deshalb überall der Zeilenanfang.
const HEADER_PATTERNS: Record<keyof FlatexColumns, RegExp> = {
  buchungstag: /^buchungstag/,
  bezeichnung: /^bezeichnung/,
  isin: /^isin/,
  nominal: /^nominal/,
  betrag: /^betrag/,
  waehrungBetrag: /^w[äa]hrung.*betrag/,
  kurs: /^kurs/,
  devisenkurs: /^devisenkurs/,
  taNr: /^ta\.?\s?-?\s?nr/,
  buchungsinformation: /^buchungsinfo/,
}

function cellText(cell: unknown): string {
  if (cell instanceof Date) return dateCellToISO(cell)
  return String(cell ?? '').trim()
}

function headerCells(row: unknown): string[] {
  return Array.isArray(row) ? row.map(cell => cellText(cell).toLowerCase()) : []
}

function isHeaderRow(cells: string[]): boolean {
  return (
    cells.some(c => HEADER_PATTERNS.buchungstag.test(c)) &&
    cells.some(c => HEADER_PATTERNS.buchungsinformation.test(c) || HEADER_PATTERNS.isin.test(c))
  )
}

/** Zeile des Spaltenkopfs, -1 wenn in den ersten Zeilen keiner steht. */
function findHeaderRow(rows: unknown[][]): number {
  const limit = Math.min(rows.length, HEADER_SEARCH_ROWS)
  for (let i = 0; i < limit; i++) {
    if (isHeaderRow(headerCells(rows[i]))) return i
  }
  return -1
}

/** Spaltenpositionen aus dem Kopf, fehlende Spalten an der bekannten Position. */
function resolveColumns(header: string[]): FlatexColumns {
  const columns: FlatexColumns = { ...DEFAULT_COLUMNS }
  if (!isHeaderRow(header)) return columns

  for (const key of Object.keys(HEADER_PATTERNS) as (keyof FlatexColumns)[]) {
    const index = header.findIndex(cell => HEADER_PATTERNS[key].test(cell))
    if (index >= 0) columns[key] = index
  }
  // Die Währung steht in der Spalte rechts vom Betrag, deren Kopf leer ist
  if (!header.some(cell => HEADER_PATTERNS.waehrungBetrag.test(cell))) {
    columns.waehrungBetrag = columns.betrag + 1
  }
  return columns
}

// Excel Serial Number → ISO Date String (YYYY-MM-DD)
// Excel zählt Tage ab 1900-01-01 (mit dem bekannten Lotus-1-2-3 Bug: 1900 ist kein Schaltjahr)
function excelSerialToDate(serial: number): string {
  // Excel epoch: 1899-12-30 (wegen Lotus-Bug)
  const epoch = new Date(Date.UTC(1899, 11, 30))
  const date = new Date(epoch.getTime() + serial * 86400000)
  return date.toISOString().slice(0, 10)
}

// Datumszelle → ISO Date String. SheetJS liest den Buchungstag (ein ganzer Tag
// ohne Uhrzeit) als Mitternacht in der Zeitzone des Servers. toISOString() ergab
// deshalb östlich von UTC den Vortag, und ein späterer Upload derselben Datei auf
// einem UTC-Server erkannte die Buchungen nicht wieder.
function dateCellToISO(date: Date): string {
  return new Date(Math.round(date.getTime() / 86400000) * 86400000).toISOString().slice(0, 10)
}

/** Buchungstag als YYYY-MM-DD, null wenn die Zelle kein Datum enthält. */
function bookingDate(cell: unknown): string | null {
  if (typeof cell === 'number') return Number.isFinite(cell) ? excelSerialToDate(cell) : null
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? null : dateCellToISO(cell)
  const text = String(cell ?? '').trim()
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  // Als Text exportiert: "26.11.2026" oder "6.4.2026"
  const german = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (german) return `${german[3]}-${german[2].padStart(2, '0')}-${german[1].padStart(2, '0')}`
  return null
}

/** Zahl aus der Zelle, auch deutsch formatiert ("1.439,36") oder mit Währungszeichen oder -kürzel ("50 £", "400 USD"). */
function cellNumber(cell: unknown): number {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : 0
  if (cell == null) return 0
  let text = String(cell).trim().replace(/[^\d.,+-]/g, '')
  if (!text) return 0
  if (text.includes(',')) {
    // Deutsch: Punkt trennt Tausender, Komma die Dezimalen
    text = text.replace(/\./g, '').replace(',', '.')
  }
  const value = Number(text)
  return Number.isFinite(value) ? value : 0
}

function formatGermanDate(iso: string): string {
  return iso.split('-').reverse().join('.')
}

/** Buchungsart ohne ISIN und Nummern, z.B. "Ausführung ORDER Kauf" oder "Depoteingang". */
function bookingKind(buchungsinfo: string): string {
  return buchungsinfo
    .replace(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/g, '')
    .replace(/\b\d{4,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim() || '(leer)'
}

function formatKinds(kinds: Record<string, number>): string {
  return Object.entries(kinds)
    .sort(([, a], [, b]) => b - a)
    .map(([kind, count]) => `"${kind}" (${count})`)
    .join(', ')
}

type BookingType = 'buy' | 'sell' | 'distribution' | 'ignore' | 'unsupported'

function classifyBooking(buchungsinfo: string): BookingType {
  const info = buchungsinfo.toLowerCase()
  if (info.includes('thesaurierung')) return 'ignore'
  if (info.includes('lagerstellenwechsel')) return 'ignore'
  if (info.includes('erträgnisausschüttung') || info.includes('ertraegnisausschuettung')) return 'distribution'
  if (info.includes('verkauf')) return 'sell'
  // "Ausführung ORDER Kauf", auch Sparpläne; "Verkauf" ist oben schon weg
  if (/(^|[^a-zäöü])kauf/.test(info)) return 'buy'
  return 'unsupported'
}

/**
 * Erkennt ob ein XLSX-Workbook eine Flatex Depotumsätze-Datei ist.
 * Prüft Sheet-Name und Kopfzeile; der Kopf darf unter Titelzeilen stehen.
 * Nimmt die Zeilen des ersten Blatts oder, wie früher, nur die erste Zeile.
 */
export function isFlatexDepotXLSX(sheetNames: string[], rows: unknown[][] | unknown[]): boolean {
  // Sheet heißt "Depotumsätze"
  if (sheetNames.some(n => n.toLowerCase().includes('depotumsätze') || n.toLowerCase().includes('depotumsaetze'))) {
    return true
  }
  // Oder: Kopf enthält typische Flatex-Spalten
  const rowList: unknown[][] = rows.length > 0 && Array.isArray(rows[0]) ? (rows as unknown[][]) : [rows]
  const headerRow = findHeaderRow(rowList)
  if (headerRow < 0) return false
  const header = headerCells(rowList[headerRow])
  return (
    header.some(c => HEADER_PATTERNS.isin.test(c)) &&
    header.some(c => HEADER_PATTERNS.buchungsinformation.test(c))
  )
}

/**
 * Erkennt den Kontoumsätze-Export von Flatex (Geldbewegungen mit IBAN/BIC,
 * ohne ISIN). Den lud ein Nutzer statt der Depotumsätze hoch und bekam nur
 * "keine Transaktionen".
 */
export function isFlatexKontoXLSX(sheetNames: string[], rows: unknown[][]): boolean {
  if (isFlatexDepotXLSX(sheetNames, rows)) return false
  if (sheetNames.some(n => n.toLowerCase().includes('kontoumsätze') || n.toLowerCase().includes('kontoumsaetze'))) {
    return true
  }
  const limit = Math.min(rows.length, HEADER_SEARCH_ROWS)
  for (let i = 0; i < limit; i++) {
    const cells = headerCells(rows[i])
    const hasBooking = cells.some(c => HEADER_PATTERNS.buchungstag.test(c)) &&
      cells.some(c => HEADER_PATTERNS.buchungsinformation.test(c))
    if (hasBooking && cells.some(c => /^(iban|bic)/.test(c))) return true
  }
  return false
}

/**
 * Schlüssel, an dem eine Zeile in einer zweiten Datei wiedererkannt wird.
 *
 * Die Ordernummer in der Buchungsinformation reicht dafür nicht. Die
 * PDF-Abrechnungen derselben Orders zählen die Ausführungen durch
 * ("Nr.301390903/1"), die Depotumsätze nennen nur die Order ("301390903"):
 * Teilausführungen einer Order trügen also alle dieselbe Nummer. Die TA.-Nr.
 * steht dagegen für die einzelne Buchung. In einer echten Datei war sie in allen
 * 100 Zeilen verschieden, auch bei Aus- und Einbuchung desselben Vorgangs, und
 * wuchs über neun Monate mit dem Buchungstag, wird also nicht erst beim Export
 * vergeben. Fehlt sie, zählt die ganze Zeile.
 */
function bookingKey(row: unknown[], columns: FlatexColumns): string {
  const taNr = cellText(row[columns.taNr])
  if (taNr) return taNr
  return JSON.stringify(Array.from(row, cell => (cell instanceof Date ? dateCellToISO(cell) : cell ?? null)))
}

interface AnalyzedFile {
  fileName: string
  headerRow: number
  header: string[]
  columns: FlatexColumns
  /** Datenzeilen unter dem Kopf, leere Zeilen entfernt; Index = Zeilennummer in der Datei (0-basiert) */
  data: { row: unknown[]; index: number }[]
}

function analyzeFile({ rows, fileName }: FlatexDepotFile): AnalyzedFile {
  const headerRow = findHeaderRow(rows)
  // Ohne erkennbaren Kopf gilt wie früher: Kopf in Zeile 1, Spalten an der bekannten Position
  const header = headerCells(rows[headerRow >= 0 ? headerRow : 0])
  const columns = resolveColumns(header)
  const data: AnalyzedFile['data'] = []
  for (let i = (headerRow >= 0 ? headerRow : 0) + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!Array.isArray(row) || !row.some(cell => cell != null && cell !== '')) continue
    data.push({ row, index: i })
  }
  return { fileName, headerRow, header, columns, data }
}

/**
 * Warnt bei Dateien, die an der Zeilengrenze des Exports enden und die keine
 * andere Datei fortsetzt. Als Fortsetzung zählt nur eine Datei, in der die letzte
 * Zeile wieder vorkommt: Beginnt die nächste erst danach, kann dazwischen etwas
 * fehlen, schon am Tag des Abbruchs selbst.
 */
function cutOffWarnings(files: AnalyzedFile[]): string[] {
  const exports = files.map(({ data, fileName, columns }) => {
    const keys = data.map(({ row }) => bookingKey(row, columns))
    return {
      fileName,
      keys,
      lastKey: keys[keys.length - 1],
      isCutOff: keys.length === EXPORT_ROW_LIMIT,
      dates: data.map(({ row }) => bookingDate(row[columns.buchungstag])).filter((date): date is string => date !== null),
    }
  })

  const warnings: string[] = []
  // Dieselbe Datei zweimal hochgeladen ist derselbe Abbruch
  const reported = new Set<string>()

  for (const file of exports) {
    if (!file.isCutOff || file.dates.length === 0 || reported.has(file.lastKey)) continue

    const others = exports.filter(other => other !== file)
    const isContinued = others.some(other =>
      other.keys.includes(file.lastKey) && !(other.isCutOff && other.lastKey === file.lastKey)
    )
    if (isContinued) continue
    reported.add(file.lastKey)

    // Abgebrochen wird am Ende der Datei. Was dort fehlt, hängt von ihrer Sortierung ab.
    const end = file.dates[file.dates.length - 1]
    const isDescending = file.dates[0] > end
    const beyond = others
      .flatMap(other => other.dates)
      .filter(date => (isDescending ? date < end : date > end))
      .sort()
    const next = isDescending ? beyond[beyond.length - 1] : beyond[0]

    const day = formatGermanDate(end)
    let gap = `Buchungen ${isDescending ? 'bis zu' : 'ab'} diesem Tag können fehlen`
    if (next) {
      const [from, to] = [end, next].sort().map(formatGermanDate)
      gap = `zwischen dem ${from} und dem ${to} können Buchungen fehlen`
    }

    warnings.push(
      `"${file.fileName}" endet nach genau ${EXPORT_ROW_LIMIT} Zeilen am ${day}. Mehr gibt Flatex vermutlich ` +
      `nicht auf einmal aus, ${gap}. Exportiere die Depotumsätze ${isDescending ? 'bis zum' : 'ab dem'} ${day} ` +
      `noch einmal und lade ${files.length > 1 ? 'alle' : 'beide'} Dateien zusammen hoch. ` +
      `Was doppelt vorkommt, wird nur einmal übernommen.`
    )
  }

  return warnings
}

/**
 * Parst eine einzelne Flatex-Depotumsätze-Datei.
 * Erwartet Raw-Array-Daten (sheet_to_json mit header: 1).
 */
export function parseFlatexDepotXLSX(
  rows: unknown[][],
  fileName: string,
): FlatexXLSXParseResult {
  return parseFlatexDepotXLSXFiles([{ rows, fileName }])
}

/**
 * Parst mehrere Flatex-Depotumsätze-Dateien als ein Depot. Überschneiden sich
 * ihre Zeiträume, zählt jede Buchung nur einmal. Die Reihenfolge der Dateien
 * spielt keine Rolle, und Ausschüttungen werden über alle Dateien gezählt.
 */
export function parseFlatexDepotXLSXFiles(files: FlatexDepotFile[]): FlatexXLSXParseResult {
  const transactions: FlatexParsedTransaction[] = []
  const errors: string[] = []
  const notices: string[] = []
  const diagnostics: FlatexXLSXDiagnostics[] = []
  // Ausschüttungen aller Dateien, "Datum|ISIN" → Wertpapiername
  const distributions = new Map<string, string>()
  // Buchungsarten, die der Import nicht kennt, über alle Dateien
  const unsupported: Record<string, number> = {}
  // Zeilen der bisherigen Dateien, Schlüssel → wie oft. Verglichen wird nur
  // zwischen Dateien: Innerhalb einer Datei ist jede Zeile eine eigene Buchung.
  const knownRows = new Map<string, number>()
  const analyzed: AnalyzedFile[] = []

  for (const file of files) {
    const info = analyzeFile(file)
    analyzed.push(info)
    const { fileName, columns, data } = info
    const kinds: Record<string, number> = {}
    diagnostics.push({ headerRow: info.headerRow, header: info.header, dataRows: data.length, kinds })

    if (data.length === 0) {
      errors.push(`Keine Daten in "${fileName}" gefunden.`)
      continue
    }

    const fileRows = new Map<string, number>()
    // Zeilen mit ISIN und Buchungsinformation; fehlen beide überall, passen die Spalten nicht
    let bookingRows = 0

    for (const { row, index } of data) {
      const buchungstag = row[columns.buchungstag]
      const bezeichnung = cellText(row[columns.bezeichnung])
      const isin = cellText(row[columns.isin])
      const nominal = cellNumber(row[columns.nominal])
      const betrag = cellNumber(row[columns.betrag])
      const waehrungBetrag = cellText(row[columns.waehrungBetrag])
      const kurs = cellNumber(row[columns.kurs])
      const devisenkurs = cellNumber(row[columns.devisenkurs]) || 1
      const buchungsinfo = cellText(row[columns.buchungsinformation])

      // Pflichtfelder prüfen
      if (!isin || !buchungsinfo) continue
      bookingRows++

      const kind = bookingKind(buchungsinfo)
      kinds[kind] = (kinds[kind] ?? 0) + 1

      const bookingType = classifyBooking(buchungsinfo)
      if (bookingType === 'ignore') continue

      // Schon in einer vorigen Datei enthalten?
      const key = bookingKey(row, columns)
      const occurrence = (fileRows.get(key) ?? 0) + 1
      fileRows.set(key, occurrence)
      if (occurrence <= (knownRows.get(key) ?? 0)) continue

      if (bookingType === 'unsupported') {
        unsupported[kind] = (unsupported[kind] ?? 0) + 1
        continue
      }

      const date = bookingDate(buchungstag)
      if (!date) {
        const where = files.length > 1 ? `"${fileName}", Zeile` : 'Zeile'
        errors.push(`${where} ${index + 1}: Ungültiges Datum "${cellText(buchungstag)}" für ${isin}.`)
        continue
      }

      // Ausschüttung: keine Buchung. Die Zeilen zeigen nicht die Zahlung, sondern
      // die Korrektur des Einstands je Tranche: negativ zum bisherigen
      // Durchschnittseinstand ausgebucht, positiv zum korrigierten wieder
      // eingebucht. Der Betrag ist also der Einstand der ganzen Tranche (früher als
      // Dividende gebucht: 2.558,91 € statt rund 16 €). Auch die Differenz der
      // beiden Zeilen ist nicht die Zahlung: In einer echten Datei lag sie je nach
      // Fonds und Termin bei 10 bis 36 % der Ausschüttung je Stück laut FMP. Was
      // ausgezahlt wurde, steht in den Depotumsätzen nirgends.
      if (bookingType === 'distribution') {
        distributions.set(`${date}|${isin}`, bezeichnung)
        continue
      }

      // Kauf / Verkauf
      const isKauf = bookingType === 'buy'
      const qty = Math.abs(nominal)
      const absBetrag = Math.abs(betrag)

      // Ohne Stückzahl oder Kurs lässt sich kein Einstand bilden
      if (qty <= 0 || kurs <= 0) {
        const where = files.length > 1 ? `"${fileName}", Zeile` : 'Zeile'
        errors.push(`${where} ${index + 1}: ${isKauf ? 'Kauf' : 'Verkauf'} ${isin} ohne ${qty <= 0 ? 'Stückzahl' : 'Kurs'}, nicht übernommen.`)
        continue
      }

      // EUR-Preis berechnen: Fremdwährung über den Devisenkurs (Fremdwährung je
      // Euro, z.B. 1,12294 für USD) umrechnen. Als Fremdwährung gilt jede
      // Angabe außer Euro: "$", "USD", "£", "CHF". Vorher nur "$", ein Kauf in
      // "USD" oder "£" stand mit dem Fremdwährungsbetrag als Euro im Depot.
      // Ohne Devisenkurs wird die Zeile nicht übernommen.
      const currencyText = waehrungBetrag.trim()
      const isForeign = currencyText !== '' && !/^(€|eur|euro)$/i.test(currencyText)
      let eurPrice = kurs
      let eurTotal = absBetrag
      if (isForeign) {
        if (!(devisenkurs > 0) || devisenkurs === 1) {
          const where = files.length > 1 ? `"${fileName}", Zeile` : 'Zeile'
          errors.push(`${where} ${index + 1}: ${isKauf ? 'Kauf' : 'Verkauf'} ${isin} in ${currencyText} ohne Devisenkurs, nicht übernommen.`)
          continue
        }
        eurPrice = kurs / devisenkurs
        eurTotal = absBetrag / devisenkurs
      }

      // Gebühren: Flatex Depotumsätze hat KEINE separate Spalte, aber der Betrag
      // enthält bei normalen Trades die Gebühren (Betrag = Q×K + Fee bei Kauf,
      // Betrag = Q×K - Fee bei Verkauf). Bei Bruchstücke/KVG (Sparpläne) sind
      // die Trades gratis → Betrag = Q×K exakt.
      const kursWert = qty * eurPrice
      const diff = isKauf ? eurTotal - kursWert : kursWert - eurTotal
      // Rundungsrauschen ignorieren (< 1 Cent)
      const fees = Math.abs(diff) >= 0.01 ? Math.max(0, diff) : 0
      // totalValue ohne Gebühren (= Kurswert), endAmount inkl. Gebühren
      const totalValueClean = kursWert
      const endAmount = isKauf ? totalValueClean + fees : totalValueClean - fees

      transactions.push({
        type: isKauf ? 'buy' : 'sell',
        name: bezeichnung,
        isin,
        wkn: '',
        quantity: qty,
        price: eurPrice,
        totalValue: totalValueClean,
        fees,
        endAmount,
        date,
        currency: 'EUR',
        exchange: 'Flatex',
        notes: `Flatex XLSX — ${buchungsinfo}`,
      })
    }

    for (const [key, count] of fileRows) {
      knownRows.set(key, Math.max(count, knownRows.get(key) ?? 0))
    }

    if (bookingRows === 0) {
      // Zeilen vorhanden, aber nirgends ISIN und Buchungsinformation: andere Datei oder anderer Aufbau
      const columnsFound = info.header.filter(Boolean).join(', ')
      errors.push(
        `In "${fileName}" steht in keiner Zeile eine ISIN mit Buchungsinformation. ` +
        (columnsFound ? `Gefundene Spalten: ${columnsFound}. ` : 'Ein Spaltenkopf wurde nicht gefunden. ') +
        `Erwartet wird der XLSX-Export aus Konto/Depot → Depotumsätze.`
      )
    }
  }

  // Die Dateien kommen in der Reihenfolge der Auswahl, nicht des Zeitraums
  const distributionList = [...distributions]
  if (files.length > 1) {
    transactions.sort((a, b) => a.date.localeCompare(b.date))
    distributionList.sort(([a], [b]) => a.localeCompare(b))
  }

  if (distributionList.length > 0) {
    const count = distributionList.length
    const names = [...new Set(distributionList.map(([, name]) => name))].filter(Boolean)
    const source = files.length > 1 ? 'Die Flatex-Dateien nennen' : 'Die Flatex-Datei nennt'
    notices.push(
      `${count} ${count === 1 ? 'Ausschüttung' : 'Ausschüttungen'} nicht übernommen: ${source} dazu nur ` +
      `den Einstand vorher und nachher, nicht den ausgezahlten Betrag. Du kannst die Zahlungen über ` +
      `"Aktivität hinzufügen" als Dividende eintragen.` +
      (names.length > 0 ? ` Betroffen: ${names.join(', ')}.` : '')
    )
  }

  const unsupportedCount = Object.values(unsupported).reduce((sum, n) => sum + n, 0)
  if (unsupportedCount > 0) {
    const kindList = formatKinds(unsupported)
    if (transactions.length > 0) {
      notices.push(
        `${unsupportedCount} ${unsupportedCount === 1 ? 'Buchung' : 'Buchungen'} nicht übernommen, weil der Import ` +
        `diese Buchungsart noch nicht kennt: ${kindList}. Depotüberträge und Kapitalmaßnahmen kannst du über ` +
        `"Aktivität hinzufügen" nachtragen. Schick uns die Datei an support@finclue.de, dann bauen wir sie ein.`
      )
    } else {
      const fileNames = files.map(f => `"${f.fileName}"`).join(', ')
      errors.push(
        `Keine Käufe oder Verkäufe in ${fileNames} gefunden. Die Datei enthält nur Buchungsarten, die der ` +
        `Import noch nicht kennt: ${kindList}. Schick uns die Datei an support@finclue.de, dann bauen wir sie ein.`
      )
    }
  }

  if (transactions.length === 0 && errors.length === 0) {
    errors.push(
      `Keine Käufe oder Verkäufe in ${files.map(f => `"${f.fileName}"`).join(', ')} gefunden. ` +
      `Erwartet wird der XLSX-Export aus Konto/Depot → Depotumsätze mit den ausgeführten Orders.`
    )
  }

  return { transactions, errors, notices, warnings: cutOffWarnings(analyzed), diagnostics }
}
