// API Route: POST /api/portfolio/import-columns
// Spalten-Import: Liest eine CSV- oder XLSX-Datei, die kein Parser kennt, nach
// der Zuordnung des Nutzers (multipart: `file` und `mapping` als JSON).
//
// import-auto liefert für solche Dateien `table` (Kopf und Beispielzeilen), das
// Modal lässt den Nutzer die Spalten zuordnen und schickt Datei und Zuordnung
// hierher. Die Antwort hat die Form der anderen Parser (FlatexParsedTransaction),
// danach läuft der Import unverändert weiter.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  COLUMN_FIELDS,
  COLUMN_IMPORT_FORMAT,
  COLUMN_IMPORT_LABEL,
  parseColumnTable,
  readCsvTable,
  tableFromRows,
  validateColumnMapping,
  type ColumnMapping,
  type ColumnTable,
} from '@/lib/columnImport'

export const maxDuration = 60

const MAX_FILE_SIZE = 10 * 1024 * 1024

const MappingSchema = z.object({
  columns: z.record(z.string(), z.number().int().min(0).max(500).optional()),
  kinds: z.object({
    buy: z.array(z.string().max(80)).max(50).default([]),
    sell: z.array(z.string().max(80)).max(50).default([]),
    dividend: z.array(z.string().max(80)).max(50).default([]),
  }),
})

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function parseMapping(raw: unknown): ColumnMapping | null {
  if (typeof raw !== 'string') return null
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = MappingSchema.safeParse(json)
  if (!parsed.success) return null
  // Nur bekannte Felder übernehmen
  const columns: ColumnMapping['columns'] = {}
  for (const { field } of COLUMN_FIELDS) {
    const index = parsed.data.columns[field]
    if (index != null) columns[field] = index
  }
  return { columns, kinds: parsed.data.kinds }
}

async function readTable(file: File): Promise<ColumnTable | null> {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  if (ext === 'csv' || ext === 'txt') {
    return readCsvTable(await file.text())
  }
  if (ext === 'xlsx' || ext === 'xls') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require(/* webpackIgnore: true */ 'xlsx')
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheet = workbook.SheetNames[0]
    if (!sheet) return null
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 })
    return tableFromRows(rawRows, { sheet })
  }
  return null
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await getSupabaseClient().auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Keine Datei empfangen' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `"${file.name}" ist zu groß (max. 10MB).` }, { status: 400 })
    }

    const mapping = parseMapping(formData.get('mapping'))
    if (!mapping) {
      return NextResponse.json({ error: 'Die Spaltenzuordnung ist unvollständig oder ungültig.' }, { status: 400 })
    }

    const table = await readTable(file)
    if (!table) {
      return NextResponse.json({ error: `Dateiformat nicht unterstützt. Für den Spalten-Import: CSV oder XLSX.` }, { status: 400 })
    }

    const problem = validateColumnMapping(mapping, table.header.length)
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 })
    }

    const result = parseColumnTable(table, mapping, file.name)

    if (result.transactions.length === 0) {
      // Aufbau und Zuordnung ins Log, keine Zellwerte
      console.warn('[import-columns] keine Transaktionen', JSON.stringify({
        header: table.header,
        rows: table.rows.length,
        columns: mapping.columns,
        kindWords: Object.values(mapping.kinds).map(words => words.length),
        skippedKinds: result.skippedKinds,
        errors: result.errors,
      }))
    }

    return NextResponse.json({
      format: COLUMN_IMPORT_FORMAT,
      formatLabel: COLUMN_IMPORT_LABEL,
      transactions: result.transactions,
      errors: result.errors,
      notices: result.notices,
      totalRows: table.rows.length,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[import-columns] Fehler:', msg)
    return NextResponse.json({ error: `Fehler beim Import: ${msg}` }, { status: 500 })
  }
}
