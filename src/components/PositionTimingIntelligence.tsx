'use client'

// Timing-Analyse der Super-Investor-Positionen einer Aktie.
//
// Einstandskurs je Investor ist der Schlusskurs am letzten Handelstag des
// Quartals, in dem die Position erstmals (in der aktuellen Haltephase) im 13F
// erscheint; Quelle /api/historical. Die Haltedauer läuft bis zum jüngsten
// Snapshot-Quartal aus /api/stocks/[ticker]/super-investors. Vorher stand hier
// ein erfundener Einstandskurs ("Kurs / 1,1^Jahre") und die Haltedauer endete
// fest in Q4 2024. Fehlt der aktuelle Kurs oder ein Schlusskurs zum Einstieg,
// zeigt der Tab keine Zahlen.

import React, { useState, useEffect, useMemo } from 'react'
import {
  ChartBarIcon,
  TrophyIcon,
  ClockIcon,
  SparklesIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import InvestorAvatar from '@/components/InvestorAvatar'
import Link from 'next/link'
import { detectTickerCurrency } from '@/lib/fmp'
import { currencySymbol } from '@/lib/displayFormat'

type Category = 'early-adopter' | 'perfect-timer' | 'late-comer' | 'diamond-hands'

interface TimingRow {
  investor: {
    slug: string
    name: string
    avatar: string
  }
  /** Berichtsquartal des Einstiegs, z. B. "Q3 2024" */
  firstQuarter: string
  /** true, wenn die Position schon im ältesten Snapshot stand: Einstieg liegt davor */
  heldSinceDataStart: boolean
  /** Schlusskurs am Ende des Einstiegsquartals und dessen Handelstag */
  entryClose: number
  entryDate: string
  holdingQuarters: number
  /** Kursentwicklung seit dem Einstiegsschluss in Prozent */
  performance: number
  timingScore: number
  category: Category
}

interface PositionTimingIntelligenceProps {
  ticker: string
  positions: any[]
  /** Aktueller Kurs in der Handelswährung; null, solange keiner vorliegt */
  currentPrice: number | null
}

/** Handelstage, die der Schlusskurs höchstens vor dem Quartalsende liegen darf (Wochenende, Feiertage) */
const MAX_DAYS_BEFORE_QUARTER_END = 10

const calculateTimingScore = (performance: number, holdingQuarters: number): number => {
  const timeBonus = Math.min(holdingQuarters * 5, 25) // bis 25 Punkte für die Haltedauer
  const performanceScore = Math.min(Math.max(performance, -50), 200) / 2 // -25 bis 100 Punkte
  return Math.max(0, Math.min(100, performanceScore + timeBonus))
}

const categorizeInvestor = (timingScore: number, holdingQuarters: number, performance: number): Category => {
  if (performance > 100 && holdingQuarters >= 8) return 'diamond-hands'
  if (performance > 50 && timingScore > 80) return 'perfect-timer'
  if (holdingQuarters >= 12) return 'early-adopter'
  return 'late-comer'
}

/** Quartale von "Q1 2021" bis "Q3 2026" einschließlich beider: 23 */
function quartersBetween(first: string, latest: string): number | null {
  const a = /^Q([1-4]) (\d{4})$/.exec(first)
  const b = /^Q([1-4]) (\d{4})$/.exec(latest)
  if (!a || !b) return null
  const span = (Number(b[2]) - Number(a[2])) * 4 + (Number(b[1]) - Number(a[1])) + 1
  return span > 0 ? span : null
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000)
}

export default function PositionTimingIntelligence({
  ticker,
  positions,
  currentPrice
}: PositionTimingIntelligenceProps) {
  const [closes, setCloses] = useState<{ date: string; close: number }[] | null>(null)
  const [loading, setLoading] = useState(true)

  const symbol = currencySymbol(detectTickerCurrency(ticker))

  // Eine Kursreihe je Aktie reicht für alle Investoren
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/historical/${encodeURIComponent(ticker)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (cancelled) return
        const rows = ((json?.historical || []) as any[])
          .filter(h => typeof h?.close === 'number' && h.close > 0 && typeof h?.date === 'string')
          .map(h => ({ date: h.date.slice(0, 10), close: h.close as number }))
          .sort((a, b) => a.date.localeCompare(b.date))
        setCloses(rows)
      })
      .catch(() => {
        if (!cancelled) setCloses([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [ticker])

  const rows = useMemo<TimingRow[]>(() => {
    if (!closes || !closes.length || currentPrice == null || currentPrice <= 0) return []

    // Letzter Schlusskurs am oder vor dem Quartalsende, höchstens zehn Tage davor
    const closeOnOrBefore = (dateIso: string): { date: string; close: number } | null => {
      let lo = 0
      let hi = closes.length - 1
      let found = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (closes[mid].date <= dateIso) {
          found = mid
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      if (found < 0) return null
      const candidate = closes[found]
      return daysBetween(candidate.date, dateIso) <= MAX_DAYS_BEFORE_QUARTER_END ? candidate : null
    }

    const result: TimingRow[] = []
    for (const pos of positions) {
      const p = pos?.position
      if (!p?.firstQuarter || !p?.firstQuarterEnd || !p?.quarter) continue
      const entry = closeOnOrBefore(p.firstQuarterEnd)
      const holdingQuarters = quartersBetween(p.firstQuarter, p.quarter)
      if (!entry || holdingQuarters == null) continue

      const performance = ((currentPrice - entry.close) / entry.close) * 100
      const timingScore = calculateTimingScore(performance, holdingQuarters)
      result.push({
        investor: {
          slug: pos.investor.slug,
          name: pos.investor.name,
          avatar: pos.investor.avatar
        },
        firstQuarter: p.firstQuarter,
        heldSinceDataStart: !!p.heldSinceDataStart,
        entryClose: entry.close,
        entryDate: entry.date,
        holdingQuarters,
        performance,
        timingScore,
        category: categorizeInvestor(timingScore, holdingQuarters, performance)
      })
    }

    result.sort((a, b) => b.timingScore - a.timingScore)
    return result
  }, [closes, positions, currentPrice])

  const formatCurrency = (value: number) =>
    `${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
  }

  const formatDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('de-DE', { timeZone: 'UTC' })

  const getCategoryInfo = (category: Category) => {
    switch (category) {
      case 'diamond-hands':
        return {
          label: 'Diamond Hands 💎',
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/10 border-purple-500/20',
          description: 'Langzeit-Gewinner'
        }
      case 'perfect-timer':
        return {
          label: 'Perfect Timer 🎯',
          color: 'text-brand-light',
          bgColor: 'bg-brand/10 border-brand/20',
          description: 'Optimaler Einstieg'
        }
      case 'early-adopter':
        return {
          label: 'Early Adopter 🚀',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10 border-blue-500/20',
          description: 'Früher Einstieg'
        }
      default:
        return {
          label: 'Late Comer ⏰',
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10 border-orange-500/20',
          description: 'Später Einstieg'
        }
    }
  }

  const header = (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <SparklesIcon className="w-8 h-8 text-brand-light" />
        <h2 className="text-3xl font-bold text-white">
          Position Timing Intelligence
        </h2>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-8">
        {header}
        <p className="text-gray-400 max-w-2xl mx-auto text-center">Lade Timing-Analyse...</p>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
        </div>
      </div>
    )
  }

  if (currentPrice == null || currentPrice <= 0) {
    return (
      <div className="space-y-8">
        {header}
        <p className="text-gray-400 max-w-2xl mx-auto text-center">
          Für die Timing-Analyse fehlt derzeit ein aktueller Kurs von {ticker}.
        </p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-8">
        {header}
        <p className="text-gray-400 max-w-2xl mx-auto text-center">
          Für {ticker} liegen keine Schlusskurse zu den Einstiegsquartalen der Investoren vor. Die Timing-Analyse ist für diese Aktie noch in Arbeit.
        </p>
      </div>
    )
  }

  const bestPerformer = rows[0]
  const averagePerformance = rows.reduce((sum, row) => sum + row.performance, 0) / rows.length
  const longestHolding = Math.max(...rows.map(row => row.holdingQuarters))
  const skipped = positions.length - rows.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <SparklesIcon className="w-8 h-8 text-brand-light" />
          <h2 className="text-3xl font-bold text-white">
            Position Timing Intelligence
          </h2>
        </div>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Einstiegsquartal aus den 13F-Meldungen, Einstandskurs als Schlusskurs zum Quartalsende, Entwicklung bis zum aktuellen Kurs von {formatCurrency(currentPrice)}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center">
              <TrophyIcon className="w-5 h-5 text-brand-light" />
            </div>
            <div>
              <h3 className="text-sm text-theme-muted">Best Performer</h3>
              <p className="text-lg font-bold text-theme-primary">{bestPerformer.investor.name}</p>
            </div>
          </div>
          <p className="text-brand-light font-semibold">
            {formatPercentage(bestPerformer.performance)}
          </p>
        </div>

        <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-theme-secondary flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-theme-muted" />
            </div>
            <div>
              <h3 className="text-sm text-theme-muted">Durchschnitts-Performance</h3>
              <p className="text-lg font-bold text-theme-primary">{rows.length} Investoren</p>
            </div>
          </div>
          <p className={`font-semibold ${averagePerformance >= 0 ? 'text-brand-light' : 'text-red-400'}`}>
            {formatPercentage(averagePerformance)}
          </p>
        </div>

        <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-theme-secondary flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-theme-muted" />
            </div>
            <div>
              <h3 className="text-sm text-theme-muted">Längste Haltedauer</h3>
              <p className="text-lg font-bold text-theme-primary">
                {longestHolding} Quartale
              </p>
            </div>
          </div>
          <p className="text-theme-muted font-semibold">
            {rows.some(row => row.heldSinceDataStart) ? 'mindestens, Beginn vor unseren Daten' : 'laut 13F-Historie'}
          </p>
        </div>
      </div>

      {/* Timing Leaderboard */}
      <div className="bg-theme-card border border-theme/10 rounded-xl">
        <div className="p-6 border-b border-theme/10">
          <div className="flex items-center gap-3">
            <TrophyIcon className="w-6 h-6 text-brand-light" />
            <h3 className="text-xl font-bold text-theme-primary">Timing Leaderboard</h3>
          </div>
          <p className="text-sm text-theme-muted mt-2">
            Sortiert nach Timing Score (Performance seit Einstiegsquartal plus Haltedauer)
          </p>
        </div>

        <div className="p-6 space-y-4">
          {rows.map((row, index) => {
            const categoryInfo = getCategoryInfo(row.category)

            return (
              <div key={row.investor.slug} className="bg-theme-secondary/50 rounded-lg p-4 hover:bg-theme-secondary transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-brand/20 text-brand-light' : 'bg-theme-secondary text-theme-muted'
                    }`}>
                      #{index + 1}
                    </div>

                    <Link href={`/superinvestor/${row.investor.slug}`}>
                      <InvestorAvatar
                        name={row.investor.name}
                        imageUrl={row.investor.avatar}
                        size="md"
                        className="hover:ring-2 hover:ring-green-400 transition-all duration-200 cursor-pointer"
                      />
                    </Link>

                    <div>
                      <Link
                        href={`/superinvestor/${row.investor.slug}`}
                        className="font-semibold text-theme-primary hover:text-brand-light transition-colors"
                      >
                        {row.investor.name}
                      </Link>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${categoryInfo.bgColor} ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                        <span className="text-xs text-theme-muted">
                          {row.heldSinceDataStart ? `Seit mindestens ${row.firstQuarter}` : `Seit ${row.firstQuarter}`}
                          {' · '}
                          {row.holdingQuarters} Quartale
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="grid grid-cols-3 gap-6 text-sm">
                      <div>
                        <span className="text-theme-muted">Timing Score</span>
                        <div className="font-bold text-theme-primary">
                          {row.timingScore.toFixed(0)}/100
                        </div>
                      </div>
                      <div>
                        <span className="text-theme-muted">Schluss {row.firstQuarter}</span>
                        <div className="font-bold text-theme-primary" title={`Schlusskurs am ${formatDate(row.entryDate)}`}>
                          {formatCurrency(row.entryClose)}
                        </div>
                      </div>
                      <div>
                        <span className="text-theme-muted">Seitdem</span>
                        <div className={`font-bold ${row.performance >= 0 ? 'text-brand-light' : 'text-red-400'}`}>
                          {formatPercentage(row.performance)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Methodik */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <FireIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium text-sm">So wird gerechnet</p>
            <p className="text-theme-muted text-sm mt-1">
              Das Einstiegsquartal ist das erste Quartal der aktuellen Haltephase in den 13F-Meldungen. Als Einstandskurs
              dient der Schlusskurs am letzten Handelstag dieses Quartals, der tatsächliche Kaufkurs innerhalb des Quartals
              ist nicht bekannt. Die Haltedauer läuft bis zum jüngsten gemeldeten Quartal.
              {skipped > 0 ? ` Für ${skipped} ${skipped === 1 ? 'Investor fehlt' : 'Investoren fehlen'} Schlusskurse zum Einstiegsquartal; sie werden nicht angezeigt.` : ''}
              {' '}Keine Anlageberatung.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
