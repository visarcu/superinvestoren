// Earnings Calendar - Fey Style Week View mit Large-Cap Filter
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'
import { supabase } from '@/lib/supabaseClient'

// Types
interface EarningsEvent {
  symbol: string
  name: string
  date: string
  time: 'bmo' | 'amc' | 'dmh' | string // before market open, after market close, during market hours
  epsEstimate: number | null
  revenueEstimate: number | null
  marketCap: number | null
}

type ViewMode = 'day' | 'week' | 'month'

// Filter-Konfiguration für relevante Large-Cap Earnings
const MIN_MARKET_CAP = 3_000_000_000 // $3 Mrd. minimum Market Cap

// Börsen-Suffixe die wir ausschließen (asiatische/emerging markets)
const EXCLUDED_SUFFIXES = [
  '.T',    // Tokyo
  '.HK',   // Hong Kong
  '.SS',   // Shanghai
  '.SZ',   // Shenzhen
  '.KS',   // Korea
  '.TW',   // Taiwan
  '.SI',   // Singapore
  '.BK',   // Bangkok
  '.JK',   // Jakarta
  '.KL',   // Kuala Lumpur
  '.NS',   // India NSE
  '.BO',   // India BSE
  '.SA',   // Brazil
  '.MX',   // Mexico
]

// Regex für Preferred Shares und andere Aktienklassen die wir ausschließen wollen
// z.B. JPM-PL, BAC-PK, MS-PA, GS-PD etc.
const PREFERRED_SHARE_PATTERN = /^[A-Z]+-(P[A-Z]?|[A-Z])$/

// Prüft ob ein Earnings-Event relevant ist (für Large-Cap Filter)
function isRelevantEarning(event: EarningsEvent, watchlistSymbols: string[] = []): boolean {
  // Watchlist-Aktien werden immer angezeigt (außer Preferred Shares etc.)
  const isWatchlisted = watchlistSymbols.includes(event.symbol.toUpperCase())

  // Ausschließen: Asiatische/Emerging Market Börsen
  const hasExcludedSuffix = EXCLUDED_SUFFIXES.some(suffix =>
    event.symbol.toUpperCase().endsWith(suffix.toUpperCase())
  )
  if (hasExcludedSuffix) return false

  // Ausschließen: Preferred Shares und andere Aktienklassen (JPM-PL, BAC-PK, MS-PA, etc.)
  if (PREFERRED_SHARE_PATTERN.test(event.symbol)) return false

  // Ausschließen: Symbole mit Suffixen wie .DE, .L, .F (europäische Duplikate von US-Aktien)
  if (event.symbol.includes('.')) return false

  // Ausschließen: Symbole die mit 0 anfangen (oft LSE-Codes wie 0Q1F.L)
  if (event.symbol.startsWith('0')) return false

  // Watchlist-Aktien immer anzeigen (auch ohne Market Cap)
  if (isWatchlisted) return true

  // Für nicht-Watchlist-Aktien: Market Cap Filter anwenden
  if (!event.marketCap) return false
  if (event.marketCap < MIN_MARKET_CAP) return false

  return true
}

// Sortiert Earnings nach Market Cap (größte zuerst)
function sortByMarketCap(a: EarningsEvent, b: EarningsEvent): number {
  const aMcap = a.marketCap || 0
  const bMcap = b.marketCap || 0
  return bMcap - aMcap
}

// Maximale Anzahl Earnings pro Sektion (pre/post market) bevor "mehr anzeigen"
const DEFAULT_VISIBLE_COUNT = 8

export default function EarningsCalendarPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [rawEarnings, setRawEarnings] = useState<EarningsEvent[]>([]) // Alle Earnings ohne Filter
  const [loading, setLoading] = useState(true)
  const [filterWatchlist, setFilterWatchlist] = useState(false)
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Load watchlist symbols from Supabase
  useEffect(() => {
    async function loadWatchlist() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          // User not logged in, no watchlist to load
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
        console.log('Watchlist loaded:', symbols)
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
    // Adjust to Monday (day 1)
    const diff = day === 0 ? -6 : 1 - day
    startOfWeek.setDate(startOfWeek.getDate() + diff)

    for (let i = 0; i < 5; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentDate])

  // Get month dates for calendar grid (full weeks including previous/next month days)
  const monthDates = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)

    // Start from Monday of the week containing the first day
    const startDate = new Date(firstDay)
    const dayOfWeek = startDate.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    startDate.setDate(startDate.getDate() + diff)

    // Generate 6 weeks of dates (42 days) to cover all possible month layouts
    const dates: Date[] = []
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      dates.push(date)
    }

    // Only include weeks that have at least one day in the current month
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

  // Format date for API - defined before useMemo hooks that use it
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

  // Load earnings data (alle Earnings, Filter wird später angewendet)
  useEffect(() => {
    async function loadEarnings() {
      setLoading(true)
      try {
        let from: string, to: string

        if (viewMode === 'month') {
          from = monthDateRange.from
          to = monthDateRange.to
        } else {
          from = formatDateAPI(weekDates[0])
          to = formatDateAPI(weekDates[4])
        }

        if (!from || !to) return

        const res = await fetch(`/api/earnings-calendar/week?from=${from}&to=${to}`)
        if (res.ok) {
          const data = await res.json()
          // Alle Earnings laden, Filter wird in useMemo angewendet
          setRawEarnings(data.earnings || [])
        }
      } catch (error) {
        console.error('Failed to load earnings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEarnings()
  }, [weekDates, monthDateRange, viewMode])

  // Filter für relevante Earnings (Large-Cap + Watchlist)
  const earnings = useMemo(() => {
    return rawEarnings.filter(event => isRelevantEarning(event, watchlistSymbols))
  }, [rawEarnings, watchlistSymbols])

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

  // Navigation handlers based on view mode
  const goToPrevious = viewMode === 'month' ? goToPreviousMonth : goToPreviousWeek
  const goToNext = viewMode === 'month' ? goToNextMonth : goToNextWeek

  // Filter earnings based on watchlist toggle
  const filteredEarnings = useMemo(() => {
    if (!filterWatchlist) return earnings
    return earnings.filter(event => watchlistSymbols.includes(event.symbol.toUpperCase()))
  }, [earnings, filterWatchlist, watchlistSymbols])

  // Group earnings by date and time, sorted by revenue (for week view)
  const groupedEarnings = useMemo(() => {
    const groups: Record<string, { preMarket: EarningsEvent[], postMarket: EarningsEvent[] }> = {}

    weekDates.forEach(date => {
      const dateKey = formatDateAPI(date)
      groups[dateKey] = { preMarket: [], postMarket: [] }
    })

    filteredEarnings.forEach(event => {
      const dateKey = event.date
      if (groups[dateKey]) {
        if (event.time === 'bmo') {
          groups[dateKey].preMarket.push(event)
        } else {
          groups[dateKey].postMarket.push(event)
        }
      }
    })

    // Sortiere jede Gruppe nach Revenue (größte zuerst)
    Object.values(groups).forEach(group => {
      group.preMarket.sort(sortByMarketCap)
      group.postMarket.sort(sortByMarketCap)
    })

    return groups
  }, [filteredEarnings, weekDates])

  // Group earnings by date for month view
  const monthGroupedEarnings = useMemo(() => {
    const groups: Record<string, EarningsEvent[]> = {}

    // Initialize all dates in the month view
    monthDates.flat().forEach(date => {
      const dateKey = formatDateAPI(date)
      groups[dateKey] = []
    })

    filteredEarnings.forEach(event => {
      const dateKey = event.date
      if (groups[dateKey]) {
        groups[dateKey].push(event)
      }
    })

    // Sort each group by market cap
    Object.values(groups).forEach(group => {
      group.sort(sortByMarketCap)
    })

    return groups
  }, [filteredEarnings, monthDates])

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

  // Toggle expanded state for a section
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionKey)) {
        next.delete(sectionKey)
      } else {
        next.add(sectionKey)
      }
      return next
    })
  }

  return (
    <div className="min-h-screen bg-theme-bg">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-theme-accent" />
            <h1 className="text-xl font-semibold text-theme-primary">Earnings Kalender</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Large Cap Info Badge */}
            <span className="px-2 py-1 text-xs text-theme-muted bg-theme-secondary/30 rounded">
              Large-Caps (&gt;$3 Mrd. MCap)
            </span>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-theme-card border border-white/[0.04] rounded-lg p-1">
              <button
                onClick={() => router.push('/analyse/earnings')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-theme-muted hover:text-theme-primary rounded transition-colors"
              >
                <ListBulletIcon className="w-4 h-4" />
                Events
              </button>
              <button
                className="flex items-center gap-1 px-2 py-1 text-xs bg-theme-accent/20 text-theme-accent rounded"
              >
                <CalendarIcon className="w-4 h-4" />
                Kalender
              </button>
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
          <div className="flex items-center gap-4">
            {/* Filter by watchlist */}
            <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
              <span>Nur Watchlist</span>
              <div
                onClick={() => setFilterWatchlist(!filterWatchlist)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                  filterWatchlist ? 'bg-theme-accent' : 'bg-theme-secondary/30'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    filterWatchlist ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
            </label>

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
                    const dayEarnings = groupedEarnings[dateKey] || { preMarket: [], postMarket: [] }

                    return (
                      <div
                        key={dayIndex}
                        className={`border-r border-white/[0.04] last:border-r-0 ${
                          isToday(date) ? 'bg-theme-accent/5' : ''
                        }`}
                      >
                        {/* Pre-Market Section */}
                        {dayEarnings.preMarket.length > 0 && (
                          <div className="p-2">
                            <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-2 px-1">
                              Vorbörslich
                            </div>
                            <div className="space-y-1">
                              {(() => {
                                const sectionKey = `${dateKey}-pre`
                                const isExpanded = expandedSections.has(sectionKey)
                                const items = dayEarnings.preMarket
                                const visibleItems = isExpanded ? items : items.slice(0, DEFAULT_VISIBLE_COUNT)
                                const hiddenCount = items.length - DEFAULT_VISIBLE_COUNT

                                return (
                                  <>
                                    {visibleItems.map((event, i) => (
                                      <EarningsItem key={i} event={event} />
                                    ))}
                                    {hiddenCount > 0 && !isExpanded && (
                                      <button
                                        onClick={() => toggleSection(sectionKey)}
                                        className="w-full py-1 text-[10px] text-theme-accent hover:text-theme-accent/80 transition-colors"
                                      >
                                        +{hiddenCount} mehr
                                      </button>
                                    )}
                                    {isExpanded && hiddenCount > 0 && (
                                      <button
                                        onClick={() => toggleSection(sectionKey)}
                                        className="w-full py-1 text-[10px] text-theme-muted hover:text-theme-secondary transition-colors"
                                      >
                                        weniger
                                      </button>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Post-Market Section */}
                        {dayEarnings.postMarket.length > 0 && (
                          <div className="p-2 border-t border-white/[0.02]">
                            <div className="text-[10px] text-theme-muted uppercase tracking-wider mb-2 px-1">
                              Nachbörslich
                            </div>
                            <div className="space-y-1">
                              {(() => {
                                const sectionKey = `${dateKey}-post`
                                const isExpanded = expandedSections.has(sectionKey)
                                const items = dayEarnings.postMarket
                                const visibleItems = isExpanded ? items : items.slice(0, DEFAULT_VISIBLE_COUNT)
                                const hiddenCount = items.length - DEFAULT_VISIBLE_COUNT

                                return (
                                  <>
                                    {visibleItems.map((event, i) => (
                                      <EarningsItem key={i} event={event} />
                                    ))}
                                    {hiddenCount > 0 && !isExpanded && (
                                      <button
                                        onClick={() => toggleSection(sectionKey)}
                                        className="w-full py-1 text-[10px] text-theme-accent hover:text-theme-accent/80 transition-colors"
                                      >
                                        +{hiddenCount} mehr
                                      </button>
                                    )}
                                    {isExpanded && hiddenCount > 0 && (
                                      <button
                                        onClick={() => toggleSection(sectionKey)}
                                        className="w-full py-1 text-[10px] text-theme-muted hover:text-theme-secondary transition-colors"
                                      >
                                        weniger
                                      </button>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Empty State */}
                        {dayEarnings.preMarket.length === 0 && dayEarnings.postMarket.length === 0 && (
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
                        const dayEarnings = monthGroupedEarnings[dateKey] || []
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

                            {/* Earnings for the day */}
                            {dayEarnings.length > 0 && (
                              <div className="space-y-0.5">
                                {dayEarnings.slice(0, 3).map((event, i) => (
                                  <Link
                                    key={i}
                                    href={`/analyse/stocks/${event.symbol.toLowerCase()}`}
                                    className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-theme-hover transition-colors group"
                                    title={`${event.name || event.symbol} - ${event.time === 'bmo' ? 'Vorbörslich' : 'Nachbörslich'}`}
                                  >
                                    <Logo
                                      ticker={event.symbol}
                                      alt={event.symbol}
                                      className="w-4 h-4 rounded flex-shrink-0"
                                    />
                                    <span className="text-[10px] text-theme-secondary group-hover:text-theme-accent truncate">
                                      {event.symbol}
                                    </span>
                                  </Link>
                                ))}
                                {dayEarnings.length > 3 && (
                                  <div className="text-[9px] text-theme-muted px-1">
                                    +{dayEarnings.length - 3} mehr
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
          {filteredEarnings.length} relevante Earnings {viewMode === 'week' ? 'diese Woche' : 'diesen Monat'}
          {filterWatchlist && watchlistSymbols.length > 0 && ` (aus ${watchlistSymbols.length} Watchlist-Aktien)`}
        </div>
      </div>
    </div>
  )
}

// Format Market Cap for display (German)
function formatMarketCap(marketCap: number | null): string {
  if (!marketCap) return ''
  if (marketCap >= 1e12) return `~${(marketCap / 1e12).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} Bio. $`
  if (marketCap >= 1e9) return `~${(marketCap / 1e9).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mrd. $`
  if (marketCap >= 1e6) return `~${(marketCap / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mio. $`
  return `~${marketCap.toLocaleString('de-DE')} $`
}

// Earnings Item Component
function EarningsItem({ event }: { event: EarningsEvent }) {
  const marketCapText = formatMarketCap(event.marketCap)
  const displayName = event.name && event.name !== event.symbol ? event.name : null

  return (
    <Link
      href={`/analyse/stocks/${event.symbol.toLowerCase()}`}
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-theme-hover transition-colors group"
      title={`${event.name || event.symbol}${marketCapText ? ` • MCap: ${marketCapText}` : ''}`}
    >
      <Logo
        ticker={event.symbol}
        alt={event.symbol}
        className="w-5 h-5 rounded flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-theme-primary group-hover:text-theme-accent transition-colors">
            {event.symbol}
          </span>
          {displayName && (
            <span className="text-[10px] text-theme-muted truncate">
              {displayName}
            </span>
          )}
        </div>
      </div>
      {marketCapText && (
        <span className="text-[9px] text-theme-muted whitespace-nowrap flex-shrink-0">
          {marketCapText}
        </span>
      )}
    </Link>
  )
}
