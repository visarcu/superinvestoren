'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { hasPremiumAccess } from '@/lib/premiumAccess'
import WatchlistHeader from './WatchlistHeader'
import WatchlistEmpty from './WatchlistEmpty'
import WatchlistList from './WatchlistList'
import WatchlistGrid from './WatchlistGrid'
import WatchlistTabs from '@/components/watchlist/WatchlistTabs'
import type {
  WatchlistItem,
  WatchlistGroup,
  StockData,
  EarningsEvent,
  SortColumn,
  SortDirection,
  ViewMode,
} from '../_lib/types'

export default function WatchlistClient() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [groups, setGroups] = useState<WatchlistGroup[]>([])
  const [activeGroupId, setActiveGroupId] = useState<'all' | string>('all')
  const [isPremium, setIsPremium] = useState(false)
  const [stockData, setStockData] = useState<Record<string, StockData>>({})
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortColumn, setSortColumn] = useState<SortColumn>('ticker')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const router = useRouter()

  // Initial load: Auth + Watchlist + Listen + Stock-Data
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

        const [itemsRes, groupsRes, profileRes] = await Promise.all([
          supabase
            .from('watchlists')
            .select('id, ticker, created_at, group_id')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('watchlist_groups')
            .select('id, name, position')
            .eq('user_id', session.user.id)
            .order('position', { ascending: true })
            .order('created_at', { ascending: true }),
          supabase
            .from('profiles')
            .select('is_premium, subscription_status, subscription_end_date')
            .eq('user_id', session.user.id)
            .maybeSingle(),
        ])

        if (cancelled) return

        setGroups(groupsRes.data ?? [])
        setIsPremium(hasPremiumAccess(profileRes.data))

        if (itemsRes.error || !itemsRes.data) {
          setItems([])
          return
        }

        setItems(itemsRes.data)
        const tickers = Array.from(new Set(itemsRes.data.map(d => d.ticker)))
        if (tickers.length > 0) {
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

  const distinctTickers = useMemo(() => Array.from(new Set(items.map(i => i.ticker))), [items])

  const refresh = async () => {
    if (distinctTickers.length === 0 || refreshing) return
    setRefreshing(true)
    await Promise.all([fetchStockData(distinctTickers), fetchEarnings(distinctTickers)])
    setRefreshing(false)
  }

  // Welche Listen enthalten einen Ticker? (für das Pro-Zeile-Menü)
  const memberGroupsByTicker = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const it of items) {
      if (!it.group_id) continue
      let set = map.get(it.ticker)
      if (!set) {
        set = new Set()
        map.set(it.ticker, set)
      }
      set.add(it.group_id)
    }
    return map
  }, [items])

  // Sichtbare Items je Tab: "Alle" = Union aller Listen (pro Ticker eine Zeile),
  // sonst nur die Einträge der aktiven Liste.
  const visibleItems = useMemo(() => {
    if (activeGroupId === 'all') {
      const seen = new Map<string, WatchlistItem>()
      for (const it of items) {
        const prev = seen.get(it.ticker)
        // Ungruppierte Zeile bevorzugen, damit Entfernen die Standard-Zeile trifft
        if (!prev || (prev.group_id !== null && it.group_id === null)) seen.set(it.ticker, it)
      }
      return Array.from(seen.values())
    }
    return items.filter(i => i.group_id === activeGroupId)
  }, [items, activeGroupId])

  const activeGroup = activeGroupId === 'all' ? null : groups.find(g => g.id === activeGroupId) ?? null

  // ─── Listen-Verwaltung ────────────────────────────────────────────────

  const createGroup = async (name: string) => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('watchlist_groups')
        .insert({ user_id: user.id, name, position: groups.length })
        .select('id, name, position')
        .single()
      if (error) {
        if (error.code === '23505') alert(`Eine Liste namens "${name}" existiert bereits.`)
        else console.error('[WatchlistClient] create group error:', error)
        return
      }
      setGroups(prev => [...prev, data])
      setActiveGroupId(data.id)
    } catch (err) {
      console.error('[WatchlistClient] create group unexpected:', err)
    }
  }

  const renameGroup = async (id: string, name: string) => {
    if (!user) return
    const { error } = await supabase
      .from('watchlist_groups')
      .update({ name })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) {
      if (error.code === '23505') alert(`Eine Liste namens "${name}" existiert bereits.`)
      else console.error('[WatchlistClient] rename group error:', error)
      return
    }
    setGroups(prev => prev.map(g => (g.id === id ? { ...g, name } : g)))
  }

  const deleteGroup = async (id: string) => {
    if (!user) return
    const group = groups.find(g => g.id === id)
    if (!group) return
    const ok = confirm(
      `Liste "${group.name}" löschen?\nAktien, die auch in "Alle" oder anderen Listen gespeichert sind, bleiben erhalten.`
    )
    if (!ok) return
    const { error } = await supabase
      .from('watchlist_groups')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) {
      console.error('[WatchlistClient] delete group error:', error)
      alert('Fehler beim Löschen der Liste')
      return
    }
    // Einträge der Liste werden per ON DELETE CASCADE mitgelöscht
    setGroups(prev => prev.filter(g => g.id !== id))
    setItems(prev => prev.filter(i => i.group_id !== id))
    if (activeGroupId === id) setActiveGroupId('all')
  }

  // Ticker einer Liste hinzufügen / daraus entfernen (Pro-Zeile-Menü)
  const toggleItemGroup = async (ticker: string, groupId: string, currentlyIn: boolean) => {
    if (!user) return
    try {
      if (currentlyIn) {
        const { error } = await supabase
          .from('watchlists')
          .delete()
          .eq('user_id', user.id)
          .eq('ticker', ticker)
          .eq('group_id', groupId)
        if (error) {
          console.error('[WatchlistClient] remove from group error:', error)
          return
        }
        setItems(prev => prev.filter(i => !(i.ticker === ticker && i.group_id === groupId)))
      } else {
        const { data, error } = await supabase
          .from('watchlists')
          .insert({ user_id: user.id, ticker, group_id: groupId })
          .select('id, ticker, created_at, group_id')
          .single()
        if (error) {
          if (error.code !== '23505') console.error('[WatchlistClient] add to group error:', error)
          return
        }
        setItems(prev => [data, ...prev])
      }
    } catch (err) {
      console.error('[WatchlistClient] toggle group unexpected:', err)
    }
  }

  // ─── Entfernen ────────────────────────────────────────────────────────
  // Im "Alle"-Tab: Ticker komplett entfernen (inkl. aller Listen).
  // In einer Liste: nur den Eintrag dieser Liste entfernen.
  const removeItem = async (item: WatchlistItem) => {
    if (!user) return
    const { ticker } = item
    try {
      if (activeGroupId === 'all') {
        const inGroups = (memberGroupsByTicker.get(ticker)?.size ?? 0) > 0
        const msg = inGroups
          ? `${ticker} aus der Watchlist und allen Listen entfernen?`
          : `${ticker} aus der Watchlist entfernen?`
        if (!confirm(msg)) return
        const { error } = await supabase
          .from('watchlists')
          .delete()
          .eq('user_id', user.id)
          .eq('ticker', ticker)
        if (error) {
          console.error('[WatchlistClient] remove error:', error)
          alert('Fehler beim Entfernen')
          return
        }
        setItems(prev => prev.filter(i => i.ticker !== ticker))
        setStockData(prev => {
          const next = { ...prev }
          delete next[ticker]
          return next
        })
      } else {
        if (!confirm(`${ticker} aus "${activeGroup?.name ?? 'dieser Liste'}" entfernen?`)) return
        const { error } = await supabase
          .from('watchlists')
          .delete()
          .eq('id', item.id)
          .eq('user_id', user.id)
        if (error) {
          console.error('[WatchlistClient] remove error:', error)
          alert('Fehler beim Entfernen')
          return
        }
        setItems(prev => prev.filter(i => i.id !== item.id))
      }
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
    return [...visibleItems].sort((a, b) => {
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
  }, [visibleItems, stockData, sortColumn, sortDirection, earningsEvents])

  // Tab-Zähler
  const countByGroup = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const it of items) {
      if (it.group_id) counts[it.group_id] = (counts[it.group_id] ?? 0) + 1
    }
    return counts
  }, [items])

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
          count={visibleItems.length}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onRefresh={refresh}
          refreshing={refreshing}
        />

        <WatchlistTabs
          groups={groups}
          activeId={activeGroupId}
          allCount={distinctTickers.length}
          countByGroup={countByGroup}
          isPremium={isPremium}
          onSelect={setActiveGroupId}
          onCreate={createGroup}
          onRename={renameGroup}
          onDelete={deleteGroup}
        />

        {visibleItems.length === 0 ? (
          <WatchlistEmpty listName={activeGroup?.name} />
        ) : viewMode === 'list' ? (
          <WatchlistList
            items={sortedItems}
            stockData={stockData}
            earningsEvents={earningsEvents}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onRemove={removeItem}
            groups={groups}
            memberGroupsByTicker={memberGroupsByTicker}
            onToggleGroup={toggleItemGroup}
          />
        ) : (
          <WatchlistGrid
            items={sortedItems}
            stockData={stockData}
            earningsEvents={earningsEvents}
            onRemove={removeItem}
            groups={groups}
            memberGroupsByTicker={memberGroupsByTicker}
            onToggleGroup={toggleItemGroup}
          />
        )}
      </div>
    </div>
  )
}
