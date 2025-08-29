// src/components/AnalysisClient.tsx - VOLLSTÄNDIG SICHER
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { stocks } from '../data/stocks'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { InformationCircleIcon, AcademicCapIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { LockClosedIcon } from '@heroicons/react/24/solid'
import Tooltip from '@/components/Tooltip'
import { irLinks } from '../data/irLinks'
import LoadingSpinner from '@/components/LoadingSpinner'
import WorkingStockChart from '@/components/WorkingStockChart'
import { LearnTooltipButton } from '@/components/LearnSidebar'
import LazyWrapper from '@/components/LazyWrapper'
import { LEARN_DEFINITIONS } from '@/data/learnDefinitions'
import { useLearnMode } from '@/lib/LearnModeContext'
import { useCurrency } from '@/lib/CurrencyContext'
import OwnershipSection from '@/components/OwnershipSection'

// ─── Dynamische Komponentenimporte ─────────────────────────────────────────
const WatchlistButton = dynamic(
  () => import('@/components/WatchlistButton'),
  { ssr: false }
)


import FinancialAnalysisClient from '@/components/FinancialAnalysisClient'

const RevenueBySegmentChart = dynamic(
  () => import('@/components/RevenueBySegmentChart'),
  { ssr: false, loading: () => <LoadingSpinner /> }
)

const WallStreetRatingDonut = dynamic(
  () => import('@/components/WallStreetRatingDonut'),
  { ssr: false }
)

// ✨ Bulls/Bears Integration
const BullsBearsSection = dynamic(
  () => import('@/components/BullsBearsSection'),
  { ssr: false, loading: () => <LoadingSpinner /> }
)

// ✨ Growth Section Integration
const GrowthSection = dynamic(
  () => import('@/components/GrowthSection'),
  { ssr: false, loading: () => <LoadingSpinner /> }
)

const CompanyEfficiencyMetrics = dynamic(
  () => import('@/components/CompanyEfficiencyMetrics'),
  { ssr: false, loading: () => <LoadingSpinner /> }
)

// ─── Premium Components - ULTRA CLEAN STYLE ─────────────────────────────────────────────────

// Cleaner Premium CTA ohne überflüssige Boxen
const PremiumCTA = ({ title, description }: { title: string; description: string }) => (
  <div className="text-center py-12 px-6">
    <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold text-theme-primary mb-3">{title}</h3>
    <p className="text-theme-secondary mb-6 max-w-md mx-auto leading-relaxed">{description}</p>
    
    <Link
      href="/pricing"
      className="btn-primary inline-flex items-center gap-2 px-6 py-3"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      14 Tage kostenlos testen
    </Link>
  </div>
)

// ULTRA CLEAN Premium Blur
const PremiumBlur = ({ 
  children, 
  featureName 
}: { 
  children: React.ReactNode; 
  featureName: string 
}) => (
  <div className="relative">
    <div className="filter blur-sm opacity-60 pointer-events-none select-none">
      {children}
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-theme-card/90 backdrop-blur-sm rounded-lg p-3 text-center shadow-lg">
        <LockClosedIcon className="w-5 h-5 text-green-500 mx-auto mb-1" />
        <p className="text-theme-secondary text-xs font-medium">{featureName}</p>
        <p className="text-theme-muted text-xs">Premium erforderlich</p>
      </div>
    </div>
  </div>
)

// ─── Formatierungshilfen ────────────────────────────────────────────────────



const fmtDate = (d?: string | null) => d ?? '–'

const fmtNum = (n?: number, decimals = 1) =>
  typeof n === 'number' ? n.toLocaleString('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '–'

// ─── Typdefinitionen ────────────────────────────────────────────────────────
type Profile = {
  description?: string
  sector?: string
  industry?: string
  fullTimeEmployees?: number | string
  ipoDate?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  phone?: string
  website?: string
  beta?: number
  volAvg?: number
}

type SegmentEntry = {
  date: string
  [key: string]: number | string
}

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface StockData {
  date: string
  close: number
}

interface PayoutSafetyData {
  text: string
  color: 'green' | 'yellow' | 'red' | 'gray'
  level: 'very_safe' | 'safe' | 'moderate' | 'risky' | 'critical' | 'unsustainable' | 'no_data'
  payout: number
}

interface EnhancedDividendData {
  currentYield?: number
  payoutRatio?: number
  exDividendDate?: string | null
  dividendPerShareTTM?: number
  lastDividendDate?: string | null
  dividendGrowthRate?: number
  dividendQuality?: string
  yieldClassification?: string
  growthTrend?: string
  payoutSafety?: PayoutSafetyData
}

// ─── Komponente: AnalysisClient ───────────────────────────────────────────────
export default function AnalysisClient({ ticker }: { ticker: string }) {
  const { 
    formatCurrency, 
    formatPercentage, 
    formatMarketCap,
    formatAxisValueDE 
  } = useCurrency()
  
  const stock = stocks.find((s) => s.ticker === ticker)

  // 2) User State
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // 3) GLOBAL LEARN MODE verwenden
  const { isLearnMode } = useLearnMode()

  // 4) States für Live-Daten
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [liveMarketCap, setLiveMarketCap] = useState<number | null>(null)
  const [liveChangePct, setLiveChangePct] = useState<number | null>(null)
  const [livePriceAvg200, setLivePriceAvg200] = useState<number | null>(null)
  const [volume, setVolume] = useState<number | null>(null)
  const [previousClose, setPreviousClose] = useState<number | null>(null)
  const [week52Low, setWeek52Low] = useState<number | null>(null)
  const [week52High, setWeek52High] = useState<number | null>(null)

  // 5) States für andere Daten
  const [profileData, setProfileData] = useState<Profile | null>(null)
  const [irWebsite, setIrWebsite] = useState<string | null>(null)
  const [history, setHistory] = useState<{ date: string; close: number }[]>([])
  const [dividendHistory, setDividendHistory] = useState<{ date: string; dividend: number }[]>([])
  const [segmentData, setSegmentData] = useState<SegmentEntry[]>([])
  const [keyMetrics, setKeyMetrics] = useState<Record<string, any>>({})
  const [hasKeyMetrics, setHasKeyMetrics] = useState(false)

  // 6) States für Bilanz
  const [cashBS, setCashBS] = useState<number | null>(null)
  const [debtBS, setDebtBS] = useState<number | null>(null)
  const [netDebtBS, setNetDebtBS] = useState<number | null>(null)

  // 7) States für Dividend Dates
  const [exDate, setExDate] = useState<string | null>(null)
  const [payDate, setPayDate] = useState<string | null>(null)

  // 8) States für Bewertung & Margins
  const [peTTM, setPeTTM] = useState<number | null>(null)
  const [pegTTM, setPegTTM] = useState<number | null>(null)
  const [pbTTM, setPbTTM] = useState<number | null>(null)
  const [psTTM, setPsTTM] = useState<number | null>(null)
  const [evEbit, setEvEbit] = useState<number | null>(null)
  const [grossMargin, setGrossMargin] = useState<number | null>(null)
  const [operatingMargin, setOperatingMargin] = useState<number | null>(null)
  const [profitMargin, setProfitMargin] = useState<number | null>(null)

  // 9) States für Estimates & Recommendations
  const [estimates, setEstimates] = useState<any[]>([])
  const [recs, setRecs] = useState<null | {
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
  }>(null)

  // 10) States für Outstanding Shares & Forward P/E
  const [currentShares, setCurrentShares] = useState<number | null>(null)
  const [forwardPE, setForwardPE] = useState<number | null>(null)

  // Enhanced Dividend Data State
  const [enhancedDividendData, setEnhancedDividendData] = useState<EnhancedDividendData | null>(null)

    // ✅ FCF Yield State
    const [fcfYield, setFcfYield] = useState<number | null>(null)

  // ✅ MEMOIZED: Vergleichsaktien laden für Chart
  const handleAddComparison = useCallback(async (comparisonTicker: string): Promise<StockData[]> => {
    try {
      console.log('🔍 Loading comparison stock:', comparisonTicker)
      
      // ✅ SICHER: Verwende eigene API Route
      const response = await fetch(`/api/historical/${comparisonTicker}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      const historical = data.historical || []
      
      const formattedData: StockData[] = historical
        .slice()
        .reverse()
        .map((h: any) => ({
          date: h.date,
          close: h.close
        }))
      
      console.log(`✅ Loaded ${formattedData.length} data points for ${comparisonTicker}`)
      return formattedData
      
    } catch (error) {
      console.error('❌ Error loading comparison data:', error)
      return []
    }
  }, [])

  // Removed duplicate - using global definition above



  // User-Daten laden
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
        console.error('[AnalysisClient] Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  // Forward P/E Berechnung - MEMOIZED
  const forwardPECalculated = useMemo(() => {
    if (!livePrice || estimates.length === 0) return null;
    
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1
    
    const nextYearEstimate = estimates.find(e => 
      parseInt(e.date.slice(0, 4), 10) === nextYear
    )
    
    if (nextYearEstimate && nextYearEstimate.estimatedEpsAvg > 0) {
      return livePrice / nextYearEstimate.estimatedEpsAvg
    }
    
    const currentYearEstimate = estimates.find(e => 
      parseInt(e.date.slice(0, 4), 10) === currentYear
    )
    
    if (currentYearEstimate && currentYearEstimate.estimatedEpsAvg > 0) {
      return livePrice / currentYearEstimate.estimatedEpsAvg
    }
    
    return null;
  }, [livePrice, estimates])

  // Update state when calculation changes
  useEffect(() => {
    setForwardPE(forwardPECalculated);
  }, [forwardPECalculated])

  // Memoized payout safety styling calculations
  const payoutSafetyStyles = useMemo(() => {
    if (!enhancedDividendData?.payoutSafety) return null;
    
    const colorMap = {
      green: { bg: 'bg-green-400 animate-pulse', text: 'text-green-400' },
      yellow: { bg: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400' },
      red: { bg: 'bg-red-400 animate-pulse', text: 'text-red-400' },
      gray: { bg: 'bg-gray-400', text: 'text-gray-400' }
    };
    
    return colorMap[enhancedDividendData.payoutSafety.color as keyof typeof colorMap] || colorMap.gray;
  }, [enhancedDividendData?.payoutSafety?.color])

  // ✅ OPTIMIZED: Single combined API call instead of 13 separate calls
  useEffect(() => {
    if (!stock) return

    async function loadAllDataOptimized() {
      // TEMPORARILY: Use fallback until combined API is fully implemented
      console.log(`🔄 [AnalysisClient] Using individual API calls for ${ticker} (combined API disabled temporarily)`)
      loadAllDataFallback()
    }
    
    // Fallback function with original individual API calls  
    async function loadAllDataFallback() {
      console.log(`🔄 [AnalysisClient] Using fallback individual API calls for ${ticker}`)
      
      // ✅ Profile laden über eigene API Route
      try {
        const res = await fetch(`/api/profile/${ticker}`)
        if (res.ok) {
          const data = await res.json()
          const [p] = data as Profile[]
          setProfileData(p)
          setIrWebsite(p.website ?? null)
        }
      } catch {
        console.warn(`[AnalysisClient] Profile für ${ticker} fehlgeschlagen.`)
      }

      // ✅ Historische Kurse über eigene API Route
      try {
        const res = await fetch(`/api/historical/${ticker}`)
        if (res.ok) {
          const { historical = [] } = await res.json()
          const arr = (historical as any[])
            .slice()
            .reverse()
            .map((h) => ({ date: h.date, close: h.close }))
          setHistory(arr)
        }
      } catch {
        console.warn(`[AnalysisClient] History für ${ticker} fehlgeschlagen.`)
      }

      // ✅ Key Metrics (bereits sicher über eigene API)
      try {
        const res = await fetch(`/api/financials/${ticker}`)
        if (res.ok) {
          const { keyMetrics: km = {} } = await res.json()
          setKeyMetrics(km)
          setHasKeyMetrics(Object.keys(km).length > 0)
        }
      } catch {
        console.warn(`[AnalysisClient] KeyMetrics für ${ticker} fehlgeschlagen.`)
      }

      // ✅ Enhanced Dividend Data (bereits sicher über eigene API)
      try {
        console.log(`🔍 [AnalysisClient] Loading enhanced dividend data...`)
        const dividendResponse = await fetch(`/api/dividends/${ticker}`)
        
        if (dividendResponse.ok) {
          const dividendData = await dividendResponse.json()
          setEnhancedDividendData(dividendData.currentInfo)
          console.log(`✅ [AnalysisClient] Enhanced dividend data loaded:`, dividendData.currentInfo)
        }
      } catch (error) {
        console.warn(`⚠️ [AnalysisClient] Enhanced dividend data failed for ${ticker}:`, error)
      }

      // ✅ Live Quote über eigene API Route
      try {
        const res = await fetch(`/api/quote/${ticker}`)
        if (res.ok) {
          const [q] = (await res.json()) as any[]
          setLivePrice(q.price)
          setLiveMarketCap(q.marketCap)
          setLiveChangePct(q.changesPercentage)
          setLivePriceAvg200(q.priceAvg200)
          setVolume(q.volume)
          setPreviousClose(q.previousClose)
          setWeek52Low(q.yearLow)
          setWeek52High(q.yearHigh)
        }
      } catch {
        console.warn(`[AnalysisClient] LiveQuote für ${ticker} fehlgeschlagen.`)
      }

      // ✅ Current Shares über eigene API Route  
      try {
        const res = await fetch(`/api/shares/${ticker}`)
        if (res.ok) {
          const sharesData = (await res.json()) as any[]
          if (Array.isArray(sharesData) && sharesData.length > 0) {
            setCurrentShares(sharesData[0].outstandingShares)
          }
        }
      } catch {
        console.warn(`[AnalysisClient] CurrentShares für ${ticker} fehlgeschlagen.`)
      }

      // ✅ Company Outlook über eigene API Route
      try {
        const res = await fetch(`/api/outlook/${ticker}`)
        if (res.ok) {
          const { ratios = [] } = (await res.json()) as any
          const r = ratios[0] ?? {}
          setPeTTM(r.peRatioTTM ?? null)
          setPegTTM(r.pegRatioTTM ?? null)
          setPbTTM(r.priceToBookRatioTTM ?? null)
          setPsTTM(r.priceSalesRatioTTM ?? null)
        }
      } catch {
        console.warn(`[AnalysisClient] CompanyOutlook für ${ticker} fehlgeschlagen.`)
      }

      // ✅ Balance Sheet über eigene API Route
      try {
        const res = await fetch(`/api/balance-sheet/${ticker}`)
        if (res.ok) {
          const fin = (await res.json()) as any
          const L = Array.isArray(fin.financials) ? fin.financials[0] : fin[0]
          setCashBS(L.cashAndShortTermInvestments ?? null)
          setDebtBS(L.totalDebt ?? null)
          setNetDebtBS(L.netDebt ?? null)
        }
      } catch {
        console.warn(`[AnalysisClient] Bilanzdaten für ${ticker} fehlgeschlagen.`)
      }

      // ✅ Margins über eigene API Route
      try {
        const res = await fetch(`/api/income-statement/${ticker}`)
        if (res.ok) {
          const [inc] = (await res.json()) as any[]
          setGrossMargin(inc.grossProfitRatio ?? null)
          setOperatingMargin(inc.operatingIncomeRatio ?? null)
          setProfitMargin(inc.netIncomeRatio ?? null)
        }
      } catch {
        console.warn(`[AnalysisClient] Margins für ${ticker} fehlgeschlagen.`)
      }

      // ✅ EV/EBIT über eigene API Route
      try {
        const [resEV, resInc] = await Promise.all([
          fetch(`/api/enterprise-values/${ticker}`),
          fetch(`/api/income-statement/${ticker}`)
        ])
        if (resEV.ok && resInc.ok) {
          const [e] = (await resEV.json()) as any[]
          const [i] = (await resInc.json()) as any[]
          if (e.enterpriseValue && i.operatingIncome) {
            setEvEbit(e.enterpriseValue / i.operatingIncome)
          }
        }
      } catch {
        console.warn(`[AnalysisClient] EV/EBIT für ${ticker} fehlgeschlagen.`)
      }

      // ✅ Estimates über eigene API Route
      try {
        const res = await fetch(`/api/estimates/${ticker}`)
        if (res.ok) {
          const all = (await res.json()) as any[]
          const thisYear = new Date().getFullYear()
          setEstimates(all.filter((e) => parseInt(e.date.slice(0, 4), 10) >= thisYear))
        }
      } catch {
        console.warn(`[AnalysisClient] Estimates für ${ticker} fehlgeschlagen.`)
      }

      // ✅ Recommendations über eigene API Route
      try {
        const res = await fetch(`/api/recommendations/${ticker}`)
        if (res.ok) {
          const [a] = (await res.json()) as any[]
          setRecs({
            strongBuy: a.analystRatingsStrongBuy ?? 0,
            buy: a.analystRatingsbuy ?? 0,
            hold: a.analystRatingsHold ?? 0,
            sell: a.analystRatingsSell ?? 0,
            strongSell: a.analystRatingsStrongSell ?? 0,
          })
        }

      } catch {
        console.warn(`[AnalysisClient] Recs für ${ticker} fehlgeschlagen.`)
      }

      // ✅ Free Cash Flow Yield berechnen
      try {
        const cfRes = await fetch(`/api/cash-flow-statement/${ticker}`)
        if (cfRes.ok && liveMarketCap) {
          const cfData = await cfRes.json()
          const latestCF = Array.isArray(cfData) ? cfData[0] : cfData.financials?.[0]
          
          if (latestCF?.freeCashFlow) {
            // FCF Yield = Free Cash Flow / Market Cap
            const fcfYieldValue = latestCF.freeCashFlow / liveMarketCap
            setFcfYield(fcfYieldValue)
            console.log(`✅ FCF Yield for ${ticker}: ${(fcfYieldValue * 100).toFixed(2)}%`)
          }
        }
      } catch (error) {
        console.warn(`[AnalysisClient] FCF Yield calculation failed for ${ticker}:`, error)
      }
    }

    loadAllDataOptimized()
  }, [ticker, stock, liveMarketCap])



  // Loading State
  if (loadingUser) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Aktie nicht gefunden
  if (!stock) {
    return <p className="text-theme-primary">Aktie nicht gefunden.</p>
  }

  return (
    <div className="space-y-8">
      {/* ✅ CLEAN HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold text-theme-primary">Kennzahlen-Analyse</h2>
          <p className="text-theme-secondary mt-1">Detaillierte Finanzdaten für {stock.name} ({ticker})</p>
        </div>
        <div className="flex items-center space-x-4">
          <WatchlistButton ticker={ticker} />
        </div>
      </div>

      {/* LEARN MODE INFO - Nur anzeigen wenn aktiviert */}
      {isLearnMode && (
        <div className="bg-green-500/10 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AcademicCapIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-green-400 mb-1">Lern-Modus aktiviert</h4>
              <p className="text-xs text-theme-secondary leading-relaxed">
                Klicke auf die 🎓 Icons neben Kennzahlen, um detaillierte Erklärungen, Berechnungen und Beispiele zu erhalten.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ULTRA CLEAN ÜBERSICHT */}
      {hasKeyMetrics ? (
        <div className="bg-theme-card rounded-lg">
          <div className="px-6 py-4 border-b border-theme/5">
            <h3 className="text-xl font-bold text-theme-primary">Übersicht</h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* MARKTDATEN - KORRIGIERT */}
              <div className="bg-theme-secondary/20 rounded-lg p-4 border-l-4 border-theme-primary">
                <h4 className="text-theme-primary font-semibold text-sm flex items-center mb-4">
                  <div className="w-3 h-3 bg-theme-primary rounded-full mr-3"></div>
                  Marktdaten
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="text-theme-secondary text-sm">Marktkapitalisierung</span>
                      <LearnTooltipButton {...LEARN_DEFINITIONS.market_cap} />
                    </div>
                    <span className="text-theme-primary font-semibold">
                      {liveMarketCap != null ? formatMarketCap(liveMarketCap) : '–'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="text-theme-secondary text-sm">Volumen</span>
                      <LearnTooltipButton term="trading_volume" />
                    </div>
                    <span className="text-theme-primary font-semibold">
                      {volume != null ? `${(volume / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Mio.` : '–'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="text-theme-secondary text-sm">Beta</span>
                      <LearnTooltipButton {...LEARN_DEFINITIONS.beta} />
                    </div>
                    <span className="text-theme-primary font-semibold">
                      {profileData?.beta != null ? profileData.beta.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '–'}
                    </span>
                  </div>
                  {currentShares && (
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-theme-secondary text-sm">Ausstehende Aktien</span>
                      <span className="text-theme-primary font-semibold">
                        {(currentShares / 1e9).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mrd.
                      </span>
                    </div>
                  )}
                  {/* Day Range */}
                  {previousClose && livePrice && (
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-theme-secondary text-sm">Tagesspanne</span>
                      <span className="text-theme-primary font-semibold">
                        {Math.min(previousClose, livePrice).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - {Math.max(previousClose, livePrice).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {/* 52-Week Range */}
                  {week52Low && week52High && (
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-theme-secondary text-sm">52-Wochen-Spanne</span>
                      <span className="text-theme-primary font-semibold">
                        {week52Low.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - {week52High.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* DIVIDENDE - KORRIGIERT */}
              <div className="bg-theme-secondary/20 rounded-lg p-4 border-l-4 border-theme-primary relative">
                <h4 className="text-theme-primary font-semibold text-sm flex items-center mb-4">
                  <div className="w-3 h-3 bg-theme-primary rounded-full mr-3"></div>
                  Dividende
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="text-theme-secondary text-sm">Rendite</span>
                      <LearnTooltipButton {...LEARN_DEFINITIONS.dividend_yield} />
                    </div>
                    <span className="text-theme-primary font-semibold">
                      {enhancedDividendData?.currentYield != null ? 
                        formatPercentage(enhancedDividendData.currentYield * 100) : 
                        keyMetrics.dividendYield != null ? formatPercentage(keyMetrics.dividendYield * 100) : '–'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="text-theme-secondary text-sm">Payout Ratio</span>
                      <LearnTooltipButton {...LEARN_DEFINITIONS.payout_ratio} />
                    </div>
                    <span className="text-theme-primary font-semibold">
                      {enhancedDividendData?.payoutRatio != null ? 
                        formatPercentage(enhancedDividendData.payoutRatio * 100) : 
                        keyMetrics.payoutRatio != null ? formatPercentage(keyMetrics.payoutRatio * 100) : '–'}
                    </span>
                  </div>
                  
                  {enhancedDividendData?.payoutSafety && payoutSafetyStyles && (
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-theme-secondary text-sm">Einschätzung</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${payoutSafetyStyles.bg}`} />
                        <span className={`text-xs font-medium ${payoutSafetyStyles.text}`}>
                          {enhancedDividendData.payoutSafety.text}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {enhancedDividendData?.exDividendDate && (
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-theme-secondary text-sm">Ex-Dividende</span>
                      <span className="text-theme-primary font-semibold">
                        {new Date(enhancedDividendData.exDividendDate).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  )}
                  
                  {enhancedDividendData?.lastDividendDate && (
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-theme-secondary text-sm">Letzte Zahlung</span>
                      <span className="text-theme-primary font-semibold">
                        {new Date(enhancedDividendData.lastDividendDate).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-theme/20">
                    <Link
                      href={`/analyse/stocks/${ticker.toLowerCase()}/dividends/`}
                      className="text-xs text-theme-secondary hover:text-theme-primary transition-colors flex items-center gap-1 group"
                    >
                      <svg className="w-3 h-3 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="group-hover:text-blue-400 transition-colors">Erweiterte Analyse</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* BEWERTUNG - KORRIGIERT (aber Premium Blur bleibt) */}
              <div className="bg-theme-secondary/20 rounded-lg p-4 border-l-4 border-theme-primary relative">
                <h4 className="text-theme-primary font-semibold text-sm flex items-center mb-4">
                  <div className="w-3 h-3 bg-theme-primary rounded-full mr-3"></div>
                  Bewertung
                </h4>
                {user?.isPremium ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="text-theme-secondary text-sm">KGV TTM</span>
                        <LearnTooltipButton {...LEARN_DEFINITIONS.pe_ratio} />
                      </div>
                      <span className="text-theme-primary font-semibold">
                        {peTTM != null ? `${peTTM.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x` : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="text-theme-secondary text-sm">KGV Erw.</span>
                        <LearnTooltipButton term="forward_pe" />
                      </div>
                      <span className="text-theme-primary font-semibold">
                        {forwardPE != null ? `${forwardPE.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x` : '–'}
                      </span>
                    </div>
                  



<div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-theme-secondary text-sm">KBV TTM</span>
                        <LearnTooltipButton {...LEARN_DEFINITIONS.pb_ratio} />
                      </div>
                      <span className="text-theme-primary font-semibold">
                        {pbTTM != null ? `${pbTTM.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x` : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="text-theme-secondary text-sm">FCF Yield</span>
                        <LearnTooltipButton term="fcf_yield" />
                      </div>
                      <span className="text-theme-primary font-semibold">
                        {fcfYield != null ? formatPercentage(fcfYield * 100) : '–'}
                      </span>
                    </div>
                  



                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-theme-secondary text-sm">EV/EBIT</span>
                      <span className="text-theme-primary font-semibold">
                        {evEbit != null ? `${evEbit.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x` : '–'}
                      </span>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-theme/20">
                      <Link
                        href={`/analyse/stocks/${ticker.toLowerCase()}/valuation/`}
                        className="text-xs text-theme-secondary hover:text-theme-primary transition-colors flex items-center gap-1 group"
                      >
                        <svg className="w-3 h-3 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="group-hover:text-blue-400 transition-colors">Erweiterte Analyse</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <PremiumBlur featureName="Bewertung">





                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-theme-secondary text-sm">KGV TTM</span>
                          <LearnTooltipButton {...LEARN_DEFINITIONS.pe_ratio} />
                        </div>
                        <span className="text-theme-primary font-semibold">
                          {peTTM != null ? `${peTTM.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x` : '–'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-theme-secondary text-sm">KGV Erw.</span>
                          <LearnTooltipButton term="forward_pe" />
                        </div>
                        <span className="text-theme-primary font-semibold">
                          {forwardPE != null ? `${forwardPE.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x` : '–'}
                        </span>
                      </div>
                      

                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-theme-secondary text-sm">KBV TTM</span>
                          <LearnTooltipButton {...LEARN_DEFINITIONS.pb_ratio} />
                        </div>
                        <span className="text-theme-primary font-semibold">
                          {pbTTM != null ? `${pbTTM.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x` : '–'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-theme-secondary text-sm">FCF Yield</span>
                          <LearnTooltipButton term="fcf_yield" />
                        </div>
                        <span className="text-theme-primary font-semibold">
                          {fcfYield != null ? formatPercentage(fcfYield * 100) : '–'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <span className="text-theme-secondary text-sm">EV/EBIT</span>
                        <span className="text-theme-primary font-semibold">
                          {evEbit != null ? `${evEbit.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x` : '–'}
                        </span>
                      </div>





                    </div>
                  </PremiumBlur>
                )}
              </div>

              {/* MARGEN - KORRIGIERT (aber Premium Blur bleibt) */}
              <div className="bg-theme-secondary/20 rounded-lg p-4 border-l-4 border-theme-primary relative">
                <h4 className="text-theme-primary font-semibold text-sm flex items-center mb-4">
                  <div className="w-3 h-3 bg-theme-primary rounded-full mr-3"></div>
                  Margen
                </h4>
                {user?.isPremium ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="text-theme-secondary text-sm">Bruttomarge</span>
                        <LearnTooltipButton term="Bruttomarge" />
                      </div>
                      <span className="text-theme-primary font-semibold">
                        {grossMargin != null ? formatPercentage(grossMargin * 100) : '–'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="text-theme-secondary text-sm">Op. Marge</span>
                        <LearnTooltipButton term="Op. Marge" />
                      </div>
                      <span className="text-theme-primary font-semibold">
                        {operatingMargin != null ? formatPercentage(operatingMargin * 100) : '–'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="text-theme-secondary text-sm">Nettomarge</span>
                        <LearnTooltipButton term="Nettomarge" />
                      </div>
                      <span className="text-theme-primary font-semibold">
                        {profitMargin != null ? formatPercentage(profitMargin * 100) : '–'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <PremiumBlur featureName="Margen">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-theme-secondary text-sm">Bruttomarge</span>
                          <LearnTooltipButton term="Bruttomarge" />
                        </div>
                        <span className="text-theme-primary font-semibold">
                          {grossMargin != null ? formatPercentage(grossMargin * 100) : '–'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-theme-secondary text-sm">Op. Marge</span>
                          <LearnTooltipButton term="Op. Marge" />
                        </div>
                        <span className="text-theme-primary font-semibold">
                          {operatingMargin != null ? formatPercentage(operatingMargin * 100) : '–'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <div className="flex items-center gap-2">
                          <span className="text-theme-secondary text-sm">Nettomarge</span>
                          <LearnTooltipButton term="Nettomarge" />
                        </div>
                        <span className="text-theme-primary font-semibold">
                          {profitMargin != null ? formatPercentage(profitMargin * 100) : '–'}
                        </span>
                      </div>
                    </div>
                  </PremiumBlur>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-theme-card rounded-lg p-6 text-center">
          <LoadingSpinner />
          <p className="text-theme-secondary mt-3">Key Metrics werden geladen...</p>
        </div>
      )}

      {/* ✅ BULLS/BEARS + GROWTH + CHART SEKTION - ULTRA CLEAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LINKE SPALTE: BULLS/BEARS + GROWTH */}
        <div className="lg:col-span-1 space-y-6">
          {/* BULLS/BEARS SEKTION - LAZY LOADED */}
          <LazyWrapper 
            minHeight="400px" 
            rootMargin="300px"
            className="bg-theme-card rounded-lg"
            fallback={
              <div className="bg-theme-card rounded-lg p-6 flex items-center justify-center" style={{ minHeight: '400px' }}>
                <div className="text-center">
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-4 bg-theme-tertiary rounded w-3/4"></div>
                      <div className="h-4 bg-theme-tertiary rounded w-1/2"></div>
                    </div>
                  </div>
                  <p className="text-theme-muted text-sm mt-4">Lade Bulls & Bears Analyse...</p>
                </div>
              </div>
            }
          >
            <BullsBearsSection 
              ticker={ticker}
              isPremium={user?.isPremium || false}
            />
          </LazyWrapper>
          
          {/* GROWTH SEKTION - LAZY LOADED */}
          <LazyWrapper 
            minHeight="300px" 
            rootMargin="250px"
            className="bg-theme-card rounded-lg"
            fallback={
              <div className="bg-theme-card rounded-lg p-6 flex items-center justify-center" style={{ minHeight: '300px' }}>
                <div className="text-center">
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-3 py-1">
                      <div className="h-4 bg-theme-tertiary rounded w-2/3"></div>
                      <div className="h-4 bg-theme-tertiary rounded w-1/3"></div>
                      <div className="h-4 bg-theme-tertiary rounded w-1/2"></div>
                    </div>
                  </div>
                  <p className="text-theme-muted text-sm mt-4">Lade Wachstums-Analyse...</p>
                </div>
              </div>
            }
          >
            <GrowthSection 
              ticker={ticker}
              isPremium={user?.isPremium || false}
            />
          </LazyWrapper>
        </div>

        {/* ✅ HISTORISCHER KURSVERLAUF - ULTRA CLEAN */}
        <div className="lg:col-span-2">
          {history.length > 0 ? (
            <div className="bg-theme-card rounded-lg">
              <div className="px-6 py-4 border-b border-theme/5">
                <h3 className="text-xl font-bold text-theme-primary">Historischer Kursverlauf</h3>
              </div>
              <div className="p-6 relative">
                <WorkingStockChart 
                  ticker={ticker} 
                  data={history} 
                  onAddComparison={handleAddComparison}
                />
              </div>
            </div>
          ) : (
            <div className="bg-theme-card rounded-lg">
              <div className="px-6 py-4 border-b border-theme/5">
                <h3 className="text-xl font-bold text-theme-primary">Historischer Kursverlauf</h3>
              </div>
              <div className="p-6 flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ✅ KENNZAHLEN-CHARTS - ULTRA CLEAN (KEINE ÄUSSERE BOX!) */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-theme-primary">Kennzahlen-Charts</h3>
        {user?.isPremium ? (
          <FinancialAnalysisClient 
            ticker={ticker} 
            isPremium={user?.isPremium}
            userId={user?.id}
          />
        ) : (
          <PremiumCTA
            title="Interaktive Kennzahlen-Charts"
            description="Analysiere detaillierte Finanzkennzahlen mit interaktiven Charts und Zeitraumauswahl."
          />
        )}
      </div>

      {/* ✅ WALL STREET + ESTIMATES - ULTRA CLEAN */}
      {(estimates.length > 0 || recs) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* WALL STREET RATINGS */}
          {recs && (
            <div className="bg-theme-card rounded-lg">
              <div className="px-6 py-4 border-b border-theme/5">
                <h3 className="text-lg font-bold text-theme-primary">Wall Street Bewertungen</h3>
              </div>
              <div className="p-6">
                {user?.isPremium ? (
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-green-400 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        Strong Buy
                      </span>
                      <span className="text-theme-primary font-bold">{recs.strongBuy}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-green-300 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                        Buy
                      </span>
                      <span className="text-theme-primary font-bold">{recs.buy}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-yellow-400 flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        Hold
                      </span>
                      <span className="text-theme-primary font-bold">{recs.hold}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-red-300 flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                        Sell
                      </span>
                      <span className="text-theme-primary font-bold">{recs.sell}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                      <span className="text-red-400 flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        Strong Sell
                      </span>
                      <span className="text-theme-primary font-bold">{recs.strongSell}</span>
                    </div>
                    
                    {/* Summary */}
                    <div className="mt-6 pt-4 border-t border-theme">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-theme-secondary">Gesamt Analysten:</span>
                        <span className="text-theme-primary font-medium">
                          {recs.strongBuy + recs.buy + recs.hold + recs.sell + recs.strongSell}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-theme-secondary">Bullish:</span>
                        <span className="text-green-400 font-medium">
                          {Math.round(((recs.strongBuy + recs.buy) / Math.max(1, recs.strongBuy + recs.buy + recs.hold + recs.sell + recs.strongSell)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <PremiumBlur featureName="Wall Street">
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <span className="text-green-400 flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          Strong Buy
                        </span>
                        <span className="text-theme-primary font-bold">{recs.strongBuy}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <span className="text-green-300 flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                          Buy
                        </span>
                        <span className="text-theme-primary font-bold">{recs.buy}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <span className="text-yellow-400 flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                          Hold
                        </span>
                        <span className="text-theme-primary font-bold">{recs.hold}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <span className="text-red-300 flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                          Sell
                        </span>
                        <span className="text-theme-primary font-bold">{recs.sell}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-theme/10 last:border-b-0">
                        <span className="text-red-400 flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                          Strong Sell
                        </span>
                        <span className="text-theme-primary font-bold">{recs.strongSell}</span>
                      </div>
                    </div>
                  </PremiumBlur>
                )}
              </div>
            </div>
          )}

          {estimates.length > 0 && (
            <div className="lg:col-span-2 bg-theme-card rounded-lg">
              <div className="px-6 py-4 border-b border-theme/5">
                <h3 className="text-lg font-bold text-theme-primary">
                  Analysten Schätzungen (ab {new Date().getFullYear()})
                </h3>
              </div>
              <div className="p-6">
                {user?.isPremium ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
         
{/* Revenue Estimates */}
<div>
  <h4 className="text-sm font-semibold text-theme-primary mb-4">Umsatzschätzungen</h4>
  <div className="overflow-x-auto">
    <table className="professional-table">
      <thead>
        <tr>
          <th>GJ</th>
          <th className="text-right">Durchschnitt</th>
          <th className="text-right">Niedrig</th>
          <th className="text-right">Hoch</th>
          <th className="text-right">Analysten</th>
          <th className="text-right">YoY</th>
        </tr>
      </thead>
      <tbody>
        {estimates.slice().reverse().map((e, idx, arr) => {
          const fy = e.date.slice(0, 4)
          let yoy: number | null = null
          if (idx > 0) {
            const prev = arr[idx - 1].estimatedRevenueAvg
            if (prev > 0) {
              yoy = ((e.estimatedRevenueAvg - prev) / prev) * 100
            }
          }

          return (
            <tr key={e.date}>
              <td className="font-medium">{fy}</td>
              <td className="text-right">{formatCurrency(e.estimatedRevenueAvg)}</td>
              <td className="text-right text-theme-secondary">{formatCurrency(e.estimatedRevenueLow)}</td>
              <td className="text-right text-theme-secondary">{formatCurrency(e.estimatedRevenueHigh)}</td>
              <td className="text-right text-theme-secondary">
                {e.numberAnalystEstimatedRevenue || '–'}
              </td>
              <td className={`text-right font-medium ${
                yoy == null ? 'text-theme-secondary' : 
                yoy > 0 ? 'text-green-400' : 
                'text-red-400'
              }`}>
                {yoy == null ? '–' : `${yoy >= 0 ? '+' : ''}${yoy.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
</div>

{/* Earnings Estimates */}
<div>
  <h4 className="text-sm font-semibold text-theme-primary mb-4">Gewinnschätzungen</h4>
  <div className="overflow-x-auto">
    <table className="professional-table">
      <thead>
        <tr>
          <th>GJ</th>
          <th className="text-right">EPS Durchschn.</th>
          <th className="text-right">Niedrig</th>
          <th className="text-right">Hoch</th>
          <th className="text-right">Analysten</th>
          <th className="text-right">YoY</th>
        </tr>
      </thead>
      <tbody>
        {estimates.slice().reverse().map((e, idx, arr) => {
          const fy = e.date.slice(0, 4)
          let yoy: number | null = null
          if (idx > 0) {
            const prev = arr[idx - 1].estimatedEpsAvg
            if (prev !== 0) {
              yoy = ((e.estimatedEpsAvg - prev) / prev) * 100
            }
          }

          return (
            <tr key={e.date}>
              <td className="font-medium">{fy}</td>
              <td className="text-right">{formatCurrency(e.estimatedEpsAvg)}</td>
              <td className="text-right text-theme-secondary">{formatCurrency(e.estimatedEpsLow)}</td>
              <td className="text-right text-theme-secondary">{formatCurrency(e.estimatedEpsHigh)}</td>
              <td className="text-right text-theme-secondary">
                {e.numberAnalystsEstimatedEps || '–'}
              </td>
              <td className={`text-right font-medium ${
                yoy == null ? 'text-theme-secondary' : 
                yoy > 0 ? 'text-green-400' : 
                'text-red-400'
              }`}>
                {yoy == null ? '–' : `${yoy >= 0 ? '+' : ''}${yoy.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
</div>
                 
                  </div>
                ) : (
                  <PremiumBlur featureName="Schätzungen">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-sm font-semibold text-theme-primary mb-4">Umsatzschätzungen</h4>
                        <div className="overflow-x-auto">
                          <table className="professional-table">
                            <thead>
                              <tr>
                                <th>FY</th>
                                <th className="text-right">Avg</th>
                                <th className="text-right">Low</th>
                                <th className="text-right">High</th>
                                <th className="text-right">YoY</th>
                              </tr>
                            </thead>
                            <tbody>
                              {estimates.slice().reverse().map((e, idx, arr) => {
                                const fy = e.date.slice(0, 4)
                                let yoy: number | null = null
                                if (idx > 0) {
                                  const prev = arr[idx - 1].estimatedRevenueAvg
                                  if (prev > 0) {
                                    yoy = ((e.estimatedRevenueAvg - prev) / prev) * 100
                                  }
                                }
                                const yoyClass = yoy == null ? '' : yoy >= 0 ? 'text-green-400' : 'text-red-400'

                                return (
                                  <tr key={e.date}>
                                    <td className="font-medium">{fy}</td>
                                    <td className="text-right">{formatCurrency(e.estimatedRevenueAvg)}</td>
                                    <td className="text-right text-theme-secondary">{formatCurrency(e.estimatedRevenueLow)}</td>
                                    <td className="text-right text-theme-secondary">{formatCurrency(e.estimatedRevenueHigh)}</td>
                                    <td className={`text-right font-medium ${yoyClass}`}>
                                      {yoy == null ? '–' : `${yoy >= 0 ? '+' : ''}${yoy.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-theme-primary mb-4">Gewinnschätzungen</h4>
                        <div className="overflow-x-auto">
                          <table className="professional-table">
                            <thead>
                              <tr>
                                <th>FY</th>
                                <th className="text-right">EPS Avg</th>
                                <th className="text-right">Low</th>
                                <th className="text-right">High</th>
                                <th className="text-right">YoY</th>
                              </tr>
                            </thead>
                            <tbody>
                              {estimates.slice().reverse().map((e, idx, arr) => {
                                const fy = e.date.slice(0, 4)
                                let yoy: number | null = null
                                if (idx > 0) {
                                  const prev = arr[idx - 1].estimatedEpsAvg
                                  if (prev !== 0) {
                                    yoy = ((e.estimatedEpsAvg - prev) / prev) * 100
                                  }
                                }
                                const yoyClass = yoy == null ? '' : yoy >= 0 ? 'text-green-400' : 'text-red-400'

                                return (
                                  <tr key={e.date}>
                                    <td className="font-medium">{fy}</td>
                                    <td className="text-right">{formatCurrency(e.estimatedEpsAvg)}</td>
                                    <td className="text-right text-theme-secondary">{formatCurrency(e.estimatedEpsLow)}</td>
                                    <td className="text-right text-theme-secondary">{formatCurrency(e.estimatedEpsHigh)}</td>
                                    <td className={`text-right font-medium ${yoyClass}`}>
                                      {yoy == null ? '–' : `${yoy >= 0 ? '+' : ''}${yoy.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </PremiumBlur>
                )}
              </div>



              <div className="px-6 pb-4 border-t border-theme/10">
                <Link
                  href={`/analyse/stocks/${ticker.toLowerCase()}/estimates`}
                  className="inline-flex items-center gap-2 text-sm text-theme-secondary hover:text-green-400 transition-colors group"
                >
                  <svg className="w-4 h-4 group-hover:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Erweiterte Schätzungen & Kursziele anzeigen</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>




            </div>
          )}
        </div>
      )}
    
      {/* ✅ COMPANY PROFILE + OWNERSHIP - SIDE-BY-SIDE LAYOUT */}
      {profileData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ✅ COMPANY PROFILE + EMPLOYEE COUNT - LINKE SPALTE */}
          <div className="space-y-6">
            
            {/* Company Profile */}
            <div className="bg-theme-card rounded-lg">
              <div className="px-6 py-4 border-b border-theme/5">
                <h3 className="text-xl font-bold text-theme-primary">Company Profile</h3>
              </div>
              
              <div className="p-6">
                {/* Info-Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  
                  {/* Basis-Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">Basics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-theme-secondary">Sektor</span>
                        <span className="text-theme-primary font-medium">{profileData.sector ?? '–'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-secondary">Branche</span>
                        <span className="text-theme-primary font-medium">{profileData.industry ?? '–'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-secondary">IPO</span>
                        <span className="text-theme-primary font-medium">{profileData.ipoDate?.slice(0, 4) ?? '–'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Größe & Kontakt */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">Größe</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-theme-secondary">Mitarbeiter</span>
                        <span className="text-theme-primary font-medium">
                          {profileData.fullTimeEmployees ? 
                            `${(Number(profileData.fullTimeEmployees) / 1000).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k` : '–'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-secondary">Land</span>
                        <span className="text-theme-primary font-medium">{profileData.country ?? '–'}</span>
                      </div>
                      <div>
                        <span className="text-theme-secondary block mb-1">Website</span>
                        <a
                          href={profileData.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300 transition-colors text-sm font-medium"
                        >
                          {profileData.website?.replace(/^https?:\/\//, '') ?? '–'}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Beschreibung */}
                <div>
                  <h4 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide mb-3">Über das Unternehmen</h4>
                  <p className="text-theme-secondary leading-relaxed text-sm">
                    {profileData.description ? 
                      profileData.description.length > 400 ? 
                        profileData.description.substring(0, 400) + '...' : 
                        profileData.description 
                      : 'Keine Beschreibung verfügbar.'}
                  </p>
                </div>
              </div>
            </div>

            {/* ✨ Company Efficiency Metrics - LAZY LOADED */}
            <LazyWrapper 
              minHeight="250px" 
              rootMargin="200px"
              fallback={
                <div className="bg-theme-card rounded-lg p-6 flex items-center justify-center" style={{ minHeight: '250px' }}>
                  <div className="text-center">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-theme-tertiary rounded w-1/2"></div>
                      <div className="h-4 bg-theme-tertiary rounded w-3/4"></div>
                      <div className="h-4 bg-theme-tertiary rounded w-1/3"></div>
                    </div>
                    <p className="text-theme-muted text-sm mt-4">Lade Effizienz-Kennzahlen...</p>
                  </div>
                </div>
              }
            >
              <CompanyEfficiencyMetrics 
                ticker={ticker} 
                isPremium={user?.isPremium || false} 
              />
            </LazyWrapper>
            
          </div>

          {/* ✅ OWNERSHIP STRUCTURE - LAZY LOADED */}
          <LazyWrapper 
            minHeight="350px" 
            rootMargin="200px"
            fallback={
              <div className="bg-theme-card rounded-lg p-6 flex items-center justify-center" style={{ minHeight: '350px' }}>
                <div className="text-center">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-theme-tertiary rounded w-2/3"></div>
                    <div className="h-4 bg-theme-tertiary rounded w-1/2"></div>
                    <div className="h-4 bg-theme-tertiary rounded w-3/4"></div>
                  </div>
                  <p className="text-theme-muted text-sm mt-4">Lade Eigentümerstruktur...</p>
                </div>
              </div>
            }
          >
            <OwnershipSection 
              ticker={ticker} 
              isPremium={user?.isPremium || false} 
            />
          </LazyWrapper>
        </div>
      )}
    </div>
  )
}