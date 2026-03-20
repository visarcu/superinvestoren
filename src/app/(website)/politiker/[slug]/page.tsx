'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowTopRightOnSquareIcon,
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
    bio: 'Ehemalige Sprecherin des Repräsentantenhauses, CA-11. Bekannt für aggressive Tech-Optionen-Strategien.',
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

function parseAmountMin(amount: string): number {
  const match = amount?.replace(/[$,]/g, '').match(/[\d]+/)
  return match ? parseInt(match[0]) : 0
}

function formatAmount(amount: string): string {
  if (!amount) return '–'
  return amount.replace('$', '').trim()
}

function getAmountColor(amount: string): string {
  const num = parseAmountMin(amount)
  if (num >= 1_000_000) return 'text-yellow-400'
  if (num >= 100_000) return 'text-brand'
  return 'text-neutral-300'
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
    return trades.filter(t =>
      typeFilter === 'all' || t.type === typeFilter
    )
  }, [trades, typeFilter])

  const stats = useMemo(() => {
    const purchases = trades.filter(t => t.type === 'Purchase').length
    const sales = trades.filter(t => t.type === 'Sale').length
    const uniqueStocks = new Set(trades.map(t => t.ticker).filter(Boolean)).size

    // Meistgehandelte Aktie
    const tickerCount: Record<string, number> = {}
    trades.forEach(t => {
      if (t.ticker) tickerCount[t.ticker] = (tickerCount[t.ticker] || 0) + 1
    })
    const topTicker = Object.entries(tickerCount).sort((a, b) => b[1] - a[1])[0]

    // Letzter Trade
    const lastTrade = trades.length > 0
      ? trades.reduce((a, b) => a.transactionDate > b.transactionDate ? a : b)
      : null

    return { purchases, sales, uniqueStocks, topTicker, lastTrade }
  }, [trades])

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <section className="pt-10 pb-8 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          {/* Back */}
          <Link
            href="/politiker"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors mb-6"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Alle Politiker
          </Link>

          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  {name}
                </h1>
                {knownInfo && (
                  <span className={`text-sm px-2 py-0.5 rounded font-semibold ${
                    knownInfo.party === 'D'
                      ? 'bg-blue-500/15 text-blue-400'
                      : knownInfo.party === 'R'
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-neutral-500/15 text-neutral-400'
                  }`}>
                    {knownInfo.party === 'D' ? 'Demokrat' : knownInfo.party === 'R' ? 'Republikaner' : 'Unabhängig'}
                  </span>
                )}
              </div>

              {knownInfo && (
                <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
                  <BuildingLibraryIcon className="w-4 h-4" />
                  {knownInfo.fullState}
                  {trades[0]?.district && (
                    <span className="text-neutral-600">· {trades[0].district}</span>
                  )}
                </div>
              )}

              {knownInfo?.bio && (
                <p className="text-sm text-neutral-500 leading-relaxed max-w-xl">
                  {knownInfo.bio}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          {!loading && trades.length > 0 && (
            <div className="flex flex-wrap gap-6 mt-6">
              <div>
                <div className="text-2xl font-bold text-white">{trades.length}</div>
                <div className="text-xs text-neutral-500 mt-0.5">Trades gesamt</div>
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
              {stats.topTicker && (
                <>
                  <div className="w-px bg-white/10"></div>
                  <div>
                    <div className="text-2xl font-bold text-brand font-mono">{stats.topTicker[0]}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">Am meisten gehandelt</div>
                  </div>
                </>
              )}
              {stats.lastTrade && (
                <>
                  <div className="w-px bg-white/10"></div>
                  <div>
                    <div className="text-lg font-bold text-white">{formatDate(stats.lastTrade.transactionDate)}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">Letzter Trade</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Filter */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-neutral-500">Filter:</span>
          {(['all', 'Purchase', 'Sale'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
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

        {loading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-20">
            <BuildingLibraryIcon className="w-12 h-12 mx-auto text-neutral-700 mb-4" />
            <h3 className="text-neutral-400 font-medium mb-2">Keine Trades gefunden</h3>
            <p className="text-sm text-neutral-600">
              Für {name} wurden keine Pflichtmeldungen in den letzten Monaten gefunden.
            </p>
            <Link
              href="/politiker"
              className="inline-flex items-center gap-2 mt-6 text-sm text-brand hover:underline"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Zurück zur Übersicht
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium">Datum</th>
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium">Aktie</th>
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium">Art</th>
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium">Betrag</th>
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium hidden md:table-cell">Eigentümer</th>
                  <th className="text-left px-4 py-3 text-xs text-neutral-500 font-medium hidden lg:table-cell">Gemeldet am</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((trade, i) => (
                  <tr
                    key={`${trade.transactionDate}-${trade.ticker}-${i}`}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-neutral-400 whitespace-nowrap">
                      {formatDate(trade.transactionDate)}
                    </td>
                    <td className="px-4 py-3">
                      {trade.ticker ? (
                        <Link href={`/analyse/stocks/${trade.ticker}`} className="group">
                          <div className="text-sm font-mono font-semibold text-brand group-hover:text-brand/80">
                            {trade.ticker}
                          </div>
                          <div className="text-xs text-neutral-500 truncate max-w-[160px]">
                            {trade.assetDescription}
                          </div>
                        </Link>
                      ) : (
                        <div>
                          <div className="text-sm text-neutral-500">–</div>
                          <div className="text-xs text-neutral-600 truncate max-w-[160px]">
                            {trade.assetDescription}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-sm font-medium ${
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
                    <td className="px-4 py-3 text-xs text-neutral-500 hidden md:table-cell">
                      {trade.owner || 'Direkt'}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500 hidden lg:table-cell whitespace-nowrap">
                      {formatDate(trade.disclosureDate)}
                    </td>
                    <td className="px-4 py-3">
                      {trade.link && (
                        <a
                          href={trade.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-600 hover:text-neutral-300 transition-colors"
                          title="Originaldokument (PDF)"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Disclaimer */}
        {!loading && trades.length > 0 && (
          <div className="mt-6 p-4 bg-white/3 border border-white/8 rounded-xl">
            <p className="text-xs text-neutral-500 leading-relaxed">
              <strong className="text-neutral-400">Hinweis:</strong> Alle Daten basieren auf Pflichtmeldungen
              nach dem US STOCK Act (2012). Betragsangaben sind Wertbereiche, keine exakten Beträge.
              Keine Anlageberatung.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
