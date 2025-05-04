// src/components/StockLineChart.tsx
'use client'

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
)

export default function StockLineChart({
  data,
}: {
  data: { date: string; close: number }[]
}) {
  const labels = data.map(d => d.date.replace(/^\d{4}-/, '').replace(/-/, '/'))
  const dataset = {
    label: 'Preis',
    data: data.map(d => d.close),
    fill: true,
    tension: 0.2,
    pointRadius: 0,
    // optional für lila Farbstich:
    borderColor: 'rgba(155, 93, 229, 1)',
    backgroundColor: 'rgba(155, 93, 229, 0.1)',
  }

  return (
    <div>
      <Line
        data={{ labels, datasets: [dataset] }}
        options={{
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ctx.parsed.y.toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 2,
                }),
              },
            },
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              ticks: {
                callback: v =>
                  typeof v === 'number'
                    ? '$' + (v / 1_000_000_000).toFixed(1) + ' B'
                    : '',
              },
            },
          },
        }}
      />
    </div>
  )
}