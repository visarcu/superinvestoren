// src/lib/ai/agent.ts
// Kern der Finclue AI: Werkzeugschleife mit Claude, Zahlenprüfung, Kosten.
//
// Die Schleife läuft hier und nicht bei Anthropic, damit Werkzeuge direkt auf
// unsere Server-Funktionen zugreifen und der Verlauf nur bei uns liegt.

import Anthropic from '@anthropic-ai/sdk'
import { ZodError } from 'zod'
import { getAnthropicClient as getClient } from './client'
import { DepotAccess } from './depot/access'
import { AI_TOOLS, isPersonalTool, TOOL_BY_NAME } from './tools'
import { ToolError, type ToolContext } from './tools/base'
import { AI_MODELS, MAX_OUTPUT_TOKENS, MAX_TOOL_ROUNDS, MAX_WEB_SEARCHES, MODEL_PRICES, WEB_SEARCH_PRICE, type AiModelConfig, type AiMode } from './config'
import { checkNumbers, KnownNumbers, TextGate } from './numberCheck'
import { correctionMessage, SYSTEM_PROMPT, wrapQuestion } from './prompt'
import type { AiBlock, AiCheck, AiContext, AiMessagePayload, AiSource, AiStep } from './types'

type BetaMessageParam = Anthropic.Beta.Messages.BetaMessageParam
type BetaToolUnion = Anthropic.Beta.Messages.BetaToolUnion

export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
  /** enthält Daten aus dem eigenen Depot */
  mitDepot?: boolean
}

export interface AgentInput {
  question: string
  context: AiContext | null
  history: HistoryMessage[]
  userId: string
  /** Zugriff auf die eigenen Depots, ohne Angabe ausgeschaltet */
  depot?: DepotAccess
  mode: AiMode
  /** nur für den Modellvergleich */
  modelOverride?: AiModelConfig
  signal?: AbortSignal
  onStep?: (step: AiStep) => void
  onBlock?: (block: AiBlock) => void
  onText?: (delta: string) => void
  onReplace?: (text: string) => void
}

export interface AgentUsage {
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  webSearches: number
  costUsd: number
  rounds: number
}

export interface AgentResult {
  text: string
  payload: AiMessagePayload
  usage: AgentUsage
  toolCalls: Array<{ name: string; input: unknown; ok: boolean }>
}

export class AgentError extends Error {
  constructor(public code: 'abgelehnt' | 'abgebrochen' | 'unvollstaendig' | 'ueberlastet' | 'pausiert' | 'technisch', message: string) {
    super(message)
  }
}

const REASONING_MODELS_WITH_FALLBACK = new Set(['claude-opus-5-5', 'claude-sonnet-5-5'])

function toolDefinitions(model: string): BetaToolUnion[] {
  const own: BetaToolUnion[] = AI_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: { ...t.inputSchema },
    eager_input_streaming: true,
  }))
  const searchOptions = {
    name: 'web_search' as const,
    max_uses: MAX_WEB_SEARCHES,
    user_location: { type: 'approximate' as const, country: 'DE', timezone: 'Europe/Berlin' },
  }
  // Haiku kennt nur die einfache Websuche
  return model.startsWith('claude-haiku')
    ? [...own, { type: 'web_search_20250305', ...searchOptions }]
    : [...own, { type: 'web_search_20260209', ...searchOptions }]
}

function summarizeUsage(total: AgentUsage, usage: Anthropic.Beta.Messages.BetaUsage): void {
  total.inputTokens += usage.input_tokens ?? 0
  total.outputTokens += usage.output_tokens ?? 0
  total.cacheReadTokens += usage.cache_read_input_tokens ?? 0
  total.cacheWriteTokens += usage.cache_creation_input_tokens ?? 0
  total.webSearches += usage.server_tool_use?.web_search_requests ?? 0
  total.rounds++
  const price = MODEL_PRICES[total.model]
  if (price) {
    total.costUsd =
      (total.inputTokens * price.input + total.outputTokens * price.output + total.cacheReadTokens * price.cacheRead + total.cacheWriteTokens * price.cacheWrite) / 1e6 +
      total.webSearches * WEB_SEARCH_PRICE
  }
}

/** Gedankenstriche sind im ganzen Produkt unerwünscht */
function withoutDashes(text: string): string {
  return text.replace(/−/g, '-').replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/(\S) {2,}(?=\S)/g, '$1 ').replace(/(\d)\s?[–—]\s?(?=\d)/g, '$1 bis ').replace(/\s+[–—]\s+/g, ', ').replace(/[–—]/g, '-')
}

/** Anschlussfragen abtrennen und Unsichtbares entfernen */
const DEPOT_MARK = /\[\[\s*depot-einschalten\s*\]\]/gi

export function splitAnswer(text: string): { text: string; fragen: string[]; depotNoetig: boolean } {
  const match = text.match(/\[\[\s*fragen:\s*([^\]]*)\]\]/i)
  const fragen = match ? match[1].split('|').map(f => f.trim()).filter(Boolean).slice(0, 3) : []
  const depotNoetig = new RegExp(DEPOT_MARK.source, 'i').test(text)
  const clean = withoutDashes(text.replace(DEPOT_MARK, '').replace(/\[\[\s*fragen:[^\]]*\]\]/gi, '').replace(/<\/?[a-z][^>]*>/gi, ' '))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    // Grafik vor dem Kopfsatz: Kopfsatz zuerst
    .replace(/^((?:\[\[\s*g\d+\s*\]\]\s*)+)([^\n]+)(\n|$)/, '$2\n\n$1')
    .trim()
  return { text: clean, fragen, depotNoetig }
}

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const config = input.modelOverride ?? AI_MODELS[input.mode]
  const now = new Date()
  const known = new KnownNumbers()
  known.addText(input.question)
  for (const m of input.history) known.addText(m.content)

  let blockCounter = 0
  const depot = input.depot ?? new DepotAccess(input.userId, false, false)
  const ctx: ToolContext = { userId: input.userId, now, nextBlockId: () => `g${++blockCounter}`, depot }
  // Name des geöffneten Depots kommt aus der Datenbank, nie vom Client
  const openDepot = input.context?.depot && input.context.depotId ? await depot.openName().catch(() => null) : null
  const blocks: AiBlock[] = []
  const sources: AiSource[] = []
  const steps: string[] = []
  const toolCalls: AgentResult['toolCalls'] = []
  const usage: AgentUsage = { model: config.model, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, webSearches: 0, costUsd: 0, rounds: 0 }
  let stepCounter = 0

  const messages: BetaMessageParam[] = [
    ...input.history.map(m => ({ role: m.role, content: m.content }) as BetaMessageParam),
    { role: 'user', content: wrapQuestion(input.question, input.context, now, openDepot) },
  ]
  const tools = toolDefinitions(config.model)
  const withFallback = REASONING_MODELS_WITH_FALLBACK.has(config.model)

  /** Eine Modellrunde; gibt die fertige Nachricht zurück. Text läuft nur über das Tor zum Nutzer. */
  async function turn(gate: TextGate | null, noTools: boolean): Promise<Anthropic.Beta.Messages.BetaMessage> {
    for (let attempt = 0; ; attempt++) {
      const stream = getClient().beta.messages.stream(
        {
          model: config.model,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          tools,
          // Werkzeugliste bleibt gleich (Zwischenspeicher), nur die Nutzung wird am Ende unterbunden
          tool_choice: noTools ? { type: 'none' } : { type: 'auto' },
          messages,
          cache_control: { type: 'ephemeral' },
          output_config: { effort: config.effort },
          ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
        },
        { signal: input.signal }
      )
      stream.on('text', delta => {
        if (!gate) return
        const released = gate.push(delta)
        if (released) input.onText?.(withoutDashes(released))
      })
      let emitted = false
      stream.on('streamEvent', event => {
        if (event.type === 'content_block_start' && event.content_block.type === 'server_tool_use' && event.content_block.name === 'web_search') {
          const id = `s${++stepCounter}`
          steps.push('Im Web suchen')
          input.onStep?.({ id, label: 'Im Web suchen', status: 'fertig' })
        }
        if (event.type === 'content_block_start') emitted = true
      })
      try {
        const message = await stream.finalMessage()
        summarizeUsage(usage, message.usage)
        return message
      } catch (error) {
        if (input.signal?.aborted || error instanceof Anthropic.APIUserAbortError) throw new AgentError('abgebrochen', 'Anfrage abgebrochen')
        // Eigenes Monatslimit oder Guthaben erschöpft: kommt als 400 mit festem Textanfang
        if (error instanceof Anthropic.BadRequestError && /API usage limits|credit balance/i.test(error.message)) {
          console.error('[finclue-ai] Budget bei Anthropic erschöpft (Monatslimit oder Guthaben)')
          throw new AgentError('pausiert', 'Finclue AI macht gerade Pause. Bitte versuche es später noch einmal.')
        }
        if (error instanceof Anthropic.RateLimitError || (error instanceof Anthropic.APIError && error.status === 529)) {
          throw new AgentError('ueberlastet', 'Finclue AI ist gerade stark gefragt. Bitte versuche es in einer Minute erneut.')
        }
        if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
          throw new AgentError('technisch', 'Der Zugang zur KI ist nicht richtig eingerichtet.')
        }
        // Unlesbare Werkzeugeingabe oder abgerissene Verbindung: einmal neu, solange nichts beim Nutzer ist
        if (error instanceof Anthropic.APIError || attempt >= 1 || (emitted && gate)) throw error
      }
    }
  }

  async function runTools(message: Anthropic.Beta.Messages.BetaMessage): Promise<boolean> {
    const calls = message.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === 'tool_use')
    if (calls.length === 0) return false
    messages.push({ role: 'assistant', content: message.content })
    const results = await Promise.all(
      calls.map(async (call): Promise<Anthropic.Beta.Messages.BetaToolResultBlockParam> => {
        const fail = (text: string) => ({ type: 'tool_result' as const, tool_use_id: call.id, is_error: true, content: text })
        const tool = TOOL_BY_NAME.get(call.name) ?? TOOL_BY_NAME.get(call.name.toLowerCase())
        if (!tool) return fail(`Unbekanntes Werkzeug ${call.name}. Verfügbar: ${AI_TOOLS.map(t => t.name).join(', ')}`)

        const id = `s${++stepCounter}`
        let label = 'Daten laden'
        try {
          const parsed = tool.schema.parse(call.input)
          label = tool.label(parsed)
          input.onStep?.({ id, label, status: 'laeuft' })
          const result = await tool.run(parsed, ctx)
          known.addData(result.data)
          for (const block of result.blocks ?? []) {
            known.addData(block)
            blocks.push(block)
            input.onBlock?.(block)
          }
          sources.push(...(result.sources ?? []))
          steps.push(label)
          toolCalls.push({ name: tool.name, input: parsed, ok: true })
          input.onStep?.({ id, label, status: 'fertig' })
          return { type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(result.data) }
        } catch (error) {
          toolCalls.push({ name: tool.name, input: call.input, ok: false })
          input.onStep?.({ id, label, status: 'fehler' })
          if (error instanceof ToolError) return fail(error.message)
          if (error instanceof ZodError) return fail(`Ungültige Eingabe: ${error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
          console.error(`[finclue-ai] Werkzeug ${tool.name} fehlgeschlagen`, error instanceof Error ? error.name : 'unbekannt')
          return fail('Die Daten konnten gerade nicht geladen werden.')
        }
      })
    )
    messages.push({ role: 'user', content: results })
    return true
  }

  function textOf(message: Anthropic.Beta.Messages.BetaMessage): string {
    let text = ''
    for (const block of message.content) {
      if (block.type !== 'text') continue
      text += block.text
      for (const c of block.citations ?? []) {
        if ('cited_text' in c && c.cited_text) known.addText(c.cited_text)
        if (c.type === 'web_search_result_location' && c.url) sources.push({ label: (c.title || c.url.replace(/^https?:\/\/(www\.)?/, '')).slice(0, 60), url: c.url })
      }
    }
    return text
  }

  /** Werkzeugrunden bis zur Antwort. visible = Text läuft schon während des Schreibens zum Nutzer. */
  async function answer(visible: boolean, rounds: number): Promise<{ raw: string; gate: TextGate | null }> {
    for (let round = 0; ; round++) {
      const last = round >= rounds
      const gate = visible ? new TextGate(known, true) : null
      const message = await turn(gate, last)
      if (message.stop_reason === 'refusal') throw new AgentError('abgelehnt', 'Diese Frage kann Finclue AI nicht beantworten.')
      if (message.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: message.content })
        continue
      }
      const hasTools = message.content.some(b => b.type === 'tool_use')
      if (message.stop_reason === 'max_tokens' && hasTools) throw new AgentError('unvollstaendig', 'Die Antwort wurde zu lang.')
      if (hasTools && !last) {
        // Vorgeplänkel vor einem Werkzeugaufruf gehört nicht zur Antwort
        if (gate?.releasedAny) input.onReplace?.('')
        if (await runTools(message)) continue
      }
      const text = textOf(message)
      if (!text.trim()) throw new AgentError('unvollstaendig', 'Es kam keine Antwort zustande.')
      messages.push({ role: 'assistant', content: message.content })
      return { raw: text, gate }
    }
  }

  const first = await answer(true, MAX_TOOL_ROUNDS)
  const gate = first.gate
  let raw = first.raw
  let check: AiCheck = checkNumbers(splitAnswer(raw).text, known)

  if (check.offen.length > 0) {
    // Nachbessern, bevor der Rest sichtbar wird
    const id = `s${++stepCounter}`
    input.onStep?.({ id, label: 'Zahlen prüfen', status: 'laeuft' })
    messages.push({ role: 'user', content: correctionMessage(check.offen) })
    try {
      raw = (await answer(false, 2)).raw
      check = checkNumbers(splitAnswer(raw).text, known)
      steps.push('Zahlen geprüft')
      input.onStep?.({ id, label: 'Zahlen geprüft', status: 'fertig' })
    } catch (error) {
      if (error instanceof AgentError && error.code === 'abgebrochen') throw error
      input.onStep?.({ id, label: 'Zahlen prüfen', status: 'fehler' })
    }
    input.onReplace?.(splitAnswer(raw).text)
  } else if (gate?.held) {
    // Beleg kam erst nach dem Satz (Quellenangabe der Websuche)
    input.onReplace?.(splitAnswer(raw).text)
  } else {
    const rest = gate?.flush()
    if (rest) input.onText?.(withoutDashes(rest))
  }

  const { text, fragen, depotNoetig } = splitAnswer(raw)
  const usedIds = new Set([...text.matchAll(/\[\[\s*(g\d+)\s*\]\]/g)].map(m => m[1]))
  const seen = new Set<string>()
  const quellen = sources.filter(s => {
    const key = `${s.label}|${s.url ?? ''}`
    return seen.has(key) ? false : (seen.add(key), true)
  })

  return {
    text,
    payload: {
      blocks: blocks.filter(b => usedIds.has(b.id)),
      quellen: quellen.slice(0, 8),
      pruefung: check,
      schritte: steps,
      fragen,
      ...(depotNoetig && !depot.enabled ? { depotNoetig: true } : {}),
      ...(toolCalls.some(c => c.ok && isPersonalTool(c.name)) || input.history.some(m => m.mitDepot) ? { mitDepot: true } : {}),
    },
    usage,
    toolCalls,
  }
}
