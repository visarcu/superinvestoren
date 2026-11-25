'use client'

// EV-Kennzahlen für Übersicht und Bewertungs-Tab, beide aus demselben Abruf.

import { useEffect, useState } from 'react'

export interface EvMultiple {
  /** null = derzeit kein sinnvoller Wert (Verlust oder fehlende Daten) */
  current: number | null
  /** Vergleichswert der letzten fünf Jahre, null = zu kurze Historie */
  compare: number | null
  basis: 'mittel' | 'median' | null
}

export interface EvMultiples {
  /** Bank, Versicherer oder Kreditgeber: EV-Kennzahlen sagen dort nichts */
  lender: boolean
  evSales: EvMultiple
  evEbitda: EvMultiple
  evEbit: EvMultiple
}

const pending = new Map<string, Promise<EvMultiples | null>>()

function load(ticker: string): Promise<EvMultiples | null> {
  const key = ticker.toUpperCase()
  const running = pending.get(key)
  if (running) return running
  const request = fetch(`/api/valuation-multiples/${encodeURIComponent(key)}`)
    .then(res => (res.ok ? (res.json() as Promise<EvMultiples>) : Promise.reject(new Error(String(res.status)))))
    .catch(() => {
      pending.delete(key)
      return null
    })
  pending.set(key, request)
  return request
}

/** `enabled` = false lädt nichts (Kennzahlen sind Premium) */
export function useValuationMultiples(ticker: string, enabled: boolean): { data: EvMultiples | null; loading: boolean } {
  const [state, setState] = useState<{ ticker: string; data: EvMultiples | null } | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    load(ticker).then(data => {
      if (!cancelled) setState({ ticker, data })
    })
    return () => {
      cancelled = true
    }
  }, [ticker, enabled])

  const current = state?.ticker === ticker ? state : null
  return { data: current?.data ?? null, loading: enabled && current === null }
}
