'use client'

import React, { useState } from 'react'
import StockLineChart from './StockLineChart'
import Tooltip from './Tooltip'
import { fmtP, fmtDate } from '@/utils/formatters'

interface DividendSectionProps {
  dividendYield?: number
  payoutRatio?: number
  exDate?: string | null
  payDate?: string | null
  history: { date: string; dividend: number }[]
}

export default function DividendSection({
  dividendYield,
  payoutRatio,
  exDate,
  payDate,
  history,
}: DividendSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <h3 className="font-semibold mb-2">Dividend</h3>
      <ul className="text-sm space-y-1">
        <li>Rendite: {fmtP(dividendYield)}</li>
        <li>Payout Ratio: {fmtP(payoutRatio)}</li>
      </ul>

      <button
        onClick={() => setOpen(!open)}
        className="mt-2 text-blue-600 hover:underline flex items-center gap-1 text-sm"
      >
        Mehr zur Dividende {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="mt-4 bg-gray-50 p-4 rounded space-y-2">
          <p>Ex‐Date: {fmtDate(exDate)}</p>
          <p>Payment Date: {fmtDate(payDate)}</p>

          {/* Chart zum Dividenden-Wachstum */}
          {history.length > 0 ? (
            <StockLineChart
              data={history.map((h) => ({ date: h.date, close: h.dividend }))}
            />
          ) : (
            <p className="text-sm text-gray-500">Keine Dividendenhistorie.</p>
          )}
        </div>
      )}
    </div>
  )
}