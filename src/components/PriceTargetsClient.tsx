// src/components/PriceTargetsClient.tsx - VERBESSERTE VERSION
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ComposedChart
} from 'recharts'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  LockClosedIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface PriceTarget {
  analystName: string
  analystCompany: string
  priceTarget: number
  priceWhenPosted: number
  publishedDate: string
  newsTitle: string
  newsURL: string
}

interface PriceTargetConsensus {
  targetHigh: number
  targetLow: number
  targetConsensus: number
  targetMedian: number
}

export default function PriceTargetsClient({ ticker }: { ticker: string }) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [priceTargets, setPriceTargets] = useState<PriceTarget[]>([])
  const [consensus, setConsensus] = useState<PriceTargetConsensus | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [historicalPrices, setHistoricalPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { formatStockPrice, formatPercentage } = useCurrency()

  // Navigation tabs - mit neuer Revisions Seite
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

      // Load price targets and current price
      try {
        const [targetsRes, quoteRes, historicalRes] = await Promise.all([
          fetch(`/api/price-targets/${ticker}`),
          fetch(`/api/quote/${ticker}`),
          fetch(`/api/historical/${ticker}`)
        ])

        if (targetsRes.ok) {
          const data = await targetsRes.json()
          setPriceTargets(data.targets || [])
          setConsensus(data.consensus)
        }

        if (quoteRes.ok) {
          const [quote] = await quoteRes.json()
          setCurrentPrice(quote.price)
        }

        if (historicalRes.ok) {
          const { historical } = await historicalRes.json()
          // Get last 6 months of data
          const last6Months = historical.slice(0, 126).reverse()
          setHistoricalPrices(last6Months)
        }
      } catch (error) {
        console.error('Error loading price targets:', error)
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

  const upside = consensus && currentPrice
    ? ((consensus.targetConsensus - currentPrice) / currentPrice) * 100
    : 0

  const isPremium = user?.isPremium || false

  // Erweiterte Chart-Daten mit Zukunftsprognose
  const today = new Date()
  const futureMonths = 12 // 12 Monate in die Zukunft
  
  // Historische Daten
  const historicalChartData = historicalPrices.map(hp => ({
    date: new Date(hp.date).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
    price: hp.close,
    consensus: null,
    high: null,
    low: null,
    median: null,
    isHistorical: true
  }))

  // Füge Zukunftsdaten hinzu
  const futureData = []
  for (let i = 0; i <= futureMonths; i++) {
    const futureDate = new Date(today)
    futureDate.setMonth(today.getMonth() + i)
    
    const isPremiumOnly = !isPremium && i > 3 // Nur 3 Monate für Free User
    
    futureData.push({
      date: futureDate.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
      price: null,
      consensus: isPremiumOnly ? null : consensus?.targetConsensus,
      high: isPremiumOnly ? null : consensus?.targetHigh,
      low: isPremiumOnly ? null : consensus?.targetLow,
      median: isPremiumOnly ? null : consensus?.targetMedian,
      isHistorical: false,
      isPremiumOnly
    })
  }

  const chartData = [...historicalChartData, ...futureData]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-theme-primary">Analysten Kursziele</h2>
        <p className="text-theme-secondary mt-1">
          Kurszielprognosen und Konsens für {ticker}
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

      {/* Key Metrics Cards */}
      {consensus && currentPrice && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-theme-card rounded-lg p-4">
            <div className="text-theme-secondary text-sm mb-1">Aktueller Kurs</div>
            <div className="text-2xl font-bold text-theme-primary">
              {formatStockPrice(currentPrice)}
            </div>
          </div>

          <div className="bg-theme-card rounded-lg p-4">
            <div className="text-theme-secondary text-sm mb-1">Konsens-Kursziel</div>
            <div className="text-2xl font-bold text-brand-light">
              {formatStockPrice(consensus.targetConsensus)}
            </div>
          </div>

          <div className="bg-theme-card rounded-lg p-4">
            <div className="text-theme-secondary text-sm mb-1">Potenzial</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${
              upside >= 0 ? 'text-brand-light' : 'text-red-400'
            }`}>
              {upside >= 0 ? <ArrowUpIcon className="w-5 h-5" /> : <ArrowDownIcon className="w-5 h-5" />}
              {formatPercentage(upside)}
            </div>
          </div>

          <div className="bg-theme-card rounded-lg p-4">
            <div className="text-theme-secondary text-sm mb-1">Spanne</div>
            <div className="text-sm">
              <span className="text-red-400">{formatStockPrice(consensus.targetLow)}</span>
              <span className="text-theme-secondary mx-2">–</span>
              <span className="text-brand-light">{formatStockPrice(consensus.targetHigh)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Improved Price Target Chart */}
      <div className="bg-theme-card rounded-lg relative">
        <div className="p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">Kursverlauf mit Kurszielen</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey="date" 
                stroke="var(--text-muted)"
                interval={Math.floor(chartData.length / 12)}
              />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => value ? formatStockPrice(value) : '–'}
              />
              <Legend />
              
              {/* Vertikale Linie für heute */}
              <ReferenceLine 
                x={today.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}
                stroke="var(--text-muted)" 
                strokeDasharray="3 3"
                label={{ value: "Heute", position: "top" }}
              />
              
              {/* Historischer Preis */}
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorPrice)"
                strokeWidth={2}
                name="Aktienkurs"
              />
              
              {/* Konsens-Ziel (gestrichelt für Zukunft) */}
              <Line
                type="monotone"
                dataKey="consensus"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Konsens-Ziel"
              />
              
              {/* Höchstes Ziel */}
              <Line
                type="monotone"
                dataKey="high"
                stroke="#10B981"
                strokeWidth={1}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                dot={false}
                name="Höchstes Ziel"
              />
              
              {/* Niedrigstes Ziel */}
              <Line
                type="monotone"
                dataKey="low"
                stroke="#EF4444"
                strokeWidth={1}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                dot={false}
                name="Niedrigstes Ziel"
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          {/* Premium Blur Overlay */}
          {!isPremium && (
            <div className="absolute right-0 top-0 bottom-0 w-2/3 bg-gradient-to-l from-theme-card via-theme-card/95 to-transparent pointer-events-none">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-theme-card/90 backdrop-blur-sm rounded-lg p-4 text-center pointer-events-auto">
                  <LockClosedIcon className="w-8 h-8 text-brand mx-auto mb-2" />
                  <p className="text-theme-primary font-semibold mb-1">Premium Feature</p>
                  <p className="text-theme-secondary text-sm mb-3">
                    Langfristige Kursziele
                  </p>
                  <Link
                    href="/pricing"
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    Upgrade für 12-Monats-Prognose
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 pb-4 flex justify-end">
          <span className="text-xs text-theme-muted">Powered by Finclue</span>
        </div>
      </div>

      {/* Recent Price Targets Table */}
      {priceTargets.length > 0 && (
        <div className="bg-theme-card rounded-lg">
          <div className="p-6">
            <h3 className="text-xl font-bold text-theme-primary mb-6">Aktuelle Kursziele von Analysten</h3>
            <div className="overflow-x-auto">
              <table className="w-full professional-table">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Analyst</th>
                    <th>Firma</th>
                    <th className="text-right">Kursziel</th>
                    <th className="text-right">Kurs bei Veröffentlichung</th>
                    <th className="text-right">Potenzial</th>
                  </tr>
                </thead>
                <tbody>
                  {priceTargets.slice(0, isPremium ? 20 : 10).map((target, idx) => {
                    const targetUpside = ((target.priceTarget - target.priceWhenPosted) / target.priceWhenPosted) * 100
                    
                    return (
                      <tr key={idx}>
                        <td>{new Date(target.publishedDate).toLocaleDateString('de-DE')}</td>
                        <td className="font-medium">{target.analystName}</td>
                        <td className="text-theme-secondary">{target.analystCompany}</td>
                        <td className="text-right font-bold">{formatStockPrice(target.priceTarget)}</td>
                        <td className="text-right text-theme-secondary">
                          {formatStockPrice(target.priceWhenPosted)}
                        </td>
                        <td className={`text-right font-medium ${
                          targetUpside >= 0 ? 'text-brand-light' : 'text-red-400'
                        }`}>
                          {formatPercentage(targetUpside)}
                        </td>
                      </tr>
                    )
                  })}
                  {!isPremium && priceTargets.length > 10 && (
                    <tr>
                      <td colSpan={6} className="text-center py-4">
                        <Link href="/pricing" className="text-brand-light hover:text-green-300">
                          🔒 Upgrade für alle {priceTargets.length} Kursziele
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="px-6 pb-4 flex justify-end">
            <span className="text-xs text-theme-muted">Powered by Finclue</span>
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