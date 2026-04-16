// API Route: POST /api/portfolio/import-auto
// Erkennt das Format automatisch und routet zum richtigen Parser.
//
// Unterstützte Formate (auto-erkannt):
//   .pdf               → Broker-PDF (Flatex, Smartbroker+, Trade Republic, Freedom24)
//   .csv               → Scalable Capital CSV
//   .xlsx mit ExecTrades-Sheet → Freedom24 Steuerbericht (bevorzugt)
//   .xlsx ohne ExecTrades      → Freedom24 Auftragshistorie (Fallback)
//
// Response: { format, formatLabel, transactions, errors, totalFiles?, parsedFiles? }

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseScalableCSV } from '@/lib/scalableCSVParser'
import { parseZeroCSV, isZeroCSV } from '@/lib/zeroCSVParser'
import { parseFlatexPDFText, type FlatexParsedTransaction } from '@/lib/flatexPDFParser'
import { parseSmartbrokerPDFText, type SmartbrokerParsedTransaction } from '@/lib/smartbrokerPDFParser'
import { parseTradeRepublicPDFText, type TradeRepublicParsedTransaction } from '@/lib/tradeRepublicPDFParser'
import { parseFreedom24PDFText } from '@/lib/freedom24PDFParser'
import { parseFreedom24TaxXLSX } from '@/lib/freedom24TaxXLSXParser'
import { parseFreedom24XLSXRows } from '@/lib/freedom24XLSXParser'
import { parseIngPDFText, isIngPDF, type IngParsedTransaction } from '@/lib/ingPDFParser'

export const maxDuration = 60

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

function detectBroker(text: string): 'flatex' | 'smartbroker' | 'traderepublic' | 'freedom24' | 'ing' | 'unknown' {
  const lower = text.toLowerCase()
  // ING muss VOR Flatex geprüft werden, da ING-PDFs auch das Wort "Wertpapier" enthalten
  if (isIngPDF(text)) return 'ing'
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

    // ===== CSV → Scalable Capital oder finanzen.net Zero =====
    if (ext === 'csv') {
      const text = await firstFile.text()

      // Auto-Detection über Header
      if (isZeroCSV(text)) {
        const result = parseZeroCSV(text)
        return NextResponse.json({
          format: 'zero',
          formatLabel: 'finanzen.net zero',
          transactions: result.transactions,
          errors: result.skipped,
          uniqueISINs: result.uniqueISINs,
        })
      }

      // Fallback: Scalable (hat semikolon-CSV mit englischen Spalten)
      const result = parseScalableCSV(text)
      return NextResponse.json({
        format: 'scalable',
        formatLabel: 'Scalable Capital',
        transactions: result.transactions,
        errors: result.skipped,
        uniqueISINs: result.uniqueISINs,
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
        unknown: 'Unbekannter Broker',
      }
      const mainBroker = [...brokersSeen].filter(b => b !== 'unknown')[0] ?? 'unknown'

      return NextResponse.json({
        format: `pdf_${mainBroker}`,
        formatLabel: brokerLabel[mainBroker] ?? 'Broker PDF',
        transactions: allTransactions,
        errors: allErrors,
        totalFiles: files.length,
        parsedFiles: parsedCount,
      })
    }

    // ===== XLSX → Freedom24 Steuerbericht oder Auftragshistorie =====
    if (ext === 'xlsx' || ext === 'xls') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const XLSX = require(/* webpackIgnore: true */ 'xlsx')
      const buffer = Buffer.from(await firstFile.arrayBuffer())
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

      // Sheet-Namen prüfen → Steuerbericht (ExecTrades) vs. Auftragshistorie
      const hasExecTrades = workbook.SheetNames.some((n: string) => n.startsWith('ExecTrades'))

      if (hasExecTrades) {
        // Freedom24 Steuerbericht
        const sheets: Record<string, Record<string, unknown>[]> = {}
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          sheets[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        }
        const result = parseFreedom24TaxXLSX(sheets, firstFile.name)
        return NextResponse.json({
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
          return NextResponse.json({
            format: 'freedom24_trades',
            formatLabel: 'Freedom24 Auftragshistorie',
            transactions: [],
            errors: [`Keine Daten in "${firstFile.name}" gefunden.`],
          })
        }

        const result = parseFreedom24XLSXRows(rows, firstFile.name)
        return NextResponse.json({
          format: 'freedom24_trades',
          formatLabel: 'Freedom24 Auftragshistorie',
          transactions: result.transactions,
          errors: result.errors,
          totalRows: rows.length,
        })
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
