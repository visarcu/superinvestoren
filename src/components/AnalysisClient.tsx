// src/components/AnalysisClient.tsx - VOLLSTÄNDIG SICHER
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { stocks } from '../data/stocks'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { InformationCircleIcon, AcademicCapIcon, XMarkIcon, BoltIcon } from '@heroicons/react/24/outline'
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
    <div className="w-16 h-16 bg-gradient-to-br from-brand/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
      <svg className="w-8 h-8 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <LockClosedIcon className="w-5 h-5 text-brand mx-auto mb-1" />
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
    formatAxisValueDE,
    setCurrency,
    detectCurrencyFromTicker 
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
  const [dividendApiData, setDividendApiData] = useState<any>(null)

    // ✅ FCF Yield State
    const [fcfYield, setFcfYield] = useState<number | null>(null)

    // ✅ SBC (Stock-Based Compensation) States
    const [sbcAdjFcfYield, setSbcAdjFcfYield] = useState<number | null>(null)
    const [sbcImpact, setSbcImpact] = useState<number | null>(null)
    const [stockBasedCompensation, setStockBasedCompensation] = useState<number | null>(null)

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

  // Automatische Währungserkennung basierend auf Ticker
  useEffect(() => {
    // Einfache Ticker-basierte Erkennung als Sofort-Lösung
    const detectedCurrency = detectCurrencyFromTicker(ticker)
    setCurrency(detectedCurrency)
    
    // TODO: Später aus API-Response nehmen:
    // if (stockData?.reportedCurrency) {
    //   setCurrency(detectCurrencyFromAPI(stockData.reportedCurrency))
    // }
  }, [ticker, setCurrency, detectCurrencyFromTicker])

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
      green: { bg: 'bg-green-400 animate-pulse', text: 'text-brand-light' },
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
    
    // Optimized fallback function with parallel API calls  
    async function loadAllDataFallback() {
      console.log(`🚀 [AnalysisClient] Using optimized parallel API calls for ${ticker}`)
      
      // Start all API calls in parallel using Promise.allSettled
      const apiCalls = await Promise.allSettled([
        fetch(`/api/profile/${ticker}`),           // 0
        fetch(`/api/historical/${ticker}`),        // 1
        fetch(`/api/financials/${ticker}`),        // 2
        fetch(`/api/dividends/${ticker}`),         // 3
        fetch(`/api/quote/${ticker}`),             // 4
        fetch(`/api/shares/${ticker}`),            // 5
        fetch(`/api/outlook/${ticker}`),           // 6
        fetch(`/api/balance-sheet/${ticker}`),     // 7
        fetch(`/api/income-statement/${ticker}`),  // 8
        fetch(`/api/enterprise-values/${ticker}`), // 9
        fetch(`/api/estimates/${ticker}`),         // 10
        fetch(`/api/recommendations/${ticker}`),   // 11
        fetch(`/api/cash-flow-statement/${ticker}`) // 12
      ])

      // Process Profile data
      if (apiCalls[0].status === 'fulfilled' && apiCalls[0].value.ok) {
        try {
          const data = await apiCalls[0].value.json()
          const [p] = data as Profile[]
          setProfileData(p)
          setIrWebsite(p.website ?? null)
        } catch {
          console.warn(`[AnalysisClient] Profile für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] Profile für ${ticker} fehlgeschlagen.`)
      }

      // Process Historical data
      if (apiCalls[1].status === 'fulfilled' && apiCalls[1].value.ok) {
        try {
          const { historical = [] } = await apiCalls[1].value.json()
          const arr = (historical as any[])
            .slice()
            .reverse()
            .map((h) => ({ date: h.date, close: h.close }))
          setHistory(arr)
        } catch {
          console.warn(`[AnalysisClient] History für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] History für ${ticker} fehlgeschlagen.`)
      }

      // Process Key Metrics
      if (apiCalls[2].status === 'fulfilled' && apiCalls[2].value.ok) {
        try {
          const { keyMetrics: km = {} } = await apiCalls[2].value.json()
          setKeyMetrics(km)
          setHasKeyMetrics(Object.keys(km).length > 0)
        } catch {
          console.warn(`[AnalysisClient] KeyMetrics für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] KeyMetrics für ${ticker} fehlgeschlagen.`)
      }

      // Process Enhanced Dividend Data
      if (apiCalls[3].status === 'fulfilled' && apiCalls[3].value.ok) {
        try {
          console.log(`🔍 [AnalysisClient] Loading enhanced dividend data...`)
          const dividendData = await apiCalls[3].value.json()
          setDividendApiData(dividendData)
          setEnhancedDividendData(dividendData.currentInfo)
          console.log(`✅ [AnalysisClient] Enhanced dividend data loaded:`, dividendData)
        } catch (error) {
          console.warn(`⚠️ [AnalysisClient] Enhanced dividend data failed for ${ticker}:`, error)
        }
      } else {
        console.warn(`⚠️ [AnalysisClient] Enhanced dividend data failed for ${ticker}`)
      }

      // Process Live Quote
      if (apiCalls[4].status === 'fulfilled' && apiCalls[4].value.ok) {
        try {
          const [q] = (await apiCalls[4].value.json()) as any[]
          setLivePrice(q.price)
          setLiveMarketCap(q.marketCap)
          setLiveChangePct(q.changesPercentage)
          setLivePriceAvg200(q.priceAvg200)
          setVolume(q.volume)
          setPreviousClose(q.previousClose)
          setWeek52Low(q.yearLow)
          setWeek52High(q.yearHigh)
        } catch {
          console.warn(`[AnalysisClient] LiveQuote für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] LiveQuote für ${ticker} fehlgeschlagen.`)
      }

      // Process Current Shares
      if (apiCalls[5].status === 'fulfilled' && apiCalls[5].value.ok) {
        try {
          const sharesData = (await apiCalls[5].value.json()) as any[]
          if (Array.isArray(sharesData) && sharesData.length > 0) {
            setCurrentShares(sharesData[0].outstandingShares)
          }
        } catch {
          console.warn(`[AnalysisClient] CurrentShares für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] CurrentShares für ${ticker} fehlgeschlagen.`)
      }

      // Process Company Outlook
      if (apiCalls[6].status === 'fulfilled' && apiCalls[6].value.ok) {
        try {
          const { ratios = [] } = (await apiCalls[6].value.json()) as any
          const r = ratios[0] ?? {}
          setPeTTM(r.peRatioTTM ?? null)
          setPegTTM(r.pegRatioTTM ?? null)
          setPsTTM(r.priceSalesRatioTTM ?? null)
        } catch {
          console.warn(`[AnalysisClient] CompanyOutlook für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] CompanyOutlook für ${ticker} fehlgeschlagen.`)
      }

      // Process Balance Sheet
      if (apiCalls[7].status === 'fulfilled' && apiCalls[7].value.ok) {
        try {
          const fin = (await apiCalls[7].value.json()) as any
          const L = Array.isArray(fin.financials) ? fin.financials[0] : fin[0]
          setCashBS(L.cashAndShortTermInvestments ?? null)
          setDebtBS(L.totalDebt ?? null)
          setNetDebtBS(L.netDebt ?? null)
        } catch {
          console.warn(`[AnalysisClient] Bilanzdaten für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] Bilanzdaten für ${ticker} fehlgeschlagen.`)
      }

      // Process Income Statement (for Margins)
      if (apiCalls[8].status === 'fulfilled' && apiCalls[8].value.ok) {
        try {
          const [inc] = (await apiCalls[8].value.json()) as any[]
          setGrossMargin(inc.grossProfitRatio ?? null)
          setOperatingMargin(inc.operatingIncomeRatio ?? null)
          setProfitMargin(inc.netIncomeRatio ?? null)
        } catch {
          console.warn(`[AnalysisClient] Margins für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] Margins für ${ticker} fehlgeschlagen.`)
      }

      // Process EV/EBIT calculation (requires both Enterprise Values and Income Statement)
      if (apiCalls[9].status === 'fulfilled' && apiCalls[9].value.ok && 
          apiCalls[8].status === 'fulfilled' && apiCalls[8].value.ok) {
        try {
          const [e] = (await apiCalls[9].value.json()) as any[]
          const [i] = (await apiCalls[8].value.json()) as any[]
          if (e.enterpriseValue && i.operatingIncome) {
            setEvEbit(e.enterpriseValue / i.operatingIncome)
          }
        } catch {
          console.warn(`[AnalysisClient] EV/EBIT für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] EV/EBIT für ${ticker} fehlgeschlagen.`)
      }

      // Process Estimates
      if (apiCalls[10].status === 'fulfilled' && apiCalls[10].value.ok) {
        try {
          const all = (await apiCalls[10].value.json()) as any[]
          const thisYear = new Date().getFullYear()
          setEstimates(all.filter((e) => parseInt(e.date.slice(0, 4), 10) >= thisYear))
        } catch {
          console.warn(`[AnalysisClient] Estimates für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] Estimates für ${ticker} fehlgeschlagen.`)
      }

      // Process Recommendations
      if (apiCalls[11].status === 'fulfilled' && apiCalls[11].value.ok) {
        try {
          const [a] = (await apiCalls[11].value.json()) as any[]
          setRecs({
            strongBuy: a.analystRatingsStrongBuy ?? 0,
            buy: a.analystRatingsbuy ?? 0,
            hold: a.analystRatingsHold ?? 0,
            sell: a.analystRatingsSell ?? 0,
            strongSell: a.analystRatingsStrongSell ?? 0,
          })
        } catch {
          console.warn(`[AnalysisClient] Recs für ${ticker} fehlgeschlagen.`)
        }
      } else {
        console.warn(`[AnalysisClient] Recs für ${ticker} fehlgeschlagen.`)
      }

      // Process Free Cash Flow Yield + SBC Analysis
      if (apiCalls[12].status === 'fulfilled' && apiCalls[12].value.ok && liveMarketCap) {
        try {
          const cfData = await apiCalls[12].value.json()
          const latestCF = Array.isArray(cfData) ? cfData[0] : cfData.financials?.[0]

          console.log(`🔍 [SBC Debug] Cash Flow Data for ${ticker}:`, {
            freeCashFlow: latestCF?.freeCashFlow,
            stockBasedCompensation: latestCF?.stockBasedCompensation,
            operatingCashFlow: latestCF?.operatingCashFlow,
            capitalExpenditure: latestCF?.capitalExpenditure,
            marketCap: liveMarketCap
          })

          if (latestCF?.freeCashFlow) {
            const fcf = latestCF.freeCashFlow
            // SBC ist in FMP als positiver Wert (Add-Back), wir brauchen den absoluten Wert
            const sbcRaw = latestCF.stockBasedCompensation || 0
            const sbc = Math.abs(sbcRaw) // Sicherstellen dass positiv

            // FCF Yield = Free Cash Flow / Market Cap
            const fcfYieldValue = fcf / liveMarketCap
            setFcfYield(fcfYieldValue)
            console.log(`✅ FCF Yield for ${ticker}: ${(fcfYieldValue * 100).toFixed(2)}%`)

            // SBC Analysis (only if SBC > 0)
            if (sbc > 0 && fcf > 0) {
              setStockBasedCompensation(sbc)
              const operatingCF = latestCF.operatingCashFlow || 0

              // WICHTIG: FMP's FCF beinhaltet SBC bereits als Add-Back im Operating Cash Flow
              // Adjusted FCF = FCF - SBC (der "wahre" FCF ohne SBC-Inflation)
              const adjustedFCF = fcf - sbc
              const adjFcfYieldValue = adjustedFCF / liveMarketCap
              setSbcAdjFcfYield(adjFcfYieldValue)

              // SBC Impact = SBC als % des Operating Cash Flow (Qualtrim-Style)
              // Das ist aussagekräftiger als SBC/FCF weil OCF die echte Basis ist
              const sbcImpactValue = operatingCF > 0 ? (-sbc / operatingCF) * 100 : (-sbc / fcf) * 100
              setSbcImpact(sbcImpactValue)

              console.log(`✅ SBC Analysis for ${ticker}:`)
              console.log(`   - Operating CF: ${(operatingCF / 1e9).toFixed(2)}B`)
              console.log(`   - FCF: ${(fcf / 1e9).toFixed(2)}B`)
              console.log(`   - SBC: ${(sbc / 1e9).toFixed(2)}B`)
              console.log(`   - Adjusted FCF: ${(adjustedFCF / 1e9).toFixed(2)}B`)
              console.log(`   - FCF Yield: ${(fcfYieldValue * 100).toFixed(2)}%`)
              console.log(`   - SBC Adj. FCF Yield: ${(adjFcfYieldValue * 100).toFixed(2)}%`)
              console.log(`   - SBC Impact (vs OCF): ${sbcImpactValue.toFixed(2)}%`)
            }
          }
        } catch (error) {
          console.warn(`[AnalysisClient] FCF Yield/SBC calculation failed for ${ticker}:`, error)
        }
      } else {
        console.warn(`[AnalysisClient] FCF Yield/SBC calculation failed for ${ticker}`)
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
        <div className="bg-brand/10 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AcademicCapIcon className="w-5 h-5 text-brand-light flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-brand-light mb-1">Lern-Modus aktiviert</h4>
              <p className="text-xs text-theme-secondary leading-relaxed">
                Klicke auf die 🎓 Icons neben Kennzahlen, um detaillierte Erklärungen, Berechnungen und Beispiele zu erhalten.
              </p>
            </div>
          </div>
        </div>
      )}




{/* =====================================================
   ÜBERSICHT SECTION v4 - MIT SUBTILEN TRENNLINIEN
   
   Ersetze die komplette "ULTRA CLEAN ÜBERSICHT" Section
   ===================================================== */}

{/* ===== ÜBERSICHT - CLEAN WITH DIVIDERS ===== */}
<div className="bg-theme-card rounded-xl border border-white/[0.04]">
  <div className="px-6 py-4 border-b border-white/[0.04]">
    <h3 className="text-lg font-semibold text-theme-primary">Übersicht</h3>
  </div>
  
  <div className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      
      {/* ===== MARKTDATEN ===== */}
      <div>
        <h4 className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-4">
          Marktdaten
        </h4>
        <div className="divide-y divide-white/[0.04]">
          <div className="flex justify-between items-center py-2.5 first:pt-0">
            <span className="text-sm text-theme-secondary">Marktkapitalisierung</span>
            <span className="text-sm font-semibold text-theme-primary">
              {liveMarketCap != null ? formatMarketCap(liveMarketCap) : '–'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-theme-secondary">Volumen</span>
            <span className="text-sm font-semibold text-theme-primary">
              {volume != null ? `${(volume / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 0 })} Mio.` : '–'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-theme-secondary">Beta</span>
            <span className="text-sm font-semibold text-theme-primary">
              {profileData?.beta?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '–'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-theme-secondary">Tagesspanne</span>
            <span className="text-sm font-semibold text-theme-primary">
              {previousClose && livePrice 
                ? `${Math.min(previousClose, livePrice).toLocaleString('de-DE', { minimumFractionDigits: 2 })} - ${Math.max(previousClose, livePrice).toLocaleString('de-DE', { minimumFractionDigits: 2 })}`
                : '–'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5 last:pb-0">
            <span className="text-sm text-theme-secondary">52W-Spanne</span>
            <span className="text-sm font-semibold text-theme-primary">
              {week52Low && week52High 
                ? `${week52Low.toLocaleString('de-DE', { minimumFractionDigits: 2 })} - ${week52High.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`
                : '–'}
            </span>
          </div>
        </div>
      </div>

      {/* ===== DIVIDENDE ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-theme-muted uppercase tracking-wider">
            Dividende
          </h4>
          <Link
            href={`/analyse/stocks/${ticker.toLowerCase()}/dividends`}
            className="text-xs text-theme-muted hover:text-brand transition-colors"
          >
            Details →
          </Link>
        </div>
        <div className="divide-y divide-white/[0.04]">
          <div className="flex justify-between items-center py-2.5 first:pt-0">
            <span className="text-sm text-theme-secondary">Rendite</span>
            <span className="text-sm font-semibold text-theme-primary">
              {enhancedDividendData?.currentYield != null 
                ? formatPercentage(enhancedDividendData.currentYield * 100) 
                : '–'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-theme-secondary">Payout Ratio</span>
            <span className="text-sm font-semibold text-theme-primary">
              {enhancedDividendData?.payoutRatio != null 
                ? formatPercentage(enhancedDividendData.payoutRatio * 100) 
                : '–'}
            </span>
          </div>
          {enhancedDividendData?.payoutSafety && (
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-theme-secondary">Einschätzung</span>
              <span className="text-sm font-semibold text-theme-primary">
                {enhancedDividendData.payoutSafety.text}
              </span>
            </div>
          )}
          {enhancedDividendData?.lastDividendDate && (
            <div className="flex justify-between items-center py-2.5 last:pb-0">
              <span className="text-sm text-theme-secondary">Letzte Zahlung</span>
              <span className="text-sm font-semibold text-theme-primary">
                {new Date(enhancedDividendData.lastDividendDate).toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ===== BEWERTUNG ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-theme-muted uppercase tracking-wider">
            Bewertung
          </h4>
          <Link
            href={`/analyse/stocks/${ticker.toLowerCase()}/valuation`}
            className="text-xs text-theme-muted hover:text-brand transition-colors"
          >
            Details →
          </Link>
        </div>
        
        {user?.isPremium ? (
          <div className="divide-y divide-white/[0.04]">
            <div className="flex justify-between items-center py-2.5 first:pt-0">
              <span className="text-sm text-theme-secondary">KGV TTM</span>
              <span className="text-sm font-semibold text-theme-primary">
                {peTTM != null ? `${peTTM.toLocaleString('de-DE', { maximumFractionDigits: 1 })}x` : '–'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-theme-secondary">KGV Erw.</span>
              <span className="text-sm font-semibold text-theme-primary">
                {forwardPE != null ? `${forwardPE.toLocaleString('de-DE', { maximumFractionDigits: 1 })}x` : '–'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-theme-secondary">FCF Yield</span>
              <span className="text-sm font-semibold text-theme-primary">
                {fcfYield != null ? formatPercentage(fcfYield * 100) : '–'}
              </span>
            </div>
            {stockBasedCompensation != null && stockBasedCompensation > 0 && (
              <>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-theme-secondary">SBC Adj. FCF</span>
                  <span className="text-sm font-semibold text-theme-primary">
                    {sbcAdjFcfYield != null ? formatPercentage(sbcAdjFcfYield * 100) : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-theme-secondary">SBC Impact</span>
                  <span className={`text-sm font-semibold ${
                    sbcImpact != null && sbcImpact < -15 ? 'text-negative' : 
                    sbcImpact != null && sbcImpact < -5 ? 'text-amber-500' : 
                    'text-theme-primary'
                  }`}>
                    {sbcImpact != null ? `${sbcImpact.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%` : '–'}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-2.5 last:pb-0">
              <span className="text-sm text-theme-secondary">EV/EBIT</span>
              <span className="text-sm font-semibold text-theme-primary">
                {evEbit != null ? `${evEbit.toLocaleString('de-DE', { maximumFractionDigits: 1 })}x` : '–'}
              </span>
            </div>
          </div>
        ) : (
          <div className="relative min-h-[180px]">
            <div className="filter blur-sm opacity-40 pointer-events-none divide-y divide-white/[0.04]">
              <div className="flex justify-between py-2.5 first:pt-0"><span className="text-sm">KGV TTM</span><span className="text-sm">34,3x</span></div>
              <div className="flex justify-between py-2.5"><span className="text-sm">KGV Erw.</span><span className="text-sm">25,7x</span></div>
              <div className="flex justify-between py-2.5"><span className="text-sm">FCF Yield</span><span className="text-sm">+1,99%</span></div>
              <div className="flex justify-between py-2.5"><span className="text-sm">EV/EBIT</span><span className="text-sm">28,5x</span></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Link href="/pricing" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 hover:bg-brand/20 rounded-lg text-xs font-medium text-brand transition-colors">
                <LockClosedIcon className="w-3.5 h-3.5" />
                Premium freischalten
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ===== MARGEN ===== */}
      <div>
        <h4 className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-4">
          Margen
        </h4>
        
        {user?.isPremium ? (
          <div className="divide-y divide-white/[0.04]">
            <div className="flex justify-between items-center py-2.5 first:pt-0">
              <span className="text-sm text-theme-secondary">Bruttomarge</span>
              <span className="text-sm font-semibold text-theme-primary">
                {grossMargin != null ? formatPercentage(grossMargin * 100) : '–'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-theme-secondary">Op. Marge</span>
              <span className="text-sm font-semibold text-theme-primary">
                {operatingMargin != null ? formatPercentage(operatingMargin * 100) : '–'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2.5 last:pb-0">
              <span className="text-sm text-theme-secondary">Nettomarge</span>
              <span className="text-sm font-semibold text-theme-primary">
                {profitMargin != null ? formatPercentage(profitMargin * 100) : '–'}
              </span>
            </div>
          </div>
        ) : (
          <div className="relative min-h-[120px]">
            <div className="filter blur-sm opacity-40 pointer-events-none divide-y divide-white/[0.04]">
              <div className="flex justify-between py-2.5 first:pt-0"><span className="text-sm">Bruttomarge</span><span className="text-sm">+68,82%</span></div>
              <div className="flex justify-between py-2.5"><span className="text-sm">Op. Marge</span><span className="text-sm">+45,62%</span></div>
              <div className="flex justify-between py-2.5"><span className="text-sm">Nettomarge</span><span className="text-sm">+36,15%</span></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Link href="/pricing" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 hover:bg-brand/20 rounded-lg text-xs font-medium text-brand transition-colors">
                <LockClosedIcon className="w-3.5 h-3.5" />
                Premium
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
</div>



     
      {/* ✅ GROWTH + CHART SEKTION - OPTIMIERT */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* LINKE SPALTE - GROWTH & NEWS */}
        <div className="lg:col-span-2 space-y-6">
          {/* GROWTH SEKTION */}
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

          {/* DIVIDENDEN ÜBERSICHT */}
          <div className="bg-theme-card rounded-lg">
            <div className="p-6 border-b border-white/[0.03]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-theme-primary">Dividende</h3>
                  <p className="text-theme-secondary text-sm mt-1">Aktuelle Ausschüttung</p>
                </div>
                <Link
                  href={`/analyse/stocks/${ticker.toLowerCase()}/dividends`}
                  className="text-xs text-brand-light hover:text-green-300 transition-colors"
                >
                  Details →
                </Link>
              </div>
            </div>
            <div className="p-6">
              {dividendApiData?.currentInfo ? (
                <div className="space-y-4">
                  {/* Hauptkennzahlen */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-theme-secondary/20 rounded-lg">
                      <div className="text-sm text-theme-muted mb-1">Rendite</div>
                      <div className="text-xl font-bold text-theme-primary">
                        {dividendApiData.currentInfo.currentYield ? 
                          `${(dividendApiData.currentInfo.currentYield * 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '–'
                        }
                      </div>
                    </div>
                    <div className="text-center p-3 bg-theme-secondary/20 rounded-lg">
                      <div className="text-sm text-theme-muted mb-1">TTM</div>
                      <div className="text-xl font-bold text-theme-primary">
                        {dividendApiData.currentInfo.dividendPerShareTTM ? 
                          formatCurrency(dividendApiData.currentInfo.dividendPerShareTTM) : '–'
                        }
                      </div>
                    </div>
                  </div>

                  {/* Sicherheit & Wachstum */}
                  <div className="space-y-3">
                    {dividendApiData.currentInfo.payoutSafety && (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04]">
                        <span className="text-sm text-theme-muted">Sicherheit</span>
                        <span className="text-sm font-medium text-theme-primary">
                          {dividendApiData.currentInfo.payoutSafety.text}
                        </span>
                      </div>
                    )}

                    {dividendApiData.cagrAnalysis && dividendApiData.cagrAnalysis.length > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04]">
                        <span className="text-sm text-theme-muted">Wachstum (3Y)</span>
                        <span className="text-sm font-medium text-theme-primary">
                          {(() => {
                            const threeYearCAGR = dividendApiData.cagrAnalysis.find((item: any) => item.years === 3)?.cagr || 0;
                            return `${threeYearCAGR > 0 ? '+' : ''}${threeYearCAGR.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
                          })()}
                        </span>
                      </div>
                    )}

                    {dividendApiData.currentInfo.payoutRatio !== undefined && (
                      <div className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04]">
                        <span className="text-sm text-theme-muted">Payout Ratio</span>
                        <span className="text-sm font-medium text-theme-primary">
                          {(dividendApiData.currentInfo.payoutRatio * 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ex-Dividend Date */}
                  {dividendApiData.currentInfo.exDividendDate && (
                    <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <div className="text-xs text-blue-400 mb-1">Nächster Ex-Dividend</div>
                      <div className="text-sm font-medium text-theme-primary">
                        {new Date(dividendApiData.currentInfo.exDividendDate).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-theme-secondary rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <p className="text-theme-muted text-sm">Keine Dividenden-Daten verfügbar</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ✅ HISTORISCHER KURSVERLAUF - RECHTE SPALTE (3/5) */}
        <div className="lg:col-span-3">
          {history.length > 0 ? (
            <div className="bg-theme-card rounded-lg">
              <div className="px-6 py-4 border-b border-white/[0.03]">
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
              <div className="px-6 py-4 border-b border-white/[0.03]">
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
          /* Premium Teaser: Echte Charts mit Blur + CTA */
          <div className="relative">
            {/* Geblurrte echte FinancialAnalysisClient */}
            <div className="filter blur-sm opacity-50 pointer-events-none select-none">
              <FinancialAnalysisClient
                ticker={ticker}
                isPremium={false}
                userId={undefined}
              />
            </div>

            {/* Premium CTA Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-theme-bg/80 via-transparent to-theme-bg/80">
              <a
                href="/pricing"
                className="bg-theme-card/95 backdrop-blur-sm rounded-xl px-6 py-4 text-center shadow-xl border border-brand/20 hover:border-green-500/40 transition-all hover:scale-105"
              >
                <div className="w-12 h-12 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BoltIcon className="w-6 h-6 text-brand" />
                </div>
                <p className="text-theme-primary font-semibold text-lg mb-1">Kennzahlen-Charts</p>
                <p className="text-theme-secondary text-sm mb-3">Umsatz, Gewinn, Margen & mehr</p>
                <span className="inline-flex items-center gap-2 text-brand font-medium text-sm">
                  Premium freischalten
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ✅ WALL STREET + ESTIMATES - ULTRA CLEAN */}
      {(estimates.length > 0 || recs) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* WALL STREET RATINGS */}
          {recs && (
            <div className="bg-theme-card rounded-lg">
              <div className="px-6 py-4 border-b border-white/[0.03]">
                <h3 className="text-lg font-bold text-theme-primary">Wall Street Bewertungen</h3>
              </div>
              <div className="p-6">
                {user?.isPremium ? (
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-b-0">
                      <span className="text-brand-light flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        Strong Buy
                      </span>
                      <span className="text-theme-primary font-bold">{recs.strongBuy}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-b-0">
                      <span className="text-green-300 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                        Buy
                      </span>
                      <span className="text-theme-primary font-bold">{recs.buy}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-b-0">
                      <span className="text-yellow-400 flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        Hold
                      </span>
                      <span className="text-theme-primary font-bold">{recs.hold}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-b-0">
                      <span className="text-red-300 flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                        Sell
                      </span>
                      <span className="text-theme-primary font-bold">{recs.sell}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-b-0">
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
                        <span className="text-brand-light font-medium">
                          {Math.round(((recs.strongBuy + recs.buy) / Math.max(1, recs.strongBuy + recs.buy + recs.hold + recs.sell + recs.strongSell)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <PremiumBlur featureName="Wall Street">
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-b-0">
                        <span className="text-brand-light flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          Strong Buy
                        </span>
                        <span className="text-theme-primary font-bold">{recs.strongBuy}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-b-0">
                        <span className="text-green-300 flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                          Buy
                        </span>
                        <span className="text-theme-primary font-bold">{recs.buy}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-b-0">
                        <span className="text-yellow-400 flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                          Hold
                        </span>
                        <span className="text-theme-primary font-bold">{recs.hold}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-b-0">
                        <span className="text-red-300 flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                          Sell
                        </span>
                        <span className="text-theme-primary font-bold">{recs.sell}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/[0.04] last:border-b-0">
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
              <div className="px-6 py-4 border-b border-white/[0.03]">
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
                yoy > 0 ? 'text-brand-light' : 
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
                yoy > 0 ? 'text-brand-light' : 
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
                                const yoyClass = yoy == null ? '' : yoy >= 0 ? 'text-brand-light' : 'text-red-400'

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
                                const yoyClass = yoy == null ? '' : yoy >= 0 ? 'text-brand-light' : 'text-red-400'

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



              <div className="px-6 pb-4 border-t border-white/[0.04]">
                <Link
                  href={`/analyse/stocks/${ticker.toLowerCase()}/estimates`}
                  className="inline-flex items-center gap-2 text-sm text-theme-secondary hover:text-brand-light transition-colors group"
                >
                  <svg className="w-4 h-4 group-hover:text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="px-6 py-4 border-b border-white/[0.03]">
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
                          className="text-brand-light hover:text-green-300 transition-colors text-sm font-medium"
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