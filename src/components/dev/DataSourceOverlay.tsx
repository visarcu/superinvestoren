'use client'

// src/components/dev/DataSourceOverlay.tsx
// Dev-Only Overlay: zeigt auf localhost, welche Daten die gerade sichtbare Seite
// aus eigenen Quellen (SEC/ESEF/DB) zieht und welche noch von Vendoren (FMP/EODHD) kommen.
//
// Liest den x-finclue-sources Header, den withSources() an die Antworten hängt.
// Rendert in Produktion grundsätzlich nichts.

import { useEffect, useState } from 'react'
import { SOURCE_HEADER, decodeSources, type SourceHit } from '@/lib/dev/sourceHeader'

const IS_DEV = process.env.NODE_ENV !== 'production'
const PATCH_FLAG = '__finclueSourceOverlayPatched'
const MAX_ENTRIES = 50

interface RouteEntry {
  id: number
  route: string
  hits: SourceHit[]
  at: number
}

/** Sammelstelle außerhalb von React — der fetch-Patch überlebt Re-Mounts. */
const listeners = new Set<(entry: RouteEntry) => void>()
let counter = 0

function patchClientFetch() {
  const glob = window as unknown as Record<string, unknown>
  if (glob[PATCH_FLAG]) return
  glob[PATCH_FLAG] = true

  const original = window.fetch
  window.fetch = async function instrumented(input: RequestInfo | URL, init?: RequestInit) {
    const response = await original(input, init)
    try {
      const raw = response.headers.get(SOURCE_HEADER)
      if (raw) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        const route = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
        const entry: RouteEntry = { id: ++counter, route, hits: decodeSources(raw), at: Date.now() }
        listeners.forEach(fn => fn(entry))
      }
    } catch {
      // Overlay darf niemals den echten Request stören.
    }
    return response
  }
}

export default function DataSourceOverlay() {
  const [entries, setEntries] = useState<RouteEntry[]>([])
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!IS_DEV) return
    setMounted(true)
    patchClientFetch()

    const onEntry = (entry: RouteEntry) => {
      setEntries(prev => [entry, ...prev].slice(0, MAX_ENTRIES))
    }
    listeners.add(onEntry)
    return () => {
      listeners.delete(onEntry)
    }
  }, [])

  if (!IS_DEV || !mounted) return null

  const allHits = entries.flatMap(e => e.hits)
  const eigen = allHits.filter(h => h.ownership === 'eigen').length
  const fremd = allHits.filter(h => h.ownership === 'fremd').length
  const total = eigen + fremd
  const ownShare = total > 0 ? Math.round((eigen / total) * 100) : 0

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-mono text-xs">
      {open && (
        <div className="mb-2 max-h-[60vh] w-[420px] overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900/95 shadow-2xl backdrop-blur">
          <div className="sticky top-0 flex items-center justify-between border-b border-neutral-700 bg-neutral-900 px-3 py-2">
            <span className="font-semibold text-neutral-200">Datenherkunft</span>
            <button
              onClick={() => setEntries([])}
              className="rounded px-2 py-0.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            >
              leeren
            </button>
          </div>

          {entries.length === 0 ? (
            <p className="px-3 py-4 text-neutral-500">
              Noch nichts erfasst. Nur Routen mit <code>withSources()</code> melden sich hier.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-800">
              {entries.map(entry => (
                <li key={entry.id} className="px-3 py-2">
                  <div className="mb-1 truncate text-neutral-300">{entry.route}</div>
                  {entry.hits.length === 0 ? (
                    <div className="text-neutral-600">— kein externer Call</div>
                  ) : (
                    entry.hits.map((hit, i) => (
                      <div key={i} className="flex items-baseline gap-2">
                        <span
                          className={
                            hit.ownership === 'eigen'
                              ? 'text-emerald-400'
                              : hit.ownership === 'fremd'
                                ? 'text-amber-400'
                                : 'text-neutral-500'
                          }
                        >
                          {hit.ownership === 'eigen' ? '●' : '○'} {hit.source}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-neutral-500">{hit.detail}</span>
                        <span className="shrink-0 text-neutral-600">{hit.ms}ms</span>
                      </div>
                    ))
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/95 px-3 py-1.5 text-neutral-300 shadow-lg backdrop-blur hover:border-neutral-600"
        title="Datenherkunft (nur lokal sichtbar)"
      >
        <span className="text-emerald-400">● {eigen} eigen</span>
        <span className="text-neutral-600">|</span>
        <span className="text-amber-400">○ {fremd} fremd</span>
        {total > 0 && <span className="text-neutral-500">{ownShare}%</span>}
      </button>
    </div>
  )
}
