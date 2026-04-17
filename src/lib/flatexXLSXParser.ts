// src/lib/flatexXLSXParser.ts — Parser für Flatex "Depotumsätze" XLSX-Export
//
// Quelle: Flatex → Konto/Depot → Depotumsätze → Export als XLSX
//
// Spalten (Array-Index, Header hat null-Lücken):
//   [0] Buchungstag     (Excel Serial Number)
//   [1] Valuta           (Excel Serial Number)
//   [2] Bezeichnung      (Wertpapiername)
//   [3] ISIN
//   [4] Nominal (Stk.)   (kann fractional sein, negativ bei Ausschüttungen)
//   [5] "Stück"          (Einheit-Label)
//   [6] Betrag            (Gesamtwert)
//   [7] Währung Betrag    ("€" oder "$")
//   [8] Kurs              (Preis pro Stück)
//   [9] Währung Kurs
//  [10] Devisenkurs       (1 für EUR, z.B. 1.12294 für USD)
//  [11] TA.-Nr.
//  [12] Buchungsinformation (enthält Transaktionstyp + ISIN + Ordernummer)
//
// Transaktionstypen in Buchungsinformation:
//   "Ausführung ORDER Kauf ..."    → buy
//   "Ausführung ORDER Verkauf ..." → sell
//   "Erträgnisausschüttung ..."    → dividend (Paare: negativ + positiv)
//   "Thesaurierung transparenter Fonds ..." → ignorieren (Steuerevent)
//   "Lagerstellenwechsel in ..."   → ignorieren (interner Transfer)

import type { FlatexParsedTransaction } from './flatexPDFParser'

export interface FlatexXLSXParseResult {
  transactions: FlatexParsedTransaction[]
  errors: string[]
}

// Excel Serial Number → ISO Date String (YYYY-MM-DD)
// Excel zählt Tage ab 1900-01-01 (mit dem bekannten Lotus-1-2-3 Bug: 1900 ist kein Schaltjahr)
function excelSerialToDate(serial: number): string {
  // Excel epoch: 1899-12-30 (wegen Lotus-Bug)
  const epoch = new Date(Date.UTC(1899, 11, 30))
  const date = new Date(epoch.getTime() + serial * 86400000)
  return date.toISOString().slice(0, 10)
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
 * Parst Flatex Depotumsätze XLSX.
 * Erwartet Raw-Array-Daten (sheet_to_json mit header: 1).
 */
export function parseFlatexDepotXLSX(
  rows: unknown[][],
  fileName: string,
): FlatexXLSXParseResult {
  const transactions: FlatexParsedTransaction[] = []
  const errors: string[] = []

  if (rows.length < 2) {
    errors.push(`Keine Daten in "${fileName}" gefunden.`)
    return { transactions, errors }
  }

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
    const isDividende = infoLower.includes('erträgnisausschüttung') || infoLower.includes('ertraegnisausschuettung')

    if (!isKauf && !isVerkauf && !isDividende) continue

    // Datum parsen (Excel Serial Number oder bereits Date)
    let date = ''
    if (typeof buchungstag === 'number') {
      date = excelSerialToDate(buchungstag)
    } else if (buchungstag instanceof Date) {
      date = buchungstag.toISOString().slice(0, 10)
    } else {
      const dateStr = String(buchungstag).trim()
      const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (match) {
        date = match[1]
      } else {
        errors.push(`Zeile ${i + 1}: Ungültiges Datum "${buchungstag}" für ${isin}.`)
        continue
      }
    }

    // Dividenden: Flatex zeigt Paare (negativ = alt, positiv = neu).
    // Wir nehmen nur die NEGATIVEN Einträge — der Betrag ist die Ausschüttung.
    // Positive Einträge sind die Wiederanlage zum neuen Kurs → ignorieren.
    if (isDividende) {
      if (nominal >= 0) continue // Positiver Eintrag = Wiederanlage, überspringen

      const dividendAmount = Math.abs(betrag)
      const qty = Math.abs(nominal)

      // Währung: $ → in EUR umrechnen mit Devisenkurs
      let eurAmount = dividendAmount
      if (waehrungBetrag === '$' && devisenkurs > 0 && devisenkurs !== 1) {
        eurAmount = dividendAmount / devisenkurs
      }

      transactions.push({
        type: 'dividend',
        name: bezeichnung,
        isin,
        wkn: '',
        quantity: qty,
        price: kurs,
        totalValue: eurAmount,
        fees: 0,
        endAmount: eurAmount,
        date,
        currency: 'EUR',
        exchange: 'Flatex',
        notes: `Flatex XLSX — ${buchungsinfo}`,
      })
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

    transactions.push({
      type: isKauf ? 'buy' : 'sell',
      name: bezeichnung,
      isin,
      wkn: '',
      quantity: qty,
      price: eurPrice,
      totalValue: eurTotal,
      fees: 0,   // Flatex Depotumsätze zeigen keine separaten Gebühren
      endAmount: eurTotal,
      date,
      currency: 'EUR',
      exchange: 'Flatex',
      notes: `Flatex XLSX — ${buchungsinfo}`,
    })
  }

  if (transactions.length === 0 && errors.length === 0) {
    errors.push(
      `Keine Transaktionen in "${fileName}" gefunden. ` +
      `Bitte die Datei aus Konto/Depot → Depotumsätze → XLSX exportieren.`
    )
  }

  return { transactions, errors }
}
