// API Route: POST /api/portfolio/parse-freedom24-xlsx
// Parst Freedom24 Trades XLSX (Auftragshistorie → Export XLSX)
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseFreedom24XLSXRows } from '@/lib/freedom24XLSXParser'

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

    // XLSX parsen mit xlsx package
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require(/* webpackIgnore: true */ 'xlsx')
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })

    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        transactions: [],
        errors: [`Keine Daten in "${file.name}" gefunden.`],
      })
    }

    const result = parseFreedom24XLSXRows(rows, file.name)

    return NextResponse.json({
      transactions: result.transactions,
      errors: result.errors,
      totalRows: rows.length,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Freedom24 XLSX parse error:', msg)
    return NextResponse.json({ error: `Fehler beim Parsen: ${msg}` }, { status: 500 })
  }
}
