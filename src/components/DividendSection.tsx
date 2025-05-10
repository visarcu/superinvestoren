'use client'

import React, { useState } from 'react'
import StockLineChart from './StockLineChart'
import { fmtP, fmtDate } from '@/utils/formatters'

interface DividendSectionProps {
  dividendYield?: number | null
  payoutRatio?: number | null
  exDate?: string | null
  payDate?: string | null
  history: { date: string; dividend: number }[]
  annualData: { year: string; amount: number }[]
  growthRate5y: number | null
  growthYears: number
  frequency: number | null
}

export default function DividendSection({
  dividendYield,
  payoutRatio,
  exDate,
  payDate,
  history,
  annualData,
  growthRate5y,
  growthYears,
  frequency,
}: DividendSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-card-dark p-6 rounded-xl space-y-4">
      <h3 className="text-lg font-semibold text-gray-100">Dividend</h3>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <li>
          <span className="block text-gray-400">Rendite</span>
          <span className="font-mono">{fmtP(dividendYield)}</span>
        </li>
        <li>
          <span className="block text-gray-400">Payout Ratio</span>
          <span className="font-mono">{fmtP(payoutRatio)}</span>
        </li>
        <li>
          <span className="block text-gray-400">5-Y CAGR</span>
          <span className="font-mono">
            {growthRate5y != null ? (growthRate5y * 100).toFixed(2) + ' %' : '–'}
          </span>
        </li>
        <li>
          <span className="block text-gray-400">Wachstums­jahre</span>
          <span className="font-mono">{growthYears}</span>
        </li>
        <li>
          <span className="block text-gray-400">Frequenz (p.a.)</span>
          <span className="font-mono">
            {frequency != null ? frequency.toFixed(1) : '–'}
          </span>
        </li>
      </ul>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-200 mb-2">
          Jahres­dividenden (aggregiert)
        </h4>
        {annualData.length > 0 ? (
          <StockLineChart
            data={annualData.map(d => ({ date: d.year, close: d.amount }))}
          />
        ) : (
          <p className="text-gray-400 text-sm">Keine historischen Daten.</p>
        )}
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="mt-4 text-accent hover:underline text-sm"
      >
        {open ? 'Weniger Details ▲' : 'Mehr Details ▼'}
      </button>

      {open && (
        <div className="mt-4 space-y-2 text-sm text-gray-200">
          <div>Ex-Date: {fmtDate(exDate)}</div>
          <div>Payment Date: {fmtDate(payDate)}</div>
          <div className="mt-2">
            <h5 className="font-medium mb-1">Alle Dividenden-­Zahlungen</h5>
            <StockLineChart
              data={history.map(h => ({ date: h.date, close: h.dividend }))}
            />
          </div>
        </div>
      )}
    </div>
  )
}