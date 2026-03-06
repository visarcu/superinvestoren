// src/hooks/usePortfolio.ts - Zentraler Portfolio-Hook
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getBulkQuotes } from '@/lib/fmp'
import { useCurrency } from '@/lib/CurrencyContext'
import { getEURRate, currencyManager, ExchangeRateError } from '@/lib/portfolioCurrency'
import { calculateXIRR, type Cashflow } from '@/utils/xirr'

// Types
export interface Portfolio {
  id: string
  name: string
  currency: string
  cash_position: number
  created_at: string
  is_default?: boolean
  broker_type?: string | null
  broker_name?: string | null
  broker_color?: string | null
}

export interface Holding {
  id: string
  symbol: string
  name: string
  quantity: number
  purchase_price: number
  purchase_price_display: number
  current_price: number
  current_price_display: number
  purchase_date: string
  value: number
  gain_loss: number
  gain_loss_percent: number
  purchase_currency?: string
}

export interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal'
  symbol: string
  name: string
  quantity: number
  price: number
  total_value: number
  date: string
  created_at: string
  notes?: string
}

export function usePortfolio() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currency, setCurrency, formatCurrency, formatStockPrice, formatPercentage } = useCurrency()

  const depotIdParam = searchParams.get('depot')
  const isAllDepotsView = depotIdParam === 'all'

  // Core State
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [allPortfolios, setAllPortfolios] = useState<Portfolio[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Premium State
  const [isPremium, setIsPremium] = useState(false)

  // Exchange Rate State
  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [exchangeRateError, setExchangeRateError] = useState<string | null>(null)
  const [priceLoadError, setPriceLoadError] = useState<string | null>(null)

  // Force EUR
  useEffect(() => {
    setCurrency('EUR')
  }, [])

  // Computed Values
  const cashPosition = useMemo(() => {
    if (isAllDepotsView) {
      return allPortfolios.reduce((sum, p) => sum + (p.cash_position || 0), 0)
    }
    return portfolio?.cash_position || 0
  }, [portfolio, allPortfolios, isAllDepotsView])

  const totalInvested = useMemo(() => {
    return holdings.reduce((sum, h) => sum + (h.purchase_price_display * h.quantity), 0)
  }, [holdings])

  const stockValue = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.value, 0)
  }, [holdings])

  const totalValue = useMemo(() => stockValue + cashPosition, [stockValue, cashPosition])

  const totalGainLoss = useMemo(() => stockValue - totalInvested, [stockValue, totalInvested])

  const totalGainLossPercent = useMemo(() => {
    return totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0
  }, [totalGainLoss, totalInvested])

  // XIRR Berechnung
  const xirrPercent = useMemo(() => {
    const cashflows: Cashflow[] = []

    holdings.forEach(h => {
      if (h.purchase_date && h.purchase_price_display > 0 && h.quantity > 0) {
        cashflows.push({
          amount: -(h.purchase_price_display * h.quantity),
          date: new Date(h.purchase_date)
        })
      }
    })

    if (stockValue > 0 && cashflows.length > 0) {
      cashflows.push({ amount: stockValue, date: new Date() })
    }

    cashflows.sort((a, b) => a.date.getTime() - b.date.getTime())
    if (cashflows.length < 2) return null

    const result = calculateXIRR(cashflows)
    return result !== null ? result * 100 : null
  }, [holdings, stockValue])

  // Load Exchange Rate
  const loadExchangeRate = useCallback(async () => {
    setExchangeRateError(null)
    try {
      const rate = await currencyManager.getCurrentUSDtoEURRate()
      setExchangeRate(rate)
    } catch (error) {
      if (error instanceof ExchangeRateError) {
        setExchangeRateError(error.message)
      } else {
        setExchangeRateError('Wechselkurs konnte nicht geladen werden')
      }
    }
  }, [])

  // Load Holdings for a portfolio
  const loadHoldingsForPortfolio = useCallback(async (portfolioId: string): Promise<Holding[]> => {
    const { data: holdingsData, error: holdingsError } = await supabase
      .from('portfolio_holdings')
      .select('*')
      .eq('portfolio_id', portfolioId)

    if (holdingsError) throw holdingsError
    if (!holdingsData || holdingsData.length === 0) return []

    const symbols = holdingsData.map(h => h.symbol)
    let currentPricesUSD: Record<string, number> = {}

    try {
      currentPricesUSD = await getBulkQuotes(symbols)
      const missingPrices = symbols.filter(s => !currentPricesUSD[s] || currentPricesUSD[s] <= 0)
      if (missingPrices.length > 0) {
        setPriceLoadError(`Kurse nicht verfügbar für: ${missingPrices.join(', ')}`)
      } else {
        setPriceLoadError(null)
      }
    } catch {
      setPriceLoadError('Aktienkurse konnten nicht geladen werden.')
      return []
    }

    const holdingsWithPrices = holdingsData.map(h => ({
      ...h,
      current_price: currentPricesUSD[h.symbol] || 0
    }))

    const converted = await currencyManager.convertHoldingsForDisplay(
      holdingsWithPrices,
      currency as 'USD' | 'EUR',
      true
    )

    return converted.map((h: any) => {
      const currentPrice = h.current_price_display || 0
      const purchasePrice = h.purchase_price_display || 0
      const quantity = h.quantity || 0
      const value = currentPrice * quantity
      const costBasis = purchasePrice * quantity
      const gainLoss = value - costBasis
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

      return {
        ...h,
        value,
        gain_loss: gainLoss,
        gain_loss_percent: gainLossPercent
      }
    })
  }, [currency])

  // Load Transactions
  const loadTransactions = useCallback(async (portfolioId: string) => {
    if (portfolioId === 'all') return

    const { data, error: txError } = await supabase
      .from('portfolio_transactions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('date', { ascending: false })

    if (!txError && data) {
      setTransactions(data)
    }
  }, [])

  // Main Load Function
  const loadPortfolio = useCallback(async (depotId?: string | null) => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Premium Status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', user.id)
        .single()
      setIsPremium(profile?.is_premium || false)

      // All Portfolios
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      setAllPortfolios(portfolios || [])

      // "All Depots" view
      if (depotId === 'all' && portfolios && portfolios.length > 0) {
        setPortfolio({
          id: 'all',
          name: 'Alle Depots',
          currency: 'EUR',
          cash_position: portfolios.reduce((sum, p) => sum + (p.cash_position || 0), 0),
          created_at: new Date().toISOString()
        })

        const allHoldings: Holding[] = []
        for (const p of portfolios) {
          const h = await loadHoldingsForPortfolio(p.id)
          allHoldings.push(...h)
        }
        setHoldings(allHoldings)
        setLoading(false)
        return
      }

      // Specific or default portfolio
      let portfolioData = depotId && depotId !== 'all'
        ? portfolios?.find(p => p.id === depotId)
        : portfolios?.[0]

      if (!portfolioData) {
        const { data: newPortfolio, error: createError } = await supabase
          .from('portfolios')
          .insert({
            user_id: user.id,
            name: 'Mein Portfolio',
            currency: 'EUR',
            cash_position: 0,
            is_default: true,
            broker_type: 'manual'
          })
          .select()
          .single()
        if (createError) throw createError
        portfolioData = newPortfolio
        setAllPortfolios([newPortfolio])
      }

      setPortfolio(portfolioData!)

      // Load holdings and transactions in parallel
      const [h] = await Promise.all([
        loadHoldingsForPortfolio(portfolioData!.id),
        loadTransactions(portfolioData!.id)
      ])
      setHoldings(h)

    } catch (error: any) {
      console.error('Error loading portfolio:', error)
      setError(error.message || 'Fehler beim Laden des Portfolios')
    } finally {
      setLoading(false)
    }
  }, [router, loadHoldingsForPortfolio, loadTransactions])

  // Initial load
  useEffect(() => {
    loadPortfolio(depotIdParam)
    setTimeout(() => loadExchangeRate(), 500)
  }, [depotIdParam])

  // Refresh
  const refresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      loadPortfolio(depotIdParam),
      loadExchangeRate()
    ])
    setRefreshing(false)
  }, [loadPortfolio, depotIdParam, loadExchangeRate])

  // Mutations
  const addPosition = useCallback(async (params: {
    stock: { symbol: string; name: string }
    quantity: number
    purchasePrice: number
    purchaseDate: string
    fees?: number
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const { stock, quantity, purchasePrice, purchaseDate, fees = 0 } = params
    const priceWithFees = purchasePrice + (fees / quantity)

    const { error } = await supabase
      .from('portfolio_holdings')
      .insert({
        portfolio_id: portfolio.id,
        symbol: stock.symbol,
        name: stock.name,
        quantity,
        purchase_price: priceWithFees,
        purchase_date: purchaseDate,
        purchase_currency: 'EUR'
      })
    if (error) throw error

    // Transaction logging
    await supabase
      .from('portfolio_transactions')
      .insert({
        portfolio_id: portfolio.id,
        type: 'buy',
        symbol: stock.symbol,
        name: stock.name,
        quantity,
        price: priceWithFees,
        total_value: quantity * purchasePrice + fees,
        date: purchaseDate,
        notes: fees > 0 ? `Kaufpreis: ${purchasePrice.toFixed(2)}€, Gebühren: ${fees.toFixed(2)}€` : null
      })

    await loadPortfolio(depotIdParam)
  }, [portfolio, loadPortfolio, depotIdParam])

  const addCash = useCallback(async (amount: number) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const newCash = (portfolio.cash_position || 0) + amount
    const { error } = await supabase
      .from('portfolios')
      .update({ cash_position: newCash })
      .eq('id', portfolio.id)
    if (error) throw error

    await supabase
      .from('portfolio_transactions')
      .insert({
        portfolio_id: portfolio.id,
        type: amount > 0 ? 'cash_deposit' : 'cash_withdrawal',
        symbol: 'CASH',
        name: amount > 0 ? 'Einzahlung' : 'Auszahlung',
        quantity: 1,
        price: Math.abs(amount),
        total_value: Math.abs(amount),
        date: new Date().toISOString().split('T')[0]
      })

    await loadPortfolio(depotIdParam)
  }, [portfolio, loadPortfolio, depotIdParam])

  const updatePosition = useCallback(async (holdingId: string, updates: {
    quantity?: number
    purchase_price?: number
    purchase_date?: string
  }) => {
    const { error } = await supabase
      .from('portfolio_holdings')
      .update({ ...updates, purchase_currency: 'EUR' })
      .eq('id', holdingId)
    if (error) throw error
    await loadPortfolio(depotIdParam)
  }, [loadPortfolio, depotIdParam])

  const deletePosition = useCallback(async (holdingId: string) => {
    const { error } = await supabase
      .from('portfolio_holdings')
      .delete()
      .eq('id', holdingId)
    if (error) throw error
    await loadPortfolio(depotIdParam)
  }, [loadPortfolio, depotIdParam])

  const topUpPosition = useCallback(async (holding: Holding, params: {
    quantity: number
    price: number
    date: string
    fees?: number
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const { quantity: newQty, price: newPrice, date: topUpDate, fees = 0 } = params
    const priceWithFees = newPrice + (fees / newQty)
    const oldQty = holding.quantity
    const oldPrice = holding.purchase_price
    const totalQty = oldQty + newQty
    const weightedAvgPrice = ((oldQty * oldPrice) + (newQty * priceWithFees)) / totalQty

    const { error } = await supabase
      .from('portfolio_holdings')
      .update({
        quantity: totalQty,
        purchase_price: weightedAvgPrice,
        purchase_date: holding.purchase_date < topUpDate ? holding.purchase_date : topUpDate
      })
      .eq('id', holding.id)
    if (error) throw error

    await supabase
      .from('portfolio_transactions')
      .insert({
        portfolio_id: portfolio.id,
        type: 'buy',
        symbol: holding.symbol,
        name: holding.name,
        quantity: newQty,
        price: priceWithFees,
        total_value: newQty * newPrice + fees,
        date: topUpDate,
        notes: fees > 0 ? `Aufstockung - Gebühren: ${fees.toFixed(2)}€` : 'Aufstockung'
      })

    await loadPortfolio(depotIdParam)
  }, [portfolio, loadPortfolio, depotIdParam])

  const updateCashPosition = useCallback(async (newAmount: number) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const difference = newAmount - (portfolio.cash_position || 0)

    const { error } = await supabase
      .from('portfolios')
      .update({ cash_position: newAmount })
      .eq('id', portfolio.id)
    if (error) throw error

    if (difference !== 0) {
      await supabase
        .from('portfolio_transactions')
        .insert({
          portfolio_id: portfolio.id,
          type: difference > 0 ? 'cash_deposit' : 'cash_withdrawal',
          symbol: 'CASH',
          name: difference > 0 ? 'Einzahlung' : 'Auszahlung',
          quantity: 1,
          price: Math.abs(difference),
          total_value: Math.abs(difference),
          date: new Date().toISOString().split('T')[0]
        })
    }

    await loadPortfolio(depotIdParam)
  }, [portfolio, loadPortfolio, depotIdParam])

  const updatePortfolioName = useCallback(async (name: string) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const { error } = await supabase
      .from('portfolios')
      .update({ name: name.trim() })
      .eq('id', portfolio.id)
    if (error) throw error

    setPortfolio(prev => prev ? { ...prev, name: name.trim() } : null)
  }, [portfolio])

  const exportToCSV = useCallback(() => {
    const headers = ['Symbol', 'Name', 'Anzahl', 'Kaufpreis', 'Aktueller Preis', 'Wert', 'G/V', 'G/V %']
    const rows = holdings.map(h => [
      h.symbol, h.name, h.quantity,
      h.purchase_price_display, h.current_price_display,
      h.value, h.gain_loss, h.gain_loss_percent
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `portfolio_${portfolio?.name}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }, [holdings, portfolio])

  return {
    // Data
    portfolio,
    allPortfolios,
    holdings,
    transactions,
    isPremium,
    isAllDepotsView,
    depotIdParam,

    // Computed
    totalValue,
    totalInvested,
    stockValue,
    cashPosition,
    totalGainLoss,
    totalGainLossPercent,
    xirrPercent,
    activeInvestments: holdings.length,

    // State
    loading,
    refreshing,
    error,
    exchangeRate,
    exchangeRateError,
    priceLoadError,

    // Currency
    formatCurrency,
    formatStockPrice,
    formatPercentage,

    // Actions
    refresh,
    loadPortfolio,
    loadExchangeRate,
    addPosition,
    addCash,
    updatePosition,
    deletePosition,
    topUpPosition,
    updateCashPosition,
    updatePortfolioName,
    exportToCSV,
  }
}
