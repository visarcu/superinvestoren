// components/PortfolioValueChart.tsx
'use client'

import { Chart, ChartProps } from 'react-chartjs-2'
import {
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScriptableScaleContext
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export interface PortfolioValueChartProps {
  data: { period: string; value: number }[]
  // hier kommt die neue Prop hinzu:
  options?: ChartProps<'line'>['options']
}

export default function PortfolioValueChart({
  data,
  options
}: PortfolioValueChartProps) {
  // bereite labels & values vor
  const labels = data.map(d => d.period)
  const dataset = {
    label: 'Portfolio‐Wert',
    data: data.map(d => d.value),
    fill: false,
    tension: 0.3,
    pointRadius: 5,
    pointHoverRadius: 7
  }

  return (
    <Chart<'line'>
      type="line"
      data={{ labels, datasets: [dataset] }}
      options={{
        // ein paar sinnvolle Defaults
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: true } },
          y: {
            grid: { display: true },
            beginAtZero: true
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        // und dann deine overrides aus props.options:
        ...options
      }}
    />
  )
}