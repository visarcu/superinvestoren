'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

interface Props {
  data: Array<{ period: string; value: number }>
}

export default function PortfolioValueChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="period"
          stroke="#525252"
          tick={{ fill: '#525252', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="#525252"
          tick={{ fill: '#525252', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1e9).toFixed(1)} Mrd.`}
          width={60}
        />
        <Tooltip
          labelFormatter={(label) => `${label}`}
          formatter={(value: number) => {
            const mrd = value / 1e9
            return [
              `${mrd.toLocaleString('de-DE', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
              })} Mrd.`,
              'Depot-Volumen'
            ]
          }}
          contentStyle={{
            backgroundColor: '#171717',
            border: '1px solid #404040',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
          labelStyle={{
            color: '#fff',
            fontWeight: 600,
            marginBottom: 4
          }}
          itemStyle={{
            color: '#10b981'
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
