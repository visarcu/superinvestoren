// Öffentlicher Earnings-Kalender - SEO Landing Page mit Live-Daten
// /earnings-calendar
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import {
  CalendarIcon,
  ChartBarIcon,
  BellAlertIcon,
  ArrowRightIcon,
  SparklesIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface EarningsEvent {
  ticker: string
  companyName: string
  date: string
  time: string
  quarter: string
  fiscalYear: string
  estimatedEPS: number | null
  actualEPS: number | null
  marketCap?: number
}

// Gruppiere Events nach Woche
function groupByWeek(events: EarningsEvent[]): { thisWeek: EarningsEvent[], nextWeek: EarningsEvent[] } {
  const now = new Date()
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - now.getDay() + 1) // Montag dieser Woche
  startOfThisWeek.setHours(0, 0, 0, 0)

  const startOfNextWeek = new Date(startOfThisWeek)
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7)

  const endOfNextWeek = new Date(startOfNextWeek)
  endOfNextWeek.setDate(endOfNextWeek.getDate() + 7)

  const thisWeek: EarningsEvent[] = []
  const nextWeek: EarningsEvent[] = []

  events.forEach(event => {
    const eventDate = new Date(event.date)
    if (eventDate >= startOfThisWeek && eventDate < startOfNextWeek) {
      thisWeek.push(event)
    } else if (eventDate >= startOfNextWeek && eventDate < endOfNextWeek) {
      nextWeek.push(event)
    }
  })

  return { thisWeek, nextWeek }
}

// Gruppiere nach Tag
function groupByDate(events: EarningsEvent[]): Record<string, EarningsEvent[]> {
  return events.reduce((groups, event) => {
    const date = event.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
    return groups
  }, {} as Record<string, EarningsEvent[]>)
}

export default function PublicEarningsCalendarPage() {
  const [events, setEvents] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadEarnings() {
      try {
        const response = await fetch('/api/earnings-calendar-all?minMarketCap=10000000000&limit=100')
        if (response.ok) {
          const data = await response.json()
          setEvents(data)
        } else {
          setError('Fehler beim Laden der Earnings-Daten')
        }
      } catch (err) {
        setError('Fehler beim Laden der Earnings-Daten')
      } finally {
        setLoading(false)
      }
    }
    loadEarnings()
  }, [])

  const { thisWeek, nextWeek } = groupByWeek(events)

  // Format Datum
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Heute'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen'
    } else {
      return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
    }
  }

  // Format Market Cap
  const formatMarketCap = (cap: number) => {
    if (cap >= 1000000000000) return `$${(cap / 1000000000000).toFixed(1)}T`
    if (cap >= 1000000000) return `$${(cap / 1000000000).toFixed(0)}B`
    return `$${(cap / 1000000).toFixed(0)}M`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section - Marketing */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <SparklesIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Live-Daten</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-white mb-6">
            Earnings Kalender
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 text-center max-w-2xl mx-auto mb-8">
            Alle wichtigen Quartalszahlen der größten US-Unternehmen auf einen Blick.
            Verpasse keine Earnings mehr.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 rounded-full text-sm text-neutral-300">
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
              Wöchentlich aktualisiert
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 rounded-full text-sm text-neutral-300">
              <ChartBarIcon className="w-4 h-4 text-emerald-400" />
              EPS-Schätzungen
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 rounded-full text-sm text-neutral-300">
              <BellAlertIcon className="w-4 h-4 text-emerald-400" />
              Vor/Nach Börse
            </div>
          </div>
        </div>
      </section>

      {/* Calendar Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Legend */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6 text-sm text-neutral-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
              <span>Vor Öffnung (BMO)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span>Nach Schluss (AMC)</span>
            </div>
          </div>
          {loading && (
            <ArrowPathIcon className="w-5 h-5 text-neutral-500 animate-spin" />
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-neutral-800 rounded w-32 mb-3"></div>
                <div className="space-y-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3 py-3 border-b border-neutral-800/50">
                      <div className="w-10 h-10 bg-neutral-800 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-neutral-800 rounded w-20 mb-1"></div>
                        <div className="h-3 bg-neutral-800 rounded w-32"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-emerald-400 hover:text-emerald-300"
            >
              Erneut versuchen
            </button>
          </div>
        )}

        {/* This Week */}
        {!loading && !error && (
          <div className="space-y-8">
            {/* Diese Woche */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
                Diese Woche
              </h2>

              {thisWeek.length === 0 ? (
                <p className="text-neutral-500 py-4">Keine Earnings diese Woche</p>
              ) : (
                <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
                  {Object.entries(groupByDate(thisWeek))
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, dayEvents]) => (
                      <div key={date}>
                        {/* Date Header */}
                        <div className="px-4 py-2 bg-neutral-800/50 border-b border-neutral-800">
                          <span className="text-sm font-medium text-emerald-400">
                            {formatDate(date)}
                          </span>
                          <span className="text-neutral-500 text-sm ml-2">
                            · {dayEvents.length} Earnings
                          </span>
                        </div>

                        {/* Events */}
                        <div className="divide-y divide-neutral-800/50">
                          {dayEvents.map((event, idx) => (
                            <div
                              key={`${event.ticker}-${idx}`}
                              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-800/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Logo
                                  ticker={event.ticker}
                                  alt={event.ticker}
                                  className="w-10 h-10 rounded-lg"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{event.ticker}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      event.time === 'bmo'
                                        ? 'bg-emerald-400/10 text-emerald-400'
                                        : 'bg-orange-400/10 text-orange-400'
                                    }`}>
                                      {event.time === 'bmo' ? 'BMO' : 'AMC'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-neutral-500 truncate max-w-[200px] sm:max-w-none">
                                    {event.companyName}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-right">
                                {event.estimatedEPS && (
                                  <div className="hidden sm:block">
                                    <p className="text-xs text-neutral-500">EPS Est.</p>
                                    <p className="text-sm text-white">${event.estimatedEPS.toFixed(2)}</p>
                                  </div>
                                )}
                                {event.marketCap && event.marketCap > 0 && (
                                  <div className="hidden md:block">
                                    <p className="text-xs text-neutral-500">Market Cap</p>
                                    <p className="text-sm text-neutral-300">{formatMarketCap(event.marketCap)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Nächste Woche */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-neutral-400" />
                Nächste Woche
              </h2>

              {nextWeek.length === 0 ? (
                <p className="text-neutral-500 py-4">Noch keine Earnings für nächste Woche bekannt</p>
              ) : (
                <div className="bg-neutral-900/50 rounded-xl border border-neutral-800 overflow-hidden">
                  {Object.entries(groupByDate(nextWeek))
                    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                    .map(([date, dayEvents]) => (
                      <div key={date}>
                        {/* Date Header */}
                        <div className="px-4 py-2 bg-neutral-800/50 border-b border-neutral-800">
                          <span className="text-sm font-medium text-neutral-300">
                            {formatDate(date)}
                          </span>
                          <span className="text-neutral-500 text-sm ml-2">
                            · {dayEvents.length} Earnings
                          </span>
                        </div>

                        {/* Events */}
                        <div className="divide-y divide-neutral-800/50">
                          {dayEvents.map((event, idx) => (
                            <div
                              key={`${event.ticker}-${idx}`}
                              className="flex items-center justify-between px-4 py-3 hover:bg-neutral-800/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Logo
                                  ticker={event.ticker}
                                  alt={event.ticker}
                                  className="w-10 h-10 rounded-lg"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{event.ticker}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      event.time === 'bmo'
                                        ? 'bg-emerald-400/10 text-emerald-400'
                                        : 'bg-orange-400/10 text-orange-400'
                                    }`}>
                                      {event.time === 'bmo' ? 'BMO' : 'AMC'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-neutral-500 truncate max-w-[200px] sm:max-w-none">
                                    {event.companyName}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 text-right">
                                {event.estimatedEPS && (
                                  <div className="hidden sm:block">
                                    <p className="text-xs text-neutral-500">EPS Est.</p>
                                    <p className="text-sm text-white">${event.estimatedEPS.toFixed(2)}</p>
                                  </div>
                                )}
                                {event.marketCap && event.marketCap > 0 && (
                                  <div className="hidden md:block">
                                    <p className="text-xs text-neutral-500">Market Cap</p>
                                    <p className="text-sm text-neutral-300">{formatMarketCap(event.marketCap)}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 p-6 md:p-8 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 rounded-2xl border border-emerald-500/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Mehr Earnings-Features
              </h3>
              <p className="text-neutral-400">
                Persönliche Watchlist, Earnings-Alerts und historische Daten
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-neutral-300">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  Earnings für deine Watchlist-Aktien
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-300">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  Beat/Miss Analyse und Historische Daten
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-300">
                  <CheckIcon className="w-4 h-4 text-emerald-400" />
                  Earnings Call Transcripts
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
              >
                Kostenlos starten
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                href="/analyse/earnings"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg transition-colors"
              >
                Zum Terminal
              </Link>
            </div>
          </div>
        </div>

        {/* SEO Text Section */}
        <div className="mt-16 prose prose-invert max-w-none">
          <h2 className="text-2xl font-semibold text-white mb-4">Was ist ein Earnings Kalender?</h2>
          <p className="text-neutral-400 leading-relaxed mb-6">
            Ein Earnings Kalender zeigt die Termine, an denen börsennotierte Unternehmen ihre
            Quartalszahlen veröffentlichen. Diese Quartalsberichte enthalten wichtige Kennzahlen
            wie Umsatz, Gewinn pro Aktie (EPS) und Ausblicke, die den Aktienkurs erheblich
            beeinflussen können.
          </p>

          <h3 className="text-xl font-semibold text-white mb-3">BMO vs AMC - Was bedeutet das?</h3>
          <p className="text-neutral-400 leading-relaxed mb-6">
            <strong className="text-white">BMO (Before Market Open)</strong> bedeutet, dass die
            Quartalszahlen vor Börseneröffnung veröffentlicht werden - typischerweise zwischen
            6:00 und 9:30 Uhr EST. <strong className="text-white">AMC (After Market Close)</strong>
            bedeutet, dass die Zahlen nach Börsenschluss veröffentlicht werden, meist zwischen
            16:00 und 18:00 Uhr EST.
          </p>

          <h3 className="text-xl font-semibold text-white mb-3">Warum sind Earnings wichtig?</h3>
          <p className="text-neutral-400 leading-relaxed">
            Earnings Reports sind einer der wichtigsten Katalysatoren für Kursbewegungen.
            Wenn ein Unternehmen die Erwartungen übertrifft (Beat), steigt der Kurs oft stark.
            Bei einer Verfehlung (Miss) kann es zu deutlichen Kursverlusten kommen. Professionelle
            Investoren planen ihre Trades oft um diese Termine herum.
          </p>
        </div>

        {/* Branding Footer */}
        <div className="mt-12 pt-8 border-t border-neutral-800 text-center">
          <p className="text-sm text-neutral-500">
            Earnings-Daten bereitgestellt von FinClue · Letzte Aktualisierung: {new Date().toLocaleDateString('de-DE')}
          </p>
        </div>
      </section>
    </div>
  )
}
