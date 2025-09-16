// src/components/SurprisesClient.tsx - KORRIGIERT
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useCurrency } from '@/lib/CurrencyContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface EarningsSurprise {
  date: string
  actualEarningResult: number
  estimatedEarning: number
}

interface EarningsCalendarItem {
  date: string
  eps: number
  epsEstimated: number
  revenue: number
  revenueEstimated: number
  time: string
  fiscalDateEnding: string
}

export default function SurprisesClient({ ticker }: { ticker: string }) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [surprises, setSurprises] = useState<EarningsSurprise[]>([])
  const [calendar, setCalendar] = useState<EarningsCalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const { formatStockPrice, formatPercentage, formatCurrency } = useCurrency()

  // Navigation tabs
  const tabs = [
    {
      id: 'overview',
      name: 'Übersicht',
      href: `/analyse/stocks/${ticker.toLowerCase()}/estimates`,
      icon: ChartBarIcon
    },
    {
      id: 'revenue-earnings',
      name: 'Umsatz & Gewinn',
      href: `/analyse/stocks/${ticker.toLowerCase()}/estimates/revenue-earnings`,
      icon: CurrencyDollarIcon
    },
    {
      id: 'price-targets',
      name: 'Kursziele',
      href: `/analyse/stocks/${ticker.toLowerCase()}/estimates/price-targets`,
      icon: ArrowTrendingUpIcon
    },
    {
      id: 'surprises',
      name: 'Earnings Surprises',
      href: `/analyse/stocks/${ticker.toLowerCase()}/estimates/surprises`,
      icon: TrophyIcon
    }
  ]

  useEffect(() => {
    async function loadData() {
      // Load user
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('Error loading user:', error)
      }

      // Load surprises and calendar
      try {
        const [surprisesRes, calendarRes] = await Promise.all([
          fetch(`/api/earnings-surprises/${ticker}`),
          fetch(`/api/earnings-calendar/${ticker}`)
        ])

        if (surprisesRes.ok) {
          const data = await surprisesRes.json()
          setSurprises(data.slice(0, 20)) // Last 20 quarters
        }

        if (calendarRes.ok) {
          const data = await calendarRes.json()
          setCalendar(data.slice(0, 20))
        }
      } catch (error) {
        console.error('Error loading surprises:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [ticker])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Calculate surprise percentage
  const calculateSurprise = (actual: number, estimated: number) => {
    if (!estimated || estimated === 0) return 0
    return ((actual - estimated) / Math.abs(estimated)) * 100
  }

  // Helper function to format fiscal quarter properly for Google/Alphabet
  const formatQuarter = (dateString: string, fiscalDateEnding?: string) => {
    if (fiscalDateEnding) {
      const fiscalDate = new Date(fiscalDateEnding)
      const month = fiscalDate.getMonth() // 0-based: Jan=0, Feb=1, ..., Dec=11
      const year = fiscalDate.getFullYear()
      
      // Google's fiscal year = calendar year, but we need to map to "FQ" format like Seeking Alpha
      // Q1 = Jan-Mar (months 0,1,2), Q2 = Apr-Jun (months 3,4,5), etc.
      let quarter: number
      if (month >= 0 && month <= 2) quarter = 1      // Jan-Mar = Q1
      else if (month >= 3 && month <= 5) quarter = 2  // Apr-Jun = Q2  
      else if (month >= 6 && month <= 8) quarter = 3  // Jul-Sep = Q3
      else quarter = 4                                // Oct-Dec = Q4
      
      return `FQ${quarter} ${year}`
    }
    
    // Fallback to announcement date
    const date = new Date(dateString)
    const month = date.getMonth()
    const year = date.getFullYear()
    const quarter = Math.floor(month / 3) + 1
    return `Q${quarter} ${year.toString().slice(-2)}`
  }

  // Prepare EPS surprise data
  const epsSurpriseData = surprises.map(s => ({
    date: formatQuarter(s.date),
    surprise: calculateSurprise(s.actualEarningResult, s.estimatedEarning),
    actual: s.actualEarningResult,
    estimated: s.estimatedEarning,
    beat: s.actualEarningResult > s.estimatedEarning
  })).reverse()

  // Define interface for revenue surprise data
  interface RevenueSurpriseEntry {
    id: string
    date: string
    surprise: number
    actual: number
    estimated: number
    beat: boolean
    fiscalDateEnding: string
    originalDate: string
  }

  // Prepare revenue surprise data from calendar - with duplicate filtering
  const revenueSurpriseData = calendar
    .filter(c => c.revenue && c.revenueEstimated)
    .map((c, originalIndex) => {
      const surprise = calculateSurprise(c.revenue, c.revenueEstimated)
      const beat = c.revenue > c.revenueEstimated
      const formattedDate = formatQuarter(c.date, c.fiscalDateEnding)
      
      
      return {
        id: `revenue-${c.date}-${originalIndex}`,
        date: formattedDate,
        surprise: Number(surprise),
        actual: c.revenue,
        estimated: c.revenueEstimated,
        beat,
        fiscalDateEnding: c.fiscalDateEnding,
        originalDate: c.date
      }
    })
    .reduce((acc: RevenueSurpriseEntry[], current) => {
      // Remove duplicates and keep the most recent/relevant entry per quarter
      const existingIndex = acc.findIndex(item => item.date === current.date)
      
      if (existingIndex === -1) {
        // First entry for this quarter
        acc.push(current)
      } else {
        const existing = acc[existingIndex]
        
        // Keep the most recent entry for duplicate quarters
        if (new Date(current.originalDate) > new Date(existing.originalDate)) {
          acc[existingIndex] = current
        }
      }
      
      return acc
    }, [])
    .reverse()


  // Calculate statistics
  const epsBeats = epsSurpriseData.filter(d => d.beat).length
  const epsMisses = epsSurpriseData.filter(d => !d.beat).length
  const revenueBeats = revenueSurpriseData.filter(d => d.beat).length
  const revenueMisses = revenueSurpriseData.filter(d => !d.beat).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-theme-primary">Earnings Surprises</h2>
        <p className="text-theme-secondary mt-1">
          Historische Performance vs. Erwartungen für {ticker}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-theme/20">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname === tab.href
            
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-theme-secondary hover:text-theme-primary hover:border-theme/30'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-theme-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-theme-secondary text-sm">EPS Beats</span>
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{epsBeats}</div>
          <div className="text-xs text-theme-muted mt-1">
            {epsBeats + epsMisses > 0 
              ? `${((epsBeats / (epsBeats + epsMisses)) * 100).toFixed(0)}% Beat Rate`
              : 'Keine Daten'}
          </div>
        </div>

        <div className="bg-theme-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-theme-secondary text-sm">EPS Misses</span>
            <XCircleIcon className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{epsMisses}</div>
          <div className="text-xs text-theme-muted mt-1">
            Letzte {epsBeats + epsMisses} Quartale
          </div>
        </div>

        <div className="bg-theme-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-theme-secondary text-sm">Revenue Beats</span>
            <CheckCircleIcon className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{revenueBeats}</div>
          <div className="text-xs text-theme-muted mt-1">
            {revenueBeats + revenueMisses > 0
              ? `${((revenueBeats / (revenueBeats + revenueMisses)) * 100).toFixed(0)}% Beat Rate`
              : 'Keine Daten'}
          </div>
        </div>

        <div className="bg-theme-card rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-theme-secondary text-sm">Revenue Misses</span>
            <XCircleIcon className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{revenueMisses}</div>
          <div className="text-xs text-theme-muted mt-1">
            Letzte {revenueBeats + revenueMisses} Quartale
          </div>
        </div>
      </div>

      {/* EPS Surprise Chart */}
      {epsSurpriseData.length > 0 && (
        <div className="bg-theme-card rounded-lg p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">EPS Surprises (%)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={epsSurpriseData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="date" 
                stroke="var(--text-muted)"
                angle={-45}
                textAnchor="end"
              />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload
                  return (
                    <div className="bg-theme-card rounded-lg px-3 py-2 border border-theme">
                      <p className="text-theme-secondary text-xs mb-1">{data.date}</p>
                      <p className="text-theme-primary text-sm">
                        Tatsächlich: {formatStockPrice(data.actual)}
                      </p>
                      <p className="text-theme-muted text-sm">
                        Erwartet: {formatStockPrice(data.estimated)}
                      </p>
                      <p className={`text-sm font-bold ${
                        data.surprise >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Surprise: {formatPercentage(data.surprise)}
                      </p>
                    </div>
                  )
                }}
              />
              <ReferenceLine y={0} stroke="var(--text-muted)" />
              <Bar dataKey="surprise">
                {epsSurpriseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.surprise >= 0 ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue Surprise Chart */}
      {revenueSurpriseData.length > 0 && (
        <div className="bg-theme-card rounded-lg p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">Revenue Surprises (%)</h3>
          <ResponsiveContainer width="100%" height={350} key={`revenue-chart-${revenueSurpriseData.length}`}>
            <BarChart data={revenueSurpriseData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="date" 
                stroke="var(--text-muted)"
                angle={-45}
                textAnchor="end"
              />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload
                  
                  return (
                    <div className="bg-theme-card rounded-lg px-3 py-2 border border-theme">
                      <p className="text-theme-secondary text-xs mb-1">{data.date}</p>
                      <p className="text-theme-primary text-sm">
                        Tatsächlich: {(data.actual / 1e9).toFixed(2)} Mrd. $
                      </p>
                      <p className="text-theme-muted text-sm">
                        Erwartet: {(data.estimated / 1e9).toFixed(2)} Mrd. $
                      </p>
                      <p className={`text-sm font-bold ${
                        data.surprise >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        Surprise: {data.surprise.toFixed(2)}%
                      </p>
                    </div>
                  )
                }}
              />
              <ReferenceLine y={0} stroke="var(--text-muted)" />
              <Bar dataKey="surprise" fill="#10B981">
                {revenueSurpriseData.map((entry, index) => {
                  const color = entry.surprise >= 0 ? '#10B981' : '#EF4444'
                  
                  return (
                    <Cell 
                      key={entry.id || `revenue-cell-${index}`}
                      fill={color}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detailed Table */}
      {surprises.length > 0 && (
        <div className="bg-theme-card rounded-lg p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">Detaillierte Surprise-Historie</h3>
          <div className="overflow-x-auto">
            <table className="w-full professional-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th className="text-right">EPS Erwartet</th>
                  <th className="text-right">EPS Tatsächlich</th>
                  <th className="text-right">EPS Surprise</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {surprises.slice(0, 12).map((surprise, idx) => {
                  const surprisePercent = calculateSurprise(
                    surprise.actualEarningResult,
                    surprise.estimatedEarning
                  )
                  const beat = surprise.actualEarningResult > surprise.estimatedEarning
                  
                  return (
                    <tr key={idx}>
                      <td>{new Date(surprise.date).toLocaleDateString('de-DE')}</td>
                      <td className="text-right">{formatStockPrice(surprise.estimatedEarning)}</td>
                      <td className="text-right font-medium">{formatStockPrice(surprise.actualEarningResult)}</td>
                      <td className={`text-right font-bold ${
                        surprisePercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(surprisePercent)}
                      </td>
                      <td className="text-center">
                        {beat ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                            <CheckCircleIcon className="w-3 h-3" />
                            Beat
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
                            <XCircleIcon className="w-3 h-3" />
                            Miss
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Back Link */}
      <div className="text-center">
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}/estimates`}
          className="text-theme-secondary hover:text-theme-primary transition-colors"
        >
          ← Zurück zur Übersicht
        </Link>
      </div>
    </div>
  )
}