// /analyse/esef-data/[ticker] – ESEF European Company Data Lab
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EsefPeriod {
  period: string
  revenue: number | null
  netIncome: number | null
  grossProfit: number | null
  operatingIncome: number | null
  eps: number | null
  totalAssets: number | null
  cash: number | null
  longTermDebt: number | null
  shareholdersEquity: number | null
  operatingCashFlow: number | null
  freeCashFlow: number | null
  rd: number | null
  goodwill: number | null
  [key: string]: any
}

interface EsefResponse {
  ticker: string
  name: string
  lei: string
  currency: string
  periods: EsefPeriod[]
  availableYears: string[]
  source: string
  standard: string
  availableCompanies?: { ticker: string; name: string; years: string[] }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEUR(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1).replace('.', ',')} Mrd.`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(0)} Mio.`
  return new Intl.NumberFormat('de-DE').format(value)
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
}

const METRICS = [
  { key: 'revenue', label: 'Umsatz', format: 'currency' },
  { key: 'netIncome', label: 'Jahresüberschuss', format: 'currency' },
  { key: 'grossProfit', label: 'Bruttoergebnis', format: 'currency' },
  { key: 'operatingIncome', label: 'Operatives Ergebnis', format: 'currency' },
  { key: 'eps', label: 'Ergebnis je Aktie', format: 'decimal' },
  { key: 'totalAssets', label: 'Bilanzsumme', format: 'currency' },
  { key: 'shareholdersEquity', label: 'Eigenkapital', format: 'currency' },
  { key: 'cash', label: 'Liquide Mittel', format: 'currency' },
  { key: 'longTermDebt', label: 'Langfristige Verbindlichkeiten', format: 'currency' },
  { key: 'goodwill', label: 'Geschäftswert (Goodwill)', format: 'currency' },
  { key: 'operatingCashFlow', label: 'Operativer Cashflow', format: 'currency' },
  { key: 'rd', label: 'F&E Aufwand', format: 'currency' },
] as const

const DAX_TICKERS = [
  { ticker: 'SAP', label: 'SAP' },
  { ticker: 'SIE', label: 'Siemens' },
  { ticker: 'ALV', label: 'Allianz' },
  { ticker: 'DTE', label: 'Dt. Telekom' },
  { ticker: 'BAS', label: 'BASF' },
  { ticker: 'MBG', label: 'Mercedes' },
  { ticker: 'ADS', label: 'Adidas' },
  { ticker: 'MUV2', label: 'Munich Re' },
  { ticker: 'DB1', label: 'Dt. Börse' },
]

// ─── Chart Component ─────────────────────────────────────────────────────────

function MetricChart({ metric, data, currency }: { metric: typeof METRICS[number]; data: EsefPeriod[]; currency: string }) {
  const chartData = data
    .filter(d => d[metric.key] !== null && d[metric.key] !== undefined)
    .map(d => ({ period: d.period, value: d[metric.key] as number }))

  if (chartData.length === 0) return null

  return (
    <div className="bg-theme-card rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-theme-primary">{metric.label}</h3>
        <span className="text-[10px] text-theme-muted">{currency}</span>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 25, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" horizontal vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickLine={false} />
            <YAxis
              tickFormatter={metric.format === 'decimal' ? (v) => `${v}` : (v) => formatEUR(v)}
              tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
              tickLine={false} width={45}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const val = payload[0].value as number
                return (
                  <div style={tooltipStyle}>
                    <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '3px' }}>{label}</p>
                    <p style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600 }}>
                      {metric.format === 'decimal' ? `${val.toFixed(2)} ${currency}` : `${formatEUR(val)} ${currency}`}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="value" fill="#10b981" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function EsefDataPage() {
  const params = useParams()
  const router = useRouter()
  const ticker = (params.ticker as string)?.toUpperCase() || 'SAP'

  const [data, setData] = useState<EsefResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'revenue', 'netIncome', 'eps', 'totalAssets', 'operatingCashFlow', 'rd',
  ])

  useEffect(() => {
    setLoading(true)
    setError(null)

    fetch(`/api/v1/esef/${ticker}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) {
          setError(d.error)
          setData(d.availableCompanies ? { ...d, periods: [] } as any : null)
        } else {
          setData(d)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [ticker])

  return (
    <div className="min-h-screen bg-theme-bg p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-theme-primary">ESEF Data Lab</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">IFRS</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">Beta</span>
        </div>
        <p className="text-sm text-theme-secondary">
          Finanzdaten europäischer Unternehmen aus ESEF/iXBRL Filings – direkt, ohne Zwischenhändler.
        </p>
      </div>

      {/* DAX Ticker Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {DAX_TICKERS.map(t => (
          <button
            key={t.ticker}
            onClick={() => router.push(`/analyse/esef-data/${t.ticker}`)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              ticker === t.ticker || ticker === t.ticker.replace('.DE', '')
                ? 'bg-emerald-500 text-white'
                : 'bg-theme-card text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
          <p className="text-yellow-400 text-sm mb-2">{error}</p>
          <p className="text-xs text-theme-muted">
            Aktuell verfügbar: Daten von 2020/2021 aus filings.xbrl.org. Neuere Daten erfordern manuellen ESEF-Download von den IR-Seiten.
          </p>
        </div>
      )}

      {/* Company Info */}
      {data && data.periods && data.periods.length > 0 && (
        <>
          <div className="bg-theme-card rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-theme-primary">{data.name}</h2>
                <p className="text-xs text-theme-muted">
                  LEI: {data.lei} · {data.periods.length} Perioden · {data.currency} · {data.standard}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                  ESEF iXBRL
                </span>
              </div>
            </div>
          </div>

          {/* Metric Toggle */}
          <div className="flex flex-wrap gap-1.5 mb-6">
            {METRICS.map(m => {
              const hasData = data.periods.some(p => p[m.key] !== null)
              return (
                <button
                  key={m.key}
                  onClick={() => setSelectedMetrics(prev =>
                    prev.includes(m.key) ? prev.filter(k => k !== m.key) : [...prev, m.key]
                  )}
                  disabled={!hasData}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    !hasData
                      ? 'bg-theme-card text-theme-muted opacity-50 cursor-not-allowed'
                      : selectedMetrics.includes(m.key)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-theme-card text-theme-muted hover:text-theme-secondary'
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {METRICS.filter(m => selectedMetrics.includes(m.key)).map(metric => (
              <MetricChart
                key={metric.key}
                metric={metric}
                data={data.periods}
                currency={data.currency}
              />
            ))}
          </div>

          {/* Data Table */}
          <div className="bg-theme-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-theme-primary mb-4">Rohdaten</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-light">
                    <th className="text-left py-2 text-theme-muted">Jahr</th>
                    <th className="text-right py-2 text-theme-muted">Umsatz</th>
                    <th className="text-right py-2 text-theme-muted">Gewinn</th>
                    <th className="text-right py-2 text-theme-muted">EPS</th>
                    <th className="text-right py-2 text-theme-muted">Bilanzsumme</th>
                    <th className="text-right py-2 text-theme-muted">Cash</th>
                    <th className="text-right py-2 text-theme-muted">Op. CF</th>
                  </tr>
                </thead>
                <tbody>
                  {data.periods.map(p => (
                    <tr key={p.period} className="border-b border-theme-light/30">
                      <td className="py-2 text-theme-secondary font-medium">{p.period}</td>
                      <td className="py-2 text-right text-theme-primary">{p.revenue ? `${formatEUR(p.revenue)} €` : '–'}</td>
                      <td className="py-2 text-right text-theme-primary">{p.netIncome ? `${formatEUR(p.netIncome)} €` : '–'}</td>
                      <td className="py-2 text-right text-theme-primary">{p.eps ? `${p.eps.toFixed(2)} €` : '–'}</td>
                      <td className="py-2 text-right text-theme-primary">{p.totalAssets ? `${formatEUR(p.totalAssets)} €` : '–'}</td>
                      <td className="py-2 text-right text-theme-primary">{p.cash ? `${formatEUR(p.cash)} €` : '–'}</td>
                      <td className="py-2 text-right text-theme-primary">{p.operatingCashFlow ? `${formatEUR(p.operatingCashFlow)} €` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw JSON */}
          <details className="mt-6">
            <summary className="text-xs text-theme-muted cursor-pointer hover:text-theme-secondary">
              Raw ESEF Response
            </summary>
            <pre className="mt-2 bg-theme-card rounded-lg p-4 text-xs text-theme-secondary overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-theme-card rounded-lg p-5 border border-theme-light/30">
        <h3 className="text-sm font-semibold text-theme-primary mb-2">Über ESEF-Daten</h3>
        <div className="text-xs text-theme-secondary space-y-2">
          <p>
            ESEF (European Single Electronic Format) ist das EU-Pflichtformat für Jahresberichte
            börsennotierter Unternehmen. Die Finanzdaten sind in iXBRL (Inline XBRL) getaggt –
            maschinenlesbar und standardisiert nach IFRS.
          </p>
          <p>
            Aktuell verfügbare Daten stammen aus dem <a href="https://filings.xbrl.org" target="_blank" className="text-emerald-400 hover:underline">filings.xbrl.org</a> Repository (2020/2021).
            Neuere Filings werden sukzessive von den IR-Seiten der Unternehmen hinzugefügt.
          </p>
          <p className="text-theme-muted">
            Quelle: ESEF/iXBRL Filings · Standard: IFRS · Währung: EUR
          </p>
        </div>
      </div>
    </div>
  )
}
