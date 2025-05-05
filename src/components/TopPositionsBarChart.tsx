// src/components/TopPositionsBarChart.tsx
'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface TopPosition {
  name:    string
  percent: number
}

export default function TopPositionsBarChart({
  data
}: {
  data: TopPosition[]
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 20, right: 20, bottom: 20, left: 140 }}
      >
        {/* Prozent-Skala von 0 bis Max */}
        <XAxis
          type="number"
          domain={[0, 'dataMax']}
          tickFormatter={v => `${Math.round(v)}%`}
        />
        {/* ausreichend Breite (150px) plus left-margin */}
        <YAxis
          dataKey="name"
          type="category"
          width={150}
          tick={{ textAnchor: 'end' }}
        />
        <Tooltip
          formatter={(v:number) => `${v.toFixed(2)} %`}
        />
        <Bar
          dataKey="percent"
          fill="#4f46e5"
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}