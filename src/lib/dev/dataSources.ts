// src/lib/dev/dataSources.ts
// Dev-Only: erfasst pro Request, welche Datenquelle tatsächlich geliefert hat.
//
// Warum so gebaut:
//  - 125 Dateien rufen FMP direkt auf, es gibt keinen zentralen Wrapper zum Abgreifen.
//    Also wird stattdessen `globalThis.fetch` einmalig instrumentiert.
//  - Kein Debug-Endpoint (Projektregel) — die Herkunft reist als Header auf der
//    bestehenden Antwort mit, siehe withSources().
//  - In Produktion ist alles hier inert: DEV_SOURCES_ENABLED ist false, der
//    fetch-Probe wird nie installiert.

import { AsyncLocalStorage } from 'node:async_hooks'
import type { SourceHit, SourceOwnership } from './sourceHeader'

export const DEV_SOURCES_ENABLED = process.env.NODE_ENV !== 'production'

interface SourceStore {
  hits: SourceHit[]
}

const storage = new AsyncLocalStorage<SourceStore>()

/**
 * Host → Quelle. Reihenfolge zählt: data.sec.gov vor sec.gov.
 * "eigen" heißt: die Daten kommen aus einer Quelle, die uns niemand kündigen kann.
 */
const HOST_MAP: Array<[RegExp, string, SourceOwnership]> = [
  [/^data\.sec\.gov$/i, 'sec', 'eigen'],
  [/(^|\.)sec\.gov$/i, 'sec', 'eigen'],
  [/(^|\.)xbrl\.org$/i, 'esef', 'eigen'],
  [/(^|\.)supabase\.co$/i, 'supabase', 'eigen'],
  [/(^|\.)financialmodelingprep\.com$/i, 'fmp', 'fremd'],
  [/(^|\.)eodhd\.com$/i, 'eodhd', 'fremd'],
  [/(^|\.)eodhistoricaldata\.com$/i, 'eodhd', 'fremd'],
  [/(^|\.)finnhub\.io$/i, 'finnhub', 'fremd'],
  [/(^|\.)openai\.com$/i, 'openai', 'fremd'],
  [/(^|\.)pinecone\.io$/i, 'pinecone', 'fremd'],
  [/(^|\.)perplexity\.ai$/i, 'perplexity', 'fremd'],
]

export function classifyHost(host: string): { source: string; ownership: SourceOwnership } {
  for (const [pattern, source, ownership] of HOST_MAP) {
    if (pattern.test(host)) return { source, ownership }
  }
  return { source: host, ownership: 'unbekannt' }
}

/**
 * Manuell eine Quelle vermerken. Nötig für alles, was nicht über fetch läuft —
 * vor allem Prisma-Reads auf unsere eigene DB (die gehen über TCP, nicht HTTP).
 */
export function recordSource(hit: SourceHit): void {
  if (!DEV_SOURCES_ENABLED) return
  storage.getStore()?.hits.push(hit)
}

/** Kurzform für einen Lesezugriff auf unsere eigene Datenbank. */
export function recordDbRead(detail: string, ms = 0): void {
  recordSource({ source: 'db', ownership: 'eigen', detail, ms, ok: true })
}

function buildHit(input: unknown, ms: number, ok: boolean): SourceHit {
  const raw =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : typeof (input as { url?: unknown })?.url === 'string'
          ? (input as { url: string }).url
          : ''

  try {
    const url = new URL(raw)
    const { source, ownership } = classifyHost(url.hostname)
    // Query wird bewusst verworfen: FMP & Co. hängen den API-Key dort an.
    return { source, ownership, detail: url.pathname, ms, ok }
  } catch {
    return { source: 'unbekannt', ownership: 'unbekannt', detail: '', ms, ok }
  }
}

const PROBE_FLAG = Symbol.for('finclue.devFetchProbe')

/** Einmalig `fetch` umhüllen. Ohne aktiven Store passiert nichts. */
function installFetchProbe(): void {
  const glob = globalThis as typeof globalThis & { [PROBE_FLAG]?: boolean }
  if (glob[PROBE_FLAG]) return

  const original = globalThis.fetch
  if (typeof original !== 'function') return

  globalThis.fetch = async function instrumentedFetch(
    input: Parameters<typeof original>[0],
    init?: Parameters<typeof original>[1],
  ) {
    const store = storage.getStore()
    if (!store) return original(input, init)

    const started = Date.now()
    try {
      const response = await original(input, init)
      store.hits.push(buildHit(input, Date.now() - started, response.ok))
      return response
    } catch (error) {
      store.hits.push(buildHit(input, Date.now() - started, false))
      throw error
    }
  } as typeof original

  glob[PROBE_FLAG] = true
}

/**
 * Führt fn in einem Erfassungs-Kontext aus und gibt Ergebnis + gesammelte Quellen zurück.
 * Der Store wird hier gehalten, damit wir die Treffer NACH dem Lauf noch lesen können.
 */
export async function runWithSourceTracking<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; hits: SourceHit[] }> {
  if (!DEV_SOURCES_ENABLED) {
    return { result: await fn(), hits: [] }
  }

  installFetchProbe()
  const store: SourceStore = { hits: [] }
  const result = await storage.run(store, fn)
  return { result, hits: store.hits }
}

/**
 * Terminal-Ausgabe. Deckt auch die Fälle ab, die das Browser-Overlay nicht sieht
 * (Server Components, Cron-Jobs, interne Aufrufe).
 */
export function logSources(label: string, hits: SourceHit[]): void {
  if (!DEV_SOURCES_ENABLED || hits.length === 0) return

  const eigen = hits.filter(h => h.ownership === 'eigen').length
  const fremd = hits.filter(h => h.ownership === 'fremd').length

  console.log(`◆ ${label}  eigen:${eigen} fremd:${fremd}`)
  for (const hit of hits) {
    const mark = hit.ok ? '✓' : '✗'
    const tag = hit.ownership === 'eigen' ? 'eigen' : hit.ownership === 'fremd' ? 'FREMD' : '?'
    console.log(`  ${mark} ${hit.source.padEnd(10)} ${tag.padEnd(5)} ${hit.detail}  ${hit.ms}ms`)
  }
}
