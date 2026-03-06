// src/components/chart-builder/useChartBuilderData.ts
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { ChartBuilderState, ChartBuilderAction, StockFinancialData, Granularity } from './types'

const PRICE_PERIODS: Record<string, number> = {
  '1Y': 365,
  '3Y': 1095,
  '5Y': 1825,
  '10Y': 3650,
  'MAX': 7300,
}

function getYearsForRange(timeRange: string): number {
  const map: Record<string, number> = { '1Y': 2, '3Y': 4, '5Y': 6, '10Y': 11, 'MAX': 20 }
  return map[timeRange] || 5
}

function getPeriodParam(granularity: Granularity): string {
  return granularity === 'annual' ? 'annual' : 'quarterly'
}

export function useChartBuilderData(
  state: ChartBuilderState,
  dispatch: React.Dispatch<ChartBuilderAction>
) {
  const fetchingRef = useRef<Set<string>>(new Set())

  // Fetch price data separately and merge into existing cache
  const fetchPriceData = useCallback(async (ticker: string) => {
    const priceCacheKey = `${ticker}_price`
    if (fetchingRef.current.has(priceCacheKey)) return
    fetchingRef.current.add(priceCacheKey)

    try {
      const priceData = await fetch(`/api/historical/${ticker}`).then(r => r.json())
      if (!priceData?.historical) return

      const days = PRICE_PERIODS[state.timeRange] || 1825
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const historicalPrices = priceData.historical
        .filter((d: any) => new Date(d.date) >= cutoffDate)
        .map((d: any) => ({ date: d.date, close: d.close }))
        .reverse()

      // Merge price data into existing cache
      const cached = state.dataCache[ticker]
      if (cached) {
        const updatedData: StockFinancialData = {
          ...cached,
          historicalPrices,
        }
        dispatch({ type: 'CACHE_DATA', ticker, data: updatedData })
      }
    } catch (error) {
      console.error(`Failed to fetch price data for ${ticker}:`, error)
    } finally {
      fetchingRef.current.delete(priceCacheKey)
    }
  }, [state.timeRange, state.dataCache, dispatch])

  const fetchStockData = useCallback(async (ticker: string) => {
    const cacheKey = `${ticker}_${state.granularity}_${state.timeRange}`

    // Check if already fetching or cached
    if (fetchingRef.current.has(cacheKey)) return
    const cached = state.dataCache[ticker]
    const years = getYearsForRange(state.timeRange)
    if (cached && cached.granularity === state.granularity && cached.yearsLoaded >= years && Date.now() - cached.fetchedAt < 30 * 60 * 1000) {
      return
    }

    fetchingRef.current.add(cacheKey)
    dispatch({ type: 'SET_LOADING', loading: true })

    try {
      const period = getPeriodParam(state.granularity)

      // Check if we need price data
      const needsPrice = state.activeMetrics.some(
        m => m.stockTicker === ticker && m.metricKey === 'stockPrice'
      )

      // Fetch financial data and optionally price data in parallel
      const fetches: Promise<any>[] = [
        fetch(`/api/financial-data/${ticker}?years=${years}&period=${period}`).then(r => r.json()),
      ]

      if (needsPrice) {
        fetches.push(
          fetch(`/api/historical/${ticker}`).then(r => r.json())
        )
      }

      const results = await Promise.all(fetches)
      const financialData = results[0]
      const priceData = results[1]

      // Process price data
      let historicalPrices: { date: string; close: number }[] | undefined
      if (priceData?.historical) {
        const days = PRICE_PERIODS[state.timeRange] || 1825
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        historicalPrices = priceData.historical
          .filter((d: any) => new Date(d.date) >= cutoffDate)
          .map((d: any) => ({ date: d.date, close: d.close }))
          .reverse()
      }

      const stockData: StockFinancialData = {
        ticker,
        name: state.stockNames[ticker] || ticker,
        incomeStatements: financialData.incomeStatements || [],
        keyMetrics: financialData.keyMetrics || [],
        cashFlows: financialData.cashFlows || [],
        balanceSheets: financialData.balanceSheets || [],
        historicalPrices,
        fetchedAt: Date.now(),
        granularity: state.granularity,
        yearsLoaded: years,
      }

      dispatch({ type: 'CACHE_DATA', ticker, data: stockData })
    } catch (error) {
      console.error(`Failed to fetch data for ${ticker}:`, error)
    } finally {
      fetchingRef.current.delete(cacheKey)
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [state.granularity, state.timeRange, state.activeMetrics, state.dataCache, state.stockNames, dispatch])

  // Fetch data for all stocks that need it
  const fetchAllData = useCallback(async () => {
    const years = getYearsForRange(state.timeRange)
    const tickersToFetch = state.stocks.filter(ticker => {
      const cached = state.dataCache[ticker]
      if (!cached) return true
      if (cached.granularity !== state.granularity) return true
      if (cached.yearsLoaded < years) return true
      if (Date.now() - cached.fetchedAt > 30 * 60 * 1000) return true
      return false
    })

    if (tickersToFetch.length === 0) return

    dispatch({ type: 'SET_LOADING', loading: true })

    try {
      await Promise.all(tickersToFetch.map(fetchStockData))
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [state.stocks, state.dataCache, state.granularity, state.timeRange, fetchStockData, dispatch])

  // Auto-fetch when stocks, granularity, or time range changes
  useEffect(() => {
    if (state.stocks.length === 0) return
    fetchAllData()
  }, [state.stocks.length, state.granularity, state.timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch price data when a price metric is added but cache doesn't have prices
  useEffect(() => {
    const priceMetrics = state.activeMetrics.filter(m => m.metricKey === 'stockPrice')
    for (const metric of priceMetrics) {
      const cached = state.dataCache[metric.stockTicker]
      if (cached && !cached.historicalPrices) {
        fetchPriceData(metric.stockTicker)
      }
    }
  }, [state.activeMetrics]) // eslint-disable-line react-hooks/exhaustive-deps

  return { fetchAllData, fetchStockData }
}
