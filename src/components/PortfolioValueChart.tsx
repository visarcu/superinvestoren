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
  data: Array<{ period: string; value: number }> // roher Wert in USD/EUR
}

export default function PortfolioValueChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis dataKey="period" stroke="#888" />
        <YAxis
          stroke="#888"
          // KORRIGIERT: durch 1e9 (1 Milliarde) statt 1e12 (1 Billion) teilen
          tickFormatter={(v) => `${(v / 1e9).toFixed(1)} Mrd.`}
        />
        <Tooltip
          // der Tooltip zeigt Datum + formatierten Wert
          labelFormatter={(label) => `${label}`}
          formatter={(value: number) => {
            // KORRIGIERT: auch hier durch 1e9 teilen
            const mrd = value / 1e9
            return [
              `${mrd.toLocaleString('de-DE', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
              })} Mrd.`,
              'Depot-Volumen'
            ]
          }}
          // dunkles Styling passend zur Card
          contentStyle={{
            backgroundColor: '#1f2937',
            border: '1px solid #444',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
          // Label (Quartal) hell und fett
          labelStyle={{
            color: '#fff',
            fontWeight: 600
          }}
          // Item-Text (Volume) in grün
          itemStyle={{
            color: '#4ade80'
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#4ade80"
          strokeWidth={3}
          dot={{ r: 4, fill: '#4ade80' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}