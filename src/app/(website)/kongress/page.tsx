// /kongress — Kongress-Trading Insights (Design wie /superinvestor/insights)
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import {
  ChartBarIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

// ── Types ────────────────────────────────────────────────────────────────────

interface Politician {
  slug: string; name: string; chamber: string; state: string
  party: string | null; tradeCount: number; lastTradeDate: string
  recentTickers: string[]; photoUrl: string | null
}

interface TopStock {
  ticker: string; name: string; buyCount: number; sellCount: number
  totalVolume: number; volumeFormatted: string; uniqueBuyers: number
  uniqueSellers: number; netSentiment: number; latestDate: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── StockItem Component (wie in /superinvestor/insights) ─────────────────────

function StockItem({ ticker, name, count, rightLabel, showValue, value, color }: {
  ticker: string; name?: string; count: number; rightLabel: string
  showValue?: boolean; value?: string; color?: string
}) {
  return (
    <Link
      href={`/analyse/stocks/${ticker.toLowerCase()}/politiker`}
      className="flex justify-between items-center py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 relative flex-shrink-0">
          <img
            src={`https://financialmodelingprep.com/image-stock/${ticker}.png`}
            alt={ticker}
            className="w-full h-full rounded object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
        <div>
          <p className={`text-sm font-medium group-hover:text-neutral-300 transition-colors ${color || 'text-white'}`}>
            {ticker}
          </p>
          <p className="text-neutral-500 text-xs truncate max-w-[120px]">
            {name || ticker}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-neutral-300 text-sm font-medium">
          {showValue && value ? value : count}
        </span>
        <p className="text-xs text-neutral-500">{rightLabel}</p>
      </div>
    </Link>
  )
}

// ── PoliticianItem Component ─────────────────────────────────────────────────

function PoliticianItem({ p }: { p: Politician }) {
  const isD = p.party?.startsWith('D')
  const isR = p.party?.startsWith('R')
  return (
    <Link
      href={`/kongress/${p.slug}`}
      className="flex justify-between items-center py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
    >
      <div className="flex items-center gap-3">
        {p.photoUrl ? (
          <img src={p.photoUrl} alt={p.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-neutral-700" />
        ) : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
            isD ? 'bg-blue-500/10 text-blue-400' : isR ? 'bg-red-500/10 text-red-400' : 'bg-neutral-800 text-neutral-500'
          }`}>
            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-white group-hover:text-neutral-300 transition-colors">{p.name}</p>
          <p className="text-xs text-neutral-500">
            {isD ? 'D' : isR ? 'R' : '—'} · {p.state} · {p.chamber === 'senate' ? 'Senat' : 'House'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-neutral-300 text-sm font-medium">{p.tradeCount}</span>
        <p className="text-xs text-neutral-500">Trades</p>
      </div>
    </Link>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function KongressInsightsPage() {
  const [politicians, setPoliticians] = useState<Politician[]>([])
  const [topBuys, setTopBuys] = useState<TopStock[]>([])
  const [topSells, setTopSells] = useState<TopStock[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('3')
  const [tab, setTab] = useState<'insights' | 'politiker'>('insights')
  const [search, setSearch] = useState('')
  const [chamberFilter, setChamberFilter] = useState('all')
  const [partyFilter, setPartyFilter] = useState('all')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/politicians?limit=500&sort=trades').then(r => r.ok ? r.json() : { politicians: [] }),
      fetch(`/api/v1/politicians/top-buys?months=${period}&limit=15&type=purchase`).then(r => r.ok ? r.json() : { topStocks: [] }),
      fetch(`/api/v1/politicians/top-buys?months=${period}&limit=15&type=sale`).then(r => r.ok ? r.json() : { topStocks: [] }),
    ]).then(([polData, buysData, sellsData]) => {
      setPoliticians(polData.politicians || [])
      setTopBuys(buysData.topStocks || [])
      setTopSells(sellsData.topStocks || [])
    }).finally(() => setLoading(false))
  }, [period])

  const stats = useMemo(() => ({
    total: politicians.length,
    democrats: politicians.filter(p => p.party?.startsWith('D')).length,
    republicans: politicians.filter(p => p.party?.startsWith('R')).length,
    totalTrades: politicians.reduce((s, p) => s + p.tradeCount, 0),
    uniqueStocks: topBuys.length + topSells.length,
  }), [politicians, topBuys, topSells])

  const filteredPoliticians = useMemo(() => {
    return politicians.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.state.toLowerCase().includes(search.toLowerCase())) return false
      if (chamberFilter !== 'all' && p.chamber !== chamberFilter) return false
      if (partyFilter !== 'all' && !p.party?.startsWith(partyFilter)) return false
      return true
    })
  }, [politicians, search, chamberFilter, partyFilter])

  // Top Politiker nach Volumen
  const topTraders = useMemo(() => politicians.slice(0, 15), [politicians])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* ── Header (wie Superinvestor Insights) ───────────────── */}
      <section className="bg-dark pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <BuildingLibraryIcon className="w-6 h-6 text-neutral-500" />
              <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Kongress-Trading</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full" />
              <span>{stats.total} Politiker · STOCK Act</span>
            </div>
          </div>
          <p className="text-sm text-neutral-400 mb-3">
            Analysen der Käufe und Verkäufe von US-Kongressmitgliedern.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
            <span>{stats.totalTrades.toLocaleString('de-DE')} Trades</span>
            <span className="text-neutral-600">•</span>
            <span>{stats.democrats} Demokraten, {stats.republicans} Republikaner</span>
            <span className="text-neutral-600">•</span>
            <span>Quelle: House Clerk / Senate eFD</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* ── Stats Overview ───────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 pb-8 border-b border-neutral-800">
          <div className="p-4">
            <p className="text-2xl font-semibold text-white">{stats.total}</p>
            <p className="text-sm text-neutral-500">Politiker</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold text-white">{stats.totalTrades.toLocaleString('de-DE')}</p>
            <p className="text-sm text-neutral-500">Offenlegungen</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold text-blue-400">{stats.democrats}</p>
            <p className="text-sm text-neutral-500">Demokraten</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold text-red-400">{stats.republicans}</p>
            <p className="text-sm text-neutral-500">Republikaner</p>
          </div>
        </div>

        {/* ── Beliebt / Featured Politicians ──────────────────── */}
        {(() => {
          const featured = ['nancy-pelosi', 'thomas-h-tuberville', 'markwayne-mullin', 'ro-khanna', 'john-boozman', 'shelley-m-capito']
          const featuredPols = featured.map(s => politicians.find(p => p.slug === s)).filter(Boolean) as Politician[]
          if (featuredPols.length === 0) return null
          return (
            <div className="mb-12 pb-8 border-b border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <FireIcon className="w-5 h-5 text-neutral-500" />
                <h3 className="text-base font-medium text-white">Beliebt</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {featuredPols.map(p => {
                  const isD = p.party?.startsWith('D')
                  const isR = p.party?.startsWith('R')
                  return (
                    <Link key={p.slug} href={`/kongress/${p.slug}`}
                      className="group flex flex-col items-center text-center p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all hover:bg-neutral-800/60">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.name} className="w-14 h-14 rounded-full object-cover border border-neutral-700 mb-2 group-hover:border-neutral-500 transition-colors" />
                      ) : (
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${
                          isD ? 'bg-blue-500/10 text-blue-400' : isR ? 'bg-red-500/10 text-red-400' : 'bg-neutral-800 text-neutral-500'
                        }`}>
                          {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                      )}
                      <p className="text-sm font-medium text-white group-hover:text-neutral-200 truncate w-full">{p.name.split(' ').pop()}</p>
                      <p className="text-xs text-neutral-500">
                        <span className={isD ? 'text-blue-400/60' : isR ? 'text-red-400/60' : ''}>{isD ? 'D' : isR ? 'R' : ''}</span>
                        {p.state ? ` · ${p.state}` : ''}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">{p.tradeCount} Trades</p>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── Analyse-Zeitraum ─────────────────────────────────── */}
        <div className="flex items-center justify-between mb-12 pb-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-neutral-500" />
            <div>
              <h3 className="text-white font-medium">Analyse-Zeitraum</h3>
              <p className="text-xs text-neutral-500">Top Käufe, Verkäufe, Aktivste Politiker</p>
            </div>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="appearance-none px-4 py-2 rounded-lg text-sm cursor-pointer bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700 focus:outline-none"
          >
            <option value="1">Letzter Monat</option>
            <option value="3">Letzte 3 Monate</option>
            <option value="6">Letzte 6 Monate</option>
            <option value="12">Letztes Jahr</option>
          </select>
        </div>

        {/* ── Main 3-Column Grid ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">

          {/* Top Käufe */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
              <ArrowTrendingUpIcon className="w-5 h-5 text-neutral-500" />
              <h3 className="text-base font-medium text-white">Top Käufe</h3>
            </div>
            <div className="space-y-0">
              {topBuys.length > 0 ? topBuys.map(s => (
                <StockItem
                  key={s.ticker}
                  ticker={s.ticker}
                  name={s.name}
                  count={s.buyCount}
                  rightLabel="Politiker"
                />
              )) : (
                <p className="text-sm text-neutral-500 py-8 text-center">Keine Daten</p>
              )}
            </div>
          </div>

          {/* Top Verkäufe */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
              <ArrowTrendingDownIcon className="w-5 h-5 text-neutral-500" />
              <h3 className="text-base font-medium text-white">Top Verkäufe</h3>
            </div>
            <div className="space-y-0">
              {topSells.length > 0 ? topSells.map(s => (
                <StockItem
                  key={s.ticker}
                  ticker={s.ticker}
                  name={s.name}
                  count={s.sellCount}
                  rightLabel="Politiker"
                  color="text-red-400"
                />
              )) : (
                <p className="text-sm text-neutral-500 py-8 text-center">Keine Daten</p>
              )}
            </div>
          </div>

          {/* Aktivste Politiker */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
              <UserGroupIcon className="w-5 h-5 text-neutral-500" />
              <h3 className="text-base font-medium text-white">Aktivste Politiker</h3>
            </div>
            <div className="space-y-0">
              {topTraders.map(p => (
                <PoliticianItem key={p.slug} p={p} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Alle Politiker Sektion ──────────────────────────── */}
        <div className="mb-8 pb-4 border-b border-neutral-800">
          <h2 className="text-xl font-medium text-white mb-2">Alle Politiker</h2>
          <p className="text-sm text-neutral-500">
            STOCK Act Offenlegungen — {stats.total} Mitglieder des US-Kongresses
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Suche nach Name oder Staat..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
            />
          </div>
          <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
            {[['all', 'Alle'], ['senate', 'Senat'], ['house', 'House']].map(([k, l]) => (
              <button key={k} onClick={() => setChamberFilter(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${chamberFilter === k ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
            {[['all', 'Alle'], ['D', 'Dem'], ['R', 'Rep']].map(([k, l]) => (
              <button key={k} onClick={() => setPartyFilter(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${partyFilter === k ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Politician Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPoliticians.map(p => {
            const isD = p.party?.startsWith('D')
            const isR = p.party?.startsWith('R')
            return (
              <Link key={p.slug} href={`/kongress/${p.slug}`}
                className="group flex items-center gap-3 p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all hover:bg-neutral-800/60">
                {/* Party accent */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${isD ? 'bg-blue-500/50' : isR ? 'bg-red-500/50' : 'bg-neutral-700/50'}`} style={{ position: 'absolute' }} />

                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-neutral-700" />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isD ? 'bg-blue-500/10 text-blue-400' : isR ? 'bg-red-500/10 text-red-400' : 'bg-neutral-800 text-neutral-500'
                  }`}>
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-neutral-200">{p.name}</p>
                  <p className="text-xs text-neutral-500">
                    {isD ? 'Demokrat' : isR ? 'Republikaner' : '—'} · {p.state} · {p.chamber === 'senate' ? 'Senat' : 'House'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-neutral-300">{p.tradeCount}</p>
                  <p className="text-xs text-neutral-500">{formatDate(p.lastTradeDate)}</p>
                </div>
              </Link>
            )
          })}
        </div>

        {filteredPoliticians.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-neutral-500">Keine Politiker gefunden</p>
          </div>
        )}
      </div>
    </div>
  )
}
