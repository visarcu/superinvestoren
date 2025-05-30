// src/components/GrowthTooltip.tsx
import React from 'react'
import type { TooltipProps } from 'recharts'

export default function GrowthTooltip({
  active, payload, label
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-dark border p-2 rounded shadow">
      <div className="font-semibold mb-2">{label}</div>
      {payload.map((entry, i) => {
        const { name, value, payload: row }: any = entry
        // wir nehmen an, das Feld heißt value, und Wachstum steht in row[`${dataKey}GrowthPct`]
        const growth = row[`${entry.dataKey}GrowthPct`]
        return (
          <div key={i} className="text-sm">
            <span className="font-medium">{name}:</span>{' '}
            {value.toLocaleString('de-DE', { maximumFractionDigits:2 })}{' '}
            {growth != null && (
              <span className={`ml-1 ${growth>=0?'text-green-600':'text-red-600'}`}>
                ({growth>=0?'+':''}{growth.toFixed(2)} %)
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}