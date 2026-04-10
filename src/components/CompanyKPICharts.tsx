'use client'

// src/components/CompanyKPICharts.tsx
// Company-specific operating KPIs from SEC EDGAR 8-K filings

import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'

interface KPIDataPoint { period: string; periodDate: string; value: number; filingUrl: string | null }
interface KPIMetric { label: string; unit: string; data: KPIDataPoint[] }
interface KPIResponse { ticker: string; metrics: Record<string, KPIMetric> }
interface CompanyKPIChartsProps { ticker: string; isPremium: boolean }

function formatValue(value: number, unit: string): string {
  if (unit === 'percent') return `${value.toFixed(1)}%`
  if (unit === 'dollars') return `$${value.toFixed(2)}`
  if (unit === 'millions') return value >= 1000 ? `$${(value / 1000).toFixed(2)}B` : `${value.toFixed(1)}M`
  if (unit === 'billions') return `$${value.toFixed(2)}B`
  if (unit === 'thousands') return `${(value / 1000).toFixed(1)}M`
  return value.toLocaleString('de-DE')
}

function formatYAxis(value: number, unit: string): string {
  if (unit === 'percent') return `${value}%`
  if (unit === 'dollars') return `$${value}`
  if (unit === 'millions') return value >= 1000 ? `$${(value / 1000).toFixed(1)}B` : `${value}M`
  if (unit === 'billions') return `$${value}B`
  return value.toLocaleString()
}

function CustomTooltip({ active, payload, label, unit, metricLabel }: {
  active?: boolean; payload?: { value: number }[]; label?: string; unit: string; metricLabel: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-theme-secondary border border-theme rounded-lg p-3 shadow-lg text-sm">
      <p className="text-theme-secondary mb-1">{label}</p>
      <p className="font-semibold text-theme-primary">{metricLabel}: {formatValue(payload[0].value, unit)}</p>
    </div>
  )
}

function PremiumGate() {
  return (
    <div className="relative">
      <div className="h-48 rounded-xl bg-theme-secondary border border-theme overflow-hidden">
        <div className="w-full h-full blur-sm opacity-40 pointer-events-none select-none p-4">
          <svg viewBox="0 0 400 160" className="w-full h-full">
            <polyline points="20,130 80,100 140,80 200,95 260,55 320,65 380,42"
              fill="none" stroke="#22c55e" strokeWidth="2.5" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div className="text-center">
          <p className="text-sm font-semibold text-theme-primary">Operating KPIs · Nur für Premium</p>
          <p className="text-xs text-theme-secondary mt-1">
            Subscriber-Zahlen, MAUs & mehr direkt aus SEC EDGAR 8-K Filings
          </p>
        </div>
        <Link href="/pricing"
          className="px-4 py-2 bg-brand hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors">
          Premium freischalten
        </Link>
      </div>
    </div>
  )
}

export default function CompanyKPICharts({ ticker, isPremium }: CompanyKPIChartsProps) {
  const [data, setData] = useState<KPIResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeMetric, setActiveMetric] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/company-kpis/${ticker}`)
      .then((r) => r.json())
      .then((json: KPIResponse) => {
        setData(json)
        const keys = Object.keys(json.metrics || {})
        if (keys.length > 0) setActiveMetric(keys[0])
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [ticker])

  if (loading) return null

  // No data → hide entire section (unsupported stocks show nothing)
  if (!data || Object.keys(data.metrics || {}).length === 0) return null

  const metricKeys = Object.keys(data.metrics)
  const currentKey = activeMetric || metricKeys[0]
  const current = data.metrics[currentKey]
  const latest = current.data[current.data.length - 1]
  const yearAgo = current.data[current.data.length - 5]
  const yoy = yearAgo ? ((latest.value - yearAgo.value) / Math.abs(yearAgo.value)) * 100 : null

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-bold text-theme-primary">Operating KPIs</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">SEC EDGAR</span>
      </div>

      {!isPremium ? <PremiumGate /> : (
        <>
          {metricKeys.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {metricKeys.map((key) => (
                <button key={key} onClick={() => setActiveMetric(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    key === currentKey
                      ? 'bg-brand text-white'
                      : 'bg-theme-secondary text-theme-secondary hover:text-theme-primary'
                  }`}>
                  {data.metrics[key].label}
                </button>
              ))}
            </div>
          )}

          <div className="bg-theme-secondary rounded-xl p-4 border border-theme">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-theme-primary">{current.label}</h4>
                <p className="text-xs text-theme-secondary mt-0.5">
                  Quarterly · Quelle:{' '}
                  {latest?.filingUrl ? (
                    <a href={latest.filingUrl} target="_blank" rel="noopener noreferrer"
                      className="text-brand hover:underline">
                      SEC EDGAR 8-K
                    </a>
                  ) : (
                    'SEC EDGAR 8-K'
                  )}
                </p>
              </div>
              {latest && (
                <div className="text-right">
                  <p className="text-lg font-bold text-theme-primary">{formatValue(latest.value, current.unit)}</p>
                  <p className="text-xs text-theme-secondary">{latest.period}</p>
                </div>
              )}
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={current.data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => formatYAxis(v, current.unit)} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={<CustomTooltip unit={current.unit} metricLabel={current.label} />} />
                <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {yoy !== null && (
            <p className="text-xs text-theme-secondary flex items-center gap-1">
              <span className={`font-semibold ${yoy >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}% YoY
              </span>
              im Vergleich zum Vorjahresquartal
            </p>
          )}
        </>
      )}
    </section>
  )
}
