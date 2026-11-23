'use client'

import { useEffect, useMemo, useState } from 'react'
import type { DepotSummary, Holding, Portfolio } from '@/hooks/usePortfolio'
import { valuateHoldingsByPortfolio, type ValuationHolding } from '@/lib/portfolioValuation'

// Wert pro Depot (Wertpapiere live bewertet + Cash) für Seitenleiste, Karten und
// Depot-Umschalter. Fehlt ein Depot in der Map, ist sein Wert noch nicht geladen.
// In "Alle Depots" kommen die Werte aus den Depot-Kennzahlen (auch fürs
// Beispieldepot, das in der Summe nicht zählt). Im Einzeldepot werden die Werte
// der anderen Depots separat geladen, bis dahin gelten die zuletzt bekannten.
export function useDepotValues({
  holdings,
  allPortfolios,
  portfolioId,
  isAllDepotsView,
  loading,
  summaries,
}: {
  holdings: Holding[]
  allPortfolios: Portfolio[]
  portfolioId?: string
  isAllDepotsView: boolean
  loading: boolean
  summaries: Map<string, DepotSummary>
}): Map<string, number> {
  // Wertpapierwert je Depot, ohne Cash
  const [known, setKnown] = useState<Map<string, number>>(new Map())

  // Gerade angezeigtes Depot bzw. alle. Während des Ladens gehören holdings
  // noch zum vorherigen Depot.
  useEffect(() => {
    if (loading || !portfolioId) return
    setKnown(prev => {
      const next = new Map(prev)
      if (isAllDepotsView) {
        summaries.forEach((summary, id) => next.set(id, summary.stockValue))
      } else {
        next.set(portfolioId, holdings.reduce((sum, h) => sum + h.value, 0))
      }
      return next
    })
  }, [holdings, portfolioId, isAllDepotsView, loading, summaries])

  // Die anderen Depots
  useEffect(() => {
    if (allPortfolios.length <= 1 || isAllDepotsView || !portfolioId) return
    let cancelled = false
    async function loadOtherDepots() {
      try {
        const { supabase } = await import('@/lib/supabaseClient')
        const otherIds = allPortfolios.filter(dp => dp.id !== portfolioId).map(dp => dp.id)
        if (otherIds.length === 0) return

        const { data } = await supabase
          .from('portfolio_holdings')
          .select('portfolio_id, symbol, current_price, purchase_price, quantity')
          .in('portfolio_id', otherIds)
        if (cancelled || !data) return

        const valuation = await valuateHoldingsByPortfolio(data as ValuationHolding[])
        if (cancelled) return

        setKnown(prev => {
          const next = new Map(prev)
          otherIds.forEach(id => next.set(id, valuation.get(id)?.value ?? 0))
          return next
        })
      } catch (err) {
        console.error('Error loading depot values:', err)
      }
    }
    loadOtherDepots()
    return () => { cancelled = true }
  }, [allPortfolios, portfolioId, isAllDepotsView])

  return useMemo(() => {
    const values = new Map<string, number>()
    allPortfolios.forEach(dp => {
      const stockValue = known.get(dp.id)
      if (stockValue !== undefined) values.set(dp.id, stockValue + (dp.cash_position || 0))
    })
    return values
  }, [allPortfolios, known])
}
