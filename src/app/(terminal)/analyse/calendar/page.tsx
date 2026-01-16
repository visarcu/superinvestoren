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
const MIN_MARKET_CAP = 5_000_000_000 // $5 Mrd. minimum Market Cap

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

export default function EarningsCalendarPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [rawEarnings, setRawEarnings] = useState<EarningsEvent[]>([]) // Alle Earnings ohne Filter
  const [loading, setLoading] = useState(true)
  const [filterWatchlist, setFilterWatchlist] = useState(false)
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([])

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

  // Format date for API
  const formatDateAPI = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // Load earnings data (alle Earnings, Filter wird später angewendet)
  useEffect(() => {
    async function loadEarnings() {
      setLoading(true)
      try {
        const from = formatDateAPI(weekDates[0])
        const to = formatDateAPI(weekDates[4])

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
  }, [weekDates])

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

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Filter earnings based on watchlist toggle
  const filteredEarnings = useMemo(() => {
    if (!filterWatchlist) return earnings
    return earnings.filter(event => watchlistSymbols.includes(event.symbol.toUpperCase()))
  }, [earnings, filterWatchlist, watchlistSymbols])

  // Group earnings by date and time, sorted by revenue
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

  // Format month/year header
  const monthYearHeader = useMemo(() => {
    const firstDate = weekDates[0]
    const lastDate = weekDates[4]

    if (firstDate.getMonth() === lastDate.getMonth()) {
      return firstDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    } else {
      return `${firstDate.toLocaleDateString('de-DE', { month: 'short' })} - ${lastDate.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}`
    }
  }, [weekDates])

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Deutsche Tagesbezeichnungen
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

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
              Large-Caps (&gt;$5 Mrd. MCap)
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
                onClick={goToPreviousWeek}
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
                onClick={goToNextWeek}
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

            {/* View Mode - Currently only Week view */}
            <div className="flex items-center gap-1 bg-theme-card border border-white/[0.04] rounded-lg p-1">
              <span className="px-3 py-1 text-xs bg-theme-hover text-theme-primary rounded">
                Woche
              </span>
            </div>
          </div>
        </div>

        {/* Week Calendar Grid */}
        <div className="bg-theme-card border border-white/[0.04] rounded-xl overflow-hidden">
          {/* Day Headers */}
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

          {/* Calendar Content */}
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
                          {dayEarnings.preMarket.map((event, i) => (
                            <EarningsItem key={i} event={event} />
                          ))}
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
                          {dayEarnings.postMarket.map((event, i) => (
                            <EarningsItem key={i} event={event} />
                          ))}
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
        </div>

        {/* Total Count */}
        <div className="mt-4 text-center text-sm text-theme-muted">
          {filteredEarnings.length} relevante Earnings diese Woche
          {filterWatchlist && watchlistSymbols.length > 0 && ` (aus ${watchlistSymbols.length} Watchlist-Aktien)`}
        </div>
      </div>
    </div>
  )
}

// Format revenue for tooltip (German)
function formatRevenue(revenue: number | null): string {
  if (!revenue) return ''
  if (revenue >= 1e9) return `~${(revenue / 1e9).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} Mrd. $`
  if (revenue >= 1e6) return `~${(revenue / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mio. $`
  return `~${revenue.toLocaleString('de-DE')} $`
}

// Earnings Item Component
function EarningsItem({ event }: { event: EarningsEvent }) {
  const revenueText = formatRevenue(event.revenueEstimate)

  return (
    <Link
      href={`/analyse/stocks/${event.symbol.toLowerCase()}`}
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-theme-hover transition-colors group"
      title={`${event.name || event.symbol}${revenueText ? ` • Revenue Est.: ${revenueText}` : ''}`}
    >
      <Logo
        ticker={event.symbol}
        alt={event.symbol}
        className="w-5 h-5 rounded flex-shrink-0"
      />
      <span className="text-xs font-medium text-theme-primary group-hover:text-theme-accent transition-colors truncate">
        {event.symbol}
      </span>
      {revenueText && (
        <span className="text-[9px] text-theme-muted ml-auto">
          {revenueText}
        </span>
      )}
    </Link>
  )
}
