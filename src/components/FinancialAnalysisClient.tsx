// src/components/FinancialAnalysisClient.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  Tooltip,
  Legend,
} from 'recharts'
import { ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Card from '@/components/Card'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ErrorBoundary } from 'react-error-boundary'
import ErrorFallback from '@/components/ErrorFallback'

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

type ChartKey = MetricKey

interface Props {
  ticker: string
}

const TOOLTIP_STYLES = {
  wrapperStyle: { backgroundColor: 'rgba(55,65,81,0.95)', borderColor: '#4B5563' },
  contentStyle: { backgroundColor: 'rgba(55,65,81,0.95)' },
  labelStyle: { color: '#F3F4F6' },
  itemStyle: { color: '#FFFFFF' },
}

const DARK_TOOLTIP = {
  wrapperStyle: { backgroundColor: 'rgba(55,65,81,0.95)', borderColor: '#4B5563' },
  contentStyle: { backgroundColor: 'rgba(55,65,81,0.95)' },
  labelStyle: { color: '#F3F4F6' },
  itemStyle: { color: '#FFFFFF' },
}

const LIGHT_TOOLTIP = {
  wrapperStyle: { backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)' },
  contentStyle: { backgroundColor: '#fff' },
  labelStyle: { color: '#000' },
  itemStyle: { color: '#000' },
  separator: '',
}

const METRICS: {
  key: Exclude<MetricKey, 'cashDebt' | 'pe'>
  name: string
  stroke: string
  fill: string
}[] = [
  { key: 'revenue', name: 'Umsatz (Mio.)', stroke: '#3b82f6', fill: 'rgba(59,130,246,0.8)' },
  { key: 'ebitda', name: 'EBITDA (Mio.)', stroke: '#10b981', fill: 'rgba(16,185,129,0.8)' },
  { key: 'eps', name: 'Gewinn je Aktie', stroke: '#f59e0b', fill: 'rgba(245,158,11,0.8)' },
  { key: 'freeCashFlow', name: 'Free Cashflow (Mio.)', stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.8)' },
  { key: 'dividendPS', name: 'Dividende je Aktie', stroke: '#22d3ee', fill: 'rgba(34,211,238,0.8)' },
  { key: 'sharesOutstanding', name: 'Shares Out. (Stück)', stroke: '#eab308', fill: 'rgba(234,179,8,0.8)' },
  { key: 'netIncome', name: 'Nettogewinn (Mio.)', stroke: '#efb300', fill: 'rgba(239,179,0,0.8)' },
  { key: 'returnOnEquity', name: 'ROE', stroke: '#f472b6', fill: 'rgba(244,114,182,0.8)' },
  
]

const CASH_INFO = { dataKey: 'cash', name: 'Cash', stroke: '#6366f1', fill: 'rgba(99,102,241,0.8)' }
const DEBT_INFO = { dataKey: 'debt', name: 'Debt', stroke: '#ef4444', fill: 'rgba(239,68,68,0.8)' }

export default function FinancialAnalysisClient({ ticker }: Props) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const userHasPremium = !!session?.user?.isPremium

  const [years, setYears] = useState<number>(10)
  const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [fullscreen, setFullscreen] = useState<ChartKey | null>(null)

  const ALL_KEYS: ChartKey[] = [...METRICS.map((m) => m.key), 'cashDebt', 'pe']
  const [visible, setVisible] = useState<ChartKey[]>(ALL_KEYS)

  const yFmt = (v: number) => `${(v / 1e3).toFixed(0)} Mrd`

  function requirePremium(fn: () => void) {
    if (!userHasPremium) {
      router.push('/pricing')
    } else {
      fn()
    }
  }

  useEffect(() => {
    setLoading(true)
    const limit = period === 'annual' ? years : years * 4

    // Ratio-URL erst NACH period & limit definieren:
    const ratioUrl = `https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=${period}&limit=${limit}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`

    Promise.all([
      fetch(`/api/financials/${ticker.toUpperCase()}?period=${period}&limit=${limit}`),
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=${period}&limit=${limit}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`),
      fetch(ratioUrl),
    ])
      .then(async ([rFin, rDiv, rPrice, rCash, rRatio]) => {
        const [jsonFin, jsonDiv, jsonPrice, jsonCash, jsonRatios] = await Promise.all([
          rFin.json(),
          rDiv.json(),
          rPrice.json(),
          rCash.json(),
          rRatio.json(),
        ])

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

        // Kurse pro Periode
        const histPrice = Array.isArray(jsonPrice.historical) ? jsonPrice.historical : []
        const priceByPeriod: Record<string, number> = {}
        histPrice.forEach((p: any) => {
          const key = period === 'annual' ? p.date.slice(0, 4) : p.date.slice(0, 7)
          priceByPeriod[key] = p.close
        })

        // Net Income Mapping
        const cfArr: any[] = Array.isArray(jsonCash)
          ? jsonCash
          : Array.isArray((jsonCash as any).financials)
          ? (jsonCash as any).financials
          : []
        const netIncomeByPeriod: Record<string, number> = {}
        cfArr.forEach((c) => {
          const key = period === 'annual' ? c.date.slice(0, 4) : c.date.slice(0, 7)
          netIncomeByPeriod[key] = c.netIncome ?? 0
        })

        // ROE Mapping aus jsonRatios
        const roeArr: any[] = Array.isArray(jsonRatios) ? jsonRatios : []
        const roeByPeriod: Record<string, number | null> = {}
        roeArr.forEach((r) => {
          const key = period === 'annual' ? r.date.slice(0, 4) : r.date.slice(0, 7)
          // r.returnOnEquity könnte null oder undefined sein
          roeByPeriod[key] = r.returnOnEquity != null ? r.returnOnEquity : null
        })

        // sortieren
        arr.sort((a, b) =>
          period === 'annual'
            ? (a.year || 0) - (b.year || 0)
            : new Date(a.quarter).getTime() - new Date(b.quarter).getTime()
        )

        // zusammenbauen
        const base = arr.map((row) => {
          const label = period === 'annual' ? String(row.year) : row.quarter
          const out: any = {
            label,
            cash: row.cash || 0,
            debt: row.debt || 0,
            netIncome: netIncomeByPeriod[label] || 0,
            ...row,
          }
          out.dividendPS = annualDiv[label] ?? 0
          const price = priceByPeriod[label] ?? null
          out.pe = price != null && row.eps ? price / row.eps : null
          out.returnOnEquity = roeByPeriod[label] ?? null
          return out
        })

        // Wachstum berechnen (inkl. returnOnEquity durch METRICS-Key-Liste)
        const withGrowth = base.map((row, idx, all) => {
          const out: any = { ...row }
          ;[...METRICS.map((m) => m.key), 'dividendPS', 'pe', 'netIncome'].forEach(
            (k: any) => {
              const prev = idx > 0 ? all[idx - 1][k] : null
              out[`${k}GrowthPct`] =
                prev != null && typeof row[k] === 'number'
                  ? ((row[k] - prev) / prev) * 100
                  : null
            }
          )
          return out
        })

        setData(withGrowth)
      })
      .finally(() => setLoading(false))
  }, [ticker, period, years])

  if (status === 'loading' || loading) return <LoadingSpinner />

  if (!session) {
    return (
      <div className="p-8 text-center">
        <p>
          Bitte{' '}
          <button
            onClick={() => router.push('/auth/signin')}
            className="text-accent underline"
          >
            anmelden
          </button>{' '}
          um die Finanzanalyse zu sehen.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Zeitraum / Periode */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span>Zeitraum:</span>
          {[5, 10, 15, 20].map((y) => (
            <button
              key={y}
              onClick={() => requirePremium(() => setYears(y))}
              className={`px-2 py-1 rounded ${
                years === y ? 'bg-blue-600 text-white' : 'bg-gray-700'
              }`}
            >
              {y} J
            </button>
          ))}

          <span className="ml-6">Periode:</span>
          {(['annual', 'quarterly'] as const).map((p) => (
            <button
              key={p}
              onClick={() => requirePremium(() => setPeriod(p))}
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
            <label key={key} className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={visible.includes(key)}
                onChange={() =>
                  requirePremium(() =>
                    setVisible((v) =>
                      v.includes(key) ? v.filter((x) => x !== key) : [...v, key]
                    )
                  )
                }
                className="form-checkbox h-5 w-5 text-green-500"
              />
              <span className="text-sm">
                {key === 'cashDebt'
                  ? 'Cash & Debt'
                  : key === 'pe'
                  ? 'KGV TTM'
                  : METRICS.find((m) => m.key === key)!.name}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {visible.map((key) => {
          // Cash & Debt
          if (key === 'cashDebt') {
            return (
              <Card key={key} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Cash &amp; Debt</h3>
                  <button onClick={() => setFullscreen('cashDebt')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={yFmt} />
                    {fullscreen === 'cashDebt' ? (
                      <Tooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} />
                    ) : (
                      <Tooltip
                        formatter={(v: any, n: string) => [
                          `${(v / 1e3).toFixed(2)} Mrd`,
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

          // KGV TTM
          if (key === 'pe') {
            const avg = data.reduce((sum, r) => sum + (r.pe || 0), 0) / data.length
            return (
              <Card key="pe" className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">KGV TTM</h3>
                  <button onClick={() => setFullscreen('pe')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <ReferenceLine
                      y={avg}
                      stroke="#888"
                      strokeDasharray="3 3"
                      label={{ value: `Ø ${avg.toFixed(1)}`, position: 'insideTop', fill: '#888' }}
                    />
                    <Line type="monotone" dataKey="pe" stroke="#f87171" dot />
                    <Tooltip {...TOOLTIP_STYLES} formatter={(v: number) => [v.toFixed(2), 'KGV TTM']} />
                    <Legend verticalAlign="top" height={36} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )
          }

          if (key === 'netIncome') {
            return (
              <Card key="netIncome" className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Reingewinn (Mio.)</h3>
                  <button onClick={() => setFullscreen('netIncome')}>
                  <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600"/>
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label" />
                    <YAxis
                      // v ist in USD, wir wollen Mio. => v/1e6
                      tickFormatter={v => `${(v/1e6).toLocaleString('de-DE')} Mio.`}
                      domain={['dataMin','dataMax']}
                    />
                    <Tooltip
                      {...TOOLTIP_STYLES}
                      formatter={(v:number) => [
                        `${(v/1e6).toLocaleString('de-DE')} Mio.`,
                        'Reingewinn'
                      ]}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar
                      dataKey="netIncome"
                      name="Reingewinn (Mio.)"
                      fill="#efb300"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )
          }
       // → Dividende je Aktie
  if (key === 'dividendPS') {
    // prüfen, ob im Zeitraum überhaupt etwas > 0 ausgezahlt wurde
    const hasDividends = data.some(row => row.dividendPS > 0)
    return (
      <Card key={key} className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold">Dividende je Aktie</h3>
          <button onClick={() => setFullscreen('dividendPS')}>
            <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600"/>
          </button>
        </div>

        { !hasDividends ? (
          <div className="h-56 flex items-center justify-center text-gray-400 italic">
            Keine Dividenden in diesem Zeitraum.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <XAxis dataKey="label" />
              <YAxis
                tickFormatter={(v:number)=>v.toLocaleString('de-DE',{ style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}
                domain={['dataMin','dataMax']}
              />
              <Tooltip
                {...TOOLTIP_STYLES}
                formatter={(v:any,n:string)=>[
                  (v as number).toLocaleString('de-DE',{ style: 'currency', currency: 'USD', minimumFractionDigits: 2 }),
                  n
                ]}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="dividendPS" name="Dividende je Aktie" fill="rgba(34,211,238,0.8)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    )
  }

        {/* → alle anderen Bar-Charts inkl. ROE */}
const m = METRICS.find(m => m.key === key)!
return (
  <Card key={key} className="p-4">
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-semibold">{m.name}</h3>
      <button onClick={() => setFullscreen(key)}>
        <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600"/>
      </button>
    </div>
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <XAxis dataKey="label" />
        <YAxis
          // FORMATIERUNG SONDERN: für ROE Prozent, für eps/dividend Currency, sonst Mrd
          tickFormatter={(v:number) => {
            if (key === 'returnOnEquity') {
              return `${(v * 100).toFixed(1)} %`
            } else if (key === 'eps') {
              return v.toLocaleString('de-DE', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
              })
            }
            return yFmt(v)
          }}
          // Domain für ROE auch auf dataMin/dataMax setzen, sonst auto
          domain={
               key === 'returnOnEquity' || key === 'eps'
                 ? ['dataMin','dataMax']
                 : undefined
             }
        />
        <Tooltip
          {...TOOLTIP_STYLES}
          formatter={(v:any,n:string)=>{
            if (key === 'returnOnEquity') {
              return [`${((v as number)*100).toFixed(1)} %`, n]
            } else if (key === 'eps') {
              return [
                (v as number).toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2
                }),
                n
              ]
            }
            return [`${((v as number)/1e3).toFixed(2)} Mrd`, n]
          }}
        />
        <Legend verticalAlign="top" height={36}/>
        <Bar dataKey={key} name={m.name} fill={m.fill}/>
      </BarChart>
    </ResponsiveContainer>
  </Card>
)
        })}
      </div>

      {/* Vollbild-Modal */}
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
        // ─── Cash & Debt Vollbild ─────────────────────────
        return (
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <XAxis dataKey="label" />
            <YAxis tickFormatter={yFmt} />
            <Tooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false}/>
            <Legend verticalAlign="top" height={36}/>
            <Bar dataKey="cash" name="Cash" fill={CASH_INFO.fill}/>
            <Bar dataKey="debt" name="Debt" fill={DEBT_INFO.fill}/>
          </BarChart>
        )
      } else if (fullscreen === 'pe') {
        // ─── KGV TTM Vollbild ──────────────────────────────
        const avg = data.reduce((sum, r) => sum + (r.pe || 0), 0) / data.length
        return (
          <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <XAxis dataKey="label" />
            <YAxis />
            <ReferenceLine
              y={avg}
              stroke="#888"
              strokeDasharray="3 3"
              label={{ value: `Ø ${avg.toFixed(1)}`, position: 'insideTop', fill: '#888'}}
            />
            <Line type="monotone" dataKey="pe" name="KGV TTM" stroke="#f87171" dot />
            <Tooltip {...TOOLTIP_STYLES} formatter={(v: number) => [v.toFixed(2), 'KGV TTM']} cursor={false}/>
            <Legend verticalAlign="top" height={36}/>
          </LineChart>
        )
      } else {
        // ─── Alle anderen Metriken (BarChart) ───────────────
        // TS weiß hier: fullscreen ist eine Metrik aus METRICS (nicht 'cashDebt' oder 'pe')
        return (
          <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <XAxis dataKey="label" />
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
                }
                return yFmt(v)
              }}
              domain={
                fullscreen === 'returnOnEquity' || fullscreen === 'eps'
                  ? ['dataMin', 'dataMax']
                  : undefined
              }
            />
            <Tooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} cursor={false}/>
            <Legend verticalAlign="top" height={36}/>
            <Bar
              dataKey={fullscreen}
              name={METRICS.find((m) => m.key === fullscreen)!.name}
              fill={METRICS.find((m) => m.key === fullscreen)!.fill}
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