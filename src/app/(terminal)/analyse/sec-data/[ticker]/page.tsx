// /analyse/sec-data/[ticker] – SEC XBRL vs FMP Vergleichsseite
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SecPeriod {
  period: string
  fiscalYear: number
  fiscalPeriod: string
  revenue: number | null
  netIncome: number | null
  grossProfit: number | null
  operatingIncome: number | null
  eps: number | null
  cash: number | null
  longTermDebt: number | null
  operatingCashFlow: number | null
  capex: number | null
  freeCashFlow: number | null
  rd: number | null
  sharesOutstanding: number | null
  dividendPerShare: number | null
  [key: string]: any
}

interface SecResponse {
  ticker: string
  entityName: string
  cik: string
  periods: SecPeriod[]
  availableMetrics: string[]
}

interface FmpPeriod {
  label: string
  revenue: number
  netIncome: number
  operatingIncome: number
  ebitda: number
  eps: number
  freeCashFlow: number
  [key: string]: any
}

// ─── Metric Config ───────────────────────────────────────────────────────────

const METRICS = [
  { key: 'revenue', label: 'Umsatz (Revenue)', format: 'currency' },
  { key: 'netIncome', label: 'Nettogewinn (Net Income)', format: 'currency' },
  { key: 'eps', label: 'Gewinn je Aktie (EPS)', format: 'decimal' },
  { key: 'grossProfit', label: 'Bruttogewinn (Gross Profit)', format: 'currency' },
  { key: 'operatingIncome', label: 'Operativer Gewinn (Op. Income)', format: 'currency' },
  { key: 'operatingCashFlow', label: 'Operativer Cash Flow', format: 'currency' },
  { key: 'freeCashFlow', label: 'Free Cash Flow', format: 'currency' },
  { key: 'cash', label: 'Cash & Equivalents', format: 'currency' },
  { key: 'longTermDebt', label: 'Langfristige Schulden', format: 'currency' },
  { key: 'rd', label: 'F&E Ausgaben (R&D)', format: 'currency' },
  { key: 'dividendPerShare', label: 'Dividende je Aktie', format: 'decimal' },
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDE(value: number, format: string): string {
  if (format === 'decimal') {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value) + ' $'
  }
  // currency
  const abs = Math.abs(value)
  if (abs >= 1e9) return (value / 1e9).toFixed(1).replace('.', ',') + ' Mrd. $'
  if (abs >= 1e6) return (value / 1e6).toFixed(0).replace('.', ',') + ' Mio. $'
  return new Intl.NumberFormat('de-DE').format(value) + ' $'
}

function formatAxis(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toFixed(0)} Mrd.`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(0)} Mio.`
  return value.toLocaleString('de-DE')
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
}

// ─── Comparison Chart ────────────────────────────────────────────────────────

function ComparisonChart({
  metric,
  secData,
  fmpData,
}: {
  metric: typeof METRICS[number]
  secData: SecPeriod[]
  fmpData: FmpPeriod[]
}) {
  // Merge: SEC und FMP Daten nebeneinander, matched by Jahr
  const merged = useMemo(() => {
    const map = new Map<string, { label: string; sec: number | null; fmp: number | null }>()

    for (const p of secData) {
      const label = p.period
      map.set(label, { label, sec: p[metric.key] ?? null, fmp: null })
    }

    for (const p of fmpData) {
      const label = p.label
      const existing = map.get(label)
      if (existing) {
        existing.fmp = p[metric.key] ?? null
      } else {
        map.set(label, { label, sec: null, fmp: p[metric.key] ?? null })
      }
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [secData, fmpData, metric.key])

  // Differenz berechnen
  const diffs = merged.map(d => {
    if (d.sec === null || d.fmp === null || d.fmp === 0) return null
    return ((d.sec - d.fmp) / Math.abs(d.fmp)) * 100
  })
  const maxDiff = Math.max(...diffs.filter((d): d is number => d !== null).map(Math.abs), 0)
  const hasIssues = maxDiff > 1 // Mehr als 1% Abweichung

  return (
    <div className="bg-theme-card rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-theme-primary">{metric.label}</h3>
        {merged.length > 0 && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            hasIssues
              ? 'bg-yellow-500/10 text-yellow-500'
              : 'bg-green-500/10 text-green-500'
          }`}>
            {hasIssues ? `Max Δ ${maxDiff.toFixed(1)}%` : 'Match ✓'}
          </span>
        )}
      </div>

      {merged.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-theme-muted text-xs">Keine Daten</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={merged} margin={{ top: 10, right: 10, bottom: 25, left: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" horizontal vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={metric.format === 'decimal' ? (v) => `$${v}` : formatAxis}
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                axisLine={{ stroke: 'var(--color-text-tertiary)', strokeWidth: 1 }}
                tickLine={false}
                width={45}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const sec = payload.find(p => p.dataKey === 'sec')?.value as number | undefined
                  const fmp = payload.find(p => p.dataKey === 'fmp')?.value as number | undefined
                  const diff = sec != null && fmp != null && fmp !== 0
                    ? ((sec - fmp) / Math.abs(fmp)) * 100
                    : null

                  return (
                    <div style={tooltipStyle}>
                      <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '6px' }}>{label}</p>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        <div>
                          <p style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 600 }}>SEC XBRL</p>
                          <p style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600 }}>
                            {sec != null ? formatDE(sec, metric.format) : '–'}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: '#f97316', fontSize: '10px', fontWeight: 600 }}>FMP</p>
                          <p style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600 }}>
                            {fmp != null ? formatDE(fmp, metric.format) : '–'}
                          </p>
                        </div>
                      </div>
                      {diff !== null && (
                        <p style={{
                          fontSize: '10px', marginTop: '6px',
                          color: Math.abs(diff) > 1 ? '#f87171' : '#4ade80',
                          fontWeight: 600,
                        }}>
                          Δ {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              <Bar dataKey="sec" fill="#3b82f6" radius={[2, 2, 0, 0]} name="SEC XBRL" />
              <Bar dataKey="fmp" fill="#f97316" radius={[2, 2, 0, 0]} name="FMP" opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daten-Tabelle */}
      <details className="mt-3">
        <summary className="text-xs text-theme-muted cursor-pointer hover:text-theme-secondary">
          Rohdaten anzeigen
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-theme-light">
                <th className="text-left py-1 text-theme-muted">Jahr</th>
                <th className="text-right py-1 text-blue-400">SEC</th>
                <th className="text-right py-1 text-orange-400">FMP</th>
                <th className="text-right py-1 text-theme-muted">Δ</th>
              </tr>
            </thead>
            <tbody>
              {merged.map((d, i) => {
                const diff = d.sec != null && d.fmp != null && d.fmp !== 0
                  ? ((d.sec - d.fmp) / Math.abs(d.fmp)) * 100
                  : null
                return (
                  <tr key={d.label} className="border-b border-theme-light/30">
                    <td className="py-1 text-theme-secondary">{d.label}</td>
                    <td className="py-1 text-right text-theme-primary">
                      {d.sec != null ? formatDE(d.sec, metric.format) : '–'}
                    </td>
                    <td className="py-1 text-right text-theme-primary">
                      {d.fmp != null ? formatDE(d.fmp, metric.format) : '–'}
                    </td>
                    <td className={`py-1 text-right font-medium ${
                      diff !== null && Math.abs(diff) > 1 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {diff !== null ? `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%` : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

// ─── Ticker Search ───────────────────────────────────────────────────────────

function TickerSearch({ currentTicker, onSelect }: { currentTicker: string; onSelect: (t: string) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ ticker: string; name: string }[]>([])
  const [focused, setFocused] = useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (query.length < 1) { setResults([]); return }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}&limit=8`)
        if (res.ok) {
          const data = await res.json()
          const items = (Array.isArray(data) ? data : [])
            .filter((r: any) => r.symbol)
            .slice(0, 8)
            .map((r: any) => ({
              ticker: r.symbol.toUpperCase(),
              name: r.name || '',
            }))
          if (items.length > 0) {
            setResults(items)
            return
          }
        }
      } catch { /* fallback below */ }

      // Fallback: jeden eingetippten Text als Ticker anbieten
      if (query.length >= 1 && query.length <= 6 && /^[A-Za-z.]+$/.test(query)) {
        setResults([{ ticker: query.toUpperCase(), name: 'Direkt laden (SEC XBRL)' }])
      } else {
        setResults([])
      }
    }, 250)

    return () => clearTimeout(timeout)
  }, [query])

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            onKeyDown={e => {
              if (e.key === 'Enter' && query.trim()) {
                onSelect(query.trim().toUpperCase())
                setQuery('')
                setFocused(false)
                inputRef.current?.blur()
              }
            }}
            placeholder="Ticker suchen (z.B. HIMS, CRWD, DIS...)"
            className="w-full px-3 py-2 bg-theme-card border border-theme-light rounded-lg text-sm text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-theme-muted bg-theme-tertiary px-1.5 py-0.5 rounded">↵</kbd>
        </div>
        <span className="text-xs text-theme-muted hidden sm:block">~10.000 US-Aktien verfügbar</span>
      </div>

      {/* Dropdown Results */}
      {focused && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full max-w-xs bg-theme-card border border-theme-light rounded-lg shadow-2xl overflow-hidden">
          {results.map(r => (
            <button
              key={r.ticker}
              onMouseDown={() => {
                onSelect(r.ticker)
                setQuery('')
                setFocused(false)
              }}
              className="w-full px-3 py-2 text-left hover:bg-theme-hover transition-colors flex items-center justify-between"
            >
              <div>
                <span className="text-sm font-semibold text-theme-primary">{r.ticker}</span>
                <span className="text-xs text-theme-muted ml-2">{r.name.slice(0, 35)}</span>
              </div>
              <span className="text-[10px] text-theme-muted">SEC</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const QUICK_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'V', 'MA', 'ASML', 'SBUX', 'COST', 'PYPL']

export default function SecDataComparisonPage() {
  const params = useParams()
  const router = useRouter()
  const ticker = (params.ticker as string)?.toUpperCase() || 'AAPL'

  const [secData, setSecData] = useState<SecResponse | null>(null)
  const [fmpData, setFmpData] = useState<FmpPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [years, setYears] = useState(10)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['revenue', 'eps', 'netIncome', 'freeCashFlow'])

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      fetch(`/api/sec/financials/${ticker}?years=${years}&period=annual`).then(r => r.json()),
      fetch(`/api/financial-data/${ticker}?years=${years}&period=annual`).then(r => r.json()),
    ])
      .then(([sec, fmp]) => {
        if (sec.error) {
          setError(sec.error)
          setSecData(null)
        } else {
          setSecData(sec)
        }

        // FMP Daten verarbeiten (gleiche Logik wie FinancialDataService)
        if (fmp.incomeStatements) {
          const processed = fmp.incomeStatements
            .filter((item: any) => {
              const year = item.calendarYear || parseInt(item.date?.slice(0, 4) || '0')
              return year >= 2005 && year <= new Date().getFullYear() - 1
            })
            .slice(0, years)
            .reverse()
            .map((income: any) => {
              const year = income.calendarYear || income.date?.slice(0, 4) || '—'
              const balance = fmp.balanceSheets?.find((b: any) => (b.calendarYear || b.date?.slice(0, 4)) === (income.calendarYear || income.date?.slice(0, 4))) || {}
              const cashFlow = fmp.cashFlows?.find((c: any) => (c.calendarYear || c.date?.slice(0, 4)) === (income.calendarYear || income.date?.slice(0, 4))) || {}
              const metrics = fmp.keyMetrics?.find((m: any) => (m.calendarYear || m.date?.slice(0, 4)) === (income.calendarYear || income.date?.slice(0, 4))) || {}
              return {
                label: year,
                revenue: income.revenue || 0,
                netIncome: income.netIncome || 0,
                operatingIncome: income.operatingIncome || 0,
                grossProfit: income.grossProfit || 0,
                eps: income.eps || 0,
                cash: balance.cashAndCashEquivalents || balance.cashAndShortTermInvestments || 0,
                longTermDebt: balance.longTermDebt || 0,
                operatingCashFlow: cashFlow.operatingCashFlow || 0,
                capex: Math.abs(cashFlow.capitalExpenditure || 0),
                freeCashFlow: cashFlow.freeCashFlow || 0,
                rd: income.researchAndDevelopmentExpenses || 0,
                dividendPerShare: metrics.dividendPerShare || 0,
              }
            })
          setFmpData(processed)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [ticker, years])

  return (
    <div className="min-h-screen bg-theme-bg p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-theme-primary">SEC XBRL Data Lab</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">Beta</span>
        </div>
        <p className="text-sm text-theme-secondary">
          Finanzdaten direkt von der SEC (XBRL) vs. Financial Modeling Prep (FMP) – Seite an Seite.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <TickerSearch
          currentTicker={ticker}
          onSelect={(t) => router.push(`/analyse/sec-data/${t}`)}
        />
      </div>

      {/* Quick Tickers + Years */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TICKERS.map(t => (
            <button
              key={t}
              onClick={() => router.push(`/analyse/sec-data/${t}`)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                t === ticker
                  ? 'bg-blue-500 text-white'
                  : 'bg-theme-card text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 ml-auto">
          {[5, 10, 20].map(y => (
            <button
              key={y}
              onClick={() => setYears(y)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                y === years
                  ? 'bg-theme-primary text-theme-bg'
                  : 'bg-theme-card text-theme-secondary hover:bg-theme-hover'
              }`}
            >
              {y}J
            </button>
          ))}
        </div>
      </div>

      {/* Entity Info */}
      {secData && (
        <div className="bg-theme-card rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-theme-primary">{secData.entityName}</h2>
            <p className="text-xs text-theme-muted">
              CIK: {secData.cik} · {secData.periods.length} Perioden · {secData.availableMetrics.length} Metriken verfügbar
            </p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-theme-secondary">SEC XBRL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-orange-500 opacity-70" />
              <span className="text-theme-secondary">FMP</span>
            </div>
          </div>
        </div>
      )}

      {/* Metric Toggle */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {METRICS.map(m => (
          <button
            key={m.key}
            onClick={() => setSelectedMetrics(prev =>
              prev.includes(m.key) ? prev.filter(k => k !== m.key) : [...prev, m.key]
            )}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedMetrics.includes(m.key)
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-theme-card text-theme-muted hover:text-theme-secondary'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Charts Grid */}
      {!loading && secData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {METRICS.filter(m => selectedMetrics.includes(m.key)).map(metric => (
            <ComparisonChart
              key={metric.key}
              metric={metric}
              secData={secData.periods}
              fmpData={fmpData}
            />
          ))}
        </div>
      )}

      {/* Raw JSON Toggle */}
      {secData && (
        <details className="mt-6">
          <summary className="text-xs text-theme-muted cursor-pointer hover:text-theme-secondary">
            Raw SEC XBRL Response anzeigen
          </summary>
          <pre className="mt-2 bg-theme-card rounded-lg p-4 text-xs text-theme-secondary overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(secData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
