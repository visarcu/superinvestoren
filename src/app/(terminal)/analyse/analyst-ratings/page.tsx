'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  NewspaperIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Grading {
  symbol: string
  publishedDate: string
  newsURL: string
  newsTitle: string
  newsBaseURL: string
  newsPublisher: string
  newGrade: string
  previousGrade: string
  gradingCompany: string
  action: string
  priceWhenPosted: number
}

type FilterAction = 'all' | 'upgrade' | 'downgrade' | 'initiated' | 'reiterated' | 'other'

const ACTION_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  upgrade:     { label: 'Upgrade',     color: 'text-emerald-400', bgColor: 'bg-emerald-500/15' },
  downgrade:   { label: 'Downgrade',   color: 'text-red-400',     bgColor: 'bg-red-500/15' },
  initiated:   { label: 'Initiated',   color: 'text-blue-400',    bgColor: 'bg-blue-500/15' },
  reiterated:  { label: 'Reiterated',  color: 'text-amber-400',   bgColor: 'bg-amber-500/15' },
  maintained:  { label: 'Maintained',  color: 'text-slate-400',   bgColor: 'bg-slate-500/15' },
}

function getActionConfig(action: string) {
  const key = action?.toLowerCase() || ''
  return ACTION_CONFIG[key] || { label: action || 'Sonstige', color: 'text-slate-400', bgColor: 'bg-slate-500/15' }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Gerade eben'
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Gestern'
  if (days < 7) return `vor ${days} Tagen`
  return formatDate(dateStr)
}

export default function AnalystRatingsPage() {
  const [gradings, setGradings] = useState<Grading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<FilterAction>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/analyst-gradings/recent?limit=100')
        if (!res.ok) throw new Error('Fehler beim Laden')
        const data = await res.json()
        setGradings(Array.isArray(data) ? data : [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => {
    const counts: Record<string, number> = { upgrade: 0, downgrade: 0, initiated: 0, reiterated: 0, other: 0 }
    const companies = new Set<string>()
    const symbols = new Set<string>()

    gradings.forEach(g => {
      const key = g.action?.toLowerCase() || ''
      if (counts[key] !== undefined) counts[key]++
      else counts.other++
      companies.add(g.gradingCompany)
      symbols.add(g.symbol)
    })

    return { counts, uniqueCompanies: companies.size, uniqueSymbols: symbols.size, total: gradings.length }
  }, [gradings])

  const filtered = useMemo(() => {
    return gradings.filter(g => {
      const matchesSearch =
        g.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.gradingCompany.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.newsTitle || '').toLowerCase().includes(searchTerm.toLowerCase())

      if (filterAction === 'all') return matchesSearch
      if (filterAction === 'other') {
        const key = g.action?.toLowerCase() || ''
        return matchesSearch && !['upgrade', 'downgrade', 'initiated', 'reiterated'].includes(key)
      }
      return matchesSearch && g.action?.toLowerCase() === filterAction
    })
  }, [gradings, searchTerm, filterAction])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const currentItems = filtered.slice(startIdx, startIdx + itemsPerPage)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-theme-secondary mt-3">Lade Analyst Ratings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-theme-primary mb-2">Fehler beim Laden</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary flex items-center gap-3">
            <ArrowTrendingUpIcon className="w-8 h-8 text-brand" />
            Analyst Ratings
          </h1>
          <p className="text-theme-muted mt-2">
            Aktuelle Upgrades, Downgrades & Analysten-Bewertungen
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-brand rounded-full animate-pulse" />
          <span className="text-theme-muted">{stats.total} Ratings</span>
          <span className="text-theme-muted">|</span>
          <span className="text-theme-muted">{stats.uniqueSymbols} Aktien</span>
          <span className="text-theme-muted">|</span>
          <span className="text-theme-muted">{stats.uniqueCompanies} Analysten</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-blue-400 font-medium text-sm">Analyst Rating Information</h3>
            <p className="text-blue-300 text-sm mt-1">
              Analysten von Wall-Street-Banken und Research-Firmen bewerten Aktien regelmäßig mit Kurszielen und Empfehlungen.
              <strong> Upgrades</strong> signalisieren steigende Zuversicht, <strong>Downgrades</strong> warnen vor Risiken.
              Klicke auf den Artikel-Link, um die vollständige Analyse zu lesen.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <p className="text-theme-muted text-sm">Upgrades</p>
          <p className="text-xl font-bold text-emerald-400">{stats.counts.upgrade}</p>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <p className="text-theme-muted text-sm">Downgrades</p>
          <p className="text-xl font-bold text-red-400">{stats.counts.downgrade}</p>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <p className="text-theme-muted text-sm">Initiated</p>
          <p className="text-xl font-bold text-blue-400">{stats.counts.initiated}</p>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <p className="text-theme-muted text-sm">Reiterated</p>
          <p className="text-xl font-bold text-amber-400">{stats.counts.reiterated}</p>
        </div>
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <p className="text-theme-muted text-sm">Sonstige</p>
          <p className="text-xl font-bold text-slate-400">{stats.counts.other}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-theme-card border border-theme rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-muted" />
              <input
                type="text"
                placeholder="Suche nach Symbol, Analyst oder Artikel..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="w-full pl-10 pr-4 py-2 bg-theme-secondary border border-theme rounded-md text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-brand/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-theme-muted" />
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value as FilterAction); setCurrentPage(1) }}
              className="bg-theme-secondary border border-theme rounded-md px-3 py-2 text-theme-primary focus:outline-none focus:border-green-500"
            >
              <option value="all">Alle Ratings</option>
              <option value="upgrade">Upgrades</option>
              <option value="downgrade">Downgrades</option>
              <option value="initiated">Initiated</option>
              <option value="reiterated">Reiterated</option>
              <option value="other">Sonstige</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-theme-card border border-theme rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-secondary border-b border-theme">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Datum</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Symbol</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Aktion</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Analyst</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Rating</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Kurs</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Artikel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {currentItems.map((g, i) => {
                const cfg = getActionConfig(g.action)
                const gradeChange = g.previousGrade && g.newGrade && g.previousGrade !== g.newGrade
                  ? `${g.previousGrade} \u2192 ${g.newGrade}`
                  : g.newGrade || ''

                return (
                  <tr key={`${g.symbol}-${g.publishedDate}-${i}`} className="hover:bg-theme-secondary/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="text-sm text-theme-primary">{formatDate(g.publishedDate)}</div>
                      <div className="text-xs text-theme-muted">{timeAgo(g.publishedDate)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/analyse/stocks/${g.symbol.toLowerCase()}/estimates`}
                        className="flex items-center gap-2 group"
                      >
                        <div className="w-8 h-8 bg-theme-tertiary rounded-md flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                          <span className="text-xs font-bold text-theme-primary group-hover:text-brand-light transition-colors">
                            {g.symbol.slice(0, 4)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-theme-primary group-hover:text-brand-light transition-colors">
                          {g.symbol}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bgColor} ${cfg.color}`}>
                        {g.action?.toLowerCase() === 'upgrade' && <ArrowTrendingUpIcon className="w-3 h-3" />}
                        {g.action?.toLowerCase() === 'downgrade' && <ArrowTrendingDownIcon className="w-3 h-3" />}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-theme-primary font-medium">{g.gradingCompany}</span>
                    </td>
                    <td className="py-3 px-4">
                      {gradeChange ? (
                        <div className="text-sm">
                          {g.previousGrade && g.previousGrade !== g.newGrade ? (
                            <>
                              <span className="text-theme-muted line-through">{g.previousGrade}</span>
                              <span className="text-theme-muted mx-1">&rarr;</span>
                              <span className="text-theme-primary font-medium">{g.newGrade}</span>
                            </>
                          ) : (
                            <span className="text-theme-primary font-medium">{g.newGrade}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-theme-muted text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {g.priceWhenPosted ? (
                        <span className="text-sm text-theme-primary font-mono">${g.priceWhenPosted.toFixed(2)}</span>
                      ) : (
                        <span className="text-theme-muted text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {g.newsURL ? (
                        <Link
                          href={`/article?url=${encodeURIComponent(g.newsURL)}&title=${encodeURIComponent(g.newsTitle || '')}&source=${encodeURIComponent(g.newsPublisher || '')}&symbol=${encodeURIComponent(g.symbol)}`}
                          className="group flex items-center gap-1.5 max-w-xs"
                          title={g.newsTitle}
                        >
                          <NewspaperIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="text-sm text-blue-400 group-hover:text-blue-300 truncate transition-colors">
                            {g.newsTitle || g.newsPublisher || 'Artikel lesen'}
                          </span>
                          <ArrowTopRightOnSquareIcon className="w-3 h-3 text-blue-400/50 flex-shrink-0" />
                        </Link>
                      ) : (
                        <span className="text-theme-muted text-sm">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && !loading && (
          <div className="p-8 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
            <p className="text-theme-muted">Keine Analyst Ratings gefunden</p>
            <p className="text-sm text-theme-muted mt-1">Versuche andere Filterkriterien</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-theme-muted">
            Zeige {startIdx + 1}-{Math.min(startIdx + itemsPerPage, filtered.length)} von {filtered.length} Ratings
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-theme-secondary border border-theme rounded-md text-theme-primary hover:bg-theme-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Zurück
            </button>
            <span className="text-sm text-theme-muted">Seite {currentPage} von {totalPages}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-theme-secondary border border-theme rounded-md text-theme-primary hover:bg-theme-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
