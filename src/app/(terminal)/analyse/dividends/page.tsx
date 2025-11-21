// Dividends Kalender - Simple Watchlist Focus
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
  ExclamationCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

interface WatchlistItem {
  id: string
  ticker: string
  created_at: string
}

interface DividendEvent {
  ticker: string
  companyName: string
  date: string
  exDate: string
  paymentDate: string
  recordDate: string
  dividend: number
  frequency: string
}

export default function DividendsCalendarPage() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([])
  const [dividendEvents, setDividendEvents] = useState<DividendEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dividendsLoading, setDividendsLoading] = useState(false)
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
          
          // Auto-load dividends if we have watchlist items
          if (data && data.length > 0) {
            fetchDividends(data.map(item => item.ticker))
          }
        }
      } catch (error) {
        console.error('Error:', error)
        setError('Unbekannter Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }

    fetchWatchlist()
  }, [router])

  // Fetch dividend events for watchlist tickers
  const fetchDividends = async (tickers: string[]) => {
    if (tickers.length === 0) {
      setDividendEvents([])
      return
    }

    setDividendsLoading(true)
    setError(null)

    try {
      const tickersParam = tickers.join(',')
      const response = await fetch(`/api/dividends-calendar?tickers=${encodeURIComponent(tickersParam)}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const events = await response.json()
      setDividendEvents(Array.isArray(events) ? events : [])
      
    } catch (error) {
      console.error('Error fetching dividends:', error)
      setError('Fehler beim Laden der Dividenden-Termine')
      setDividendEvents([])
    } finally {
      setDividendsLoading(false)
    }
  }

  // Group events by payment date for display (more relevant for investors)
  const groupedEvents = dividendEvents.reduce((groups, event) => {
    const date = event.paymentDate
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(event)
    return groups
  }, {} as Record<string, DividendEvent[]>)

  const sortedDates = Object.keys(groupedEvents).sort()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 3
    }).format(amount)
  }

  const isUpcoming = (dateStr: string) => {
    const eventDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return eventDate >= today
  }

  const upcomingEvents = sortedDates.filter(date => isUpcoming(date))
  const pastEvents = sortedDates.filter(date => !isUpcoming(date)).reverse()

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <header className="bg-theme-card border-b border-theme/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Link href="/analyse" className="text-theme-secondary hover:text-theme-primary transition-colors">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <Logo className="h-6" />
            <div>
              <h1 className="text-lg font-semibold text-theme-primary">Dividenden-Kalender</h1>
              <p className="text-sm text-theme-secondary">
                {watchlistItems.length} Aktien in deiner Watchlist
              </p>
            </div>
          </div>
          
          <button
            onClick={() => fetchDividends(watchlistItems.map(item => item.ticker))}
            disabled={dividendsLoading || watchlistItems.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-lg 
                     hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 ${dividendsLoading ? 'animate-spin' : ''}`} />
            <span>Aktualisieren</span>
          </button>
        </div>
      </header>

      <div className="p-6">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-theme-secondary mx-auto mb-4" />
            <p className="text-theme-secondary">Lade Watchlist...</p>
          </div>
        )}

        {/* Empty Watchlist */}
        {!loading && watchlistItems.length === 0 && (
          <div className="text-center py-12">
            <BookmarkIcon className="h-12 w-12 text-theme-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-theme-primary mb-2">
              Keine Watchlist-Einträge
            </h3>
            <p className="text-theme-secondary mb-6">
              Füge Aktien zu deiner Watchlist hinzu, um Dividenden-Termine zu sehen.
            </p>
            <Link
              href="/analyse/watchlist"
              className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <BookmarkIcon className="h-4 w-4 mr-2" />
              Zur Watchlist
            </Link>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
              <span className="text-red-400 font-medium">Fehler</span>
            </div>
            <p className="text-red-300 mt-1">{error}</p>
          </div>
        )}

        {/* Dividends Loading */}
        {dividendsLoading && watchlistItems.length > 0 && (
          <div className="text-center py-8">
            <ArrowPathIcon className="h-6 w-6 animate-spin text-theme-secondary mx-auto mb-2" />
            <p className="text-theme-secondary">Lade Dividenden-Termine...</p>
          </div>
        )}

        {/* Main Content */}
        {!loading && !dividendsLoading && watchlistItems.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-theme-card rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-theme-secondary text-sm">Kommende Dividenden</p>
                    <p className="text-theme-primary text-lg font-semibold">
                      {upcomingEvents.reduce((sum, date) => sum + groupedEvents[date].length, 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-theme-card rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-theme-secondary text-sm">Termine insgesamt</p>
                    <p className="text-theme-primary text-lg font-semibold">{dividendEvents.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-theme-card rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <BookmarkIcon className="h-8 w-8 text-purple-400" />
                  <div>
                    <p className="text-theme-secondary text-sm">Watchlist Aktien</p>
                    <p className="text-theme-primary text-lg font-semibold">{watchlistItems.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* No Dividend Events */}
            {dividendEvents.length === 0 && (
              <div className="text-center py-8">
                <CurrencyDollarIcon className="h-12 w-12 text-theme-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-theme-primary mb-2">
                  Keine Dividenden-Termine gefunden
                </h3>
                <p className="text-theme-secondary">
                  Für die Aktien in deiner Watchlist wurden keine aktuellen Dividenden-Termine gefunden.
                </p>
              </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-theme-primary mb-4 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-green-400" />
                  Kommende Dividenden
                </h2>
                
                <div className="space-y-4">
                  {upcomingEvents.map(date => (
                    <div key={date} className="bg-theme-card rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-theme-primary">{formatDate(date)}</h3>
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          Zahlung
                        </span>
                      </div>
                      
                      <div className="grid gap-3">
                        {groupedEvents[date].map((event, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-theme-hover rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Link
                                href={`/analyse/stocks/${event.ticker}`}
                                className="font-mono font-medium text-green-400 hover:text-green-300 transition-colors"
                              >
                                {event.ticker}
                              </Link>
                              <div>
                                <p className="text-theme-primary text-sm">{event.companyName}</p>
                                <p className="text-theme-muted text-xs">{event.frequency}</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-theme-primary font-medium">{formatCurrency(event.dividend)}</p>
                              <p className="text-theme-muted text-xs">
                                Ex-Date: {formatDate(event.exDate)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-theme-primary mb-4 flex items-center">
                  <CalendarIcon className="h-5 w-5 mr-2 text-theme-secondary" />
                  Vergangene Dividenden
                </h2>
                
                <div className="space-y-4">
                  {pastEvents.slice(0, 10).map(date => (
                    <div key={date} className="bg-theme-card rounded-lg p-4 opacity-75">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-theme-secondary">{formatDate(date)}</h3>
                        <span className="text-xs bg-theme-secondary/20 text-theme-secondary px-2 py-1 rounded">
                          Vergangen
                        </span>
                      </div>
                      
                      <div className="grid gap-3">
                        {groupedEvents[date].map((event, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-theme-hover rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Link
                                href={`/analyse/stocks/${event.ticker}`}
                                className="font-mono font-medium text-theme-secondary hover:text-theme-primary transition-colors"
                              >
                                {event.ticker}
                              </Link>
                              <div>
                                <p className="text-theme-secondary text-sm">{event.companyName}</p>
                                <p className="text-theme-muted text-xs">{event.frequency}</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-theme-secondary font-medium">{formatCurrency(event.dividend)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}