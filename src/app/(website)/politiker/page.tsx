'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  UsersIcon,
  FireIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

interface TopPoliticianBuy {
  ticker: string
  companyName: string
  politicianCount: number
  politicians: string[]
  totalValueMin: number
  totalValueMax: number
  transactionCount: number
}

function formatValueRange(min: number, max: number): string {
  if (min === 0 && max === 0) return '–'
  const avg = (min + max) / 2
  if (avg >= 1_000_000) return `~$${(avg / 1_000_000).toFixed(1)}M`
  if (avg >= 1_000) return `~$${Math.round(avg / 1_000)}K`
  return `~$${avg.toLocaleString('de-DE')}`
}

interface PoliticianTrade {
  disclosureYear: string
  disclosureDate: string
  transactionDate: string
  owner: string
  ticker: string
  assetDescription: string
  type: string
  amount: string
  representative: string
  district: string
  link: string
  slug: string
  state: string
}

interface PoliticianSummary {
  name: string
  slug: string
  state: string
  district: string
  tradeCount: number
  lastTrade: string
  recentTrades: PoliticianTrade[]
  // From API index (when local data available)
  lastTradeDate?: string
  recentTickers?: string[]
  chamber?: string
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '–'
  try {
    const [year, month, day] = dateStr.split('-')
    return `${day}.${month}.${year}`
  } catch {
    return dateStr
  }
}

function parseAmountMin(amount: string): number {
  const match = amount?.replace(/[$,]/g, '').match(/[\d]+/)
  return match ? parseInt(match[0]) : 0
}

function parseAmountMidpoint(amount: string): number {
  if (!amount) return 0
  const clean = amount.replace(/[$,]/g, '')
  const matches = clean.match(/\d+/g)
  if (!matches || matches.length === 0) return 0
  if (matches.length === 1) return parseInt(matches[0])
  return (parseInt(matches[0]) + parseInt(matches[matches.length - 1])) / 2
}

function formatAmount(amount: string): string {
  if (!amount) return '–'
  return amount.replace('$', '').trim()
}

const KNOWN_POLITICIANS: Record<string, { party: 'D' | 'R' | 'I'; fullState: string; role?: string }> = {
  'nancy-pelosi': { party: 'D', fullState: 'California', role: 'Ehem. Sprecherin des Repräsentantenhauses' },
  'dan-crenshaw': { party: 'R', fullState: 'Texas', role: 'Repräsentantenhaus, TX-02' },
  'tommy-tuberville': { party: 'R', fullState: 'Alabama', role: 'US-Senator' },
  'josh-gottheimer': { party: 'D', fullState: 'New Jersey', role: 'Repräsentantenhaus, NJ-05' },
  'marjorie-taylor-greene': { party: 'R', fullState: 'Georgia', role: 'Repräsentantenhaus, GA-14' },
  'ro-khanna': { party: 'D', fullState: 'California', role: 'Repräsentantenhaus, CA-17' },
  'michael-mccaul': { party: 'R', fullState: 'Texas', role: 'Vorsitzender Außenausschuss' },
  'thomas-suozzi': { party: 'D', fullState: 'New York', role: 'Repräsentantenhaus, NY-03' },
  'august-lee-pfluger': { party: 'R', fullState: 'Texas', role: 'Repräsentantenhaus, TX-11' },
  'mark-green': { party: 'R', fullState: 'Tennessee', role: 'Repräsentantenhaus' },
  'gilbert-cisneros': { party: 'D', fullState: 'California', role: 'Repräsentantenhaus' },
  'lisa-mcclain': { party: 'R', fullState: 'Michigan', role: 'Repräsentantenhaus, MI-09' },
  'julie-johnson': { party: 'D', fullState: 'Texas', role: 'Repräsentantenhaus, TX-32' },
  'david-taylor': { party: 'R', fullState: 'Ohio', role: 'Repräsentantenhaus, OH-15' },
}

// Die 4 Politiker die im "Im Fokus" Block erscheinen
const FEATURED_SLUGS = ['nancy-pelosi', 'ro-khanna', 'josh-gottheimer', 'marjorie-taylor-greene']

function PartyBadge({ slug }: { slug: string }) {
  const info = KNOWN_POLITICIANS[slug]
  if (!info) return null
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
      info.party === 'D' ? 'text-blue-400' : 'text-red-400'
    }`}>
      {info.party}
    </span>
  )
}

export default function PolitikerPage() {
  const [trades, setTrades] = useState<PoliticianTrade[]>([])
  const [politicianIndex, setPoliticianIndex] = useState<PoliticianSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'purchase' | 'sale'>('all')
  const [activeTab, setActiveTab] = useState<'feed' | 'biggest' | 'politiker'>('feed')
  const [topBuys, setTopBuys] = useState<TopPoliticianBuy[]>([])
  const [topBuysLoading, setTopBuysLoading] = useState(true)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await fetch('/api/politicians?page=0').then(r => r.json())
        setTrades(data.trades || [])
        // Wenn lokale Daten → API liefert den Index direkt mit
        if (data.index && Array.isArray(data.index)) {
          setPoliticianIndex(
            data.index.map((p: any) => ({
              name: p.name,
              slug: p.slug,
              state: p.state,
              district: p.district || '',
              tradeCount: p.tradeCount,
              lastTrade: p.lastTradeDate || '',
              lastTradeDate: p.lastTradeDate || '',
              recentTrades: [],
              recentTickers: p.recentTickers || [],
              chamber: p.chamber || '',
            }))
          )
        }
      } catch (err) {
        console.error('Fehler beim Laden der Politiker-Trades:', err)
      } finally {
        setLoading(false)
      }
    }

    async function loadTopBuys() {
      try {
        const res = await fetch('/api/politicians/top-buys')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.topBuys)) setTopBuys(data.topBuys)
        }
      } catch (err) {
        console.error('Error fetching top politician buys:', err)
      } finally {
        setTopBuysLoading(false)
      }
    }

    load()
    loadTopBuys()
  }, [])

  // Wenn API Index liefert → diesen direkt nutzen (vollständige Daten über alle Politiker)
  // Fallback: aus dem geladenen Feed berechnen
  const politicians = useMemo<PoliticianSummary[]>(() => {
    if (politicianIndex.length > 0) return politicianIndex
    const map: Record<string, PoliticianSummary> = {}
    trades.forEach(t => {
      if (!t.representative) return
      if (!map[t.slug]) {
        map[t.slug] = {
          name: t.representative,
          slug: t.slug,
          state: t.state,
          district: t.district,
          tradeCount: 0,
          lastTrade: t.transactionDate,
          recentTrades: [],
        }
      }
      map[t.slug].tradeCount++
      if (t.transactionDate > map[t.slug].lastTrade) {
        map[t.slug].lastTrade = t.transactionDate
      }
      if (map[t.slug].recentTrades.length < 3) {
        map[t.slug].recentTrades.push(t)
      }
    })
    return Object.values(map).sort((a, b) => b.tradeCount - a.tradeCount)
  }, [trades, politicianIndex])

  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const matchesSearch =
        !searchQuery ||
        t.representative?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.ticker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assetDescription?.toLowerCase().includes(searchQuery.toLowerCase())
      // Typ-Vergleich case-insensitiv (FMP: 'Purchase'/'Sale', lokal: 'purchase'/'sale')
      const matchesType =
        typeFilter === 'all' ||
        t.type?.toLowerCase() === typeFilter.toLowerCase()
      return matchesSearch && matchesType
    })
  }, [trades, searchQuery, typeFilter])

  const filteredPoliticians = useMemo(() => {
    return politicians.filter(p =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.state.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [politicians, searchQuery])

  const biggestTrades = useMemo(() => {
    return [...trades]
      .filter(t => t.amount)
      .sort((a, b) => parseAmountMidpoint(b.amount) - parseAmountMidpoint(a.amount))
      .slice(0, 100)
  }, [trades])

  const stats = useMemo(() => {
    const purchases = trades.filter(t => t.type?.toLowerCase() === 'purchase').length
    const sales = trades.filter(t => t.type?.toLowerCase() === 'sale').length
    // Wenn Index vorhanden: Gesamtzahlen aus Index nutzen (vollständiger)
    const uniquePoliticians = politicianIndex.length > 0
      ? politicianIndex.length
      : new Set(trades.map(t => t.slug)).size
    const uniqueStocks = new Set(trades.map(t => t.ticker).filter(Boolean)).size
    const totalTrades = politicianIndex.length > 0
      ? politicianIndex.reduce((sum, p) => sum + p.tradeCount, 0)
      : trades.length
    return { purchases, sales, uniquePoliticians, uniqueStocks, total: totalTrades }
  }, [trades, politicianIndex])

  return (
    <div className="min-h-screen bg-dark">

      {/* Header */}
      <section className="bg-dark pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <BuildingLibraryIcon className="w-6 h-6 text-neutral-500" />
              <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
                Politiker-Trades
              </h1>
            </div>
            {!loading && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full"></div>
                <span>{stats.uniquePoliticians} aktive Politiker</span>
              </div>
            )}
          </div>
          <p className="text-sm text-neutral-400 mb-3">
            US-Kongressabgeordnete und Senatoren müssen Aktientransaktionen nach dem STOCK Act (2012) offenlegen.
          </p>
          {!loading && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
              <span>{stats.total} Transaktionen</span>
              <span className="text-neutral-600">•</span>
              <span>{stats.uniqueStocks} verschiedene Aktien</span>
              <span className="text-neutral-600">•</span>
              <span>letzte 3 Monate</span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 pb-8 border-b border-neutral-800">
            <div className="p-4">
              <p className="text-2xl font-semibold text-brand">{stats.uniquePoliticians}</p>
              <p className="text-sm text-neutral-500">Aktive Politiker</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-semibold text-emerald-400">{stats.purchases}</p>
              <p className="text-sm text-neutral-500">Käufe</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-semibold text-red-400">{stats.sales}</p>
              <p className="text-sm text-neutral-500">Verkäufe</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-semibold text-white">{stats.uniqueStocks}</p>
              <p className="text-sm text-neutral-500">verschiedene Aktien</p>
            </div>
          </div>
        )}

        {/* Im Fokus – Notable Politicians */}
        {!loading && (
          <div className="mb-10">
            <p className="text-xs font-medium text-neutral-600 uppercase tracking-widest mb-4">Im Fokus</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {FEATURED_SLUGS.map(slug => {
                const pol = politicianIndex.find(p => p.slug === slug) || politicians.find(p => p.slug === slug)
                const known = KNOWN_POLITICIANS[slug]
                if (!known) return null
                const tradeCount = pol?.tradeCount ?? 0
                const lastDate = pol?.lastTradeDate || pol?.lastTrade || ''
                const tickers = pol?.recentTickers ?? (pol as any)?.recentTrades?.slice(0,3).map((t: any) => t.ticker).filter(Boolean) ?? []
                const isD = known.party === 'D'
                return (
                  <Link
                    key={slug}
                    href={`/politiker/${slug}`}
                    className="group relative flex flex-col gap-3 p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all hover:bg-neutral-800/60"
                  >
                    {/* Party accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${isD ? 'bg-blue-500/50' : 'bg-red-500/50'}`} />

                    {/* Avatar + Name */}
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isD ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {slug.split('-').map(n => n[0].toUpperCase()).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-white truncate leading-tight group-hover:text-neutral-200">
                            {slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </p>
                          <span className={`text-xs font-bold flex-shrink-0 ${isD ? 'text-blue-400' : 'text-red-400'}`}>
                            {known.party}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 truncate">{known.fullState}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-white">{tradeCount}</p>
                        <p className="text-xs text-neutral-600">Trades</p>
                      </div>
                      {lastDate && (
                        <div className="text-right">
                          <p className="text-xs text-neutral-400">{lastDate.slice(0,7)}</p>
                          <p className="text-xs text-neutral-600">Letzter Trade</p>
                        </div>
                      )}
                    </div>

                    {/* Recent tickers */}
                    {tickers.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {tickers.slice(0, 4).map((t: string) => (
                          <span key={t} className="text-xs font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Top Käufe */}
        {!loading && (
          <div className="mb-10">
            <p className="text-xs font-medium text-neutral-600 uppercase tracking-widest mb-4">Top Käufe dieses Quartal</p>
            {topBuysLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : topBuys.length === 0 ? (
              <p className="text-sm text-neutral-600 py-4">Keine Daten verfügbar</p>
            ) : (
              <div className="rounded-xl border border-neutral-800 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-neutral-800 text-xs text-neutral-600 uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Aktie</div>
                  <div className="col-span-2 text-right">Politiker</div>
                  <div className="col-span-2 text-right">Käufe</div>
                  <div className="col-span-2 text-right">Volumen</div>
                </div>
                {topBuys.map((item, idx) => {
                  const isExpanded = selectedTicker === item.ticker
                  const tickerTrades = trades.filter(
                    t => t.ticker?.toUpperCase() === item.ticker.toUpperCase() && t.type?.toLowerCase() === 'purchase'
                  ).sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
                  return (
                    <div key={item.ticker} className="border-b border-neutral-800/50 last:border-b-0">
                      {/* Main row */}
                      <div
                        onClick={() => setSelectedTicker(isExpanded ? null : item.ticker)}
                        className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-neutral-800/30 transition-colors cursor-pointer group"
                      >
                        <div className="col-span-1 flex items-center">
                          <span className="text-neutral-600 text-sm">{idx + 1}</span>
                        </div>
                        <div className="col-span-5 flex items-center gap-3">
                          <div className="w-7 h-7 flex-shrink-0">
                            <Logo ticker={item.ticker} alt={`${item.ticker} Logo`} className="w-full h-full" padding="none" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{item.ticker}</p>
                            <p className="text-neutral-500 text-xs truncate max-w-[140px]">{item.companyName}</p>
                          </div>
                        </div>
                        <div className="col-span-2 flex flex-col items-end justify-center">
                          <span className="text-white text-sm font-medium">{item.politicianCount}</span>
                          <span className="text-neutral-600 text-xs">Politiker</span>
                        </div>
                        <div className="col-span-2 flex flex-col items-end justify-center">
                          <span className="text-white text-sm font-medium">{item.transactionCount}</span>
                          <span className="text-neutral-600 text-xs">Käufe</span>
                        </div>
                        <div className="col-span-2 flex flex-col items-end justify-center">
                          <span className="text-white text-sm font-medium">{formatValueRange(item.totalValueMin, item.totalValueMax)}</span>
                          <span className={`text-xs transition-colors ${isExpanded ? 'text-brand' : 'text-neutral-600'}`}>
                            {isExpanded ? 'schließen ▲' : 'Details ▼'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded trades */}
                      {isExpanded && (
                        <div className="bg-neutral-900/60 border-t border-neutral-800/50 px-4 py-3">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
                              Politiker-Käufe für {item.ticker}
                            </p>
                            <Link
                              href={`/analyse/stocks/${item.ticker.toLowerCase()}`}
                              onClick={e => e.stopPropagation()}
                              className="text-xs text-neutral-500 hover:text-white transition-colors"
                            >
                              Aktie ansehen →
                            </Link>
                          </div>
                          {tickerTrades.length === 0 ? (
                            <p className="text-sm text-neutral-600 py-2">
                              Keine Einzeltrades im aktuellen Feed — Käufe wurden aggregiert aus Quartalsdaten.
                            </p>
                          ) : (
                            <div className="space-y-0">
                              <div className="grid grid-cols-12 gap-3 py-1 text-xs text-neutral-600 uppercase tracking-wider">
                                <div className="col-span-3">Datum</div>
                                <div className="col-span-5">Politiker</div>
                                <div className="col-span-4 text-right">Betrag</div>
                              </div>
                              {tickerTrades.map((t, i) => (
                                <div key={i} className="grid grid-cols-12 gap-3 py-2 border-t border-neutral-800/40">
                                  <div className="col-span-3 flex items-center">
                                    <span className="text-xs text-neutral-500 tabular-nums">{formatDate(t.transactionDate)}</span>
                                  </div>
                                  <div className="col-span-5 flex items-center gap-1.5">
                                    <Link
                                      href={`/politiker/${t.slug}`}
                                      onClick={e => e.stopPropagation()}
                                      className="text-sm text-white hover:text-neutral-300 transition-colors truncate"
                                    >
                                      {t.representative}
                                    </Link>
                                    <PartyBadge slug={t.slug} />
                                  </div>
                                  <div className="col-span-4 flex items-center justify-end">
                                    <span className="text-sm text-emerald-400">{formatAmount(t.amount)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-8 pb-4 border-b border-neutral-800">
          {/* Tabs */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-2 text-sm pb-1 transition-colors border-b ${
                activeTab === 'feed'
                  ? 'text-brand border-brand'
                  : 'text-neutral-500 border-transparent hover:text-neutral-300'
              }`}
            >
              <FireIcon className="w-4 h-4" />
              Neueste Trades
            </button>
            <button
              onClick={() => setActiveTab('biggest')}
              className={`flex items-center gap-2 text-sm pb-1 transition-colors border-b ${
                activeTab === 'biggest'
                  ? 'text-brand border-brand'
                  : 'text-neutral-500 border-transparent hover:text-neutral-300'
              }`}
            >
              <ArrowTrendingUpIcon className="w-4 h-4" />
              Größte Trades
            </button>
            <button
              onClick={() => setActiveTab('politiker')}
              className={`flex items-center gap-2 text-sm pb-1 transition-colors border-b ${
                activeTab === 'politiker'
                  ? 'text-brand border-brand'
                  : 'text-neutral-500 border-transparent hover:text-neutral-300'
              }`}
            >
              <UsersIcon className="w-4 h-4" />
              Alle Politiker ({politicians.length})
            </button>
          </div>

          {/* Search + Filter */}
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Politiker oder Ticker..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
              />
            </div>
            {(activeTab === 'feed' || activeTab === 'biggest') && (
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as 'all' | 'purchase' | 'sale')}
                className="appearance-none px-3 py-2 rounded-lg text-sm cursor-pointer bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700 focus:outline-none"
              >
                <option value="all">Alle Typen</option>
                <option value="purchase">Nur Käufe</option>
                <option value="sale">Nur Verkäufe</option>
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-0">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-3 bg-neutral-800 rounded w-20"></div>
                  <div className="h-3 bg-neutral-800 rounded w-32"></div>
                </div>
                <div className="h-3 bg-neutral-800 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : activeTab === 'feed' ? (
          /* FEED */
          <div className="space-y-0">
            {/* Column headers */}
            <div className="flex items-center gap-4 py-2 px-2 mb-1">
              <span className="text-xs text-neutral-600 w-24 flex-shrink-0">Datum</span>
              <span className="text-xs text-neutral-600 flex-1">Politiker</span>
              <span className="text-xs text-neutral-600 w-28">Aktie</span>
              <span className="text-xs text-neutral-600 w-20 hidden sm:block">Typ</span>
              <span className="text-xs text-neutral-600 w-32 text-right">Betrag</span>
            </div>

            {filteredTrades.slice(0, 100).map((trade, i) => (
              <div
                key={`${trade.representative}-${trade.transactionDate}-${trade.ticker}-${i}`}
                className="flex items-center gap-4 py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
              >
                <span className="text-xs text-neutral-500 w-24 flex-shrink-0 tabular-nums">
                  {formatDate(trade.transactionDate)}
                </span>

                <div className="flex-1 min-w-0">
                  <Link href={`/politiker/${trade.slug}`} className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white group-hover:text-neutral-300 transition-colors truncate">
                      {trade.representative}
                    </span>
                    <PartyBadge slug={trade.slug} />
                  </Link>
                  <span className="text-xs text-neutral-500">{trade.district}</span>
                </div>

                <div className="w-28 min-w-0">
                  {trade.ticker ? (
                    <Link href={`/analyse/stocks/${trade.ticker}`} className="group/ticker">
                      <p className="text-sm font-medium text-white group-hover/ticker:text-neutral-300 transition-colors">
                        {trade.ticker}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{trade.assetDescription?.slice(0, 18)}</p>
                    </Link>
                  ) : (
                    <div>
                      <p className="text-sm text-neutral-500">–</p>
                      <p className="text-xs text-neutral-600 truncate">{trade.assetDescription?.slice(0, 18)}</p>
                    </div>
                  )}
                </div>

                <div className="w-20 hidden sm:flex items-center gap-1">
                  {trade.type?.toLowerCase() === 'purchase' ? (
                    <ArrowUpRightIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <ArrowDownRightIcon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${trade.type?.toLowerCase() === 'purchase' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trade.type?.toLowerCase() === 'purchase' ? 'Kauf' : 'Verkauf'}
                  </span>
                </div>

                <span className="text-sm text-neutral-300 w-32 text-right tabular-nums">
                  {formatAmount(trade.amount)}
                </span>
              </div>
            ))}

            {filteredTrades.length === 0 && (
              <div className="text-center py-16 text-neutral-500">
                <p className="text-sm">Keine Trades für &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </div>
        ) : activeTab === 'biggest' ? (
          /* GRÖSSTE TRADES */
          <div className="space-y-0">
            <div className="flex items-center gap-4 py-2 px-2 mb-1">
              <span className="text-xs text-neutral-600 w-6 flex-shrink-0">#</span>
              <span className="text-xs text-neutral-600 flex-1">Politiker</span>
              <span className="text-xs text-neutral-600 w-28">Aktie</span>
              <span className="text-xs text-neutral-600 w-20 hidden sm:block">Typ</span>
              <span className="text-xs text-neutral-600 w-32 text-right">Betrag</span>
            </div>
            {biggestTrades
              .filter(t => {
                const matchesSearch = !searchQuery ||
                  t.representative?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.ticker?.toLowerCase().includes(searchQuery.toLowerCase())
                const matchesType = typeFilter === 'all' || t.type?.toLowerCase() === typeFilter
                return matchesSearch && matchesType
              })
              .map((trade, i) => (
              <div
                key={`biggest-${trade.representative}-${trade.transactionDate}-${trade.ticker}-${i}`}
                className="flex items-center gap-4 py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
              >
                <span className="text-xs text-neutral-600 w-6 flex-shrink-0 tabular-nums">{i + 1}</span>

                <div className="flex-1 min-w-0">
                  <Link href={`/politiker/${trade.slug}`} className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white group-hover:text-neutral-300 transition-colors truncate">
                      {trade.representative}
                    </span>
                    <PartyBadge slug={trade.slug} />
                  </Link>
                  <span className="text-xs text-neutral-500 tabular-nums">{formatDate(trade.transactionDate)}</span>
                </div>

                <div className="w-28 min-w-0">
                  {trade.ticker ? (
                    <Link href={`/analyse/stocks/${trade.ticker}`} className="group/ticker">
                      <p className="text-sm font-medium text-white group-hover/ticker:text-neutral-300 transition-colors">
                        {trade.ticker}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">{trade.assetDescription?.slice(0, 18)}</p>
                    </Link>
                  ) : (
                    <p className="text-sm text-neutral-500">–</p>
                  )}
                </div>

                <div className="w-20 hidden sm:flex items-center gap-1">
                  {trade.type?.toLowerCase() === 'purchase' ? (
                    <ArrowUpRightIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <ArrowDownRightIcon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${trade.type?.toLowerCase() === 'purchase' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trade.type?.toLowerCase() === 'purchase' ? 'Kauf' : 'Verkauf'}
                  </span>
                </div>

                <span className={`text-sm font-medium w-32 text-right tabular-nums ${
                  trade.type?.toLowerCase() === 'purchase' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {formatAmount(trade.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* POLITIKER LISTE */
          <div className="space-y-0">
            {/* Column headers */}
            <div className="flex items-center gap-4 py-2 px-2 mb-1">
              <span className="text-xs text-neutral-600 flex-1">Politiker</span>
              <span className="text-xs text-neutral-600 w-16 text-right">Trades</span>
              <span className="text-xs text-neutral-600 w-28 text-right hidden sm:block">Letzter Trade</span>
              <span className="text-xs text-neutral-600 w-40 hidden md:block">Letzte Aktien</span>
            </div>

            {filteredPoliticians.map(p => {
              const knownInfo = KNOWN_POLITICIANS[p.slug]
              return (
                <Link
                  key={p.slug}
                  href={`/politiker/${p.slug}`}
                  className="flex items-center gap-4 py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 text-xs font-semibold flex-shrink-0">
                      {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-white group-hover:text-neutral-300 transition-colors">
                          {p.name}
                        </span>
                        {knownInfo && (
                          <span className={`text-xs font-medium ${
                            knownInfo.party === 'D' ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            {knownInfo.party}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500">
                        {knownInfo?.fullState || p.state} · {p.district}
                      </span>
                    </div>
                  </div>

                  <div className="w-16 text-right">
                    <p className="text-sm font-medium text-white">{p.tradeCount}</p>
                  </div>

                  <div className="w-28 text-right hidden sm:block">
                    <p className="text-sm text-neutral-400 tabular-nums">{formatDate(p.lastTrade)}</p>
                  </div>

                  <div className="w-40 hidden md:flex items-center gap-1.5 flex-wrap">
                    {(p.recentTickers && p.recentTickers.length > 0
                      ? p.recentTickers
                      : p.recentTrades.slice(0, 3).map(t => t.ticker).filter(Boolean)
                    ).slice(0, 4).map((ticker, i) => (
                      <span key={i} className="text-xs text-neutral-500 font-mono">
                        {ticker}
                      </span>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-12 pt-6 border-t border-neutral-800">
          <p className="text-xs text-neutral-600 leading-relaxed">
            Daten basieren auf Pflichtmeldungen nach dem US STOCK Act (2012). Betragsangaben sind Wertbereiche, keine exakten Beträge. Keine Anlageberatung.
          </p>
        </div>
      </div>
    </div>
  )
}
