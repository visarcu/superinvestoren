// src/components/CashPositionChart.tsx
'use client'

import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

interface Point { period: string; cash: number }

export default function CashPositionChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="period" />
        <YAxis tickFormatter={v => `${(v/1e9).toFixed(1)} Mrd $`} />
        <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
        <Bar dataKey="cash" name="Cash / Treasuries" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  )
}