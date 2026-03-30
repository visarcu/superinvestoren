// src/app/(website)/marktindikatoren/page.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface MarketIndicator {
  id: string
  name: string
  value: string
  change?: string | null
  status: 'up' | 'down' | 'neutral'
  description: string
  category: string
  lastUpdated: string
  source?: string
}

interface YieldPoint {
  maturity: string
  rate: number
}

const categoryEmoji: Record<string, string> = {
  treasury: '🏛️',
  economy: '🌍',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-neutral-400 mb-1">{label}</p>
      <p className="text-white font-medium">{payload[0].value.toFixed(2)}%</p>
    </div>
  )
}

export default function MarktindikatorenPage() {
  const [indicators, setIndicators] = useState<MarketIndicator[]>([])
  const [yieldCurve, setYieldCurve] = useState<YieldPoint[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market-indicators')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setIndicators(data.indicators ?? [])
          setYieldCurve(data.yieldCurve ?? [])
          setLastUpdated(data.lastUpdated ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const treasuryIndicators = indicators.filter(i => i.category === 'treasury')
  const economyIndicators  = indicators.filter(i => i.category === 'economy')

  // Yield curve: negativ invertiert?
  const isInverted = yieldCurve.length >= 2 &&
    yieldCurve[0].rate > yieldCurve[yieldCurve.length - 1].rate

  return (
    <div className="min-h-screen bg-dark">

      {/* Header */}
      <section className="pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
                Makro &amp; Märkte
              </h1>
              <p className="text-sm text-neutral-400 mt-1">
                US-Zinsen, Wirtschaftsdaten und Yield Curve — täglich aktuell
              </p>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span>Stand: {new Date(lastUpdated).toLocaleDateString('de-DE')}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-10">

        {loading ? (
          <div className="space-y-4">
            {/* Skeleton yield curve */}
            <div className="rounded-xl border border-neutral-800 p-6 h-72 animate-pulse bg-neutral-900" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl border border-neutral-800 p-5 h-28 animate-pulse bg-neutral-900" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Yield Curve Chart */}
            {yieldCurve.length > 0 && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-base font-semibold text-white mb-1">US Treasury Yield Curve</h2>
                    <p className="text-sm text-neutral-500">
                      Renditen über alle Laufzeiten (1 Monat bis 30 Jahre)
                    </p>
                  </div>
                  {isInverted ? (
                    <span className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-1 rounded-full">
                      Invertiert ⚠️
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-full">
                      Normal
                    </span>
                  )}
                </div>

                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={yieldCurve} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <XAxis
                      dataKey="maturity"
                      tick={{ fill: '#525252', fontSize: 12 }}
                      axisLine={{ stroke: '#262626' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#525252', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${v}%`}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#404040" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#22c55e' }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                {/* Quick rate table */}
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 mt-4 pt-4 border-t border-neutral-800">
                  {yieldCurve.map(p => (
                    <div key={p.maturity} className="text-center">
                      <p className="text-xs text-neutral-600 mb-0.5">{p.maturity}</p>
                      <p className="text-sm font-medium text-white">{p.rate.toFixed(2)}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Treasury Indicators */}
            {treasuryIndicators.length > 0 && (
              <div>
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-widest mb-4">Staatsanleihen</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {treasuryIndicators.map(ind => (
                    <IndicatorCard key={ind.id} indicator={ind} />
                  ))}
                </div>
              </div>
            )}

            {/* Economy Indicators */}
            {economyIndicators.length > 0 && (
              <div>
                <p className="text-xs font-medium text-neutral-600 uppercase tracking-widest mb-4">Wirtschaft</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {economyIndicators.map(ind => (
                    <IndicatorCard key={ind.id} indicator={ind} />
                  ))}
                </div>
              </div>
            )}

            {indicators.length === 0 && (
              <div className="text-center py-20 text-neutral-500">
                <p>Keine Daten verfügbar</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function IndicatorCard({ indicator }: { indicator: MarketIndicator }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-5 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{categoryEmoji[indicator.category] ?? '📊'}</span>
          <span className="text-xs text-neutral-500 font-medium">{indicator.name}</span>
        </div>
        {indicator.source && (
          <span className="text-xs text-neutral-700 bg-neutral-800 px-2 py-0.5 rounded">
            {indicator.source}
          </span>
        )}
      </div>

      <div className="mb-3">
        <span className="text-2xl font-semibold text-white">{indicator.value}</span>
        {indicator.change && (
          <div className={`flex items-center gap-1 mt-1 text-sm ${
            indicator.status === 'up' ? 'text-emerald-400'
            : indicator.status === 'down' ? 'text-red-400'
            : 'text-neutral-400'
          }`}>
            {indicator.status === 'up' && <ArrowTrendingUpIcon className="w-4 h-4" />}
            {indicator.status === 'down' && <ArrowTrendingDownIcon className="w-4 h-4" />}
            <span>{indicator.change}</span>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed mb-3">{indicator.description}</p>

      <div className="flex items-center gap-1 text-xs text-neutral-700 pt-3 border-t border-neutral-800">
        <InformationCircleIcon className="w-3 h-3" />
        <span>{new Date(indicator.lastUpdated).toLocaleDateString('de-DE')}</span>
      </div>
    </div>
  )
}
