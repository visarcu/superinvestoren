// src/hooks/useLookthrough.ts
// Lädt die Look-Through-Analyse (/api/portfolio/lookthrough) für ein Depot.
// Ausgelagert aus LookthroughSection, damit Workspace-Überblick und
// Analyse-Tab EINEN Fetch teilen statt doppelt zu rechnen.
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { type Holding } from '@/hooks/usePortfolio'

// ==== Antwort-Typen der Lookthrough-API (Spiegel von lib/portfolio/lookthrough.ts) ====

export interface ExposureSource {
  etfSymbol: string
  etfName: string
  value: number
}
export interface EffectiveExposure {
  symbol: string
  name: string
  isin: string | null
  value: number
  percent: number
  directValue: number
  etfValue: number
  etfCount: number
  sources: ExposureSource[]
  superinvestors?: { count: number; top: { name: string; trend: string }[] }
}
export interface WeightSlice {
  label: string
  value: number
  percent: number
}
export interface OverlapPair {
  symbolA: string
  nameA: string
  symbolB: string
  nameB: string
  overlapPercent: number
  sharedCount: number
  topShared: { symbol: string; name: string; weightA: number; weightB: number }[]
}
export interface EtfCoverageInfo {
  symbol: string
  name: string
  value: number
  status: 'exact' | 'approximated' | 'no-proxy' | 'non-equity'
  proxyLabel?: string
  note?: string
}
export interface LookthroughInsight {
  severity: 'info' | 'warn'
  title: string
  text: string
}
export interface SizeExposure {
  slices: WeightSlice[]
  coveragePercent: number
  weightedPE: number | null
}
export interface LookthroughResult {
  totalValue: number
  analyzedValue: number
  coveragePercent: number
  etfValue: number
  directStockValue: number
  topExposures: EffectiveExposure[]
  regions: WeightSlice[]
  sectors: WeightSlice[]
  overlaps: OverlapPair[]
  etfCoverage: EtfCoverageInfo[]
  insights: LookthroughInsight[]
  sizeExposure: SizeExposure | null
}

export interface UseLookthroughState {
  result: LookthroughResult | null
  loading: boolean
  error: boolean
}

/**
 * Look-Through für die übergebenen Holdings laden.
 * Mit leerem Array wird nichts geladen (loading=false, result=null) —
 * so kann eine Komponente den Fetch überspringen, wenn ihr ein
 * vorgeladenes Ergebnis gereicht wird.
 */
export function useLookthrough(holdings: Holding[]): UseLookthroughState {
  const [result, setResult] = useState<LookthroughResult | null>(null)
  const [loading, setLoading] = useState(holdings.length > 0)
  const [error, setError] = useState(false)

  // Stabiler Schlüssel, damit nicht jeder Render einen neuen Fetch auslöst
  const holdingsKey = useMemo(
    () => holdings.map(h => `${h.symbol}:${Math.round(h.value)}`).sort().join('|'),
    [holdings],
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (holdings.length === 0) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError(false)
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setError(true)
          return
        }
        const response = await fetch('/api/portfolio/lookthrough', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            positions: holdings.map(h => ({
              symbol: h.symbol,
              name: h.name,
              isin: h.isin || null,
              value: h.value,
            })),
          }),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data: LookthroughResult = await response.json()
        if (!cancelled) setResult(data)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdingsKey])

  return { result, loading, error }
}
