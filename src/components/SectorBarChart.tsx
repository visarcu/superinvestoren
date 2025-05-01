import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import type { SectorDatum } from '@/components/SectorPieChart'

export default function SectorBarChart({
  data,
  height = 300,
}: {
  data: SectorDatum[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="sector" tick={{ fontSize: 12 }} />
        <YAxis
          unit="%"
          tickFormatter={(v) => `${v.toFixed(0)}%`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip formatter={(v: number) => `${v.toFixed(1)} %`} />
        <Legend verticalAlign="top" height={36} />
        <Bar dataKey="value" name="Anteil (%)" fill="#4ade80" />
      </BarChart>
    </ResponsiveContainer>
  )
}