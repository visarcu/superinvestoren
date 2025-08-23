'use client'

import { LineChart, ResponsiveContainer } from 'recharts'

// Export all chart components for use in the consuming component
export { Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface LazyLineChartProps {
  data: any[]
  children: React.ReactNode
  height?: number | string
  width?: number | string
  [key: string]: any
}

export default function LazyLineChart({ 
  data, 
  children,
  height = "100%",
  width = "100%",
  ...props 
}: LazyLineChartProps) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data} {...props}>
        {children}
      </LineChart>
    </ResponsiveContainer>
  )
}