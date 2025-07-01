// src/components/EnhancedDividendSection.tsx
// PROFESSIONELLE DIVIDENDEN-SEKTION für Business-Anwender - DEUTSCHE VERSION

'use client'

import React, { useState, useEffect } from 'react'
import { 
  BanknotesIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BugAntIcon,
  ArrowTrendingUpIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar } from 'recharts'

interface DividendData {
  year: number
  dividendPerShare: number
  growth: number
}

interface DividendForecast {
  year: number
  estimatedDividend: number
  estimatedGrowth?: number
  estimatedYield?: number
  confidence: string
  source: string
}

interface DataQuality {
  score: number
  issues: string[]
  sources: string[]
  coverage: number
  recommendations: string[]
}

// ✅ NEUES Interface für Ampelsystem
interface PayoutSafetyData {
  text: string
  color: 'green' | 'yellow' | 'red' | 'gray'
  level: 'very_safe' | 'safe' | 'moderate' | 'risky' | 'critical' | 'unsustainable' | 'no_data'
  payout: number
}

interface EnhancedDividendSectionProps {
  ticker: string
  isPremium?: boolean
}

export default function EnhancedDividendSection({ 
  ticker, 
  isPremium = false 
}: EnhancedDividendSectionProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dividendData, setDividendData] = useState<DividendData[]>([])
  const [forecasts, setForecasts] = useState<DividendForecast[]>([])
  const [currentInfo, setCurrentInfo] = useState<any>(null)
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)

  // ✅ Daten laden mit neuer Enhanced API
  useEffect(() => {
    async function loadDividendData() {
      setLoading(true)
      setError(null)

      try {
        console.log(`🔍 Loading enhanced dividend data for ${ticker}...`)
        
        const response = await fetch(`/api/dividends/${ticker}`)
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Parse historical data
        const historical = data.historical || {}
        const processedData: DividendData[] = Object.entries(historical)
          .map(([year, amount]) => ({
            year: parseInt(year),
            dividendPerShare: amount as number,
            growth: 0 // Wird unten berechnet
          }))
          .sort((a, b) => a.year - b.year)

        // Calculate growth rates
        processedData.forEach((entry, index) => {
          if (index > 0) {
            const prevAmount = processedData[index - 1].dividendPerShare
            if (prevAmount > 0) {
              entry.growth = ((entry.dividendPerShare - prevAmount) / prevAmount) * 100
            }
          }
        })

        setDividendData(processedData)
        setForecasts(data.forecasts || [])
        setCurrentInfo(data.currentInfo)
        setDataQuality(data.dataQuality)
        setDebugData(data.debug) // Kann undefined sein in Production
        
        console.log(`✅ Loaded ${processedData.length} years of dividend data + ${data.forecasts?.length || 0} forecasts`)
        console.log(`📊 Data Quality Score: ${data.dataQuality?.score}/100`)
        
      } catch (error) {
        console.error('❌ Error loading dividend data:', error)
        setError('Fehler beim Laden der Dividendendaten')
      } finally {
        setLoading(false)
      }
    }

    if (ticker) {
      loadDividendData()
    }
  }, [ticker])

  // Helper functions
  const formatCurrency = (value: number) => 
    `$${value.toFixed(value < 1 ? 4 : 2)}`

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getQualityIcon = (score: number) => {
    if (score >= 80) return CheckCircleIcon
    if (score >= 60) return ExclamationTriangleIcon
    return XCircleIcon
  }

  // ✅ NEUE: Realistische Yield-Farben für deutsche Verhältnisse
  const getYieldColor = (yieldValue: number) => {
    if (yieldValue > 0.05) return 'text-green-400'      // > 5% = Grün
    if (yieldValue > 0.03) return 'text-blue-400'       // 3-5% = Blau  
    if (yieldValue > 0.015) return 'text-yellow-400'    // 1.5-3% = Gelb
    return 'text-gray-400'                              // < 1.5% = Grau
  }

  // ✅ Professionelle Investment-Statistiken
  const calculateInvestmentStats = () => {
    if (dividendData.length === 0) return {
      avgGrowth5Y: 0,
      maxStreak: 0,
      dividendCuts: 0,
      totalDividends: 0,
      totalGrowthPercent: 0,
      consistentGrowthYears: 0
    }
    
    const recent5Years = dividendData.slice(-5)
    const avgGrowth5Y = recent5Years.length > 1 ? 
      recent5Years.reduce((sum, entry) => sum + entry.growth, 0) / recent5Years.length : 0
    
    let maxStreak = 0
    let currentStreak = 0
    dividendData.forEach(entry => {
      if (entry.growth > 0) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    })
    
    const dividendCuts = dividendData.filter(entry => entry.growth < -5).length
    const totalDividends = dividendData.reduce((sum, d) => sum + d.dividendPerShare, 0)
    const consistentGrowthYears = dividendData.filter(entry => entry.growth > 0).length
    
    const firstYear = dividendData[0]?.dividendPerShare || 0
    const lastYear = dividendData[dividendData.length - 1]?.dividendPerShare || 0
    const totalGrowthPercent = firstYear > 0 ? ((lastYear / firstYear - 1) * 100) : 0
    
    return {
      avgGrowth5Y,
      maxStreak,
      dividendCuts,
      totalDividends,
      totalGrowthPercent,
      consistentGrowthYears
    }
  }

  const stats = calculateInvestmentStats()

  if (loading) {
    return (
      <div className="professional-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-theme-tertiary rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-theme-tertiary rounded w-3/4"></div>
            <div className="h-4 bg-theme-tertiary rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="professional-card p-6">
        <div className="flex items-center gap-3 text-red-400">
          <XCircleIcon className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  const QualityIcon = dataQuality ? getQualityIcon(dataQuality.score) : InformationCircleIcon

  return (
    <div className="space-y-6">
      
      {/* ✅ HAUPTKARTE: Dividenden-Übersicht */}
      <div className="professional-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <BanknotesIcon className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary">Dividenden-Analyse</h3>
            {forecasts.length > 0 && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                Prognosen verfügbar
              </span>
            )}
          </div>
          
          {/* ✅ PROFESSIONELLER Quality Indicator - nur bei echten Problemen */}
          {dataQuality && dataQuality.score < 50 && (
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-yellow-400">Eingeschränkte Datenqualität</span>
            </div>
          )}
        </div>

        {/* ✅ KORRIGIERTE Key Metrics Grid mit deutschen Labels */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentInfo?.currentYield ? `${(currentInfo.currentYield * 100).toFixed(2)}%` : 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">Aktuelle Rendite</div>
            {currentInfo?.yieldClassification && (
              <div className={`text-xs mt-1 ${getYieldColor(currentInfo.currentYield)}`}>
                {currentInfo.yieldClassification}
              </div>
            )}
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentInfo?.dividendPerShareTTM ? formatCurrency(currentInfo.dividendPerShareTTM) : 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">TTM Dividende</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentInfo?.dividendGrowthRate ? `${currentInfo.dividendGrowthRate.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">Ø Wachstum (5 Jahre)</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {dividendData.length}
            </div>
            <div className="text-sm text-theme-secondary">Jahre Historie</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-theme-primary mb-1">
              {currentInfo?.dividendQuality || 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">Qualitätsbewertung</div>
          </div>
        </div>

        {/* ✅ Chart - nur letzten 10 Jahre für bessere Übersicht */}
        {dividendData.length > 0 && (
          <div className="h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dividendData.slice(-10)}>
                <XAxis 
                  dataKey="year" 
                  stroke="currentColor" 
                  fontSize={12}
                  className="text-theme-muted"
                />
                <YAxis 
                  stroke="currentColor" 
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-theme-muted"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(55, 65, 81)', 
                    border: '1px solid rgb(75, 85, 99)',
                    borderRadius: '12px',
                    color: 'rgb(243, 244, 246)'
                  }}
                  labelStyle={{ color: 'rgb(243, 244, 246)', fontWeight: 'bold' }}
                  formatter={(value: number) => [formatCurrency(value), 'Dividende']}
                />
                <Line 
                  type="monotone" 
                  dataKey="dividendPerShare" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3B82F6' }}
                  activeDot={{ r: 6, fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ✅ INVESTMENT-KENNZAHLEN mit deutschen Labels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Wachstums-Chart - letzten 10 Jahre */}
        <div className="professional-card p-6">
          <h4 className="text-lg font-bold text-theme-primary mb-4">Wachstumstrend (10 Jahre)</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dividendData.slice(-10).filter(d => d.year > dividendData.slice(-10)[0]?.year)}>
                <XAxis 
                  dataKey="year" 
                  stroke="currentColor" 
                  fontSize={12}
                  className="text-theme-muted"
                />
                <YAxis 
                  stroke="currentColor" 
                  fontSize={12}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  className="text-theme-muted"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(55, 65, 81)', 
                    border: '1px solid rgb(75, 85, 99)',
                    borderRadius: '12px',
                    color: 'rgb(243, 244, 246)'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Wachstum']}
                />
                <Bar 
                  dataKey="growth" 
                  fill="#3B82F6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ✅ KORRIGIERTE Investment-Metriken mit Ampelsystem */}
        <div className="professional-card p-6">
          <h4 className="text-lg font-bold text-theme-primary mb-4">Investment-Kennzahlen</h4>
          
          <div className="space-y-4">
            
            {/* Dividenden-Qualität */}
            <div className="flex justify-between items-center p-3 bg-theme-tertiary rounded-lg">
              <span className="text-theme-secondary">Dividenden-Qualität</span>
              <span className="text-theme-primary font-semibold">
                {currentInfo?.dividendQuality || 'N/A'}
              </span>
            </div>

            {/* Wachstumstrend */}
            <div className="flex justify-between items-center p-3 bg-theme-tertiary rounded-lg">
              <span className="text-theme-secondary">Wachstumstrend (5J)</span>
              <span className="text-theme-primary font-semibold">
                {currentInfo?.growthTrend || 'N/A'}
              </span>
            </div>

            {/* ✅ AMPELSYSTEM für Payout Safety - HIER WAR DER FEHLER */}
            <div className="flex justify-between items-center p-3 bg-theme-tertiary rounded-lg">
              <span className="text-theme-secondary">Einschätzung</span>
              {currentInfo?.payoutSafety ? (
                <div className="flex items-center gap-2">
                  {/* Ampel-Icon basierend auf Farbe */}
                  <div className={`w-2 h-2 rounded-full ${
                    currentInfo.payoutSafety.color === 'green' ? 'bg-green-400 animate-pulse' :
                    currentInfo.payoutSafety.color === 'yellow' ? 'bg-yellow-400 animate-pulse' :
                    currentInfo.payoutSafety.color === 'red' ? 'bg-red-400 animate-pulse' :
                    'bg-gray-400'
                  }`} />
                  
                  <span className={`text-xs font-medium ${
                    currentInfo.payoutSafety.color === 'green' ? 'text-green-400' :
                    currentInfo.payoutSafety.color === 'yellow' ? 'text-yellow-400' :
                    currentInfo.payoutSafety.color === 'red' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {currentInfo.payoutSafety.text}
                  </span>
                </div>
              ) : (
                <span className="text-theme-primary font-semibold">N/A</span>
              )}
            </div>

            {/* Längste Wachstumsserie */}
            <div className="flex justify-between items-center p-3 bg-theme-tertiary rounded-lg">
              <span className="text-theme-secondary">Längste Wachstumsserie</span>
              <span className="text-theme-primary font-semibold">
                {stats.maxStreak} Jahre
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ INVESTMENT-STATISTIKEN */}
      <div className="professional-card p-6">
        <h4 className="text-lg font-bold text-theme-primary mb-4">Performance-Übersicht</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {stats.consistentGrowthYears}
            </div>
            <div className="text-sm text-theme-secondary">Wachstums-Jahre</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {stats.avgGrowth5Y ? `${stats.avgGrowth5Y.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">Ø Wachstum (5J)</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold mb-1 ${
              stats.dividendCuts === 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {stats.dividendCuts}
            </div>
            <div className="text-sm text-theme-secondary">Kürzungen</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 mb-1">
              {stats.totalGrowthPercent ? `${stats.totalGrowthPercent.toFixed(0)}%` : 'N/A'}
            </div>
            <div className="text-sm text-theme-secondary">Gesamt-Wachstum</div>
          </div>
        </div>
      </div>

      {/* ✅ VOLLSTÄNDIGE HISTORIE & PROGNOSEN mit besserer Anzeige */}
      <div className="professional-card p-6">
        <h4 className="text-lg font-bold text-theme-primary mb-4 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Vollständige Dividenden-Historie & Prognosen
        </h4>
        
        {/* ✅ Prognosequellen-Hinweis */}
        {forecasts.length > 0 && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h5 className="text-sm font-semibold text-blue-400 mb-2">Prognosequellen:</h5>
            <div className="text-xs text-theme-secondary space-y-1">
              <p>• <strong>Analysten-Schätzung:</strong> Basierend auf EPS-Prognosen und historischer Payout-Ratio</p>
              <p>• <strong>Konservative Extrapolation:</strong> Historisches Wachstum mit abnehmender Konfidenz</p>
              <p>• <strong>Zeitraum:</strong> 2025-2030 (6 Jahre Vorausschau)</p>
            </div>
          </div>
        )}
        
        <div className="overflow-hidden rounded-lg border border-theme">
          <table className="w-full">
            <thead className="bg-theme-tertiary/50">
              <tr>
                <th className="text-left py-3 px-4 text-theme-muted font-semibold text-sm">Jahr</th>
                <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Dividende/Aktie</th>
                <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Wachstum</th>
                <th className="text-right py-3 px-4 text-theme-muted font-semibold text-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {/* ✅ FORECASTS zuerst anzeigen mit verbesserter Darstellung */}
              {forecasts?.map((forecast: DividendForecast) => (
                <tr key={`forecast-${forecast.year}`} className="bg-blue-500/10 border-b border-theme/50">
                  <td className="py-3 px-4 text-theme-primary font-semibold">{forecast.year}</td>
                  <td className="py-3 px-4 text-right text-blue-400 font-medium">
                    {formatCurrency(forecast.estimatedDividend)}
                  </td>
                  <td className="py-3 px-4 text-right text-theme-muted">
                    {forecast.estimatedGrowth ? `~${forecast.estimatedGrowth.toFixed(1)}%` : 'TBD'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      forecast.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                      forecast.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {forecast.source} ({
                        forecast.confidence === 'high' ? 'Hoch' : 
                        forecast.confidence === 'medium' ? 'Mittel' : 'Niedrig'
                      })
                    </span>
                  </td>
                </tr>
              ))}
              
              {/* ✅ HISTORISCHE DATEN - alle Jahre */}
              {dividendData.slice().reverse().map((row, index) => (
                <tr key={row.year} className={`hover:bg-theme-tertiary/30 transition-colors ${
                  index !== dividendData.length - 1 ? 'border-b border-theme/50' : ''
                }`}>
                  <td className="py-3 px-4 text-theme-primary font-semibold">{row.year}</td>
                  
                  <td className="py-3 px-4 text-right text-theme-primary font-medium">
                    {formatCurrency(row.dividendPerShare)}
                  </td>
                  
                  <td className={`py-3 px-4 text-right font-semibold ${
                    row.growth > 0 ? 'text-green-400' : 
                    row.growth < 0 ? 'text-red-400' : 'text-theme-muted'
                  }`}>
                    {row.growth !== 0 && (row.growth > 0 ? '+' : '')}{row.growth.toFixed(1)}%
                  </td>
                  
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                      Historisch
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ DATENQUALITÄT - nur bei echten Problemen anzeigen */}
      {dataQuality && dataQuality.score < 60 && (
        <div className="professional-card p-6 border-l-4 border-yellow-500">
          <div className="flex items-center gap-3 mb-4">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
            <h4 className="text-lg font-bold text-theme-primary">Datenhinweis</h4>
          </div>
          
          <p className="text-theme-secondary text-sm mb-4">
            Die Dividendendaten basieren auf mehreren Quellen mit unterschiedlicher Abdeckung. 
            Für wichtige Investitionsentscheidungen empfehlen wir die Verifikation bei {ticker} Investor Relations.
          </p>
          
          {dataQuality.issues.length > 0 && (
            <div className="text-xs text-theme-muted">
              <strong>Technische Details:</strong>
              <ul className="list-disc list-inside mt-1">
                {dataQuality.issues.slice(0, 2).map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ✅ DEBUG PANEL - nur wenn debugData existiert (Development) */}
      {debugData && (
        <div className="professional-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <BugAntIcon className="w-4 h-4 text-orange-400" />
              </div>
              <h4 className="text-lg font-bold text-theme-primary">Debug Information</h4>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                Development Only
              </span>
            </div>
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm hover:bg-orange-500/30 transition-colors"
            >
              {showDebug ? 'Hide' : 'Show'} Debug
            </button>
          </div>

          {showDebug && (
            <div className="space-y-4">
              
              {/* Raw Sources Data */}
              <div>
                <h5 className="text-sm font-semibold text-theme-primary mb-2">Raw Source Data:</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* FMP Data */}
                  <div className="bg-theme-tertiary rounded-lg p-3">
                    <h6 className="text-xs font-medium text-blue-400 mb-2">
                      FMP ({debugData.rawSources?.fmp?.length || 0} Jahre)
                    </h6>
                    <div className="text-xs text-theme-secondary space-y-1 max-h-32 overflow-y-auto">
                      {debugData.rawSources?.fmp?.slice(-10).map((entry: any, i: number) => (
                        <div key={i}>
                          {entry.date.slice(0, 4)}: ${entry.amount.toFixed(4)} (Conf: {entry.confidence}%)
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Finnhub Data */}
                  <div className="bg-theme-tertiary rounded-lg p-3">
                    <h6 className="text-xs font-medium text-green-400 mb-2">
                      Finnhub ({debugData.rawSources?.finnhub?.length || 0} Jahre)
                    </h6>
                    <div className="text-xs text-theme-secondary space-y-1 max-h-32 overflow-y-auto">
                      {debugData.rawSources?.finnhub?.slice(-10).map((entry: any, i: number) => (
                        <div key={i}>
                          {entry.date.slice(0, 4)}: ${entry.amount.toFixed(4)} (Conf: {entry.confidence}%)
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alpha Vantage Data */}
                  <div className="bg-theme-tertiary rounded-lg p-3">
                    <h6 className="text-xs font-medium text-purple-400 mb-2">
                      Alpha Vantage ({debugData.rawSources?.alphaVantage?.length || 0} Jahre)
                    </h6>
                    <div className="text-xs text-theme-secondary space-y-1 max-h-32 overflow-y-auto">
                      {debugData.rawSources?.alphaVantage?.slice(-10).map((entry: any, i: number) => (
                        <div key={i}>
                          {entry.date.slice(0, 4)}: ${entry.amount.toFixed(4)} (Conf: {entry.confidence}%)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Forecast Data */}
              {forecasts.length > 0 && (
                <div>
                  <h5 className="text-sm font-semibold text-theme-primary mb-2">Forecast Data:</h5>
                  <div className="bg-theme-tertiary rounded-lg p-3 text-xs text-theme-secondary">
                    {forecasts.map((f, i) => (
                      <div key={i}>
                        {f.year}: ${f.estimatedDividend.toFixed(2)} ({f.confidence} confidence - {f.source})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quote Data */}
              {debugData.quote && (
                <div>
                  <h5 className="text-sm font-semibold text-theme-primary mb-2">Current Quote:</h5>
                  <div className="bg-theme-tertiary rounded-lg p-3 text-xs text-theme-secondary">
                    Price: ${debugData.quote.price} | Source: {debugData.quote.source} | 
                    Change: {debugData.quote.changePercent}%
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-theme-muted">
                Data fetched: {new Date(debugData.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ KOMPAKTER DISCLAIMER für rechtliche Sicherheit */}
      <div className="text-xs text-theme-muted text-center mt-6 p-3 bg-theme-tertiary/30 rounded">
        <p>
          Analyse basiert auf historischen Daten. Dividenden können jederzeit angepasst werden. 
          Diese Darstellung stellt keine Anlageberatung dar.
        </p>
      </div>
    </div>
  )
}