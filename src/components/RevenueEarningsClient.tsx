// src/components/RevenueEarningsClient.tsx - VOLLSTÄNDIGE VERSION MIT VERBINDUNGSLINIE
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface HistoricalDataItem {
  date: string
  year: number
  revenue: number
  eps: number
  netIncome: number
}

interface ChartDataPoint {
  year: string
  actualRevenue?: number | null
  revenue?: number | null
  revenueHigh?: number | null
  revenueLow?: number | null
  actualEps?: number | null
  eps?: number | null
  epsHigh?: number | null
  epsLow?: number | null
  isHistorical: boolean
  isPremiumOnly?: boolean
  isTransition?: boolean
}

export default function RevenueEarningsClient({ ticker }: { ticker: string }) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [estimates, setEstimates] = useState<any[]>([])
  const [historicalData, setHistoricalData] = useState<HistoricalDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const { formatCurrency, formatStockPrice } = useCurrency()

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

      // Load estimates and historical data
      try {
        const [estimatesRes, incomeRes] = await Promise.all([
          fetch(`/api/estimates/${ticker}`),
          fetch(`/api/income-statement/${ticker}?limit=5`)
        ])

        if (estimatesRes.ok) {
          const data = await estimatesRes.json()
          const currentYear = new Date().getFullYear()
          const futureEstimates = data
            .filter((e: any) => parseInt(e.date.slice(0, 4)) >= currentYear)
            .sort((a: any, b: any) => a.date.localeCompare(b.date))
          setEstimates(futureEstimates)
        }

        if (incomeRes.ok) {
          const incomeData = await incomeRes.json()
          const historical: HistoricalDataItem[] = incomeData
            .map((item: any) => ({
              date: item.date,
              year: new Date(item.date).getFullYear(),
              revenue: item.revenue,
              eps: item.eps || item.epsdiluted,
              netIncome: item.netIncome
            }))
            .filter((item: HistoricalDataItem) => item.year >= new Date().getFullYear() - 4)
            .sort((a: HistoricalDataItem, b: HistoricalDataItem) => a.year - b.year)
          setHistoricalData(historical)
        }
      } catch (error) {
        console.error('Error loading data:', error)
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

  const currentYear = new Date().getFullYear()
  const isPremium = user?.isPremium || false

  // Hole den letzten historischen Wert für die Verbindung
  const lastHistoricalRevenue = historicalData.length > 0 
    ? historicalData[historicalData.length - 1].revenue / 1e9
    : null

  const lastHistoricalEps = historicalData.length > 0
    ? historicalData[historicalData.length - 1].eps
    : null

  // Kombiniere historische und geschätzte Daten für Revenue Chart
  const revenueChartData: ChartDataPoint[] = [
    // Historische Daten
    ...historicalData.map(h => ({
      year: h.year.toString(),
      actualRevenue: h.revenue / 1e9,
      revenue: null,
      revenueHigh: null,
      revenueLow: null,
      isHistorical: true
    })),
    // Verbindungspunkt für aktuelles Jahr (wenn es Schätzungen gibt)
    ...(estimates.length > 0 && estimates[0].date.slice(0, 4) === currentYear.toString() ? [{
      year: currentYear.toString(),
      actualRevenue: lastHistoricalRevenue,
      revenue: estimates[0].estimatedRevenueAvg / 1e9,
      revenueHigh: estimates[0].estimatedRevenueHigh / 1e9,
      revenueLow: estimates[0].estimatedRevenueLow / 1e9,
      isHistorical: false,
      isTransition: true
    }] : []),
    // Zukünftige Schätzungen
    ...estimates
      .filter(e => parseInt(e.date.slice(0, 4)) > currentYear)
      .map((e, index) => {
        const isPremiumOnly = !isPremium && index > 1
        
        return {
          year: e.date.slice(0, 4),
          actualRevenue: null,
          revenue: isPremiumOnly ? null : e.estimatedRevenueAvg / 1e9,
          revenueHigh: isPremiumOnly ? null : e.estimatedRevenueHigh / 1e9,
          revenueLow: isPremiumOnly ? null : e.estimatedRevenueLow / 1e9,
          isHistorical: false,
          isPremiumOnly
        }
      })
  ]

  // Kombiniere historische und geschätzte Daten für EPS Chart
  const epsChartData: ChartDataPoint[] = [
    // Historische Daten
    ...historicalData.map(h => ({
      year: h.year.toString(),
      actualEps: h.eps,
      eps: null,
      epsHigh: null,
      epsLow: null,
      isHistorical: true
    })),
    // Verbindungspunkt für aktuelles Jahr
    ...(estimates.length > 0 && estimates[0].date.slice(0, 4) === currentYear.toString() ? [{
      year: currentYear.toString(),
      actualEps: lastHistoricalEps,
      eps: estimates[0].estimatedEpsAvg,
      epsHigh: estimates[0].estimatedEpsHigh,
      epsLow: estimates[0].estimatedEpsLow,
      isHistorical: false,
      isTransition: true
    }] : []),
    // Zukünftige Schätzungen
    ...estimates
      .filter(e => parseInt(e.date.slice(0, 4)) > currentYear)
      .map((e, index) => {
        const isPremiumOnly = !isPremium && index > 1
        
        return {
          year: e.date.slice(0, 4),
          actualEps: null,
          eps: isPremiumOnly ? null : e.estimatedEpsAvg,
          epsHigh: isPremiumOnly ? null : e.estimatedEpsHigh,
          epsLow: isPremiumOnly ? null : e.estimatedEpsLow,
          isHistorical: false,
          isPremiumOnly
        }
      })
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-theme-primary">Umsatz & Gewinn Prognosen</h2>
        <p className="text-theme-secondary mt-1">
          Historische Daten und Konsens-Schätzungen für {ticker}
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
                    ? 'border-green-500 text-brand-light'
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

      {/* Revenue Chart */}
      <div className="bg-theme-card rounded-lg relative">
        <div className="p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">Umsatzentwicklung (in Mrd. USD)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={revenueChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="year" 
                stroke="var(--text-muted)"
              />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value: any, name: string) => {
                  if (value === null) return ['–', name]
                  return [`$${value.toFixed(2)}B`, name]
                }}
              />
              <Legend />
              
              <ReferenceLine 
                x={currentYear.toString()} 
                stroke="var(--text-muted)" 
                strokeDasharray="3 3"
                label={{ value: "Aktuell", position: "top" }}
              />
              
              {/* Historische Linie (durchgezogen) */}
              <Line
                type="monotone"
                dataKey="actualRevenue"
                stroke="#10B981"
                strokeWidth={3}
                name="Tatsächlich"
                dot={{ fill: '#10B981', r: 4 }}
                connectNulls={true}
              />
              
              {/* Prognose Linie (gestrichelt) */}
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Konsens-Prognose"
                dot={{ fill: '#10B981', r: 4 }}
                connectNulls={true}
              />
              
              {/* Prognose Bereich */}
              <Line
                type="monotone"
                dataKey="revenueHigh"
                stroke="#10B981"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                name="Hoch"
                dot={false}
                connectNulls={true}
              />
              <Line
                type="monotone"
                dataKey="revenueLow"
                stroke="#10B981"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                name="Niedrig"
                dot={false}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
          
          {/* Premium Blur Overlay */}
          {!isPremium && (
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-theme-card via-theme-card/95 to-transparent pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-theme-card/90 backdrop-blur-sm rounded-lg p-4 text-center pointer-events-auto">
                  <LockClosedIcon className="w-8 h-8 text-brand mx-auto mb-2" />
                  <p className="text-theme-primary font-semibold mb-1">Premium Feature</p>
                  <p className="text-theme-secondary text-sm mb-3">
                    Langfristige Prognosen
                  </p>
                  <Link
                    href="/pricing"
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    Upgrade für mehr
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 pb-4 flex justify-end">
          <span className="text-xs text-theme-muted">Powered by FinClue</span>
        </div>
      </div>

      {/* EPS Chart */}
      <div className="bg-theme-card rounded-lg relative">
        <div className="p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">Gewinn je Aktie (EPS) Entwicklung</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={epsChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="year" 
                stroke="var(--text-muted)"
              />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value: any, name: string) => {
                  if (value === null) return ['–', name]
                  return [`$${value.toFixed(2)}`, name]
                }}
              />
              <Legend />
              
              <ReferenceLine 
                x={currentYear.toString()} 
                stroke="var(--text-muted)" 
                strokeDasharray="3 3"
                label={{ value: "Aktuell", position: "top" }}
              />
              
              {/* Historische Linie (durchgezogen) */}
              <Line
                type="monotone"
                dataKey="actualEps"
                stroke="#3B82F6"
                strokeWidth={3}
                name="Tatsächlich"
                dot={{ fill: '#3B82F6', r: 4 }}
                connectNulls={true}
              />
              
              {/* Prognose Linie (gestrichelt) */}
              <Line
                type="monotone"
                dataKey="eps"
                stroke="#3B82F6"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Konsens-Prognose"
                dot={{ fill: '#3B82F6', r: 4 }}
                connectNulls={true}
              />
              
              {/* Prognose Bereich */}
              <Line
                type="monotone"
                dataKey="epsHigh"
                stroke="#3B82F6"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                name="Hoch"
                dot={false}
                connectNulls={true}
              />
              <Line
                type="monotone"
                dataKey="epsLow"
                stroke="#3B82F6"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
                name="Niedrig"
                dot={false}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
          
          {/* Premium Blur Overlay */}
          {!isPremium && (
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-theme-card via-theme-card/95 to-transparent pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-theme-card/90 backdrop-blur-sm rounded-lg p-4 text-center pointer-events-auto">
                  <LockClosedIcon className="w-8 h-8 text-brand mx-auto mb-2" />
                  <p className="text-theme-primary font-semibold mb-1">Premium Feature</p>
                  <p className="text-theme-secondary text-sm mb-3">
                    Langfristige Prognosen
                  </p>
                  <Link
                    href="/pricing"
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    Upgrade für mehr
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 pb-4 flex justify-end">
          <span className="text-xs text-theme-muted">Powered by FinClue</span>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-theme-card rounded-lg">
        <div className="p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">Detaillierte Daten & Schätzungen</h3>
          <div className="overflow-x-auto">
            <table className="w-full professional-table">
              <thead>
                <tr>
                  <th>Jahr</th>
                  <th className="text-center">Typ</th>
                  <th className="text-right">Umsatz</th>
                  <th className="text-right">Umsatz (Bereich)</th>
                  <th className="text-right">EPS</th>
                  <th className="text-right">EPS (Bereich)</th>
                  <th className="text-right">Analysten</th>
                </tr>
              </thead>
              <tbody>
                {/* Historische Daten */}
                {historicalData.map((h) => (
                  <tr key={h.date} className="bg-theme-secondary/20">
                    <td className="font-medium">{h.year}</td>
                    <td className="text-center">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                        Tatsächlich
                      </span>
                    </td>
                    <td className="text-right">{formatCurrency(h.revenue)}</td>
                    <td className="text-right text-theme-muted">–</td>
                    <td className="text-right">{formatStockPrice(h.eps)}</td>
                    <td className="text-right text-theme-muted">–</td>
                    <td className="text-right text-theme-muted">–</td>
                  </tr>
                ))}
                
                {/* Prognosen */}
                {estimates.map((e, index) => {
                  const year = parseInt(e.date.slice(0, 4))
                  const isCurrentYear = year === currentYear
                  const isPremiumOnly = !isPremium && index > 2
                  
                  if (isPremiumOnly) {
                    return (
                      <tr key={e.date} className="opacity-50">
                        <td className="font-medium">{year}</td>
                        <td className="text-center">
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs">
                            Premium
                          </span>
                        </td>
                        <td colSpan={5} className="text-center">
                          <Link href="/pricing" className="text-brand-light hover:text-green-300">
                            🔒 Upgrade für erweiterte Prognosen
                          </Link>
                        </td>
                      </tr>
                    )
                  }
                  
                  return (
                    <tr key={e.date} className={isCurrentYear ? 'bg-brand/5' : ''}>
                      <td className="font-medium">{year}</td>
                      <td className="text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          isCurrentYear 
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-brand/20 text-brand-light'
                        }`}>
                          {isCurrentYear ? 'Laufend' : 'Prognose'}
                        </span>
                      </td>
                      <td className="text-right">{formatCurrency(e.estimatedRevenueAvg)}</td>
                      <td className="text-right text-theme-secondary">
                        {formatCurrency(e.estimatedRevenueLow)} - {formatCurrency(e.estimatedRevenueHigh)}
                      </td>
                      <td className="text-right">{formatStockPrice(e.estimatedEpsAvg)}</td>
                      <td className="text-right text-theme-secondary">
                        {formatStockPrice(e.estimatedEpsLow)} - {formatStockPrice(e.estimatedEpsHigh)}
                      </td>
                      <td className="text-right text-theme-muted">
                        {e.numberAnalystEstimatedRevenue || '–'}
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