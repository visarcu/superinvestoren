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
} from '@heroicons/react/24/outline'

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

const KNOWN_POLITICIANS: Record<string, { party: 'D' | 'R' | 'I'; fullState: string; bio?: string }> = {
  'nancy-pelosi': {
    party: 'D',
    fullState: 'California',
    bio: 'Ehemalige Sprecherin des Repräsentantenhauses. Bekannt für aggressive Tech-Optionen-Strategien.',
  },
  'dan-crenshaw': {
    party: 'R',
    fullState: 'Texas',
    bio: 'Mitglied des Repräsentantenhauses, TX-02. Navy SEAL Veteran.',
  },
  'tommy-tuberville': {
    party: 'R',
    fullState: 'Alabama',
    bio: 'US-Senator aus Alabama. Ehemaliger College-Football-Trainer.',
  },
  'josh-gottheimer': {
    party: 'D',
    fullState: 'New Jersey',
    bio: 'Mitglied des Repräsentantenhauses, NJ-05.',
  },
  'marjorie-taylor-greene': {
    party: 'R',
    fullState: 'Georgia',
    bio: 'Mitglied des Repräsentantenhauses, GA-14.',
  },
  'ro-khanna': {
    party: 'D',
    fullState: 'California',
    bio: 'Mitglied des Repräsentantenhauses, CA-17. Silicon Valley Vertreter.',
  },
  'michael-mccaul': {
    party: 'R',
    fullState: 'Texas',
    bio: 'Mitglied des Repräsentantenhauses, TX-10. Vorsitzender des Außenausschusses.',
  },
  'thomas-suozzi': {
    party: 'D',
    fullState: 'New York',
    bio: 'Mitglied des Repräsentantenhauses, NY-03.',
  },
  'august-lee-pfluger': {
    party: 'R',
    fullState: 'Texas',
    bio: 'Mitglied des Repräsentantenhauses, TX-11.',
  },
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

function formatAmount(amount: string): string {
  if (!amount) return '–'
  return amount.replace('$', '').trim()
}

function slugToName(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function PolitikerDetailPage() {
  const params = useParams()
  const slug = params?.slug as string

  const [trades, setTrades] = useState<PoliticianTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'Purchase' | 'Sale'>('all')

  const name = slugToName(slug)
  const knownInfo = KNOWN_POLITICIANS[slug]

  useEffect(() => {
    if (!slug) return
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/politicians?politician=${slug}&pages=8`)
        const data = await res.json()
        setTrades(data.trades || [])
      } catch (err) {
        console.error('Fehler beim Laden:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  const filteredTrades = useMemo(() => {
    return trades.filter(t => typeFilter === 'all' || t.type === typeFilter)
  }, [trades, typeFilter])

  const stats = useMemo(() => {
    const purchases = trades.filter(t => t.type === 'Purchase').length
    const sales = trades.filter(t => t.type === 'Sale').length
    const uniqueStocks = new Set(trades.map(t => t.ticker).filter(Boolean)).size

    const tickerCount: Record<string, number> = {}
    trades.forEach(t => {
      if (t.ticker) tickerCount[t.ticker] = (tickerCount[t.ticker] || 0) + 1
    })
    const topTicker = Object.entries(tickerCount).sort((a, b) => b[1] - a[1])[0]

    const lastTrade = trades.length > 0
      ? trades.reduce((a, b) => a.transactionDate > b.transactionDate ? a : b)
      : null

    return { purchases, sales, uniqueStocks, topTicker, lastTrade }
  }, [trades])

  return (
    <div className="min-h-screen bg-dark">

      {/* Header */}
      <section className="bg-dark pt-8 pb-8">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">

          {/* Breadcrumb */}
          <Link
            href="/politiker"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors mb-6"
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Politiker-Trades
          </Link>

          {/* Name + Party */}
          <div className="flex items-start gap-4 mb-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
                  {name}
                </h1>
                {knownInfo && (
                  <span className={`text-sm font-medium ${
                    knownInfo.party === 'D' ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {knownInfo.party === 'D' ? 'Demokrat' : knownInfo.party === 'R' ? 'Republikaner' : 'Unabhängig'}
                  </span>
                )}
              </div>

              {knownInfo && (
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                  <BuildingLibraryIcon className="w-4 h-4" />
                  <span>{knownInfo.fullState}</span>
                  {trades[0]?.district && (
                    <span className="text-neutral-600">· {trades[0].district}</span>
                  )}
                </div>
              )}

              {knownInfo?.bio && (
                <p className="text-sm text-neutral-500 max-w-xl">{knownInfo.bio}</p>
              )}
            </div>
          </div>

          {/* Meta */}
          {!loading && trades.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 mt-3">
              <span>{trades.length} Transaktionen</span>
              <span className="text-neutral-600">•</span>
              <span>{stats.uniqueStocks} verschiedene Aktien</span>
              {stats.lastTrade && (
                <>
                  <span className="text-neutral-600">•</span>
                  <span>Letzter Trade: {formatDate(stats.lastTrade.transactionDate)}</span>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* Stats */}
        {!loading && trades.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 pb-8 border-b border-neutral-800">
            <div className="p-4">
              <p className="text-2xl font-semibold text-white">{trades.length}</p>
              <p className="text-sm text-neutral-500">Trades gesamt</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-semibold text-white">{stats.purchases}</p>
              <p className="text-sm text-neutral-500">Käufe</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-semibold text-white">{stats.sales}</p>
              <p className="text-sm text-neutral-500">Verkäufe</p>
            </div>
            <div className="p-4">
              <p className="text-2xl font-semibold text-white font-mono">
                {stats.topTicker?.[0] ?? '–'}
              </p>
              <p className="text-sm text-neutral-500">Meistgehandelt</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-neutral-500" />
            <h3 className="text-white font-medium">Transaktionshistorie</h3>
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as 'all' | 'Purchase' | 'Sale')}
            className="appearance-none px-3 py-2 rounded-lg text-sm cursor-pointer bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700 focus:outline-none"
          >
            <option value="all">Alle Typen</option>
            <option value="Purchase">Nur Käufe</option>
            <option value="Sale">Nur Verkäufe</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-0">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-3 bg-neutral-800 rounded w-20"></div>
                  <div className="h-3 bg-neutral-800 rounded w-16"></div>
                </div>
                <div className="h-3 bg-neutral-800 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-20">
            <BuildingLibraryIcon className="w-10 h-10 mx-auto text-neutral-700 mb-4" />
            <h3 className="text-neutral-400 font-medium mb-2">Keine Trades gefunden</h3>
            <p className="text-sm text-neutral-600 mb-6">
              Für {name} wurden keine Pflichtmeldungen in den letzten Monaten gefunden.
            </p>
            <Link
              href="/politiker"
              className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Zurück zur Übersicht
            </Link>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Column headers */}
            <div className="flex items-center gap-4 py-2 px-2 mb-1">
              <span className="text-xs text-neutral-600 w-24 flex-shrink-0">Datum</span>
              <span className="text-xs text-neutral-600 w-28">Aktie</span>
              <span className="text-xs text-neutral-600 w-20 hidden sm:block">Typ</span>
              <span className="text-xs text-neutral-600 flex-1 text-right">Betrag</span>
              <span className="text-xs text-neutral-600 w-24 hidden md:block">Eigentümer</span>
              <span className="text-xs text-neutral-600 w-24 hidden lg:block">Gemeldet</span>
              <span className="w-4"></span>
            </div>

            {filteredTrades.map((trade, i) => (
              <div
                key={`${trade.transactionDate}-${trade.ticker}-${i}`}
                className="flex items-center gap-4 py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
              >
                <span className="text-xs text-neutral-500 w-24 flex-shrink-0 tabular-nums">
                  {formatDate(trade.transactionDate)}
                </span>

                <div className="w-28 min-w-0">
                  {trade.ticker ? (
                    <Link href={`/analyse/stocks/${trade.ticker}`} className="group/t">
                      <p className="text-sm font-medium text-white group-hover/t:text-neutral-300 transition-colors">
                        {trade.ticker}
                      </p>
                      <p className="text-xs text-neutral-500 truncate max-w-[100px]">
                        {trade.assetDescription?.slice(0, 20)}
                      </p>
                    </Link>
                  ) : (
                    <div>
                      <p className="text-sm text-neutral-500">–</p>
                      <p className="text-xs text-neutral-600 truncate max-w-[100px]">
                        {trade.assetDescription?.slice(0, 20)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="w-20 hidden sm:flex items-center gap-1.5">
                  {trade.type === 'Purchase'
                    ? <ArrowUpRightIcon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    : <ArrowDownRightIcon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                  }
                  <span className="text-sm text-neutral-300">
                    {trade.type === 'Purchase' ? 'Kauf' : 'Verkauf'}
                  </span>
                </div>

                <span className="text-sm text-neutral-300 flex-1 text-right tabular-nums">
                  {formatAmount(trade.amount)}
                </span>

                <span className="text-xs text-neutral-500 w-24 hidden md:block truncate">
                  {trade.owner || 'Direkt'}
                </span>

                <span className="text-xs text-neutral-600 w-24 hidden lg:block tabular-nums">
                  {formatDate(trade.disclosureDate)}
                </span>

                <div className="w-4">
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
