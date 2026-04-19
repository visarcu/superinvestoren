'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import WatchlistHeader from './WatchlistHeader'
import WatchlistEmpty from './WatchlistEmpty'
import WatchlistList from './WatchlistList'
import WatchlistGrid from './WatchlistGrid'
import type {
  WatchlistItem,
  StockData,
  EarningsEvent,
  SortColumn,
  SortDirection,
  ViewMode,
} from '../_lib/types'

export default function WatchlistClient() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [stockData, setStockData] = useState<Record<string, StockData>>({})
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortColumn, setSortColumn] = useState<SortColumn>('ticker')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const router = useRouter()

  // Initial load: Auth + Watchlist + Stock-Data
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const {
          data: { session },
          error: sessionErr,
        } = await supabase.auth.getSession()

        if (sessionErr || !session?.user) {
          router.replace('/auth/signin')
          return
        }

        if (cancelled) return
        setUser({ id: session.user.id })

        const { data, error } = await supabase
          .from('watchlists')
          .select('id, ticker, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        if (cancelled) return

        if (error || !data) {
          setItems([])
          return
        }

        setItems(data)
        if (data.length > 0) {
          const tickers = data.map(d => d.ticker)
          await Promise.all([fetchStockData(tickers, cancelled), fetchEarnings(tickers, cancelled)])
        }
      } catch (err) {
        console.error('[WatchlistClient] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Stock-Daten aus eigenen v1-APIs:
  // /api/v1/quotes/batch  → Live-Kurse (Finnhub-Wrapper, später EOD austauschbar)
  // /api/v1/screener/batch → Profil + Revenue Growth aus eigenen SEC-Income-Statements
  const fetchStockData = useCallback(async (tickers: string[], cancelled = false) => {
    try {
      const [quotesRes, screenerRes] = await Promise.all([
        fetch(`/api/v1/quotes/batch?symbols=${tickers.join(',')}`),
        fetch(`/api/v1/screener/batch?symbols=${tickers.join(',')}`),
      ])

      // Screener-Map (companyName, marketCap, exchange, revenueGrowthYoY)
      const screenerMap: Record<string, any> = {}
      if (screenerRes.ok) {
        try {
          const screenerJson = await screenerRes.json()
          for (const s of screenerJson.data || []) {
            screenerMap[s.symbol] = s
          }
        } catch {
          /* ignore screener parse errors */
        }
      }

      if (!quotesRes.ok || cancelled) return
      const quotesJson = await quotesRes.json()
      const map: Record<string, StockData> = {}

      for (const q of quotesJson.quotes || []) {
        if (!q || q.error) continue
        const screener = screenerMap[q.symbol] || {}

        // 52W kommt aus dem Profile (EODHD); Volume aus dem Live-Quote (EODHD).
        // Wenn der aktive Provider nichts liefert (z.B. Finnhub Free), bleiben Felder null.
        const week52High = screener.week52High ?? 0
        const week52Low = screener.week52Low ?? 0
        const dipPercent =
          week52High > 0 && q.price ? ((q.price - week52High) / week52High) * 100 : 0

        map[q.symbol] = {
          ticker: q.symbol,
          companyName: screener.companyName ?? undefined,
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          week52High,
          week52Low,
          dipPercent,
          isDip: dipPercent <= -10,
          marketCap: screener.marketCap ?? undefined,
          volume: q.volume ?? undefined,
          peRatio: screener.peRatio ?? undefined,
          exchange: screener.exchange ?? undefined,
          currency: screener.currency ?? 'USD',
          revenueGrowthYOY: screener.revenueGrowthYoY ?? null,
        }
      }
      if (!cancelled) setStockData(map)
    } catch (err) {
      console.error('[WatchlistClient] stock data error:', err)
    }
  }, [])

  // Earnings-Termine aus eigener SecEarningsCalendar (SEC 8-K Filings).
  // Response ist nach Datum gruppiert → flatten + nach Watchlist-Tickern filtern.
  const fetchEarnings = useCallback(async (tickers: string[], cancelled = false) => {
    try {
      const startDate = new Date().toISOString().slice(0, 10)
      const end = new Date()
      end.setDate(end.getDate() + 90)
      const endDate = end.toISOString().slice(0, 10)

      const res = await fetch(`/api/v1/calendar/earnings?from=${startDate}&to=${endDate}&limit=500`)
      if (!res.ok || cancelled) return
      const data = await res.json()

      const tickerSet = new Set(tickers.map(t => t.toUpperCase()))
      const flat: EarningsEvent[] = []
      for (const day of data.dates || []) {
        for (const ev of day.events || []) {
          if (tickerSet.has(String(ev.ticker).toUpperCase())) {
            flat.push({
              symbol: ev.ticker,
              companyName: ev.company,
              date: day.date,
              time: ev.time || 'unknown', // SEC 8-K trackt keine Uhrzeit
              epsEstimate: ev.epsEstimate ?? null,
            })
          }
        }
      }
      flat.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      if (!cancelled) setEarningsEvents(flat)
    } catch (err) {
      console.error('[WatchlistClient] earnings error:', err)
    }
  }, [])

  const refresh = async () => {
    if (items.length === 0 || refreshing) return
    setRefreshing(true)
    const tickers = items.map(i => i.ticker)
    await Promise.all([fetchStockData(tickers), fetchEarnings(tickers)])
    setRefreshing(false)
  }

  const removeItem = async (id: string, ticker: string) => {
    if (!user || !confirm(`${ticker} aus der Watchlist entfernen?`)) return
    try {
      const { error } = await supabase.from('watchlists').delete().eq('id', id).eq('user_id', user.id)
      if (error) {
        console.error('[WatchlistClient] remove error:', error)
        alert('Fehler beim Entfernen')
        return
      }
      setItems(prev => prev.filter(i => i.id !== id))
      setStockData(prev => {
        const next = { ...prev }
        delete next[ticker]
        return next
      })
    } catch (err) {
      console.error('[WatchlistClient] remove unexpected:', err)
    }
  }

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(col)
      setSortDirection(col === 'ticker' ? 'asc' : 'desc')
    }
  }

  // Sortierte Items
  const sortedItems = useMemo(() => {
    const getNextEarnings = (ticker: string) => earningsEvents.find(e => e.symbol === ticker)
    return [...items].sort((a, b) => {
      const dataA = stockData[a.ticker]
      const dataB = stockData[b.ticker]
      let cmp = 0

      switch (sortColumn) {
        case 'ticker':
          cmp = a.ticker.localeCompare(b.ticker)
          break
        case 'price':
          cmp = (dataA?.price ?? 0) - (dataB?.price ?? 0)
          break
        case 'changePercent':
          cmp = (dataA?.changePercent ?? 0) - (dataB?.changePercent ?? 0)
          break
        case 'revenueGrowthYOY':
          cmp = (dataA?.revenueGrowthYOY ?? 0) - (dataB?.revenueGrowthYOY ?? 0)
          break
        case 'volume':
          cmp = (dataA?.volume ?? 0) - (dataB?.volume ?? 0)
          break
        case 'earnings': {
          const eA = getNextEarnings(a.ticker)
          const eB = getNextEarnings(b.ticker)
          if (!eA && !eB) cmp = 0
          else if (!eA) cmp = 1
          else if (!eB) cmp = -1
          else cmp = new Date(eA.date).getTime() - new Date(eB.date).getTime()
          break
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [items, stockData, sortColumn, sortDirection, earningsEvents])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060e] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06060e] text-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8 pb-32">
        <WatchlistHeader
          count={items.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRefresh={refresh}
          refreshing={refreshing}
        />

        {items.length === 0 ? (
          <WatchlistEmpty />
        ) : viewMode === 'list' ? (
          <WatchlistList
            items={sortedItems}
            stockData={stockData}
            earningsEvents={earningsEvents}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onRemove={removeItem}
          />
        ) : (
          <WatchlistGrid
            items={sortedItems}
            stockData={stockData}
            earningsEvents={earningsEvents}
            onRemove={removeItem}
          />
        )}
      </div>
    </div>
  )
}
