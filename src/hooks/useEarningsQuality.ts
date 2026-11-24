'use client'

// Sondereinfluss im Gewinn der letzten zwölf Monate (lib/earningsQuality) für
// die KGV-Zeilen der Aktienseiten. Mehrere Karten derselben Seite teilen sich
// einen Abruf.

import { useEffect, useState } from 'react'
import type { EarningsQuality } from '@/lib/earningsQualityRules'

const pending = new Map<string, Promise<EarningsQuality | null>>()

function load(ticker: string): Promise<EarningsQuality | null> {
  const key = ticker.toUpperCase()
  const running = pending.get(key)
  if (running) return running
  const request = fetch(`/api/earnings-quality/${encodeURIComponent(key)}`)
    .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
    .then(body => (body.quality ?? null) as EarningsQuality | null)
    .catch(() => {
      pending.delete(key)
      return null
    })
  pending.set(key, request)
  return request
}

export function useEarningsQuality(ticker: string): EarningsQuality | null {
  const [state, setState] = useState<{ ticker: string; quality: EarningsQuality | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    load(ticker).then(quality => {
      if (!cancelled) setState({ ticker, quality })
    })
    return () => {
      cancelled = true
    }
  }, [ticker])

  // Beim Wechsel der Aktie nie den Hinweis der vorigen zeigen
  return state?.ticker === ticker ? state.quality : null
}
