'use client'

import React from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'
import { TT } from '../_lib/format'
import type { ChartTimeframe, PricePoint, Quote } from '../_lib/types'

interface HeroPriceChartProps {
  quote: Quote | null
  priceChart: PricePoint[]
  chartTimeframe: ChartTimeframe
  setChartTimeframe: (tf: ChartTimeframe) => void
  chartLoading: boolean
}

const TF_LABELS: Record<ChartTimeframe, string> = {
  '1D': 'Heute',
  '1W': '1 Woche',
  '1M': '1 Monat',
  '3M': '3 Monate',
  '1Y': '1 Jahr',
  '5Y': '5 Jahre',
}

const TIMEFRAMES: ChartTimeframe[] = ['1D', '1W', '1M', '3M', '1Y', '5Y']

export default function HeroPriceChart({
  quote,
  priceChart,
  chartTimeframe,
  setChartTimeframe,
  chartLoading,
}: HeroPriceChartProps) {
  // Performance berechnen: Zeitraum-abhängig (nicht immer Tagesänderung)
  const firstPrice = priceChart.length > 0 ? priceChart[0].price : null
  const lastPrice = priceChart.length > 0 ? priceChart[priceChart.length - 1].price : null
  const periodChange = firstPrice && lastPrice ? lastPrice - firstPrice : null
  const periodChangePct = firstPrice && periodChange ? (periodChange / firstPrice) * 100 : null
  // Für 1D: Tagesänderung aus Quote verwenden
  const displayChange = chartTimeframe === '1D' ? (quote?.change ?? periodChange) : periodChange
  const displayChangePct = chartTimeframe === '1D' ? (quote?.changePercent ?? periodChangePct) : periodChangePct
  const isPositive = (displayChangePct ?? 0) >= 0

  return (
    <div className="lg:col-span-2 bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          {quote ? (
            <>
              <p className="text-3xl font-bold text-white tabular-nums">
                {quote.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
              </p>
              <div className="flex items-center gap-2 mt-1">
                {displayChangePct !== null && (
                  <span
                    className={`text-[13px] font-semibold tabular-nums ${
                      isPositive ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {displayChangePct >= 0 ? '+' : ''}
                    {displayChangePct.toFixed(2).replace('.', ',')}%
                  </span>
                )}
                {displayChange !== null && (
                  <span
                    className={`text-[12px] tabular-nums ${
                      isPositive ? 'text-emerald-400/50' : 'text-red-400/50'
                    }`}
                  >
                    {displayChange >= 0 ? '+' : ''}
                    {displayChange.toFixed(2).replace('.', ',')} $
                  </span>
                )}
                <span className="text-[10px] text-white/30">{TF_LABELS[chartTimeframe]}</span>
              </div>
            </>
          ) : (
            <div className="h-12 flex items-center">
              <div className="w-32 h-6 bg-white/[0.04] rounded animate-pulse" />
            </div>
          )}
        </div>
        {/* Timeframe Buttons */}
        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setChartTimeframe(tf)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-all ${
                chartTimeframe === tf
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/35 hover:text-white/40 hover:bg-white/[0.03]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-[240px] relative">
        {chartLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
          </div>
        )}
        {priceChart.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={priceChart} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="heroPriceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.12)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(d: string) => {
                  const date = new Date(d)
                  if (chartTimeframe === '1D')
                    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                  if (chartTimeframe === '1W') return date.toLocaleDateString('de-DE', { weekday: 'short' })
                  if (['1M', '3M'].includes(chartTimeframe))
                    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
                  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
                }}
                interval={Math.max(0, Math.floor(priceChart.length / 8))}
              />
              <YAxis hide domain={['dataMin * 0.98', 'dataMax * 1.02']} />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const v = payload[0].value as number
                  const d = new Date(payload[0].payload.date)
                  const sinceStart = firstPrice ? ((v - firstPrice) / firstPrice) * 100 : null
                  return (
                    <div style={TT}>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                        {d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p style={{ color: '#fff', fontSize: '17px', fontWeight: 700, marginTop: '2px' }}>
                        {v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                      </p>
                      {sinceStart !== null && (
                        <p
                          style={{
                            color: sinceStart >= 0 ? '#4ade80' : '#f87171',
                            fontSize: '11px',
                            marginTop: '2px',
                          }}
                        >
                          {sinceStart >= 0 ? '+' : ''}
                          {sinceStart.toFixed(2)}% seit {TF_LABELS[chartTimeframe]}
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isPositive ? '#22c55e' : '#ef4444'}
                strokeWidth={1.5}
                fill="url(#heroPriceGrad)"
                dot={false}
                activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : !chartLoading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-white/25 text-[12px]">Keine Kursdaten</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
