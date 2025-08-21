// src/components/RevisionsClient.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useCurrency } from '@/lib/CurrencyContext'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine
} from 'recharts'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface EstimateRevision {
  date: string
  period: string
  epsEstimate: number
  epsPreviousEstimate: number
  epsChange: number
  epsChangePercent: number
  revenueEstimate: number
  revenuePreviousEstimate: number
  revenueChange: number
  revenueChangePercent: number
  analystCount: number
}

interface RevisionSummary {
  epsUpRevisions: number
  epsDownRevisions: number
  epsNoChange: number
  revenueUpRevisions: number
  revenueDownRevisions: number
  revenueNoChange: number
  lastUpdated: string
}

export default function RevisionsClient({ ticker }: { ticker: string }) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [estimates, setEstimates] = useState<any[]>([])
  const [revisionHistory, setRevisionHistory] = useState<EstimateRevision[]>([])
  const [revisionSummary, setRevisionSummary] = useState<RevisionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const { formatCurrency, formatStockPrice, formatPercentage } = useCurrency()

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
    },
    {
      id: 'revisions',
      name: 'Revisions',
      href: `/analyse/stocks/${ticker.toLowerCase()}/estimates/revisions`,
      icon: ArrowPathIcon
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

      // Load estimates data for revision tracking
      try {
        const res = await fetch(`/api/estimates/${ticker}`)
        if (res.ok) {
          const data = await res.json()
          setEstimates(data)
          
          // Simuliere Revision History (in echten Anwendung würde das von API kommen)
          const mockRevisionHistory = generateMockRevisionHistory(data)
          setRevisionHistory(mockRevisionHistory)
          
          // Berechne Revision Summary
          const summary = calculateRevisionSummary(mockRevisionHistory)
          setRevisionSummary(summary)
        }
      } catch (error) {
        console.error('Error loading estimates:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [ticker])

  // Mock-Funktion für Revision History (würde normalerweise von API kommen)
  const generateMockRevisionHistory = (estimatesData: any[]): EstimateRevision[] => {
    const currentYear = new Date().getFullYear()
    const history: EstimateRevision[] = []
    
    // Generiere die letzten 6 Monate an Revisionen
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      
      estimatesData.slice(0, 4).forEach((estimate, idx) => {
        const year = parseInt(estimate.date.slice(0, 4))
        if (year >= currentYear && year <= currentYear + 2) {
          // Simuliere zufällige Änderungen
          const epsChange = (Math.random() - 0.5) * 0.2
          const revenueChange = (Math.random() - 0.5) * 1e9
          
          history.push({
            date: date.toISOString().slice(0, 10),
            period: `FY ${year}`,
            epsEstimate: estimate.estimatedEpsAvg + epsChange,
            epsPreviousEstimate: estimate.estimatedEpsAvg,
            epsChange: epsChange,
            epsChangePercent: (epsChange / estimate.estimatedEpsAvg) * 100,
            revenueEstimate: estimate.estimatedRevenueAvg + revenueChange,
            revenuePreviousEstimate: estimate.estimatedRevenueAvg,
            revenueChange: revenueChange,
            revenueChangePercent: (revenueChange / estimate.estimatedRevenueAvg) * 100,
            analystCount: estimate.numberAnalystEstimatedRevenue || 20
          })
        }
      })
    }
    
    return history
  }

  // Berechne Revision Summary
  const calculateRevisionSummary = (history: EstimateRevision[]): RevisionSummary => {
    const last3Months = history.filter(r => {
      const revDate = new Date(r.date)
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      return revDate >= threeMonthsAgo
    })

    return {
      epsUpRevisions: last3Months.filter(r => r.epsChange > 0).length,
      epsDownRevisions: last3Months.filter(r => r.epsChange < 0).length,
      epsNoChange: last3Months.filter(r => r.epsChange === 0).length,
      revenueUpRevisions: last3Months.filter(r => r.revenueChange > 0).length,
      revenueDownRevisions: last3Months.filter(r => r.revenueChange < 0).length,
      revenueNoChange: last3Months.filter(r => r.revenueChange === 0).length,
      lastUpdated: new Date().toISOString()
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Prepare data for EPS Revision Trend Chart
  const epsRevisionTrendData = estimates
    .filter(e => {
      const year = parseInt(e.date.slice(0, 4))
      return year >= new Date().getFullYear() && year <= new Date().getFullYear() + 3
    })
    .map(e => {
      const year = e.date.slice(0, 4)
      // Simuliere historische Revisionen
      const monthlyData = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const variation = 1 + (Math.random() - 0.5) * 0.1 // ±5% Variation
        monthlyData.push({
          month: date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
          [`FY${year}`]: e.estimatedEpsAvg * variation
        })
      }
      return monthlyData
    }).flat()

  // Gruppiere die Daten nach Monat
  const groupedEpsData = epsRevisionTrendData.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.month === curr.month)
    if (existing) {
      Object.assign(existing, curr)
    } else {
      acc.push(curr)
    }
    return acc
  }, [])

  // Prepare data for Revenue Revision Trend Chart
  const revenueRevisionTrendData = estimates
    .filter(e => {
      const year = parseInt(e.date.slice(0, 4))
      return year >= new Date().getFullYear() && year <= new Date().getFullYear() + 3
    })
    .map(e => {
      const year = e.date.slice(0, 4)
      const monthlyData = []
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const variation = 1 + (Math.random() - 0.5) * 0.05 // ±2.5% Variation
        monthlyData.push({
          month: date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
          [`FY${year}`]: e.estimatedRevenueAvg * variation / 1e9 // In Billions
        })
      }
      return monthlyData
    }).flat()

  // Gruppiere die Revenue Daten nach Monat
  const groupedRevenueData = revenueRevisionTrendData.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.month === curr.month)
    if (existing) {
      Object.assign(existing, curr)
    } else {
      acc.push(curr)
    }
    return acc
  }, [])

  const currentYear = new Date().getFullYear()
  const lineColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899']

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-theme-primary">Schätzungsrevisionen</h2>
        <p className="text-theme-secondary mt-1">
          Änderungen der Analystenprognosen für {ticker}
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

      {/* Revision Summary Cards */}
      {revisionSummary && (
        <div>
          <h3 className="text-lg font-semibold text-theme-primary mb-4">
            Revisionen der letzten 3 Monate
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* EPS Revisions */}
            <div className="bg-theme-card rounded-lg p-6">
              <h4 className="text-theme-primary font-semibold mb-4">EPS Revisionen</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <ArrowUpIcon className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {revisionSummary.epsUpRevisions}
                  </div>
                  <div className="text-xs text-theme-secondary">Erhöhungen</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <MinusIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-gray-400">
                    {revisionSummary.epsNoChange}
                  </div>
                  <div className="text-xs text-theme-secondary">Unverändert</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <ArrowDownIcon className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-red-400">
                    {revisionSummary.epsDownRevisions}
                  </div>
                  <div className="text-xs text-theme-secondary">Senkungen</div>
                </div>
              </div>
            </div>

            {/* Revenue Revisions */}
            <div className="bg-theme-card rounded-lg p-6">
              <h4 className="text-theme-primary font-semibold mb-4">Umsatz Revisionen</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <ArrowUpIcon className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {revisionSummary.revenueUpRevisions}
                  </div>
                  <div className="text-xs text-theme-secondary">Erhöhungen</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <MinusIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="text-2xl font-bold text-gray-400">
                    {revisionSummary.revenueNoChange}
                  </div>
                  <div className="text-xs text-theme-secondary">Unverändert</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <ArrowDownIcon className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-red-400">
                    {revisionSummary.revenueDownRevisions}
                  </div>
                  <div className="text-xs text-theme-secondary">Senkungen</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EPS Revision Trend Chart */}
      <div className="bg-theme-card rounded-lg">
        <div className="p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">EPS Konsens Revisionstrend</h3>
          <div className="flex flex-wrap gap-4 mb-4">
            {estimates.slice(0, 6).map((e, idx) => {
              const year = e.date.slice(0, 4)
              return (
                <div key={year} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: lineColors[idx] }}
                  />
                  <span className="text-sm text-theme-secondary">
                    FY {year}: {formatStockPrice(e.estimatedEpsAvg)}
                  </span>
                </div>
              )
            })}
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={groupedEpsData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => formatStockPrice(value)}
              />
              <Legend />
              
              {estimates.slice(0, 6).map((e, idx) => {
                const year = e.date.slice(0, 4)
                return (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={`FY${year}`}
                    stroke={lineColors[idx]}
                    strokeWidth={2}
                    dot={false}
                    name={`FY ${year}`}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="px-6 pb-4 flex justify-end">
          <span className="text-xs text-theme-muted">Powered by FinClue</span>
        </div>
      </div>

      {/* Revenue Revision Trend Chart */}
      <div className="bg-theme-card rounded-lg">
        <div className="p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">Umsatz Konsens Revisionstrend</h3>
          <div className="flex flex-wrap gap-4 mb-4">
            {estimates.slice(0, 6).map((e, idx) => {
              const year = e.date.slice(0, 4)
              return (
                <div key={year} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: lineColors[idx] }}
                  />
                  <span className="text-sm text-theme-secondary">
                    FY {year}: {formatCurrency(e.estimatedRevenueAvg)}
                  </span>
                </div>
              )
            })}
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={groupedRevenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => `$${value.toFixed(2)}B`}
              />
              <Legend />
              
              {estimates.slice(0, 6).map((e, idx) => {
                const year = e.date.slice(0, 4)
                return (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={`FY${year}`}
                    stroke={lineColors[idx]}
                    strokeWidth={2}
                    dot={false}
                    name={`FY ${year}`}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="px-6 pb-4 flex justify-end">
          <span className="text-xs text-theme-muted">Powered by FinClue</span>
        </div>
      </div>

      {/* Detailed Estimates Table with Trends */}
      <div className="bg-theme-card rounded-lg">
        <div className="p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">Detaillierte Schätzungen mit Trends</h3>
          <div className="overflow-x-auto">
            <table className="w-full professional-table">
              <thead>
                <tr>
                  <th>Geschäftsjahr</th>
                  <th className="text-right">EPS Schätzung</th>
                  <th className="text-right">YoY Wachstum</th>
                  <th className="text-right">1M Trend</th>
                  <th className="text-right">3M Trend</th>
                  <th className="text-right">Umsatz Schätzung</th>
                  <th className="text-right">YoY Wachstum</th>
                </tr>
              </thead>
              <tbody>
                {estimates.slice(0, 6).map((e, idx) => {
                  const year = parseInt(e.date.slice(0, 4))
                  const prevEstimate = estimates[idx + 1]
                  const epsGrowth = prevEstimate 
                    ? ((e.estimatedEpsAvg - prevEstimate.estimatedEpsAvg) / prevEstimate.estimatedEpsAvg) * 100
                    : 0
                  const revenueGrowth = prevEstimate
                    ? ((e.estimatedRevenueAvg - prevEstimate.estimatedRevenueAvg) / prevEstimate.estimatedRevenueAvg) * 100
                    : 0
                  
                  // Simuliere Trends
                  const trend1M = (Math.random() - 0.5) * 5
                  const trend3M = (Math.random() - 0.5) * 10
                  
                  return (
                    <tr key={e.date}>
                      <td className="font-medium">FY {year}</td>
                      <td className="text-right">{formatStockPrice(e.estimatedEpsAvg)}</td>
                      <td className={`text-right font-medium ${
                        epsGrowth >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(epsGrowth)}
                      </td>
                      <td className={`text-right ${
                        trend1M >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trend1M >= 0 ? '+' : ''}{trend1M.toFixed(2)}%
                      </td>
                      <td className={`text-right ${
                        trend3M >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trend3M >= 0 ? '+' : ''}{trend3M.toFixed(2)}%
                      </td>
                      <td className="text-right">{formatCurrency(e.estimatedRevenueAvg)}</td>
                      <td className={`text-right font-medium ${
                        revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatPercentage(revenueGrowth)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="px-6 pb-4 flex justify-end">
          <span className="text-xs text-theme-muted">Powered by FinClue</span>
        </div>
      </div>

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