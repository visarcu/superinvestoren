// src/components/FinancialAnalysisClient.tsx
'use client'

import React, { useState, useEffect } from 'react'
import AnalysisChart from './AnalysisChart'
import InfoIcon from './InfoIcon'
import { ChevronDownIcon, ChevronUpIcon, ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/solid'

type MetricKey =
  | 'revenue'
  | 'ebitda'
  | 'eps'
  | 'freeCashFlow'
  | 'cash'
  | 'debt'
  | 'dividend'
  | 'sharesOutstanding'
  | 'roic'

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
  { key: 'cash',           name: 'Cash (Mio.)',          stroke: '#6366f1', fill: 'rgba(99,102,241,0.3)' },
  { key: 'debt',           name: 'Debt (Mio.)',          stroke: '#ef4444', fill: 'rgba(239,68,68,0.3)' },
  { key: 'dividend',       name: 'Dividende (USD)',      stroke: '#22d3ee', fill: 'rgba(34,211,238,0.3)' },
  { key: 'sharesOutstanding', name: 'Shares Out. (Stück)', stroke: '#eab308', fill: 'rgba(234,179,8,0.3)' },
  { key: 'roic', name: 'ROIC', stroke: '#eab308', fill: 'rgba(234,179,8,0.3)' },
]

export default function FinancialAnalysisClient({ ticker }: Props) {
  const [years, setYears]         = useState<number>(10)
  const [period, setPeriod]       = useState<'annual' | 'quarterly'>('annual')
  const [data, setData]           = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const userHasPremium            = false

  // steuert, ob das Fullscreen-Modal offen ist
  const [fullscreen, setFullscreen] = useState<MetricKey | null>(null)

  useEffect(() => {
    setLoading(true)
    const limit = period === 'annual' ? years : years * 4

    fetch(`/api/financials/${ticker.toUpperCase()}?period=${period}&limit=${limit}`)
      .then((r) => r.json())
      .then((json) => {
        let arr: any[] = json.data || []
        arr.sort((a, b) => {
          if (period === 'annual') {
            return (a.year ?? 0) - (b.year ?? 0)
          } else {
            return new Date(a.quarter).getTime() - new Date(b.quarter).getTime()
          }
        })
        setData(
          arr.map((row) => ({
            label: period === 'annual' ? row.year : row.quarter,
            ...row,
          }))
        )
      })
      .finally(() => setLoading(false))
  }, [ticker, period, years])

  if (loading) return <p>Lade Daten…</p>

  return (
    <>
      <div className="space-y-6">
        {/* Zeitraum-Schalter */}
        <div className="flex items-center gap-4">
          <span>Zeitraum:</span>
          {[5, 10, 15, 20].map((y) => {
            const isPremium = y > 10
            const unlocked  = !isPremium || userHasPremium
            return (
              <button
                key={y}
                onClick={() => {
                  if (!unlocked) {
                    alert('15 J und 20 J sind Premium-Features 🔒')
                  } else {
                    setYears(y)
                  }
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

        {/* Perioden-Schalter */}
        <div className="flex items-center gap-4">
          <span>Periode:</span>
          {(['annual', 'quarterly'] as const).map((p) => {
            const isQuart = p === 'quarterly'
            const unlocked = !isQuart || userHasPremium
            return (
              <button
                key={p}
                onClick={() => {
                  if (isQuart && !userHasPremium) {
                    alert('Quartalsweise ist ein Premium-Feature 🔒')
                  } else {
                    setPeriod(p)
                  }
                }}
                className={`px-3 py-1 rounded ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : unlocked
                    ? 'bg-gray-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {p === 'annual' ? 'Jährlich' : 'Quartalsweise'}
                {isQuart && (
                  <span className="ml-1 text-xs font-bold bg-yellow-200 text-yellow-800 px-1 rounded">
                    PREMIUM
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {METRICS.map(({ key, name, stroke, fill }) => (
            <div key={key} className="bg-white rounded-xl shadow p-4">

        <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg text-gray-800">{name}</h3>

                <div className="flex items-center space-x-2">
                  
                  {/* Fullscreen-Button */}
                  <button
                    onClick={() => setFullscreen(key)}
                    aria-label="Vollbild öffnen"
                  >
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              {/* Chart selbst */}
              <AnalysisChart
                data={data}
                dataKey={key}
                name={name}
                stroke={stroke}
                fill={fill}
                xDataKey="label"
                height={240}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fullscreen-Modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-11/12 h-5/6 relative">
            <button
              onClick={() => setFullscreen(null)}
              className="absolute top-4 right-4"
              aria-label="Vollbild schließen"
            >
              <XMarkIcon className="w-6 h-6 text-gray-700" />
            </button>
            <AnalysisChart
              data={data}
              dataKey={fullscreen}
              name={METRICS.find((m) => m.key === fullscreen)!.name}
              stroke={METRICS.find((m) => m.key === fullscreen)!.stroke}
              fill={METRICS.find((m) => m.key === fullscreen)!.fill}
              xDataKey="label"
              height={600}
             // width="100%"
            />
          </div>
        </div>
      )}
    </>
  )
}