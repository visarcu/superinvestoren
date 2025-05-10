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
  Tooltip,
  Legend,
} from 'recharts'
import { ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/solid'

type MetricKey =
  | 'revenue'
  | 'ebitda'
  | 'eps'
  | 'freeCashFlow'
  | 'dividendPS'
  | 'sharesOutstanding'
  | 'cashDebt'
  | 'pe'

type ChartKey = MetricKey

interface Props {
  ticker: string
}

const TOOLTIP_STYLES = {
  wrapperStyle:  { backgroundColor: 'rgba(55,65,81,0.95)', borderColor: '#4B5563' },
  contentStyle:  { backgroundColor: 'rgba(55,65,81,0.95)' },
  labelStyle:    { color: '#F3F4F6' },
  itemStyle:     { color: '#FFFFFF' },
}

const METRICS: {
  key: Exclude<MetricKey, 'cashDebt' | 'pe'>
  name: string
  stroke: string
  fill: string
}[] = [
  { key: 'revenue',        name: 'Umsatz (Mio.)',        stroke: '#3b82f6', fill: 'rgba(59,130,246,0.8)' },
  { key: 'ebitda',         name: 'EBITDA (Mio.)',        stroke: '#10b981', fill: 'rgba(16,185,129,0.8)' },
  { key: 'eps',            name: 'Gewinn je Aktie',      stroke: '#f59e0b', fill: 'rgba(245,158,11,0.8)' },
  { key: 'freeCashFlow',   name: 'Free Cashflow (Mio.)', stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.8)' },
  { key: 'dividendPS',     name: 'Dividende je Aktie',   stroke: '#22d3ee', fill: 'rgba(34,211,238,0.8)' },
  { key: 'sharesOutstanding', name: 'Shares Out. (Stück)', stroke: '#eab308', fill: 'rgba(234,179,8,0.8)' },
]

const CASH_INFO = { dataKey: 'cash', name: 'Cash', stroke: '#6366f1', fill: 'rgba(99,102,241,0.8)' }
const DEBT_INFO = { dataKey: 'debt', name: 'Debt', stroke: '#ef4444', fill: 'rgba(239,68,68,0.8)' }

export default function FinancialAnalysisClient({ ticker }: Props) {
  const [years, setYears]           = useState<number>(10)
  const [period, setPeriod]         = useState<'annual'|'quarterly'>('annual')
  const userHasPremium              = false
  const [data, setData]             = useState<any[]>([])
  const [loading, setLoading]       = useState<boolean>(true)
  const [fullscreen, setFullscreen] = useState<ChartKey|null>(null)

  const ALL_KEYS: ChartKey[] = [
    ...METRICS.map(m => m.key),
    'cashDebt',
    'pe'
  ]
  const [visible, setVisible] = useState<ChartKey[]>(ALL_KEYS)

  // Hilfs-Funktion für Mrd-Formatter
  const yFmt = (v: number) => `${(v / 1e3).toFixed(0)} Mrd`

  useEffect(() => {
    setLoading(true)
    const limit = period === 'annual' ? years : years * 4

    Promise.all([
      // 1) interne Kennzahlen (ohne Dividende)
      fetch(`/api/financials/${ticker.toUpperCase()}?period=${period}&limit=${limit}`),
      // 2) Dividend per Share
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`),
      // 3) Kurse für PE-Berechnung
      fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`)
    ])
      .then(async ([rFin, rDiv, rPrice]) => {
        const jsonFin   = await rFin.json()
        const jsonDiv   = await rDiv.json()
        const jsonPrice = await rPrice.json()

        // 1) Basis-Daten
        const arr: any[] = jsonFin.data || []

        // 2) Dividend aufsummieren
        const histDiv: any[] = Array.isArray(jsonDiv[0]?.historical)
          ? jsonDiv[0].historical
          : Array.isArray((jsonDiv as any).historical)
            ? (jsonDiv as any).historical
            : []
        const annualDiv: Record<string,number> = {}
        histDiv.forEach(d => {
          const y = d.date.slice(0,4)
          annualDiv[y] = (annualDiv[y]||0) + (d.adjDividend||0)
        })

        // 3) Kurse gruppieren
        const histPrice: { date:string; close:number }[] =
          Array.isArray(jsonPrice.historical) ? jsonPrice.historical : []
        const priceByPeriod: Record<string,number> = {}
        histPrice.forEach(p => {
          const key = period === 'annual' ? p.date.slice(0,4) : p.date.slice(0,7)
          priceByPeriod[key] = p.close
        })

        // 4) Sortieren nach label
        arr.sort((a,b) =>
          period === 'annual'
            ? (a.year||0) - (b.year||0)
            : new Date(a.quarter).getTime() - new Date(b.quarter).getTime()
        )

        // 5a) erster Durchlauf: out-Felder + Dividende + PE
        const base = arr.map(row => {
          const label = period === 'annual' ? String(row.year) : row.quarter
          const out: any = {
            label,
            cash: row.cash||0,
            debt: row.debt||0,
            ...row,
          }
          out.dividendPS = annualDiv[label] ?? 0
          const price = priceByPeriod[label] ?? null
          out.pe = price != null && row.eps ? price / row.eps : null
          return out
        })

        // 5b) zweiter Durchlauf: Growth-Rates für alle Keys
        const withGrowth = base.map((row, idx, all) => {
          const out: any = { ...row }
          ;[...METRICS.map(m=>m.key), 'dividendPS', 'pe'].forEach((k:any) => {
            const prev = idx > 0 ? all[idx-1][k] : null
            out[`${k}GrowthPct`] =
              prev != null && typeof row[k] === 'number'
                ? ((row[k] - prev) / prev) * 100
                : null
          })
          return out
        })

        setData(withGrowth)
      })
      .finally(() => setLoading(false))
  }, [ticker, period, years])

  if (loading) return <p>Lade Daten…</p>

  const toggleKey = (key: ChartKey) =>
    setVisible(v => v.includes(key) ? v.filter(x => x !== key) : [...v, key])

  return (
    <div className="space-y-6">
      {/* ── Zeitraum / Periode / Premium ── */}
      <div className="flex flex-wrap items-center gap-4">
        <span>Zeitraum:</span>
        {[5,10,15,20].map(y => {
          const locked = y > 10 && !userHasPremium
          return (
            <button key={y}
              onClick={() => locked ? alert('🔒 Premium') : setYears(y)}
              className={`px-2 py-1 rounded ${
                years === y    ? 'bg-blue-600 text-white'
                : locked        ? 'bg-gray-900 text-gray-400 cursor-not-allowed'
                :                 'bg-gray-700'
              }`}
            >
              {y} J
              {locked && (
                <span className="ml-1 text-xs bg-yellow-200 text-yellow-800 px-1 rounded">
                  PREMIUM
                </span>
              )}
            </button>
          )
        })}

        <span className="ml-6">Periode:</span>
        {(['annual','quarterly'] as const).map(p => {
          const locked = p === 'quarterly' && !userHasPremium
          return (
            <button key={p}
              onClick={() => locked ? alert('🔒 Premium') : setPeriod(p)}
              className={`px-3 py-1 rounded ${
                period === p   ? 'bg-blue-600 text-white'
                : locked       ? 'bg-gray-900 text-gray-400 cursor-not-allowed'
                :               'bg-gray-500'
              }`}
            >
              {p === 'annual' ? 'Jährlich' : 'Quartalsweise'}
              {locked && (
                <span className="ml-1 text-xs bg-yellow-200 text-yellow-800 px-1 rounded">
                  PREMIUM
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Checkbox-Filter ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card-dark p-4 rounded-lg shadow">
        {ALL_KEYS.map(key => (
          <label key={key} className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-green-500"
              checked={visible.includes(key)}
              onChange={() => toggleKey(key)}
            />
            <span>
              { key === 'cashDebt'          ? 'Cash & Debt'
              : key === 'pe'                ? 'KGV TTM'
              : METRICS.find(m => m.key === key)!.name
              }
            </span>
          </label>
        ))}
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {visible.map(key => {
          // Cash & Debt
          if (key === 'cashDebt') {
            return (
              <div key={key} className="bg-card-dark rounded-xl p-4 shadow">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Cash &amp; Debt</h3>
                  <button onClick={() => setFullscreen('cashDebt')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600"/>
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data}>
                    <XAxis dataKey="label"/>
                    <YAxis tickFormatter={yFmt}/>
                    {fullscreen==='cashDebt'
                      ? <Tooltip content={<GrowthTooltip/>} {...TOOLTIP_STYLES}/>
                      : <Tooltip formatter={(v:any,n:string)=>([`${(v/1e3).toFixed(2)} Mrd`,n])} {...TOOLTIP_STYLES}/>
                    }
                    <Legend verticalAlign="top" height={36}/>
                    <Bar dataKey="cash" name="Cash" fill={CASH_INFO.fill}/>
                    <Bar dataKey="debt" name="Debt" fill={DEBT_INFO.fill}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          }

          // KGV TTM
          if (key === 'pe') {
            const avg = data.reduce((sum,r) => sum + (r.pe||0), 0) / data.length
            return (
              <div key="pe" className="bg-card-dark rounded-xl p-4 shadow">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">KGV TTM</h3>
                  <button onClick={()=>setFullscreen('pe')}>
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600"/>
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data}>
                    <XAxis dataKey="label"/>
                    <YAxis/>
                    <ReferenceLine
                      y={avg}
                      stroke="#888"
                      strokeDasharray="3 3"
                      label={{ value: `Ø ${avg.toFixed(1)}`, position: 'insideTop', fill: '#888' }}
                    />
                    <Line type="monotone" dataKey="pe" stroke="#f87171" dot/>
                    <Tooltip {...TOOLTIP_STYLES} formatter={(v:number)=>([v.toFixed(2),'KGV TTM'])}/>
                    <Legend verticalAlign="top" height={36}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )
          }

          // alle anderen Bar-Charts
          const m = METRICS.find(m=>m.key===key)!
          return (
            <div key={key} className="bg-card-dark rounded-xl p-4 shadow">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{m.name}</h3>
                <button onClick={()=>setFullscreen(key)}>
                  <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600"/>
                </button>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data}>
                  <XAxis dataKey="label"/>
                  <YAxis
                    tickFormatter={(v:number)=>(
                      key==='eps'||key==='dividendPS'
                        ? v.toLocaleString('de-DE',{style:'currency',currency:'USD',minimumFractionDigits:2})
                        : yFmt(v)
                    )}
                    domain={key==='eps'||key==='dividendPS' ? ['dataMin','dataMax'] : undefined}
                  />
                  {fullscreen===key
                    ? <Tooltip content={<GrowthTooltip/>} {...TOOLTIP_STYLES}/>
                    : <Tooltip {...TOOLTIP_STYLES}
                        formatter={(v:any,n:string)=>[
                          key==='eps'||key==='dividendPS'
                            ? (v as number).toLocaleString('de-DE',{style:'currency',currency:'USD',minimumFractionDigits:2})
                            : `${((v as number)/1e3).toFixed(2)} Mrd`,
                          n
                        ]}
                      />
                  }
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey={key} name={m.name} fill={m.fill}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )
        })}
      </div>

      {/* ── Vollbild-Modal ── */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card-dark rounded-lg shadow p-6
                          max-w-[60vw] max-h-[60vh] w-[60vw] h-[60vh] overflow-auto relative">
            <button
              onClick={()=>setFullscreen(null)}
              className="absolute top-4 right-4 text-gray-700"
              aria-label="Vollbild schließen"
            >
              <XMarkIcon className="w-6 h-6"/>
            </button>

            <ResponsiveContainer width="100%" height="100%">
              {fullscreen === 'cashDebt' ? (
                <BarChart data={data} margin={{ top:20,right:20,bottom:20,left:0 }}>
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={yFmt} />
                  <Tooltip content={<GrowthTooltip/>} {...TOOLTIP_STYLES}/>
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="cash" name="Cash" fill={CASH_INFO.fill}/>
                  <Bar dataKey="debt" name="Debt" fill={DEBT_INFO.fill}/>
                </BarChart>
              ) : fullscreen === 'pe' ? (
                (() => {
                  const avg = data.reduce((sum,r) => sum + (r.pe||0), 0) / data.length
                  return (
                    <LineChart data={data} margin={{ top:20,right:20,bottom:20,left:0 }}>
                      <XAxis dataKey="label"/>
                      <YAxis/>
                      <ReferenceLine
                        y={avg}
                        stroke="#888"
                        strokeDasharray="3 3"
                        label={{ value: `Ø ${avg.toFixed(1)}`, position: 'insideTop', fill: '#888' }}
                      />
                      <Line type="monotone" dataKey="pe" name="KGV TTM" stroke="#f87171" dot/>
                      <Tooltip {...TOOLTIP_STYLES} formatter={(v:number)=>([v.toFixed(2),'KGV TTM'])}/>
                      <Legend verticalAlign="top" height={36}/>
                    </LineChart>
                  )
                })()
              ) : (
                <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <XAxis dataKey="label" />
                <YAxis
                  tickFormatter={(v: number) =>
                    (fullscreen === 'eps' || fullscreen === 'dividendPS')
                      ? v.toLocaleString('de-DE', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 2,
                        })
                      : yFmt(v)
                  }
                  domain={
                    fullscreen === 'eps' || fullscreen === 'dividendPS'
                      ? ['dataMin', 'dataMax']
                      : undefined
                  }
                />
                <Tooltip content={<GrowthTooltip />} {...TOOLTIP_STYLES} />
                <Legend verticalAlign="top" height={36} />
                <Bar
                  dataKey={fullscreen}
                  name={
                    fullscreen === 'pe'
                      ? 'KGV TTM'
                      : METRICS.find(m => m.key === fullscreen)!.name
                  }
                  fill={
                    fullscreen === 'pe'
                      ? '#f87171'
                      : METRICS.find(m => m.key === fullscreen)!.fill
                  }
                />
              </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}