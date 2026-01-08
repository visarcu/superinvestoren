// src/app/analyse/etfs/[symbol]/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCurrency } from '@/lib/CurrencyContext'
import ETFChart from '@/components/ETFChart'
import {
  ArrowLeftIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  CalendarIcon,
  SparklesIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

// Deutsche Sektor-Übersetzungen
const SECTOR_TRANSLATIONS: Record<string, string> = {
  'Technology': 'Technologie',
  'Financial Services': 'Finanzdienstleistungen',
  'Consumer Cyclical': 'Zyklische Konsumgüter',
  'Communication Services': 'Kommunikationsdienste',
  'Healthcare': 'Gesundheitswesen',
  'Industrials': 'Industrie',
  'Consumer Defensive': 'Defensive Konsumgüter',
  'Energy': 'Energie',
  'Utilities': 'Versorgungsunternehmen',
  'Real Estate': 'Immobilien',
  'Basic Materials': 'Grundstoffe',
  'Consumer Staples': 'Basiskonsumgüter',
  'Information Technology': 'Informationstechnologie',
  'Financials': 'Finanzwerte',
  'Health Care': 'Gesundheitswesen',
  'Consumer Discretionary': 'Zyklische Konsumgüter'
}

interface ETFInfo {
  symbol: string
  name: string
  assetClass: string
  aum: number
  avgVolume: number
  description: string
  domicile: string
  etfCompany: string
  expenseRatio: number
  inceptionDate: string
  isin: string
  nav: number
  navCurrency: string
  website: string
  holdingsCount: number
  sectorsList: Array<{
    industry: string
    exposure: number
  }>
}

interface ETFQuote {
  symbol: string
  name: string
  price: number
  change: number
  changesPercentage: number
  dayLow: number
  dayHigh: number
  yearHigh: number
  yearLow: number
  volume: number
  marketCap: number
  previousClose: number
}

interface ETFHolding {
  symbol: string
  name: string
  cusip: string
  isin: string
  balance: number
  valUsd: number
  pctVal: number
  payoffProfile: string
  invCountry: string
}


interface ETFPerformance {
  symbol: string
  current: number
  '1d': number
  '1w': number
  '1m': number
  '3m': number
  '6m': number
  '1y': number
  volatility: number
  maxDrawdown: number
}

interface ETFDistributions {
  symbol: string
  distributions: Array<{
    date: string
    adjDividend: number
    dividend: number
    recordDate: string
    paymentDate: string
  }>
  annualDividends: number
  yield: number
  frequency: string
}

export default function ETFDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const symbol = (params.symbol as string)?.toUpperCase()
  const period = (searchParams.get('period') || '1y') as '1m' | '3m' | '6m' | '1y'
  const { formatPercentage, formatMarketCap, formatStockPrice } = useCurrency()
  
  const [etfInfo, setETFInfo] = useState<ETFInfo | null>(null)
  const [etfQuote, setETFQuote] = useState<ETFQuote | null>(null)
  const [holdings, setHoldings] = useState<ETFHolding[]>([])
  const [holdingsLoading, setHoldingsLoading] = useState(false)
  const [performance, setPerformance] = useState<ETFPerformance | null>(null)
  const [distributions, setDistributions] = useState<ETFDistributions | null>(null)
  const [holdingsDates, setHoldingsDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (symbol) {
      loadETFData()
    }
  }, [symbol])

  useEffect(() => {
    if (selectedDate) {
      loadHoldings()
    }
  }, [selectedDate])

  const loadETFData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Load ETF Info, Quote, Holdings Dates, Performance, and Distributions in parallel
      const [infoRes, quoteRes, datesRes, performanceRes, distributionsRes] = await Promise.all([
        fetch(`/api/etf-info/${symbol}`),
        fetch(`/api/quotes?symbols=${symbol}`),
        fetch(`/api/etf-holdings-dates/${symbol}`),
        fetch(`/api/etf-performance/${symbol}`),
        fetch(`/api/etf-distributions/${symbol}`)
      ])

      // ETF Quote (always available)
      if (quoteRes.ok) {
        const quoteData = await quoteRes.json()
        if (quoteData && quoteData.length > 0) {
          setETFQuote(quoteData[0])
        }
      }

      // ETF Info (may not be available for all ETFs)
      if (infoRes.ok) {
        const infoData = await infoRes.json()
        if (infoData && infoData.length > 0) {
          setETFInfo(infoData[0])
        }
      }

      // Holdings Dates and Initial Holdings
      if (datesRes.ok) {
        const datesData = await datesRes.json()
        if (datesData && datesData.length > 0) {
          const dates = datesData.map((d: any) => d.date)
          setHoldingsDates(dates)
          const latestDate = dates[0]
          setSelectedDate(latestDate)
          
          // Load holdings immediately with latest date
          if (latestDate) {
            try {
              const holdingsRes = await fetch(`/api/etf-holdings/${symbol}?date=${latestDate}`)
              if (holdingsRes.ok) {
                const holdingsData = await holdingsRes.json()
                setHoldings(holdingsData.slice(0, 20))
              }
            } catch (err) {
              console.error('Error loading initial holdings:', err)
            }
          }
        }
      }

      // Performance Metrics
      if (performanceRes.ok) {
        const performanceData = await performanceRes.json()
        if (performanceData && !performanceData.error) {
          setPerformance(performanceData)
        }
      }

      // Distributions Data
      if (distributionsRes.ok) {
        const distributionsData = await distributionsRes.json()
        if (distributionsData && !distributionsData.error) {
          setDistributions(distributionsData)
        }
      }

    } catch (err) {
      console.error('Error loading ETF data:', err)
      setError('Fehler beim Laden der ETF-Daten')
    } finally {
      setLoading(false)
    }
  }

  const loadHoldings = async () => {
    if (!selectedDate) return
    
    setHoldingsLoading(true)
    try {
      const res = await fetch(`/api/etf-holdings/${symbol}?date=${selectedDate}`)
      if (res.ok) {
        const holdingsData = await res.json()
        setHoldings(holdingsData.slice(0, 20)) // Top 20 holdings
      }
    } catch (err) {
      console.error('Error loading holdings:', err)
    } finally {
      setHoldingsLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-theme-secondary">Lade ETF-Daten...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !etfQuote) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <ArrowLeftIcon 
              className="w-5 h-5 text-theme-secondary hover:text-brand-light cursor-pointer transition-colors"
              onClick={() => router.push('/analyse/etf-screener')}
            />
            <span className="text-theme-secondary">Zurück zum ETF Screener</span>
          </div>
          
          <div className="bg-theme-card rounded-xl p-8 text-center">
            <InformationCircleIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-bold text-theme-primary mb-2">ETF nicht gefunden</h2>
            <p className="text-theme-secondary">
              {error || `ETF ${symbol} konnte nicht geladen werden.`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="border-b border-theme/5">
          <div className="pb-8">
            <div className="flex items-center gap-3 mb-6">
              <ArrowLeftIcon 
                className="w-5 h-5 text-theme-secondary hover:text-brand-light cursor-pointer transition-colors"
                onClick={() => router.push('/analyse/etf-screener')}
              />
              <span className="text-theme-secondary hover:text-brand-light cursor-pointer transition-colors"
                    onClick={() => router.push('/analyse/etf-screener')}>
                Zurück zum ETF Screener
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <ChartBarIcon className="w-6 h-6 text-brand-light" />
                  <h1 className="text-3xl font-bold text-theme-primary">{symbol}</h1>
                  <div className="flex items-center gap-2 px-3 py-1 bg-brand/20 text-brand-light rounded-lg text-sm">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </div>
                </div>
                <h2 className="text-xl text-theme-secondary mb-2">{etfQuote.name}</h2>
                {etfInfo && (
                  <div className="flex items-center gap-4 text-sm text-theme-tertiary">
                    <span>ISIN: {etfInfo.isin}</span>
                    <div className="w-1 h-1 bg-theme-tertiary rounded-full"></div>
                    <span>Anbieter: {etfInfo.etfCompany}</span>
                    <div className="w-1 h-1 bg-theme-tertiary rounded-full"></div>
                    <span>Seit: {new Date(etfInfo.inceptionDate).getFullYear()}</span>
                  </div>
                )}
              </div>

              {/* Live Price */}
              <div className="text-right">
                <div className="text-3xl font-bold text-theme-primary mb-1">
                  {formatStockPrice(etfQuote.price)}
                </div>
                <div className={`text-lg font-semibold ${etfQuote.changesPercentage >= 0 ? 'text-brand-light' : 'text-red-400'}`}>
                  {formatPercentage(etfQuote.changesPercentage)} ({formatPercentage(etfQuote.change)})
                </div>
                <div className="text-sm text-theme-tertiary">
                  Heute: {formatStockPrice(etfQuote.dayLow, false)} - {formatStockPrice(etfQuote.dayHigh, false)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics - Moved up and expanded */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
          {etfInfo && (
            <>
              <div className="bg-theme-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BanknotesIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-theme-muted text-xs">AUM</span>
                </div>
                <div className="text-lg font-bold text-theme-primary">
                  {formatMarketCap(etfInfo.aum)}
                </div>
              </div>

              <div className="bg-theme-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <SparklesIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-theme-muted text-xs">TER</span>
                </div>
                <div className={`text-lg font-bold ${
                  etfInfo.expenseRatio <= 0.2 ? 'text-brand-light' :
                  etfInfo.expenseRatio <= 0.5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {formatPercentage(etfInfo.expenseRatio, false)}
                </div>
              </div>

              <div className="bg-theme-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BuildingOfficeIcon className="w-4 h-4 text-orange-400" />
                  <span className="text-theme-muted text-xs">Holdings</span>
                </div>
                <div className="text-lg font-bold text-theme-primary">
                  {etfInfo.holdingsCount || 'N/A'}
                </div>
              </div>

              <div className="bg-theme-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarIcon className="w-4 h-4 text-brand-light" />
                  <span className="text-theme-muted text-xs">Aufgelegt</span>
                </div>
                <div className="text-lg font-bold text-theme-primary">
                  {new Date(etfInfo.inceptionDate).getFullYear()}
                </div>
              </div>
            </>
          )}

          <div className="bg-theme-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ChartBarIcon className="w-4 h-4 text-brand-light" />
              <span className="text-theme-muted text-xs">Volumen</span>
            </div>
            <div className="text-lg font-bold text-theme-primary">
              {(etfQuote.volume / 1e6).toFixed(1)}M
            </div>
          </div>

          <div className="bg-theme-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CurrencyDollarIcon className="w-4 h-4 text-yellow-400" />
              <span className="text-theme-muted text-xs">52W Range</span>
            </div>
            <div className="text-sm font-bold text-theme-primary">
              {formatStockPrice(etfQuote.yearLow, false)} - {formatStockPrice(etfQuote.yearHigh, false)}
            </div>
          </div>

          {/* Dividend Yield Card */}
          {distributions && (
            <div className="bg-theme-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <CurrencyDollarIcon className="w-4 h-4 text-brand-light" />
                <span className="text-theme-muted text-xs">Rendite</span>
              </div>
              <div className="text-lg font-bold text-brand-light">
                {distributions.yield > 0 ? `${distributions.yield.toFixed(2)}%` : 'N/A'}
              </div>
            </div>
          )}

          {/* Performance YTD Card */}
          {performance && (
            <div className="bg-theme-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <ChartBarIcon className="w-4 h-4 text-purple-400" />
                <span className="text-theme-muted text-xs">1 Jahr</span>
              </div>
              <div className={`text-lg font-bold ${
                performance['1y'] >= 0 ? 'text-brand-light' : 'text-red-400'
              }`}>
                {performance['1y'] >= 0 ? '+' : ''}{performance['1y'].toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Custom ETF Chart */}
        <ETFChart symbol={symbol} height={350} period={period} />

        {/* Performance Metrics */}
        {performance && (
          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <ChartBarIcon className="w-5 h-5 text-brand-light" />
              <h3 className="text-xl font-semibold text-theme-primary">Performance & Risiko</h3>
            </div>
            
            <div className="space-y-6">
              {/* Performance Table */}
              <div>
                <h4 className="text-sm font-semibold text-theme-secondary mb-4 uppercase tracking-wide">Wertentwicklung</h4>
                <div className="bg-theme-secondary/5 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-4 gap-px">
                    <div className="bg-theme-card p-4 text-center">
                      <div className="text-xs text-theme-muted mb-2">1 Tag</div>
                      <div className={`text-lg font-bold ${
                        performance['1d'] >= 0 ? 'text-brand-light' : 'text-red-400'
                      }`}>
                        {formatPercentage(performance['1d'])}
                      </div>
                    </div>
                    
                    <div className="bg-theme-card p-4 text-center">
                      <div className="text-xs text-theme-muted mb-2">1 Woche</div>
                      <div className={`text-lg font-bold ${
                        performance['1w'] >= 0 ? 'text-brand-light' : 'text-red-400'
                      }`}>
                        {formatPercentage(performance['1w'])}
                      </div>
                    </div>
                    
                    <div className="bg-theme-card p-4 text-center">
                      <div className="text-xs text-theme-muted mb-2">1 Monat</div>
                      <div className={`text-lg font-bold ${
                        performance['1m'] >= 0 ? 'text-brand-light' : 'text-red-400'
                      }`}>
                        {formatPercentage(performance['1m'])}
                      </div>
                    </div>
                    
                    <div className="bg-theme-card p-4 text-center">
                      <div className="text-xs text-theme-muted mb-2">1 Jahr</div>
                      <div className={`text-lg font-bold ${
                        performance['1y'] >= 0 ? 'text-brand-light' : 'text-red-400'
                      }`}>
                        {formatPercentage(performance['1y'])}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Risk Metrics Table */}
              <div>
                <h4 className="text-sm font-semibold text-theme-secondary mb-4 uppercase tracking-wide">Risikomaße</h4>
                <div className="bg-theme-secondary/5 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 gap-px">
                    <div className="bg-theme-card p-4 text-center">
                      <div className="text-xs text-theme-muted mb-2">Volatilität (1 Jahr)</div>
                      <div className="text-lg font-bold text-yellow-400">
                        {formatPercentage(performance.volatility, false)}
                      </div>
                    </div>
                    
                    <div className="bg-theme-card p-4 text-center">
                      <div className="text-xs text-theme-muted mb-2">Max. Verlust</div>
                      <div className="text-lg font-bold text-red-400">
                        -{formatPercentage(performance.maxDrawdown, false)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Sector Allocation - Kompakter */}
          {etfInfo && etfInfo.sectorsList && etfInfo.sectorsList.length > 0 && (
            <div className="bg-theme-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <GlobeAltIcon className="w-5 h-5 text-blue-400" />
                <h3 className="text-xl font-semibold text-theme-primary">Sektor-Allokation</h3>
              </div>
              
              <div className="space-y-2">
                {etfInfo.sectorsList
                  .sort((a, b) => b.exposure - a.exposure)
                  .slice(0, 8)
                  .map((sector, index) => (
                    <div key={sector.industry} className={`flex items-center justify-between py-2 ${
                      index < etfInfo.sectorsList.length - 1 ? 'border-b border-theme/5' : ''
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-theme-primary font-medium text-sm">{SECTOR_TRANSLATIONS[sector.industry] || sector.industry}</span>
                          <span className="text-theme-secondary text-sm font-semibold">{formatPercentage(sector.exposure, false)}</span>
                        </div>
                        <div className="w-full bg-theme-secondary/20 rounded-full h-1.5">
                          <div 
                            className="bg-green-400 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(sector.exposure, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}


          {/* Top Holdings - Kompakter */}
          {(holdings.length > 0 || holdingsLoading) && (
            <div className="bg-theme-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <BuildingOfficeIcon className="w-5 h-5 text-purple-400" />
                  <h3 className="text-xl font-semibold text-theme-primary">Top Holdings</h3>
                </div>
                
                {holdingsDates.length > 0 && (
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1 bg-theme-card border border-theme/20 rounded-lg text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    {holdingsDates.map(date => (
                      <option key={date} value={date}>
                        {new Date(date).toLocaleDateString('de-DE')}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {holdingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                  <span className="ml-3 text-theme-secondary">Lade Holdings...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {holdings.slice(0, 12).map((holding, index) => (
                    <div 
                      key={holding.cusip}
                      className={`flex items-center justify-between py-2 px-3 bg-theme-secondary/5 rounded-lg hover:bg-theme-secondary/10 transition-colors cursor-pointer ${
                        index < holdings.length - 1 && index < 11 ? 'border-b border-theme/5' : ''
                      }`}
                      onClick={() => router.push(`/analyse/stocks/${holding.symbol?.toLowerCase()}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-green-400/20 text-brand-light rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-theme-primary text-sm">{holding.symbol || 'N/A'}</div>
                          <div className="text-xs text-theme-secondary truncate max-w-xs">{holding.name}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-theme-primary text-sm">{formatPercentage(holding.pctVal, false)}</div>
                        <div className="text-xs text-theme-secondary">
                          {formatMarketCap(holding.valUsd)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>


        {/* Distributions History */}
        {distributions && distributions.distributions.length > 0 && (
          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CurrencyDollarIcon className="w-5 h-5 text-brand-light" />
              <h3 className="text-xl font-semibold text-theme-primary">Ausschüttungen</h3>
              <div className="ml-auto text-sm text-theme-secondary">
                {distributions.frequency} • {distributions.yield.toFixed(2)}% Rendite
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {distributions.distributions.slice(0, 6).map((dist) => (
                <div key={dist.date} className="bg-theme-secondary/5 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-theme-primary text-sm">
                        {dist.adjDividend.toFixed(4)} {etfInfo?.navCurrency || 'USD'}
                      </div>
                      <div className="text-xs text-theme-secondary">
                        {new Date(dist.date).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-theme-muted">Ex-Date</div>
                      <div className="text-xs text-theme-secondary">
                        {new Date(dist.recordDate).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ETF Description - Moved to bottom */}
        {etfInfo && etfInfo.description && (
          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <InformationCircleIcon className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl font-semibold text-theme-primary">Über diesen ETF</h3>
            </div>
            <p className="text-theme-secondary leading-relaxed">{etfInfo.description}</p>
            
            {etfInfo.website && (
              <div className="mt-4 pt-4 border-t border-theme/10">
                <a 
                  href={etfInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-brand-light hover:text-green-300 transition-colors"
                >
                  <GlobeAltIcon className="w-4 h-4" />
                  Website des Anbieters
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}