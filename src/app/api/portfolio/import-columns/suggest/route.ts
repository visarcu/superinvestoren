// API Route: POST /api/portfolio/import-columns/suggest
// KI-Vorschlag für die Spaltenzuordnung beim Spalten-Import. Nur auf
// ausdrücklichen Wunsch des Nutzers (Opt-in im Zuordnungsschritt). Es gehen
// Kopfzeile, höchstens drei bereinigte Beispielzeilen und die Werte der
// Art-Spalten an das Modell, zurück kommt nur die Zuordnung (lib/ai/columnMapping).
//
// Datenschutz: Vor der Freigabe für alle Nutzer muss die Datenschutzerklärung die
// Übertragung an Anthropic nennen. Bis dahin ist die Route wie Finclue AI über
// AI_BETA_ALLOWLIST begrenzt, und import-auto meldet dem Modal nur dann
// `aiSuggestAvailable`, wenn der Nutzer auf der Liste steht.

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getAiUser } from '@/lib/ai/auth'
import { aiConfigured, isAiBetaUser } from '@/lib/ai/config'
import { SuggestionInput, suggestColumnMapping } from '@/lib/ai/columnMapping'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Je Nutzer und Stunde; ein Vorschlag kostet Bruchteile eines Cents, aber die
// Route soll kein offener Kanal zum Modell sein.
const LIMIT_PER_HOUR = 30
const usage = new Map<string, { count: number; resetAt: number }>()

function allow(userId: string): boolean {
  const now = Date.now()
  const entry = usage.get(userId)
  if (!entry || now > entry.resetAt) {
    usage.set(userId, { count: 1, resetAt: now + 60 * 60_000 })
    return true
  }
  if (entry.count >= LIMIT_PER_HOUR) return false
  entry.count++
  return true
}

export async function POST(request: Request) {
  const user = await getAiUser(request)
  if (!user) return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 })
  if (!isAiBetaUser(user.email)) {
    return NextResponse.json({ error: 'Der KI-Vorschlag ist noch nicht für alle freigeschaltet.' }, { status: 403 })
  }
  if (!aiConfigured()) return NextResponse.json({ error: 'Der KI-Vorschlag ist noch nicht eingerichtet.' }, { status: 503 })
  if (!allow(user.id)) {
    return NextResponse.json({ error: 'Zu viele Vorschläge in kurzer Zeit. Bitte ordne die Spalten von Hand zu.' }, { status: 429 })
  }

  let input: SuggestionInput
  try {
    input = SuggestionInput.parse(await request.json())
  } catch (error) {
    const detail = error instanceof ZodError ? 'Kopfzeile oder Beispielzeilen fehlen.' : 'Ungültige Anfrage.'
    return NextResponse.json({ error: detail }, { status: 400 })
  }

  try {
    const started = Date.now()
    const { mapping, note, usage: cost } = await suggestColumnMapping(input)
    console.log('[import-columns/suggest]', JSON.stringify({
      columns: Object.keys(mapping.columns).length,
      kindWords: Object.values(mapping.kinds).map(words => words.length),
      inputTokens: cost.inputTokens,
      outputTokens: cost.outputTokens,
      costUsd: cost.costUsd.toFixed(5),
      durationMs: Date.now() - started,
    }))
    return NextResponse.json({ mapping, note })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[import-columns/suggest] Fehler:', msg)
    return NextResponse.json({ error: 'Der Vorschlag ist gerade nicht möglich. Bitte ordne die Spalten von Hand zu.' }, { status: 502 })
  }
}
