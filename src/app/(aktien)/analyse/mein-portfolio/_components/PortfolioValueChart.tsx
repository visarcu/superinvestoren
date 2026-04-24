'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'

interface Props {
  portfolioId: string | null
  portfolioIds?: string[]
  holdings: Array<{
    symbol: string
    quantity: number
    purchase_price: number
    purchase_date?: string
  }>
  cashPosition: number
  formatCurrency: (v: number) => string
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'MAX'
type ChartView = 'value' | 'performance'

interface ValueDataPoint {
  date: string
  value: number
  invested: number
  label: string
}

interface PerformanceDataPoint {
  date: string
  portfolioPerformance: number
  spyPerformance: number
  msciWorldPerformance: number
  ftseAllWorldPerformance: number
  label: string
}

const TT: React.CSSProperties = {
  backgroundColor: 'rgba(6,6,14,0.96)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
}

const TIMEFRAMES: TimeRange[] = ['1M', '3M', '6M', '1Y', 'MAX']

export default function PortfolioValueChart({
  portfolioId,
  portfolioIds,
  holdings,
  cashPosition,
  formatCurrency,
}: Props) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('MAX')
  const [chartView, setChartView] = useState<ChartView>('value')
  const [valueData, setValueData] = useState<ValueDataPoint[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (holdings.length === 0) {
      setValueData([])
      setPerformanceData([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const days = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365, MAX: 730 }[selectedRange]

    try {
      const res = await fetch('/api/v1/portfolio/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: portfolioIds && portfolioIds.length > 0 ? undefined : portfolioId,
          portfolioIds,
          holdings: holdings.map(h => ({
            symbol: h.symbol,
            quantity: h.quantity,
            purchase_date: h.purchase_date,
            purchase_price: h.purchase_price,
          })),
          cashPosition,
          days,
        }),
      })

      if (!res.ok) throw new Error('API Error')
      const result = await res.json()

      const spansMultipleYears = ['1Y', 'MAX'].includes(selectedRange)
      const formatLabel = (dateStr: string) => {
        const d = new Date(dateStr)
        return spansMultipleYears
          ? d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
          : d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
      }

      setValueData(
        (result.data || []).map((p: any) => ({
          date: p.date,
          value: p.value,
          invested: p.invested,
          label: formatLabel(p.date),
        }))
      )
      setPerformanceData(
        (result.performanceData || []).map((p: any) => ({
          date: p.date,
          portfolioPerformance: p.portfolioPerformance,
          spyPerformance: p.spyPerformance,
          msciWorldPerformance: p.msciWorldPerformance,
          ftseAllWorldPerformance: p.ftseAllWorldPerformance,
          label: formatLabel(p.date),
        }))
      )
    } catch (err) {
      console.error('[PortfolioValueChart]', err)
      setError('Konnte Verlauf nicht laden')
    } finally {
      setLoading(false)
    }
  }, [holdings, cashPosition, selectedRange, portfolioId, portfolioIds])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const data = chartView === 'value' ? valueData : performanceData
  const lastValue = valueData[valueData.length - 1]?.value ?? 0
  const firstValue = valueData[0]?.value ?? 0
  const valueChange = lastValue - firstValue
  const valuePct = firstValue > 0 ? (valueChange / firstValue) * 100 : 0
  const isPositive = valueChange >= 0

  const portfolioPerf = performanceData[performanceData.length - 1]?.portfolioPerformance ?? 0

  return (
    <section className="mt-6 rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] p-6">
      {/* Header: Toggle + Time-Range */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h2 className="text-[13px] font-semibold text-white/90 tracking-tight">
              {chartView === 'value' ? 'Wertentwicklung' : 'Performance'}
            </h2>
            <div
              role="tablist"
              className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-white/[0.03] border border-white/[0.05]"
            >
              <button
                role="tab"
                aria-selected={chartView === 'value'}
                onClick={() => setChartView('value')}
                className={`px-2.5 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                  chartView === 'value' ? 'bg-white text-[#06060e]' : 'text-white/45 hover:text-white/80'
                }`}
              >
                Wert
              </button>
              <button
                role="tab"
                aria-selected={chartView === 'performance'}
                onClick={() => setChartView('performance')}
                className={`px-2.5 py-0.5 text-[10px] font-medium rounded-full transition-colors ${
                  chartView === 'performance' ? 'bg-white text-[#06060e]' : 'text-white/45 hover:text-white/80'
                }`}
              >
                Vergleich
              </button>
            </div>
          </div>
          {!loading && chartView === 'value' && valueData.length > 0 && (
            <div className="flex items-baseline gap-2.5">
              <p className="text-2xl font-semibold text-white tabular-nums tracking-tight">
                {formatCurrency(lastValue)}
              </p>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium tabular-nums ${
                  isPositive
                    ? 'bg-emerald-400/[0.08] text-emerald-300'
                    : 'bg-red-400/[0.08] text-red-300'
                }`}
              >
                {isPositive ? '+' : ''}
                {formatCurrency(valueChange)}
                <span className={isPositive ? 'text-emerald-300/60' : 'text-red-300/60'}>
                  · {isPositive ? '+' : ''}
                  {valuePct.toFixed(2).replace('.', ',')}%
                </span>
              </span>
            </div>
          )}
          {!loading && chartView === 'performance' && performanceData.length > 0 && (
            <div className="flex items-baseline gap-2.5">
              <p
                className={`text-2xl font-semibold tabular-nums tracking-tight ${
                  portfolioPerf >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {portfolioPerf >= 0 ? '+' : ''}
                {portfolioPerf.toFixed(2).replace('.', ',')}%
              </p>
              <span className="text-[10px] font-medium text-white/35 uppercase tracking-[0.14em]">
                TWR im Zeitraum
              </span>
            </div>
          )}
        </div>

        {/* Timeframes */}
        <div
          role="tablist"
          className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-white/[0.03] border border-white/[0.05]"
        >
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              role="tab"
              aria-selected={selectedRange === tf}
              onClick={() => setSelectedRange(tf)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-colors ${
                selectedRange === tf
                  ? 'bg-white text-[#06060e]'
                  : 'text-white/45 hover:text-white/80'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-red-400/70">{error}</p>
          </div>
        )}
        {!loading && !error && data.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-[12px] text-white/30">Keine Verlaufsdaten verfügbar</p>
          </div>
        )}
        {!loading && data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'value' ? (
              <ComposedChart data={valueData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="portfolioValueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.18)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(valueData.length / 8))}
                />
                <YAxis
                  hide
                  domain={['dataMin * 0.98', 'dataMax * 1.02']}
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload as ValueDataPoint
                    const change = p.value - p.invested
                    const pct = p.invested > 0 ? (change / p.invested) * 100 : 0
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
                          {formatCurrency(p.value)}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                          Investiert: {formatCurrency(p.invested)}
                        </p>
                        <p
                          style={{
                            color: change >= 0 ? '#4ade80' : '#f87171',
                            fontSize: '11px',
                            marginTop: '2px',
                          }}
                        >
                          {change >= 0 ? '+' : ''}
                          {formatCurrency(change)} ({change >= 0 ? '+' : ''}
                          {pct.toFixed(2)}%)
                        </p>
                      </div>
                    )
                  }}
                />
                {/* Investiert-Linie als Referenz */}
                <Line
                  type="monotone"
                  dataKey="invested"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={false}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? '#22c55e' : '#ef4444'}
                  strokeWidth={1.5}
                  fill="url(#portfolioValueGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }}
                />
              </ComposedChart>
            ) : (
              <ComposedChart data={performanceData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.18)' }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(performanceData.length / 8))}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.15)' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                  tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const p = payload[0].payload as PerformanceDataPoint
                    return (
                      <div style={TT}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                          {new Date(p.date).toLocaleDateString('de-DE', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        <div style={{ marginTop: '4px' }}>
                          <Row label="Mein Depot (TWR)" value={p.portfolioPerformance} color="#fff" highlight />
                          <Row label="S&P 500 (SPY)" value={p.spyPerformance} color="#60a5fa" />
                          <Row label="MSCI World (URTH)" value={p.msciWorldPerformance} color="#c084fc" />
                          <Row label="FTSE All-World (VT)" value={p.ftseAllWorldPerformance} color="#fbbf24" />
                        </div>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="portfolioPerformance"
                  stroke="#fff"
                  strokeWidth={1.7}
                  dot={false}
                  activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="spyPerformance"
                  stroke="#60a5fa"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="msciWorldPerformance"
                  stroke="#c084fc"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ftseAllWorldPerformance"
                  stroke="#fbbf24"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  dot={false}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend für Performance-Ansicht */}
      {chartView === 'performance' && performanceData.length > 0 && !loading && (
        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/[0.03]">
          <LegendItem color="#fff" label="Mein Depot (TWR)" solid />
          <LegendItem color="#60a5fa" label="S&P 500" />
          <LegendItem color="#c084fc" label="MSCI World" />
          <LegendItem color="#fbbf24" label="FTSE All-World" />
        </div>
      )}
    </section>
  )
}

function Row({
  label,
  value,
  color,
  highlight,
}: {
  label: string
  value: number
  color: string
  highlight?: boolean
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '2px' }}>
      <span style={{ color, fontSize: '11px', fontWeight: highlight ? 600 : 400 }}>{label}</span>
      <span style={{ color: value >= 0 ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 600 }}>
        {value >= 0 ? '+' : ''}
        {value.toFixed(2)}%
      </span>
    </div>
  )
}

function LegendItem({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-3 h-px"
        style={{
          background: solid ? color : `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 5px)`,
          height: '2px',
        }}
      />
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
  )
}
