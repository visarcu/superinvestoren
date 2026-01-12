// src/app/(website)/superinvestor/momentum/page.tsx
'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowTrendingUpIcon,
  ArrowDownIcon,
  ScaleIcon,
  StarIcon,
  ChartBarIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'

// Import Calculation Functions
import {
  preprocessedData,
  formatCurrencyGerman,
  getSmartLatestQuarter,
  calculateMomentumShifts,
  calculateExitTracker,
  calculateNewDiscoveries,
  calculateBuySellBalance,
} from '@/utils/insightsCalculations'

// Import Types
import type { QuarterOption } from '@/types/insights'

export default function MomentumPage() {
  // Smart Latest Quarter
  const actualLatestQuarter = useMemo(() => getSmartLatestQuarter(), [])

  // Quarter Options
  const quarterOptions: QuarterOption[] = useMemo(() => [
    {
      id: 'latest',
      label: actualLatestQuarter,
      quarters: [actualLatestQuarter],
      description: 'Neuestes Quartal (≥50% Investoren)'
    },
    {
      id: 'last2',
      label: 'Letzte 2 Quartale',
      quarters: preprocessedData.allQuarters.slice(0, 2),
      description: `${preprocessedData.allQuarters.slice(0, 2).join(' + ')}`
    },
    {
      id: 'last3',
      label: 'Letzte 3 Quartale',
      quarters: preprocessedData.allQuarters.slice(0, 3),
      description: `${preprocessedData.allQuarters.slice(0, 3).join(', ')}`
    },
    ...preprocessedData.allQuarters.slice(0, 6).map(quarter => ({
      id: quarter,
      label: quarter,
      quarters: [quarter],
      description: 'Einzelnes Quartal'
    })),
    {
      id: 'all',
      label: 'Alle Zeit',
      quarters: preprocessedData.allQuarters,
      description: 'Alle verfügbaren Quartale'
    }
  ], [actualLatestQuarter])

  // State für Filter
  const [selectedPeriod, setSelectedPeriod] = useState('latest')

  const selectedOption = quarterOptions.find(opt => opt.id === selectedPeriod)
  const targetQuarters = selectedOption?.quarters || [actualLatestQuarter]

  // Calculations
  const momentumShifts = useMemo(() =>
    calculateMomentumShifts(targetQuarters), [targetQuarters]
  )

  const exitTracker = useMemo(() =>
    calculateExitTracker(targetQuarters), [targetQuarters]
  )

  const newDiscoveries = useMemo(() =>
    calculateNewDiscoveries(targetQuarters), [targetQuarters]
  )

  const buySellBalance = useMemo(() => {
    const quarters = selectedOption?.quarters || [actualLatestQuarter]
    // Erweitere auf 4 Quartale für historische Analyse
    const allAvailableQuarters = preprocessedData.allQuarters
    const startIndex = allAvailableQuarters.indexOf(quarters[0])
    const quartersForBalance = startIndex >= 0 ?
      allAvailableQuarters.slice(startIndex, startIndex + 4) :
      allAvailableQuarters.slice(0, 4)
    return calculateBuySellBalance(quartersForBalance)
  }, [selectedPeriod, selectedOption, actualLatestQuarter])

  return (
    <div className="min-h-screen bg-dark">

      {/* Header */}
      <section className="bg-dark pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <ArrowTrendingUpIcon className="w-6 h-6 text-neutral-500" />
            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Momentum & Sentiment</h1>
          </div>
          <p className="text-sm text-neutral-400">
            Trendwenden, Exits und Marktstimmung der Super-Investoren
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Globaler Analyse-Zeitraum */}
        <div className="flex items-center justify-between mb-12 pb-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-neutral-500" />
            <div>
              <h3 className="text-white font-medium">Analyse-Zeitraum</h3>
              <p className="text-xs text-neutral-500">
                Momentum, Exits, Discoveries & Sentiment
              </p>
            </div>
          </div>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="appearance-none px-4 py-2 rounded-lg text-sm cursor-pointer bg-neutral-900 border border-neutral-800 text-white hover:border-neutral-700 focus:outline-none"
          >
            {quarterOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Buy/Sell Balance - Full Width */}
        <div className="mb-20">
          <div className="mb-8 pb-4 border-b border-neutral-800">
            <h2 className="text-xl font-medium text-white mb-2">
              Buy/Sell Balance
            </h2>
            <p className="text-sm text-neutral-500">
              Aggregierte Kauf- und Verkaufsaktivitäten zur Bestimmung der Marktstimmung
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {buySellBalance.length > 0 && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <ScaleIcon className="w-5 h-5 text-neutral-500" />
                    <h3 className="text-base font-medium text-white">
                      {buySellBalance[0].quarter} Sentiment
                    </h3>
                  </div>

                  <span className={`text-sm font-medium ${
                    buySellBalance[0].sentiment === 'bullish'
                      ? 'text-emerald-400' :
                    buySellBalance[0].sentiment === 'bearish'
                      ? 'text-red-400' :
                      'text-neutral-400'
                  }`}>
                    {buySellBalance[0].sentiment === 'bullish' ? '📈 Bullish' :
                     buySellBalance[0].sentiment === 'bearish' ? '📉 Bearish' : '⚖️ Neutral'}
                  </span>
                </div>

                {/* Stats Grid - All neutral cards, only values colored */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                  {/* Käufe */}
                  <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-neutral-400">Käufe</span>
                    </div>
                    <div className="text-2xl font-semibold text-emerald-400">
                      {formatCurrencyGerman(buySellBalance[0].totalBuys, false)}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {buySellBalance[0].buysCount} Positionen
                    </div>
                  </div>

                  {/* Verkäufe */}
                  <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-neutral-400">Verkäufe</span>
                    </div>
                    <div className="text-2xl font-semibold text-red-400">
                      {formatCurrencyGerman(buySellBalance[0].totalSells, false)}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {buySellBalance[0].sellsCount} Positionen
                    </div>
                  </div>

                  {/* Netto */}
                  <div className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-neutral-400">Netto-Flow</span>
                    </div>
                    <div className={`text-2xl font-semibold ${
                      buySellBalance[0].netFlow > 0
                        ? 'text-emerald-400'
                        : buySellBalance[0].netFlow < 0
                        ? 'text-red-400'
                        : 'text-neutral-400'
                    }`}>
                      {buySellBalance[0].netFlow > 0 ? '+' : ''}{formatCurrencyGerman(buySellBalance[0].netFlow, false)}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {buySellBalance[0].netFlow > 0 ? 'Netto-Käufe' : buySellBalance[0].netFlow < 0 ? 'Netto-Verkäufe' : 'Ausgeglichen'}
                    </div>
                  </div>
                </div>

                {/* Historischer Trend */}
                <div className="border-t border-neutral-800 pt-8">
                  <div className="flex items-center gap-3 mb-6">
                    <ChartBarIcon className="w-5 h-5 text-neutral-500" />
                    <h4 className="text-base font-medium text-white">
                      Historischer Trend
                    </h4>
                    <span className="text-sm text-neutral-500">
                      (Letzte 4 Quartale)
                    </span>
                  </div>

                  {/* Trend Cards - All neutral styling */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {buySellBalance.map((quarter, index) => (
                      <div key={quarter.quarter} className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-neutral-500">
                            {quarter.quarter}
                          </span>
                          {index === 0 && (
                            <span className="text-xs px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded">
                              Aktuell
                            </span>
                          )}
                        </div>

                        <div className={`text-lg font-semibold ${
                          quarter.netFlow > 0 ? 'text-emerald-400' :
                          quarter.netFlow < 0 ? 'text-red-400' :
                          'text-neutral-400'
                        }`}>
                          {quarter.netFlow > 0 ? '+' : ''}{formatCurrencyGerman(quarter.netFlow, true)}
                        </div>

                        <div className={`text-xs mt-1 ${
                          quarter.sentiment === 'bullish' ? 'text-emerald-400' :
                          quarter.sentiment === 'bearish' ? 'text-red-400' :
                          'text-neutral-500'
                        }`}>
                          {quarter.sentiment === 'bullish' ? '📈 Bullish' :
                           quarter.sentiment === 'bearish' ? '📉 Bearish' : '⚖️ Neutral'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Advanced Insights - 3er Grid */}
        <div className="mb-20">
          <div className="mb-8 pb-4 border-b border-neutral-800">
            <h2 className="text-xl font-medium text-white mb-2">
              Momentum & Timing Signals
            </h2>
            <p className="text-sm text-neutral-500">
              Trendwenden, Exits und neue Entdeckungen der Super-Investoren
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Momentum Shifts */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                <ArrowTrendingUpIcon className="w-5 h-5 text-neutral-500" />
                <h3 className="text-base font-medium text-white">Momentum Shifts</h3>
              </div>

              <div className="space-y-0">
                {momentumShifts.length > 0 ? (
                  momentumShifts.map((shift) => (
                    <Link
                      key={shift.ticker}
                      href={`/analyse/stocks/${shift.ticker.toLowerCase()}/super-investors`}
                      className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 relative flex-shrink-0">
                          <Logo ticker={shift.ticker} alt={`${shift.ticker} Logo`} className="w-full h-full" padding="none" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-neutral-300">{shift.ticker}</p>
                          <p className="text-xs text-neutral-500 truncate max-w-[100px]">{shift.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 text-sm font-medium">{shift.shifters.length}</div>
                        <div className="text-xs text-neutral-500">Umgedreht</div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <p className="text-sm">Keine Momentum Shifts</p>
                  </div>
                )}
              </div>
            </div>

            {/* Exit Tracker */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                <ArrowDownIcon className="w-5 h-5 text-neutral-500" />
                <h3 className="text-base font-medium text-white">Exit Tracker</h3>
              </div>

              <div className="space-y-0">
                {exitTracker.length > 0 ? (
                  exitTracker.map((exit) => (
                    <div
                      key={exit.ticker}
                      className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 relative flex-shrink-0">
                          <Logo ticker={exit.ticker} alt={`${exit.ticker} Logo`} className="w-full h-full" padding="none" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{exit.ticker}</p>
                          <p className="text-xs text-neutral-500 truncate max-w-[100px]">{exit.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-red-400 text-sm font-medium">{exit.exitedBy.length}</div>
                        <div className="text-xs text-neutral-500">Exits</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <p className="text-sm">Keine Exits</p>
                  </div>
                )}
              </div>
            </div>

            {/* New Discoveries */}
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-800">
                <StarIcon className="w-5 h-5 text-neutral-500" />
                <h3 className="text-base font-medium text-white">New Discoveries</h3>
              </div>

              <div className="space-y-0">
                {newDiscoveries.length > 0 ? (
                  newDiscoveries.map((discovery) => (
                    <Link
                      key={discovery.ticker}
                      href={`/analyse/stocks/${discovery.ticker.toLowerCase()}/super-investors`}
                      className="flex items-center justify-between py-3 px-2 border-b border-neutral-800/50 last:border-b-0 hover:bg-neutral-800/30 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 relative flex-shrink-0">
                          <Logo ticker={discovery.ticker} alt={`${discovery.ticker} Logo`} className="w-full h-full" padding="none" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-neutral-300">{discovery.ticker}</p>
                          <p className="text-xs text-neutral-500 truncate max-w-[100px]">{discovery.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-neutral-300 text-sm font-medium">{discovery.discoveredBy.length}</div>
                        <div className="text-xs text-neutral-500">Neu dabei</div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <p className="text-sm">Keine neuen Entdeckungen</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
