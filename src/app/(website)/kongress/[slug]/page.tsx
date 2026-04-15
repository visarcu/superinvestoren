// /kongress/[slug] — Politician Detail (Design wie /superinvestor/[slug])
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  BuildingLibraryIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon,
  UserIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

// ── Types ────────────────────────────────────────────────────────────────────

interface PoliticianData {
  slug: string; name: string; chamber: string; state: string
  party: string | null; photoUrl: string | null; bioguideId: string | null
  stats: {
    totalTrades: number; purchases: number; sales: number
    uniqueStocks: number; estimatedVolume: number; estimatedVolumeFormatted: string
    lastTradeDate: string | null; firstTradeDate: string | null
  }
  topTickers: { ticker: string; count: number; buys: number; sells: number; volume: number }[]
  tradesByYear: { year: string; buys: number; sells: number; volume: number; total: number }[]
  trades: {
    transactionDate: string; disclosureDate: string; ticker: string
    asset: string; type: string; amount: string; owner: string
    capitalGains: boolean; link: string
  }[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)} Mrd. $`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)} Mio. $`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K $`
  return `${v} $`
}

const US_STATES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'Kalifornien',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
  IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
  ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
  MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
  TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
  WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'Washington D.C.',
}

const TT: React.CSSProperties = {
  backgroundColor: 'rgb(23,23,23)', border: '1px solid rgb(38,38,38)',
  borderRadius: '8px', padding: '8px 12px',
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function PolitikerDetailPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [data, setData] = useState<PoliticianData | null>(null)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'purchase' | 'sale'>('all')
  const [showAllTrades, setShowAllTrades] = useState(false)
  const [sortField, setSortField] = useState<'date' | 'ticker' | 'amount' | 'disclosure'>('date')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/v1/politicians/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setData(d) })
      .finally(() => setLoading(false))
  }, [slug])

  // Betrag-Range in Zahl für Sortierung
  const amountToNum = (a: string): number => {
    const ranges: Record<string, number> = {
      '$1,001 - $15,000': 8000, '$15,001 - $50,000': 32500,
      '$50,001 - $100,000': 75000, '$100,001 - $250,000': 175000,
      '$250,001 - $500,000': 375000, '$500,001 - $1,000,000': 750000,
      '$1,000,001 - $5,000,000': 3000000, '$5,000,001 - $25,000,000': 15000000,
      'Over $50,000,000': 75000000,
    }
    return ranges[a] || 0
  }

  const toggleSort = (field: 'date' | 'ticker' | 'amount' | 'disclosure') => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }

  const filteredTrades = useMemo(() => {
    if (!data) return []
    let trades = typeFilter === 'all' ? [...data.trades] : data.trades.filter(t => t.type === typeFilter)

    trades.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = (a.transactionDate || '').localeCompare(b.transactionDate || '')
      else if (sortField === 'ticker') cmp = (a.ticker || '').localeCompare(b.ticker || '')
      else if (sortField === 'amount') cmp = amountToNum(a.amount) - amountToNum(b.amount)
      else if (sortField === 'disclosure') cmp = (a.disclosureDate || '').localeCompare(b.disclosureDate || '')
      return sortDir === 'desc' ? -cmp : cmp
    })

    return trades
  }, [data, typeFilter, sortField, sortDir])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-neutral-400">Politiker nicht gefunden</p>
          <Link href="/kongress" className="text-sm text-neutral-500 hover:text-neutral-300 mt-2 inline-block">← Zurück</Link>
        </div>
      </div>
    )
  }

  const isD = data.party?.startsWith('D')
  const isR = data.party?.startsWith('R')
  const partyLabel = isD ? 'Demokrat' : isR ? 'Republikaner' : 'Unabhängig'
  const partyColor = isD ? 'text-blue-400' : isR ? 'text-red-400' : 'text-neutral-400'
  const stateName = US_STATES[data.state] || data.state
  const chamberLabel = data.chamber === 'senate' ? 'Senat' : 'Repräsentantenhaus'

  return (
    <div className="min-h-screen">
      {/* ── Header ──────────────────────────────────────────── */}
      <section className="bg-dark pt-6 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Breadcrumb */}
          <Link href="/kongress" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors mb-6">
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Kongress-Trading
          </Link>

          <div className="flex items-start gap-5">
            {/* Foto */}
            {data.photoUrl ? (
              <img src={data.photoUrl} alt={data.name}
                className="w-20 h-24 rounded-xl object-cover border border-neutral-700 flex-shrink-0" />
            ) : (
              <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${
                isD ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : isR ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
              }`}>
                {data.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">{data.name}</h1>
                <span className={`text-sm font-medium ${partyColor}`}>{partyLabel}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-neutral-500 mb-2">
                <BuildingLibraryIcon className="w-4 h-4 flex-shrink-0" />
                <span>{stateName}</span>
                <span className="text-neutral-600">·</span>
                <span>{chamberLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                <span>{data.stats.totalTrades} Trades</span>
                <span className="text-neutral-600">•</span>
                <span>{data.stats.uniqueStocks} Aktien</span>
                <span className="text-neutral-600">•</span>
                <span>Letzter Trade: {fmtDate(data.stats.lastTradeDate || '')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Stats Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12 pb-8 border-b border-neutral-800">
          <div className="p-4">
            <p className="text-2xl font-semibold text-white">{data.stats.totalTrades}</p>
            <p className="text-sm text-neutral-500">Trades gesamt</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold text-emerald-400">{data.stats.purchases}</p>
            <p className="text-sm text-neutral-500">Käufe</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold text-red-400">{data.stats.sales}</p>
            <p className="text-sm text-neutral-500">Verkäufe</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold text-white">{data.stats.uniqueStocks}</p>
            <p className="text-sm text-neutral-500">Verschiedene Aktien</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-semibold text-white">{data.stats.estimatedVolumeFormatted}</p>
            <p className="text-sm text-neutral-500">Geschätztes Volumen</p>
          </div>
        </div>

        {/* ── 2-Column: Chart + Top Positionen ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">

          {/* Handelsvolumen Chart */}
          {data.tradesByYear.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                <ChartBarIcon className="w-5 h-5 text-neutral-500" />
                <h3 className="text-base font-medium text-white">Handelsaktivität nach Jahr</h3>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.tradesByYear} barGap={4}>
                    <XAxis dataKey="year" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={TT} />
                    <Bar dataKey="buys" name="Käufe" fill="rgba(52,211,153,0.5)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="sells" name="Verkäufe" fill="rgba(248,113,113,0.4)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Positionen */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
              <ArrowTrendingUpIcon className="w-5 h-5 text-neutral-500" />
              <h3 className="text-base font-medium text-white">Top Positionen</h3>
            </div>
            <div className="space-y-0">
              {data.topTickers.slice(0, 10).map(t => (
                <Link key={t.ticker} href={`/analyse/stocks/${t.ticker.toLowerCase()}/politiker`}
                  className="flex justify-between items-center py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 flex-shrink-0">
                      <img src={`https://financialmodelingprep.com/image-stock/${t.ticker}.png`}
                        alt={t.ticker} className="w-full h-full rounded object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-neutral-300">{t.ticker}</p>
                      <p className="text-xs text-neutral-500">{t.buys} Käufe · {t.sells} Verkäufe</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-neutral-300">{fmtVolume(t.volume)}</span>
                    <p className="text-xs text-neutral-500">{t.count}x gehandelt</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Buy/Sell Ratio Bar ──────────────────────────────── */}
        <div className="mb-12 pb-8 border-b border-neutral-800">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-emerald-400 font-medium">{data.stats.purchases} Käufe ({data.stats.totalTrades > 0 ? Math.round(data.stats.purchases / data.stats.totalTrades * 100) : 0}%)</span>
            <span className="text-red-400 font-medium">{data.stats.sales} Verkäufe ({data.stats.totalTrades > 0 ? Math.round(data.stats.sales / data.stats.totalTrades * 100) : 0}%)</span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500/60 rounded-l-full transition-all" style={{ width: `${data.stats.totalTrades > 0 ? (data.stats.purchases / data.stats.totalTrades) * 100 : 50}%` }} />
            <div className="bg-red-500/50 rounded-r-full flex-1" />
          </div>
        </div>

        {/* ── Trades Tabelle ──────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-neutral-500" />
              <h3 className="text-base font-medium text-white">Alle Trades</h3>
              <span className="text-xs text-neutral-500 ml-2">{filteredTrades.length} Einträge</span>
            </div>
            <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
              {([['all', 'Alle'], ['purchase', 'Käufe'], ['sale', 'Verkäufe']] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTypeFilter(k)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${typeFilter === k ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-3 px-3 text-xs font-medium">
                    <button onClick={() => toggleSort('date')} className={`flex items-center gap-1 transition-colors ${sortField === 'date' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                      Datum {sortField === 'date' && <span className="text-[10px]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                    </button>
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-medium">
                    <button onClick={() => toggleSort('ticker')} className={`flex items-center gap-1 transition-colors ${sortField === 'ticker' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                      Ticker {sortField === 'ticker' && <span className="text-[10px]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                    </button>
                  </th>
                  <th className="text-left py-3 px-3 text-xs text-neutral-500 font-medium hidden md:table-cell">Asset</th>
                  <th className="text-left py-3 px-3 text-xs text-neutral-500 font-medium">Typ</th>
                  <th className="text-left py-3 px-3 text-xs font-medium">
                    <button onClick={() => toggleSort('amount')} className={`flex items-center gap-1 transition-colors ${sortField === 'amount' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                      Betrag {sortField === 'amount' && <span className="text-[10px]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                    </button>
                  </th>
                  <th className="text-left py-3 px-3 text-xs text-neutral-500 font-medium hidden sm:table-cell">Owner</th>
                  <th className="text-left py-3 px-3 text-xs font-medium hidden lg:table-cell">
                    <button onClick={() => toggleSort('disclosure')} className={`flex items-center gap-1 transition-colors ${sortField === 'disclosure' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                      Offenlegung {sortField === 'disclosure' && <span className="text-[10px]">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {(showAllTrades ? filteredTrades : filteredTrades.slice(0, 50)).map((t, i) => (
                  <tr key={i} className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                    <td className="py-3 px-3 text-sm text-neutral-400 tabular-nums whitespace-nowrap">{fmtDate(t.transactionDate)}</td>
                    <td className="py-3 px-3">
                      {t.ticker ? (
                        <Link href={`/analyse/stocks/${t.ticker.toLowerCase()}`} className="text-sm font-medium text-white hover:text-neutral-300 transition-colors">
                          {t.ticker}
                        </Link>
                      ) : <span className="text-sm text-neutral-600">—</span>}
                    </td>
                    <td className="py-3 px-3 text-sm text-neutral-500 max-w-[200px] truncate hidden md:table-cell">{t.asset || '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${t.type === 'purchase' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.type === 'purchase' ? (
                          <><ArrowTrendingUpIcon className="w-3 h-3" /> Kauf</>
                        ) : (
                          <><ArrowTrendingDownIcon className="w-3 h-3" /> Verkauf</>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-neutral-400 whitespace-nowrap">{t.amount}</td>
                    <td className="py-3 px-3 text-sm text-neutral-500 capitalize hidden sm:table-cell">{t.owner || '—'}</td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      {t.link ? (
                        <a href={t.link} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors underline decoration-neutral-700">
                          {fmtDate(t.disclosureDate)}
                        </a>
                      ) : (
                        <span className="text-xs text-neutral-600">{fmtDate(t.disclosureDate)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTrades.length > 50 && !showAllTrades && (
              <button onClick={() => setShowAllTrades(true)}
                className="w-full py-3 text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800/50 transition-colors border-t border-neutral-800">
                Alle {filteredTrades.length} Trades anzeigen ↓
              </button>
            )}
            {showAllTrades && filteredTrades.length > 50 && (
              <button onClick={() => setShowAllTrades(false)}
                className="w-full py-3 text-sm font-medium text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/50 transition-colors border-t border-neutral-800">
                Weniger anzeigen ↑
              </button>
            )}
            {filteredTrades.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-neutral-500">Keine Trades gefunden</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Source ──────────────────────────────────────────── */}
        <p className="text-xs text-neutral-600 pt-4 border-t border-neutral-800">
          Daten: STOCK Act Offenlegungen. Handelsvolumen geschätzt aus Betrags-Ranges.
          Quelle: House Clerk Disclosures / Senate eFD.
        </p>
      </div>
    </div>
  )
}
