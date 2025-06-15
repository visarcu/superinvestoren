// src/components/FinancialAnalysisClient.tsx
'use client'

import React, { useState, useEffect } from 'react'
import GrowthTooltip from './GrowthTooltip'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts'
import { ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Card from '@/components/Card'
import LoadingSpinner from '@/components/LoadingSpinner'

// ─── Typdefinitionen ───────────────────────────────────────────────────────────
type MetricKey =
  | 'revenue'
  | 'ebitda'
  | 'eps'
  | 'freeCashFlow'
  | 'dividendPS'
  | 'sharesOutstanding'
  | 'netIncome'
  | 'cashDebt'
  | 'pe'
  | 'returnOnEquity'
  | 'stockAward'
  | 'capEx'
  | 'researchAndDevelopment'
  | 'operatingIncome' 

type ChartKey = MetricKey

// ✅ Props Interface (vereinfacht)
interface Props {
  ticker: string
  isPremium?: boolean
  userId?: string
}

// ─── Konstante Daten (Farben, Tooltips etc.) ─────────────────────────────────
const TOOLTIP_STYLES = {
  wrapperStyle: { backgroundColor: 'rgba(55,65,81,0.95)', borderColor: '#4B5563' },
  contentStyle: { backgroundColor: 'rgba(55,65,81,0.95)' },
  labelStyle: { color: '#F3F4F6' },
  itemStyle: { color: '#FFFFFF' },
}

const METRICS: {
  key: Exclude<MetricKey, 'cashDebt' | 'pe' | 'capEx'>
  name: string
  stroke: string
  fill: string
}[] = [
  { key: 'revenue', name: 'Umsatz (Mio.)', stroke: '#3b82f6', fill: 'rgba(59,130,246,0.8)' },
  { key: 'ebitda', name: 'EBITDA (Mio.)', stroke: '#10b981', fill: 'rgba(16,185,129,0.8)' },
  { key: 'eps', name: 'Gewinn je Aktie', stroke: '#f59e0b', fill: 'rgba(245,158,11,0.8)' },
  { key: 'freeCashFlow', name: 'Free Cashflow (Mio.)', stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.8)' },
  { key: 'dividendPS', name: 'Dividende je Aktie', stroke: '#22d3ee', fill: 'rgba(34,211,238,0.8)' },
  { key: 'sharesOutstanding', name: 'Shares Out. (Mrd)', stroke: '#eab308', fill: 'rgba(234,179,8,0.8)' },
  { key: 'netIncome', name: 'Nettogewinn (Mio.)', stroke: '#efb300', fill: 'rgba(239,179,0,0.8)' },
  { key: 'returnOnEquity', name: 'ROE', stroke: '#f472b6', fill: 'rgba(244,114,182,0.8)' },
]

const CASH_INFO = { dataKey: 'cash', name: 'Cash', stroke: '#6366f1', fill: 'rgba(99,102,241,0.8)' }
const DEBT_INFO = { dataKey: 'debt', name: 'Debt', stroke: '#ef4444', fill: 'rgba(239,68,68,0.8)' }

// ─── Component ────────────────────────────────────────────────────────────────
export default function FinancialAnalysisClient({ 
  ticker, 
  isPremium = false, 
  userId 
}: Props){
  
  // ✅ Entfernt: Auth-State und Session-Loading
  // Das Layout stellt bereits sicher, dass User eingeloggt ist
  
  const [years, setYears] = useState<number>(10)
  const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual')
  const [data, setData] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState<boolean>(true)
  const [fullscreen, setFullscreen] = useState<ChartKey | null>(null)
  const ALL_KEYS: ChartKey[] = [...METRICS.map((m) => m.key), 'cashDebt', 'pe', 'capEx', 'researchAndDevelopment', 'operatingIncome']
  const [visible, setVisible] = useState<ChartKey[]>(ALL_KEYS)

  // ─── Daten von API laden ─────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingData(true)
    const limit = period === 'annual' ? years : years * 4

    const ratioUrl = `https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=${period}&limit=${limit}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
    const sharesFloatUrl = `https://financialmodelingprep.com/api/v3/historical-share-float/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`

    Promise.all([
      fetch(`/api/financials/${ticker.toUpperCase()}?period=${period}&limit=${limit}`),
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`),
      fetch(ratioUrl),
      fetch(sharesFloatUrl).catch(() => null),
    ])
      .then(async ([rFin, rDiv, rPrice, rRatio, rSharesFloat]) => {
        const [jsonFin, jsonDiv, jsonPrice, jsonRatios] = await Promise.all([
          rFin.json(),
          rDiv.json(),
          rPrice.json(),
          rRatio.json(),
        ])

        // Historical Share Float API für korrekte Shares Outstanding
        let jsonSharesFloat = null
        if (rSharesFloat && rSharesFloat.ok) {
          jsonSharesFloat = await rSharesFloat.json()
          console.log('✅ Historical Share Float API loaded:', jsonSharesFloat?.slice(0, 3))
        } else {
          console.log('❌ Historical Share Float API failed, using Income Statement fallback')
        }

        console.log('🎯 Your API returned:', jsonFin.data?.slice(0, 2))

        const arr: any[] = jsonFin.data || []

        // Dividenden aufs Jahr aggregieren
        const histDiv = Array.isArray(jsonDiv[0]?.historical)
          ? jsonDiv[0].historical
          : Array.isArray((jsonDiv as any).historical)
          ? (jsonDiv as any).historical
          : []
        const annualDiv: Record<string, number> = {}
        histDiv.forEach((d: any) => {
          const y = d.date.slice(0, 4)
          annualDiv[y] = (annualDiv[y] || 0) + (d.adjDividend || 0)
        })

        // Kurse pro Periode (für P/E Berechnung)
        const histPrice = Array.isArray(jsonPrice.historical) ? jsonPrice.historical : []
        const priceByPeriod: Record<string, number> = {}
        histPrice.forEach((p: any) => {
          const key = period === 'annual' ? p.date.slice(0, 4) : p.date.slice(0, 7)
          priceByPeriod[key] = p.close
        })

        // ROE aus Ratios
        const roeArr: any[] = Array.isArray(jsonRatios) ? jsonRatios : []
        const roeByPeriod: Record<string, number | null> = {}
        roeArr.forEach((r) => {
          const key = period === 'annual' ? r.date.slice(0, 4) : r.date.slice(0, 7)
          roeByPeriod[key] = r.returnOnEquity != null ? r.returnOnEquity : null
        })

        // Shares Outstanding Processing
        const sharesByPeriod: Record<string, number> = {}
        
        if (jsonSharesFloat && Array.isArray(jsonSharesFloat) && jsonSharesFloat.length > 0) {
          console.log('✅ Using Historical Share Float API for shares outstanding')
          jsonSharesFloat.forEach((s) => {
            const year = s.date.slice(0, 4)
            const quarter = s.date.slice(0, 7)
            
            if (period === 'annual') {
              if (!sharesByPeriod[year] || s.date > sharesByPeriod[year + '_date']) {
                sharesByPeriod[year] = s.outstandingShares
                sharesByPeriod[year + '_date'] = s.date
              }
            } else {
              if (!sharesByPeriod[quarter] || s.date > sharesByPeriod[quarter + '_date']) {
                sharesByPeriod[quarter] = s.outstandingShares
                sharesByPeriod[quarter + '_date'] = s.date
              }
            }
          })
        } else {
          console.log('⚠️ Using Income Statement fallback for shares outstanding')
        }

        // Daten sortieren
        arr.sort((a, b) =>
          period === 'annual'
            ? (a.year || 0) - (b.year || 0)
            : new Date(a.quarter).getTime() - new Date(b.quarter).getTime()
        )

        // Zusammenbauen
        const base = arr.map((row) => {
          const label = period === 'annual' ? String(row.year) : row.quarter
          const out: any = {
            label,
            revenue: row.revenue || 0,
            ebitda: row.ebitda || 0,
            eps: row.eps || 0,
            freeCashFlow: row.freeCashFlow || 0,
            cash: row.cash || 0,
            debt: row.debt || 0,
            netIncome: row.netIncome || 0,
            capEx: row.capEx || 0,
            researchAndDevelopment: row.researchAndDevelopment || 0,
            operatingIncome: row.operatingIncome || 0,
            
            // Shares Outstanding mit korrekten Daten
            sharesOutstanding: (() => {
              const correctShares = sharesByPeriod[label]
              const fallbackShares = row.sharesOutstanding || 0
              
              if (correctShares) {
                return correctShares
              } else {
                return fallbackShares
              }
            })(),
            
            dividendPS: annualDiv[label] ?? 0,
            returnOnEquity: roeByPeriod[label] ?? null,
          }
          
          // P/E Ratio berechnen
          const price = priceByPeriod[label] ?? null
          out.pe = price != null && row.eps ? price / row.eps : null
          
          return out
        })

        // Wachstum berechnen
        const withGrowth = base.map((row, idx, all) => {
          const out: any = { ...row }
          ;['revenue', 'ebitda', 'eps', 'freeCashFlow', 'sharesOutstanding', 'dividendPS', 'pe', 'netIncome', 'returnOnEquity', 'capEx', 'researchAndDevelopment', 'operatingIncome'].forEach(
            (k: any) => {
              const prev = idx > 0 ? all[idx - 1][k] : null
              out[`${k}GrowthPct`] =
                prev != null && typeof row[k] === 'number' && prev !== 0
                  ? ((row[k] - prev) / prev) * 100
                  : null
            }
          )
          return out
        })

        setData(withGrowth)
      })
      .catch((e) => {
        console.error('[FinancialAnalysisClient] Fetch-Error:', e)
      })
      .finally(() => {
        setLoadingData(false)
      })
  }, [ticker, period, years])

  // ✅ Loading State vereinfacht
  if (loadingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // ─── Premium-Check für Controls ──────────────────────────────────────────────
  const handlePremiumAction = (action: () => void) => {
    if (!isPremium) {
      window.location.href = '/pricing'
    } else {
      action()
    }
  }

  return (
    <div className="space-y-6">
      {/* Zeitraum / Periode Controls */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4 text-gray-100">
          <span>Zeitraum:</span>
          {[5, 10, 15, 20].map((y) => (
            <button
              key={y}
              onClick={() => handlePremiumAction(() => setYears(y))}
              className={`px-2 py-1 rounded ${
                years === y ? 'bg-blue-600 text-white' : 'bg-gray-700'
              }`}
            >
              {y} J
            </button>
          ))}

          <span className="ml-6">Periode:</span>
          {(['annual', 'quarterly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePremiumAction(() => setPeriod(p))}
              className={`px-3 py-1 rounded ${
                period === p ? 'bg-blue-600 text-white' : 'bg-gray-500'
              }`}
            >
              {p === 'annual' ? 'Jährlich' : 'Quartalsweise'}
            </button>
          ))}
        </div>

        {/* Checkbox-Filter */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ALL_KEYS.map((key) => (
            <label key={key} className="inline-flex items-center space-x-2 text-gray-200">
              <input
                type="checkbox"
                checked={visible.includes(key)}
                onChange={() => handlePremiumAction(() => {
                  setVisible((v) =>
                    v.includes(key) ? v.filter((x) => x !== key) : [...v, key]
                  )
                })}
                className="form-checkbox h-5 w-5 text-green-500"
              />
              <span className="text-sm">
                {key === 'cashDebt'
                  ? 'Cash & Debt'
                  : key === 'pe'
                  ? 'KGV TTM'
                  : key === 'capEx'
                  ? 'CapEx (Mio.)'
                  : key === 'researchAndDevelopment'
                  ? 'R&D (Mio.)'
                  : key === 'operatingIncome'         
                  ? 'Operating Income (Mio.)'
                  : METRICS.find((m) => m.key === key)?.name || key}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {visible.map((key) => {
          // Cash & Debt Chart
          if (key === 'cashDebt') {
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">Cash &amp; Debt</h3>
                  <button onClick={() => setFullscreen('cashDebt')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)} Mrd`} domain={[0, 'dataMax']} stroke="#888" />
                    {fullscreen === 'cashDebt' ? (
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} />
                    ) : (
                      <RechartsTooltip
                        formatter={(v: any, n: string) => [
                          `${(v as number / 1e3).toFixed(2)} Mrd`,
                          n,
                        ]}
                        {...TOOLTIP_STYLES}
                      />
                    )}
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="cash" name="Cash" fill={CASH_INFO.fill} />
                    <Bar dataKey="debt" name="Debt" fill={DEBT_INFO.fill} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }

          // CapEx Chart
          if (key === 'capEx') {
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">CapEx (Mio.)</h3>
                  <button onClick={() => setFullscreen('capEx')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis 
                      tickFormatter={(v) => `${(v / 1e3).toFixed(0)} Mrd`} 
                      domain={[0, 'dataMax']} 
                      stroke="#888" 
                    />
                    <RechartsTooltip
                      formatter={(v: any, n: string) => [
                        `${(v as number / 1e3).toFixed(2)} Mrd`,
                        n,
                      ]}
                      {...TOOLTIP_STYLES}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="capEx" name="CapEx (Mio.)" fill="rgba(6,182,212,0.8)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }

          // R&D Chart
          if (key === 'researchAndDevelopment') {
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">R&D Ausgaben (Mrd)</h3>
                  <button onClick={() => setFullscreen('researchAndDevelopment')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis 
                      tickFormatter={(v) => `${(v / 1e3).toFixed(1)} Mrd`}
                      domain={[0, 'dataMax']} 
                      stroke="#888" 
                    />
                    <RechartsTooltip
                      formatter={(v: number) => [`${(v / 1e3).toFixed(1)} Mrd`, 'R&D']}
                      {...TOOLTIP_STYLES}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="researchAndDevelopment" name="R&D Ausgaben" fill="rgba(6,182,212,0.8)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }
          
          // Operating Income Chart
          if (key === 'operatingIncome') {
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">Operating Income (Mrd)</h3>
                  <button onClick={() => setFullscreen('operatingIncome')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis 
                      tickFormatter={(v) => `${(v / 1e3).toFixed(1)} Mrd`}
                      domain={['dataMin', 'dataMax']}
                      stroke="#888" 
                    />
                    <RechartsTooltip
                      formatter={(v: number) => [`${(v / 1e3).toFixed(1)} Mrd`, 'Operating Income']}
                      {...TOOLTIP_STYLES}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="operatingIncome" name="Operating Income" fill="rgba(132,204,22,0.8)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }

          // P/E Ratio Chart
          if (key === 'pe') {
            const avg = data.reduce((sum, r) => sum + (r.pe || 0), 0) / (data.length || 1)
            return (
              <Card key="pe" className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">KGV TTM</h3>
                  <button onClick={() => setFullscreen('pe')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis stroke="#888" />
                    <ReferenceLine
                      y={avg}
                      stroke="#888"
                      strokeDasharray="3 3"
                      label={{ value: `Ø ${avg.toFixed(1)}`, position: 'insideTop', fill: '#888' }}
                    />
                    <Line type="monotone" dataKey="pe" stroke="#f87171" dot />
                    <RechartsTooltip {...TOOLTIP_STYLES} formatter={(v: number) => [v.toFixed(2), 'KGV TTM']} />
                    <Legend verticalAlign="top" height={36} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )
          }

          // Net Income Chart
          if (key === 'netIncome') {
            return (
              <Card key="netIncome" className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">Nettogewinn (Mrd)</h3>
                  <button onClick={() => setFullscreen('netIncome')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" stroke="#888" />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1e3).toFixed(1)} Mrd`}
                      domain={['dataMin', 'dataMax']}
                      stroke="#888"
                    />
                    <RechartsTooltip
                      formatter={(v: number) => [`${(v / 1e3).toFixed(1)} Mrd`, 'Nettogewinn']}
                      {...TOOLTIP_STYLES}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="netIncome" name="Nettogewinn (Mrd)" fill="#efb300" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }

          // Dividende je Aktie
          if (key === 'dividendPS') {
            const hasDividends = data.some((row) => row.dividendPS > 0)
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2 text-gray-200">
                  <h3 className="font-semibold">Dividende je Aktie</h3>
                  <button onClick={() => setFullscreen('dividendPS')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {!hasDividends ? (
                  <div className="h-56 flex items-center justify-center text-gray-400 italic">
                    Keine Dividenden in diesem Zeitraum.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis
                        tickFormatter={(v: number) =>
                          v.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          })
                        }
                        domain={[0, 'dataMax']}
                        stroke="#888"
                      />
                      <RechartsTooltip
                        formatter={(v: any, n: string) => [
                          (v as number).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }),
                          n,
                        ]}
                        {...TOOLTIP_STYLES}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="dividendPS" name="Dividende je Aktie" fill="rgba(34,211,238,0.8)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )
          }

          // Alle anderen METRICS
          const m = METRICS.find((mt) => mt.key === key)
          if (!m) {
            console.warn(`Metric not found for key: ${key}`)
            return null
          }
          return (
            <Card key={key} className="p-4">
              <div className="flex justify-between items-center mb-2 text-gray-200">
                <h3 className="font-semibold">{m.name}</h3>
                <button onClick={() => setFullscreen(key)}>
                  <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data}>
                  <XAxis dataKey="label" stroke="#888" />
                  <YAxis
                    tickFormatter={(v: number) => {
                      if (key === 'returnOnEquity') {
                        return `${(v * 100).toFixed(1)} %`
                      } else if (key === 'eps') {
                        return v.toLocaleString('de-DE', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                        })
                      } else if (key === 'sharesOutstanding') {
                        return `${(v / 1e9).toFixed(2)} Mrd`
                      }
                      return `${(v / 1e3).toFixed(0)} Mrd`
                    }}
                    domain={
                      key === 'returnOnEquity' || key === 'eps'
                        ? ['dataMin', 'dataMax']
                        : [0, 'dataMax']
                    }
                    stroke="#888"
                  />
                  <RechartsTooltip
                    formatter={(v: any, n: string) => {
                      if (key === 'returnOnEquity') {
                        return [`${((v as number) * 100).toFixed(1)} %`, n]
                      } else if (key === 'eps') {
                        return [
                          (v as number).toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 2,
                          }),
                          n,
                        ]
                      } else if (key === 'sharesOutstanding') {
                        return [`${((v as number) / 1e9).toFixed(3)} Mrd Aktien`, n]
                      }
                      return [`${((v as number) / 1e3).toFixed(2)} Mrd`, n]
                    }}
                    {...TOOLTIP_STYLES}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey={key} name={m.name} fill={m.fill} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )
        })}
      </div>

      {/* Vollbild Modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card-dark rounded-lg shadow p-6 max-w-[60vw] max-h-[60vh] w-[60vw] h-[60vh] overflow-auto relative">
            <button
              onClick={() => setFullscreen(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
              aria-label="Vollbild schließen"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                if (fullscreen === 'cashDebt') {
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)} Mrd`} domain={[0, 'dataMax']} stroke="#888" />
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="cash" name="Cash" fill={CASH_INFO.fill} />
                      <Bar dataKey="debt" name="Debt" fill={DEBT_INFO.fill} />
                    </BarChart>
                  )
                } else if (fullscreen === 'capEx') {
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(0)} Mrd`} domain={[0, 'dataMax']} stroke="#888" />
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="capEx" name="CapEx (Mio.)" fill="rgba(6,182,212,0.8)" />
                    </BarChart>
                  )
                } else if (fullscreen === 'researchAndDevelopment') {
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(1)} Mrd`} domain={[0, 'dataMax']} stroke="#888" />
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="researchAndDevelopment" name="R&D Ausgaben" fill="rgba(6,182,212,0.8)" />
                    </BarChart>
                  )
                } else if (fullscreen === 'operatingIncome') {
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis tickFormatter={(v) => `${(v / 1e3).toFixed(1)} Mrd`} domain={['dataMin', 'dataMax']} stroke="#888" />
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="operatingIncome" name="Operating Income" fill="rgba(132,204,22,0.8)" />
                    </BarChart>
                  )
                } else if (fullscreen === 'pe') {
                  const avg = data.reduce((sum, r) => sum + (r.pe || 0), 0) / (data.length || 1)
                  return (
                    <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis stroke="#888" />
                      <ReferenceLine
                        y={avg}
                        stroke="#888"
                        strokeDasharray="3 3"
                        label={{ value: `Ø ${avg.toFixed(1)}`, position: 'insideTop', fill: '#888' }}
                      />
                      <Line type="monotone" dataKey="pe" name="KGV TTM" stroke="#f87171" dot />
                      <RechartsTooltip {...TOOLTIP_STYLES} formatter={(v: number) => [v.toFixed(2), 'KGV TTM']} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                    </LineChart>
                  )
                } else {
                  return (
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" stroke="#888" />
                      <YAxis
                        tickFormatter={(v: number) => {
                          if (fullscreen === 'returnOnEquity') {
                            return `${(v * 100).toFixed(1)} %`
                          } else if (fullscreen === 'eps') {
                            return v.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 2,
                            })
                          } else if (fullscreen === 'sharesOutstanding') {
                            return `${(v / 1e9).toFixed(2)} Mrd`
                          }
                          return `${(v / 1e3).toFixed(0)} Mrd`
                        }}
                        domain={
                          fullscreen === 'returnOnEquity' || fullscreen === 'eps'
                            ? ['dataMin', 'dataMax']
                            : [0, 'dataMax']
                        }
                        stroke="#888"
                      />
                      <RechartsTooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar
                        dataKey={fullscreen}
                        name={METRICS.find((m) => m.key === fullscreen)?.name || fullscreen}
                        fill={METRICS.find((m) => m.key === fullscreen)?.fill || '#06b6d4'}
                      />
                    </BarChart>
                  )
                }
              })()}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}