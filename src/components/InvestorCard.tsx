'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { ArrowTopRightOnSquareIcon, UserIcon, BuildingOffice2Icon, ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import InvestorAvatar from './InvestorAvatar'
import holdingsHistory from '@/data/holdings'

interface InvestorCardData {
  slug: string
  name: string
  subtitle: string
  type: 'investor' | 'fund'
  totalValue: number
}

interface ChartDataPoint {
  date: string
  value: number
  quarter: string
}

interface TopHolding {
  ticker: string
  name: string
  percent: number
  value: number
}

const InvestorCard: React.FC<{ investor: InvestorCardData }> = ({ investor }) => {
  // Extract ticker symbol from company name (simplified)
  const extractTicker = (companyName: string): string => {
    const name = companyName.toUpperCase()
    if (name.includes('APPLE')) return 'AAPL'
    if (name.includes('MICROSOFT')) return 'MSFT'
    if (name.includes('AMAZON')) return 'AMZN'
    if (name.includes('GOOGLE') || name.includes('ALPHABET')) return 'GOOGL'
    if (name.includes('TESLA')) return 'TSLA'
    if (name.includes('BERKSHIRE')) return 'BRK.A'
    if (name.includes('AMERICAN EXPRESS')) return 'AXP'
    if (name.includes('COCA COLA')) return 'KO'
    if (name.includes('BANK AMER')) return 'BAC'
    if (name.includes('VISA')) return 'V'
    if (name.includes('MASTERCARD')) return 'MA'
    if (name.includes('CHEVRON')) return 'CVX'
    if (name.includes('KRAFT HEINZ')) return 'KHC'
    if (name.includes('OCCIDENTAL')) return 'OXY'
    if (name.includes('CHUBB')) return 'CB'
    if (name.includes('MOODYS')) return 'MCO'
    if (name.includes('DAVITA')) return 'DVA'
    if (name.includes('SIRIUS')) return 'SIRI'
    if (name.includes('CITIGROUP')) return 'C'
    if (name.includes('KROGER')) return 'KR'
    if (name.includes('VERISIGN')) return 'VRSN'
    if (name.includes('NU HLDGS')) return 'NU'
    // Return abbreviated company name as fallback
    const words = name.split(' ')
    if (words.length >= 2) {
      return (words[0].substring(0, 2) + words[1].substring(0, 2)).substring(0, 4)
    }
    return words[0].substring(0, 4)
  }

  // Generate chart data and performance metrics
  const { chartData, performanceData, topHoldings } = useMemo(() => {
    const snapshots = holdingsHistory[investor.slug] || []
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return {
        chartData: [],
        performanceData: { changePercent: 0, changeQuarter: 0, lastUpdate: null },
        topHoldings: []
      }
    }

    // Create chart data from all snapshots (last 2 years max)
    const chartPoints: ChartDataPoint[] = snapshots
      .slice(-8) // Last 8 quarters (2 years)
      .map((snapshot, index) => ({
        date: snapshot.data.date || snapshot.quarter || '',
        value: snapshot.data.totalValue || 0,
        quarter: snapshot.quarter || `Q${index + 1}`
      }))
      .filter(point => point.value > 0)

    // Calculate performance metrics
    let changePercent = 0
    let changeQuarter = 0
    if (chartPoints.length > 1) {
      const latest = chartPoints[chartPoints.length - 1].value
      const previous = chartPoints[chartPoints.length - 2].value
      const earliest = chartPoints[0].value
      
      changePercent = earliest > 0 ? ((latest - earliest) / earliest) * 100 : 0
      changeQuarter = previous > 0 ? ((latest - previous) / previous) * 100 : 0
    }

    // Get top holdings from latest snapshot
    const latestSnapshot = snapshots[snapshots.length - 1]
    const holdings: TopHolding[] = []
    
    if (latestSnapshot?.data?.positions) {
      // Group positions by company (in case of duplicate entries)
      const positionMap = new Map<string, { name: string, value: number }>()
      
      latestSnapshot.data.positions.forEach((position: any) => {
        const cusip = position.cusip
        const existing = positionMap.get(cusip)
        if (existing) {
          existing.value += position.value
        } else {
          positionMap.set(cusip, {
            name: position.name,
            value: position.value
          })
        }
      })

      // Convert to array and sort by value
      const sortedPositions = Array.from(positionMap.entries())
        .map(([cusip, data]) => ({
          ticker: extractTicker(data.name),
          name: data.name,
          value: data.value,
          percent: (data.value / (latestSnapshot.data.totalValue || 1)) * 100
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)

      holdings.push(...sortedPositions)
    }

    return {
      chartData: chartPoints,
      performanceData: {
        changePercent: Math.round(changePercent * 10) / 10,
        changeQuarter: Math.round(changeQuarter * 10) / 10,
        lastUpdate: snapshots[snapshots.length - 1]?.data?.date || null
      },
      topHoldings: holdings
    }
  }, [investor.slug])

  const formatLargeNumber = (value: number): string => {
    if (value === 0) return '–'
    if (Math.abs(value) >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B $`
    } else if (Math.abs(value) >= 1e6) {
      return `${(value / 1e6).toFixed(0)}M $`
    } else if (Math.abs(value) >= 1e3) {
      return `${(value / 1e3).toFixed(0)}K $`
    }
    return `${Math.round(value)} $`
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '–'
    try {
      const [year, month, day] = dateStr.split('-')
      return `${day}.${month}.${year}`
    } catch {
      return dateStr
    }
  }

  const isPositiveChange = performanceData.changePercent >= 0
  const isPositiveQuarterly = performanceData.changeQuarter >= 0

  return (
    <Link
      href={`/superinvestor/${investor.slug}`}
      className="group bg-[#161618] rounded-2xl p-5 hover:bg-[#1A1A1D] transition-all duration-300 border border-white/[0.06] hover:border-white/[0.1] w-full flex flex-col"
      style={{ width: '360px', height: '280px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <InvestorAvatar
            name={investor.name}
            imageUrl={`/images/${investor.slug}.png`}
            size="sm"
            className="ring-2 ring-white/10 group-hover:ring-white/20 transition-all duration-200 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white text-sm group-hover:text-brand-light transition-colors truncate">
              {investor.name}
            </h3>
            {investor.subtitle && (
              <p className="text-xs text-gray-400 truncate">
                {investor.subtitle}
              </p>
            )}
          </div>
        </div>
        
        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-600 group-hover:text-brand-light transition-colors flex-shrink-0" />
      </div>

      {/* Mini Chart */}
      <div className="h-16 mb-3 bg-gray-900/30 rounded p-2">
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id={`colorGradient-${investor.slug}`} x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="0%" 
                    stopColor={isPositiveChange ? '#10b981' : '#ef4444'} 
                    stopOpacity={0.3}
                  />
                  <stop 
                    offset="100%" 
                    stopColor={isPositiveChange ? '#10b981' : '#ef4444'} 
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="quarter" 
                axisLine={false} 
                tickLine={false} 
                tick={false}
                hide
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={false}
                domain={['dataMin * 0.95', 'dataMax * 1.05']}
                hide
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositiveChange ? '#10b981' : '#ef4444'}
                strokeWidth={1.5}
                fill={`url(#colorGradient-${investor.slug})`}
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-gray-500">Keine Chart-Daten</div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
        <div>
          <div className="text-gray-400 mb-1">Portfolio</div>
          <div className="font-medium text-brand-light">
            {formatLargeNumber(investor.totalValue)}
          </div>
        </div>
        <div>
          <div className="text-gray-400 mb-1 flex items-center gap-1">
            {isPositiveChange ? (
              <ArrowTrendingUpIcon className="w-3 h-3" />
            ) : (
              <ArrowTrendingDownIcon className="w-3 h-3" />
            )}
            Total
          </div>
          <div className={`font-medium ${isPositiveChange ? 'text-brand-light' : 'text-red-400'}`}>
            {performanceData.changePercent > 0 ? '+' : ''}{performanceData.changePercent}%
          </div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Quartal</div>
          <div className={`font-medium ${isPositiveQuarterly ? 'text-brand-light' : 'text-red-400'}`}>
            {performanceData.changeQuarter > 0 ? '+' : ''}{performanceData.changeQuarter}%
          </div>
        </div>
      </div>

      {/* Top Holdings */}
      <div className="flex-1 min-h-0 mb-3 overflow-hidden">
        <div className="text-gray-400 text-xs mb-2">Top Holdings</div>
        <div className="flex gap-2 overflow-hidden">
          {topHoldings.slice(0, 3).map((holding, index) => (
            <div key={index} className="flex flex-col items-center min-w-0 flex-1">
              <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-xs text-gray-300 truncate w-full text-center">
                {holding.ticker}
              </span>
              <span className="text-gray-400 text-xs mt-1 truncate">
                {holding.percent.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-auto border-t border-white/10 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          investor.type === 'investor' 
            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
        }`}>
          {investor.type === 'investor' ? (
            <>
              <UserIcon className="w-3 h-3" />
              Investor
            </>
          ) : (
            <>
              <BuildingOffice2Icon className="w-3 h-3" />
              Fonds
            </>
          )}
        </span>
        
        {performanceData.lastUpdate && (
          <span className="text-xs text-gray-500">
            {formatDate(performanceData.lastUpdate)}
          </span>
        )}
      </div>
    </Link>
  )
}

export default InvestorCard