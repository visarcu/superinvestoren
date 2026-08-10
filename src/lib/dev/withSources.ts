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

type RouteHandler<Ctx> = (request: Request, context: Ctx) => Response | Promise<Response>

export function withSources<Ctx>(label: string, handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  if (!DEV_SOURCES_ENABLED) return handler

  return async (request: Request, context: Ctx): Promise<Response> => {
    const { result, hits } = await runWithSourceTracking(async () => handler(request, context))

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
}
