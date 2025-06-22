// src/app/analyse/stocks/[ticker]/dividends/page.tsx - THEME-OPTIMIERTE VERSION
'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BanknotesIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  CalendarIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,

} from '@heroicons/react/24/outline'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
  Cell
} from 'recharts'
import LoadingSpinner from '@/components/LoadingSpinner'

interface DividendData {
  year: number
  dividendPerShare: number
  dividendYield: number
  payoutRatio: number
  growth: number
  exDate: string
  payDate: string
}

interface User {
  id: string
  email: string
  isPremium: boolean
}

export default function DividendsPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dividendData, setDividendData] = useState<DividendData[]>([])
  const [currentDividend, setCurrentDividend] = useState<any>(null)
  const [safetyScore, setSafetyScore] = useState<number | null>(null)
  const [yearsWithoutCut, setYearsWithoutCut] = useState<number>(0)

  // User laden
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
        console.error('Error loading user:', error)
      }
    }
    loadUser()
  }, [])

  // Dividenden-Daten laden
  useEffect(() => {
    async function loadDividendData() {
      setLoading(true)
      setError(null)
  
      try {
        console.log(`🔍 Loading dividend data for ${ticker}...`)
  
        // 1. Financial API versuchen
        let financialData: any[] = []
        let keyMetrics: any = {}
  
        try {
          const financialRes = await fetch(`/api/financials/${ticker}?period=annual&limit=10`)
          if (financialRes.ok) {
            const data = await financialRes.json()
            financialData = data.data || []
            keyMetrics = data.keyMetrics || {}
            console.log('✅ Financial API successful:', { dataLength: financialData.length, keyMetrics })
          } else {
            console.warn('❌ Financial API failed:', financialRes.status)
          }
        } catch (err) {
          console.warn('❌ Financial API error:', err)
        }
  
        // 2. Dividenden-Historie versuchen
        let yearlyDividends: Record<string, number> = {}
        try {
          const dividendRes = await fetch(
            `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          )
          if (dividendRes.ok) {
            const dividendJson = await dividendRes.json()
            const histDiv = Array.isArray(dividendJson[0]?.historical)
              ? dividendJson[0].historical
              : Array.isArray(dividendJson.historical)
              ? dividendJson.historical
              : []
  
            histDiv.forEach((d: any) => {
              const year = d.date.slice(0, 4)
              yearlyDividends[year] = (yearlyDividends[year] || 0) + (d.adjDividend || d.dividend || 0)
            })
  
            console.log('✅ Dividend API successful:', Object.keys(yearlyDividends).length, 'years')
          } else {
            console.warn('❌ Dividend API failed:', dividendRes.status)
          }
        } catch (err) {
          console.warn('❌ Dividend API error:', err)
        }
  
        // 3. Aktuellen Kurs holen
        let currentPrice = 100 // fallback
        try {
          const quoteRes = await fetch(
            `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          )
          if (quoteRes.ok) {
            const [quote] = await quoteRes.json()
            currentPrice = quote?.price || 100
            console.log('✅ Quote API successful:', currentPrice)
          } else {
            console.warn('❌ Quote API failed:', quoteRes.status)
          }
        } catch (err) {
          console.warn('❌ Quote API error:', err)
        }
  
        // 4. Daten verarbeiten
        let combinedData: DividendData[] = []
  
        if (financialData.length > 0 && Object.keys(yearlyDividends).length > 0) {
          const sortedFinancialData = [...financialData]
            .filter((row: any) => row.year && yearlyDividends[row.year])
            .sort((a, b) => a.year - b.year)
  
          combinedData = sortedFinancialData.map((row, index, arr) => {
            const year = row.year
            const dividendPerShare = yearlyDividends[year] || 0
            const dividendYield = (dividendPerShare / currentPrice) * 100
            const payoutRatio = row.eps > 0 ? (dividendPerShare / row.eps) * 100 : 0
  
            const prevRow = index > 0 ? arr[index - 1] : null
            const prevDividend = prevRow ? yearlyDividends[prevRow.year] || 0 : 0
            const growth = prevDividend > 0
              ? ((dividendPerShare - prevDividend) / prevDividend) * 100
              : 0
  
            return {
              year,
              dividendPerShare: parseFloat(dividendPerShare.toFixed(4)),
              dividendYield: parseFloat(dividendYield.toFixed(2)),
              payoutRatio: parseFloat(payoutRatio.toFixed(1)),
              growth: parseFloat(growth.toFixed(1)),
              exDate: '2024-02-09',
              payDate: '2024-02-15'
            }
          })
  
          console.log('✅ Real data processed:', combinedData.length, 'entries')
        } else {
          console.warn('⚠️ Keine Dividendendaten verfügbar.')
          setError('Keine aktuellen Dividendendaten verfügbar.')
        }
  
        setDividendData(combinedData)
  
        // Ex-Date nur setzen wenn es in der Zukunft liegt
        const apiExDate = keyMetrics.exDividendDate
        const isExDateInFuture = apiExDate && new Date(apiExDate) > new Date()
        
        setCurrentDividend({
          yield: keyMetrics.dividendYield || 0.006,
          payoutRatio: keyMetrics.payoutRatio || 0.24,
          exDate: isExDateInFuture ? apiExDate : null,
          declaredDate: keyMetrics.declaredDividendDate || null,
          ttm: keyMetrics.dividendPerShareTTM || 1.00
        })

        // Jahre ohne Dividendenkürzung berechnen
        const yearsWithoutCut = combinedData.filter(d => d.growth >= 0).length
        setYearsWithoutCut(yearsWithoutCut)
  
        // Safety Score berechnen
        if (combinedData.length > 0) {
          const avgGrowth = combinedData.reduce((sum: number, d: DividendData) => sum + d.growth, 0) / combinedData.length
          const avgPayout = combinedData.reduce((sum: number, d: DividendData) => sum + d.payoutRatio, 0) / combinedData.length
          const score = Math.max(0, Math.min(100,
            50 + (avgGrowth * 2) - (Math.max(0, avgPayout - 50) * 0.5)
          ))
          setSafetyScore(Math.round(score))
        }
  
      } catch (error) {
        console.error('❌ Critical error loading dividend data:', error)
        setError('Fehler beim Laden der Daten')
        setDividendData([])
        setCurrentDividend(null)
        setSafetyScore(null)
      } finally {
        setLoading(false)
      }
    }
  
    if (ticker) {
      loadDividendData()
    }
  }, [ticker])

  const formatCurrency = (value: number) => 
    `$${value.toFixed(value < 1 ? 4 : 2)}`

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Sehr sicher'
    if (score >= 60) return 'Moderat'
    return 'Risiko'
  }

  const getBarColor = (value: number): string => {
    return value >= 0 ? '#10B981' : '#EF4444'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner />
              <p className="text-theme-muted mt-4">Lade Dividendendaten für {ticker}...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ✅ REDESIGNED Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <BanknotesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-theme-primary">
                {ticker} Dividenden-Analyse
              </h1>
              <p className="text-theme-muted">Dividendenwachstum, Sicherheit und Historie</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live Daten</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-200">{error}</span>
          </div>
        )}

        {/* ✅ REDESIGNED Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-theme-secondary border border-theme rounded-xl p-4 hover:bg-theme-tertiary/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm text-theme-muted font-medium">Aktuelle Rendite</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentDividend?.yield ? `${(currentDividend.yield * 100).toFixed(2)}%` : 'N/A'}
            </div>
            <div className="text-sm text-theme-muted">TTM: {currentDividend?.ttm ? formatCurrency(currentDividend.ttm) : 'N/A'}</div>
          </div>

          <div className="bg-theme-secondary border border-theme rounded-xl p-4 hover:bg-theme-tertiary/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-sm text-theme-muted font-medium">Ø Wachstum</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {dividendData.length > 1 
                ? `${dividendData.filter(d => d.growth !== 0).reduce((sum: number, d: DividendData) => sum + d.growth, 0) / Math.max(1, dividendData.filter(d => d.growth !== 0).length) > 0 ? '+' : ''}${(dividendData.filter(d => d.growth !== 0).reduce((sum: number, d: DividendData) => sum + d.growth, 0) / Math.max(1, dividendData.filter(d => d.growth !== 0).length)).toFixed(1)}%`
                : 'N/A'
              }
            </div>
            <div className="text-sm text-theme-muted">Durchschnittlich p.a.</div>
          </div>

          <div className="bg-theme-secondary border border-theme rounded-xl p-4 hover:bg-theme-tertiary/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-4 h-4 text-yellow-400" />
              </div>
              <span className="text-sm text-theme-muted font-medium">Sicherheits-Score</span>
            </div>
            <div className={`text-2xl font-bold mb-1 ${safetyScore ? getScoreColor(safetyScore) : 'text-theme-muted'}`}>
              {safetyScore || 'N/A'}
            </div>
            <div className="text-sm text-theme-muted">
              {safetyScore ? getScoreLabel(safetyScore) : 'Keine Daten'}
            </div>
          </div>

          <div className="bg-theme-secondary border border-theme rounded-xl p-4 hover:bg-theme-tertiary/50 transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-sm text-theme-muted font-medium">Nächste Ex-Date</span>
            </div>
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentDividend?.exDate ? 
                new Date(currentDividend.exDate).toLocaleDateString('de-DE') : 
                'TBA'
              }
            </div>
            <div className="text-sm text-theme-muted">
              {currentDividend?.exDate ? 'Bestätigt' : 'Noch nicht angekündigt'}
            </div>
          </div>
        </div>

        {/* ✅ ADDITIONAL Metric Card */}
        <div className="bg-theme-secondary border border-theme rounded-xl p-4 hover:bg-theme-tertiary/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-sm text-theme-muted font-medium">Jahre ohne Kürzung</span>
          </div>
          <div className="text-2xl font-bold text-theme-primary mb-1">
            {yearsWithoutCut}
          </div>
          <div className="text-sm text-theme-muted">
            {yearsWithoutCut === 1 ? 'Letztes Jahr stabil' : `${yearsWithoutCut} Jahre in Folge`}
          </div>
        </div>

        {/* ✅ REDESIGNED Charts Grid */}
        {dividendData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Dividenden-Entwicklung Chart */}
          <div className="bg-theme-secondary border border-theme rounded-xl p-6 hover:bg-theme-tertiary/30 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-theme-primary">Dividende je Aktie</h3>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dividendData}>
                <XAxis 
                  dataKey="year" 
                  stroke="currentColor" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-theme-muted"
                />
                <YAxis 
                  stroke="currentColor" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-theme-muted"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(55, 65, 81)', 
                    border: '1px solid rgb(75, 85, 99)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    color: 'rgb(243, 244, 246)'
                  }}
                  labelStyle={{ color: 'rgb(243, 244, 246)', fontWeight: 'bold' }}
                  formatter={(value: number) => [formatCurrency(value), 'Dividende']}
                />
                <defs>
                  <linearGradient id="dividendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="dividendPerShare" 
                  stroke="#3B82F6" 
                  fill="url(#dividendGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Dividenden-Wachstum Chart */}
          <div className="bg-theme-secondary border border-theme rounded-xl p-6 hover:bg-theme-tertiary/30 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-theme-primary">Jährliches Wachstum</h3>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dividendData.slice(1)}>
                <XAxis 
                  dataKey="year" 
                  stroke="currentColor" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-theme-muted"
                />
                <YAxis 
                  stroke="currentColor" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`} 
                  className="text-theme-muted"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(55, 65, 81)', 
                    border: '1px solid rgb(75, 85, 99)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    color: 'rgb(243, 244, 246)'
                  }}
                  labelStyle={{ color: 'rgb(243, 244, 246)', fontWeight: 'bold' }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Wachstum']}
                />
                <ReferenceLine y={0} stroke="rgb(156, 163, 175)" strokeDasharray="3 3" />
                <Bar dataKey="growth" radius={[4, 4, 0, 0]}>
                  {dividendData.slice(1).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.growth)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Dividendenrendite Chart */}
          <div className="bg-theme-secondary border border-theme rounded-xl p-6 hover:bg-theme-tertiary/30 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <ArrowTrendingDownIcon className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-theme-primary">Dividendenrendite</h3>
              </div>
              <div className="flex items-center gap-1">
                <InformationCircleIcon className="w-4 h-4 text-theme-muted" />
                <span className="text-xs text-theme-muted">Basiert auf historischen Kursen</span>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dividendData}>
                <XAxis 
                  dataKey="year" 
                  stroke="currentColor" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-theme-muted"
                />
                <YAxis 
                  stroke="currentColor" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`} 
                  className="text-theme-muted"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(55, 65, 81)', 
                    border: '1px solid rgb(75, 85, 99)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    color: 'rgb(243, 244, 246)'
                  }}
                  labelStyle={{ color: 'rgb(243, 244, 246)', fontWeight: 'bold' }}
                  formatter={(value: number) => [`${value}%`, 'Rendite']}
                />
                <Line 
                  type="monotone" 
                  dataKey="dividendYield" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#8B5CF6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Payout Ratio Chart */}
          <div className="bg-theme-secondary border border-theme rounded-xl p-6 hover:bg-theme-tertiary/30 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <ClockIcon className="w-4 h-4 text-orange-400" />
                </div>
                <h3 className="text-lg font-bold text-theme-primary">Payout Ratio</h3>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dividendData}>
                <XAxis 
                  dataKey="year" 
                  stroke="currentColor" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  className="text-theme-muted"
                />
                <YAxis 
                  stroke="currentColor" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`} 
                  domain={[0, 100]} 
                  className="text-theme-muted"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(55, 65, 81)', 
                    border: '1px solid rgb(75, 85, 99)',
                    borderRadius: '12px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    color: 'rgb(243, 244, 246)'
                  }}
                  labelStyle={{ color: 'rgb(243, 244, 246)', fontWeight: 'bold' }}
                  formatter={(value: number) => [`${value}%`, 'Payout Ratio']}
                />
                <ReferenceLine y={50} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: "Ziel: 50%", position: "insideTopRight" }} />
                <ReferenceLine y={80} stroke="#EF4444" strokeDasharray="5 5" label={{ value: "Risiko: 80%", position: "insideTopRight" }} />
                <defs>
                  <linearGradient id="payoutGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="payoutRatio" 
                  stroke="#F59E0B" 
                  fill="url(#payoutGradient)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        ) : (
          <div className="bg-theme-secondary border border-theme rounded-xl p-8 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-theme-primary mb-2">Keine Dividendendaten verfügbar</h3>
            <p className="text-theme-muted">
              Für {ticker} sind momentan keine historischen Dividendendaten verfügbar.
            </p>
          </div>
        )}

        {/* ✅ REDESIGNED Dividenden-Historie Tabelle */}
        {dividendData.length > 0 && (
        <div className="bg-theme-secondary border border-theme rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary">Dividenden-Historie</h3>
          </div>
          
          <div className="overflow-hidden rounded-lg border border-theme">
            <table className="w-full">
              <thead className="bg-theme-tertiary/50">
                <tr>
                  <th className="text-left py-3 px-4 text-theme-muted font-semibold text-sm">Jahr</th>
                  <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Dividende/Aktie</th>
                  <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Wachstum</th>
                  <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Rendite</th>
                  <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Payout Ratio</th>
                </tr>
              </thead>
              <tbody>
                {dividendData.map((row, index) => (
                  <tr key={row.year} className={`hover:bg-theme-tertiary/30 transition-colors ${index !== dividendData.length - 1 ? 'border-b border-theme/50' : ''}`}>
                    <td className="py-3 px-4 text-theme-primary font-semibold">{row.year}</td>
                    <td className="py-3 px-4 text-right text-theme-primary font-medium">{formatCurrency(row.dividendPerShare)}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      row.growth > 0 ? 'text-green-400' : 
                      row.growth < 0 ? 'text-red-400' : 'text-theme-muted'
                    }`}>
                      {row.growth > 0 ? '+' : ''}{row.growth.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-theme-primary font-medium">{row.dividendYield}%</td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      row.payoutRatio > 80 ? 'text-red-400' : 
                      row.payoutRatio > 50 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {row.payoutRatio}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* ✅ REDESIGNED Premium Hinweis */}
        {!user?.isPremium && (
          <div className="bg-theme-secondary border border-theme rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <BanknotesIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-3">Erweiterte Dividenden-Analyse</h3>
            <p className="text-theme-muted mb-6 max-w-xl mx-auto">
              Vergleiche {ticker} Dividenden mit Sektor-Durchschnitt, erhalte Dividenden-Prognosen, 
              Risiko-Analyse und exklusive Insights für bessere Investment-Entscheidungen.
            </p>
            <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-400 hover:to-purple-400 transition-all">
              Premium freischalten
            </button>
          </div>
        )}
      </div>
    </div>
  )
}