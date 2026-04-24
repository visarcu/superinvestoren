// src/hooks/usePortfolio.ts - Zentraler Portfolio-Hook
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getBulkQuotes, detectTickerCurrency } from '@/lib/fmp'
import { useCurrency } from '@/lib/CurrencyContext'
import { getEURRate, currencyManager, ExchangeRateError } from '@/lib/portfolioCurrency'
import { calculateXIRR, type Cashflow } from '@/utils/xirr'

// Types
export interface Portfolio {
  id: string
  name: string
  currency: string
  cash_position: number
  broker_credit: number  // Wertpapierkredit — manuell eingetragen, nicht aus Transaktionen
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
  isin?: string
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
  // FX-Split: Kurs-Performance vs Währungs-Effekt separat (optional — benötigt
  // purchase_fx_rate in der DB und aktuelle FX-Rate). Null wenn nicht berechenbar
  // (z.B. EUR-Kauf oder Kaufrate nicht gespeichert).
  pl_excl_fx?: number | null
  pl_from_fx?: number | null
  // Investment-Case (User-Notiz zur Anlagestrategie, optional)
  investment_case?: string | null
  investment_case_updated_at?: string | null
  // Portfolio-Info (gesetzt in "Alle Depots" Ansicht)
  portfolio_id?: string
  portfolio_name?: string
  broker_type?: string | null
  broker_name?: string | null
  broker_color?: string | null
}

export interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal' | 'transfer_in' | 'transfer_out'
  symbol: string
  name: string
  quantity: number
  price: number
  total_value: number
  fee?: number
  date: string
  created_at: string
  notes?: string
  // Portfolio-Info (gesetzt in "Alle Depots" Ansicht)
  portfolio_id?: string
  portfolio_name?: string
  broker_type?: string | null
  broker_name?: string | null
  broker_color?: string | null
}

// Realisierte Gewinne & Dividenden aus Transaktionshistorie berechnen
// Verwendet die Durchschnittskostenmethode (Average Cost Method)
export interface RealizedGainInfo {
  realizedGain: number
  avgCostBasis: number
  realizedGainPercent: number
}

function calculateRealizedGains(transactions: Transaction[]): {
  totalRealizedGain: number
  totalDividends: number
  realizedGainByTxId: Map<string, RealizedGainInfo>
} {
  if (transactions.length === 0) {
    return { totalRealizedGain: 0, totalDividends: 0, realizedGainByTxId: new Map() }
  }

  // Chronologisch sortieren (älteste zuerst)
  // Bei gleichem Datum: Buys vor Sells (sonst werden Intraday-Trades falsch abgerechnet)
  const typePriority: Record<string, number> = {
    transfer_in: 0, buy: 1, dividend: 2, sell: 3, transfer_out: 4,
    cash_deposit: 5, cash_withdrawal: 6,
  }
  const sorted = [...transactions].sort((a, b) => {
    const dateCmp = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateCmp !== 0) return dateCmp
    return (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99)
  })

  // Kostenbasis pro Symbol tracken
  const positions = new Map<string, { totalShares: number; totalCost: number }>()
  let totalRealizedGain = 0
  let totalDividends = 0
  const realizedGainByTxId = new Map<string, RealizedGainInfo>()

  for (const tx of sorted) {
    if (tx.type === 'buy') {
      const pos = positions.get(tx.symbol) || { totalShares: 0, totalCost: 0 }
      pos.totalShares += tx.quantity
      pos.totalCost += tx.quantity * tx.price
      positions.set(tx.symbol, pos)
    } else if (tx.type === 'sell') {
      const pos = positions.get(tx.symbol)
      if (!pos || pos.totalShares <= 0) continue

      const avgCostPerShare = pos.totalCost / pos.totalShares
      const realizedGain = (tx.price - avgCostPerShare) * tx.quantity
      const realizedGainPercent = avgCostPerShare > 0
        ? ((tx.price - avgCostPerShare) / avgCostPerShare) * 100
        : 0

      totalRealizedGain += realizedGain
      realizedGainByTxId.set(tx.id, {
        realizedGain,
        avgCostBasis: avgCostPerShare,
        realizedGainPercent,
      })

      // Kostenbasis reduzieren (Average Cost Method)
      pos.totalShares -= tx.quantity
      pos.totalCost -= tx.quantity * avgCostPerShare
      // Floating-Point Guard
      if (pos.totalShares <= 0.0001) {
        pos.totalShares = 0
        pos.totalCost = 0
      }
      positions.set(tx.symbol, pos)
    } else if (tx.type === 'dividend') {
      totalDividends += tx.total_value
    }
  }

  return { totalRealizedGain, totalDividends, realizedGainByTxId }
}

// Historische Performance pro (symbol, portfolio_id) aggregieren.
// Wird in der "Alle Depots"-Ansicht genutzt: ermöglicht Ghost-Rows für Depots,
// die eine Position mal hatten (Dividenden, realisierter Gewinn) aber aktuell
// 0 Shares halten — analog zu Parqet.
export interface DepotHistoricalPerf {
  symbol: string
  portfolioId: string
  portfolioName: string
  brokerType?: string | null
  brokerName?: string | null
  brokerColor?: string | null
  totalDividends: number
  totalRealized: number
}

export function calculateHistoricalPerfByDepot(
  allTransactions: Transaction[],
): Map<string, DepotHistoricalPerf> {
  const result = new Map<string, DepotHistoricalPerf>()

  // Pro portfolio_id die Realized Gains berechnen — jedes Depot als isolierter Track
  const byPortfolio = new Map<string, Transaction[]>()
  for (const tx of allTransactions) {
    if (!tx.portfolio_id) continue
    if (!byPortfolio.has(tx.portfolio_id)) byPortfolio.set(tx.portfolio_id, [])
    byPortfolio.get(tx.portfolio_id)!.push(tx)
  }

  for (const [portfolioId, txs] of byPortfolio) {
    // Für dieses Depot die Realized-Gains-Simulation laufen lassen (pro Symbol)
    const sorted = [...txs].sort((a, b) => {
      const dateCmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateCmp !== 0) return dateCmp
      const typePriority: Record<string, number> = {
        transfer_in: 0, buy: 1, dividend: 2, sell: 3, transfer_out: 4,
      }
      return (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99)
    })

    // Positions-Tracker pro Symbol in diesem Depot
    const positions = new Map<string, { shares: number; cost: number }>()
    // Ergebnis pro Symbol in diesem Depot
    const perSymbol = new Map<string, { dividends: number; realized: number }>()
    // Portfolio-Meta aus erster Transaktion ziehen
    const firstTx = txs[0]
    const meta = {
      portfolioName: firstTx.portfolio_name || 'Unbekanntes Depot',
      brokerType: firstTx.broker_type,
      brokerName: firstTx.broker_name,
      brokerColor: firstTx.broker_color,
    }

    for (const tx of sorted) {
      const sym = tx.symbol
      if (!sym || sym === 'CASH') continue
      if (!perSymbol.has(sym)) perSymbol.set(sym, { dividends: 0, realized: 0 })
      const agg = perSymbol.get(sym)!

      if (tx.type === 'buy' || tx.type === 'transfer_in') {
        const pos = positions.get(sym) || { shares: 0, cost: 0 }
        pos.shares += tx.quantity
        pos.cost += tx.quantity * tx.price
        positions.set(sym, pos)
      } else if (tx.type === 'sell') {
        const pos = positions.get(sym)
        if (pos && pos.shares > 0) {
          const avgCost = pos.cost / pos.shares
          const sellQty = Math.min(tx.quantity, pos.shares)
          agg.realized += (tx.price - avgCost) * sellQty
          pos.cost -= sellQty * avgCost
          pos.shares -= sellQty
          if (pos.shares <= 0.0001) { pos.shares = 0; pos.cost = 0 }
          positions.set(sym, pos)
        }
      } else if (tx.type === 'transfer_out') {
        // Kein realized gain — Kostenbasis wandert mit
        const pos = positions.get(sym)
        if (pos && pos.shares > 0) {
          const avgCost = pos.cost / pos.shares
          const qty = Math.min(tx.quantity, pos.shares)
          pos.cost -= qty * avgCost
          pos.shares -= qty
          if (pos.shares <= 0.0001) { pos.shares = 0; pos.cost = 0 }
          positions.set(sym, pos)
        }
      } else if (tx.type === 'dividend') {
        agg.dividends += tx.total_value
      }
    }

    // Fülle das Ergebnis-Map
    for (const [symbol, agg] of perSymbol) {
      if (agg.dividends === 0 && agg.realized === 0) continue // nichts zu zeigen
      result.set(`${symbol}|${portfolioId}`, {
        symbol,
        portfolioId,
        portfolioName: meta.portfolioName,
        brokerType: meta.brokerType,
        brokerName: meta.brokerName,
        brokerColor: meta.brokerColor,
        totalDividends: agg.dividends,
        totalRealized: agg.realized,
      })
    }
  }

  return result
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

  // Realisierte Gewinne + Dividenden aus Transaktionshistorie
  const { totalRealizedGain, totalDividends, realizedGainByTxId } = useMemo(
    () => calculateRealizedGains(transactions),
    [transactions]
  )

  // Historische Performance pro (symbol, portfolio_id) — für Ghost-Rows in der
  // "Alle Depots"-Ansicht (Position wurde transferiert, aber Depot X hat noch
  // historische Dividenden/Realized dort erzielt). Nur sinnvoll mit Portfolio-Info.
  const historicalPerfByDepot = useMemo(
    () => isAllDepotsView ? calculateHistoricalPerfByDepot(transactions) : new Map(),
    [transactions, isAllDepotsView]
  )

  // Gesamt-Ordergebühren
  const totalFees = useMemo(
    () => transactions.reduce((sum, tx) => sum + (Number(tx.fee) || 0), 0),
    [transactions]
  )

  // Gesamtrendite = Unrealisiert + Realisiert + Dividenden - Gebühren
  const totalReturn = useMemo(
    () => totalGainLoss + totalRealizedGain + totalDividends - totalFees,
    [totalGainLoss, totalRealizedGain, totalDividends, totalFees]
  )

  const totalReturnPercent = useMemo(() => {
    const invested = totalInvested + totalFees // Gebühren erhöhen die Investitionskosten
    return invested > 0 ? (totalReturn / invested) * 100 : 0
  }, [totalReturn, totalInvested, totalFees])

  // XIRR Berechnung — korrekt mit allen Transaktionen
  const xirrPercent = useMemo(() => {
    const cashflows: Cashflow[] = []

    if (transactions.length > 0) {
      // Alle Buy/Sell/Dividend-Transaktionen als Cashflows.
      // Depotüberträge (transfer_in/out) werden als fiktive Käufe/Verkäufe zur
      // damaligen Kostenbasis eingerechnet — sonst fehlt der Anfangskapital-Fluss
      // und XIRR explodiert (Beispiel ING: zeigte +1000% p.a. statt realistischer
      // ~12%, weil 147 VGWL-Shares ohne Cashflow materialisiert wurden).
      // Genauso wie Parqet das macht.
      transactions.forEach(tx => {
        if (!tx.date) return
        const txDate = new Date(tx.date)

        if (tx.type === 'buy') {
          cashflows.push({ amount: -(tx.total_value), date: txDate })
        } else if (tx.type === 'sell') {
          cashflows.push({ amount: tx.total_value, date: txDate })
        } else if (tx.type === 'dividend') {
          cashflows.push({ amount: tx.total_value, date: txDate })
        } else if (tx.type === 'transfer_in') {
          // Fiktiver Kauf zur Kostenbasis am Transfer-Datum
          const amount = tx.total_value > 0 ? tx.total_value : tx.price * tx.quantity
          if (amount > 0) cashflows.push({ amount: -amount, date: txDate })
        } else if (tx.type === 'transfer_out') {
          // Fiktiver Verkauf zum Transfer-Kurs am Transfer-Datum
          const amount = tx.total_value > 0 ? tx.total_value : tx.price * tx.quantity
          if (amount > 0) cashflows.push({ amount, date: txDate })
        }
        // cash_deposit/cash_withdrawal ignorieren (externe Geldbewegungen)
      })

      // Terminal: aktueller Aktienwert
      if (stockValue > 0) {
        cashflows.push({ amount: stockValue, date: new Date() })
      }
    } else if (holdings.length > 0) {
      // Fallback für Legacy-Daten ohne Transaktionen
      holdings.forEach(h => {
        if (h.purchase_date && h.purchase_price_display > 0 && h.quantity > 0) {
          cashflows.push({
            amount: -(h.purchase_price_display * h.quantity),
            date: new Date(h.purchase_date)
          })
        }
      })
      if (stockValue > 0) {
        cashflows.push({ amount: stockValue, date: new Date() })
      }
    }

    cashflows.sort((a, b) => a.date.getTime() - b.date.getTime())
    if (cashflows.length < 2) return null

    const result = calculateXIRR(cashflows)
    return result !== null ? result * 100 : null
  }, [transactions, holdings, stockValue])

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
    let currentPrices: Record<string, number> = {}

    try {
      currentPrices = await getBulkQuotes(symbols)
      const missingPrices = symbols.filter(s => !currentPrices[s] || currentPrices[s] <= 0)
      if (missingPrices.length > 0) {
        setPriceLoadError(`Kurse nicht verfügbar für: ${missingPrices.join(', ')}`)
      } else {
        setPriceLoadError(null)
      }
    } catch {
      setPriceLoadError('Aktienkurse konnten nicht geladen werden.')
      return []
    }

    // Wechselkurse laden für nicht-EUR Aktien
    let usdToEurRate: number | null = null
    let gbpToEurRate: number | null = null
    const currencies = new Set(symbols.map(s => detectTickerCurrency(s)))

    if (currencies.has('USD')) {
      try {
        usdToEurRate = await currencyManager.getCurrentUSDtoEURRate()
      } catch {
        // Fallback: ohne Konvertierung
      }
    }

    if (currencies.has('GBP')) {
      try {
        const response = await fetch('/api/exchange-rate?from=GBP&to=EUR')
        if (response.ok) {
          const data = await response.json()
          if (data.rate && !isNaN(data.rate) && data.rate > 0) {
            gbpToEurRate = data.rate
          }
        }
      } catch {
        // Fallback: ohne Konvertierung
      }
    }

    return holdingsData.map((h: any) => {
      const apiPrice = currentPrices[h.symbol] || 0
      const tickerCurrency = detectTickerCurrency(h.symbol)

      // EUR-Aktien (z.B. .DE, .PA): API liefert bereits EUR → keine Konvertierung
      // USD-Aktien: API liefert USD → muss in EUR konvertiert werden
      // GBP-Aktien (.L): FMP liefert in GBX (Pence) → ÷100 für GBP → ×Rate für EUR
      let currentPriceEUR: number
      if (tickerCurrency === 'EUR') {
        currentPriceEUR = apiPrice
      } else if (tickerCurrency === 'GBP' && gbpToEurRate) {
        // .L Ticker: FMP liefert GBX (Pence), nicht GBP!
        // 1 GBP = 100 GBX → erst durch 100 teilen, dann in EUR konvertieren
        currentPriceEUR = (apiPrice / 100) * gbpToEurRate
      } else if (tickerCurrency === 'USD' && usdToEurRate) {
        currentPriceEUR = apiPrice * usdToEurRate
      } else {
        // Fallback: Preis unkonvertiert verwenden
        currentPriceEUR = apiPrice
      }

      const purchasePrice = h.purchase_price || 0
      const quantity = h.quantity || 0
      const value = currentPriceEUR * quantity
      const costBasis = purchasePrice * quantity
      const gainLoss = value - costBasis
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0

      // FX-Split: nur berechenbar für Nicht-EUR-Positionen mit gespeicherter fx_rate
      let plExclFx: number | null = null
      let plFromFx: number | null = null
      const purchaseFxRate = (h as any).purchase_fx_rate
        ? Number((h as any).purchase_fx_rate)
        : null
      if (
        purchaseFxRate &&
        purchaseFxRate > 0 &&
        tickerCurrency !== 'EUR' &&
        quantity > 0 &&
        apiPrice > 0
      ) {
        // Aktuelle FX-Rate (EUR pro Einheit Quote-Währung)
        const currentFxRate =
          tickerCurrency === 'USD' ? usdToEurRate : tickerCurrency === 'GBP' ? gbpToEurRate : null
        if (currentFxRate && currentFxRate > 0) {
          // Original Kaufpreis in Quote-Währung rekonstruieren:
          // purchase_price (EUR) = purchasePriceOrig × purchaseFxRate
          //   → purchasePriceOrig = purchase_price / purchaseFxRate
          const purchasePriceOrig = purchasePrice / purchaseFxRate
          // Bei GBP-Aktien (.L) kommt der Kurs in GBX (Pence) aus der API.
          // Wir rechnen in GBP für die Split-Berechnung.
          const effectiveApiPrice = tickerCurrency === 'GBP' ? apiPrice / 100 : apiPrice

          // P/L excl. FX: Kursperformance bewertet zum Kauf-FX
          plExclFx = (effectiveApiPrice - purchasePriceOrig) * quantity * purchaseFxRate
          // P/L from FX: Währungs-Effekt auf der aktuellen Position
          plFromFx = effectiveApiPrice * quantity * (currentFxRate - purchaseFxRate)
        }
      }

      return {
        ...h,
        current_price: apiPrice,
        current_price_display: currentPriceEUR,
        purchase_price_display: purchasePrice,
        value,
        gain_loss: gainLoss,
        gain_loss_percent: gainLossPercent,
        pl_excl_fx: plExclFx,
        pl_from_fx: plFromFx,
      }
    })
  }, [currency])

  // Load Transactions
  const loadTransactions = useCallback(async (portfolioId: string, allPortfolioIds?: string[], portfolios?: Portfolio[]) => {
    if (portfolioId === 'all' && allPortfolioIds && allPortfolioIds.length > 0) {
      // Alle Depots: Transaktionen für jedes Portfolio laden + Portfolio-Info anhängen
      const allTx: Transaction[] = []
      for (const pid of allPortfolioIds) {
        const { data } = await supabase
          .from('portfolio_transactions')
          .select('*')
          .eq('portfolio_id', pid)
          .order('date', { ascending: false })
        if (data) {
          const pInfo = portfolios?.find(p => p.id === pid)
          const enriched = data.map(tx => ({
            ...tx,
            portfolio_id: pid,
            portfolio_name: pInfo?.name || 'Depot',
            broker_type: pInfo?.broker_type,
            broker_name: pInfo?.broker_name,
            broker_color: pInfo?.broker_color,
          }))
          allTx.push(...enriched)
        }
      }
      allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setTransactions(allTx)
      return
    }

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
          broker_credit: portfolios.reduce((sum, p) => sum + (p.broker_credit || 0), 0),
          created_at: new Date().toISOString()
        })

        const allHoldings: Holding[] = []
        for (const pf of portfolios) {
          const h = await loadHoldingsForPortfolio(pf.id)
          // Portfolio-Info an jede Holding anhängen
          const enriched = h.map(holding => ({
            ...holding,
            portfolio_id: pf.id,
            portfolio_name: pf.name,
            broker_type: pf.broker_type,
            broker_name: pf.broker_name,
            broker_color: pf.broker_color,
          }))
          allHoldings.push(...enriched)
        }
        setHoldings(allHoldings)
        // Transaktionen für alle Depots laden
        await loadTransactions('all', portfolios.map(pf => pf.id), portfolios)
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
    investmentCase?: string | null
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const { stock, quantity, purchasePrice, purchaseDate, fees = 0, investmentCase } = params
    const priceWithFees = purchasePrice + (fees / quantity)

    const trimmedCase = investmentCase?.trim().slice(0, 1000) || null
    const { error } = await supabase
      .from('portfolio_holdings')
      .insert({
        portfolio_id: portfolio.id,
        symbol: stock.symbol,
        name: stock.name,
        quantity,
        purchase_price: priceWithFees,
        purchase_date: purchaseDate,
        purchase_currency: 'EUR',
        investment_case: trimmedCase,
        investment_case_updated_at: trimmedCase ? new Date().toISOString() : null,
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

  const addCash = useCallback(async (amount: number, date?: string) => {
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
        date: date || new Date().toISOString().split('T')[0]
      })

    await loadPortfolio(depotIdParam)
  }, [portfolio, loadPortfolio, depotIdParam])

  const updatePosition = useCallback(async (holdingId: string, updates: {
    quantity?: number
    purchase_price?: number
    purchase_date?: string
  }) => {
    // 1. Hole die aktuelle Holding um Symbol + altes Datum zu kennen
    const holding = holdings.find(h => h.id === holdingId)

    // 2. Update die Holding
    const { error } = await supabase
      .from('portfolio_holdings')
      .update({ ...updates, purchase_currency: 'EUR' })
      .eq('id', holdingId)
    if (error) throw error

    // 3. Synchronisiere die zugehörige Buy-Transaktion
    if (holding && portfolio?.id) {
      const txUpdates: Record<string, any> = {}
      if (updates.purchase_date) txUpdates.date = updates.purchase_date
      if (updates.quantity !== undefined) txUpdates.quantity = updates.quantity
      if (updates.purchase_price !== undefined) txUpdates.price = updates.purchase_price
      if (updates.quantity !== undefined || updates.purchase_price !== undefined) {
        const qty = updates.quantity ?? holding.quantity
        const price = updates.purchase_price ?? holding.purchase_price_display
        txUpdates.total_value = qty * price
      }

      if (Object.keys(txUpdates).length > 0) {
        // Finde die initiale Buy-Transaktion (älteste für dieses Symbol)
        const { data: txs } = await supabase
          .from('portfolio_transactions')
          .select('id')
          .eq('portfolio_id', portfolio.id)
          .eq('symbol', holding.symbol)
          .eq('type', 'buy')
          .order('created_at', { ascending: true })
          .limit(1)

        if (txs && txs.length > 0) {
          await supabase
            .from('portfolio_transactions')
            .update(txUpdates)
            .eq('id', txs[0].id)
        }
      }
    }

    await loadPortfolio(depotIdParam)
  }, [holdings, portfolio, loadPortfolio, depotIdParam])

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

  const sellPosition = useCallback(async (holdingId: string, params: {
    quantity: number
    price: number
    date: string
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const holding = holdings.find(h => h.id === holdingId)
    if (!holding) throw new Error('Position nicht gefunden')

    const { quantity, price, date } = params

    if (quantity >= holding.quantity) {
      // Vollverkauf — Holding löschen
      const { error } = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('id', holdingId)
      if (error) throw error
    } else {
      // Teilverkauf — Menge reduzieren
      const { error } = await supabase
        .from('portfolio_holdings')
        .update({ quantity: holding.quantity - quantity })
        .eq('id', holdingId)
      if (error) throw error
    }

    // Sell-Transaktion erstellen
    await supabase
      .from('portfolio_transactions')
      .insert({
        portfolio_id: portfolio.id,
        type: 'sell',
        symbol: holding.symbol,
        name: holding.name,
        quantity,
        price,
        total_value: quantity * price,
        date
      })

    await loadPortfolio(depotIdParam)
  }, [portfolio, holdings, loadPortfolio, depotIdParam])

  const addDividend = useCallback(async (holdingId: string, params: {
    amount: number
    date: string
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const holding = holdings.find(h => h.id === holdingId)
    if (!holding) throw new Error('Position nicht gefunden')

    const { amount, date } = params

    // Dividend-Transaktion erstellen (kein Holding-Update)
    await supabase
      .from('portfolio_transactions')
      .insert({
        portfolio_id: portfolio.id,
        type: 'dividend',
        symbol: holding.symbol,
        name: holding.name,
        quantity: holding.quantity,
        price: amount / holding.quantity,
        total_value: amount,
        date
      })

    await loadPortfolio(depotIdParam)
  }, [portfolio, holdings, loadPortfolio, depotIdParam])

  // Depotübertrag: transfer_in (Einbuchung) oder transfer_out (Ausbuchung)
  const addTransfer = useCallback(async (params: {
    direction: 'in' | 'out'
    stock: { symbol: string; name: string }
    quantity: number
    price: number
    date: string
    notes?: string
  }) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const { direction, stock, quantity, price, date, notes } = params
    const type = direction === 'in' ? 'transfer_in' : 'transfer_out'

    // Bestehende Holding suchen
    const existingHolding = holdings.find(h => h.symbol === stock.symbol)

    if (direction === 'in') {
      // Einbuchung: Holding erstellen oder aufstocken
      if (existingHolding) {
        const totalQty = existingHolding.quantity + quantity
        const avgPrice = ((existingHolding.quantity * existingHolding.purchase_price) + (quantity * price)) / totalQty
        await supabase
          .from('portfolio_holdings')
          .update({
            quantity: totalQty,
            purchase_price: avgPrice,
            purchase_date: existingHolding.purchase_date < date ? existingHolding.purchase_date : date
          })
          .eq('id', existingHolding.id)
      } else {
        await supabase
          .from('portfolio_holdings')
          .insert({
            portfolio_id: portfolio.id,
            symbol: stock.symbol,
            name: stock.name,
            quantity,
            purchase_price: price,
            purchase_date: date,
            purchase_currency: 'EUR'
          })
      }
    } else {
      // Ausbuchung: Holding reduzieren oder löschen
      if (existingHolding) {
        if (quantity >= existingHolding.quantity) {
          await supabase.from('portfolio_holdings').delete().eq('id', existingHolding.id)
        } else {
          await supabase
            .from('portfolio_holdings')
            .update({ quantity: existingHolding.quantity - quantity })
            .eq('id', existingHolding.id)
        }
      }
    }

    // Transaktion loggen
    await supabase
      .from('portfolio_transactions')
      .insert({
        portfolio_id: portfolio.id,
        type,
        symbol: stock.symbol,
        name: stock.name,
        quantity,
        price,
        total_value: quantity * price,
        date,
        notes: notes || (direction === 'in' ? 'Einbuchung (Depotübertrag)' : 'Ausbuchung (Depotübertrag)')
      })

    await loadPortfolio(depotIdParam)
  }, [portfolio, holdings, loadPortfolio, depotIdParam])

  // Duplikat-Prüfung: Prüft ob eine ähnliche Transaktion bereits existiert
  const checkDuplicate = useCallback(async (params: {
    type: string
    symbol: string
    date: string
    quantity: number
    price: number
  }): Promise<Transaction | null> => {
    if (!portfolio?.id) return null

    const { type, symbol, date, quantity, price } = params

    const { data } = await supabase
      .from('portfolio_transactions')
      .select('*')
      .eq('portfolio_id', portfolio.id)
      .eq('type', type)
      .eq('symbol', symbol)
      .eq('date', date)
      .limit(20)

    if (!data || data.length === 0) return null

    // Menge und Preis mit Toleranz vergleichen
    const match = data.find((tx: any) => {
      const qtyMatch = Math.abs(tx.quantity - quantity) < 0.01
      const priceMatch = Math.abs(tx.price - price) < 0.02
      return qtyMatch && priceMatch
    })

    return match || null
  }, [portfolio])

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

  const updateBrokerCredit = useCallback(async (amount: number) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')
    const { error } = await supabase
      .from('portfolios')
      .update({ broker_credit: amount })
      .eq('id', portfolio.id)
    if (error) throw error
    setPortfolio(prev => prev ? { ...prev, broker_credit: amount } : null)
  }, [portfolio])

  const updatePortfolioName = useCallback(async (name: string) => {
    if (!portfolio?.id) throw new Error('Kein Portfolio ausgewählt')

    const { error } = await supabase
      .from('portfolios')
      .update({ name: name.trim() })
      .eq('id', portfolio.id)
    if (error) throw error

    setPortfolio(prev => prev ? { ...prev, name: name.trim() } : null)
  }, [portfolio])

  // Einzelne Transaktion direkt bearbeiten (z.B. Datum, Menge, Preis, Gebühren, Notiz).
  // ACHTUNG: Keine automatische Synchronisation mit Holdings — der Nutzer ist
  // selbst verantwortlich, die Holdings-Menge ggf. anzupassen (bei Buy-Edit).
  const updateTransaction = useCallback(async (txId: string, updates: {
    date?: string
    quantity?: number
    price?: number
    fee?: number
    notes?: string | null
    total_value?: number
  }) => {
    const payload: Record<string, any> = { ...updates }
    // total_value automatisch aktualisieren wenn qty oder price geändert wurden
    if (payload.total_value === undefined && (payload.quantity !== undefined || payload.price !== undefined)) {
      const tx = transactions.find(t => t.id === txId)
      if (tx) {
        const q = payload.quantity ?? tx.quantity
        const p = payload.price ?? tx.price
        payload.total_value = q * p
      }
    }

    const { error } = await supabase
      .from('portfolio_transactions')
      .update(payload)
      .eq('id', txId)
    if (error) throw error

    await loadPortfolio(depotIdParam)
  }, [transactions, loadPortfolio, depotIdParam])

  const deleteTransaction = useCallback(async (txId: string) => {
    const { error } = await supabase
      .from('portfolio_transactions')
      .delete()
      .eq('id', txId)
    if (error) throw error

    await loadPortfolio(depotIdParam)
  }, [loadPortfolio, depotIdParam])

  // Ein komplettes Depot leeren: alle Holdings + Transaktionen löschen,
  // Cash-Position und Broker-Kredit auf 0 setzen. Das Depot selbst bleibt
  // bestehen (mit Namen & Broker-Type). Hilfreich vor einem kompletten
  // Re-Import aus einer aktualisierten CSV.
  const clearDepot = useCallback(async (portfolioId: string) => {
    if (!portfolioId || portfolioId === 'all') {
      throw new Error('Ungültige Depot-ID')
    }

    // 1) Holdings löschen
    const { error: holdErr } = await supabase
      .from('portfolio_holdings')
      .delete()
      .eq('portfolio_id', portfolioId)
    if (holdErr) throw holdErr

    // 2) Transaktionen löschen
    const { error: txErr } = await supabase
      .from('portfolio_transactions')
      .delete()
      .eq('portfolio_id', portfolioId)
    if (txErr) throw txErr

    // 3) Cash + Kredit zurücksetzen
    const { error: resetErr } = await supabase
      .from('portfolios')
      .update({ cash_position: 0, broker_credit: 0 })
      .eq('id', portfolioId)
    if (resetErr) throw resetErr

    await loadPortfolio(depotIdParam)
  }, [loadPortfolio, depotIdParam])

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
    totalRealizedGain,
    totalDividends,
    totalFees,
    totalReturn,
    totalReturnPercent,
    realizedGainByTxId,
    historicalPerfByDepot,
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
    sellPosition,
    addDividend,
    addTransfer,
    updateCashPosition,
    updateBrokerCredit,
    updatePortfolioName,
    updateTransaction,
    deleteTransaction,
    clearDepot,
    exportToCSV,
  }
}
