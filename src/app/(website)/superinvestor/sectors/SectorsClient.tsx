'use client'

import React, { useState, useMemo } from 'react'
import {
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'

import type { SectorAnalysis } from '@/types/insights'
import { formatCurrencyGerman } from '@/utils/insightsFormat'
import type { SectorsData } from '@/lib/superinvestorInsightsData'

// Sektor-Analyse (Client-Teil). Daten rechnet die Server-Seite page.tsx vor.
export default function SectorsClient({ data }: { data: SectorsData }) {
  const { options: quarterOptions, topSectors, concentrationData } = data

  // State für Filter
  const [sectorPeriod, setSectorPeriod] = useState('last2')

  const sectorNetFlows = useMemo(
    () => new Map(data.netFlowsByPeriod[sectorPeriod] ?? data.netFlowsByPeriod.last2 ?? []),
    [data.netFlowsByPeriod, sectorPeriod],
  )

  // Calculate total value for percentage
  const totalSectorValue = useMemo(() => {
    return topSectors.reduce((sum: number, s: SectorAnalysis) => sum + s.value, 0)
  }, [topSectors])

  return (
    <div className="min-h-screen bg-dark">

      {/* Header */}
      <section className="bg-dark pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <BuildingOfficeIcon className="w-6 h-6 text-neutral-500" />
            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">Sektor-Analyse</h1>
          </div>
          <p className="text-sm text-neutral-400">
            Kapitalverteilung und Flows nach Wirtschaftssektoren
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Sektor-Overview - 6er Grid */}
        <section className="mb-20">
          <div className="mb-8 pb-4 border-b border-neutral-800">
            <h2 className="text-xl font-medium text-white mb-2">
              Investment Sektoren
            </h2>
            <p className="text-sm text-neutral-500">
              Kapitalverteilung auf verschiedene Wirtschaftssektoren
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {topSectors.map((sector: SectorAnalysis) => {
              const percentage = totalSectorValue > 0 ? (sector.value / totalSectorValue) * 100 : 0
              return (
                <div
                  key={sector.sector}
                  className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-colors"
                >
                  <h3 className="text-sm font-medium text-white mb-2">{sector.sector}</h3>
                  <p className="text-lg font-semibold text-white mb-1">
                    {formatCurrencyGerman(sector.value)}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-500">{sector.count} Pos.</p>
                    <p className="text-xs text-neutral-400">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Sector Net Flows - Full Width */}
        <div className="mb-20">
          <div className="mb-8 pb-4 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium text-white mb-2">
                  Sektor Net Flows
                </h2>
                <p className="text-sm text-neutral-500">
                  Kapitalzu- und -abflüsse nach Wirtschaftssektoren
                </p>
              </div>

              <select
                value={sectorPeriod}
                onChange={(e) => setSectorPeriod(e.target.value)}
                className="appearance-none px-4 py-2 rounded-lg text-sm cursor-pointer bg-neutral-900 border border-neutral-800 text-white hover:border-neutral-700 focus:outline-none"
              >
                {quarterOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            {sectorNetFlows.size > 0 ? (
              <div className="space-y-8">
                {(() => {
                  const sorted = Array.from(sectorNetFlows.entries())
                    .sort(([, a], [, b]) => b - a);

                  const inflows = sorted.filter(([, flow]) => flow > 0);
                  const outflows = sorted.filter(([, flow]) => flow < 0);

                  return (
                    <>
                      {/* Zuflüsse */}
                      {inflows.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-neutral-400 mb-4">
                            Kapitalzuflüsse
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inflows.map(([sector, flow]) => (
                              <div
                                key={sector}
                                className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-white">{sector}</span>
                                  <span className="text-emerald-400 font-semibold">
                                    +{formatCurrencyGerman(flow, false)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Abflüsse */}
                      {outflows.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-neutral-400 mb-4">
                            Kapitalabflüsse
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {outflows.map(([sector, flow]) => (
                              <div
                                key={sector}
                                className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-white">{sector}</span>
                                  <span className="text-red-400 font-semibold">
                                    -{formatCurrencyGerman(Math.abs(flow), false)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary Stats - Simplified */}
                      <div className="pt-6 border-t border-neutral-800">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Gesamt-Zuflüsse</p>
                            <p className="text-xl font-semibold text-emerald-400">
                              {formatCurrencyGerman(inflows.reduce((sum, [, flow]) => sum + flow, 0), false)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Gesamt-Abflüsse</p>
                            <p className="text-xl font-semibold text-red-400">
                              {formatCurrencyGerman(Math.abs(outflows.reduce((sum, [, flow]) => sum + flow, 0)), false)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500 mb-1">Aktive Sektoren</p>
                            <p className="text-xl font-semibold text-white">
                              {inflows.length + outflows.length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500">
                <ArrowTrendingUpIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Keine Sektor-Flows in diesem Zeitraum</p>
                <p className="text-xs mt-1">Wähle mindestens 2 Quartale für Vergleich</p>
              </div>
            )}
          </div>
        </div>

        {/* Portfolio Konzentration - 3er Grid */}
        <div className="mb-20">
          <div className="mb-8 pb-4 border-b border-neutral-800">
            <h2 className="text-xl font-medium text-white mb-2">
              Konzentration vs. Diversifikation
            </h2>
            <p className="text-sm text-neutral-500">
              Wer setzt auf wenige große Positionen vs. breite Diversifikation?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {concentrationData.map((data) => (
              <div
                key={data.investor}
                className="bg-neutral-900/50 rounded-lg p-4 border border-neutral-800 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-medium text-white">{data.investor}</h3>
                  <span className={`text-xs font-medium ${
                    data.type === 'high' ? 'text-emerald-400' :
                    data.type === 'medium' ? 'text-neutral-400' :
                    'text-neutral-500'
                  }`}>
                    {data.type === 'high' ? 'Konzentriert' :
                     data.type === 'medium' ? 'Ausgewogen' : 'Diversifiziert'}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-neutral-500 text-xs">Konzentrations-Index</span>
                    <span className="text-white text-sm font-medium">{(data.concentration * 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-1.5">
                    <div
                      className="bg-neutral-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(data.concentration * 100 * 5, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Top 3 Holdings</span>
                    <span className="text-white font-medium">
                      {data.top3Percentage.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Positionen</span>
                    <span className="text-white font-medium">{data.totalPositions}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
