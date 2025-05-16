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
  // Tooltip-Formatter: Wert mit "%" und deutsches Label
  const tooltipFormatter = (value: number) => [
    `${value.toFixed(2)} %`,
    'Prozent'
  ]

  return (
    <ResponsiveContainer width="110%" height={400}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 20, right: 50, bottom: 20, left: 0 }}
      >
        {/* Prozent-Skala von 0 bis Max */}
        <XAxis
          type="number"
          domain={[0, 'dataMax']}
          tickFormatter={v => `${Math.round(v)}%`}
          tick={{ fill: '#aaa' }}
        />
        {/* Kategorien (Namen) links, mehr Platz */}
        <YAxis
          dataKey="name"
          type="category"
          width={150}
          tick={{ fill: '#aaa', fontSize: 12, textAnchor: 'end' }}
        />

        <Tooltip
          cursor={false}             // kein Hover-Cursor
          contentStyle={{
            backgroundColor: 'rgba(55,56,58,0.9)',
            border: 'none',
            borderRadius: 4,
            padding: '8px 12px'
          }}
          labelStyle={{ display: 'none' }}  // X-Achse ausblenden
          itemStyle={{ color: '#fff' }}     // Textfarbe weiß
          formatter={tooltipFormatter}
        />

        <Bar
          dataKey="percent"
          fill="#4f46e5"
          barSize={20}
          radius={[4, 4, 4, 4]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}