// src/components/Sparkline.tsx
'use client'
import React from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

interface Props {
  data: Array<{ date: string; close: number }>
  width?: number
  height?: number
  className?: string
}

export default function Sparkline({
  data,
  width = 120,
  height = 40,
  className,
}: Props) {
  return (
    <div style={{ width, height }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="close"
            stroke="#A78BFA"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}