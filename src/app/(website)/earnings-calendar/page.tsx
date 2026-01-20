// Öffentlicher Earnings-Kalender - Superinvestor-Style mit echtem Kalender
// /earnings-calendar
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/Logo'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface EarningsEvent {
  symbol: string
  name: string
  date: string
  time: string
  epsEstimate: number | null
  revenueEstimate: number | null
  marketCap: number | null
}

interface EconomicEvent {
  date: string
  country: string
  event: string
  impact: 'High' | 'Medium' | 'Low'
}

type ViewMode = 'week' | 'month'

// Country flag emoji mapping
const countryFlags: Record<string, string> = {
  'US': '🇺🇸',
  'EU': '🇪🇺',
  'DE': '🇩🇪',
  'UK': '🇬🇧',
  'JP': '🇯🇵',
  'CN': '🇨🇳',
}

export default function PublicEarningsCalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [rawEarnings, setRawEarnings] = useState<EarningsEvent[]>([])
  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Deutsche Tagesbezeichnungen (kurz für mobile, lang für desktop)
  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
  const dayNamesShort = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

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
  const formatDateAPI = (date: Date) => date.toISOString().split('T')[0]

  // Get date range for month view API calls
  const monthDateRange = useMemo(() => {
    if (monthDates.length === 0) return { from: '', to: '' }
    const allDates = monthDates.flat()
    return {
      from: formatDateAPI(allDates[0]),
      to: formatDateAPI(allDates[allDates.length - 1])
    }
  }, [monthDates])

  // Load earnings data
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

  // Load economic events for macro highlights (current week only)
  useEffect(() => {
    async function loadEconomicEvents() {
      try {
        const from = formatDateAPI(weekDates[0])
        const to = formatDateAPI(weekDates[4])
        const res = await fetch(`/api/economic-calendar?from=${from}&to=${to}`)
        if (res.ok) {
          const data = await res.json()
          // Filter for High impact only
          const highImpact = (data || []).filter((e: EconomicEvent) => e.impact === 'High')
          setEconomicEvents(highImpact)
        }
      } catch (error) {
        console.error('Failed to load economic events:', error)
      }
    }
    loadEconomicEvents()
  }, [weekDates])

  // Get top 3 macro events for highlights
  const macroHighlights = useMemo(() => {
    return economicEvents.slice(0, 3).map(event => {
      const dateParts = event.date.split(/[T ]/)
      const dateStr = dateParts[0]
      const date = new Date(dateStr)
      const dayName = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][date.getDay()]
      return {
        ...event,
        dayName,
        dateFormatted: `${dayName}, ${date.getDate()}.${date.getMonth() + 1}.`
      }
    })
  }, [economicEvents])

  // Filter for large-cap stocks (>$10B)
  const earnings = useMemo(() => {
    return rawEarnings.filter(event => {
      if (!event.marketCap) return false
      if (event.marketCap < 10_000_000_000) return false
      if (event.symbol.includes('.')) return false
      if (event.symbol.includes('-')) return false
      return true
    })
  }, [rawEarnings])

  // Navigate
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

  const goToToday = () => setCurrentDate(new Date())

  const goToPrevious = viewMode === 'month' ? goToPreviousMonth : goToPreviousWeek
  const goToNext = viewMode === 'month' ? goToNextMonth : goToNextWeek

  // Group earnings by date and time
  const groupedEarnings = useMemo(() => {
    const groups: Record<string, { preMarket: EarningsEvent[], postMarket: EarningsEvent[] }> = {}

    weekDates.forEach(date => {
      const dateKey = formatDateAPI(date)
      groups[dateKey] = { preMarket: [], postMarket: [] }
    })

    earnings.forEach(event => {
      const dateKey = event.date
      if (groups[dateKey]) {
        if (event.time === 'bmo') {
          groups[dateKey].preMarket.push(event)
        } else {
          groups[dateKey].postMarket.push(event)
        }
      }
    })

    // Sort by market cap
    Object.values(groups).forEach(group => {
      group.preMarket.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      group.postMarket.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    })

    return groups
  }, [earnings, weekDates])

  // Group earnings by date for month view
  const monthGroupedEarnings = useMemo(() => {
    const groups: Record<string, EarningsEvent[]> = {}
    monthDates.flat().forEach(date => {
      groups[formatDateAPI(date)] = []
    })
    earnings.forEach(event => {
      if (groups[event.date]) {
        groups[event.date].push(event)
      }
    })
    Object.values(groups).forEach(group => {
      group.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    })
    return groups
  }, [earnings, monthDates])

  // Format header
  const monthYearHeader = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    }
    const firstDate = weekDates[0]
    const lastDate = weekDates[4]
    if (firstDate.getMonth() === lastDate.getMonth()) {
      return firstDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    }
    return `${firstDate.toLocaleDateString('de-DE', { month: 'short' })} - ${lastDate.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}`
  }, [weekDates, viewMode, currentDate])

  // Check if date is today
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString()

  // Toggle expanded state
  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const DEFAULT_VISIBLE = 6

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-center text-white mb-4">
            Earnings Kalender
          </h1>

          <p className="text-lg text-neutral-400 text-center max-w-2xl mx-auto">
            Alle wichtigen Quartalszahlen der größten US-Unternehmen auf einen Blick.
            Wisse immer, wann die nächsten Earnings anstehen.
          </p>
        </div>
      </section>

      {/* Calendar Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-medium text-white">{monthYearHeader}</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevious}
                className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/5 rounded transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-2.5 py-1 text-xs text-neutral-500 hover:text-white hover:bg-white/5 rounded transition-colors"
              >
                Heute
              </button>
              <button
                onClick={goToNext}
                className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/5 rounded transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* PRO Watchlist Filter - Locked */}
            <Link
              href="/analyse/calendar"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-neutral-500 hover:bg-white/10 hover:text-neutral-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Nur Watchlist
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-medium rounded">PRO</span>
            </Link>
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                Woche
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  viewMode === 'month'
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                Monat
              </button>
            </div>
          </div>
        </div>

        {/* Macro Highlights - Only show when there are events */}
        {macroHighlights.length > 0 && (
          <div className="mb-4 p-3 bg-[#111111] border border-white/5 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                  Makro diese Woche
                </span>
                {macroHighlights.map((event, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-neutral-500">{countryFlags[event.country] || event.country}</span>
                    <span className="text-neutral-300">{event.event.length > 30 ? event.event.substring(0, 28) + '...' : event.event}</span>
                    <span className="text-neutral-600">{event.dateFormatted}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/economic-calendar"
                className="text-[10px] text-neutral-500 hover:text-white transition-colors whitespace-nowrap"
              >
                Alle Events →
              </Link>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
          {viewMode === 'week' ? (
            <>
              {/* Week View Headers */}
              <div className="grid grid-cols-5 border-b border-white/5">
                {weekDates.map((date, index) => (
                  <div
                    key={index}
                    className={`px-1 sm:px-4 py-2 sm:py-3 text-center border-r border-white/5 last:border-r-0 ${
                      isToday(date) ? 'bg-white/[0.02]' : ''
                    }`}
                  >
                    <div className="text-[10px] sm:text-xs text-neutral-500 mb-0.5 sm:mb-1">
                      <span className="sm:hidden">{dayNamesShort[index]}</span>
                      <span className="hidden sm:inline">{dayNames[index]}</span>
                    </div>
                    <div className={`text-sm sm:text-base font-medium ${
                      isToday(date) ? 'text-white' : 'text-neutral-300'
                    }`}>
                      {date.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Week View Content */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <ArrowPathIcon className="w-6 h-6 text-neutral-600 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-5 min-h-[500px]">
                  {weekDates.map((date, dayIndex) => {
                    const dateKey = formatDateAPI(date)
                    const dayEarnings = groupedEarnings[dateKey] || { preMarket: [], postMarket: [] }

                    return (
                      <div
                        key={dayIndex}
                        className={`border-r border-white/5 last:border-r-0 ${
                          isToday(date) ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        {/* Pre-Market */}
                        {dayEarnings.preMarket.length > 0 && (
                          <div className="p-1.5 sm:p-2">
                            <div className="text-[9px] sm:text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 sm:mb-2 px-1">
                              <span className="sm:hidden">BMO</span>
                              <span className="hidden sm:inline">Vorbörslich</span>
                            </div>
                            <div className="space-y-1">
                              {(() => {
                                const sectionKey = `${dateKey}-pre`
                                const isExpanded = expandedSections.has(sectionKey)
                                const items = dayEarnings.preMarket
                                const visibleItems = isExpanded ? items : items.slice(0, DEFAULT_VISIBLE)
                                const hiddenCount = items.length - DEFAULT_VISIBLE

                                return (
                                  <>
                                    {visibleItems.map((event, i) => (
                                      <EarningsItem key={i} event={event} />
                                    ))}
                                    {hiddenCount > 0 && !isExpanded && (
                                      <button
                                        onClick={() => toggleSection(sectionKey)}
                                        className="w-full py-1 text-[10px] text-neutral-500 hover:text-neutral-400 transition-colors"
                                      >
                                        +{hiddenCount} mehr
                                      </button>
                                    )}
                                    {isExpanded && hiddenCount > 0 && (
                                      <button
                                        onClick={() => toggleSection(sectionKey)}
                                        className="w-full py-1 text-[10px] text-neutral-600 hover:text-neutral-500 transition-colors"
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

                        {/* Post-Market */}
                        {dayEarnings.postMarket.length > 0 && (
                          <div className="p-1.5 sm:p-2 border-t border-white/[0.03]">
                            <div className="text-[9px] sm:text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 sm:mb-2 px-1">
                              <span className="sm:hidden">AMC</span>
                              <span className="hidden sm:inline">Nachbörslich</span>
                            </div>
                            <div className="space-y-1">
                              {(() => {
                                const sectionKey = `${dateKey}-post`
                                const isExpanded = expandedSections.has(sectionKey)
                                const items = dayEarnings.postMarket
                                const visibleItems = isExpanded ? items : items.slice(0, DEFAULT_VISIBLE)
                                const hiddenCount = items.length - DEFAULT_VISIBLE

                                return (
                                  <>
                                    {visibleItems.map((event, i) => (
                                      <EarningsItem key={i} event={event} />
                                    ))}
                                    {hiddenCount > 0 && !isExpanded && (
                                      <button
                                        onClick={() => toggleSection(sectionKey)}
                                        className="w-full py-1 text-[10px] text-neutral-500 hover:text-neutral-400 transition-colors"
                                      >
                                        +{hiddenCount} mehr
                                      </button>
                                    )}
                                    {isExpanded && hiddenCount > 0 && (
                                      <button
                                        onClick={() => toggleSection(sectionKey)}
                                        className="w-full py-1 text-[10px] text-neutral-600 hover:text-neutral-500 transition-colors"
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
                          <div className="flex items-center justify-center h-full text-neutral-700 text-xs py-20">
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
              {/* Month View Headers */}
              <div className="grid grid-cols-7 border-b border-white/5">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, index) => (
                  <div
                    key={index}
                    className="px-2 py-2 text-center border-r border-white/5 last:border-r-0"
                  >
                    <div className="text-xs text-neutral-500">{day}</div>
                  </div>
                ))}
              </div>

              {/* Month View Content */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <ArrowPathIcon className="w-6 h-6 text-neutral-600 animate-spin" />
                </div>
              ) : (
                <div>
                  {monthDates.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 border-b border-white/5 last:border-b-0">
                      {week.map((date, dayIndex) => {
                        const dateKey = formatDateAPI(date)
                        const dayEarnings = monthGroupedEarnings[dateKey] || []
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                        const isTodayDate = isToday(date)
                        const isWeekend = dayIndex >= 5

                        return (
                          <div
                            key={dayIndex}
                            className={`min-h-[100px] p-1.5 border-r border-white/5 last:border-r-0 ${
                              isTodayDate ? 'bg-white/[0.02]' : ''
                            } ${!isCurrentMonth ? 'opacity-40' : ''} ${isWeekend ? 'bg-white/[0.01]' : ''}`}
                          >
                            <div className={`text-xs font-medium mb-1 ${
                              isTodayDate
                                ? 'text-white'
                                : isCurrentMonth
                                  ? 'text-neutral-300'
                                  : 'text-neutral-600'
                            }`}>
                              {date.getDate()}
                            </div>

                            {dayEarnings.length > 0 && (
                              <div className="space-y-1 sm:space-y-0.5">
                                {dayEarnings.slice(0, 3).map((event, i) => {
                                  const shortName = event.name && event.name.length > 12
                                    ? event.name.substring(0, 10) + '...'
                                    : (event.name || event.symbol)
                                  return (
                                    <Link
                                      key={i}
                                      href={`/analyse/stocks/${event.symbol.toLowerCase()}`}
                                      className="flex items-center gap-1.5 sm:gap-1 px-1 py-1 sm:py-0.5 rounded hover:bg-white/5 transition-colors group"
                                      title={`${event.name || event.symbol} (${event.symbol}) - ${event.time === 'bmo' ? 'Vorbörslich' : 'Nachbörslich'}`}
                                    >
                                      <Logo
                                        ticker={event.symbol}
                                        alt={event.symbol}
                                        className="w-6 h-6 sm:w-5 sm:h-5 rounded flex-shrink-0"
                                      />
                                      <span className="text-[11px] sm:text-[10px] text-neutral-400 group-hover:text-white truncate">
                                        {shortName}
                                      </span>
                                    </Link>
                                  )
                                })}
                                {dayEarnings.length > 3 && (
                                  <div className="text-[10px] sm:text-[9px] text-neutral-600 px-1">
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

        {/* Powered by FinClue */}
        <div className="text-center mt-8 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
          >
            <span>Powered by</span>
            <span className="font-semibold text-neutral-400">FinClue</span>
          </Link>
        </div>

      </section>

      {/* Marketing Section - Screenshot Feature */}
      <section className="border-t border-white/5 pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Earnings verstehen. Schneller entscheiden.
            </h2>
            <p className="text-neutral-400 text-base md:text-lg max-w-2xl mx-auto">
              KI-generierte Zusammenfassungen liefern dir die wichtigsten Erkenntnisse aus jedem
              Earnings Call — klar strukturiert, auf Deutsch, in Sekunden statt Stunden.
            </p>
          </div>
        </div>

        {/* Screenshot - mit negativem margin um schwarzen Rand oben zu verstecken */}
        <div className="overflow-hidden -mt-[12%]">
          <Image
            src="/images/earnings-transcript-screenshot.png"
            alt="FinClue Earnings Transcript mit AI-Zusammenfassung"
            width={1920}
            height={1080}
            className="w-full h-auto"
            priority
          />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Earnings Transcripts</h3>
              <p className="text-neutral-400 text-sm">
                Vollständige Mitschriften aller Earnings Calls, durchsuchbar und mit KI-Zusammenfassungen.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Beat/Miss Tracking</h3>
              <p className="text-neutral-400 text-sm">
                Sieh auf einen Blick, welche Unternehmen die Erwartungen übertroffen oder verfehlt haben.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Watchlist Alerts</h3>
              <p className="text-neutral-400 text-sm">
                Erhalte Benachrichtigungen, wenn Unternehmen aus deiner Watchlist Earnings veröffentlichen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 md:p-12 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Bereit für professionelle Earnings-Analyse?
            </h3>
            <p className="text-neutral-400 mb-8 max-w-xl mx-auto">
              Starte kostenlos und erhalte Zugang zu Earnings Transcripts, KI-Zusammenfassungen
              und deinem persönlichen Earnings Kalender.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Kostenlos starten
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                href="/analyse/calendar"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white/5 text-white font-medium rounded-lg hover:bg-white/10 transition-colors border border-white/10"
              >
                Zum Terminal
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                Keine Kreditkarte erforderlich
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                Kostenloser Zugang
              </div>
              <div className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4" />
                DSGVO-konform
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Text Section */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-white mb-6">Was ist ein Earnings Kalender?</h2>
          <p className="text-neutral-400 leading-relaxed mb-8">
            Ein Earnings Kalender zeigt die Termine, an denen börsennotierte Unternehmen ihre
            Quartalszahlen veröffentlichen. Diese Quartalsberichte enthalten wichtige Kennzahlen
            wie Umsatz, Gewinn pro Aktie (EPS) und Ausblicke, die den Aktienkurs erheblich
            beeinflussen können.
          </p>

          <h3 className="text-lg font-semibold text-white mb-4">BMO vs AMC - Was bedeutet das?</h3>
          <p className="text-neutral-400 leading-relaxed mb-8">
            <strong className="text-neutral-200">BMO (Before Market Open)</strong> bedeutet, dass die
            Quartalszahlen vor Börseneröffnung veröffentlicht werden - typischerweise zwischen
            6:00 und 9:30 Uhr EST. <strong className="text-neutral-200">AMC (After Market Close)</strong>{' '}
            bedeutet, dass die Zahlen nach Börsenschluss veröffentlicht werden, meist zwischen
            16:00 und 18:00 Uhr EST.
          </p>

          <h3 className="text-lg font-semibold text-white mb-4">Warum sind Earnings wichtig?</h3>
          <p className="text-neutral-400 leading-relaxed">
            Earnings Reports sind einer der wichtigsten Katalysatoren für Kursbewegungen.
            Wenn ein Unternehmen die Erwartungen übertrifft (Beat), steigt der Kurs oft stark.
            Bei einer Verfehlung (Miss) kann es zu deutlichen Kursverlusten kommen. Professionelle
            Investoren planen ihre Trades oft um diese Termine herum.
          </p>
        </div>
      </section>

      {/* Footer Branding */}
      <div className="py-8 border-t border-white/5 text-center">
        <p className="text-sm text-neutral-600">
          Earnings-Daten bereitgestellt von FinClue · Aktualisiert: {new Date().toLocaleDateString('de-DE')}
        </p>
      </div>
    </div>
  )
}

// Earnings Item Component - Optimized for mobile
function EarningsItem({ event }: { event: EarningsEvent }) {
  // Mehr Platz für Namen ohne MarketCap
  const displayName = event.name && event.name.length > 20
    ? event.name.substring(0, 18) + '...'
    : (event.name || event.symbol)

  return (
    <Link
      href={`/analyse/stocks/${event.symbol.toLowerCase()}`}
      className="flex items-center gap-2 sm:gap-2.5 px-1.5 sm:px-2 py-2 sm:py-1.5 rounded hover:bg-white/5 transition-colors group"
      title={`${event.name || event.symbol} (${event.symbol})`}
    >
      <Logo
        ticker={event.symbol}
        alt={event.symbol}
        className="w-7 h-7 sm:w-6 sm:h-6 rounded flex-shrink-0"
      />
      <span className="text-[11px] sm:text-xs font-medium text-neutral-300 group-hover:text-white transition-colors truncate">
        {displayName}
      </span>
    </Link>
  )
}
