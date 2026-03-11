// API Route: POST /api/portfolio/parse-flatex-pdf
// Akzeptiert Broker PDF-Dateien (Flatex, Smartbroker+) und gibt geparste Transaktionen zurück
// Auto-Erkennung des Brokers anhand des PDF-Inhalts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseFlatexPDFText, type FlatexParsedTransaction } from '@/lib/flatexPDFParser'
import { parseSmartbrokerPDFText, type SmartbrokerParsedTransaction } from '@/lib/smartbrokerPDFParser'

/**
 * pdf-parse lazy laden — umgeht Webpack's statische Analyse komplett.
 * pdf-parse v1 hat einen Bug: wenn module.parent undefined ist (in Bundlern),
 * versucht es eine Test-PDF zu lesen. Deshalb laden wir das interne Modul direkt.
 */
let _pdfParse: ((buf: Buffer) => Promise<{ text: string; numpages: number }>) | null = null
function getPdfParse() {
  if (!_pdfParse) {
    // Lade pdf-parse/lib/pdf-parse.js direkt (umgeht den module.parent Bug in index.js)
    // eslint-disable-next-line no-eval
    _pdfParse = eval('require')('pdf-parse/lib/pdf-parse')
  }
  return _pdfParse!
}

// Auth check
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** Erkennt den Broker anhand des PDF-Textinhalts */
function detectBroker(text: string): 'flatex' | 'smartbroker' | 'unknown' {
  const lower = text.toLowerCase()
  // Smartbroker+ / Baader Bank
  if (lower.includes('smartbroker') || lower.includes('baader bank') || lower.includes('smartbrokerplus')) {
    return 'smartbroker'
  }
  // Flatex / DEGIRO
  if (lower.includes('flatex') || lower.includes('degiro')) {
    return 'flatex'
  }
  // Fallback: Wenn es eine Wertpapierabrechnung ist, versuche es als Flatex
  if (lower.includes('wertpapier') || lower.includes('sammelabrechnung')) {
    return 'flatex'
  }
  return 'unknown'
}

/** Konvertiert SmartbrokerParsedTransaction zu FlatexParsedTransaction (gleiches Interface) */
function smartbrokerToFlatexFormat(tx: SmartbrokerParsedTransaction): FlatexParsedTransaction {
  return {
    type: tx.type,
    name: tx.name,
    isin: tx.isin,
    wkn: tx.wkn,
    quantity: tx.quantity,
    price: tx.price,
    totalValue: tx.totalValue,
    fees: tx.fees,
    endAmount: tx.endAmount,
    date: tx.date,
    currency: tx.currency,
    exchange: tx.exchange,
    notes: tx.notes,
  }
}

export async function POST(request: Request) {
  try {
    // Auth prüfen
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

    // FormData lesen (multipart/form-data mit PDF-Dateien)
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Keine PDF-Dateien empfangen' }, { status: 400 })
    }

    // Max 50 PDFs gleichzeitig
    if (files.length > 50) {
      return NextResponse.json({ error: 'Maximal 50 PDFs gleichzeitig' }, { status: 400 })
    }

    const allTransactions: FlatexParsedTransaction[] = []
    const allErrors: string[] = []
    let parsedCount = 0

    for (const file of files) {
      // Nur PDFs akzeptieren
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        allErrors.push(`"${file.name}" ist keine PDF-Datei.`)
        continue
      }

      // Max 5MB pro Datei
      if (file.size > 5 * 1024 * 1024) {
        allErrors.push(`"${file.name}" ist zu groß (max. 5MB).`)
        continue
      }

      try {
        // PDF → Buffer → Text
        const buffer = Buffer.from(await file.arrayBuffer())
        const pdfData = await getPdfParse()(buffer)
        const text = pdfData.text

        if (!text || text.trim().length < 50) {
          allErrors.push(`"${file.name}" enthält keinen lesbaren Text.`)
          continue
        }

        // Auto-Erkennung des Brokers
        const broker = detectBroker(text)

        if (broker === 'unknown') {
          allErrors.push(`"${file.name}" konnte keinem Broker zugeordnet werden (Flatex, Smartbroker+ unterstützt).`)
          continue
        }

        if (broker === 'smartbroker') {
          const result = parseSmartbrokerPDFText(text, file.name)
          if (result.errors.length > 0) {
            allErrors.push(...result.errors)
          }
          // Smartbroker-Transaktionen ins gemeinsame Format konvertieren
          allTransactions.push(...result.transactions.map(smartbrokerToFlatexFormat))
          if (result.transactions.length > 0) parsedCount++
        } else {
          // Flatex
          const result = parseFlatexPDFText(text, file.name)
          if (result.errors.length > 0) {
            allErrors.push(...result.errors)
          }
          allTransactions.push(...result.transactions)
          if (result.transactions.length > 0) parsedCount++
        }
      } catch (err) {
        allErrors.push(`Fehler beim Lesen von "${file.name}": ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`)
      }
    }

    return NextResponse.json({
      transactions: allTransactions,
      totalFiles: files.length,
      parsedFiles: parsedCount,
      errors: allErrors,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Parse PDF error:', msg, error)
    return NextResponse.json(
      { error: `Fehler beim PDF-Parsing: ${msg}` },
      { status: 500 }
    )
  }
}
