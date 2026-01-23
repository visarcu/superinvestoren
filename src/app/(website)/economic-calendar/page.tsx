// Öffentlicher Wirtschaftskalender - Wichtige Makro-Termine
// /economic-calendar
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

interface EconomicEvent {
  date: string
  country: string
  event: string
  impact: 'High' | 'Medium' | 'Low'
  actual: number | null
  previous: number | null
  estimate: number | null
  unit: string | null
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
  'CA': '🇨🇦',
  'AU': '🇦🇺',
  'CH': '🇨🇭',
  'FR': '🇫🇷',
}

// Impact color mapping
const impactColors: Record<string, { bg: string; text: string; dot: string }> = {
  'High': { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
  'Medium': { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' },
  'Low': { bg: 'bg-neutral-500/10', text: 'text-neutral-400', dot: 'bg-neutral-500' },
}

export default function EconomicCalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [showOnlyImportant, setShowOnlyImportant] = useState(true)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
  const dayNamesShort = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  // Get week dates (Mo-So)
  const weekDates = useMemo(() => {
    const dates: Date[] = []
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = day === 0 ? -6 : 1 - day
    startOfWeek.setDate(startOfWeek.getDate() + diff)

    for (let i = 0; i < 7; i++) {
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

  const formatDateAPI = (date: Date) => date.toISOString().split('T')[0]

  const monthDateRange = useMemo(() => {
    if (monthDates.length === 0) return { from: '', to: '' }
    const allDates = monthDates.flat()
    return {
      from: formatDateAPI(allDates[0]),
      to: formatDateAPI(allDates[allDates.length - 1])
    }
  }, [monthDates])

  // Load economic data
  useEffect(() => {
    async function loadEvents() {
      setLoading(true)
      try {
        let from: string, to: string

        if (viewMode === 'month') {
          from = monthDateRange.from
          to = monthDateRange.to
        } else {
          from = formatDateAPI(weekDates[0])
          to = formatDateAPI(weekDates[6])
        }

        if (!from || !to) return

        const res = await fetch(`/api/economic-calendar?from=${from}&to=${to}`)
        if (res.ok) {
          const data = await res.json()
          setEvents(data || [])
        }
      } catch (error) {
        console.error('Failed to load economic events:', error)
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [weekDates, monthDateRange, viewMode])

  // Filter events by country and importance
  const filteredEvents = useMemo(() => {
    let filtered = events
    if (showOnlyImportant) {
      filtered = filtered.filter(e => e.impact === 'High')
    }
    if (selectedCountry) {
      filtered = filtered.filter(e => e.country === selectedCountry)
    }
    return filtered
  }, [events, selectedCountry, showOnlyImportant])

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

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, EconomicEvent[]> = {}

    weekDates.forEach(date => {
      const dateKey = formatDateAPI(date)
      groups[dateKey] = []
    })

    filteredEvents.forEach(event => {
      // Handle both "2026-01-19T09:00:00" and "2026-01-19 09:00:00" formats
      const dateKey = event.date.split(/[T ]/)[0]
      if (groups[dateKey]) {
        groups[dateKey].push(event)
      }
    })

    // Sort by impact (High first) then by time
    Object.values(groups).forEach(group => {
      group.sort((a, b) => {
        const impactOrder = { 'High': 0, 'Medium': 1, 'Low': 2 }
        if (impactOrder[a.impact] !== impactOrder[b.impact]) {
          return impactOrder[a.impact] - impactOrder[b.impact]
        }
        return a.date.localeCompare(b.date)
      })
    })

    return groups
  }, [filteredEvents, weekDates])

  // Group for month view
  const monthGroupedEvents = useMemo(() => {
    const groups: Record<string, EconomicEvent[]> = {}
    monthDates.flat().forEach(date => {
      groups[formatDateAPI(date)] = []
    })
    filteredEvents.forEach(event => {
      // Handle both "2026-01-19T09:00:00" and "2026-01-19 09:00:00" formats
      const dateKey = event.date.split(/[T ]/)[0]
      if (groups[dateKey]) {
        groups[dateKey].push(event)
      }
    })
    Object.values(groups).forEach(group => {
      group.sort((a, b) => {
        const impactOrder = { 'High': 0, 'Medium': 1, 'Low': 2 }
        return impactOrder[a.impact] - impactOrder[b.impact]
      })
    })
    return groups
  }, [filteredEvents, monthDates])

  // Format header
  const monthYearHeader = useMemo(() => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    }
    const firstDate = weekDates[0]
    const lastDate = weekDates[6]
    if (firstDate.getMonth() === lastDate.getMonth()) {
      return firstDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    }
    return `${firstDate.toLocaleDateString('de-DE', { month: 'short' })} - ${lastDate.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}`
  }, [weekDates, viewMode, currentDate])

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString()

  // Get unique countries for filter
  const availableCountries = useMemo(() => {
    const countries = new Set(events.map(e => e.country))
    return Array.from(countries).sort()
  }, [events])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-center text-white mb-4">
            Wirtschaftskalender
          </h1>

          <p className="text-lg text-neutral-400 text-center max-w-2xl mx-auto">
            Wichtige Wirtschaftstermine und Makro-Events im Überblick.
            Fed-Entscheidungen, CPI, Arbeitsmarktdaten und mehr.
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
            {/* Importance Filter */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setShowOnlyImportant(true)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  showOnlyImportant
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                Wichtig
              </button>
              <button
                onClick={() => setShowOnlyImportant(false)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  !showOnlyImportant
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                Alle
              </button>
            </div>

            {/* Country Filter */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setSelectedCountry(null)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  selectedCountry === null
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-500 hover:text-white'
                }`}
              >
                🌍
              </button>
              {availableCountries.slice(0, 5).map(country => (
                <button
                  key={country}
                  onClick={() => setSelectedCountry(country === selectedCountry ? null : country)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedCountry === country
                      ? 'bg-white/10 text-white'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                  title={country}
                >
                  {countryFlags[country] || country}
                </button>
              ))}
            </div>

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

        {/* Impact Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-neutral-400">Hoch</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-neutral-400">Mittel</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
          {viewMode === 'week' ? (
            <>
              {/* Week View Headers */}
              <div className="grid grid-cols-7 border-b border-white/5">
                {weekDates.map((date, index) => (
                  <div
                    key={index}
                    className={`px-1 sm:px-3 py-2 sm:py-3 text-center border-r border-white/5 last:border-r-0 ${
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
                <div className="grid grid-cols-7 min-h-[400px]">
                  {weekDates.map((date, dayIndex) => {
                    const dateKey = formatDateAPI(date)
                    const dayEvents = groupedEvents[dateKey] || []
                    const maxVisible = 5
                    const isExpanded = expandedDays.has(dateKey)
                    const visibleEvents = isExpanded ? dayEvents : dayEvents.slice(0, maxVisible)
                    const hiddenCount = dayEvents.length - maxVisible

                    return (
                      <div
                        key={dayIndex}
                        className={`border-r border-white/5 last:border-r-0 ${
                          isToday(date) ? 'bg-white/[0.02]' : ''
                        }`}
                      >
                        {dayEvents.length > 0 ? (
                          <div className="p-1.5 sm:p-2 space-y-1">
                            {visibleEvents.map((event, i) => (
                              <EconomicEventItem key={i} event={event} />
                            ))}
                            {hiddenCount > 0 && !isExpanded && (
                              <button
                                onClick={() => setExpandedDays(prev => new Set([...prev, dateKey]))}
                                className="w-full text-[10px] text-neutral-500 hover:text-white py-1 transition-colors"
                              >
                                +{hiddenCount} mehr
                              </button>
                            )}
                            {isExpanded && hiddenCount > 0 && (
                              <button
                                onClick={() => setExpandedDays(prev => {
                                  const next = new Set(prev)
                                  next.delete(dateKey)
                                  return next
                                })}
                                className="w-full text-[10px] text-neutral-500 hover:text-white py-1 transition-colors"
                              >
                                weniger
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-neutral-700 text-xs">
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
                        const dayEvents = monthGroupedEvents[dateKey] || []
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                        const isTodayDate = isToday(date)
                        const isWeekend = dayIndex >= 5

                        return (
                          <div
                            key={dayIndex}
                            className={`min-h-[100px] p-2 border-r border-white/5 last:border-r-0 ${
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

                            {dayEvents.length > 0 && (
                              <div className="space-y-0.5">
                                {dayEvents.slice(0, 3).map((event, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center gap-1 text-[10px]"
                                    title={`${event.event} (${event.impact})`}
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${impactColors[event.impact].dot}`} />
                                    <span className="text-neutral-400 truncate">
                                      {countryFlags[event.country] || event.country}
                                    </span>
                                  </div>
                                ))}
                                {dayEvents.length > 3 && (
                                  <div className="text-[9px] text-neutral-600 pl-2.5">
                                    +{dayEvents.length - 3} mehr
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

        {/* Stats */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-neutral-500">
          <span>{filteredEvents.length} Events diese {viewMode === 'week' ? 'Woche' : 'Monat'}</span>
          <span>{filteredEvents.filter(e => e.impact === 'High').length} wichtige Termine</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-neutral-600">
            Powered by <Link href="/" className="text-neutral-400 hover:text-white transition-colors">Finclue</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}

// Economic Event Item Component - Simplified design
function EconomicEventItem({ event }: { event: EconomicEvent }) {
  const colors = impactColors[event.impact] || impactColors['Low']
  // Extract time from "2026-01-19T09:00:00" or "2026-01-19 09:00:00"
  const timeParts = event.date.split(/[T ]/)
  const time = timeParts.length > 1 ? timeParts[1].substring(0, 5) : ''

  return (
    <div
      className="group flex items-start gap-1.5 px-1 py-0.5 rounded hover:bg-white/5 transition-colors cursor-default"
      title={`${event.event}\n\nZeit: ${time} Uhr\nLand: ${event.country}\nWichtigkeit: ${event.impact}\n${event.previous !== null ? `Vorher: ${event.previous}` : ''}${event.estimate !== null ? `\nErwartet: ${event.estimate}` : ''}${event.actual !== null ? `\nAktuell: ${event.actual}` : ''}`}
    >
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${colors.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-neutral-500">{countryFlags[event.country] || event.country}</span>
          {time && <span className="text-[10px] text-neutral-600">{time}</span>}
        </div>
        <div className="text-xs text-neutral-300 truncate">
          {event.event.length > 40 ? event.event.substring(0, 40) + '...' : event.event}
        </div>
      </div>
    </div>
  )
}
