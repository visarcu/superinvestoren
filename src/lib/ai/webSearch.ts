// src/lib/ai/webSearch.ts
// Kurze Texte aus aktuellen Webquellen: Claude mit eingebauter Websuche.
// Ersetzt Perplexity (Marktbericht ohne Tagesbericht, News in der Depot-KI-Analyse).
// Kosten je Aufruf: 1 Cent pro Suche plus Tokens, deshalb begrenzen die Aufrufer
// die Suchen und speichern das Ergebnis zwischen.

import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropicClient } from './client'
import { MODEL_PRICES, WEB_SEARCH_PRICE } from './config'

export const WEB_SEARCH_MODEL = 'claude-sonnet-5-5'

interface WebSearchTextInput {
  /** Kennung fürs Log, etwa „market-summary“ */
  label: string
  system: string
  prompt: string
  /** Höchstzahl an Suchen in diesem Aufruf */
  maxSearches: number
  maxTokens: number
  timeoutMs: number
}

/** Antworttext nach der letzten Suche. Wirft, wenn nichts Brauchbares zurückkommt. */
export async function webSearchText(input: WebSearchTextInput): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Websuche: ANTHROPIC_API_KEY fehlt')

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: input.prompt }]
  const signal = AbortSignal.timeout(input.timeoutMs)
  const usage = { input: 0, output: 0, searches: 0 }

  // Lange Suchrunden kann der Server unterbrechen (pause_turn), dann geht es mit
  // derselben Nachricht weiter.
  for (let round = 0; round < 3; round++) {
    const message = await getAnthropicClient().messages.create(
      {
        model: WEB_SEARCH_MODEL,
        max_tokens: input.maxTokens,
        system: input.system,
        tools: [{
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: input.maxSearches,
          user_location: { type: 'approximate', country: 'DE', timezone: 'Europe/Berlin' },
        }],
        output_config: { effort: 'low' },
        messages,
      },
      { signal, maxRetries: 1, timeout: input.timeoutMs }
    )

    usage.input += message.usage.input_tokens + (message.usage.cache_creation_input_tokens ?? 0) + (message.usage.cache_read_input_tokens ?? 0)
    usage.output += message.usage.output_tokens
    usage.searches += message.usage.server_tool_use?.web_search_requests ?? 0

    if (message.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: message.content })
      continue
    }
    if (message.stop_reason === 'refusal') throw new Error('Websuche: Anfrage abgelehnt')

    logUsage(input.label, usage)
    const text = withoutDashes(answerText(message.content))
    if (!text) throw new Error(`Websuche: keine Antwort (${message.stop_reason})`)
    return text
  }
  throw new Error('Websuche: nach drei Runden keine Antwort')
}

function logUsage(label: string, usage: { input: number; output: number; searches: number }): void {
  const price = MODEL_PRICES[WEB_SEARCH_MODEL]
  const usd = price
    ? (usage.input * price.input + usage.output * price.output) / 1e6 + usage.searches * WEB_SEARCH_PRICE
    : NaN
  console.log(`[Websuche ${label}] ${usage.searches} Suchen, ${usage.input} Eingabe- und ${usage.output} Ausgabe-Tokens, etwa ${usd.toFixed(3)} $`)
}

/** Nur der Text nach dem letzten Such- oder Filterergebnis, ohne Vorrede wie „Ich suche …“ */
function answerText(content: Anthropic.ContentBlock[]): string {
  let lastResult = -1
  content.forEach((block, i) => {
    if (block.type.endsWith('_tool_result')) lastResult = i
  })
  return content
    .slice(lastResult + 1)
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim()
}

/** Gedankenstriche sind im ganzen Produkt unerwünscht (wie in lib/ai/agent) */
function withoutDashes(text: string): string {
  return text
    .replace(/(\d)\s?[–—]\s?(?=\d)/g, '$1 bis ')
    .replace(/\s+[–—]\s+/g, ', ')
    .replace(/[–—]/g, '-')
}
