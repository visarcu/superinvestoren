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
  // 1) Labels als MM/YY:
  const labels = data.map(d => {
    const [year, month] = d.date.split('-')
    return `${month}/${year.slice(2)}`
  })

  const dataset = {
    label: 'Preis',
    data: data.map(d => d.close),
    fill: true,
    tension: 0.2,
    pointRadius: 0,
    borderColor: 'rgba(155, 93, 229, 1)',
    backgroundColor: 'rgba(155, 93, 229, 0.2)',
    borderWidth: 2,
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
                label: ctx =>
                  ctx.parsed.y.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                maxTicksLimit: 10,      // optional: weniger x-Labels
                autoSkip: true,
              },
            },
            y: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: {
                // 2) Echte USD‐Werte:
                callback: value =>
                  typeof value === 'number'
                    ? value.toLocaleString('de-DE', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '',
              },
            },
          },
        }}
      />
    </div>
  )
}