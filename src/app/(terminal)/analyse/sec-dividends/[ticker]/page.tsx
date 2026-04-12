// /analyse/sec-dividends/[ticker] – SEC Dividend Data Lab
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SecAnnualDiv { year: number; totalDividend: number; growthPercent: number | null; quarters: any[] }
interface SecQuarterlyDiv { endDate: string; amount: number; fiscalQuarter: string; calendarYear: number }
interface SecCAGR { period: string; years: number; cagr: number; startValue: number; endValue: number }
interface SecPayout { year: number; dividendPerShare: number; eps: number; payoutRatio: number }
interface SecDivResponse {
  ticker: string; entityName: string
  quarterlyDividends: SecQuarterlyDiv[]
  annualDividends: SecAnnualDiv[]
  currentAnnualDividend: number | null
  consecutiveYearsGrowth: number
  cagr: SecCAGR[]
  payoutHistory: SecPayout[]
}
interface FmpDivResponse { [year: string]: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
}

const QUICK_TICKERS = ['AAPL', 'MSFT', 'JNJ', 'KO', 'PG', 'V', 'MA', 'NVDA', 'JPM', 'AMZN']

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-theme-card rounded-lg p-4">
      <p className="text-xs text-theme-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-theme-primary">{value}</p>
      {sub && <p className="text-xs text-theme-secondary mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SecDividendsPage() {
  const params = useParams()
  const router = useRouter()
  const ticker = (params.ticker as string)?.toUpperCase() || 'MSFT'

  const [secData, setSecData] = useState<SecDivResponse | null>(null)
  const [fmpData, setFmpData] = useState<FmpDivResponse>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([
      fetch(`/api/sec/dividends/${ticker}`).then(r => r.json()),
      fetch(`/api/dividends/${ticker}`).then(r => r.json()).catch(() => ({})),
    ])
      .then(([sec, fmp]) => {
        if (sec.error) {
          setError(sec.error)
          setSecData(null)
        } else {
          setSecData(sec)
        }
        // FMP liefert { historical: { "2024": 0.98, ... }, ... }
        setFmpData(fmp.historical || {})
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [ticker])

  // Merge SEC + FMP annual data for comparison chart
  const comparisonData = secData?.annualDividends.map(a => ({
    year: a.year.toString(),
    sec: Math.round(a.totalDividend * 1000) / 1000,
    fmp: fmpData[a.year.toString()] ? Math.round(fmpData[a.year.toString()] * 1000) / 1000 : null,
    quarters: a.quarters.length,
    growth: a.growthPercent,
  })) || []

  // Quarterly timeline
  const quarterlyData = secData?.quarterlyDividends.map(q => ({
    label: `${q.fiscalQuarter} ${q.calendarYear}`,
    amount: q.amount,
    endDate: q.endDate,
  })) || []

  return (
    <div className="min-h-screen bg-theme-bg p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-theme-primary">SEC Dividend Lab</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">Beta</span>
        </div>
        <p className="text-sm text-theme-secondary">
          Dividenden-Analyse direkt aus SEC XBRL Filings – verglichen mit FMP.
        </p>
      </div>

      {/* Ticker Buttons */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {QUICK_TICKERS.map(t => (
          <button
            key={t}
            onClick={() => router.push(`/analyse/sec-dividends/${t}`)}
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

      {!loading && secData && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KPICard
              label="Jahresdividende"
              value={secData.currentAnnualDividend ? `$${secData.currentAnnualDividend.toFixed(2)}` : '–'}
              sub={`${secData.annualDividends[secData.annualDividends.length - 1]?.quarters.length || 0} Quartale`}
            />
            <KPICard
              label="Steigerung in Folge"
              value={`${secData.consecutiveYearsGrowth} Jahre`}
            />
            <KPICard
              label="CAGR (5J)"
              value={secData.cagr.find(c => c.years === 5)
                ? `${secData.cagr.find(c => c.years === 5)!.cagr.toFixed(1)}%`
                : '–'}
            />
            <KPICard
              label="Payout Ratio"
              value={secData.payoutHistory.length > 0
                ? `${secData.payoutHistory[secData.payoutHistory.length - 1].payoutRatio.toFixed(1)}%`
                : '–'}
              sub={secData.payoutHistory.length > 0
                ? `EPS: $${secData.payoutHistory[secData.payoutHistory.length - 1].eps.toFixed(2)}`
                : undefined}
            />
          </div>

          {/* Annual Dividend Comparison Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-theme-card rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-theme-primary">Dividende/Aktie (jährlich)</h3>
                <div className="flex gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-500" />
                    <span className="text-theme-muted">SEC</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-orange-500 opacity-70" />
                    <span className="text-theme-muted">FMP</span>
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 10, right: 10, bottom: 25, left: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" horizontal vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} />
                    <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} width={35} />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const sec = payload.find(p => p.dataKey === 'sec')?.value as number | undefined
                        const fmp = payload.find(p => p.dataKey === 'fmp')?.value as number | undefined
                        const row = comparisonData.find(d => d.year === label)
                        return (
                          <div style={tooltipStyle}>
                            <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>{label}</p>
                            <p style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 600 }}>
                              SEC: {sec != null ? `$${sec.toFixed(4)}` : '–'}
                            </p>
                            <p style={{ color: '#f97316', fontSize: '13px', fontWeight: 600 }}>
                              FMP: {fmp != null ? `$${fmp.toFixed(4)}` : '–'}
                            </p>
                            {row?.growth != null && (
                              <p style={{ fontSize: '11px', marginTop: '4px', color: row.growth >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                                {row.growth >= 0 ? '+' : ''}{row.growth.toFixed(1)}% gg. Vj.
                              </p>
                            )}
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="sec" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="fmp" fill="#f97316" radius={[2, 2, 0, 0]} opacity={0.7} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quarterly Timeline */}
            <div className="bg-theme-card rounded-lg p-5">
              <h3 className="text-sm font-semibold text-theme-primary mb-4">Quartalsdividenden (SEC)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quarterlyData.slice(-20)} margin={{ top: 10, right: 10, bottom: 25, left: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" horizontal vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} tickLine={false} interval={1} />
                    <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} width={35} />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div style={tooltipStyle}>
                            <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '3px' }}>{label}</p>
                            <p style={{ color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>${(payload[0].value as number).toFixed(4)}</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="amount" fill="#22c55e" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* CAGR + Payout Ratio */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* CAGR Table */}
            <div className="bg-theme-card rounded-lg p-5">
              <h3 className="text-sm font-semibold text-theme-primary mb-4">Dividendenwachstum (CAGR)</h3>
              {secData.cagr.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-theme-light">
                      <th className="text-left py-2 text-theme-muted">Zeitraum</th>
                      <th className="text-right py-2 text-theme-muted">CAGR</th>
                      <th className="text-right py-2 text-theme-muted">Start</th>
                      <th className="text-right py-2 text-theme-muted">Ende</th>
                    </tr>
                  </thead>
                  <tbody>
                    {secData.cagr.map(c => (
                      <tr key={c.period} className="border-b border-theme-light/30">
                        <td className="py-2 text-theme-secondary">{c.period}</td>
                        <td className={`py-2 text-right font-semibold ${c.cagr >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {c.cagr >= 0 ? '+' : ''}{c.cagr.toFixed(1)}%
                        </td>
                        <td className="py-2 text-right text-theme-secondary">${c.startValue.toFixed(2)}</td>
                        <td className="py-2 text-right text-theme-primary">${c.endValue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-theme-muted text-xs">Nicht genug Daten für CAGR</p>
              )}
            </div>

            {/* Payout Ratio Chart */}
            <div className="bg-theme-card rounded-lg p-5">
              <h3 className="text-sm font-semibold text-theme-primary mb-4">Payout Ratio (Dividende / EPS)</h3>
              {secData.payoutHistory.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={secData.payoutHistory} margin={{ top: 10, right: 10, bottom: 25, left: 35 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" horizontal vertical={false} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} tickLine={false} width={35} />
                      <Tooltip
                        cursor={false}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0].payload
                          return (
                            <div style={tooltipStyle}>
                              <p style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>{d.year}</p>
                              <p style={{ color: '#f1f5f9', fontSize: '13px', fontWeight: 600 }}>Payout: {d.payoutRatio.toFixed(1)}%</p>
                              <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                                Div: ${d.dividendPerShare.toFixed(2)} / EPS: ${d.eps.toFixed(2)}
                              </p>
                            </div>
                          )
                        }}
                      />
                      <Bar
                        dataKey="payoutRatio"
                        fill="#8b5cf6"
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-theme-muted text-xs">Keine Payout-Daten verfügbar</p>
              )}
            </div>
          </div>

          {/* Annual History Table */}
          <div className="bg-theme-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-theme-primary mb-4">Dividendenhistorie (Detail)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-light">
                    <th className="text-left py-2 text-theme-muted">Jahr</th>
                    <th className="text-right py-2 text-blue-400">SEC</th>
                    <th className="text-right py-2 text-orange-400">FMP</th>
                    <th className="text-right py-2 text-theme-muted">Wachstum</th>
                    <th className="text-right py-2 text-theme-muted">Quartale</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map(d => {
                    const diff = d.sec && d.fmp ? ((d.sec - d.fmp) / d.fmp) * 100 : null
                    return (
                      <tr key={d.year} className="border-b border-theme-light/30">
                        <td className="py-2 text-theme-secondary">{d.year}</td>
                        <td className="py-2 text-right text-theme-primary font-medium">${d.sec.toFixed(4)}</td>
                        <td className="py-2 text-right text-theme-primary">{d.fmp ? `$${d.fmp.toFixed(4)}` : '–'}</td>
                        <td className={`py-2 text-right font-medium ${
                          d.growth != null ? (d.growth >= 0 ? 'text-green-400' : 'text-red-400') : 'text-theme-muted'
                        }`}>
                          {d.growth != null ? `${d.growth >= 0 ? '+' : ''}${d.growth.toFixed(1)}%` : '–'}
                        </td>
                        <td className="py-2 text-right text-theme-muted">{d.quarters}Q</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Raw JSON */}
          <details className="mt-6">
            <summary className="text-xs text-theme-muted cursor-pointer hover:text-theme-secondary">
              Raw SEC XBRL Response
            </summary>
            <pre className="mt-2 bg-theme-card rounded-lg p-4 text-xs text-theme-secondary overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(secData, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
