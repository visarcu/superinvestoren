// Dividenden Kalender - Fey Style Week/Month View
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'
import { supabase } from '@/lib/supabaseClient'

// Types
interface DividendEvent {
  ticker: string
  companyName: string
  date: string
  exDate: string
  paymentDate: string
  recordDate: string
  dividend: number
  yield: number | null
  currentPrice: number | null
  frequency: string
  // Portfolio-specific fields
  quantity?: number
  estimatedIncome?: number
  source: 'watchlist' | 'portfolio' | 'both'
}

interface PortfolioHolding {
  symbol: string
  name: string
  quantity: number
}

type ViewMode = 'week' | 'month' | 'year'
type SourceFilter = 'all' | 'portfolio' | 'watchlist'
type DateMode = 'payment' | 'ex'
type Currency = 'EUR' | 'USD'

// Exchange rate USD to EUR (approximate, could be fetched dynamically)
const USD_TO_EUR = 0.92

// Month names in German
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
]

export default function DividendsCalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('year')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dividendEvents, setDividendEvents] = useState<DividendEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([])
  const [portfolioHoldings, setPortfolioHoldings] = useState<PortfolioHolding[]>([])
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [dateMode, setDateMode] = useState<DateMode>('payment')
  const [currency, setCurrency] = useState<Currency>('EUR')

  // Load watchlist symbols and portfolio holdings from Supabase
  useEffect(() => {
    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          setWatchlistSymbols([])
          setPortfolioHoldings([])
          return
        }

        // Load watchlist
        const { data: watchlistData, error: watchlistError } = await supabase
          .from('watchlists')
          .select('ticker')
          .eq('user_id', session.user.id)

        if (watchlistError) {
          console.error('Failed to load watchlist:', watchlistError)
          setWatchlistSymbols([])
        } else {
          const symbols = (watchlistData || []).map((item: { ticker: string }) => item.ticker.toUpperCase())
          setWatchlistSymbols(symbols)
        }

        // Load portfolio holdings
        const { data: portfolioData, error: portfolioError } = await supabase
          .from('portfolio_holdings')
          .select('symbol, name, quantity')
          .eq('user_id', session.user.id)

        if (portfolioError) {
          console.error('Failed to load portfolio:', portfolioError)
          setPortfolioHoldings([])
        } else {
          const holdings = (portfolioData || []).map((item: any) => ({
            symbol: item.symbol.toUpperCase(),
            name: item.name || item.symbol,
            quantity: item.quantity || 0
          }))
          setPortfolioHoldings(holdings)
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
        setWatchlistSymbols([])
        setPortfolioHoldings([])
      }
    }
    loadUserData()
  }, [])

  // Get week dates (Mo-Fr)
  const weekDates = useMemo(() => {
    const dates: Date[] = []
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = day === 0 ? -6 : 1 - day
    startOfWeek.setDate(startOfWeek.getDate() + diff)

    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentDate])

  // Get month dates for calendar grid
  const monthDates = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    const dayOfWeek = startDate.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startDate.setDate(startDate.getDate() + diff)

    const dates: Date[] = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push(date)
    }

    const weeks: Date[][] = []
    for (let i = 0; i < 6; i++) {
      const week = dates.slice(i * 7, (i + 1) * 7)
      const hasCurrentMonthDay = week.some(d => d.getMonth() === month)
      if (hasCurrentMonthDay) {
        weeks.push(week)
      }
    }

    return weeks
  }, [currentDate])

  // Format date for API
  const formatDateAPI = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // Get date range for month view API calls
  const monthDateRange = useMemo(() => {
    if (monthDates.length === 0) return { from: '', to: '' }
    const allDates = monthDates.flat()
    return {
      from: formatDateAPI(allDates[0]),
      to: formatDateAPI(allDates[allDates.length - 1])
    }
  }, [monthDates])

  // Load dividend data from both sources
  useEffect(() => {
    async function loadDividends() {
      // Combine all unique tickers from both sources
      const portfolioSymbols = portfolioHoldings.map(h => h.symbol)
      const allSymbols = [...new Set([...watchlistSymbols, ...portfolioSymbols])]

      if (allSymbols.length === 0) {
        setDividendEvents([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const tickersParam = allSymbols.join(',')
        const response = await fetch(`/api/dividends-calendar?tickers=${encodeURIComponent(tickersParam)}`)

        if (response.ok) {
          const events = await response.json()

          // Enrich events with source and portfolio data
          const enrichedEvents: DividendEvent[] = (Array.isArray(events) ? events : []).map((event: any) => {
            const ticker = event.ticker.toUpperCase()
            const inWatchlist = watchlistSymbols.includes(ticker)
            const portfolioHolding = portfolioHoldings.find(h => h.symbol === ticker)
            const inPortfolio = !!portfolioHolding

            let source: 'watchlist' | 'portfolio' | 'both' = 'watchlist'
            if (inWatchlist && inPortfolio) {
              source = 'both'
            } else if (inPortfolio) {
              source = 'portfolio'
            }

            return {
              ...event,
              source,
              quantity: portfolioHolding?.quantity,
              estimatedIncome: portfolioHolding ? portfolioHolding.quantity * event.dividend : undefined
            }
          })

          setDividendEvents(enrichedEvents)
        }
      } catch (error) {
        console.error('Failed to load dividends:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDividends()
  }, [watchlistSymbols, portfolioHoldings])

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  // Navigate months
  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const goToNextMonth = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  // Navigate years
  const goToPreviousYear = () => {
    const newDate = new Date(currentDate)
    newDate.setFullYear(newDate.getFullYear() - 1)
    setCurrentDate(newDate)
  }

  const goToNextYear = () => {
    const newDate = new Date(currentDate)
    newDate.setFullYear(newDate.getFullYear() + 1)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const goToPrevious = viewMode === 'year' ? goToPreviousYear : viewMode === 'month' ? goToPreviousMonth : goToPreviousWeek
  const goToNext = viewMode === 'year' ? goToNextYear : viewMode === 'month' ? goToNextMonth : goToNextWeek

  // Filter dividends for current view (date within range + source filter)
  const filteredDividends = useMemo(() => {
    let from: string, to: string

    if (viewMode === 'year') {
      const year = currentDate.getFullYear()
      from = `${year}-01-01`
      to = `${year}-12-31`
    } else if (viewMode === 'month') {
      from = monthDateRange.from
      to = monthDateRange.to
    } else {
      from = formatDateAPI(weekDates[0])
      to = formatDateAPI(weekDates[4])
    }

    return dividendEvents.filter(event => {
      // Use either paymentDate or exDate based on dateMode
      const relevantDate = dateMode === 'payment' ? event.paymentDate : event.exDate
      const inDateRange = relevantDate >= from && relevantDate <= to

      // Apply source filter
      if (sourceFilter === 'all') {
        return inDateRange
      } else if (sourceFilter === 'portfolio') {
        return inDateRange && (event.source === 'portfolio' || event.source === 'both')
      } else {
        return inDateRange && (event.source === 'watchlist' || event.source === 'both')
      }
    })
  }, [dividendEvents, viewMode, weekDates, monthDateRange, sourceFilter, dateMode, currentDate])

  // Group dividends by date (for week view)
  const groupedDividends = useMemo(() => {
    const groups: Record<string, DividendEvent[]> = {}

    weekDates.forEach(date => {
      const dateKey = formatDateAPI(date)
      groups[dateKey] = []
    })

    filteredDividends.forEach(event => {
      const dateKey = dateMode === 'payment' ? event.paymentDate : event.exDate
      if (groups[dateKey]) {
        groups[dateKey].push(event)
      }
    })

    // Sort each group by dividend amount (highest first)
    Object.values(groups).forEach(group => {
      group.sort((a, b) => b.dividend - a.dividend)
    })

    return groups
  }, [filteredDividends, weekDates, dateMode])

  // Group dividends by date for month view
  const monthGroupedDividends = useMemo(() => {
    const groups: Record<string, DividendEvent[]> = {}

    monthDates.flat().forEach(date => {
      const dateKey = formatDateAPI(date)
      groups[dateKey] = []
    })

    filteredDividends.forEach(event => {
      const dateKey = dateMode === 'payment' ? event.paymentDate : event.exDate
      if (groups[dateKey]) {
        groups[dateKey].push(event)
      }
    })

    Object.values(groups).forEach(group => {
      group.sort((a, b) => b.dividend - a.dividend)
    })

    return groups
  }, [filteredDividends, monthDates, dateMode])

  // Group dividends by month for year view (0-11)
  const yearGroupedDividends = useMemo(() => {
    const groups: Record<number, DividendEvent[]> = {}

    // Initialize all 12 months
    for (let i = 0; i < 12; i++) {
      groups[i] = []
    }

    filteredDividends.forEach(event => {
      const relevantDate = dateMode === 'payment' ? event.paymentDate : event.exDate
      const month = new Date(relevantDate).getMonth()
      groups[month].push(event)
    })

    // Sort each month by estimated income (highest first), then by dividend
    Object.values(groups).forEach(group => {
      group.sort((a, b) => {
        // Portfolio items first (by income), then by dividend amount
        if (a.estimatedIncome && b.estimatedIncome) {
          return b.estimatedIncome - a.estimatedIncome
        }
        if (a.estimatedIncome) return -1
        if (b.estimatedIncome) return 1
        return b.dividend - a.dividend
      })
    })

    return groups
  }, [filteredDividends, dateMode])

  // Calculate monthly sums for year view
  const monthlySums = useMemo(() => {
    const sums: Record<number, number> = {}

    for (let i = 0; i < 12; i++) {
      const monthDividends = yearGroupedDividends[i] || []
      sums[i] = monthDividends.reduce((sum, event) => {
        return sum + (event.estimatedIncome || 0)
      }, 0)
    }

    return sums
  }, [yearGroupedDividends])

  // Calculate yearly total
  const yearlyTotal = useMemo(() => {
    return Object.values(monthlySums).reduce((sum, val) => sum + val, 0)
  }, [monthlySums])

  // Format month/year header
  const monthYearHeader = useMemo(() => {
    if (viewMode === 'year') {
      return currentDate.getFullYear().toString()
    }

    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    }

    const firstDate = weekDates[0]
    const lastDate = weekDates[4]

    if (firstDate.getMonth() === lastDate.getMonth()) {
      return firstDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    } else {
      return `${firstDate.toLocaleDateString('de-DE', { month: 'short' })} - ${lastDate.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}`
    }
  }, [weekDates, viewMode, currentDate])

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Deutsche Tagesbezeichnungen
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

  // Format currency with conversion
  const formatCurrency = (amount: number) => {
    const convertedAmount = currency === 'EUR' ? amount * USD_TO_EUR : amount
    const symbol = currency === 'EUR' ? '€' : '$'
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedAmount) + ' ' + symbol
  }

  // Frequency translations
  const frequencyLabels: Record<string, string> = {
    'Quarterly': 'Vierteljährlich',
    'Annual': 'Jährlich',
    'Monthly': 'Monatlich',
    'Semi-Annual': 'Halbjährlich'
  }

  return (
    <div className="min-h-screen bg-theme-bg">
      <div className="mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="w-5 h-5 text-theme-accent" />
            <h1 className="text-xl font-semibold text-theme-primary">Dividenden Kalender</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Source Info Badges */}
            <div className="flex items-center gap-2 text-xs text-theme-muted">
              <span className="px-2 py-1 bg-theme-secondary/30 rounded">
                {watchlistSymbols.length} Watchlist
              </span>
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                {portfolioHoldings.length} Portfolio
              </span>
            </div>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-6">
          {/* Month/Year + Navigation */}
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium text-theme-primary">{monthYearHeader}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevious}
                className="p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-hover rounded transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-2 py-1 text-xs text-theme-secondary hover:text-theme-primary hover:bg-theme-hover rounded transition-colors"
              >
                Heute
              </button>
              <button
                onClick={goToNext}
                className="p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-hover rounded transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3">
            {/* Currency Toggle */}
            <div className="flex items-center gap-1 bg-theme-card border border-white/[0.04] rounded-lg p-1">
              <button
                onClick={() => setCurrency('EUR')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  currency === 'EUR'
                    ? 'bg-theme-hover text-theme-primary'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                EUR
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  currency === 'USD'
                    ? 'bg-theme-hover text-theme-primary'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                USD
              </button>
            </div>

            {/* Source Filter Toggle */}
            <div className="flex items-center gap-1 bg-theme-card border border-white/[0.04] rounded-lg p-1">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  sourceFilter === 'all'
                    ? 'bg-theme-hover text-theme-primary'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setSourceFilter('portfolio')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  sourceFilter === 'portfolio'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                Portfolio
              </button>
              <button
                onClick={() => setSourceFilter('watchlist')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  sourceFilter === 'watchlist'
                    ? 'bg-theme-hover text-theme-primary'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                Watchlist
              </button>
            </div>

            {/* Date Mode Toggle */}
            <div className="flex items-center gap-1 bg-theme-card border border-white/[0.04] rounded-lg p-1">
              <button
                onClick={() => setDateMode('payment')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  dateMode === 'payment'
                    ? 'bg-theme-hover text-theme-primary'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
                title="Sortiert nach Auszahlungsdatum"
              >
                Zahltag
              </button>
              <button
                onClick={() => setDateMode('ex')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  dateMode === 'ex'
                    ? 'bg-theme-hover text-theme-primary'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
                title="Sortiert nach Ex-Dividenden-Datum (letzter Kauftag)"
              >
                Ex-Datum
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-theme-card border border-white/[0.04] rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === 'week'
                    ? 'bg-theme-hover text-theme-primary'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                Woche
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === 'month'
                    ? 'bg-theme-hover text-theme-primary'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                Monat
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === 'year'
                    ? 'bg-theme-hover text-theme-primary'
                    : 'text-theme-muted hover:text-theme-primary'
                }`}
              >
                Jahr
              </button>
            </div>
          </div>
        </div>

        {/* Year View Header with Total */}
        {viewMode === 'year' && yearlyTotal > 0 && (
          <div className="mb-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-theme-primary">{currentDate.getFullYear()}</span>
            <span className="text-lg text-theme-muted">
              Summe: <span className="text-emerald-400 font-medium">{formatCurrency(yearlyTotal)}</span>
            </span>
          </div>
        )}

        {/* Calendar Grid */}
        <div className={`bg-theme-card border border-white/[0.04] rounded-xl overflow-hidden ${viewMode === 'year' ? 'p-0' : ''}`}>
          {viewMode === 'year' ? (
            // Year View - 4x3 Month Grid like Parqet
            loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-theme-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-px bg-white/[0.04]">
                {MONTH_NAMES.map((monthName, monthIndex) => {
                  const monthDividends = yearGroupedDividends[monthIndex] || []
                  const monthSum = monthlySums[monthIndex] || 0
                  const isCurrentMonth = monthIndex === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()

                  return (
                    <div
                      key={monthIndex}
                      className={`bg-theme-card p-4 min-h-[220px] ${isCurrentMonth ? 'ring-1 ring-inset ring-theme-accent/30' : ''}`}
                    >
                      {/* Month Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-medium ${isCurrentMonth ? 'text-theme-accent' : 'text-theme-primary'}`}>
                          {monthName}
                        </span>
                        {monthDividends.length > 0 && (
                          <span className="text-[10px] text-theme-muted">
                            {monthDividends.length} {monthDividends.length === 1 ? 'Zahlung' : 'Zahlungen'}
                          </span>
                        )}
                      </div>

                      {/* Dividend List */}
                      {monthDividends.length > 0 ? (
                        <div className="space-y-1">
                          {monthDividends.slice(0, 5).map((event, i) => (
                            <YearViewDividendItem
                              key={`${event.ticker}-${i}`}
                              event={event}
                              formatCurrency={formatCurrency}
                            />
                          ))}
                          {monthDividends.length > 5 && (
                            <div className="pt-1">
                              <span className="text-xs text-theme-accent hover:underline cursor-pointer">
                                Mehr anzeigen →
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-20 text-theme-muted/30 text-xs">
                          Keine Dividenden
                        </div>
                      )}

                      {/* Month Sum */}
                      {monthSum > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/[0.04] text-right">
                          <span className="text-xs text-theme-muted">Summe: </span>
                          <span className="text-sm font-medium text-emerald-400">{formatCurrency(monthSum)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          ) : viewMode === 'week' ? (
            <>
              {/* Week View - Day Headers */}
              <div className="grid grid-cols-5 border-b border-white/[0.04]">
                {weekDates.map((date, index) => (
                  <div
                    key={index}
                    className={`px-4 py-3 text-center border-r border-white/[0.04] last:border-r-0 ${
                      isToday(date) ? 'bg-theme-accent/5' : ''
                    }`}
                  >
                    <div className="text-xs text-theme-muted mb-1">{dayNames[index]}</div>
                    <div className={`text-sm font-medium ${
                      isToday(date) ? 'text-theme-accent' : 'text-theme-primary'
                    }`}>
                      {date.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Week View - Calendar Content */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-theme-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-5 min-h-[650px]">
                  {weekDates.map((date, dayIndex) => {
                    const dateKey = formatDateAPI(date)
                    const dayDividends = groupedDividends[dateKey] || []

                    return (
                      <div
                        key={dayIndex}
                        className={`border-r border-white/[0.04] last:border-r-0 ${
                          isToday(date) ? 'bg-theme-accent/5' : ''
                        }`}
                      >
                        {dayDividends.length > 0 ? (
                          <div className="p-2">
                            <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-2 px-1">
                              {dateMode === 'payment' ? 'Zahlungen' : 'Ex-Daten'}
                            </div>
                            <div className="space-y-1">
                              {dayDividends.map((event, i) => (
                                <DividendItem key={i} event={event} formatCurrency={formatCurrency} frequencyLabels={frequencyLabels} />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-theme-muted/30 text-xs">
                            -
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Month View - Day Headers */}
              <div className="grid grid-cols-7 border-b border-white/[0.04]">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, index) => (
                  <div
                    key={index}
                    className="px-2 py-2 text-center border-r border-white/[0.04] last:border-r-0"
                  >
                    <div className="text-xs text-theme-muted">{day}</div>
                  </div>
                ))}
              </div>

              {/* Month View - Calendar Content */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-theme-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div>
                  {monthDates.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-white/[0.04] last:border-b-0">
                      {week.map((date, dayIndex) => {
                        const dateKey = formatDateAPI(date)
                        const dayDividends = monthGroupedDividends[dateKey] || []
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                        const isTodayDate = isToday(date)
                        const isWeekend = dayIndex >= 5

                        return (
                          <div
                            key={dayIndex}
                            className={`min-h-[120px] p-2 border-r border-white/[0.04] last:border-r-0 ${
                              isTodayDate ? 'bg-theme-accent/5' : ''
                            } ${!isCurrentMonth ? 'opacity-40' : ''} ${isWeekend ? 'bg-white/[0.01]' : ''}`}
                          >
                            {/* Date Number */}
                            <div className={`text-xs font-medium mb-1 ${
                              isTodayDate
                                ? 'text-theme-accent'
                                : isCurrentMonth
                                  ? 'text-theme-primary'
                                  : 'text-theme-muted'
                            }`}>
                              {date.getDate()}
                            </div>

                            {/* Dividends for the day */}
                            {dayDividends.length > 0 && (
                              <div className="space-y-0.5">
                                {dayDividends.slice(0, 3).map((event, i) => {
                                  const hasPortfolioData = event.quantity !== undefined && event.estimatedIncome !== undefined
                                  return (
                                    <Link
                                      key={i}
                                      href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
                                      className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-theme-hover transition-colors group"
                                      title={`${event.companyName} - ${formatCurrency(event.dividend)}${hasPortfolioData ? ` • ${event.quantity} Stück = ${formatCurrency(event.estimatedIncome!)}` : ''}`}
                                    >
                                      <div className="relative flex-shrink-0">
                                        <Logo
                                          ticker={event.ticker}
                                          alt={event.ticker}
                                          className="w-4 h-4 rounded"
                                        />
                                        {(event.source === 'portfolio' || event.source === 'both') && (
                                          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        )}
                                      </div>
                                      <span className={`text-[10px] truncate ${hasPortfolioData ? 'text-emerald-400' : 'text-theme-secondary'} group-hover:text-theme-accent`}>
                                        {event.ticker}
                                      </span>
                                    </Link>
                                  )
                                })}
                                {dayDividends.length > 3 && (
                                  <div className="text-[9px] text-theme-muted px-1">
                                    +{dayDividends.length - 3} mehr
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Summary Stats - Hide for year view since we show it in header */}
        {viewMode !== 'year' && (
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <span className="text-theme-muted">
              {filteredDividends.length} Dividenden-Zahlungen {viewMode === 'week' ? 'diese Woche' : 'diesen Monat'}
            </span>
            {/* Show estimated income if there are portfolio dividends */}
            {filteredDividends.some(d => d.estimatedIncome !== undefined) && (
              <span className="text-emerald-400 font-medium">
                Geschätzte Einnahmen: {formatCurrency(
                  filteredDividends
                    .filter(d => d.estimatedIncome !== undefined)
                    .reduce((sum, d) => sum + (d.estimatedIncome || 0), 0)
                )}
              </span>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && watchlistSymbols.length === 0 && portfolioHoldings.length === 0 && (
          <div className="mt-8 text-center py-12 bg-theme-card border border-white/[0.04] rounded-xl">
            <CurrencyDollarIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-theme-primary mb-2">
              Keine Aktien gefunden
            </h3>
            <p className="text-theme-secondary mb-6">
              Füge Aktien zu deinem Portfolio oder deiner Watchlist hinzu, um Dividenden-Termine zu sehen.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/portfolio"
                className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Zum Portfolio
              </Link>
              <Link
                href="/analyse/watchlist"
                className="inline-flex items-center px-4 py-2 bg-theme-hover text-theme-primary rounded-lg hover:bg-theme-secondary/30 transition-colors"
              >
                Zur Watchlist
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Year View Dividend Item Component - Compact like Parqet
function YearViewDividendItem({
  event,
  formatCurrency
}: {
  event: DividendEvent
  formatCurrency: (amount: number) => string
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const hasPortfolioData = event.quantity !== undefined && event.estimatedIncome !== undefined

  return (
    <div className="relative">
      <Link
        href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
        className="flex items-center justify-between py-1.5 px-1 -mx-1 rounded hover:bg-theme-hover transition-colors group"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <Logo
              ticker={event.ticker}
              alt={event.ticker}
              className="w-5 h-5 rounded"
            />
            {(event.source === 'portfolio' || event.source === 'both') && (
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            )}
          </div>
          <span className="text-sm text-theme-primary group-hover:text-theme-accent truncate">
            {event.companyName}
          </span>
        </div>
        <span className={`text-sm font-medium flex-shrink-0 ml-2 ${hasPortfolioData ? 'text-emerald-400' : 'text-theme-secondary'}`}>
          {hasPortfolioData ? formatCurrency(event.estimatedIncome!) : formatCurrency(event.dividend)}
        </span>
      </Link>

      {/* Hover Tooltip like Parqet */}
      {showTooltip && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-theme-card border border-white/10 rounded-lg shadow-xl p-3 min-w-[220px]">
          <div className="flex items-center gap-2 mb-3">
            <Logo ticker={event.ticker} alt={event.ticker} className="w-8 h-8 rounded" />
            <div>
              <div className="text-sm font-medium text-theme-primary">{event.companyName}</div>
              <div className="text-xs text-theme-muted">{event.ticker}</div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-theme-muted">Zahltag</span>
              <span className="text-theme-primary">
                {new Date(event.paymentDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-theme-muted">Ex-Tag</span>
              <span className="text-theme-primary">
                {new Date(event.exDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
            {hasPortfolioData && (
              <div className="flex justify-between">
                <span className="text-theme-muted">Ausschüttung</span>
                <div className="text-right">
                  <span className="text-emerald-400 font-medium">{formatCurrency(event.estimatedIncome!)}</span>
                  <div className="text-theme-muted">{event.quantity}x {formatCurrency(event.dividend)}</div>
                </div>
              </div>
            )}
            {!hasPortfolioData && (
              <div className="flex justify-between">
                <span className="text-theme-muted">Dividende</span>
                <span className="text-theme-primary">{formatCurrency(event.dividend)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-theme-muted">Intervall</span>
              <span className="text-theme-primary">{event.frequency}</span>
            </div>
            {event.yield && (
              <div className="flex justify-between">
                <span className="text-theme-muted">Yield</span>
                <span className="text-emerald-400">{event.yield.toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Dividend Item Component
function DividendItem({
  event,
  formatCurrency,
  frequencyLabels
}: {
  event: DividendEvent
  formatCurrency: (amount: number) => string
  frequencyLabels: Record<string, string>
}) {
  const hasPortfolioData = event.quantity !== undefined && event.estimatedIncome !== undefined

  return (
    <Link
      href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-theme-hover transition-colors group"
      title={`${event.companyName} • ${formatCurrency(event.dividend)}${event.yield ? ` • ${event.yield.toFixed(2)}% Rendite` : ''}${hasPortfolioData ? ` • ${event.quantity} Stück = ${formatCurrency(event.estimatedIncome!)}` : ''}`}
    >
      <div className="relative">
        <Logo
          ticker={event.ticker}
          alt={event.ticker}
          className="w-5 h-5 rounded flex-shrink-0"
        />
        {/* Source indicator dot */}
        {(event.source === 'portfolio' || event.source === 'both') && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-theme-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-theme-primary group-hover:text-theme-accent transition-colors">
            {event.ticker}
          </span>
          <span className="text-[10px] text-theme-muted truncate">
            {frequencyLabels[event.frequency] || event.frequency}
          </span>
        </div>
        {/* Show quantity for portfolio items */}
        {hasPortfolioData && (
          <div className="text-[9px] text-emerald-400/70">
            {event.quantity} Stück
          </div>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        {/* Show estimated income for portfolio, otherwise per-share dividend */}
        {hasPortfolioData ? (
          <>
            <span className="text-[10px] text-emerald-400 font-medium">
              +{formatCurrency(event.estimatedIncome!)}
            </span>
            <p className="text-[9px] text-theme-muted">
              {formatCurrency(event.dividend)}/Stk
            </p>
          </>
        ) : (
          <>
            <span className="text-[10px] text-theme-accent font-medium">
              {formatCurrency(event.dividend)}
            </span>
            {event.yield && (
              <p className="text-[9px] text-theme-muted">
                {event.yield.toFixed(2)}%
              </p>
            )}
          </>
        )}
      </div>
    </Link>
  )
}
