// src/lib/ai/columnMapping.ts — KI-Vorschlag für die Spaltenzuordnung beim Depot-Import
//
// Der Nutzer schaltet den Vorschlag im Zuordnungsschritt ausdrücklich ein. An das
// Modell gehen dann nur die Kopfzeile, höchstens drei Beispielzeilen und die
// Werte der Spalten mit wenigen verschiedenen Einträgen (für die Art-Spalte),
// vorher bereinigt: Spalten mit Inhaber, Kunden-, Konto- oder Depotnummer
// werden ersetzt, IBANs und lange Nummern in allen Zellen entfernt. Zurück kommt
// nur die Zuordnung, nie Zahlen; das Lesen der Werte bleibt deterministisch in
// columnImport.ts, und der Nutzer bestätigt den Vorschlag sichtbar.
//
// Datenschutz: Die Datenschutzerklärung (src/app/(website)/privacy/page.tsx,
// Abschnitt „Spaltenvorschlag beim Depot-Import“) beschreibt genau diese Daten
// und die Bereinigung. Wer hier mehr übermittelt, passt den Abschnitt an.

import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { getAnthropicClient } from './client'
import { COLUMN_MAPPING_MODEL, MODEL_PRICES } from './config'
import {
  COLUMN_FIELDS,
  KIND_TYPES,
  MAX_DISTINCT_VALUES,
  SAMPLE_ROWS,
  type ColumnField,
  type ColumnKinds,
  type ColumnMapping,
} from '@/lib/columnImport'

export const MAX_HEADER_COLUMNS = 80
const MAX_CELL_CHARS = 60
const MAX_KIND_WORDS = 20

/** Was der Client für den Vorschlag schickt, geprüft */
export const SuggestionInput = z.object({
  header: z.array(z.string().max(200)).min(1).max(MAX_HEADER_COLUMNS),
  sampleRows: z.array(z.array(z.string().max(500)).max(MAX_HEADER_COLUMNS)).max(SAMPLE_ROWS),
  distinctValues: z.record(z.string().regex(/^\d+$/), z.array(z.string().max(200)).max(MAX_DISTINCT_VALUES)).default({}),
})
export type SuggestionInput = z.infer<typeof SuggestionInput>

export interface ColumnSuggestion {
  mapping: ColumnMapping
  /** Ein Hinweis des Modells an den Nutzer, worauf er achten sollte */
  note: string | null
  usage: { inputTokens: number; outputTokens: number; costUsd: number }
}

// ---------------------------------------------------------------------------
// Bereinigen
// ---------------------------------------------------------------------------

/** Spalten, deren Inhalt die Person oder ihr Konto nennt */
const PERSONAL_HEADER = /inhaber|kunde|kunden|kontonummer|konto-?nr|kontonr|depotnummer|depot-?nr|depotnr|iban|bic|adresse|anschrift|steuer-?id|steuernummer|referenz|auftrags-?nr|auftragsnummer|order-?nr|ordernummer|beleg-?nr|belegnummer|ta\.?-?nr|vorname|nachname/i
const IBAN = /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]){11,30}\b/g
/** Nummern ab sieben Stellen, die kein Betrag sind (Depot-, Konto-, Ordernummern); ISINs und WKNs bleiben */
const LONG_NUMBER = /(?<![\p{L}\d.,])\d{7,}(?![\d.,])/gu

function scrubCell(text: string): string {
  const cleaned = text.replace(IBAN, '[IBAN]').replace(LONG_NUMBER, '[Nummer]').trim()
  return cleaned.length > MAX_CELL_CHARS ? `${cleaned.slice(0, MAX_CELL_CHARS - 1)}…` : cleaned
}

export interface ScrubbedInput {
  header: string[]
  sampleRows: string[][]
  distinctValues: Record<number, string[]>
}

/** Bereinigt Kopf, Beispielzeilen und Wertelisten, bevor etwas das Haus verlässt. */
export function scrubForModel(input: SuggestionInput): ScrubbedInput {
  const personal = input.header.map(name => PERSONAL_HEADER.test(name))
  const header = input.header.map(scrubCell)
  const sampleRows = input.sampleRows.map(row =>
    header.map((_, col) => (personal[col] ? '[entfernt]' : scrubCell(row[col] ?? '')))
  )
  const distinctValues: Record<number, string[]> = {}
  for (const [key, values] of Object.entries(input.distinctValues)) {
    const col = Number(key)
    if (!Number.isInteger(col) || col < 0 || col >= header.length || personal[col]) continue
    distinctValues[col] = values.map(scrubCell)
  }
  return { header, sampleRows, distinctValues }
}

// ---------------------------------------------------------------------------
// Modell
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Du ordnest die Spalten eines Depot-Exports (CSV oder Excel einer Bank oder eines Brokers) den Feldern eines Imports zu.

Felder:
- date: Handels- oder Buchungstag der Buchung (nicht Valuta, wenn beides da ist)
- isin: ISIN des Wertpapiers (12 Zeichen)
- wkn: WKN des Wertpapiers (6 Zeichen)
- name: Name des Wertpapiers
- kind: Buchungsart (Kauf, Verkauf, Dividende, Zinsen …)
- quantity: Stückzahl der Buchung
- price: Kurs je Stück (nicht Devisenkurs, nicht Kurswert)
- amount: Gesamtbetrag der Buchung
- fee: Gebühren, Provision, Spesen
- currency: Währung

Regeln:
- Gib je Feld den Spaltenindex (0-basiert) an oder null, wenn es die Spalte nicht gibt.
- Jede Spalte höchstens einem Feld zuordnen.
- Für kinds nenne die Werte der Art-Spalte, die Kauf, Verkauf oder Dividende (auch Ausschüttung) bedeuten, genau so geschrieben wie in der Werteliste. Andere Werte (Zinsen, Gebühren, Ein- und Auszahlungen, Steuern) lässt du weg. Gibt es keine Art-Spalte, bleiben die Listen leer.
- Erfinde nichts, rechne nichts und gib keine Zahlen aus den Zeilen zurück.
- note: höchstens ein Satz auf Deutsch, wenn der Nutzer etwas prüfen sollte, sonst leer. Keine Gedankenstriche.`

const TOOL: Anthropic.Messages.Tool = {
  name: 'spaltenzuordnung',
  description: 'Die Zuordnung der Spalten zu den Feldern des Imports.',
  input_schema: {
    type: 'object',
    properties: {
      columns: {
        type: 'object',
        properties: Object.fromEntries(
          COLUMN_FIELDS.map(({ field, hint }) => [field, { type: ['integer', 'null'], description: hint }])
        ),
        required: COLUMN_FIELDS.map(({ field }) => field),
        additionalProperties: false,
      },
      kinds: {
        type: 'object',
        properties: {
          buy: { type: 'array', items: { type: 'string' } },
          sell: { type: 'array', items: { type: 'string' } },
          dividend: { type: 'array', items: { type: 'string' } },
        },
        required: ['buy', 'sell', 'dividend'],
        additionalProperties: false,
      },
      note: { type: 'string' },
    },
    required: ['columns', 'kinds'],
    additionalProperties: false,
  },
}

const ToolOutput = z.object({
  columns: z.record(z.string(), z.number().int().nullable().optional()),
  kinds: z.object({
    buy: z.array(z.string()).default([]),
    sell: z.array(z.string()).default([]),
    dividend: z.array(z.string()).default([]),
  }),
  note: z.string().optional(),
})

function describeInput(input: ScrubbedInput): string {
  const lines: string[] = ['Kopfzeile (Index: Name):']
  input.header.forEach((name, i) => lines.push(`${i}: ${name}`))
  if (input.sampleRows.length > 0) {
    lines.push('', 'Beispielzeilen (Werte in der Reihenfolge der Spalten):')
    input.sampleRows.forEach((row, i) => lines.push(`Zeile ${i + 1}: ${JSON.stringify(row)}`))
  }
  const lists = Object.entries(input.distinctValues)
  if (lists.length > 0) {
    lines.push('', 'Spalten mit wenigen verschiedenen Werten (Kandidaten für die Art-Spalte):')
    for (const [col, values] of lists) lines.push(`Spalte ${col} (${input.header[Number(col)]}): ${JSON.stringify(values)}`)
  }
  return lines.join('\n')
}

/** Zuordnung des Modells auf gültige Spalten und bekannte Art-Werte begrenzen. */
function toMapping(output: z.infer<typeof ToolOutput>, input: ScrubbedInput): ColumnMapping {
  const columns: Partial<Record<ColumnField, number>> = {}
  const taken = new Set<number>()
  for (const { field } of COLUMN_FIELDS) {
    const index = output.columns[field]
    if (index == null || !Number.isInteger(index) || index < 0 || index >= input.header.length || taken.has(index)) continue
    columns[field] = index
    taken.add(index)
  }

  const kinds: ColumnKinds = { buy: [], sell: [], dividend: [] }
  const kindValues = columns.kind != null ? input.distinctValues[columns.kind] : undefined
  const seen = new Set<string>()
  for (const type of KIND_TYPES) {
    for (const raw of output.kinds[type]) {
      const word = raw.trim()
      if (!word || seen.has(word.toLowerCase()) || kinds[type].length >= MAX_KIND_WORDS) continue
      // Nur Werte, die in der Spalte vorkommen; sonst in der Schreibweise der Datei
      const match = kindValues ? kindValues.find(value => value.toLowerCase() === word.toLowerCase()) : word
      if (!match) continue
      seen.add(word.toLowerCase())
      kinds[type].push(match.slice(0, 80))
    }
  }
  return { columns, kinds }
}

export async function suggestColumnMapping(raw: SuggestionInput): Promise<ColumnSuggestion> {
  const input = scrubForModel(raw)
  const response = await getAnthropicClient().messages.create({
    model: COLUMN_MAPPING_MODEL,
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: describeInput(input) }],
  })

  const block = response.content.find((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
  if (!block) throw new Error('Das Modell hat keine Zuordnung geliefert.')
  const output = ToolOutput.parse(block.input)

  const prices = MODEL_PRICES[COLUMN_MAPPING_MODEL]
  const inputTokens = response.usage.input_tokens
  const outputTokens = response.usage.output_tokens
  const costUsd = prices ? (inputTokens * prices.input + outputTokens * prices.output) / 1_000_000 : 0

  const note = output.note?.trim() || null
  return {
    mapping: toMapping(output, input),
    note: note ? note.replace(/\s[–—]\s/g, ', ') : null,
    usage: { inputTokens, outputTokens, costUsd },
  }
}
