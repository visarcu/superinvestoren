'use client'

import React, { useState, useEffect } from 'react'
import StockLineChart from './StockLineChart'

const PERIODS = [
  { id: '1W', label: '1 Woche',  days: 7 },
  { id: '1M', label: '1 Monat',  days:30 },
  { id: '3M', label: '3 Monate', days:90 },
  { id: '6M', label: '6 Monate', days:180 },
  { id: 'YTD',label:'YTD',       days:null },
  { id: '1Y', label: '1 Jahr',   days:365 },
  { id: '5Y', label: '5 Jahre',  days:365*5 },
  { id: '10Y',label:'10 Jahre',  days:365*10 },
  { id: 'ALL',label:'All',       days:null },
] as const

type PeriodID = typeof PERIODS[number]['id']
interface Props { ticker: string }

export default function StockLineChartWrapper({ ticker }: Props) {
  const [period,    setPeriod]  = useState<PeriodID>('1Y')
  const [history,   setHistory] = useState<{date:string;close:number}[]>([])
  const [deltas,    setDeltas]  = useState<Record<PeriodID, number>>({} as any)
  const [loading,   setLoading] = useState(true)

  // 1) beim Mount: alle Deltas holen
  useEffect(() => {
    fetch(`https://financialmodelingprep.com/api/v3/stock-price-change/${ticker}?apikey=${process.env.FMP_API_KEY}`)
      .then(r => r.json())
      .then((arr: any[]) => {
        if (!Array.isArray(arr) || arr.length === 0) return
        const rec = arr[0]
        const map: Record<string, number> = {}
        PERIODS.forEach(p => {
          // das Feld im API-Response heißt z.B. "1W","1M", "1Y" und "max"
          const key = p.id === 'ALL' ? 'max' : p.id
          map[p.id] = typeof rec[key] === 'number' ? rec[key] : 0
        })
        setDeltas(map as any)
      })
      .catch(() => {
        console.warn('Price-change fetch failed')
      })
  }, [ticker])

  // 2) bei jedem period-Wechsel: histor. Preise nachladen
  useEffect(() => {
    setLoading(true)
    const cfg = PERIODS.find(p => p.id === period)!
    let url = `/api/price-history/${ticker}?serietype=line`
    if (cfg.days) {
      const to   = new Date()
      const from = new Date(to)
      from.setDate(to.getDate() - cfg.days)
      url += `&from=${from.toISOString().slice(0,10)}`
    }
    fetch(url)
      .then(r => r.json())
      .then((d: any) => {
        const arr = Array.isArray(d.historical) ? d.historical : d.historical ?? []
        setHistory(arr.map((h: any) => ({ date: h.date, close: h.close })))
      })
      .finally(() => setLoading(false))
  }, [ticker, period])

  return (
    <div className="space-y-4">
      {/* — Buttons für Perioden mit Delta-Anzeige — */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(p => {
          const delta = deltas[p.id]
          const isPos = delta >= 0
          return (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`flex items-center px-3 py-1 rounded ${
                p.id === period 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              <span className="mr-1">{p.label}</span>
              {delta != null && (
                <span className={`text-sm ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                  {isPos ? '↑' : '↓'} {Math.abs(delta).toFixed(2)} %
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* — Chart selbst — */}
      {!loading && history.length > 0 ? (
        <StockLineChart data={history} />
      ) : (
        <p className="text-center text-gray-500">{loading ? 'Lade Chart…' : 'Keine Daten'}</p>
      )}
    </div>
  )
}