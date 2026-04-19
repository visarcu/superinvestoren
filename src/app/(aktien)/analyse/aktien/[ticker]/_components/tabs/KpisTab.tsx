'use client'

import React from 'react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import FeyPremiumGate from '../FeyPremiumGate'
import type { KPIMetric } from '../../_lib/types'

interface KpisTabProps {
  ticker: string
  kpis: Record<string, KPIMetric>
  isPremium: boolean
  userLoading: boolean
}

export default function KpisTab({ ticker, kpis, isPremium, userLoading }: KpisTabProps) {
  if (Object.keys(kpis).length === 0) {
    return (
      <div className="text-center py-28">
        <p className="text-white/20 text-sm">Keine Operating KPIs für {ticker}</p>
        <p className="text-white/8 text-xs mt-1">
          Verfügbar für AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX, UBER, MA, V
        </p>
      </div>
    )
  }

  return (
    <FeyPremiumGate
      isPremium={isPremium}
      loading={userLoading}
      feature="Operating KPIs"
      description={`Unternehmensspezifische Kennzahlen aus SEC-Filings (z.B. Subscriber, ARR, MAU) für ${ticker}.`}
    >
    <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(kpis).map(([key, m]) => {
        const latest = m.data[m.data.length - 1]
        const prev = m.data[m.data.length - 5]
        const yoy = prev ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100 : null
        const unit =
          m.unit === 'millions'
            ? 'M'
            : m.unit === 'billions'
              ? 'B'
              : m.unit === 'thousands'
                ? 'K'
                : m.unit === 'percent'
                  ? '%'
                  : m.unit === 'dollars'
                    ? '$'
                    : m.unit === 'GWh'
                      ? ' GWh'
                      : ''
        const val =
          m.unit === 'dollars'
            ? `$${latest?.value.toFixed(2)}`
            : m.unit === 'percent'
              ? `${latest?.value.toFixed(1)}%`
              : `${latest?.value.toLocaleString('en-US')}${unit}`

        return (
          <div key={key} className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
            <div className="flex justify-between mb-1">
              <p className="text-[11px] text-white/25">{m.label}</p>
              <div className="flex items-center gap-2">
                {yoy !== null && (
                  <span className={`text-[10px] font-bold ${yoy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {yoy >= 0 ? '+' : ''}
                    {yoy.toFixed(1)}%
                  </span>
                )}
                <span className="text-[10px] text-white/12">{latest?.period}</span>
              </div>
            </div>
            <p className="text-xl font-bold text-white mb-4">{val}</p>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    fill={`url(#g-${key})`}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
    </FeyPremiumGate>
  )
}
