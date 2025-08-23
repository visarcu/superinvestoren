'use client'

import { BarChart, ResponsiveContainer } from 'recharts'

// Export all chart components for use in the consuming component
export { Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface LazyBarChartProps {
  data: any[]
  children: React.ReactNode
  height?: number | string
  width?: number | string
  [key: string]: any
}

export default function LazyBarChart({ 
  data, 
  children,
  height = "100%",
  width = "100%",
  ...props 
}: LazyBarChartProps) {
  return (
    <ResponsiveContainer width={width} height={height}>
      <BarChart data={data} {...props}>
        {children}
      </BarChart>
    </ResponsiveContainer>
  )
}