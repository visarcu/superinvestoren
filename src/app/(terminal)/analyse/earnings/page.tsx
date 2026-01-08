// Earnings Kalender - Simple Watchlist Focus
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
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
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
      <div className="min-h-screen bg-theme-primary">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-theme-secondary">Lade Earnings Kalender...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Clean Header */}
      <div className="border-b border-theme/10">
        <div className="w-full px-6 lg:px-8 py-6">
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-muted hover:text-brand-light transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Analyse
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/20 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-brand-light" />
                </div>
                <h1 className="text-2xl font-bold text-theme-primary">
                  Earnings Kalender
                </h1>
              </div>
              <p className="text-sm text-theme-muted ml-13">
                Anstehende Earnings für deine Watchlist-Aktien
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-theme-muted">
                  {watchlistItems.length} {watchlistItems.length === 1 ? 'Aktie' : 'Aktien'} verfolgt
                </div>
                {earningsEvents.length > 0 && (
                  <div className="text-xs text-brand-light">
                    {earningsEvents.length} anstehende Termine
                  </div>
                )}
              </div>
              
              <button
                onClick={refreshEarnings}
                disabled={earningsLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-theme-card border border-theme/10 hover:border-green-500/30 hover:bg-brand/5 text-theme-primary rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${earningsLoading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">
                  {earningsLoading ? 'Laden...' : 'Aktualisieren'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full px-6 lg:px-8 py-6 space-y-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Empty Watchlist State */}
        {watchlistItems.length === 0 ? (
          <div className="bg-theme-card border border-theme/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-brand/10 rounded-2xl flex items-center justify-center mb-6">
              <BookmarkIcon className="w-10 h-10 text-brand/60" />
            </div>
            
            <div className="space-y-3 max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-theme-primary">
                Watchlist ist leer
              </h2>
              <p className="text-theme-muted text-sm leading-relaxed">
                Füge Aktien zu deiner Watchlist hinzu, um deren Earnings-Termine zu verfolgen.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link
                href="/analyse/watchlist"
                className="px-6 py-3 bg-brand hover:bg-brand text-white rounded-lg transition-colors font-medium"
              >
                Zur Watchlist
              </Link>
              <Link
                href="/analyse"
                className="px-6 py-3 bg-theme-card border border-theme/10 text-theme-muted hover:bg-theme-hover hover:text-theme-primary rounded-lg transition-colors font-medium"
              >
                Aktien entdecken
              </Link>
            </div>
          </div>
        ) : earningsEvents.length === 0 ? (
          /* No Earnings Found */
          <div className="bg-theme-card border border-theme/10 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
              <CalendarIcon className="w-10 h-10 text-blue-500/60" />
            </div>
            
            <div className="space-y-3 max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-theme-primary">
                Keine anstehenden Earnings
              </h2>
              <p className="text-theme-muted text-sm leading-relaxed">
                Für deine Watchlist-Aktien sind aktuell keine Earnings-Termine in den nächsten Wochen bekannt.
              </p>
            </div>
            
            <button
              onClick={refreshEarnings}
              disabled={earningsLoading}
              className="mt-8 px-6 py-3 bg-theme-card border border-theme/10 hover:border-green-500/30 hover:bg-brand/5 text-theme-primary rounded-lg transition-all font-medium disabled:opacity-50"
            >
              {earningsLoading ? 'Lade...' : 'Erneut prüfen'}
            </button>
          </div>
        ) : (
          /* Clean Fiscal-Style Earnings Layout */
          <div className="space-y-6">
            {sortedDates.map((dateString) => {
              const events = groupedEarnings[dateString]
              const date = new Date(dateString)
              const isToday = date.toDateString() === new Date().toDateString()
              const isTomorrow = date.toDateString() === new Date(Date.now() + 24*60*60*1000).toDateString()
              
              return (
                <div key={dateString}>
                  {/* Clean Date Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        isToday ? 'bg-brand/20 text-brand-light' : 
                        isTomorrow ? 'bg-brand/10 text-green-300' :
                        'bg-theme-secondary/20 text-theme-muted'
                      }`}>
                        {formatDate(dateString)}
                      </div>
                      <span className="text-theme-muted text-sm">
                        {events.length} {events.length === 1 ? 'Earnings-Report' : 'Earnings-Reports'}
                      </span>
                    </div>
                    <div className="text-xs text-theme-muted">
                      {date.toLocaleDateString('de-DE', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: 'short' 
                      })}
                    </div>
                  </div>

                  {/* Clean Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                    {events.map((event, eventIndex) => (
                      <Link
                        key={eventIndex}
                        href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
                        className="block bg-theme-card border border-theme/10 rounded-lg p-4 hover:border-green-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Logo 
                            ticker={event.ticker} 
                            alt={`${event.ticker} Logo`} 
                            className="w-10 h-10 rounded-lg" 
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-theme-primary">
                              {event.ticker}
                            </div>
                            <div className="text-sm text-theme-muted truncate">
                              {event.companyName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs px-2 py-1 rounded ${
                              event.time === 'amc' ? 'bg-orange-500/20 text-orange-400' :
                              event.time === 'bmo' ? 'bg-brand/20 text-brand-light' :
                              'bg-theme-secondary/20 text-theme-muted'
                            }`}>
                              {event.time === 'amc' ? 'Nach Schluss' :
                               event.time === 'bmo' ? 'Vor Öffnung' : 'Zeit TBD'}
                            </div>
                            {(event.estimatedEPS || event.revenueEstimated) && (
                              <div className="flex gap-2 mt-1">
                                {event.estimatedEPS && (
                                  <div className="text-xs text-brand-light">
                                    EPS: ${event.estimatedEPS.toFixed(2)}
                                  </div>
                                )}
                                {event.revenueEstimated && (
                                  <div className="text-xs text-theme-muted">
                                    ${(event.revenueEstimated / 1000000).toFixed(0)}M
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Simple Legend */}
            <div className="bg-theme-card border border-theme/10 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-theme-primary mb-3">Zeitangaben</h4>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand rounded-full"></div>
                  <span className="text-theme-muted">Vor Öffnung</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-theme-muted">Nach Schluss</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-theme-muted rounded-full"></div>
                  <span className="text-theme-muted">Zeit offen</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}