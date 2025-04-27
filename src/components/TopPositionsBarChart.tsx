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
  Cell,
} from 'recharts'

interface Datum {
  name: string
  percent: number
}

interface Props {
  data: Datum[]
  colors?: string[]
}

export default function TopPositionsBarChart({
  data,
  colors = [
    '#4F46E5',
    '#10B981',
    '#EF4444',
    '#8B5CF6',
    '#F59E0B',
    '#3B82F6',
    '#EC4899',
    '#14B8A6',
    '#F43F5E',
    '#22D3EE',
  ],
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 20, right: 20, bottom: 20, left: 80 }}
      >
        {/* X-Achse als Prozent */}
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => v.toFixed(0) + '%'}
        />

        {/* Y-Achse: intervall=0 sorgt dafür, dass jede Zeile beschriftet wird */}
        <YAxis
          type="category"
          dataKey="name"
          interval={0}
          width={120}
          tick={{ fontSize: 12, fill: '#4A4A4A' }}
        />

        <Tooltip
          formatter={(value: any) => [(value as number).toFixed(1) + '%', 'Anteil']}
        />

        <Bar dataKey="percent" barSize={20}>
          {data.map((entry, idx) => (
            <Cell key={entry.name} fill={colors[idx % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}