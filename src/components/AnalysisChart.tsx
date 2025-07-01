  // src/components/AnalysisChart.tsx
  'use client'
  import React from 'react'
  import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
  } from 'recharts'

  interface AnalysisChartProps {
    data: any[]
    dataKey: string
    name?: string
    stroke?: string
    fill?: string
    /** Pixel-Höhe */
    height?: number
    /** Feld für X-Achse */
    xDataKey?: string
  }

  export default function AnalysisChart({
    data,
    dataKey,
    name,
    stroke = '#8884d8',
    fill   = 'rgba(136,132,216,0.3)',
    height = 240,
    xDataKey = 'label',
  }: AnalysisChartProps) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 19 }}>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="2 2" vertical={false} />
        <XAxis
    dataKey="period"
    tickLine={false}
    interval={0}
    angle={-45}                     // <— verschoben aus tick‐Objekt
    textAnchor="end"                // <— ebenso verschoben
    tick={{ fill: '#4B5563', fontSize: 12 }} // Nur Farb‐ und Größen‐Angaben bleiben im tick‐Objekt
    height={60}
  />
          <YAxis axisLine={false} tickLine={false} width={40} tick={{ fill: '#4B5563', fontSize: 12 }} />
          <Tooltip
          
          contentStyle={{
            backgroundColor: '#fff',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
          }}
          itemStyle={{ fontSize: 12, padding: '4px 8px' }}
          labelStyle={{ fontWeight: 600, color: '#374151' }}
          
          
          
          />
          <Bar
          dataKey={dataKey}
          name={name ?? dataKey}         stroke={stroke}
          fill={fill}
          barSize={20}
          opacity={0.8}
          strokeWidth={1}
        />
        </BarChart>
      </ResponsiveContainer>
    )
  }