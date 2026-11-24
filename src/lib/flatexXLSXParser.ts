// src/lib/flatexXLSXParser.ts — Parser für Flatex "Depotumsätze" XLSX-Export
//
// Quelle: Flatex → Konto/Depot → Depotumsätze → Export als XLSX
//
// Spalten (Array-Index, Header hat null-Lücken):
//   [0] Buchungstag     (Excel Serial Number)
//   [1] Valuta           (Excel Serial Number)
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
// Transaktionstypen in Buchungsinformation:
//   "Ausführung ORDER Kauf ..."    → buy
//   "Ausführung ORDER Verkauf ..." → sell
//   "Erträgnisausschüttung ..."    → nicht buchen, nur Hinweis (Einstandskorrektur ohne
//                                    ausgezahlten Betrag, siehe unten)
//   "Thesaurierung transparenter Fonds ..." → ignorieren (Steuerevent)
//   "Lagerstellenwechsel in ..."   → ignorieren (interner Transfer)

import type { FlatexParsedTransaction } from './flatexPDFParser'

export interface FlatexXLSXParseResult {
  transactions: FlatexParsedTransaction[]
  errors: string[]
  /** Was die Datei nicht hergibt, für die Import-Vorschau */
  notices: string[]
  /** Wo vermutlich Buchungen fehlen, für die Import-Vorschau */
  warnings: string[]
}

export interface FlatexDepotFile {
  /** Raw-Array-Daten (sheet_to_json mit header: 1) */
  rows: unknown[][]
  fileName: string
}

// Ein Flatex-Export endete nach genau 100 Zeilen mitten in einer Ausschüttung,
// obwohl die Orderliste vom selben Tag noch 27 spätere ausgeführte Orders nannte.
const EXPORT_ROW_LIMIT = 100

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
  if (typeof cell === 'number') return excelSerialToDate(cell)
  if (cell instanceof Date) return dateCellToISO(cell)
  const match = String(cell).trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : null
}

function formatGermanDate(iso: string): string {
  return iso.split('-').reverse().join('.')
}

/**
 * Erkennt ob ein XLSX-Workbook eine Flatex Depotumsätze-Datei ist.
 * Prüft Sheet-Name und Header-Zeile.
 */
export function isFlatexDepotXLSX(sheetNames: string[], firstRow: unknown[]): boolean {
  // Sheet heißt "Depotumsätze"
  if (sheetNames.some(n => n.toLowerCase().includes('depotumsätze') || n.toLowerCase().includes('depotumsaetze'))) {
    return true
  }
  // Oder: Header enthält typische Flatex-Spalten
  if (Array.isArray(firstRow)) {
    const headers = firstRow.map(h => String(h ?? '').toLowerCase())
    return headers.includes('buchungstag') && headers.includes('isin') && headers.includes('buchungsinformation')
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
function bookingKey(row: unknown[]): string {
  const taNr = String(row[11] ?? '').trim()
  if (taNr) return taNr
  return JSON.stringify(Array.from(row, cell => (cell instanceof Date ? dateCellToISO(cell) : cell ?? null)))
}

function noTransactionsError(fileNames: string[]): string {
  return (
    `Keine Transaktionen in ${fileNames.map(name => `"${name}"`).join(', ')} gefunden. ` +
    `Bitte die Datei aus Konto/Depot → Depotumsätze → XLSX exportieren.`
  )
}

/**
 * Warnt bei Dateien, die an der Zeilengrenze des Exports enden und die keine
 * andere Datei fortsetzt. Als Fortsetzung zählt nur eine Datei, in der die letzte
 * Zeile wieder vorkommt: Beginnt die nächste erst danach, kann dazwischen etwas
 * fehlen, schon am Tag des Abbruchs selbst.
 */
function cutOffWarnings(files: FlatexDepotFile[]): string[] {
  const exports = files.map(({ rows, fileName }) => {
    const data = rows.slice(1).filter(row =>
      Array.isArray(row) && row.some(cell => cell != null && cell !== '')
    )
    const keys = data.map(bookingKey)
    return {
      fileName,
      keys,
      lastKey: keys[keys.length - 1],
      isCutOff: keys.length === EXPORT_ROW_LIMIT,
      dates: data.map(row => bookingDate(row[0])).filter((date): date is string => date !== null),
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
  // Ausschüttungen aller Dateien, "Datum|ISIN" → Wertpapiername
  const distributions = new Map<string, string>()
  // Zeilen der bisherigen Dateien, Schlüssel → wie oft. Verglichen wird nur
  // zwischen Dateien: Innerhalb einer Datei ist jede Zeile eine eigene Buchung.
  const knownRows = new Map<string, number>()

  for (const { rows, fileName } of files) {
    if (rows.length < 2) {
      errors.push(`Keine Daten in "${fileName}" gefunden.`)
      continue
    }

    const fileRows = new Map<string, number>()

    // FX-Raten sammeln für USD-Transaktionen (Devisenkurs aus der Datei)
    // Bei Flatex steht der Devisenkurs direkt in jeder Zeile → pro Transaktion verfügbar

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!Array.isArray(row) || row.length < 13) continue

      const buchungstag = row[0]
      const bezeichnung = String(row[2] ?? '').trim()
      const isin = String(row[3] ?? '').trim()
      const nominal = Number(row[4]) || 0
      const betrag = Number(row[6]) || 0
      const waehrungBetrag = String(row[7] ?? '').trim()
      const kurs = Number(row[8]) || 0
      const devisenkurs = Number(row[10]) || 1
      const buchungsinfo = String(row[12] ?? '').trim()

      // Pflichtfelder prüfen
      if (!isin || !buchungsinfo) continue

      // Transaktionstyp bestimmen
      const infoLower = buchungsinfo.toLowerCase()

      if (infoLower.includes('thesaurierung')) continue
      if (infoLower.includes('lagerstellenwechsel')) continue

      const isKauf = infoLower.includes('ausführung order kauf') || infoLower.includes('ausfuehrung order kauf')
      const isVerkauf = infoLower.includes('ausführung order verkauf') || infoLower.includes('ausfuehrung order verkauf')
      const isAusschuettung = infoLower.includes('erträgnisausschüttung') || infoLower.includes('ertraegnisausschuettung')

      if (!isKauf && !isVerkauf && !isAusschuettung) continue

      // Schon in einer vorigen Datei enthalten?
      const key = bookingKey(row)
      const occurrence = (fileRows.get(key) ?? 0) + 1
      fileRows.set(key, occurrence)
      if (occurrence <= (knownRows.get(key) ?? 0)) continue

      const date = bookingDate(buchungstag)
      if (!date) {
        const where = files.length > 1 ? `"${fileName}", Zeile` : 'Zeile'
        errors.push(`${where} ${i + 1}: Ungültiges Datum "${buchungstag}" für ${isin}.`)
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
      if (isAusschuettung) {
        distributions.set(`${date}|${isin}`, bezeichnung)
        continue
      }

      // Kauf / Verkauf
      const qty = Math.abs(nominal)
      const absBetrag = Math.abs(betrag)

      // EUR-Preis berechnen: Bei $-Transaktionen über den Devisenkurs umrechnen
      let eurPrice = kurs
      let eurTotal = absBetrag
      if (waehrungBetrag === '$' && devisenkurs > 0 && devisenkurs !== 1) {
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

    // Eine Datei nur mit Ausschüttungen ist in Ordnung, wenn eine andere Käufe hat
    if (fileRows.size === 0) errors.push(noTransactionsError([fileName]))
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

  if (transactions.length === 0 && errors.length === 0) {
    errors.push(noTransactionsError(files.map(f => f.fileName)))
  }

  return { transactions, errors, notices, warnings: cutOffWarnings(files) }
}
