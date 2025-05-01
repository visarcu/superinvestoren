// src/components/SectorPieChart.tsx
'use client'

import React, { useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'

export interface SectorDatum {
  sector: string
  value: number
}

interface Props {
  data: SectorDatum[]
  onLoad?: () => void
}

const COLORS = [
  '#6366F1',
  '#10B981',
  '#EF4444',
  '#8B5CF6',
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
  '#14B8A6',
  '#F43F5E',
  '#22D3EE',
]

export default function SectorPieChart({ data, onLoad }: Props) {
  useEffect(() => {
    onLoad?.()
  }, [])

  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="sector"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={2}
            label={false}
          >
            {data.map((entry, idx) => (
              <Cell
                key={entry.sector}
                fill={COLORS[idx % COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2">
        {data.map((entry, idx) => {
          const percent = ((entry.value / total) * 100).toFixed(1) + '%'
          return (
            <li
              key={entry.sector}
              className="flex items-center space-x-2"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="font-medium">{entry.sector}</span>
              <span className="text-gray-600">{percent}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}