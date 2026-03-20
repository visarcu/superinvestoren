'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  ChartBarIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'

interface PoliticianTrade {
  disclosureYear: string
  disclosureDate: string
  transactionDate: string
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

function getAmountColor(amount: string): string {
  if (!amount) return 'text-neutral-400'
  const num = parseAmountMin(amount)
  if (num >= 1_000_000) return 'text-yellow-400'
  if (num >= 100_000) return 'text-brand'
  return 'text-neutral-300'
}

function parseAmountMin(amount: string): number {
  const match = amount?.replace(/[$,]/g, '').match(/[\d]+/)
  return match ? parseInt(match[0]) : 0
}

function formatAmount(amount: string): string {
  if (!amount) return '–'
  return amount.replace('$', '').trim()
}

// Bekannte Politiker mit Partei-Info
const KNOWN_POLITICIANS: Record<string, { party: 'D' | 'R' | 'I'; fullState: string }> = {
  'nancy-pelosi': { party: 'D', fullState: 'California' },
  'dan-crenshaw': { party: 'R', fullState: 'Texas' },
  'tommy-tuberville': { party: 'R', fullState: 'Alabama' },
  'josh-gottheimer': { party: 'D', fullState: 'New Jersey' },
  'marjorie-taylor-greene': { party: 'R', fullState: 'Georgia' },
  'ro-khanna': { party: 'D', fullState: 'California' },
  'michael-mccaul': { party: 'R', fullState: 'Texas' },
  'thomas-suozzi': { party: 'D', fullState: 'New York' },
  'august-lee-pfluger': { party: 'R', fullState: 'Texas' },
  'mark-green': { party: 'R', fullState: 'Tennessee' },
  'pete-sessions': { party: 'R', fullState: 'Texas' },
  'john-mccain': { party: 'R', fullState: 'Arizona' },
  'virginia-foxx': { party: 'R', fullState: 'North Carolina' },
}

function getPartyBadge(slug: string) {
  const info = KNOWN_POLITICIANS[slug]
  if (!info) return null
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
      info.party === 'D'
        ? 'bg-blue-500/15 text-blue-400'
        : info.party === 'R'
        ? 'bg-red-500/15 text-red-400'
        : 'bg-neutral-500/15 text-neutral-400'
    }`}>
      {info.party}
    </span>
  )
}

export default function PolitikerPage() {
  const [trades, setTrades] = useState<PoliticianTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'Purchase' | 'Sale'>('all')
  const [activeTab, setActiveTab] = useState<'feed' | 'politiker'>('feed')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Lade 3 Seiten für einen guten Überblick
        const [p0, p1, p2] = await Promise.all([
          fetch('/api/politicians?page=0').then(r => r.json()),
          fetch('/api/politicians?page=1').then(r => r.json()),
          fetch('/api/politicians?page=2').then(r => r.json()),
        ])
        const all = [
          ...(p0.trades || []),
          ...(p1.trades || []),
          ...(p2.trades || []),
        ]
        setTrades(all)
      } catch (err) {
        console.error('Fehler beim Laden der Politiker-Trades:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Aggregiere Politiker-Statistiken
  const politicians = useMemo<PoliticianSummary[]>(() => {
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
  }, [trades])

  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const matchesSearch =
        !searchQuery ||
        t.representative?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.ticker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assetDescription?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = typeFilter === 'all' || t.type === typeFilter

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

  const stats = useMemo(() => {
    const purchases = trades.filter(t => t.type === 'Purchase').length
    const sales = trades.filter(t => t.type === 'Sale').length
    const uniquePoliticians = new Set(trades.map(t => t.slug)).size
    const uniqueStocks = new Set(trades.map(t => t.ticker).filter(Boolean)).size
    return { purchases, sales, uniquePoliticians, uniqueStocks, total: trades.length }
  }, [trades])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <section className="pt-12 pb-8 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <BuildingLibraryIcon className="w-6 h-6 text-brand" />
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-medium">US-Kongress</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            Politiker-Trades
          </h1>
          <p className="text-neutral-400 max-w-2xl text-sm leading-relaxed">
            US-Kongressabgeordnete und Senatoren müssen Aktientransaktionen innerhalb von 30–45 Tagen
            offenlegen (STOCK Act, 2012). Hier siehst du alle aktuellen Pflichtmeldungen.
          </p>

          {/* Stats */}
          {!loading && (
            <div className="flex flex-wrap gap-6 mt-6">
              <div>
                <div className="text-2xl font-bold text-white">{stats.uniquePoliticians}</div>
                <div className="text-xs text-neutral-500 mt-0.5">Aktive Politiker</div>
              </div>
              <div className="w-px bg-white/10"></div>
              <div>
                <div className="text-2xl font-bold text-brand">{stats.purchases}</div>
                <div className="text-xs text-neutral-500 mt-0.5">Käufe</div>
              </div>
              <div className="w-px bg-white/10"></div>
              <div>
                <div className="text-2xl font-bold text-red-400">{stats.sales}</div>
                <div className="text-xs text-neutral-500 mt-0.5">Verkäufe</div>
              </div>
              <div className="w-px bg-white/10"></div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.uniqueStocks}</div>
                <div className="text-xs text-neutral-500 mt-0.5">verschiedene Aktien</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('feed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'feed'
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Neueste Trades
            </button>
            <button
              onClick={() => setActiveTab('politiker')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'politiker'
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UserGroupIcon className="w-4 h-4 inline mr-1.5" />
              Alle Politiker ({politicians.length})
            </button>
          </div>

          {/* Search + Filter */}
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                placeholder="Suche Politiker oder Ticker..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-brand/50"
              />
            </div>
            {activeTab === 'feed' && (
              <div className="flex gap-1">
                {(['all', 'Purchase', 'Sale'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTypeFilter(f)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      typeFilter === f
                        ? f === 'Purchase'
                          ? 'bg-brand text-black'
                          : f === 'Sale'
                          ? 'bg-red-500 text-white'
                          : 'bg-white/15 text-white'
                        : 'bg-white/5 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Alle' : f === 'Purchase' ? 'Käufe' : 'Verkäufe'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'feed' ? (
          /* FEED TAB */
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium">Datum</th>
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium">Politiker</th>
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium">Aktie</th>
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium hidden md:table-cell">Typ</th>
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium">Betrag</th>
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium hidden lg:table-cell">Gemeldet</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.slice(0, 100).map((trade, i) => (
                  <tr
                    key={`${trade.representative}-${trade.transactionDate}-${trade.ticker}-${i}`}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-neutral-400 whitespace-nowrap">
                      {formatDate(trade.transactionDate)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/politiker/${trade.slug}`}
                        className="flex items-center gap-2 group"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-white group-hover:text-brand transition-colors font-medium">
                              {trade.representative}
                            </span>
                            {getPartyBadge(trade.slug)}
                          </div>
                          <span className="text-xs text-neutral-500">{trade.district}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {trade.ticker ? (
                        <Link
                          href={`/analyse/stocks/${trade.ticker}`}
                          className="group"
                        >
                          <div className="text-sm font-mono font-semibold text-brand group-hover:text-brand/80 transition-colors">
                            {trade.ticker}
                          </div>
                          <div className="text-xs text-neutral-500 truncate max-w-[140px]">
                            {trade.assetDescription}
                          </div>
                        </Link>
                      ) : (
                        <div>
                          <div className="text-sm text-neutral-400">–</div>
                          <div className="text-xs text-neutral-600 truncate max-w-[140px]">
                            {trade.assetDescription}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`flex items-center gap-1 text-sm font-medium ${
                        trade.type === 'Purchase' ? 'text-brand' : 'text-red-400'
                      }`}>
                        {trade.type === 'Purchase'
                          ? <ArrowUpRightIcon className="w-3.5 h-3.5" />
                          : <ArrowDownRightIcon className="w-3.5 h-3.5" />
                        }
                        {trade.type === 'Purchase' ? 'Kauf' : 'Verkauf'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${getAmountColor(trade.amount)}`}>
                      {formatAmount(trade.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 hidden lg:table-cell whitespace-nowrap">
                      {formatDate(trade.disclosureDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTrades.length === 0 && (
              <div className="text-center py-16 text-neutral-500">
                <MagnifyingGlassIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Keine Trades gefunden für "{searchQuery}"</p>
              </div>
            )}
          </div>
        ) : (
          /* POLITIKER TAB */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPoliticians.map(p => {
              const knownInfo = KNOWN_POLITICIANS[p.slug]
              return (
                <Link
                  key={p.slug}
                  href={`/politiker/${p.slug}`}
                  className="block bg-white/3 hover:bg-white/6 border border-white/8 rounded-xl p-5 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold text-sm">
                        {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white text-sm group-hover:text-brand transition-colors">
                            {p.name}
                          </span>
                          {knownInfo && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                              knownInfo.party === 'D'
                                ? 'bg-blue-500/15 text-blue-400'
                                : 'bg-red-500/15 text-red-400'
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
                    <ArrowUpRightIcon className="w-4 h-4 text-neutral-600 group-hover:text-brand transition-colors flex-shrink-0" />
                  </div>

                  <div className="flex gap-4 text-xs mb-3">
                    <div>
                      <div className="text-white font-semibold text-base">{p.tradeCount}</div>
                      <div className="text-neutral-500">Trades (Ø3Mo)</div>
                    </div>
                    <div>
                      <div className="text-neutral-300 font-medium">{formatDate(p.lastTrade)}</div>
                      <div className="text-neutral-500">Letzter Trade</div>
                    </div>
                  </div>

                  {/* Letzte Trades Preview */}
                  <div className="space-y-1.5">
                    {p.recentTrades.slice(0, 2).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`font-mono font-semibold ${t.ticker ? 'text-brand' : 'text-neutral-500'}`}>
                          {t.ticker || '–'}
                        </span>
                        <span className={t.type === 'Purchase' ? 'text-brand' : 'text-red-400'}>
                          {t.type === 'Purchase' ? '↑ Kauf' : '↓ Verkauf'}
                        </span>
                        <span className="text-neutral-500 ml-auto">{formatAmount(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-white/3 border border-white/8 rounded-xl">
          <p className="text-xs text-neutral-500 leading-relaxed">
            <strong className="text-neutral-400">Hinweis:</strong> Alle Daten basieren auf Pflichtmeldungen
            nach dem US STOCK Act (2012). Politiker müssen Transaktionen innerhalb von 30–45 Tagen melden.
            Angaben sind Wertbereiche, keine exakten Beträge. Keine Anlageberatung.
          </p>
        </div>
      </div>
    </div>
  )
}
