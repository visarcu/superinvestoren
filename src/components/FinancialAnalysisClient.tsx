// src/components/FinancialAnalysisClient.tsx
'use client'

import React, { useState, useEffect } from 'react'
import AnalysisChart from './AnalysisChart'
import GrowthTooltip from './GrowthTooltip'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
  | 'dividend'
  | 'sharesOutstanding'

type ChartKey = MetricKey | 'cashDebt'

interface Props {
  ticker: string
}

const METRICS: {
  key: MetricKey
  name: string
  stroke: string
  fill: string
}[] = [
  { key: 'revenue',        name: 'Umsatz (Mio.)',        stroke: '#3b82f6', fill: 'rgba(59,130,246,0.3)' },
  { key: 'ebitda',         name: 'EBITDA (Mio.)',        stroke: '#10b981', fill: 'rgba(16,185,129,0.3)' },
  { key: 'eps',            name: 'EPS (USD)',            stroke: '#f59e0b', fill: 'rgba(245,158,11,0.3)' },
  { key: 'freeCashFlow',   name: 'Free Cashflow (Mio.)', stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.3)' },
  { key: 'dividend',       name: 'Dividende (USD)',      stroke: '#22d3ee', fill: 'rgba(34,211,238,0.3)' },
  { key: 'sharesOutstanding', name: 'Shares Out. (Stück)', stroke: '#eab308', fill: 'rgba(234,179,8,0.3)' },
]

// Spezial-Farbwerte für Cash & Debt
const CASH_INFO = { dataKey: 'cash',  name: 'Cash',  stroke: '#6366f1', fill: 'rgba(99,102,241,0.3)' }
const DEBT_INFO = { dataKey: 'debt',  name: 'Debt',  stroke: '#ef4444', fill: 'rgba(239,68,68,0.3)' }

export default function FinancialAnalysisClient({ ticker }: Props) {
  const [years, setYears]           = useState<number>(10)
  const [period, setPeriod]         = useState<'annual' | 'quarterly'>('annual')
  const [data, setData]             = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const userHasPremium              = false

  // Fullscreen-Chart
  const [fullscreen, setFullscreen] = useState<ChartKey | null>(null)

  // Welche Charts sind sichtbar?
  const ALL_KEYS: ChartKey[] = [
    ...METRICS.map(m => m.key),
    'cashDebt',
  ]
  const [visible, setVisible] = useState<ChartKey[]>(ALL_KEYS)

  useEffect(() => {
    setLoading(true)
    const limit = period === 'annual' ? years : years * 4

    fetch(`/api/financials/${ticker.toUpperCase()}?period=${period}&limit=${limit}`)
      .then(r => r.json())
      .then(json => {
        const arr: any[] = json.data || []

        // 1) sortieren
        arr.sort((a, b) => {
          if (period === 'annual') {
            return (a.year ?? 0) - (b.year ?? 0)
          } else {
            return new Date(a.quarter).getTime() - new Date(b.quarter).getTime()
          }
        })

        // 2) mappen und prozentuales Wachstum berechnen
        const withGrowth = arr.map((row, idx) => {
          const out: any = {
            label: period === 'annual' ? row.year : row.quarter,
            cash:  row.cash   ?? 0,
            debt:  row.debt   ?? 0,
            ...row,
          }
          METRICS.forEach(({ key }) => {
            const prev = idx > 0 ? arr[idx - 1][key] : null
            if (prev != null && typeof row[key] === 'number') {
              out[`${key}GrowthPct`] = ((row[key] - prev) / prev) * 100
            } else {
              out[`${key}GrowthPct`] = null
            }
          })
          return out
        })

        setData(withGrowth)
      })
      .finally(() => setLoading(false))
  }, [ticker, period, years])

  if (loading) return <p>Lade Daten…</p>

  const toggleKey = (key: ChartKey) => {
    setVisible(v =>
      v.includes(key) ? v.filter(k => k !== key) : [...v, key]
    )
  }

  // Formatter für Y-Achse
  const yFormatter = (v: number) => `${(v / 1e3).toFixed(0)} Mrd`

  // Formatter für Tooltip (kleiner Modus)
  const tooltipFormatter = (value: number, name: string) => [
    `${(value/1e3).toFixed(2)} Mrd`, name
  ]

  return (
    <>
      <div className="space-y-6">
        {/* — Zeitraum — */}
        <div className="flex items-center gap-4">
          <span>Zeitraum:</span>
          {[5, 10, 15, 20].map(y => {
            const isPremium = y > 10
            const unlocked  = !isPremium || userHasPremium
            return (
              <button
                key={y}
                onClick={() => {
                  if (!unlocked) alert('Premium-Feature 🔒')
                  else setYears(y)
                }}
                className={`px-2 py-1 rounded ${
                  years === y
                    ? 'bg-blue-600 text-white'
                    : unlocked
                      ? 'bg-gray-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {y} J
                {isPremium && (
                  <span className="ml-1 text-xs font-bold bg-yellow-200 text-yellow-800 px-1 rounded">
                    PREMIUM
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* — Periode — */}
        <div className="flex items-center gap-4">
          <span>Periode:</span>
          {(['annual','quarterly'] as const).map(p => {
            const isQuart = p === 'quarterly'
            const unlocked = !isQuart || userHasPremium
            return (
              <button
                key={p}
                onClick={() => {
                  if (isQuart && !userHasPremium) alert('Premium-Feature 🔒')
                  else setPeriod(p)
                }}
                className={`px-3 py-1 rounded ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : unlocked
                      ? 'bg-gray-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {p==='annual'?'Jährlich':'Quartalsweise'}
                {isQuart && (
                  <span className="ml-1 text-xs font-bold bg-yellow-200 text-yellow-800 px-1 rounded">
                    PREMIUM
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* — Checkbox-Liste zum Ein/Ausblenden — */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow">
          {ALL_KEYS.map(key => {
            const label = key === 'cashDebt'
              ? 'Cash & Debt'
              : METRICS.find(m => m.key === key)!.name
            const checked = visible.includes(key)
            return (
              <label key={key} className="inline-flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-green-500"
                  checked={checked}
                  onChange={() => toggleKey(key)}
                />
                <span className="select-none">{label}</span>
              </label>
            )
          })}
        </div>

        {/* — Charts Grid — */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {visible.map(key => {
            // Spezialfall: Cash & Debt
            if (key === 'cashDebt') {
              return (
                <div key={key} className="bg-white rounded-xl shadow p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-lg">Cash &amp; Debt</h3>
                    <button
                      onClick={() => setFullscreen('cashDebt')}
                      aria-label="Vollbild öffnen"
                    >
                      <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" />
                      <YAxis tickFormatter={yFormatter} />
                      {fullscreen === 'cashDebt'
                        ? <Tooltip content={<GrowthTooltip />} />
                        : <Tooltip formatter={tooltipFormatter} />
                      }
                      <Legend verticalAlign="top" height={36} />
                      <Bar
                        dataKey={CASH_INFO.dataKey}
                        name={CASH_INFO.name}
                        fill={CASH_INFO.fill}
                      />
                      <Bar
                        dataKey={DEBT_INFO.dataKey}
                        name={DEBT_INFO.name}
                        fill={DEBT_INFO.fill}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }

            // Alle anderen Einzel-Charts
            const metric = METRICS.find(m => m.key === key)!
            return (
              <div key={key} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">{metric.name}</h3>
                  <button
                    onClick={() => setFullscreen(key)}
                    aria-label="Vollbild öffnen"
                  >
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={yFormatter} />
                    {fullscreen === key
                      ? <Tooltip content={<GrowthTooltip />} />
                      : <Tooltip formatter={tooltipFormatter} />
                    }
                    <Legend verticalAlign="top" height={36} />
                    <Bar
                      dataKey={metric.key}
                      name={metric.name}
                      fill={metric.fill}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </div>
      </div>

      {/* — Vollbild-Modal — */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          {/* hier auf 80 % der Breite und Höhe begrenzen */}
          <div className="bg-white rounded-lg shadow p-6 
                          max-w-[60vw] max-h-[60vh] w-[60vw] h-[60vh] 
                          overflow-auto relative">
            <button
              onClick={() => setFullscreen(null)}
              className="absolute top-4 right-4 text-gray-700"
              aria-label="Vollbild schließen"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {fullscreen === 'cashDebt' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <XAxis dataKey="label" />
                  <YAxis tickFormatter={yFormatter} />
                  <Tooltip content={<GrowthTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar
                    dataKey={CASH_INFO.dataKey}
                    name={CASH_INFO.name}
                    fill={CASH_INFO.fill}
                  />
                  <Bar
                    dataKey={DEBT_INFO.dataKey}
                    name={DEBT_INFO.name}
                    fill={DEBT_INFO.fill}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              (() => {
                const m = METRICS.find(m => m.key === fullscreen)!
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <XAxis dataKey="label" />
                      <YAxis tickFormatter={yFormatter} />
                      <Tooltip content={<GrowthTooltip />} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar
                        dataKey={m.key}
                        name={m.name}
                        fill={m.fill}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )
              })()
            )}
          </div>
        </div>
      )}
    </>
  )
}