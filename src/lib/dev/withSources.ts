// src/lib/dev/withSources.ts
// Route-Wrapper: hängt die Datenherkunft als Header an die normale Antwort.
//
// Einsatz in einer Route — eine Zeile:
//   export const GET = withSources('income-statement', handler)
//
// In Produktion gibt withSources() den Handler unverändert zurück: null Overhead,
// kein Header, kein zusätzlicher Code im Hot Path.

import { DEV_SOURCES_ENABLED, runWithSourceTracking, logSources } from './dataSources'
import { SOURCE_HEADER, encodeSources } from './sourceHeader'

// Bewusst signatur-transparent: der Wrapper reicht die Parameter des Handlers
// unveraendert durch und gibt denselben Typ zurueck. Sonst kollidiert er mit
// NextRequest (enger als Request) und mit Nexts Route-Typpruefung.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Response | Promise<Response>

export function withSources<H extends RouteHandler>(label: string, handler: H): H {
  if (!DEV_SOURCES_ENABLED) return handler

  const wrapped = async (...args: Parameters<H>): Promise<Response> => {
    const { result, hits } = await runWithSourceTracking(async () => handler(...args))

    logSources(label, hits)

    const encoded = encodeSources(hits)
    try {
      result.headers.set(SOURCE_HEADER, encoded)
      return result
    } catch {
      // Manche Responses haben unveränderliche Header — dann neu aufbauen.
      const copy = new Response(result.body, {
        status: result.status,
        statusText: result.statusText,
        headers: new Headers(result.headers),
      })
      copy.headers.set(SOURCE_HEADER, encoded)
      return copy
    }
  }

  return wrapped as H
}
