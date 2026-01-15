// src/components/EstimatesClient.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useCurrency } from '@/lib/CurrencyContext'
import Link from 'next/link'
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
  Area,
  AreaChart,
  ReferenceLine
} from 'recharts'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface EstimatesClientProps {
  ticker: string
}

export default function EstimatesClient({ ticker }: EstimatesClientProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [estimates, setEstimates] = useState<any[]>([])
  const [priceTargets, setPriceTargets] = useState<any>(null)
  const [surprises, setSurprises] = useState<any[]>([])
  const [earningsCalendar, setEarningsCalendar] = useState<any[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  
  const { formatCurrency, formatStockPrice, formatPercentage } = useCurrency()

  // Load user data
  useEffect(() => {
    async function loadUser() {
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
        console.error('[EstimatesClient] Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  // Load all data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      
      try {
        // Load all data in parallel
        const [
          estimatesRes,
          priceTargetsRes,
          surprisesRes,
          calendarRes,
          quoteRes
        ] = await Promise.all([
          fetch(`/api/estimates/${ticker}`),
          fetch(`/api/price-targets/${ticker}`),
          fetch(`/api/earnings-surprises/${ticker}`),
          fetch(`/api/earnings-calendar/${ticker}`),
          fetch(`/api/quote/${ticker}`)
        ])

        if (estimatesRes.ok) {
          const data = await estimatesRes.json()
          setEstimates(data)
        }

        if (priceTargetsRes.ok) {
          const data = await priceTargetsRes.json()
          setPriceTargets(data)
        }

        if (surprisesRes.ok) {
          const data = await surprisesRes.json()
          setSurprises(data.slice(0, 12)) // Last 12 quarters
        }

        if (calendarRes.ok) {
          const data = await calendarRes.json()
          setEarningsCalendar(data)
        }

        if (quoteRes.ok) {
          const data = await quoteRes.json()
          setCurrentPrice(data[0]?.price || null)
        }

      } catch (error) {
        console.error('Error loading estimates data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [ticker])

  if (loadingUser || loading) {
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-theme-primary">Analysten-Schätzungen</h2>
        <p className="text-theme-secondary mt-1">
          Detaillierte Prognosen und Kursziele für {ticker}
        </p>
      </div>

      {/* Price Targets Section */}
      {priceTargets?.consensus && currentPrice && (
        <div className="bg-theme-card rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <h3 className="text-xl font-bold text-theme-primary">Kursziele</h3>
            <div className="relative group">
              <InformationCircleIcon className="w-4 h-4 text-theme-muted cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50">
                <div className="bg-theme-card border border-white/10 rounded-lg px-3 py-2 text-xs text-theme-secondary w-64 shadow-lg">
                  Kursziele basieren auf Schätzungen von Wall Street Analysten (Goldman Sachs, Morgan Stanley, JP Morgan u.a.), aggregiert über Financial Modeling Prep.
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current vs Target */}
            <div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary">Aktueller Kurs</span>
                  <span className="text-xl font-bold text-theme-primary">
                    {formatStockPrice(currentPrice)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary">Konsens-Kursziel</span>
                  <span className="text-xl font-bold text-brand-light">
                    {formatStockPrice(priceTargets.consensus.targetConsensus)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary">Potenzial</span>
                  <span className={`text-xl font-bold ${
                    priceTargets.consensus.targetConsensus > currentPrice 
                      ? 'text-brand-light' 
                      : 'text-red-400'
                  }`}>
                    {formatPercentage(
                      ((priceTargets.consensus.targetConsensus - currentPrice) / currentPrice) * 100
                    )}
                  </span>
                </div>
                
                <div className="pt-4 border-t border-theme/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-theme-muted text-sm">Niedrigstes Ziel</span>
                    <span className="text-red-400 font-medium">
                      {formatStockPrice(priceTargets.consensus.targetLow)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-theme-muted text-sm">Median</span>
                    <span className="text-theme-primary font-medium">
                      {formatStockPrice(priceTargets.consensus.targetMedian)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-theme-muted text-sm">Höchstes Ziel</span>
                    <span className="text-brand-light font-medium">
                      {formatStockPrice(priceTargets.consensus.targetHigh)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Price Target Chart */}
            <div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart
                  data={[
                    { name: 'Low', value: priceTargets.consensus.targetLow },
                    { name: 'Current', value: currentPrice },
                    { name: 'Median', value: priceTargets.consensus.targetMedian },
                    { name: 'Consensus', value: priceTargets.consensus.targetConsensus },
                    { name: 'High', value: priceTargets.consensus.targetHigh }
                  ]}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" />
                  <YAxis stroke="var(--text-muted)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.3}
                  />
                  <ReferenceLine 
                    y={currentPrice} 
                    stroke="#3B82F6" 
                    strokeDasharray="5 5"
                    label="Aktuell"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

    {/* Earnings Surprise Section */}
{surprises.length > 0 && (
  <div className="bg-theme-card rounded-lg p-6">
    <h3 className="text-xl font-bold text-theme-primary mb-6">Earnings Surprises</h3>
    
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={surprises.map(s => ({
          date: new Date(s.date).toLocaleDateString('de-DE', { 
            month: 'short', 
            year: '2-digit' 
          }),
          surprise: calculateSurprise(s.actualEarningResult, s.estimatedEarning),
          actual: s.actualEarningResult,
          estimated: s.estimatedEarning
        })).reverse()}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" stroke="var(--text-muted)" />
        <YAxis stroke="var(--text-muted)" />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null
            const data = payload[0].payload
            return (
              <div className="bg-theme-card rounded-lg px-3 py-2 border border-theme">
                <p className="text-theme-secondary text-xs mb-1">{data.date}</p>
                <p className="text-theme-primary text-sm">
                  Actual: {formatStockPrice(data.actual)}
                </p>
                <p className="text-theme-muted text-sm">
                  Estimated: {formatStockPrice(data.estimated)}
                </p>
                <p className={`text-sm font-bold ${
                  data.surprise >= 0 ? 'text-brand-light' : 'text-red-400'
                }`}>
                  Surprise: {formatPercentage(data.surprise)}
                </p>
              </div>
            )
          }}
        />
        <Bar 
          dataKey="surprise" 
          fill="#10B981"
          shape={(props: any) => {
            const { fill, x, y, width, height } = props
            const actualFill = props.payload.surprise >= 0 ? '#10B981' : '#EF4444'
            return (
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={actualFill}
              />
            )
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
)}

      {/* Link back to main analysis */}
      <div className="text-center">
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}`}
          className="text-theme-secondary hover:text-theme-primary transition-colors"
        >
          ← Zurück zur Übersicht
        </Link>
      </div>
    </div>
  )
}