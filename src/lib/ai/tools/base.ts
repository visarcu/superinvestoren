// src/lib/ai/tools/base.ts
// Gerüst der Werkzeuge. Jedes Werkzeug liest nur, prüft seine Eingaben selbst
// und liefert kompakte Daten für die KI sowie fertige Grafiken für die Anzeige.

import type { z } from 'zod'
import type { DepotAccess } from '../depot/access'
import type { AiBlock, AiSource } from '../types'

export interface ToolContext {
  /** kommt immer vom Server, nie von der KI */
  userId: string
  now: Date
  /** fortlaufende IDs für Grafiken (g1, g2 …) */
  nextBlockId: () => string
  /** eigene Depots, nur mit eingeschaltetem Depotzugriff lesbar */
  depot: DepotAccess
}

export interface ToolResult {
  data: unknown
  blocks?: AiBlock[]
  sources?: AiSource[]
}

export interface JsonSchema {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
  additionalProperties: false
}

export interface AiTool<T = any> {
  name: string
  description: string
  inputSchema: JsonSchema
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
  /** Arbeitsschritt, den der Nutzer sieht */
  label: (input: T) => string
  run: (input: T, ctx: ToolContext) => Promise<ToolResult>
}

export function defineTool<T>(tool: AiTool<T>): AiTool<T> {
  return tool
}

/** Fachlicher Fehler, den die KI dem Nutzer erklären kann */
export class ToolError extends Error {}

const berlinDateTime = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
const berlinTime = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
const berlinWeekday = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short' })
const berlinDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' })

export function berlin(value: Date | number | string): string {
  const d = new Date(value)
  return `${berlinWeekday.format(d).replace('.', '')} ${berlinDateTime.format(d)} Uhr`
}
export function berlinShort(value: Date | number | string): string {
  const d = new Date(value)
  return `${berlinWeekday.format(d).replace('.', '')} ${berlinTime.format(d)}`
}
/** Kalendertag in Deutschland, YYYY-MM-DD */
export function berlinIsoDay(value: Date | number | string): string {
  return berlinDay.format(new Date(value))
}
export function germanDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

/** New Yorker Uhrzeit "YYYY-MM-DD HH:MM:SS" → deutsche Uhrzeit "HH:MM" */
export function newYorkToBerlin(local: string): string {
  const [date, time] = local.split(' ')
  // Versatz New York zur UTC an diesem Tag bestimmen (Sommerzeit)
  const probe = new Date(`${date}T12:00:00Z`)
  const nyHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(probe))
  const offset = 12 - nyHour
  const [h, m] = time.split(':').map(Number)
  return berlinTime.format(new Date(Date.parse(`${date}T00:00:00Z`) + ((h + offset) * 60 + m) * 60_000))
}
