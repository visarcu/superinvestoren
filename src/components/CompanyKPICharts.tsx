'use client'

// src/components/CompanyKPICharts.tsx
// Company-specific operating KPIs from SEC EDGAR 8-K filings

import React, { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

interface KPIDataPoint { period: string; periodDate: string; value: number; filingUrl: string | null }
interface KPIMetric { label: string; unit: string; data: KPIDataPoint[] }
interface KPIResponse { ticker: string; metrics: Record<string, KPIMetric> }
interface CompanyKPIChartsProps { ticker: string; isPremium: boolean }

// ─── German number formatting ─────────────────────────────────────────────────

function formatValue(value: number, unit: string): string {
  if (unit === 'percent') return `${value.toFixed(1).replace('.', ',')} %`
  if (unit === 'dollars') return `$${value.toFixed(2).replace('.', ',')}`
  if (unit === 'GWh') return `${value.toFixed(1).replace('.', ',')} GWh`
  if (unit === 'thousands') return `${value.toFixed(1).replace('.', ',')} Tsd.`
  if (unit === 'millions') {
    if (value >= 1000) return `${(value / 1000).toFixed(2).replace('.', ',')} Mrd.`
    return `${value.toFixed(1).replace('.', ',')} Mio.`
  }
  if (unit === 'billions') return `${value.toFixed(2).replace('.', ',')} Mrd.`
  return value.toLocaleString('de-DE')
}

function formatYAxis(value: number, unit: string): string {
  if (unit === 'percent') return `${value}%`
  if (unit === 'dollars') return `$${value}`
  if (unit === 'GWh') return `${value}`
  if (unit === 'thousands') return `${value}`
  if (unit === 'millions') {
    if (value >= 1000) return `${(value / 1000).toFixed(0)} Mrd.`
    return `${value}`
  }
  if (unit === 'billions') return `${value} Mrd.`
  return String(value)
}

function CustomTooltip({ active, payload, label, unit, metricLabel }: {
  active?: boolean; payload?: { value: number }[]; label?: string; unit: string; metricLabel: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-theme-card border border-theme-light rounded-lg p-3 shadow-lg text-sm">
      <p className="text-theme-secondary mb-1">{label}</p>
      <p className="font-semibold text-theme-primary">{metricLabel}: {formatValue(payload[0].value, unit)}</p>
    </div>
  )
}

// ─── Single KPI Card ──────────────────────────────────────────────────────────

function KPICard({ metric }: { metricKey: string; metric: KPIMetric }) {
  const latest = metric.data[metric.data.length - 1]
  const yearAgo = metric.data[metric.data.length - 5]
  const yoy = yearAgo ? ((latest.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100 : null

  return (
    <div className="bg-theme-card rounded-xl p-4 hover:bg-theme-hover transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs text-theme-secondary leading-tight pr-2">{metric.label}</p>
        {latest && (
          <p className="text-xs text-theme-muted flex-shrink-0">{latest.period}</p>
        )}
      </div>

      {/* Value + YoY */}
      <div className="flex items-end justify-between mb-3">
        <p className="text-xl font-bold text-theme-primary">
          {latest ? formatValue(latest.value, metric.unit) : '–'}
        </p>
        {yoy !== null && (
          <span className={`text-xs font-semibold mb-0.5 ${yoy >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {yoy >= 0 ? '+' : ''}{yoy.toFixed(1).replace('.', ',')} %
          </span>
        )}
      </div>

      {/* Chart with axes + grid – matching Kennzahlen-Charts aesthetic */}
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={metric.data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.45 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => formatYAxis(v, metric.unit)}
            tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.45 }}
            tickLine={false}
            axisLine={false}
            width={38}
            tickCount={4}
          />
          <Tooltip content={<CustomTooltip unit={metric.unit} metricLabel={metric.label} />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: '#22c55e' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Source link */}
      {latest?.filingUrl && (
        <a
          href={latest.filingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-theme-muted hover:text-brand transition-colors mt-2 block"
          onClick={(e) => e.stopPropagation()}
        >
          Quelle: SEC EDGAR 8-K ↗
        </a>
      )}
    </div>
  )
}

// ─── Premium Gate ─────────────────────────────────────────────────────────────

function PremiumGate() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-theme-card rounded-xl p-4 relative overflow-hidden">
          <div className="blur-sm opacity-25 pointer-events-none select-none">
            <p className="text-xs text-theme-secondary">KPI Metrik</p>
            <p className="text-xl font-bold text-theme-primary mt-0.5 mb-3">12,3 Mrd.</p>
            <div className="h-32 bg-theme-secondary rounded" />
          </div>
          {i === 2 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
              <p className="text-xs font-semibold text-theme-primary text-center">
                Operating KPIs · Nur für Premium
              </p>
              <Link
                href="/pricing"
                className="px-3 py-1.5 bg-brand hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Premium freischalten
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompanyKPICharts({ ticker, isPremium }: CompanyKPIChartsProps) {
  const [data, setData] = useState<KPIResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/company-kpis/${ticker}`)
      .then((r) => r.json())
      .then((json: KPIResponse) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) return null
  if (!data || Object.keys(data.metrics || {}).length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-bold text-theme-primary">Operating KPIs</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">SEC EDGAR</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(data.metrics).map(([key, metric]) => (
          <KPICard key={key} metricKey={key} metric={metric} />
        ))}
      </div>
    </section>
  )
}
