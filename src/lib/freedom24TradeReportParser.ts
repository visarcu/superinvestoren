// src/lib/freedom24TradeReportParser.ts — Parser für Freedom24 Handelsbericht XLSX
//
// Quelle: Freedom24 → Berichte → Handelsberichte → Zeitraum wählen → Excel
//
// Unterschied zum Steuerbericht (freedom24TaxXLSXParser.ts):
//   - Steuerbericht: nur "Abrechnungsdatum" (Settlement, T+2)
//   - Handelsbericht: "Transaktionsdatum" (echtes Handelsdatum) ← besser!
//   - Handelsbericht: Gebühren immer in EUR, Dividenden im "Corpactions"-Sheet
//
// Sheet "Trades ...":      Käufe/Verkäufe mit ISIN, Transaktionsdatum, Gebühren
// Sheet "Corpactions ...":  Dividenden, Splits und Spin-Offs mit ISIN
//
// Erkennung: Sheet-Name startet mit "Trades " (nicht "ExecTrades" wie beim Steuerbericht)

import type { FlatexParsedTransaction } from './flatexPDFParser'
import type { StockSplit } from './scalableCSVParser'
import { appendSplitNote } from './splitAdjustment'

// Wie FlatexParsedTransaction, aber zusätzlich mit Transfer- und Cash-Typen.
// Spin-Off-Einbuchungen laufen als transfer_in (der Import-Wizard zieht den
// Schlusskurs nach, falls kein Preis vorliegt); Banküberweisungen aus dem
// Geldtransfer-Tab als cash_deposit/cash_withdrawal.
export type Freedom24Transaction = Omit<FlatexParsedTransaction, 'type'> & {
  type: FlatexParsedTransaction['type'] | 'transfer_in' | 'transfer_out' | 'cash_deposit' | 'cash_withdrawal'
  isFromTransfer?: boolean
  // Spin-off-Metadaten: der Import-Wizard nutzt sie, um die Kostenbasis der
  // Mutterposition anteilig auf die neue Position zu übertragen.
  corpActionType?: 'spinoff'
  fromIsin?: string
  fromTicker?: string
}

export interface Freedom24TradeReportResult {
  transactions: Freedom24Transaction[]
  errors: string[]
  /** Erkannte Aktiensplits — Alt-Transaktionen in der Datei sind bereits angepasst. */
  stockSplits: StockSplit[]
}

export interface Freedom24ReportFile {
  /** Blattname → Zeilen (sheet_to_json) */
  sheets: Record<string, Record<string, unknown>[]>
  fileName: string
}

interface SourceRow {
  row: Record<string, unknown>
  /** Fundstelle für Fehlermeldungen, z.B. "Corpactions Zeile 5" */
  where: string
}

function valueText(value: unknown): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString()
  return String(value ?? '').trim()
}

// Spaltennamen stehen im Export mit oder ohne Leerzeichen
function cellText(row: Record<string, unknown>, column: string): string {
  return valueText(row[` ${column} `] ?? row[column])
}

// Spalte "Nummer / Auftragsnummer", z.B. "123456789/987654321": Trade- und Ordernummer
function tradeNumber(row: Record<string, unknown>): string {
  return cellText(row, 'Nummer / Auftragsnummer').match(/^[1-9]\d*/)?.[0] ?? ''
}

/**
 * Schlüssel, an dem eine Zeile in einer zweiten Datei wiedererkannt wird.
 *
 * Für Trades ist das die Tradenummer. Sie steht für die einzelne Ausführung, die
 * Ordernummer dahinter für den ganzen Auftrag, den Teilausführungen gemeinsam
 * hätten. In echten Exporten war sie in jeder Zeile verschieden und für denselben
 * Trade im Handelsbericht, in dessen Gebührenblatt und im Steuerbericht gleich. Die
 * Uhrzeit reicht nicht: Im Gebührenblatt tragen zwei Trades dieselbe Sekunde.
 *
 * Corporate Actions und Geldbewegungen haben weder Nummer noch Uhrzeit, dort zählt
 * die ganze Zeile. In zwei Exporten im Abstand von sechs Wochen waren die
 * gemeinsamen Zeilen Zelle für Zelle gleich. Das Konto aus dem Blattnamen
 * ("Corpactions 1234567 - 20260418") gehört dazu, das Datum des Exports nicht.
 */
function bookingKey(sheetName: string, row: Record<string, unknown>): string {
  const trade = tradeNumber(row)
  if (trade) return trade
  const account = sheetName.match(/(\S+)\s+-\s*\d*\s*$/)?.[1] ?? sheetName
  return JSON.stringify([account, ...Object.entries(row).map(([column, value]) => [column.trim(), valueText(value)])])
}

/**
 * Zeilen gleichartiger Blätter aller Dateien. Was schon in einer vorigen Datei
 * stand, zählt nicht noch einmal. Verglichen wird nur zwischen Dateien: Innerhalb
 * einer Datei ist jede Zeile eine eigene Buchung, auch zwei gleiche Überweisungen
 * am selben Tag.
 *
 * Mehrere Dateien werden anschließend sortiert wie ein Export von Freedom24 (Trades
 * nach Ticker und Uhrzeit, alles andere nach Datum), damit die Reihenfolge der
 * Auswahl keine Rolle spielt.
 */
function mergeRows(
  files: Freedom24ReportFile[],
  pickSheets: (sheetNames: string[]) => string[],
  place: (sheetName: string, line: number) => string,
  // Schlüssel → wie oft in einer der bisherigen Dateien
  known = new Map<string, number>(),
): SourceRow[] {
  const rows: SourceRow[] = []

  for (const { sheets, fileName } of files) {
    const fileRows = new Map<string, number>()
    for (const sheetName of pickSheets(Object.keys(sheets))) {
      sheets[sheetName].forEach((row, i) => {
        const key = bookingKey(sheetName, row)
        const occurrence = (fileRows.get(key) ?? 0) + 1
        fileRows.set(key, occurrence)
        if (occurrence <= (known.get(key) ?? 0)) return
        const where = place(sheetName, i + 2)
        rows.push({ row, where: files.length > 1 ? `"${fileName}", ${where}` : where })
      })
    }
    for (const [key, count] of fileRows) known.set(key, Math.max(count, known.get(key) ?? 0))
  }

  if (files.length > 1) {
    const order = ({ row }: SourceRow) => [
      tradeNumber(row) ? cellText(row, 'Ticker') : '',
      cellText(row, 'Transaktionsdatum') || cellText(row, 'Datum'),
      tradeNumber(row).padStart(20, '0'),
    ].join('\t')
    const ordered = rows.map(entry => ({ entry, key: order(entry) }))
    ordered.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    return ordered.map(({ entry }) => entry)
  }
  return rows
}

/**
 * Erkennt ob ein XLSX-Workbook ein Freedom24 Handelsbericht ist.
 * Unterscheidung vom Steuerbericht: "Trades ..." statt "ExecTrades ..."
 */
export function isFreedom24TradeReport(sheetNames: string[]): boolean {
  const hasTrades = sheetNames.some(n => n.startsWith('Trades '))
  const hasExecTrades = sheetNames.some(n => n.startsWith('ExecTrades'))
  // Handelsbericht hat "Trades ...", Steuerbericht hat "ExecTrades ..."
  return hasTrades && !hasExecTrades
}

/**
 * Parst Trades-Sheet des Handelsberichts.
 */
function parseTrades(
  rows: SourceRow[],
): { transactions: FlatexParsedTransaction[]; errors: string[] } {
  const transactions: FlatexParsedTransaction[] = []
  const errors: string[] = []

  // FX-Raten aus den Währungsumtausch-Zeilen extrahieren
  // Handelsbericht: "EUR/USD" mit Preis 1.1525 → 1 EUR = 1.1525 USD → 1 USD = 1/1.1525 EUR
  // Handelsbericht: "EUR/GBP" mit Preis 0.86 → 1 EUR = 0.86 GBP → 1 GBP = 1/0.86 EUR
  const fxRates: Record<string, number[]> = {}
  for (const { row } of rows) {
    const ticker = String(row[' Ticker '] ?? row['Ticker'] ?? '').trim()
    if (!ticker.includes('/')) continue

    const price = parseFloat(String(row[' Preis '] ?? row['Preis'] ?? '0'))
    if (price <= 0) continue

    const [base, quote] = ticker.split('/')
    if (base === 'EUR' && quote) {
      // EUR/USD: price = 1.15 → 1 USD = 1/1.15 = 0.8696 EUR
      if (!fxRates[quote]) fxRates[quote] = []
      fxRates[quote].push(1 / price)
    } else if (quote === 'EUR' && base) {
      // USD/EUR: price = 0.87 → 1 USD = 0.87 EUR (direkt)
      if (!fxRates[base]) fxRates[base] = []
      fxRates[base].push(price)
    }
  }
  const avgFxRate: Record<string, number> = {}
  for (const [currency, rates] of Object.entries(fxRates)) {
    avgFxRate[currency] = rates.reduce((a, b) => a + b, 0) / rates.length
  }

  for (const { row, where } of rows) {
    const ticker      = String(row[' Ticker ']       ?? row['Ticker']       ?? '').trim()
    const isin        = String(row[' ISIN ']         ?? row['ISIN']         ?? '').trim()
    const transaktion = String(row[' Transaktion ']  ?? row['Transaktion']  ?? '').trim()
    const anzahlRaw   = row[' Anzahl ']  ?? row['Anzahl']
    const preisRaw    = row[' Preis ']   ?? row['Preis']
    const waehrung    = String(row[' Währung ']      ?? row['Währung']      ?? '').trim()
    const betragRaw   = row[' Betrag ']  ?? row['Betrag']
    const gebuehrRaw  = row[' Gebühren '] ?? row['Gebühren']
    // Transaktionsdatum = echtes Handelsdatum (nicht Settlement!)
    const datumRaw    = row[' Transaktionsdatum ']   ?? row['Transaktionsdatum']

    // Währungsumtausch und Zeilen ohne ISIN überspringen
    if (!isin || isin === '-' || ticker.includes('/')) continue

    const lower = transaktion.toLowerCase().trim()
    if (lower !== 'kauf' && lower !== 'verkauf') continue

    const txType: 'buy' | 'sell' = lower === 'verkauf' ? 'sell' : 'buy'

    // Datum parsen — Format: "2026-03-27 17:29:24" oder Date-Objekt
    let date = ''
    if (datumRaw instanceof Date) {
      date = datumRaw.toISOString().slice(0, 10)
    } else {
      const dateStr = String(datumRaw ?? '').trim()
      const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) date = m[1]
      else { errors.push(`${where}: Ungültiges Datum "${dateStr}".`); continue }
    }

    const quantity  = parseFloat(String(anzahlRaw))  || 0
    const priceOrig = parseFloat(String(preisRaw))   || 0
    const betrag    = parseFloat(String(betragRaw))   || 0
    const fees      = parseFloat(String(gebuehrRaw))  || 0

    if (quantity <= 0) {
      errors.push(`${where}: Ungültige Anzahl für ${ticker}.`)
      continue
    }

    // Preis in EUR umrechnen
    let priceEUR = priceOrig
    let totalEUR = betrag
    if (waehrung !== 'EUR') {
      const rate = avgFxRate[waehrung]
      if (rate) {
        priceEUR = priceOrig * rate
        totalEUR = betrag * rate
      } else {
        errors.push(`${where}: Kein Wechselkurs für ${waehrung} gefunden (${ticker}).`)
        continue
      }
    }

    const endAmount = txType === 'buy' ? totalEUR + fees : totalEUR - fees

    transactions.push({
      type: txType,
      name: ticker,
      isin,
      wkn: '',
      quantity,
      price: priceEUR,
      totalValue: totalEUR,
      fees,
      endAmount,
      date,
      currency: 'EUR',
      exchange: 'Freedom24',
      notes: 'Freedom24 Handelsbericht',
    })
  }

  return { transactions, errors }
}

/**
 * Parst Corpactions-Sheet: Dividenden, Aktiensplits und Spin-Offs.
 *
 * Freedom24 bucht Corporate Actions als Wertpapier-Zeilen:
 *   Split:    2 Zeilen gleicher ISIN, negative (alte Stücke raus) + positive
 *             (neue Stücke rein). Kommentar: "Stock split HON.US (US...).
 *             Record date 2026-06-26, factor: 2/1."
 *   Spin-Off: 1 Zeile mit NEUER ISIN und positiver Stückzahl. Kommentar:
 *             "Corporate action HON.US (US...) -> HONA.US (US...). Factor 2/1."
 *             → wird als transfer_in der neuen Position importiert.
 */
function parseCorpActions(
  rows: SourceRow[],
  fxRateUsdEur: number,
): { transactions: Freedom24Transaction[]; errors: string[]; stockSplits: StockSplit[] } {
  const transactions: Freedom24Transaction[] = []
  const errors: string[] = []
  const stockSplits: StockSplit[] = []

  // Split-Zeilen sammeln: Key = ISIN|Datum, Werte = positive/negative Stückzahlen
  const splitRows = new Map<string, { isin: string; date: string; inQty: number; outQty: number; where: string }>()

  const toEUR = (value: number, waehrung: string): number => {
    if (waehrung === 'USD') return value * fxRateUsdEur
    if (waehrung === 'GBP') return value * 1.17 // Approximation
    return value
  }

  for (const { row, where } of rows) {
    const art      = String(row[' Art ']      ?? row['Art']      ?? '').trim().toLowerCase()
    const ticker   = String(row[' Ticker ']   ?? row['Ticker']   ?? '').trim()
    const isin     = String(row[' ISIN ']     ?? row['ISIN']     ?? '').trim()
    const datumRaw = row[' Datum ']           ?? row['Datum']
    const betrag   = parseFloat(String(row[' Betrag '] ?? row['Betrag'] ?? '0')) || 0
    const preis    = parseFloat(String(row[' Preis '] ?? row['Preis'] ?? '0')) || 0
    const waehrung = String(row[' Währung ']  ?? row['Währung']  ?? '').trim()
    const qty      = parseFloat(String(row[' Wertpapiere zum Zeitpunkt der Fixierung '] ?? row['Wertpapiere zum Zeitpunkt der Fixierung'] ?? '0')) || 0

    const isDividend = art.includes('dividend')
    const isSplit    = art.includes('split')
    const isSpinOff  = art.includes('spin')
    if (!isDividend && !isSplit && !isSpinOff) continue
    if (!isin) continue

    let date = ''
    if (datumRaw instanceof Date) {
      date = datumRaw.toISOString().slice(0, 10)
    } else {
      const dateStr = String(datumRaw ?? '').trim()
      const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) date = m[1]
      else { errors.push(`${where}: Ungültiges Datum.`); continue }
    }

    // Kommentar-Spalte: Name variiert je Report-Version → bekannte Keys
    // probieren, sonst Zeilenwerte nach Corporate-Action-Text durchsuchen.
    const comment = (() => {
      for (const key of [' Kommentar ', 'Kommentar', ' Comment ', 'Comment', ' Anmerkung ', 'Anmerkung']) {
        const v = row[key]
        if (typeof v === 'string' && v.trim()) return v.trim()
      }
      for (const v of Object.values(row)) {
        if (typeof v === 'string' && /stock split|corporate action/i.test(v)) return v.trim()
      }
      return ''
    })()

    if (isDividend) {
      if (betrag <= 0) continue
      transactions.push({
        type: 'dividend',
        name: ticker,
        isin,
        wkn: '',
        quantity: qty,
        price: 0,
        totalValue: toEUR(betrag, waehrung),
        fees: 0,
        endAmount: toEUR(betrag, waehrung),
        date,
        currency: 'EUR',
        exchange: 'Freedom24',
        notes: 'Freedom24 Dividende',
      })
      continue
    }

    if (isSplit) {
      // Betrag = Stückzahl-Delta (negativ = alte Stücke raus, positiv = neue rein)
      if (betrag === 0) continue
      const key = `${isin}|${date}`
      const entry = splitRows.get(key) || { isin, date, inQty: 0, outQty: 0, where }
      if (betrag > 0) entry.inQty += betrag
      else entry.outQty += Math.abs(betrag)
      splitRows.set(key, entry)
      continue
    }

    // === Spin-Off: neue Position einbuchen ===
    if (betrag <= 0) continue // negative Spin-Off-Zeile (Storno) — nicht unterstützt
    // Quell-ISIN aus dem Kommentar: "... HON.US (US4385162056) -> HONA.US (US43849R1059) ..."
    const fromMatch = comment.match(/([A-Z0-9.]+)\s*\(([A-Z]{2}[0-9A-Z]{9,10})\)\s*->/)
    const fromLabel = fromMatch ? `${fromMatch[1]} (${fromMatch[2]})` : 'Mutterposition'
    const priceEUR = preis > 0 ? toEUR(preis, waehrung) : 0

    transactions.push({
      type: 'transfer_in',
      name: ticker,
      isin,
      wkn: '',
      quantity: betrag,
      price: priceEUR,
      totalValue: priceEUR * betrag,
      fees: 0,
      endAmount: priceEUR * betrag,
      date,
      currency: 'EUR',
      exchange: 'Freedom24',
      notes: `Freedom24 Spin-off aus ${fromLabel}`,
      isFromTransfer: true,
      corpActionType: 'spinoff',
      fromIsin: fromMatch?.[2],
      fromTicker: fromMatch?.[1],
    })
  }

  // Split-Paare auswerten: Ratio = neue Stücke / alte Stücke
  for (const entry of splitRows.values()) {
    if (entry.inQty > 0 && entry.outQty > 0) {
      stockSplits.push({ date: entry.date, isin: entry.isin, ratio: entry.inQty / entry.outQty })
    } else {
      errors.push(
        `${entry.where}: Aktiensplit für ${entry.isin} unvollständig ` +
        `(nur ${entry.inQty > 0 ? 'Einbuchung' : 'Ausbuchung'} gefunden) — bitte Bestand manuell prüfen.`
      )
    }
  }

  return { transactions, errors, stockSplits }
}

// Externe Cash-Flüsse (echte Ein-/Auszahlungen aufs Verrechnungskonto).
// BEWUSST eng gehalten: Dividenden, Steuern, Broker-/Handelsgebühren, Käufe
// und Verkäufe kommen bereits über die Trades/Corpactions-Sheets bzw. den
// separaten Handelsbericht — hier importiert würden sie das Cash doppelt zählen.
const CASH_FLOW_ART = /^(bank(ü|ue)berweisung|einzahlung|auszahlung|deposit|withdrawal)$/i

// Wert der "Art"-Spalte holen (Spaltennamen können mit Leerzeichen kommen);
// ohne benannte Spalte auf einen Werte-Scan zurückfallen.
function cashArt(row: Record<string, unknown>): string {
  for (const key of [' Art ', 'Art', ' Type ', 'Type']) {
    const v = row[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  const scan = Object.values(row).find(v => typeof v === 'string' && CASH_FLOW_ART.test(v.trim()))
  return typeof scan === 'string' ? scan.trim() : ''
}

/**
 * Parst externe Ein-/Auszahlungen ("Banküberweisung" etc.) aus dem
 * Geldtransfer-/Cash-Tab. Der Cash-Export kommt entweder als eigener Reiter im
 * Handelsbericht oder als separate Datei ("Cash In Out …"); beides läuft hier
 * durch. Spalten (" Art ", " Datum ", " Betrag ", " Währung ") können mit
 * Leerzeichen benannt sein — wir lesen die Art gezielt und fallen sonst auf
 * einen Werte-Scan zurück. Positiver Betrag = Einzahlung, negativer = Auszahlung.
 */
function parseCashTransfers(
  rows: SourceRow[],
  fxRateUsdEur: number,
): { transactions: Freedom24Transaction[]; errors: string[] } {
  const transactions: Freedom24Transaction[] = []
  const errors: string[] = []

  for (const { row, where } of rows) {
    const art = cashArt(row)
    if (!CASH_FLOW_ART.test(art)) continue

    const values = Object.values(row)

    // Datum: bevorzugt aus " Datum "-Spalte, sonst erster Datumswert
    let date = ''
    const datumCell = row[' Datum '] ?? row['Datum'] ?? row[' Date '] ?? row['Date']
    if (datumCell instanceof Date) date = datumCell.toISOString().slice(0, 10)
    else if (typeof datumCell === 'string') {
      const m = datumCell.trim().match(/^(\d{4}-\d{2}-\d{2})/)
      if (m) date = m[1]
    }
    if (!date) {
      for (const v of values) {
        if (v instanceof Date) { date = v.toISOString().slice(0, 10); break }
        if (typeof v === 'string') {
          const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})/)
          if (m) { date = m[1]; break }
        }
      }
    }
    if (!date) {
      errors.push(`${where}: ${art} ohne erkennbares Datum übersprungen.`)
      continue
    }

    // Betrag: bevorzugt aus " Betrag "-Spalte, sonst erste endliche Zahl ≠ 0
    let amount = NaN
    const betragCell = row[' Betrag '] ?? row['Betrag'] ?? row[' Amount '] ?? row['Amount']
    if (typeof betragCell === 'number' && Number.isFinite(betragCell)) amount = betragCell
    if (!Number.isFinite(amount)) {
      for (const v of values) {
        if (typeof v === 'number' && Number.isFinite(v) && v !== 0) { amount = v; break }
      }
    }
    if (!Number.isFinite(amount) || amount === 0) {
      errors.push(`${where}: ${art} ohne Betrag übersprungen.`)
      continue
    }

    const currency = (() => {
      const c = row[' Währung '] ?? row['Währung'] ?? row[' Currency '] ?? row['Currency']
      if (typeof c === 'string' && /^(EUR|USD|GBP)$/.test(c.trim())) return c.trim()
      const scan = values.find((v): v is string => typeof v === 'string' && /^(EUR|USD|GBP)$/.test(v.trim()))
      return scan?.trim() || 'EUR'
    })()

    let amountEUR = Math.abs(amount)
    if (currency === 'USD') amountEUR = amountEUR * fxRateUsdEur
    else if (currency === 'GBP') amountEUR = amountEUR * 1.17 // Approximation
    amountEUR = Math.round(amountEUR * 100) / 100

    transactions.push({
      type: amount > 0 ? 'cash_deposit' : 'cash_withdrawal',
      name: amount > 0 ? 'Einzahlung' : 'Auszahlung',
      isin: '',
      wkn: '',
      quantity: 1,
      price: amountEUR,
      totalValue: amountEUR,
      fees: 0,
      endAmount: amountEUR,
      date,
      currency: 'EUR',
      exchange: 'Freedom24',
      notes: 'Freedom24 Banküberweisung',
    })
  }

  return { transactions, errors }
}

/**
 * Erkennt eine separate Freedom24 Cash-Datei ("Cash In Out …") ohne Trades-Sheet.
 */
export function isFreedom24CashReport(sheetNames: string[]): boolean {
  const hasCash = sheetNames.some(n => /^cash in out/i.test(n.trim()))
  const hasTrades = sheetNames.some(n => n.startsWith('Trades ') || n.startsWith('ExecTrades'))
  return hasCash && !hasTrades
}

/**
 * Parst eine separate Freedom24 Cash-Datei — nur externe Ein-/Auszahlungen.
 * (Dividenden/Steuern/Gebühren im selben Sheet kommen über den Handelsbericht
 * und werden hier bewusst ignoriert, um Doppelzählung zu vermeiden.)
 */
export function parseFreedom24CashReport(
  sheets: Record<string, Record<string, unknown>[]>,
  fileName: string,
): { transactions: Freedom24Transaction[]; errors: string[] } {
  return parseFreedom24CashReports([{ sheets, fileName }])
}

/**
 * Parst mehrere Cash-Dateien als ein Konto. Überschneiden sich ihre Zeiträume,
 * zählt jede Ein- und Auszahlung nur einmal. Das gilt auch gegenüber
 * Handelsberichten aus demselben Upload: Ein vollständiger Bericht enthält das
 * Blatt "Cash In Out" selbst, mit denselben Zeilen wie die Cash-Datei.
 */
export function parseFreedom24CashReports(
  files: Freedom24ReportFile[],
  tradeReports: Freedom24ReportFile[] = [],
): { transactions: Freedom24Transaction[]; errors: string[] } {
  const parse = (part: Freedom24ReportFile[], known?: Map<string, number>) =>
    parseCashTransfers(cashRows(part, known), 0.87)

  const reported = new Map<string, number>()
  cashRows(tradeReports, reported)
  const result = parse(files, reported)
  for (const file of emptyFiles(files, part => parse(part))) {
    result.errors.push(`Keine Ein-/Auszahlungen in "${file.fileName}" gefunden.`)
  }
  return result
}

/**
 * Parst den kompletten Freedom24 Handelsbericht.
 */
export function parseFreedom24TradeReport(
  sheets: Record<string, Record<string, unknown>[]>,
  fileName: string,
): Freedom24TradeReportResult {
  return parseFreedom24TradeReports([{ sheets, fileName }])
}

/**
 * Parst mehrere Handelsberichte wie einen Bericht über den ganzen Zeitraum.
 *
 * Zusammengeführt werden die Zeilen, nicht die fertigen Buchungen: Der
 * Wechselkurs ist der Durchschnitt aller Umtausch-Zeilen, und ein Split gilt für
 * alle Käufe davor. Beides ergibt sich erst aus allen Dateien zusammen. Ein Split,
 * der in zwei Dateien steht, zählt wie jede andere Zeile nur einmal.
 */
export function parseFreedom24TradeReports(files: Freedom24ReportFile[]): Freedom24TradeReportResult {
  const result = parseTradeReportFiles(files)
  for (const file of emptyFiles(files, parseTradeReportFiles)) {
    result.errors.push(`Keine Transaktionen in "${file.fileName}" gefunden.`)
  }
  return result
}

// Dateien, die auch für sich allein nichts liefern. Wer nur Buchungen enthält,
// die schon in einer anderen Datei stehen, gehört nicht dazu.
function emptyFiles(
  files: Freedom24ReportFile[],
  parse: (files: Freedom24ReportFile[]) => { transactions: unknown[]; errors: string[] },
): Freedom24ReportFile[] {
  return files.filter(file => {
    const { transactions, errors } = parse([file])
    return transactions.length === 0 && errors.length === 0
  })
}

function cashRows(files: Freedom24ReportFile[], known?: Map<string, number>): SourceRow[] {
  return mergeRows(files, names => names, (sheetName, line) => `${sheetName} Zeile ${line}`, known)
}

function parseTradeReportFiles(files: Freedom24ReportFile[]): Freedom24TradeReportResult {
  const allTransactions: Freedom24Transaction[] = []
  const allErrors: string[] = []
  const allStockSplits: StockSplit[] = []

  // Trades-Sheet finden
  const tradesSheets = (names: string[]) => names.filter(n => n.startsWith('Trades ')).slice(0, 1)
  for (const { sheets, fileName } of files) {
    if (tradesSheets(Object.keys(sheets)).length === 0) {
      allErrors.push(`Kein "Trades"-Sheet in "${fileName}" gefunden.`)
    }
  }
  const tradesRows = mergeRows(files, tradesSheets, (_, line) => `Zeile ${line}`)
  {
    const { transactions, errors } = parseTrades(tradesRows)
    allTransactions.push(...transactions)
    allErrors.push(...errors)
  }

  // USD/EUR-Rate aus den Trades extrahieren (für Corpactions + Geldtransfers)
  let usdEurRate = 0.87 // Fallback
  for (const { row } of tradesRows) {
    const ticker = String(row[' Ticker '] ?? row['Ticker'] ?? '').trim()
    if (ticker === 'USD/EUR') {
      const price = parseFloat(String(row[' Preis '] ?? row['Preis'] ?? '0'))
      if (price > 0) { usdEurRate = price; break }
    }
  }

  // Corpactions-Sheet finden (Dividenden, Splits, Spin-Offs)
  {
    const corpSheets = (names: string[]) => names.filter(n => n.startsWith('Corpactions')).slice(0, 1)
    const rows = mergeRows(files, corpSheets, (_, line) => `Corpactions Zeile ${line}`)
    const { transactions, errors, stockSplits } = parseCorpActions(rows, usdEurRate)
    allTransactions.push(...transactions)
    allErrors.push(...errors)
    allStockSplits.push(...stockSplits)
  }

  // Banküberweisungen (Geldtransfer-Tab) — ermöglicht Cash-Ledger und damit
  // die einzahlungsbasierte Kapital-Linie im Chart
  {
    const { transactions, errors } = parseCashTransfers(cashRows(files), usdEurRate)
    allTransactions.push(...transactions)
    allErrors.push(...errors)
  }

  // Splits rückwirkend auf alle Stück-basierten Transaktionen in der Datei
  // anwenden: Stück × Ratio, Preis ÷ Ratio, Gesamtwert bleibt (Kapitaleinsatz
  // unverändert). Die Marker-Note schützt vor Doppel-Verrechnung, wenn der
  // Import-Wizard dieselben Splits später auf DB-Bestand anwendet.
  if (allStockSplits.length > 0) {
    for (const tx of allTransactions) {
      if (tx.type === 'dividend') continue
      const applicable = allStockSplits.filter(s => s.isin === tx.isin && s.date > tx.date)
      if (applicable.length === 0) continue

      for (const split of applicable) {
        tx.quantity = tx.quantity * split.ratio
        if (tx.price > 0) tx.price = tx.price / split.ratio
        tx.notes = appendSplitNote(tx.notes, split.ratio, split.date)
      }
    }
  }

  return { transactions: allTransactions, errors: allErrors, stockSplits: allStockSplits }
}
