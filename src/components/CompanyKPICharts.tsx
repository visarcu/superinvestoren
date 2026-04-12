'use client'

// src/components/CompanyKPICharts.tsx
// Company-specific operating KPIs from SEC EDGAR 8-K filings
// Design aligned with FinancialAnalysisClient (Kennzahlen-Charts)

import React, { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

interface KPIDataPoint { period: string; periodDate: string; value: number; filingUrl: string | null }
interface KPIMetric { label: string; unit: string; data: KPIDataPoint[] }
interface KPIResponse { ticker: string; metrics: Record<string, KPIMetric> }
interface CompanyKPIChartsProps { ticker: string; isPremium: boolean }

// ─── Shared tooltip style (matches Kennzahlen-Charts) ────────────────────────

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
}

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
  if (unit === 'thousands') return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value)}`
  if (unit === 'millions') {
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.', ',')} Mrd.`
    return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(value)}`
  }
  if (unit === 'billions') return `${value} Mrd.`
  return String(value)
}

function getXAxisInterval(dataLength: number): number {
  if (dataLength <= 5) return 0
  if (dataLength <= 10) return 1
  if (dataLength <= 16) return 3
  return Math.floor(dataLength / 5)
}

// ─── KPI Expand Modal ────────────────────────────────────────────────────────

function KPIModal({ metric, metricKey, onClose }: { metric: KPIMetric; metricKey: string; onClose: () => void }) {
  const latest = metric.data[metric.data.length - 1]
  const yearAgo = metric.data[metric.data.length - 5]
  const yoy = yearAgo ? ((latest.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100 : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-theme-card border border-theme-light rounded-xl w-full max-w-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-theme-primary">{metric.label}</h3>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-2xl font-bold text-theme-primary">
                {latest ? formatValue(latest.value, metric.unit) : '–'}
              </p>
              {yoy !== null && (
                <span className={`text-sm font-semibold ${yoy >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {yoy >= 0 ? '+' : ''}{yoy.toFixed(1).replace('.', ',')} %
                </span>
              )}
              {latest && <span className="text-xs text-theme-muted">{latest.period}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-tertiary rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-theme-secondary" />
          </button>
        </div>

        {/* Large Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metric.data} margin={{ top: 10, right: 15, bottom: 25, left: 45 }}>
              <defs>
                <linearGradient id={`gradient-modal-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.5)" horizontal vertical={false} />
              <XAxis
                dataKey="period"
                axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                interval={getXAxisInterval(metric.data.length)}
                height={25}
              />
              <YAxis
                tickFormatter={(v) => formatYAxis(v, metric.unit)}
                axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                width={40}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.[0]) return null
                  const value = payload[0].value as number
                  const idx = metric.data.findIndex(d => d.period === label)
                  const prev = idx >= 4 ? metric.data[idx - 4] : null
                  const change = prev ? ((value - prev.value) / Math.abs(prev.value)) * 100 : null

                  return (
                    <div style={tooltipStyle}>
                      <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '3px' }}>{label}</p>
                      <p style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600 }}>{formatValue(value, metric.unit)}</p>
                      {change !== null && (
                        <p style={{ fontSize: '11px', fontWeight: 600, marginTop: '3px', color: change >= 0 ? '#4ade80' : '#f87171' }}>
                          {change >= 0 ? '+' : ''}{change.toFixed(1).replace('.', ',')} % gg. Vj.
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#22c55e"
                strokeWidth={2.5}
                fill={`url(#gradient-modal-${metricKey})`}
                dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#22c55e' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Source */}
        {latest?.filingUrl && (
          <a
            href={latest.filingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-theme-muted hover:text-brand transition-colors mt-3 block"
          >
            Quelle: SEC EDGAR 8-K ↗
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Single KPI Card ──────────────────────────────────────────────────────────

function KPICard({ metricKey, metric, onExpand }: { metricKey: string; metric: KPIMetric; onExpand: () => void }) {
  const latest = metric.data[metric.data.length - 1]
  const yearAgo = metric.data[metric.data.length - 5]
  const yoy = yearAgo ? ((latest.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100 : null

  return (
    <div className="bg-theme-card rounded-lg p-4 hover:bg-theme-hover transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs text-theme-secondary leading-tight pr-2">{metric.label}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {latest && <p className="text-xs text-theme-muted">{latest.period}</p>}
          <button
            onClick={onExpand}
            className="p-1 hover:bg-theme-tertiary rounded transition-colors opacity-0 group-hover:opacity-100"
          >
            <ArrowsPointingOutIcon className="w-3 h-3 text-theme-secondary hover:text-theme-primary" />
          </button>
        </div>
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

      {/* Chart – styled to match Kennzahlen-Charts */}
      <div className="aspect-[4/3]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metric.data} margin={{ top: 10, right: 10, bottom: 20, left: 35 }}>
            <defs>
              <linearGradient id={`gradient-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.5)"
              horizontal
              vertical={false}
            />
            <XAxis
              dataKey="period"
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{ fontSize: 10, fill: 'var(--text-secondary)', textAnchor: 'middle' }}
              interval={getXAxisInterval(metric.data.length)}
              height={22}
            />
            <YAxis
              tickFormatter={(v) => formatYAxis(v, metric.unit)}
              axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tickLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              width={35}
              tickCount={4}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0]) return null
                const value = payload[0].value as number
                const idx = metric.data.findIndex(d => d.period === label)
                const prev = idx >= 4 ? metric.data[idx - 4] : null
                const change = prev ? ((value - prev.value) / Math.abs(prev.value)) * 100 : null

                return (
                  <div style={tooltipStyle}>
                    <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '3px' }}>{label}</p>
                    <p style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600 }}>{formatValue(value, metric.unit)}</p>
                    {change !== null && (
                      <p style={{ fontSize: '11px', fontWeight: 600, marginTop: '3px', color: change >= 0 ? '#4ade80' : '#f87171' }}>
                        {change >= 0 ? '+' : ''}{change.toFixed(1).replace('.', ',')} % gg. Vj.
                      </p>
                    )}
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#22c55e"
              strokeWidth={2}
              fill={`url(#gradient-${metricKey})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#22c55e' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-theme-card rounded-lg p-4 relative overflow-hidden">
          <div className="blur-sm opacity-25 pointer-events-none select-none">
            <p className="text-xs text-theme-secondary">KPI Metrik</p>
            <p className="text-xl font-bold text-theme-primary mt-0.5 mb-3">12,3 Mrd.</p>
            <div className="aspect-[4/3] bg-theme-secondary rounded" />
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
  const [expandedMetric, setExpandedMetric] = useState<{ key: string; metric: KPIMetric } | null>(null)

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {Object.entries(data.metrics).map(([key, metric]) => (
          <KPICard
            key={key}
            metricKey={key}
            metric={metric}
            onExpand={() => setExpandedMetric({ key, metric })}
          />
        ))}
      </div>

      {/* Expand Modal */}
      {expandedMetric && (
        <KPIModal
          metric={expandedMetric.metric}
          metricKey={expandedMetric.key}
          onClose={() => setExpandedMetric(null)}
        />
      )}
    </section>
  )
}
