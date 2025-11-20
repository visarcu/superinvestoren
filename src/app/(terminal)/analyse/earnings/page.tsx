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
      {/* Modern Header */}
      <div className="border-b border-theme/10">
        <div className="w-full px-6 lg:px-8 py-6">
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-muted hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Analyse
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 text-green-400" />
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
                  <div className="text-xs text-green-400">
                    {earningsEvents.length} anstehende Termine
                  </div>
                )}
              </div>
              
              <button
                onClick={refreshEarnings}
                disabled={earningsLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-theme-card border border-theme/10 hover:border-green-500/30 hover:bg-green-500/5 text-theme-primary rounded-lg transition-all duration-200 disabled:opacity-50"
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
            <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-2xl flex items-center justify-center mb-6">
              <BookmarkIcon className="w-10 h-10 text-green-500/60" />
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
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
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
              className="mt-8 px-6 py-3 bg-theme-card border border-theme/10 hover:border-green-500/30 hover:bg-green-500/5 text-theme-primary rounded-lg transition-all font-medium disabled:opacity-50"
            >
              {earningsLoading ? 'Lade...' : 'Erneut prüfen'}
            </button>
          </div>
        ) : (
          /* Premium Modern Earnings Layout */
          <div className="space-y-6">
            {sortedDates.map((dateString) => {
              const events = groupedEarnings[dateString]
              const date = new Date(dateString)
              const isToday = date.toDateString() === new Date().toDateString()
              const isTomorrow = date.toDateString() === new Date(Date.now() + 24*60*60*1000).toDateString()
              
              return (
                <div key={dateString} className="relative">
                  {/* Premium Date Card */}
                  <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
                    isToday ? 'border-green-400/40 bg-gradient-to-r from-green-500/10 via-green-500/5 to-green-500/5 shadow-green-500/20' : 
                    isTomorrow ? 'border-green-300/30 bg-gradient-to-r from-green-500/8 via-green-500/4 to-green-500/4 shadow-green-500/15' :
                    'border-slate-700/50 bg-gradient-to-r from-slate-800/90 via-slate-800/70 to-slate-900/60 hover:border-green-500/30'
                  }`}>
                    
                    {/* Gradient Overlay */}
                    {isToday && (
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent"></div>
                    )}
                    {isTomorrow && (
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/4 to-transparent"></div>
                    )}
                    
                    {/* Enhanced Date Header */}
                    <div className="relative z-10 p-6 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          {/* Modern Date Badge */}
                          <div className={`relative flex flex-col items-center justify-center w-16 h-16 rounded-2xl shadow-lg transform transition-transform hover:scale-105 ${
                            isToday ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' : 
                            isTomorrow ? 'bg-gradient-to-br from-green-400 to-green-500 text-white' :
                            'bg-gradient-to-br from-slate-700 to-slate-800 text-white'
                          }`}>
                            <div className="text-xl font-bold leading-none">{date.getDate()}</div>
                            <div className="text-xs font-medium uppercase tracking-wider opacity-90">
                              {date.toLocaleDateString('de-DE', { month: 'short' })}
                            </div>
                            {isToday && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          
                          {/* Date Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h3 className={`text-2xl font-bold ${
                                isToday ? 'text-green-400' : 
                                isTomorrow ? 'text-green-300' :
                                'text-theme-primary'
                              }`}>
                                {formatDate(dateString)}
                              </h3>
                              {isToday && (
                                <div className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-md">
                                  HEUTE
                                </div>
                              )}
                              {isTomorrow && (
                                <div className="px-3 py-1 bg-green-400 text-white text-xs font-bold rounded-full shadow-md">
                                  MORGEN
                                </div>
                              )}
                            </div>
                            <p className="text-theme-muted font-medium">
                              {events.length} {events.length === 1 ? 'Earnings-Report' : 'Earnings-Reports'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Event Count Badge */}
                        <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                          events.length >= 3 ? 'bg-red-500/20 text-red-400' :
                          events.length >= 2 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {events.length} Events
                        </div>
                      </div>
                    </div>
                    
                    {/* Premium Events Grid */}
                    <div className="relative z-10 px-6 pb-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {events.map((event, eventIndex) => (
                          <Link
                            key={eventIndex}
                            href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
                            className="group relative overflow-hidden bg-slate-800/80 backdrop-blur border border-slate-700/60 rounded-xl p-5 hover:border-green-500/40 hover:bg-green-500/5 hover:shadow-lg transition-all duration-300"
                          >
                            {/* Hover Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 to-green-500/0 group-hover:from-green-500/10 group-hover:to-transparent transition-all duration-300"></div>
                            
                            <div className="relative z-10 space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="relative">
                                  <Logo 
                                    ticker={event.ticker} 
                                    alt={`${event.ticker} Logo`} 
                                    className="w-14 h-14 rounded-xl shadow-md group-hover:shadow-lg transition-shadow" 
                                  />
                                  {/* Time Indicator */}
                                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800 ${
                                    event.time === 'amc' ? 'bg-orange-500' :
                                    event.time === 'bmo' ? 'bg-blue-500' :
                                    'bg-slate-500'
                                  }`}></div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">
                                    {event.ticker}
                                  </div>
                                  <div className="text-sm text-slate-300 truncate group-hover:text-slate-200">
                                    {event.companyName}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                                      event.time === 'amc' ? 'bg-orange-500/20 text-orange-400' :
                                      event.time === 'bmo' ? 'bg-blue-500/20 text-blue-400' :
                                      'bg-slate-500/20 text-slate-400'
                                    }`}>
                                      {event.time === 'amc' ? 'Nach Schluss' :
                                       event.time === 'bmo' ? 'Vor Öffnung' : 'Zeit TBD'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Earnings Estimates */}
                              {(event.estimatedEPS || event.revenueEstimated) && (
                                <div className="flex gap-3 pt-3 border-t border-slate-700/50">
                                  {event.estimatedEPS && (
                                    <div className="flex-1 text-center p-2 bg-slate-700/50 rounded-lg">
                                      <div className="text-xs text-slate-400 mb-1">EPS Schätzung</div>
                                      <div className="text-sm font-bold text-green-400">
                                        ${event.estimatedEPS.toFixed(2)}
                                      </div>
                                    </div>
                                  )}
                                  {event.revenueEstimated && (
                                    <div className="flex-1 text-center p-2 bg-slate-700/50 rounded-lg">
                                      <div className="text-xs text-slate-400 mb-1">Umsatz Schätzung</div>
                                      <div className="text-sm font-bold text-blue-400">
                                        ${(event.revenueEstimated / 1000000).toFixed(0)}M
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Modern Legend */}
            <div className="bg-gradient-to-r from-slate-800/90 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
              <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <div className="w-2 h-6 bg-gradient-to-b from-green-500 to-blue-500 rounded-full"></div>
                Zeitangaben & Schätzungen
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <div className="w-4 h-4 bg-blue-500 rounded-full shadow-md"></div>
                  <div>
                    <div className="font-bold text-blue-400">Vor Öffnung</div>
                    <div className="text-slate-400 text-sm">Vor 9:30 EST</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                  <div className="w-4 h-4 bg-orange-500 rounded-full shadow-md"></div>
                  <div>
                    <div className="font-bold text-orange-400">Nach Schluss</div>
                    <div className="text-slate-400 text-sm">Nach 16:00 EST</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-500/10 rounded-xl border border-slate-500/20">
                  <div className="w-4 h-4 bg-slate-500 rounded-full shadow-md"></div>
                  <div>
                    <div className="font-bold text-slate-400">Zeit offen</div>
                    <div className="text-slate-400 text-sm">TBD</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-sm text-slate-300 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span><strong className="text-green-400">EPS Schätzung:</strong> Erwarteter Gewinn pro Aktie</span>
                </div>
                <div className="text-sm text-slate-300 flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span><strong className="text-blue-400">Umsatz Schätzung:</strong> Erwarteter Quartalsumsatz</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}