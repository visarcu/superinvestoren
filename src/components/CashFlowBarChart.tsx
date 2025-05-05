// src/components/CashFlowBarChart.tsx
'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface CashFlowPoint {
  period: string
  buy:    number  // in USD
  sell:   number  // in USD
}

export default function CashFlowBarChart({
  data
}: {
  data: CashFlowPoint[]
}) {
  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 80 }}
      >
        <XAxis dataKey="period" />

        {/* Y-Achse: USD → in Mrd USD */}
        <YAxis
          width={80}
          tickFormatter={v => `${(v as number / 1e9).toFixed(1)} Mrd $`}
        />

        {/* Tooltip ebenfalls in Mrd $ */}
        <Tooltip
          formatter={(value: number, name: string) => {
            const inBillion = (value / 1e9).toFixed(2)
            return [`${inBillion} Mrd $`, name]
          }}
        />

        <Legend verticalAlign="top" height={36} />

        <Bar dataKey="buy"  name="Käufe"   fill="#22c55e" barSize={20} />
        <Bar dataKey="sell" name="Verkäufe" fill="#ef4444" barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}