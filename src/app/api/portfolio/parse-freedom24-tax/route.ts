// API Route: POST /api/portfolio/parse-freedom24-tax
// Parst Freedom24 Steuerbericht XLSX (Berichte → Steuerberichte → Excel)
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseFreedom24TaxXLSX } from '@/lib/freedom24TaxXLSXParser'

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const maxDuration = 30

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
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Keine XLSX-Datei empfangen' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      return NextResponse.json({ error: 'Nur XLSX/XLS-Dateien erlaubt' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Datei zu groß (max. 10MB)' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require(/* webpackIgnore: true */ 'xlsx')
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

    // Alle Sheets als rows-Arrays einlesen
    const sheets: Record<string, Record<string, unknown>[]> = {}
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      sheets[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    }

    const result = parseFreedom24TaxXLSX(sheets, file.name)

    return NextResponse.json({
      transactions: result.transactions,
      errors: result.errors,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Freedom24 Tax XLSX parse error:', msg)
    return NextResponse.json({ error: `Fehler beim Parsen: ${msg}` }, { status: 500 })
  }
}
