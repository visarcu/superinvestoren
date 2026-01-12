// Earnings Kalender - Clean Insights Style
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  CalendarIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BookmarkIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

interface WatchlistItem {
  id: string
  ticker: string
  created_at: string
}

interface EarningsEvent {
  ticker: string
  companyName: string
  date: string
  time: string
  quarter: string
  fiscalYear: string
  estimatedEPS: number | null
  actualEPS: number | null
  revenueEstimated: number | null
  revenueActual: number | null
}

export default function EarningsCalendarPage() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([])
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [earningsLoading, setEarningsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Fetch user watchlist
  useEffect(() => {
    async function fetchWatchlist() {
      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession()

        if (sessionErr) {
          console.error('Session Error:', sessionErr.message)
          router.push('/auth/signin')
          return
        }

        if (!session?.user) {
          router.push('/auth/signin')
          return
        }

        const { data, error: dbErr } = await supabase
          .from('watchlists')
          .select('id, ticker, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        if (dbErr) {
          console.error('DB Error:', dbErr.message)
          setError('Fehler beim Laden der Watchlist')
        } else {
          setWatchlistItems(data || [])
          if (data && data.length > 0) {
            loadEarningsData(data.map(item => item.ticker))
          }
        }
      } catch (error) {
        console.error('Unexpected error:', error)
        setError('Unerwarteter Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }

    fetchWatchlist()
  }, [router])

  // Load earnings data for watchlist tickers
  async function loadEarningsData(tickers: string[]) {
    if (tickers.length === 0) return

    setEarningsLoading(true)
    try {
      const response = await fetch(`/api/earnings-calendar?tickers=${tickers.join(',')}`)

      if (response.ok) {
        const events = await response.json()
        setEarningsEvents(events)
      } else {
        console.error('Failed to load earnings data')
        setError('Fehler beim Laden der Earnings-Daten')
      }
    } catch (error) {
      console.error('Error loading earnings data:', error)
      setError('Fehler beim Laden der Earnings-Daten')
    } finally {
      setEarningsLoading(false)
    }
  }

  // Refresh earnings data
  const refreshEarnings = () => {
    if (watchlistItems.length > 0) {
      loadEarningsData(watchlistItems.map(item => item.ticker))
    }
  }

  // Format functions
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
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }
  }

  // Group earnings by date
  const groupedEarnings = earningsEvents.reduce((groups, event) => {
    const date = new Date(event.date).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
    return groups
  }, {} as Record<string, EarningsEvent[]>)

  // Sort dates
  const sortedDates = Object.keys(groupedEarnings).sort((a, b) =>
    new Date(a).getTime() - new Date(b).getTime()
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-dark">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-neutral-500 text-sm">Lade Earnings Kalender...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Clean Header */}
      <div className="border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-neutral-500 hover:text-white transition-colors duration-200 mb-6 group text-sm"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Analyse
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left: Title + Subtitle */}
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-neutral-500" />
              <div>
                <h1 className="text-lg font-medium text-white">
                  Earnings Kalender
                </h1>
                <p className="text-sm text-neutral-500">
                  Anstehende Earnings für deine Watchlist
                </p>
              </div>
            </div>

            {/* Right: Stats + Legend + Refresh */}
            <div className="flex items-center gap-6">
              {/* Inline Legend */}
              <div className="hidden md:flex items-center gap-4 text-xs text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <span>Vor Öffnung</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                  <span>Nach Schluss</span>
                </div>
              </div>

              {/* Stats */}
              <div className="text-right text-sm">
                <span className="text-neutral-500">{watchlistItems.length} Aktien</span>
                {earningsEvents.length > 0 && (
                  <span className="text-emerald-400 ml-2">· {earningsEvents.length} Termine</span>
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={refreshEarnings}
                disabled={earningsLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${earningsLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm">{earningsLoading ? 'Laden...' : 'Aktualisieren'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="flex items-center gap-3 py-3 px-4 mb-6 border-l-2 border-red-500 bg-red-500/5">
            <ExclamationCircleIcon className="w-4 h-4 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Empty Watchlist State */}
        {watchlistItems.length === 0 ? (
          <div className="text-center py-16">
            <BookmarkIcon className="w-8 h-8 text-neutral-600 mx-auto mb-4" />
            <h2 className="text-white font-medium mb-2">Watchlist ist leer</h2>
            <p className="text-neutral-500 text-sm mb-6 max-w-sm mx-auto">
              Füge Aktien zu deiner Watchlist hinzu, um deren Earnings-Termine zu verfolgen.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/analyse/watchlist"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Zur Watchlist
              </Link>
              <Link
                href="/analyse"
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors text-sm"
              >
                Aktien entdecken
              </Link>
            </div>
          </div>
        ) : earningsEvents.length === 0 ? (
          /* No Earnings Found */
          <div className="text-center py-16">
            <CalendarIcon className="w-8 h-8 text-neutral-600 mx-auto mb-4" />
            <h2 className="text-white font-medium mb-2">Keine anstehenden Earnings</h2>
            <p className="text-neutral-500 text-sm mb-6 max-w-sm mx-auto">
              Für deine Watchlist-Aktien sind aktuell keine Earnings-Termine bekannt.
            </p>
            <button
              onClick={refreshEarnings}
              disabled={earningsLoading}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors text-sm disabled:opacity-50"
            >
              {earningsLoading ? 'Lade...' : 'Erneut prüfen'}
            </button>
          </div>
        ) : (
          /* Clean List-Style Earnings Layout */
          <div className="space-y-0">
            {sortedDates.map((dateString) => {
              const events = groupedEarnings[dateString]
              const date = new Date(dateString)
              const isToday = date.toDateString() === new Date().toDateString()
              const isTomorrow = date.toDateString() === new Date(Date.now() + 24*60*60*1000).toDateString()

              return (
                <div key={dateString}>
                  {/* Date Section Header */}
                  <div className="flex items-center gap-2 py-3 border-b border-neutral-800">
                    <span className={`text-sm font-medium ${
                      isToday ? 'text-emerald-400' :
                      isTomorrow ? 'text-emerald-400/70' :
                      'text-neutral-400'
                    }`}>
                      {formatDate(dateString)}
                    </span>
                    <span className="text-neutral-600 text-sm">
                      · {events.length} {events.length === 1 ? 'Earnings-Report' : 'Earnings-Reports'}
                    </span>
                  </div>

                  {/* Earnings Items as List */}
                  <div className={`${events.length > 1 ? 'grid grid-cols-1 md:grid-cols-2 gap-0' : ''}`}>
                    {events.map((event, eventIndex) => (
                      <Link
                        key={eventIndex}
                        href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
                        className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
                      >
                        {/* Left: Logo + Ticker + Name */}
                        <div className="flex items-center gap-3 min-w-0">
                          <Logo
                            ticker={event.ticker}
                            alt={`${event.ticker} Logo`}
                            className="w-8 h-8 rounded-md flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                              {event.ticker}
                            </span>
                            <span className="text-neutral-500 text-sm ml-2 truncate hidden sm:inline">
                              {event.companyName}
                            </span>
                          </div>
                        </div>

                        {/* Right: Time Badge + EPS/Revenue */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {/* EPS & Revenue Estimates */}
                          {(event.estimatedEPS || event.revenueEstimated) && (
                            <div className="hidden sm:flex items-center gap-3 text-xs">
                              {event.estimatedEPS && (
                                <span className="text-neutral-400">
                                  EPS: <span className="text-white">${event.estimatedEPS.toFixed(2)}</span>
                                </span>
                              )}
                              {event.revenueEstimated && (
                                <span className="text-neutral-500">
                                  ${(event.revenueEstimated / 1000000).toFixed(0)}M
                                </span>
                              )}
                            </div>
                          )}

                          {/* Time Badge */}
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            event.time === 'bmo'
                              ? 'text-emerald-400 bg-emerald-400/10'
                              : event.time === 'amc'
                                ? 'text-orange-400 bg-orange-400/10'
                                : 'text-neutral-500 bg-neutral-800'
                          }`}>
                            {event.time === 'bmo' ? 'Vor Öffnung' :
                             event.time === 'amc' ? 'Nach Schluss' : 'TBD'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
