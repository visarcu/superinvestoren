// API Route: POST /api/portfolio/parse-flatex-pdf
// Akzeptiert Flatex PDF-Dateien und gibt geparste Transaktionen zurück
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseFlatexPDFText, type FlatexParseResult } from '@/lib/flatexPDFParser'

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

    const results: FlatexParseResult[] = []
    const allErrors: string[] = []

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

        // Prüfe ob es eine Flatex-Abrechnung ist
        if (!text.includes('flatex') && !text.includes('DEGIRO') && !text.includes('Wertpapier')) {
          allErrors.push(`"${file.name}" scheint keine Flatex-Abrechnung zu sein.`)
          continue
        }

        // Parsen
        const result = parseFlatexPDFText(text, file.name)
        results.push(result)

        if (result.errors.length > 0) {
          allErrors.push(...result.errors)
        }
      } catch (err) {
        allErrors.push(`Fehler beim Lesen von "${file.name}": ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`)
      }
    }

    // Alle Transaktionen sammeln
    const allTransactions = results.flatMap(r => r.transactions)

    return NextResponse.json({
      transactions: allTransactions,
      totalFiles: files.length,
      parsedFiles: results.filter(r => r.transactions.length > 0).length,
      errors: allErrors,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Parse Flatex PDF error:', msg, error)
    return NextResponse.json(
      { error: `Fehler beim PDF-Parsing: ${msg}` },
      { status: 500 }
    )
  }
}
