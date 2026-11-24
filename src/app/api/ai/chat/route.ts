// src/app/api/ai/chat/route.ts
// Finclue AI: eine Frage, Antwort als Server-Sent Events (Typen: AiEvent).

import { NextResponse } from 'next/server'
import { AgentError, runAgent } from '@/lib/ai/agent'
import { getAiUser } from '@/lib/ai/auth'
import { AI_MODELS, aiConfigured, isAiBetaUser, MAX_QUESTION_LENGTH, type AiMode } from '@/lib/ai/config'
import { finishQuestion, getQuota, recordCachedAnswer, releaseQuestion, reserveQuestion } from '@/lib/ai/quota'
import { createThread, isUuid, loadHistory, readSharedAnswer, saveExchange, sharedAnswerKey, writeSharedAnswer } from '@/lib/ai/store'
import { SYMBOL_PATTERN } from '@/lib/ai/data/fmp'
import { DepotAccess } from '@/lib/ai/depot/access'
import { isPersonalTool } from '@/lib/ai/tools'
import type { AiContext, AiEvent } from '@/lib/ai/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function parseContext(raw: unknown): AiContext | null {
  if (!raw || typeof raw !== 'object') return null
  // Nur das geprüfte Symbol übernehmen: freier Text vom Client käme sonst über
  // den geteilten Antwort-Zwischenspeicher bei anderen Nutzern an.
  const { symbol, depot, depotId } = raw as Record<string, unknown>
  const s = typeof symbol === 'string' ? symbol.trim().toUpperCase() : ''
  const context: AiContext = {}
  if (s && SYMBOL_PATTERN.test(s)) context.symbol = s
  if (depot === true) {
    context.depot = true
    if (depotId === 'all' || isUuid(depotId)) context.depotId = depotId
  }
  return Object.keys(context).length > 0 ? context : null
}

export async function POST(request: Request) {
  const user = await getAiUser(request)
  if (!user) return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 })
  if (!isAiBetaUser(user.email)) return NextResponse.json({ error: 'Finclue AI ist noch in der geschlossenen Beta.' }, { status: 403 })
  if (!aiConfigured()) return NextResponse.json({ error: 'Finclue AI ist noch nicht eingerichtet.' }, { status: 503 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }
  const question = typeof body.frage === 'string' ? body.frage.trim() : ''
  if (!question) return NextResponse.json({ error: 'Bitte stelle eine Frage.' }, { status: 400 })
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json({ error: `Die Frage ist zu lang (höchstens ${MAX_QUESTION_LENGTH} Zeichen).` }, { status: 400 })
  }
  const mode: AiMode = body.gruendlich === true ? 'gruendlich' : 'standard'
  const context = parseContext(body.kontext)
  const threadIn = isUuid(body.threadId) ? body.threadId : null

  const history = threadIn ? await loadHistory(user.id, threadIn, context?.depot === true) : []
  if (!history) return NextResponse.json({ error: 'Gespräch nicht gefunden.' }, { status: 404 })

  const { charge, model } = AI_MODELS[mode]
  const cacheKey = sharedAnswerKey(question, context, mode, history.length === 0)
  const shared = cacheKey ? await readSharedAnswer(cacheKey) : null

  let reservation: string | null = null
  if (!shared) {
    reservation = await reserveQuestion(user, charge)
    if (!reservation) {
      const quota = await getQuota(user)
      const message = user.isPremium
        ? `Du hast deine ${quota.limit} Fragen für diesen Monat aufgebraucht.`
        : quota.used >= quota.limit
          ? `Du hast deine ${quota.limit} kostenlosen Fragen aufgebraucht.`
          : 'Für eine gründliche Antwort reichen deine verbleibenden Fragen nicht.'
      return NextResponse.json({ error: message, code: 'limit', quota, premium: user.isPremium }, { status: 429 })
    }
  }

  const abort = new AbortController()
  request.signal.addEventListener('abort', () => abort.abort())
  const started = Date.now()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true
      const send = (event: AiEvent) => {
        if (!open) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          open = false
        }
      }
      const keepAlive = setInterval(() => {
        if (open) {
          try {
            controller.enqueue(encoder.encode(': warten\n\n'))
          } catch {
            open = false
          }
        }
      }, 10_000)

      try {
        send({ type: 'start', quota: await getQuota(user) })

        if (shared) {
          for (const block of shared.payload.blocks) send({ type: 'block', block })
          send({ type: 'ersetzen', text: shared.content })
          const threadId = threadIn ?? (await createThread(user.id, question, context))
          await Promise.all([recordCachedAnswer(user.id, shared.model), saveExchange(user.id, threadId, question, shared.content, shared.payload, shared.model)])
          send({ type: 'fertig', threadId, text: shared.content, payload: shared.payload, quota: await getQuota(user) })
          return
        }

        const result = await runAgent({
          question, context, history, userId: user.id, mode, signal: abort.signal,
          depot: new DepotAccess(user.id, user.isPremium, context?.depot === true, context?.depotId ?? 'all'),
          onStep: schritt => send({ type: 'schritt', schritt }),
          onBlock: block => send({ type: 'block', block }),
          onText: delta => send({ type: 'text', delta }),
          onReplace: text => send({ type: 'ersetzen', text }),
        })
        await finishQuestion(reservation!, result.usage, Date.now() - started)
        reservation = null
        // Gespräch erst mit der ersten fertigen Antwort anlegen, sonst bleiben leere zurück
        const threadId = threadIn ?? (await createThread(user.id, question, context))
        await saveExchange(user.id, threadId, question, result.text, result.payload, model)
        // Antworten mit eigenen Daten nie teilen
        const personal = result.toolCalls.some(c => isPersonalTool(c.name))
        if (cacheKey && !personal && result.payload.pruefung && result.payload.pruefung.offen.length === 0) {
          await writeSharedAnswer(cacheKey, result.text, result.payload, model)
        }
        send({ type: 'fertig', threadId, text: result.text, payload: result.payload, quota: await getQuota(user) })
      } catch (error) {
        // Früher Abbruch und Fehler kosten nichts. Wer spät abbricht, hat die Antwort
        // schon ausgelöst, sonst ließen sich beliebig viele Fragen gratis anstoßen.
        const lateAbort = error instanceof AgentError && error.code === 'abgebrochen' && Date.now() - started > 6_000
        if (reservation) await releaseQuestion(reservation, lateAbort).catch(() => {})
        const quota = await getQuota(user).catch(() => null)
        if (error instanceof AgentError) {
          if (error.code !== 'abgebrochen') send({ type: 'fehler', code: error.code, message: error.message, quota })
        } else {
          console.error('[finclue-ai] Fehler:', error instanceof Error ? `${error.name}: ${error.message.slice(0, 200)}` : 'unbekannt')
          send({ type: 'fehler', code: 'technisch', message: 'Das hat nicht geklappt. Die Frage wurde dir nicht abgezogen.', quota })
        }
      } finally {
        clearInterval(keepAlive)
        open = false
        try {
          controller.close()
        } catch {
          // Verbindung war schon zu
        }
      }
    },
    cancel() {
      abort.abort()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
