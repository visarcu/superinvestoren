// API Route: POST /api/portfolio/import-auto
// Erkennt das Format automatisch und routet zum richtigen Parser.
//
// Unterstützte Formate (auto-erkannt):
//   .pdf               → Broker-PDF (Flatex, Smartbroker+, Trade Republic, Freedom24)
//   .csv               → Scalable Capital CSV
//   .xlsx mit Depotumsätze-Sheet → Flatex Depotumsätze
//   .xlsx mit ExecTrades-Sheet   → Freedom24 Steuerbericht (bevorzugt)
//   .xlsx ohne ExecTrades        → Freedom24 Auftragshistorie (Fallback)
//
// Response: { format, formatLabel, transactions, errors, totalFiles?, parsedFiles? }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseScalableCSV } from '@/lib/scalableCSVParser'
import { parseZeroCSV, isZeroCSV } from '@/lib/zeroCSVParser'
import { parseTrading212CSV, isTrading212CSV } from '@/lib/trading212CSVParser'
import { parseTradeRepublicCSV, isTradeRepublicCSV } from '@/lib/tradeRepublicCSVParser'
import { parseFlatexPDFText, type FlatexParsedTransaction } from '@/lib/flatexPDFParser'
import { parseSmartbrokerPDFText, type SmartbrokerParsedTransaction } from '@/lib/smartbrokerPDFParser'
import { parseTradeRepublicPDFText, type TradeRepublicParsedTransaction } from '@/lib/tradeRepublicPDFParser'
import { parseFreedom24PDFText } from '@/lib/freedom24PDFParser'
import { parseFreedom24TaxXLSX } from '@/lib/freedom24TaxXLSXParser'
import { parseFreedom24XLSXRows } from '@/lib/freedom24XLSXParser'
import {
  parseFlatexDepotXLSX,
  parseFlatexDepotXLSXFiles,
  isFlatexDepotXLSX,
  isFlatexKontoXLSX,
  type FlatexDepotFile,
} from '@/lib/flatexXLSXParser'
import { describeWorkbook, looksLikeFreedom24Orders } from '@/lib/workbookFormat'
import {
  parseFreedom24TradeReport,
  parseFreedom24TradeReports,
  isFreedom24TradeReport,
  parseFreedom24CashReport,
  parseFreedom24CashReports,
  isFreedom24CashReport,
  type Freedom24ReportFile,
} from '@/lib/freedom24TradeReportParser'
import { parseIngPDFText, isIngPDF, type IngParsedTransaction } from '@/lib/ingPDFParser'
import { parseTrading212PDFText, isTrading212PDF } from '@/lib/trading212PDFParser'

export const maxDuration = 60

/**
 * Antwort mit Transaktionen. Kommt keine zustande, steht der Aufbau der Datei und
 * die Meldung im Server-Log: Ein Nutzer bekam drei Dateiformate lang "keine
 * Transaktionen", und nichts verriet, woran es lag. Keine Inhalte, nur Struktur.
 */
function respond(
  // Die CSV-Parser melden Übersprungenes als Objekte, die anderen als Text
  payload: { format: string; transactions: unknown[]; errors?: unknown[] } & Record<string, unknown>,
  structure: Record<string, unknown> = {},
) {
  if (payload.transactions.length === 0) {
    console.warn('[import-auto] keine Transaktionen', JSON.stringify({
      format: payload.format,
      errors: payload.errors ?? [],
      ...structure,
    }))
  }
  return NextResponse.json(payload)
}

function kontoumsaetzeError(fileName: string): string {
  return (
    `"${fileName}" ist der Kontoumsätze-Export (Geldbewegungen). Für die Wertpapiere brauchst du ` +
    `die Depotumsätze: Konto/Depot → Depotumsätze → XLSX-Export.`
  )
}

function unknownWorkbookError(fileName: string, description: string): string {
  return (
    `"${fileName}": Format nicht erkannt (${description}). Unterstützt werden der XLSX-Export der ` +
    `Flatex-Depotumsätze und die Freedom24-Berichte (Handelsbericht, Ein-/Auszahlungen, Steuerbericht, ` +
    `Auftragshistorie). Schick uns die Datei an support@finclue.de, dann bauen wir deinen Broker ein.`
  )
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

let _pdfParse: ((buf: Buffer) => Promise<{ text: string; numpages: number }>) | null = null
function getPdfParse() {
  if (!_pdfParse) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _pdfParse = require(/* webpackIgnore: true */ 'pdf-parse/lib/pdf-parse')
  }
  return _pdfParse!
}

function detectBroker(text: string): 'flatex' | 'smartbroker' | 'traderepublic' | 'freedom24' | 'ing' | 'trading212' | 'unknown' {
  const lower = text.toLowerCase()
  // ING muss VOR Flatex geprüft werden, da ING-PDFs auch das Wort "Wertpapier" enthalten
  if (isIngPDF(text)) return 'ing'
  // Trading 212 vor Trade Republic (beide enthalten "Trade")
  if (isTrading212PDF(text)) return 'trading212'
  if (lower.includes('freedom24') || lower.includes('freedom 24') || lower.includes('handelsbericht für den zeitraum')) return 'freedom24'
  if (lower.includes('trade republic') || lower.includes('traderepublic')) return 'traderepublic'
  if (lower.includes('smartbroker') || lower.includes('baader bank')) return 'smartbroker'
  if (lower.includes('flatex') || lower.includes('degiro')) return 'flatex'
  if (lower.includes('wertpapier') || lower.includes('sammelabrechnung')) return 'flatex'
  return 'unknown'
}

function smartbrokerToFlatex(tx: SmartbrokerParsedTransaction): FlatexParsedTransaction {
  return { type: tx.type, name: tx.name, isin: tx.isin, wkn: tx.wkn, quantity: tx.quantity, price: tx.price, totalValue: tx.totalValue, fees: tx.fees, endAmount: tx.endAmount, date: tx.date, currency: tx.currency, exchange: tx.exchange, notes: tx.notes }
}
function tradeRepublicToFlatex(tx: TradeRepublicParsedTransaction): FlatexParsedTransaction {
  return { type: tx.type, name: tx.name, isin: tx.isin, wkn: '', quantity: tx.quantity, price: tx.price, totalValue: tx.totalValue, fees: tx.fees, endAmount: tx.endAmount, date: tx.date, currency: tx.currency, exchange: tx.exchange, notes: tx.notes }
}

/**
 * Mehrere XLSX-Dateien in einem Rutsch parsen und zusammenführen.
 *
 * Freedom24 exportiert Handel und Geldbewegungen getrennt ("Handelsbericht" und
 * "Cash In Out"). Beide gehören zum selben Depot: Ohne den Cash-Export fehlen
 * die Einzahlungen und die Kapital-Linie im Chart bleibt falsch.
 *
 * Ein Flatex-Export endete nach genau 100 Zeilen mitten in einer Ausschüttung. Ein
 * längeres Depot kommt deshalb in mehreren Dateien, deren Zeiträume sich
 * überschneiden dürfen.
 *
 * Das führende Format bestimmt die Datei mit den Wertpapier-Transaktionen —
 * daran hängt die weitere Verarbeitung im Import-Wizard.
 */
async function parseMultipleWorkbooks(files: File[]) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require(/* webpackIgnore: true */ 'xlsx')

  const transactions: unknown[] = []
  const errors: string[] = []
  const stockSplits: unknown[] = []
  const labels: string[] = []
  let leadFormat: string | null = null
  let leadLabel: string | null = null
  // Erst nach der Schleife geparst: Doppelte Buchungen, Splits und Ausschüttungen
  // lassen sich nur über alle Dateien zusammen zählen.
  const flatexFiles: FlatexDepotFile[] = []
  const tradeReports: Freedom24ReportFile[] = []
  const cashReports: Freedom24ReportFile[] = []
  // Aufbau nicht erkannter Dateien, für das Log
  const structures: string[] = []

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
      const sheets: Record<string, Record<string, unknown>[]> = {}
      for (const sheetName of workbook.SheetNames) {
        sheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
      }

      if (isFreedom24TradeReport(workbook.SheetNames)) {
        tradeReports.push({ sheets, fileName: file.name })
        leadFormat = 'freedom24_report'
        leadLabel = 'Freedom24 Handelsbericht'
        labels.push('Handelsbericht')
        continue
      }

      if (isFreedom24CashReport(workbook.SheetNames)) {
        cashReports.push({ sheets, fileName: file.name })
        labels.push('Ein-/Auszahlungen')
        if (!leadFormat) {
          leadFormat = 'freedom24_cash'
          leadLabel = 'Freedom24 Ein-/Auszahlungen'
        }
        continue
      }

      const rawRows: unknown[][] = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]], { header: 1 }
      )
      if (isFlatexDepotXLSX(workbook.SheetNames, rawRows)) {
        flatexFiles.push({ rows: rawRows, fileName: file.name })
        continue
      }

      if (isFlatexKontoXLSX(workbook.SheetNames, rawRows)) {
        errors.push(kontoumsaetzeError(file.name))
        continue
      }

      errors.push(unknownWorkbookError(file.name, describeWorkbook(workbook.SheetNames, rawRows)))
      structures.push(describeWorkbook(workbook.SheetNames, rawRows))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`"${file.name}" konnte nicht gelesen werden: ${msg}`)
    }
  }

  const freedom24Label = labels.length > 1 ? `Freedom24 (${labels.join(' + ')})` : leadLabel

  try {
    const trades = parseFreedom24TradeReports(tradeReports)
    const cash = parseFreedom24CashReports(cashReports, tradeReports)
    transactions.push(...trades.transactions, ...cash.transactions)
    errors.push(...trades.errors, ...cash.errors)
    stockSplits.push(...trades.stockSplits)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Die Freedom24-Dateien konnten nicht gelesen werden: ${msg}`)
  }

  if (flatexFiles.length > 0) {
    const result = parseFlatexDepotXLSXFiles(flatexFiles)
    transactions.push(...result.transactions)
    errors.push(...result.errors)
    const flatexLabel = flatexFiles.length > 1
      ? `Flatex Depotumsätze (${flatexFiles.length} Dateien)`
      : 'Flatex Depotumsätze'

    return respond({
      // Eine reine Cash-Datei enthält keine Wertpapiere, dann führt Flatex
      format: leadFormat === 'freedom24_report' ? leadFormat : 'flatex_depot',
      formatLabel: [flatexLabel, freedom24Label].filter(Boolean).join(' + '),
      transactions,
      errors,
      notices: result.notices,
      warnings: result.warnings,
      stockSplits,
      totalFiles: files.length,
    }, { files: files.length, flatex: result.diagnostics, freedom24: tradeReports.length + cashReports.length, unknown: structures })
  }

  return respond({
    format: leadFormat || (structures.length === files.length ? 'unknown_xlsx' : 'freedom24_report'),
    formatLabel: freedom24Label || 'Tabellendatei',
    transactions,
    errors,
    stockSplits,
    totalFiles: files.length,
  }, { files: files.length, freedom24: tradeReports.length + cashReports.length, unknown: structures })
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const supabase = getSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Keine Datei empfangen' }, { status: 400 })
    }

    // Max-Größe: 10MB pro Datei
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `"${f.name}" ist zu groß (max. 10MB).` }, { status: 400 })
      }
    }

    const firstFile = files[0]
    const ext = firstFile.name.toLowerCase().split('.').pop() ?? ''

    // ===== CSV → TR / Scalable Capital / finanzen.net Zero / Trading 212 =====
    if (ext === 'csv') {
      const text = await firstFile.text()

      // Auto-Detection über Header — Trade Republic CSV (seit April 2026)
      if (isTradeRepublicCSV(text)) {
        const result = parseTradeRepublicCSV(text)
        return respond({
          format: 'traderepublic_csv',
          formatLabel: 'Trade Republic (CSV)',
          transactions: result.transactions,
          errors: result.skipped,
          uniqueISINs: result.uniqueISINs,
          stockSplits: result.stockSplits,
          tickerRenames: result.tickerRenames,
        })
      }

      if (isTrading212CSV(text)) {
        const result = parseTrading212CSV(text)
        return respond({
          format: 'trading212',
          formatLabel: 'Trading 212',
          transactions: result.transactions,
          errors: result.skipped,
          uniqueISINs: result.uniqueISINs,
        })
      }

      if (isZeroCSV(text)) {
        const result = parseZeroCSV(text)
        return respond({
          format: 'zero',
          formatLabel: 'finanzen.net zero',
          transactions: result.transactions,
          errors: result.skipped,
          uniqueISINs: result.uniqueISINs,
        })
      }

      // Flatex Order-CSV erkennen (Semikolon-CSV mit "Kategorie;Bezeichnung;ISIN / WKN;Art;Handelsplatz")
      // Diese CSV enthält keinen Kaufkurs pro Stück — nur Ordervolumen. Nicht importierbar.
      const firstLine = text.split('\n')[0] || ''
      if (firstLine.includes('Kategorie') && firstLine.includes('ISIN') && firstLine.includes('Handelsplatz')) {
        return respond({
          format: 'flatex_csv',
          formatLabel: 'Flatex Order-CSV',
          transactions: [],
          errors: [
            'Flatex Order-CSV erkannt. Diese Datei enthält leider keinen Kaufkurs pro Stück und kann nicht importiert werden.',
            'Bitte exportiere stattdessen die Depotumsätze als XLSX: Konto/Depot → Depotumsätze → XLSX-Export.',
          ],
        })
      }

      // Fallback: Scalable (hat semikolon-CSV mit englischen Spalten)
      const result = parseScalableCSV(text)
      return respond({
        format: 'scalable',
        formatLabel: 'Scalable Capital',
        transactions: result.transactions,
        errors: result.skipped,
        uniqueISINs: result.uniqueISINs,
        stockSplits: result.stockSplits,
        tickerRenames: result.tickerRenames,
      })
    }

    // ===== PDF → Broker-Auto-Erkennung =====
    if (ext === 'pdf' || files.every(f => f.name.toLowerCase().endsWith('.pdf'))) {
      const allTransactions: FlatexParsedTransaction[] = []
      const allErrors: string[] = []
      let parsedCount = 0
      const brokersSeen = new Set<string>()

      for (const file of files) {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          allErrors.push(`"${file.name}" ist keine PDF-Datei.`)
          continue
        }
        try {
          const buffer = Buffer.from(await file.arrayBuffer())
          const pdfData = await getPdfParse()(buffer)
          const text = pdfData.text

          if (!text || text.trim().length < 50) {
            allErrors.push(`"${file.name}" enthält keinen lesbaren Text.`)
            continue
          }

          const broker = detectBroker(text)
          brokersSeen.add(broker)

          if (broker === 'unknown') {
            allErrors.push(`"${file.name}" konnte keinem Broker zugeordnet werden.`)
            continue
          }

          if (broker === 'freedom24') {
            const r = parseFreedom24PDFText(text, file.name)
            allErrors.push(...r.errors)
            allTransactions.push(...r.transactions)
            if (r.transactions.length > 0) parsedCount++
          } else if (broker === 'traderepublic') {
            const r = parseTradeRepublicPDFText(text, file.name)
            allErrors.push(...r.errors)
            allTransactions.push(...r.transactions.map(tradeRepublicToFlatex))
            if (r.transactions.length > 0) parsedCount++
          } else if (broker === 'smartbroker') {
            const r = parseSmartbrokerPDFText(text, file.name)
            allErrors.push(...r.errors)
            allTransactions.push(...r.transactions.map(smartbrokerToFlatex))
            if (r.transactions.length > 0) parsedCount++
          } else if (broker === 'ing') {
            const r = parseIngPDFText(text, file.name)
            allErrors.push(...r.errors)
            // ING hat zusätzlich 'transfer_in' / 'transfer_out', die FlatexParsedTransaction
            // nicht im Type hat — aber JSON-serialized geht das durch den Client-Mapper
            allTransactions.push(...(r.transactions as unknown as FlatexParsedTransaction[]))
            if (r.transactions.length > 0) parsedCount++
          } else if (broker === 'trading212') {
            const r = parseTrading212PDFText(text, file.name)
            allErrors.push(...r.errors)
            // Trading 212 liefert auch cash_deposit/cash_withdrawal als eigene Typen
            // → Cast über 'unknown', damit TS nicht wegen type-Union meckert.
            allTransactions.push(...(r.transactions as unknown as FlatexParsedTransaction[]))
            if (r.transactions.length > 0) parsedCount++
          } else {
            const r = parseFlatexPDFText(text, file.name)
            allErrors.push(...r.errors)
            allTransactions.push(...r.transactions)
            if (r.transactions.length > 0) parsedCount++
          }
        } catch (err) {
          allErrors.push(`Fehler beim Lesen von "${file.name}": ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`)
        }
      }

      const brokerLabel: Record<string, string> = {
        flatex: 'Flatex / DEGIRO',
        smartbroker: 'Smartbroker+',
        traderepublic: 'Trade Republic',
        freedom24: 'Freedom24',
        ing: 'ING',
        trading212: 'Trading 212',
        unknown: 'Unbekannter Broker',
      }
      const mainBroker = [...brokersSeen].filter(b => b !== 'unknown')[0] ?? 'unknown'

      return respond({
        format: `pdf_${mainBroker}`,
        formatLabel: brokerLabel[mainBroker] ?? 'Broker PDF',
        transactions: allTransactions,
        errors: allErrors,
        totalFiles: files.length,
        parsedFiles: parsedCount,
      }, { files: files.length, brokers: [...brokersSeen] })
    }

    // ===== XLSX → Freedom24 Steuerbericht oder Auftragshistorie =====
    if (ext === 'xlsx' || ext === 'xls') {
      // Mehrere Tabellen zusammenführen. Bei Freedom24 liegen Handel und
      // Geldbewegungen in getrennten Exporten: Wer beide hochlädt, verlor bisher
      // die zweite Datei kommentarlos — und damit die Einzahlungen, auf denen
      // die Kapital-Linie beruht.
      const workbookFiles = files.filter(f => /\.xlsx?$/i.test(f.name))
      if (workbookFiles.length > 1) {
        return await parseMultipleWorkbooks(workbookFiles)
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const XLSX = require(/* webpackIgnore: true */ 'xlsx')
      const buffer = Buffer.from(await firstFile.arrayBuffer())
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

      // Sheet-Namen prüfen → Flatex Depotumsätze vs. Freedom24
      const rawRows: unknown[][] = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]], { header: 1 }
      )
      if (isFlatexDepotXLSX(workbook.SheetNames, rawRows)) {
        const result = parseFlatexDepotXLSX(rawRows, firstFile.name)
        return respond({
          format: 'flatex_depot',
          formatLabel: 'Flatex Depotumsätze',
          transactions: result.transactions,
          errors: result.errors,
          notices: result.notices,
          warnings: result.warnings,
          totalRows: rawRows.length - 1,
        }, { ext, sheets: workbook.SheetNames, flatex: result.diagnostics })
      }

      if (isFlatexKontoXLSX(workbook.SheetNames, rawRows)) {
        return respond({
          format: 'flatex_konto',
          formatLabel: 'Flatex Kontoumsätze',
          transactions: [],
          errors: [kontoumsaetzeError(firstFile.name)],
        }, { ext, workbook: describeWorkbook(workbook.SheetNames, rawRows) })
      }

      // Freedom24 Handelsbericht (hat "Trades ..." Sheet mit Transaktionsdatum)
      if (isFreedom24TradeReport(workbook.SheetNames)) {
        const sheets: Record<string, Record<string, unknown>[]> = {}
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          sheets[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        }
        const result = parseFreedom24TradeReport(sheets, firstFile.name)
        return respond({
          format: 'freedom24_report',
          formatLabel: 'Freedom24 Handelsbericht',
          transactions: result.transactions,
          errors: result.errors,
          stockSplits: result.stockSplits,
        })
      }

      // Freedom24 separate Cash-Datei ("Cash In Out …", ohne Trades-Sheet):
      // liefert nur Ein-/Auszahlungen für das Cash-Ledger / die Kapital-Linie.
      if (isFreedom24CashReport(workbook.SheetNames)) {
        const sheets: Record<string, Record<string, unknown>[]> = {}
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          sheets[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        }
        const result = parseFreedom24CashReport(sheets, firstFile.name)
        return respond({
          format: 'freedom24_cash',
          formatLabel: 'Freedom24 Ein-/Auszahlungen',
          transactions: result.transactions,
          errors: result.errors,
        })
      }

      const hasExecTrades = workbook.SheetNames.some((n: string) => n.startsWith('ExecTrades'))

      if (hasExecTrades) {
        // Freedom24 Steuerbericht
        const sheets: Record<string, Record<string, unknown>[]> = {}
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          sheets[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        }
        const result = parseFreedom24TaxXLSX(sheets, firstFile.name)
        return respond({
          format: 'freedom24_tax',
          formatLabel: 'Freedom24 Steuerbericht',
          transactions: result.transactions,
          errors: result.errors,
        })
      } else {
        // Freedom24 Auftragshistorie
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        if (!rows || rows.length === 0) {
          return respond({
            format: 'freedom24_trades',
            formatLabel: 'Freedom24 Auftragshistorie',
            transactions: [],
            errors: [`Keine Daten in "${firstFile.name}" gefunden.`],
          }, { ext, workbook: describeWorkbook(workbook.SheetNames, rawRows) })
        }

        // Alles Unbekannte lief bisher als Auftragshistorie und scheiterte mit
        // Freedom24-Meldungen, auch der Export einer Hausbank.
        if (!looksLikeFreedom24Orders(rows)) {
          const description = describeWorkbook(workbook.SheetNames, rawRows)
          return respond({
            format: 'unknown_xlsx',
            formatLabel: 'Tabellendatei',
            transactions: [],
            errors: [unknownWorkbookError(firstFile.name, description)],
          }, { ext, workbook: description })
        }

        const result = parseFreedom24XLSXRows(rows, firstFile.name)
        return respond({
          format: 'freedom24_trades',
          formatLabel: 'Freedom24 Auftragshistorie',
          transactions: result.transactions,
          errors: result.errors,
          totalRows: rows.length,
        }, { ext, sheets: workbook.SheetNames, rows: rows.length })
      }
    }

    return NextResponse.json(
      { error: `Dateiformat nicht unterstützt: .${ext}. Unterstützt: PDF, CSV, XLSX` },
      { status: 400 }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Auto-import error:', msg)
    return NextResponse.json({ error: `Fehler beim Import: ${msg}` }, { status: 500 })
  }
}
