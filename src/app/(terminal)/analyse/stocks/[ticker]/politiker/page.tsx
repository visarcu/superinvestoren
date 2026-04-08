// src/app/(terminal)/analyse/stocks/[ticker]/politiker/page.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  BuildingLibraryIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

interface PoliticianTrade {
  disclosureDate: string
  transactionDate: string
  ticker: string
  assetDescription: string
  type: string
  amount: string
  representative: string
  slug: string
  state: string
  chamber?: string
  politicianName?: string
}

function formatDateDE(dateStr: string): string {
  if (!dateStr) return '–'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatAmountRange(amount: string): string {
  if (!amount) return '–'
  const clean = amount.replace(/[$,]/g, '')
  const parts = clean.split(' - ')
  const fmt = (s: string) => {
    const n = parseInt(s.replace(/\D/g, ''), 10)
    if (isNaN(n)) return s
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
    return `$${n.toLocaleString('de-DE')}`
  }
  if (parts.length === 2) return `${fmt(parts[0])} – ${fmt(parts[1])}`
  return fmt(clean)
}

function isBuy(type: string): boolean {
  const t = (type || '').toUpperCase()
  return t.includes('PURCHASE') || t === 'BUY' || t === 'P'
}

function isSale(type: string): boolean {
  const t = (type || '').toUpperCase()
  return t.includes('SALE') || t === 'SELL' || t === 'S'
}

export default function PolitikerTickerPage() {
  const params = useParams()
  const ticker = (params.ticker as string)?.toUpperCase()

  const [trades, setTrades] = useState<PoliticianTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<'1Y' | '2Y' | 'all'>('2Y')

  useEffect(() => {
    if (!ticker) return
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/politicians?ticker=${ticker}&limit=500`)
        if (!res.ok) throw new Error('Fehler beim Laden der Daten')
        const data = await res.json()
        setTrades(data.trades || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [ticker])

  const filteredTrades = useMemo(() => {
    if (timeframe === 'all') return trades
    const cutoff = new Date()
    if (timeframe === '1Y') cutoff.setFullYear(cutoff.getFullYear() - 1)
    if (timeframe === '2Y') cutoff.setFullYear(cutoff.getFullYear() - 2)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return trades.filter(t => (t.transactionDate || t.disclosureDate) >= cutoffStr)
  }, [trades, timeframe])

  const stats = useMemo(() => {
    const buys = filteredTrades.filter(t => isBuy(t.type))
    const sells = filteredTrades.filter(t => isSale(t.type))
    const uniquePoliticians = new Set(filteredTrades.map(t => t.slug || t.representative))
    return {
      total: filteredTrades.length,
      buys: buys.length,
      sells: sells.length,
      politicians: uniquePoliticians.size,
    }
  }, [filteredTrades])

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-theme-muted text-sm">Lade Politiker-Trades...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-theme-primary mb-2">Fehler beim Laden</h2>
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="w-full px-6 lg:px-8 py-8 space-y-6">

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-theme-secondary text-sm">
              Trades von US-Kongressmitgliedern in{' '}
              <span className="font-medium text-theme-primary">{ticker}</span>
            </p>
            <p className="text-xs text-theme-muted mt-0.5">
              Quellen: STOCK Act Disclosures • House & Senate Stock Watcher
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg w-fit">
            {(['1Y', '2Y', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeframe === period
                    ? 'bg-theme-card text-theme-primary shadow-sm'
                    : 'text-theme-muted hover:text-theme-secondary'
                }`}
              >
                {period === 'all' ? 'Alle' : period}
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/politiker" className="text-theme-muted hover:text-emerald-400 transition-colors">
            Alle Politiker-Trades
          </Link>
          <span className="text-theme-muted">→</span>
          <span className="text-theme-primary font-medium">{ticker}</span>
        </div>

        {/* Info Banner */}
        <div className="bg-theme-card rounded-xl border border-theme-light p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-theme-muted text-sm">
              US-Kongressmitglieder sind gemäß dem{' '}
              <span className="text-theme-secondary">STOCK Act</span> verpflichtet, Aktiengeschäfte
              innerhalb von 45 Tagen offenzulegen. Die Daten spiegeln keine Echtzeit-Transaktionen wider.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Transaktionen',
              value: stats.total,
              icon: BuildingLibraryIcon,
              color: 'text-blue-400',
            },
            {
              label: 'Käufe',
              value: stats.buys,
              icon: ArrowTrendingUpIcon,
              color: 'text-emerald-400',
            },
            {
              label: 'Verkäufe',
              value: stats.sells,
              icon: ArrowTrendingDownIcon,
              color: 'text-red-400',
            },
            {
              label: 'Politiker',
              value: stats.politicians,
              icon: UserGroupIcon,
              color: 'text-purple-400',
            },
          ].map((stat, i) => (
            <div key={i} className="bg-theme-card rounded-xl border border-theme-light p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-theme-muted">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-lg font-semibold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Trades Table */}
        <div className="bg-theme-card rounded-xl border border-theme-light overflow-hidden">
          <div className="p-5 border-b border-theme-light">
            <h2 className="text-sm font-medium text-theme-primary">
              Transaktionen ({filteredTrades.length})
            </h2>
          </div>

          {filteredTrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-theme-light">
                    <th className="text-left py-3 px-5 text-xs font-medium text-theme-muted">Datum</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-theme-muted">Politiker</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-theme-muted">Kammer</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-theme-muted">Typ</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-theme-muted">Betrag</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-theme-muted">Offenlegung</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade, idx) => {
                    const buy = isBuy(trade.type)
                    const sell = isSale(trade.type)
                    const name = trade.politicianName || trade.representative || '–'
                    const slug = trade.slug || ''

                    return (
                      <tr
                        key={idx}
                        className="border-b border-theme-light last:border-b-0 hover:bg-theme-secondary/20 transition-colors"
                      >
                        <td className="py-3 px-5 text-sm text-theme-muted">
                          {formatDateDE(trade.transactionDate)}
                        </td>
                        <td className="py-3 px-5">
                          {slug ? (
                            <Link
                              href={`/politiker/${slug}`}
                              className="text-sm font-medium text-theme-primary hover:text-emerald-400 transition-colors"
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-theme-primary">{name}</span>
                          )}
                          {trade.state && (
                            <span className="text-xs text-theme-muted ml-1.5">{trade.state}</span>
                          )}
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-xs text-theme-muted capitalize">
                            {trade.chamber === 'senate'
                              ? 'Senat'
                              : trade.chamber === 'house'
                              ? 'Repräsentantenhaus'
                              : '–'}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                              buy
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : sell
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-theme-secondary/30 text-theme-muted'
                            }`}
                          >
                            {buy ? (
                              <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                            ) : sell ? (
                              <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
                            ) : null}
                            {buy ? 'Kauf' : sell ? 'Verkauf' : trade.type || '–'}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-sm text-theme-secondary font-mono">
                          {formatAmountRange(trade.amount)}
                        </td>
                        <td className="py-3 px-5 text-sm text-theme-muted">
                          {formatDateDE(trade.disclosureDate)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="w-12 h-12 bg-theme-secondary/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <BuildingLibraryIcon className="w-6 h-6 text-theme-muted" />
              </div>
              <p className="text-theme-muted text-sm">
                Keine Politiker-Trades für {ticker}
                {timeframe !== 'all' ? ` in den letzten ${timeframe}` : ''}
              </p>
              <button
                onClick={() => setTimeframe('all')}
                className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block transition-colors"
              >
                Alle Zeiträume anzeigen
              </button>
            </div>
          )}
        </div>

        {/* Quick Link */}
        <Link
          href="/politiker"
          className="flex items-center gap-3 p-4 bg-theme-card rounded-xl border border-theme-light hover:border-emerald-500/30 transition-colors group w-full sm:w-fit"
        >
          <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <BuildingLibraryIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-theme-primary group-hover:text-emerald-400 transition-colors">
              Alle Politiker-Trades
            </p>
            <p className="text-xs text-theme-muted">Marktweite Übersicht</p>
          </div>
        </Link>

      </main>
    </div>
  )
}
