'use client'

import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Scatter,
  Cell,
} from 'recharts'

interface PricePoint {
  date: string
  close: number
}

export interface PurchaseMarker {
  date: string
  priceEUR: number
  quantity: number
  type: 'buy' | 'sell' | 'transfer_in' | 'transfer_out' | 'dividend'
}

interface StockHistoryChartProps {
  history: PricePoint[]
  markers: PurchaseMarker[]
  formatCurrency: (v: number) => string
  loading: boolean
}

const TT: React.CSSProperties = {
  backgroundColor: 'rgba(6,6,14,0.96)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
}

const MARKER_COLORS: Record<PurchaseMarker['type'], string> = {
  buy: '#22c55e',
  sell: '#ef4444',
  transfer_in: '#60a5fa',
  transfer_out: '#fb7185',
  dividend: '#fbbf24',
}

const MARKER_LABELS: Record<PurchaseMarker['type'], string> = {
  buy: 'Kauf',
  sell: 'Verkauf',
  transfer_in: 'Transfer rein',
  transfer_out: 'Transfer raus',
  dividend: 'Dividende',
}

export default function StockHistoryChart({
  history,
  markers,
  formatCurrency,
  loading,
}: StockHistoryChartProps) {
  // Marker auf den nächstgelegenen Handelstag mappen, damit sie im Chart angezeigt werden
  const chartData = useMemo(() => {
    if (history.length === 0) return []
    const dateSet = new Set(history.map(h => h.date))
    const sortedDates = history.map(h => h.date).sort()

    // Pro Datum: { date, close, marker?: { priceEUR, type, quantity } }
    const dataMap = new Map<string, any>()
    for (const h of history) {
      dataMap.set(h.date, { date: h.date, close: h.close, markerPrice: null, markerType: null })
    }

    for (const m of markers) {
      let targetDate = m.date
      if (!dateSet.has(targetDate)) {
        const next = sortedDates.find(d => d >= targetDate)
        if (!next) continue
        targetDate = next
      }
      const entry = dataMap.get(targetDate)
      if (!entry) continue
      // Wenn schon ein Marker da ist, behalte den ältesten (chronologisch)
      if (entry.markerPrice == null) {
        entry.markerPrice = m.priceEUR
        entry.markerType = m.type
        entry.markerQty = m.quantity
        entry.markerOriginalDate = m.date
      }
    }

    return Array.from(dataMap.values())
  }, [history, markers])

  const isPositive = useMemo(() => {
    if (history.length < 2) return true
    return history[history.length - 1].close >= history[0].close
  }, [history])

  if (loading) {
    return (
      <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6 h-72 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6 h-72 flex items-center justify-center">
        <p className="text-[12px] text-white/15">Keine historischen Daten verfügbar</p>
      </div>
    )
  }

  return (
    <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6 mt-6">
      <h2 className="text-[13px] font-semibold text-white/80 mb-4">
        Kursverlauf
        <span className="text-[10px] text-white/20 font-normal ml-2">
          mit Kaufpunkten · Preise in Quote-Währung
        </span>
      </h2>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="stockHistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.18} />
                <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.18)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={d =>
                new Date(d).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
              }
              interval={Math.max(0, Math.floor(chartData.length / 8))}
            />
            <YAxis hide domain={['dataMin * 0.98', 'dataMax * 1.02']} />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as any
                return (
                  <div style={TT}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                      {new Date(p.date).toLocaleDateString('de-DE', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginTop: '2px' }}>
                      {formatCurrency(p.close)}
                    </p>
                    {p.markerType && (
                      <p
                        style={{
                          color: MARKER_COLORS[p.markerType as PurchaseMarker['type']],
                          fontSize: '11px',
                          marginTop: '4px',
                          fontWeight: 600,
                        }}
                      >
                        {MARKER_LABELS[p.markerType as PurchaseMarker['type']]}: {formatCurrency(p.markerPrice)}
                        {p.markerQty
                          ? ` · ${p.markerQty.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.`
                          : ''}
                      </p>
                    )}
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth={1.5}
              fill="url(#stockHistGrad)"
              dot={false}
              activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }}
            />
            {/* Kauf-/Verkaufs-Marker als Scatter auf dem Kaufpreis (nicht auf Schlusskurs!) */}
            <Scatter dataKey="markerPrice" fill="#fff">
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.markerType ? MARKER_COLORS[entry.markerType as PurchaseMarker['type']] : 'transparent'}
                  stroke={entry.markerType ? '#06060e' : 'transparent'}
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legende */}
      {markers.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/[0.03]">
          {(['buy', 'sell', 'transfer_in', 'transfer_out', 'dividend'] as const)
            .filter(t => markers.some(m => m.type === t))
            .map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: MARKER_COLORS[t] }} />
                <span className="text-[10px] text-white/40">{MARKER_LABELS[t]}</span>
              </div>
            ))}
        </div>
      )}
    </section>
  )
}
