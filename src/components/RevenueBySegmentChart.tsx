'use client'
import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

interface Props {
  data: Array<Record<string, any>>
}

export default function RevenueBySegmentChart({ data }: Props) {
  if (data.length === 0) return null

  // Alle Segment-Keys außer „date“ herausfiltern
  const segments = Object.keys(data[0]).filter((k) => k !== 'date')

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-2xl font-semibold mb-4">Revenue By Segment (annual)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="date" tickFormatter={(d) => d.slice(0, 4)} />
          <YAxis tickFormatter={(v) => `${(v / 1e9).toFixed(0)}b`} />
          <Tooltip
            formatter={(val: number) => `${(val / 1e9).toFixed(2)} b`}
          />
          <Legend />
          {segments.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              name={key}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}