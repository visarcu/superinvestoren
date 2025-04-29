'use client'
import React from 'react'
import {
  ResponsiveContainer, BarChart, CartesianGrid,
  XAxis, YAxis, Tooltip, Bar
} from 'recharts'

interface Props {
  data: any[]
  dataKey: string
  name?: string
  stroke?: string
  fill?: string
  height?: number
  xAxisKey?: string
}

export default function AnalysisChart({
  data, dataKey, name,
  stroke='#8884d8', fill='rgba(136,132,216,0.3)',
  height=240, xAxisKey='label'
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top:8, right:16, bottom:8, left:0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey={xAxisKey}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
        />
        <YAxis axisLine={false} tickLine={false} width={40} />
        <Tooltip />
        <Bar dataKey={dataKey} name={name} stroke={stroke} fill={fill} barSize={20}/>
      </BarChart>
    </ResponsiveContainer>
  )
}