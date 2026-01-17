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
}

type ViewMode = 'week' | 'month'

export default function DividendsCalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dividendEvents, setDividendEvents] = useState<DividendEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([])

  // Load watchlist symbols from Supabase
  useEffect(() => {
    async function loadWatchlist() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          setWatchlistSymbols([])
          return
        }

        const { data, error } = await supabase
          .from('watchlists')
          .select('ticker')
          .eq('user_id', session.user.id)

        if (error) {
          console.error('Failed to load watchlist:', error)
          setWatchlistSymbols([])
          return
        }

        const symbols = (data || []).map((item: { ticker: string }) => item.ticker.toUpperCase())
        setWatchlistSymbols(symbols)
      } catch (error) {
        console.error('Failed to load watchlist:', error)
        setWatchlistSymbols([])
      }
    }
    loadWatchlist()
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

  // Load dividend data
  useEffect(() => {
    async function loadDividends() {
      if (watchlistSymbols.length === 0) {
        setDividendEvents([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const tickersParam = watchlistSymbols.join(',')
        const response = await fetch(`/api/dividends-calendar?tickers=${encodeURIComponent(tickersParam)}`)

        if (response.ok) {
          const events = await response.json()
          setDividendEvents(Array.isArray(events) ? events : [])
        }
      } catch (error) {
        console.error('Failed to load dividends:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDividends()
  }, [watchlistSymbols])

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

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const goToPrevious = viewMode === 'month' ? goToPreviousMonth : goToPreviousWeek
  const goToNext = viewMode === 'month' ? goToNextMonth : goToNextWeek

  // Filter dividends for current view (payment date within range)
  const filteredDividends = useMemo(() => {
    let from: string, to: string

    if (viewMode === 'month') {
      from = monthDateRange.from
      to = monthDateRange.to
    } else {
      from = formatDateAPI(weekDates[0])
      to = formatDateAPI(weekDates[4])
    }

    return dividendEvents.filter(event => {
      const paymentDate = event.paymentDate
      return paymentDate >= from && paymentDate <= to
    })
  }, [dividendEvents, viewMode, weekDates, monthDateRange])

  // Group dividends by payment date (for week view)
  const groupedDividends = useMemo(() => {
    const groups: Record<string, DividendEvent[]> = {}

    weekDates.forEach(date => {
      const dateKey = formatDateAPI(date)
      groups[dateKey] = []
    })

    filteredDividends.forEach(event => {
      const dateKey = event.paymentDate
      if (groups[dateKey]) {
        groups[dateKey].push(event)
      }
    })

    // Sort each group by dividend amount (highest first)
    Object.values(groups).forEach(group => {
      group.sort((a, b) => b.dividend - a.dividend)
    })

    return groups
  }, [filteredDividends, weekDates])

  // Group dividends by date for month view
  const monthGroupedDividends = useMemo(() => {
    const groups: Record<string, DividendEvent[]> = {}

    monthDates.flat().forEach(date => {
      const dateKey = formatDateAPI(date)
      groups[dateKey] = []
    })

    filteredDividends.forEach(event => {
      const dateKey = event.paymentDate
      if (groups[dateKey]) {
        groups[dateKey].push(event)
      }
    })

    Object.values(groups).forEach(group => {
      group.sort((a, b) => b.dividend - a.dividend)
    })

    return groups
  }, [filteredDividends, monthDates])

  // Format month/year header
  const monthYearHeader = useMemo(() => {
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(amount) + ' $'
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
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="w-5 h-5 text-theme-accent" />
            <h1 className="text-xl font-semibold text-theme-primary">Dividenden Kalender</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Watchlist Info Badge */}
            <span className="px-2 py-1 text-xs text-theme-muted bg-theme-secondary/30 rounded">
              {watchlistSymbols.length} Watchlist-Aktien
            </span>
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
          <div className="flex items-center gap-4">
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
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-theme-card border border-white/[0.04] rounded-xl overflow-hidden">
          {viewMode === 'week' ? (
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
                <div className="grid grid-cols-5 min-h-[500px]">
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
                              Zahlungen
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
                            className={`min-h-[100px] p-1.5 border-r border-white/[0.04] last:border-r-0 ${
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
                                {dayDividends.slice(0, 3).map((event, i) => (
                                  <Link
                                    key={i}
                                    href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
                                    className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-theme-hover transition-colors group"
                                    title={`${event.companyName} - ${formatCurrency(event.dividend)}`}
                                  >
                                    <Logo
                                      ticker={event.ticker}
                                      alt={event.ticker}
                                      className="w-4 h-4 rounded flex-shrink-0"
                                    />
                                    <span className="text-[10px] text-theme-secondary group-hover:text-theme-accent truncate">
                                      {event.ticker}
                                    </span>
                                  </Link>
                                ))}
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

        {/* Total Count */}
        <div className="mt-4 text-center text-sm text-theme-muted">
          {filteredDividends.length} Dividenden-Zahlungen {viewMode === 'week' ? 'diese Woche' : 'diesen Monat'}
        </div>

        {/* Empty State */}
        {!loading && watchlistSymbols.length === 0 && (
          <div className="mt-8 text-center py-12 bg-theme-card border border-white/[0.04] rounded-xl">
            <CurrencyDollarIcon className="w-12 h-12 text-theme-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-theme-primary mb-2">
              Keine Watchlist-Aktien
            </h3>
            <p className="text-theme-secondary mb-6">
              Füge Aktien zu deiner Watchlist hinzu, um Dividenden-Termine zu sehen.
            </p>
            <Link
              href="/analyse/watchlist"
              className="inline-flex items-center px-4 py-2 bg-theme-accent text-white rounded-lg hover:bg-theme-accent/80 transition-colors"
            >
              Zur Watchlist
            </Link>
          </div>
        )}
      </div>
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
  return (
    <Link
      href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-theme-hover transition-colors group"
      title={`${event.companyName} • ${formatCurrency(event.dividend)}${event.yield ? ` • ${event.yield.toFixed(2)}% Rendite` : ''}`}
    >
      <Logo
        ticker={event.ticker}
        alt={event.ticker}
        className="w-5 h-5 rounded flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-theme-primary group-hover:text-theme-accent transition-colors">
            {event.ticker}
          </span>
          <span className="text-[10px] text-theme-muted truncate">
            {frequencyLabels[event.frequency] || event.frequency}
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-[10px] text-theme-accent font-medium">
          {formatCurrency(event.dividend)}
        </span>
        {event.yield && (
          <p className="text-[9px] text-theme-muted">
            {event.yield.toFixed(2)}%
          </p>
        )}
      </div>
    </Link>
  )
}
