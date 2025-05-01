import React from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'

export interface TopDatum {
  name: string
  value: number
}

const COLORS = [
  '#60A5FA', '#2563EB', '#4ADE80', '#22C55E',
  '#FBBF24', '#F59E0B', '#F87171', '#EF4444',
  '#A78BFA', '#7C3AED', '#CBD5E1',
]

export default function TopPositionsPieChart({
  data,
  height = 300,
}: {
  data: TopDatum[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="60%"
          outerRadius="80%"
          label={({ name, percent }) =>
            `${name}: ${(percent! * 100).toFixed(0)}%`
          }
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
        <Legend
          layout="vertical"
          align="left"
          verticalAlign="middle"
          wrapperStyle={{ left: 0 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}