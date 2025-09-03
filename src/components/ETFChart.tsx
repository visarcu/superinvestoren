// src/components/ETFChart.tsx
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Chart, registerables, ChartConfiguration } from 'chart.js'
import 'chartjs-adapter-date-fns'
import { useCurrency } from '@/lib/CurrencyContext'

Chart.register(...registerables)

interface ETFChartProps {
  symbol: string
  period?: '1m' | '3m' | '6m' | '1y' | 'max'
  height?: number
  onPeriodChange?: (period: string) => void
}

interface ChartDataPoint {
  date: string
  price: number
  timestamp: number
}

export default function ETFChart({ symbol, period = '1y', height = 350, onPeriodChange }: ETFChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { formatStockPrice } = useCurrency()

  const [currentPeriod, setCurrentPeriod] = useState(period)
  const [periodPerformance, setPeriodPerformance] = useState<number>(0)

  const periods = [
    { key: '1m', label: '1M' },
    { key: '3m', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '1y', label: '1J' },
    { key: 'max', label: 'Max' }
  ]

  useEffect(() => {
    loadChartData()
  }, [symbol, currentPeriod])

  useEffect(() => {
    if (chartData.length > 0 && canvasRef.current) {
      createChart()
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [chartData])

  const loadChartData = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/etf-chart/${symbol}?period=${currentPeriod}`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch chart data')
      }

      const data = await res.json()
      const chartPoints = data.data || []
      setChartData(chartPoints)
      
      // Calculate performance for selected period
      if (chartPoints.length >= 2) {
        const firstPrice = chartPoints[0].price
        const lastPrice = chartPoints[chartPoints.length - 1].price
        const performance = ((lastPrice - firstPrice) / firstPrice) * 100
        setPeriodPerformance(performance)
      }
    } catch (err) {
      console.error('Chart data error:', err)
      setError('Chart-Daten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }

  const createChart = () => {
    if (!canvasRef.current || chartData.length === 0) return

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy()
    }

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // Calculate if trend is positive
    const firstPrice = chartData[0].price
    const lastPrice = chartData[chartData.length - 1].price
    const isPositive = lastPrice >= firstPrice

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: [{
          data: chartData.map(item => ({
            x: item.timestamp,
            y: item.price
          })),
          borderColor: isPositive ? '#10B981' : '#EF4444',
          backgroundColor: isPositive 
            ? 'rgba(16, 185, 129, 0.1)' 
            : 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: isPositive ? '#10B981' : '#EF4444',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#F9FAFB',
            bodyColor: '#F9FAFB',
            borderColor: 'rgba(75, 85, 99, 0.2)',
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              title: (tooltipItems) => {
                const item = tooltipItems[0]
                return new Date(item.parsed.x).toLocaleDateString('de-DE')
              },
              label: (tooltipItem) => {
                return `Kurs: ${formatStockPrice(tooltipItem.parsed.y, false)}`
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                day: 'dd.MM',
                week: 'dd.MM',
                month: 'MMM yy'
              }
            },
            grid: {
              display: true,
              color: 'rgba(75, 85, 99, 0.1)'
            },
            ticks: {
              color: '#9CA3AF',
              maxTicksLimit: 6
            }
          },
          y: {
            grid: {
              display: true,
              color: 'rgba(75, 85, 99, 0.1)'
            },
            ticks: {
              color: '#9CA3AF',
              maxTicksLimit: 6,
              callback: (value) => {
                const num = value as number
                return new Intl.NumberFormat('de-DE', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(num)
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        },
        elements: {
          line: {
            borderCapStyle: 'round'
          }
        }
      }
    }

    chartRef.current = new Chart(ctx, config)
  }

  if (loading) {
    return (
      <div className="bg-theme-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 text-green-400">📊</div>
            <h3 className="text-xl font-semibold text-theme-primary">Kursverlauf</h3>
          </div>
        </div>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-theme-secondary">Lade Chart-Daten...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-theme-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-5 h-5 text-green-400">📊</div>
          <h3 className="text-xl font-semibold text-theme-primary">Kursverlauf</h3>
        </div>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <p className="text-theme-secondary">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 text-green-400">📈</div>
          <h3 className="text-xl font-semibold text-theme-primary">Kursverlauf</h3>
          {periodPerformance !== 0 && (
            <div className={`ml-2 px-2 py-1 rounded text-sm font-semibold ${
              periodPerformance >= 0 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {periodPerformance >= 0 ? '+' : ''}{periodPerformance.toFixed(2).replace('.', ',')}%
            </div>
          )}
        </div>
        
        <div className="flex gap-1 bg-theme-secondary/10 rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setCurrentPeriod(p.key as any)
              }}
              className={`px-3 py-1 text-sm font-medium rounded transition-all ${
                currentPeriod === p.key
                  ? 'bg-green-500 text-white'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ height: `${height}px` }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}