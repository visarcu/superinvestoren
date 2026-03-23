'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  BuildingLibraryIcon,
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  ChartBarIcon,
  FireIcon,
} from '@heroicons/react/24/outline'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

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

const KNOWN_POLITICIANS: Record<string, {
  party: 'D' | 'R' | 'I'
  fullState: string
  bio?: string
  chamber?: string
  yearsActive?: string
}> = {
  'nancy-pelosi': {
    party: 'D', fullState: 'California', chamber: 'Repräsentantenhaus',
    yearsActive: '1987–heute',
    bio: 'Ehemalige Sprecherin des Repräsentantenhauses, CA-11. Bekannt für aggressive Tech-Optionen-Strategien ihrer Familien-Trades.',
  },
  'dan-crenshaw': {
    party: 'R', fullState: 'Texas', chamber: 'Repräsentantenhaus',
    yearsActive: '2019–heute',
    bio: 'TX-02. Navy SEAL Veteran und Mitglied des Repräsentantenhauses.',
  },
  'tommy-tuberville': {
    party: 'R', fullState: 'Alabama', chamber: 'Senat',
    yearsActive: '2021–heute',
    bio: 'US-Senator aus Alabama. Ehemaliger College-Football-Trainer.',
  },
  'josh-gottheimer': {
    party: 'D', fullState: 'New Jersey', chamber: 'Repräsentantenhaus',
    yearsActive: '2017–heute',
    bio: 'NJ-05. Einer der aktivsten Aktien-Trader im Kongress.',
  },
  'marjorie-taylor-greene': {
    party: 'R', fullState: 'Georgia', chamber: 'Repräsentantenhaus',
    yearsActive: '2021–heute',
    bio: 'GA-14.',
  },
  'ro-khanna': {
    party: 'D', fullState: 'California', chamber: 'Repräsentantenhaus',
    yearsActive: '2017–heute',
    bio: 'CA-17. Silicon Valley Vertreter mit Fokus auf Tech-Aktien.',
  },
  'michael-mccaul': {
    party: 'R', fullState: 'Texas', chamber: 'Repräsentantenhaus',
    yearsActive: '2005–heute',
    bio: 'TX-10. Vorsitzender des Außenausschusses.',
  },
  'thomas-suozzi': {
    party: 'D', fullState: 'New York', chamber: 'Repräsentantenhaus',
    yearsActive: '2023–heute',
    bio: 'NY-03.',
  },
  'august-lee-pfluger': {
    party: 'R', fullState: 'Texas', chamber: 'Repräsentantenhaus',
    yearsActive: '2021–heute',
    bio: 'TX-11.',
  },
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '–'
  try {
    const [year, month, day] = dateStr.split('-')
    return `${day}.${month}.${year}`
  } catch { return dateStr }
}

function formatAmount(amount: string): string {
  if (!amount) return '–'
  return amount.replace('$', '').trim()
}

// Schätze den Mittelwert eines Betragsbereiches
function parseAmountMid(amount: string): number {
  if (!amount) return 0
  const nums = amount.replace(/[$,]/g, '').match(/\d+/g)
  if (!nums) return 0
  if (nums.length === 1) return parseInt(nums[0])
  return (parseInt(nums[0]) + parseInt(nums[1])) / 2
}

function slugToName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Custom Tooltip für den Chart
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-neutral-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${p.dataKey === 'buys' ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
          <span className={p.dataKey === 'buys' ? 'text-emerald-400' : 'text-red-400'}>
            {p.dataKey === 'buys' ? 'Käufe' : 'Verkäufe'}:
          </span>
          <span className="text-white font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function PolitikerDetailPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [trades, setTrades] = useState<PoliticianTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'purchase' | 'sale'>('all')

  const name = slugToName(slug)
  const knownInfo = KNOWN_POLITICIANS[slug]

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/politicians?politician=${slug}&pages=10`)
      .then(r => r.json())
      .then(data => setTrades(data.trades || []))
      .catch(err => console.error('Fehler:', err))
      .finally(() => setLoading(false))
  }, [slug])

  const filteredTrades = useMemo(() =>
    trades.filter(t =>
      typeFilter === 'all' || t.type?.toLowerCase() === typeFilter.toLowerCase()
    ),
    [trades, typeFilter]
  )

  // Statistiken
  const stats = useMemo(() => {
    const purchases = trades.filter(t => t.type?.toLowerCase() === 'purchase').length
    const sales = trades.filter(t => t.type?.toLowerCase() === 'sale').length
    const uniqueStocks = new Set(trades.map(t => t.ticker).filter(Boolean)).size
    const totalVolume = trades.reduce((s, t) => s + parseAmountMid(t.amount), 0)

    const tickerCount: Record<string, { count: number; name: string; buys: number; sells: number }> = {}
    trades.forEach(t => {
      if (!t.ticker) return
      if (!tickerCount[t.ticker]) tickerCount[t.ticker] = { count: 0, name: t.assetDescription || t.ticker, buys: 0, sells: 0 }
      tickerCount[t.ticker].count++
      if (t.type?.toLowerCase() === 'purchase') tickerCount[t.ticker].buys++
      else tickerCount[t.ticker].sells++
    })
    const topTickers = Object.entries(tickerCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)

    const lastTrade = trades.length > 0
      ? trades.reduce((a, b) => a.transactionDate > b.transactionDate ? a : b)
      : null

    // Trades nach Jahr gruppiert
    const byYear: Record<string, { buys: number; sells: number }> = {}
    trades.forEach(t => {
      const year = t.transactionDate?.split('-')[0]
      if (!year) return
      if (!byYear[year]) byYear[year] = { buys: 0, sells: 0 }
      if (t.type?.toLowerCase() === 'purchase') byYear[year].buys++
      else byYear[year].sells++
    })
    const yearData = Object.entries(byYear)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, d]) => ({ year, ...d, total: d.buys + d.sells }))

    return { purchases, sales, uniqueStocks, totalVolume, topTickers, lastTrade, yearData }
  }, [trades])

  const partyColor = knownInfo?.party === 'D' ? 'text-blue-400' : knownInfo?.party === 'R' ? 'text-red-400' : 'text-neutral-400'
  const partyLabel = knownInfo?.party === 'D' ? 'Demokrat' : knownInfo?.party === 'R' ? 'Republikaner' : 'Unabhängig'

  return (
    <div className="min-h-screen bg-dark">

      {/* Header */}
      <section className="bg-dark pt-8 pb-6">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <Link
            href="/politiker"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors mb-6"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Politiker-Trades
          </Link>

          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-xl bg-neutral-800 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 border border-neutral-700">
              {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">{name}</h1>
                {knownInfo && <span className={`text-sm font-medium ${partyColor}`}>{partyLabel}</span>}
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-500 mb-2">
                {knownInfo && (
                  <>
                    <BuildingLibraryIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{knownInfo.fullState}</span>
                    {knownInfo.chamber && <span className="text-neutral-600">· {knownInfo.chamber}</span>}
                    {trades[0]?.district && <span className="text-neutral-600">· {trades[0].district}</span>}
                    {knownInfo.yearsActive && <span className="text-neutral-600">· {knownInfo.yearsActive}</span>}
                  </>
                )}
              </div>
              {knownInfo?.bio && (
                <p className="text-sm text-neutral-500 max-w-2xl">{knownInfo.bio}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 pb-8 border-b border-neutral-800">
          <div className="p-4">
            <p className="text-2xl font-semibold text-brand">{loading ? '–' : trades.length}</p>
            <p className="text-sm text-neutral-500">Trades gesamt</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold text-emerald-400">{loading ? '–' : stats.purchases}</p>
            <p className="text-sm text-neutral-500">Käufe</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold text-red-400">{loading ? '–' : stats.sales}</p>
            <p className="text-sm text-neutral-500">Verkäufe</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold text-white">{loading ? '–' : stats.lastTrade ? formatDate(stats.lastTrade.transactionDate) : '–'}</p>
            <p className="text-sm text-neutral-500">Letzter Trade</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-neutral-800/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-20">
            <BuildingLibraryIcon className="w-10 h-10 mx-auto text-neutral-700 mb-4" />
            <p className="text-neutral-400 font-medium mb-2">Keine Trades gefunden</p>
            <p className="text-sm text-neutral-600 mb-6">Für {name} wurden keine Pflichtmeldungen gefunden.</p>
            <Link href="/politiker" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
              <ArrowLeftIcon className="w-4 h-4" />Zurück zur Übersicht
            </Link>
          </div>
        ) : (
          <>
            {/* Charts Row */}
            {stats.yearData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

                {/* Trade Volume by Year */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                    <ChartBarIcon className="w-5 h-5 text-neutral-500" />
                    <h3 className="text-base font-medium text-white">Trade-Volumen nach Jahr</h3>
                    <div className="ml-auto flex items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block opacity-80"></span>Käufe
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block opacity-60"></span>Verkäufe
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={stats.yearData} barGap={2} barCategoryGap="30%">
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                        width={24}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="buys" fill="#10b981" radius={[2, 2, 0, 0]} opacity={0.85} />
                      <Bar dataKey="sells" fill="#ef4444" radius={[2, 2, 0, 0]} opacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Traded Stocks */}
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                    <FireIcon className="w-5 h-5 text-neutral-500" />
                    <h3 className="text-base font-medium text-white">Meist gehandelt</h3>
                  </div>
                  <div className="space-y-0">
                    {stats.topTickers.map(([ticker, data], i) => {
                      const maxCount = stats.topTickers[0]?.[1].count || 1
                      const pct = (data.count / maxCount) * 100
                      return (
                        <Link
                          key={ticker}
                          href={`/analyse/stocks/${ticker}`}
                          className="flex items-center justify-between py-2.5 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs text-neutral-600 w-4 tabular-nums">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-medium text-white group-hover:text-neutral-300 transition-colors">{ticker}</span>
                                <span className="text-xs text-emerald-500 opacity-80">{data.buys}K</span>
                                <span className="text-xs text-neutral-600">/</span>
                                <span className="text-xs text-red-400 opacity-80">{data.sells}V</span>
                              </div>
                              <div className="w-full bg-neutral-800 rounded-full h-0.5">
                                <div className="bg-brand h-0.5 rounded-full" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          </div>
                          <span className="text-sm text-neutral-400 tabular-nums ml-3">{data.count}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Trades Table */}
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-neutral-500" />
                  <h3 className="text-base font-medium text-white">
                    Alle Transaktionen
                    <span className="text-neutral-500 font-normal text-sm ml-2">({filteredTrades.length})</span>
                  </h3>
                </div>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as 'all' | 'purchase' | 'sale')}
                  className="appearance-none px-3 py-2 rounded-lg text-sm cursor-pointer bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700 focus:outline-none"
                >
                  <option value="all">Alle Typen</option>
                  <option value="purchase">Nur Käufe</option>
                  <option value="sale">Nur Verkäufe</option>
                </select>
              </div>

              {/* Column Headers */}
              <div className="flex items-center gap-4 py-2 px-2 mb-1">
                <span className="text-xs text-neutral-600 w-24 flex-shrink-0">Gehandelt</span>
                <span className="text-xs text-neutral-600 flex-1">Aktie</span>
                <span className="text-xs text-neutral-600 w-20 hidden sm:block">Typ</span>
                <span className="text-xs text-neutral-600 w-36 text-right">Betrag</span>
                <span className="text-xs text-neutral-600 w-24 hidden md:block text-right">Gemeldet</span>
                <span className="text-xs text-neutral-600 w-20 hidden lg:block">Eigentümer</span>
                <span className="w-4 flex-shrink-0"></span>
              </div>

              <div className="space-y-0">
                {filteredTrades.map((trade, i) => (
                  <div
                    key={`${trade.transactionDate}-${trade.ticker}-${i}`}
                    className="flex items-center gap-4 py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
                  >
                    <span className="text-xs text-neutral-500 w-24 flex-shrink-0 tabular-nums">
                      {formatDate(trade.transactionDate)}
                    </span>

                    <div className="flex-1 min-w-0">
                      {trade.ticker ? (
                        <Link href={`/analyse/stocks/${trade.ticker}`} className="group/t">
                          <p className="text-sm font-medium text-white group-hover/t:text-neutral-300 transition-colors">
                            {trade.ticker}
                          </p>
                          <p className="text-xs text-neutral-500 truncate max-w-[200px]">
                            {trade.assetDescription}
                          </p>
                        </Link>
                      ) : (
                        <div>
                          <p className="text-sm text-neutral-500">–</p>
                          <p className="text-xs text-neutral-600 truncate max-w-[200px]">{trade.assetDescription}</p>
                        </div>
                      )}
                    </div>

                    <div className="w-20 hidden sm:flex items-center gap-1.5">
                      {trade.type?.toLowerCase() === 'purchase'
                        ? <ArrowUpRightIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        : <ArrowDownRightIcon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      }
                      <span className={`text-sm ${trade.type?.toLowerCase() === 'purchase' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {trade.type?.toLowerCase() === 'purchase' ? 'Kauf' : 'Verkauf'}
                      </span>
                    </div>

                    <span className="text-sm text-neutral-300 w-36 text-right tabular-nums">
                      {formatAmount(trade.amount)}
                    </span>

                    <span className="text-xs text-neutral-600 w-24 hidden md:block text-right tabular-nums">
                      {formatDate(trade.disclosureDate)}
                    </span>

                    <span className="text-xs text-neutral-500 w-20 hidden lg:block truncate">
                      {trade.owner || 'Direkt'}
                    </span>

                    <div className="w-4 flex-shrink-0">
                      {trade.link && (
                        <a
                          href={trade.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Originaldokument"
                          className="text-neutral-700 hover:text-neutral-400 transition-colors"
                        >
                          <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
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
