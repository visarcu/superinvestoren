'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Holding, Portfolio } from '@/hooks/usePortfolio'
import { valuateHoldingsByPortfolio, type ValuationHolding } from '@/lib/portfolioValuation'

// Wert pro Depot (Wertpapiere live bewertet + Cash) — für Depot-Switcher-Übersichten.
// Im "Alle Depots"-Modus reichen die geladenen Holdings (haben portfolio_id).
// Im Single-Depot-Modus werden die Holdings der ANDEREN Depots separat geladen.
export function useDepotValues({
  holdings,
  allPortfolios,
  portfolioId,
  isAllDepotsView,
}: {
  holdings: Holding[]
  allPortfolios: Portfolio[]
  portfolioId?: string
  isAllDepotsView: boolean
}): Map<string, number> {
  const [allDepotHoldings, setAllDepotHoldings] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    let cancelled = false
    async function loadAllDepotValues() {
      // Wenn nur ein Depot existiert, oder bereits "Alle Depots" → nichts zu tun
      if (allPortfolios.length <= 1 || isAllDepotsView) {
        setAllDepotHoldings(new Map())
        return
      }
      try {
        const { supabase } = await import('@/lib/supabaseClient')
        const otherIds = allPortfolios
          .filter(dp => dp.id !== portfolioId)
          .map(dp => dp.id)
        if (otherIds.length === 0) return

        const { data } = await supabase
          .from('portfolio_holdings')
          .select('portfolio_id, symbol, current_price, purchase_price, quantity')
          .in('portfolio_id', otherIds)

        if (cancelled || !data) return

        const valuation = await valuateHoldingsByPortfolio(data as ValuationHolding[])
        if (cancelled) return

        const map = new Map<string, number>()
        for (const [pid, v] of valuation) {
          map.set(pid, v.value)
        }
        setAllDepotHoldings(map)
      } catch (err) {
        console.error('Error loading depot values:', err)
      }
    }
    loadAllDepotValues()
    return () => { cancelled = true }
  }, [allPortfolios, portfolioId, isAllDepotsView])

  return useMemo(() => {
    const values = new Map<string, number>()
    // Aktuell geladenes Portfolio
    holdings.forEach(h => {
      if (h.portfolio_id) {
        values.set(h.portfolio_id, (values.get(h.portfolio_id) || 0) + h.value)
      } else if (portfolioId) {
        // Single-Depot-Modus: holdings haben kein portfolio_id Feld → dem aktuellen Depot zuordnen
        values.set(portfolioId, (values.get(portfolioId) || 0) + h.value)
      }
    })
    // Andere Depots (separat geladen)
    allDepotHoldings.forEach((value, pid) => {
      if (!values.has(pid)) {
        values.set(pid, value)
      }
    })
    // Cash dazu
    allPortfolios.forEach(dp => {
      const stockValue = values.get(dp.id) || 0
      values.set(dp.id, stockValue + (dp.cash_position || 0))
    })
    return values
  }, [holdings, allPortfolios, portfolioId, allDepotHoldings])
}
