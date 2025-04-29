'use client'
import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
const AnalysisChart = dynamic(() => import('./AnalysisChart'), { ssr: false })

// Hilfstypen
interface Metric {
  marketCapitalization: number
  peNormalizedAnnual: number
  priceToSalesRatioTTM: number
  evToEbitdaTTM: number
  priceToBookRatioTTM: number
  freeCashFlowYieldTTM: number
}
type Period = 'annual' | 'quarterly'

export default function FinancialAnalysis({ ticker }: { ticker: string }) {
  const [limit,  setLimit]  = useState(5)
  const [period, setPeriod] = useState<Period>('annual')
  const [data,   setData]   = useState<any[]>([])
  const [metric, setMetric] = useState<Metric | null>(null)
  const [loading, setLoading] = useState(true)

  // Hol Chart-Daten
  useEffect(() => {
    setLoading(true)
    fetch(`/api/financials/${ticker}?limit=${limit}&period=${period}`)
      .then(r => r.json())
      .then(json => setData(json.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [ticker, limit, period])

  // Hol Top-Kennzahlen
  useEffect(() => {
    fetch(`/api/fundamentals/${ticker}`)
      .then(r => r.json())
      .then(json => setMetric(json.metric))
      .catch(console.error)
  }, [ticker])

  return (
    <div className="space-y-8">
      {/* ——— Top-Kennzahlen wie bei Qualtrimm ——— */}
      {metric && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 bg-white p-6 rounded-xl shadow">
          <div>
            <h3 className="font-semibold mb-2">Value</h3>
            <ul className="space-y-1 text-sm">
              <li>Market Cap: {metric.marketCapitalization.toLocaleString()} Mio.</li>
              <li>P/E: {metric.peNormalizedAnnual.toFixed(1)}</li>
              <li>P/S: {metric.priceToSalesRatioTTM.toFixed(1)}</li>
              <li>EV/EBITDA: {metric.evToEbitdaTTM.toFixed(1)}</li>
              <li>P/B: {metric.priceToBookRatioTTM.toFixed(1)}</li>
              <li>FCF Yield: {(metric.freeCashFlowYieldTTM*100).toFixed(2)} %</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Quality</h3>
            <ul className="space-y-1 text-sm">
              <li>Piotroski Score: –</li>
              <li>Quality Rating: –</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Margins & Growth</h3>
            <ul className="space-y-1 text-sm">
              <li>Profit Margin: –</li>
              <li>Op. Margin (TTM): –</li>
              <li>YoY Earnings (Q): –</li>
              <li>YoY Revenue (Q): –</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Balance</h3>
            <ul className="space-y-1 text-sm">
              <li>Cash: –</li>
              <li>Debt: –</li>
              <li>Net: –</li>
            </ul>
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <h3 className="font-semibold mb-2">Dividend</h3>
            <ul className="space-y-1 text-sm">
              <li>Yield: –</li>
              <li>Payout Ratio: –</li>
              <li>Ex-Div Date: –</li>
              <li>Payout Date: –</li>
            </ul>
          </div>
        </div>
      )}

      {/* ——— Controls für Limit & Period ——— */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2 items-center">
          <span className="font-medium">Jahre:</span>
          {[5,10,15,20].map(n => (
            <button
              key={n}
              onClick={() => setLimit(n)}
              className={`px-3 py-1 rounded ${limit===n ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >{n} J</button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <span className="font-medium">Period:</span>
          {(['annual','quarterly'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded ${period===p ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >{p==='annual' ? 'Annually' : 'Quarterly'}</button>
          ))}
        </div>
      </div>

      {/* ——— Charts ——— */}
      {loading
        ? <p>Lade Chart-Daten…</p>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {(['revenue','ebitda','eps'] as const).map(key => (
              <div key={key} className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {key==='revenue' ? 'Umsatz (Mio.)'
                     : key==='ebitda'  ? 'EBITDA (Mio.)'
                                      : 'EPS (USD)'}
                  </h2>
                  <span className="ml-2 cursor-help text-gray-400" title={{
                    revenue: 'Umsatz gesamt…',
                    ebitda:  'EBITDA ohne Abschreibungen…',
                    eps:     'Earnings Per Share…',
                  }[key]}>
                    ℹ️
                  </span>
                </div>
                <AnalysisChart
                  data={data}
                  dataKey={key}
                  name={key==='revenue' ? 'Umsatz' : key==='ebitda' ? 'EBITDA' : 'EPS'}
                  stroke={ key==='revenue'
                    ? '#3b82f6' : key==='ebitda'
                    ? '#10b981' : '#f59e0b'
                  }
                  fill={ key==='revenue'
                    ? 'rgba(59,130,246,0.3)'
                    : key==='ebitda'
                    ? 'rgba(16,185,129,0.3)'
                    : 'rgba(245,158,11,0.3)'
                  }
                  xAxisKey="label"
                />
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}