// src/components/AnalysisClient.tsx - PROFESSIONELLES FINCHAT-STYLE GRAU DESIGN
'use client'

import React, { useState, useEffect } from 'react'
import { stocks } from '../data/stocks'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { LockClosedIcon } from '@heroicons/react/24/solid'
import Tooltip from '@/components/Tooltip'
import { irLinks } from '../data/irLinks'
import Card from '@/components/Card'
import LoadingSpinner from '@/components/LoadingSpinner'
import WorkingStockChart from '@/components/WorkingStockChart'

// ─── Dynamische Komponentenimporte ─────────────────────────────────────────
const WatchlistButton = dynamic(
  () => import('@/components/WatchlistButton'),
  { ssr: false }
)

import FinancialAnalysisClient from '@/components/FinancialAnalysisClient'

const DividendSection = dynamic(
  () => import('@/components/DividendSection'),
  { ssr: false, loading: () => <LoadingSpinner /> }
)
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

// ─── Premium Components - PROFESSIONELLES DESIGN ─────────────────────────────────────────────────

// Prominenter CTA für Haupt-Features
const PremiumCTA = ({ title, description }: { title: string; description: string }) => (
  <div className="professional-card p-8 text-center">
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

// INTELLIGENTE Premium Blur - zeigt echte Daten verschwommen an
const PremiumBlur = ({ 
  children, 
  featureName 
}: { 
  children: React.ReactNode; 
  featureName: string 
}) => (
  <div className="relative">
    {/* Echte Daten verschwommen darstellen */}
    <div className="filter blur-sm opacity-60 pointer-events-none select-none">
      {children}
    </div>
    {/* Premium Lock Overlay */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-theme-card/90 backdrop-blur-sm border border-amber-500/30 rounded-lg p-3 text-center shadow-lg">
        <LockClosedIcon className="w-5 h-5 text-amber-500 mx-auto mb-1" />
        <p className="text-theme-secondary text-xs font-medium">{featureName}</p>
        <p className="text-theme-muted text-xs">Premium erforderlich</p>
      </div>
    </div>
  </div>
)

// ─── Formatierungshilfen ────────────────────────────────────────────────────
const fmtB = (n: number) =>
  `$${(n / 1e9).toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}B`

const fmtM = (n: number) =>
  `${(n / 1e6).toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}M`

const fmtP = (n?: number) =>
  typeof n === 'number' ? `${(n * 100).toFixed(1).replace('.', ',')} %` : '–'

const fmtPrice = (n?: number) =>
  typeof n === 'number'
    ? n.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '–'

const fmtDate = (d?: string | null) => d ?? '–'

const fmtNum = (n?: number, decimals = 1) =>
  typeof n === 'number' ? n.toFixed(decimals) : '–'

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

// ─── Komponente: AnalysisClient ───────────────────────────────────────────────
export default function AnalysisClient({ ticker }: { ticker: string }) {
  // 1) Suchen der Aktie
  const stock = stocks.find((s) => s.ticker === ticker)

  // 2) User State
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // 3) States für Live-Daten
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [liveMarketCap, setLiveMarketCap] = useState<number | null>(null)
  const [liveChangePct, setLiveChangePct] = useState<number | null>(null)
  const [livePriceAvg200, setLivePriceAvg200] = useState<number | null>(null)
  const [volume, setVolume] = useState<number | null>(null)
  const [previousClose, setPreviousClose] = useState<number | null>(null)
  const [week52Low, setWeek52Low] = useState<number | null>(null)
  const [week52High, setWeek52High] = useState<number | null>(null)

  // 4) States für andere Daten
  const [profileData, setProfileData] = useState<Profile | null>(null)
  const [irWebsite, setIrWebsite] = useState<string | null>(null)
  const [history, setHistory] = useState<{ date: string; close: number }[]>([])
  const [dividendHistory, setDividendHistory] = useState<{ date: string; dividend: number }[]>([])
  const [segmentData, setSegmentData] = useState<SegmentEntry[]>([])
  const [keyMetrics, setKeyMetrics] = useState<Record<string, any>>({})
  const [hasKeyMetrics, setHasKeyMetrics] = useState(false)

  // 5) States für Bilanz
  const [cashBS, setCashBS] = useState<number | null>(null)
  const [debtBS, setDebtBS] = useState<number | null>(null)
  const [netDebtBS, setNetDebtBS] = useState<number | null>(null)

  // 6) States für Dividend Dates
  const [exDate, setExDate] = useState<string | null>(null)
  const [payDate, setPayDate] = useState<string | null>(null)

  // 7) States für Bewertung & Margins
  const [peTTM, setPeTTM] = useState<number | null>(null)
  const [pegTTM, setPegTTM] = useState<number | null>(null)
  const [pbTTM, setPbTTM] = useState<number | null>(null)
  const [psTTM, setPsTTM] = useState<number | null>(null)
  const [evEbit, setEvEbit] = useState<number | null>(null)
  const [grossMargin, setGrossMargin] = useState<number | null>(null)
  const [operatingMargin, setOperatingMargin] = useState<number | null>(null)
  const [profitMargin, setProfitMargin] = useState<number | null>(null)

  // 8) States für Estimates & Recommendations
  const [estimates, setEstimates] = useState<any[]>([])
  const [recs, setRecs] = useState<null | {
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
  }>(null)

  // 9) States für Outstanding Shares & Forward P/E
  const [currentShares, setCurrentShares] = useState<number | null>(null)
  const [forwardPE, setForwardPE] = useState<number | null>(null)

  // ✅ User-Daten laden
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

  // Forward P/E Berechnung
  useEffect(() => {
    if (livePrice && estimates.length > 0) {
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      
      const nextYearEstimate = estimates.find(e => 
        parseInt(e.date.slice(0, 4), 10) === nextYear
      )
      
      if (nextYearEstimate && nextYearEstimate.estimatedEpsAvg > 0) {
        const forwardPEValue = livePrice / nextYearEstimate.estimatedEpsAvg
        setForwardPE(forwardPEValue)
      } else {
        const currentYearEstimate = estimates.find(e => 
          parseInt(e.date.slice(0, 4), 10) === currentYear
        )
        
        if (currentYearEstimate && currentYearEstimate.estimatedEpsAvg > 0) {
          const forwardPEValue = livePrice / currentYearEstimate.estimatedEpsAvg
          setForwardPE(forwardPEValue)
        }
      }
    }
  }, [livePrice, estimates])

  // Alle weiteren Daten laden
  useEffect(() => {
    if (!stock) return

    async function loadAllData() {
      // Profile laden
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`,
          { cache: 'force-cache' }
        )
        if (res.ok) {
          const [p] = (await res.json()) as Profile[]
          setProfileData(p)
          setIrWebsite(p.website ?? null)
        }
      } catch {
        console.warn(`[AnalysisClient] Profile für ${ticker} fehlgeschlagen.`)
      }

      // Historische Kurse
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
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

      // Key Metrics
      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL!
        const res = await fetch(`${base}/api/financials/${ticker}`)
        if (res.ok) {
          const { keyMetrics: km = {} } = await res.json()
          setKeyMetrics(km)
          setHasKeyMetrics(Object.keys(km).length > 0)
        }
      } catch {
        console.warn(`[AnalysisClient] KeyMetrics für ${ticker} fehlgeschlagen.`)
      }

      // Live Quote
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
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

      // Current Shares
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/stable/shares-float?symbol=${ticker}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
        if (res.ok) {
          const sharesData = (await res.json()) as any[]
          if (Array.isArray(sharesData) && sharesData.length > 0) {
            setCurrentShares(sharesData[0].outstandingShares)
          }
        }
      } catch {
        console.warn(`[AnalysisClient] CurrentShares für ${ticker} fehlgeschlagen.`)
      }

      // Company Outlook
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v4/company-outlook?symbol=${ticker}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
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

      // Balance Sheet
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=annual&limit=1&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
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

      // Margins
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=1&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
        if (res.ok) {
          const [inc] = (await res.json()) as any[]
          setGrossMargin(inc.grossProfitRatio ?? null)
          setOperatingMargin(inc.operatingIncomeRatio ?? null)
          setProfitMargin(inc.netIncomeRatio ?? null)
        }
      } catch {
        console.warn(`[AnalysisClient] Margins für ${ticker} fehlgeschlagen.`)
      }

      // EV/EBIT
      try {
        const [resEV, resInc] = await Promise.all([
          fetch(
            `https://financialmodelingprep.com/api/v3/enterprise-values/${ticker}?period=quarter&limit=1&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          ),
          fetch(
            `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=1&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          ),
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

      // Estimates
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
        if (res.ok) {
          const all = (await res.json()) as any[]
          const thisYear = new Date().getFullYear()
          setEstimates(all.filter((e) => parseInt(e.date.slice(0, 4), 10) >= thisYear))
        }
      } catch {
        console.warn(`[AnalysisClient] Estimates für ${ticker} fehlgeschlagen.`)
      }

      // Recommendations
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/analyst-stock-recommendations/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
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
    }

    loadAllData()
  }, [ticker, stock])

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
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold text-theme-primary">Kennzahlen-Analyse</h2>
          <p className="text-theme-secondary mt-1">Detaillierte Finanzdaten für {stock.name} ({ticker})</p>
        </div>
        <div className="flex items-center space-x-4">
          <WatchlistButton ticker={ticker} />
        </div>
      </div>

      {/* ─── ÜBERSICHT - PROFESSIONELL ─── */}
      {hasKeyMetrics ? (
        <div className="professional-card p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">Übersicht</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* MARKTDATEN - Kostenlos */}
            <div className="space-y-4">
              <h4 className="text-theme-primary font-semibold text-sm flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                Marktdaten
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary text-sm">Marktkapitalisierung</span>
                  <span className="text-theme-primary font-semibold">
                    {liveMarketCap != null ? fmtB(liveMarketCap) : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary text-sm">Volumen</span>
                  <span className="text-theme-primary font-semibold">
                    {volume != null ? fmtM(volume) : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-theme-secondary text-sm">Beta</span>
                  <span className="text-theme-primary font-semibold">
                    {profileData?.beta != null ? profileData.beta.toFixed(2) : '–'}
                  </span>
                </div>
                {currentShares && (
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">Ausstehende Aktien</span>
                    <span className="text-theme-primary font-semibold">
                      {(currentShares / 1e9).toFixed(1)}B
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* DIVIDENDE - Premium Blur */}
            <div className="space-y-4 relative">
              <h4 className="text-theme-primary font-semibold text-sm flex items-center">
                <div className="w-3 h-3 bg-purple-400 rounded-full mr-3"></div>
                Dividende
              </h4>
              {user?.isPremium ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">Rendite</span>
                    <span className="text-theme-primary font-semibold">
                      {keyMetrics.dividendYield != null ? fmtP(keyMetrics.dividendYield) : '–'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">Payout Ratio</span>
                    <span className="text-theme-primary font-semibold">
                      {keyMetrics.payoutRatio != null ? fmtP(keyMetrics.payoutRatio) : '–'}
                    </span>
                  </div>
                </div>
              ) : (
                <PremiumBlur featureName="Dividende">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Rendite</span>
                      <span className="text-theme-primary font-semibold">
                        {keyMetrics.dividendYield != null ? fmtP(keyMetrics.dividendYield) : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Payout Ratio</span>
                      <span className="text-theme-primary font-semibold">
                        {keyMetrics.payoutRatio != null ? fmtP(keyMetrics.payoutRatio) : '–'}
                      </span>
                    </div>
                  </div>
                </PremiumBlur>
              )}
            </div>

            {/* BEWERTUNG - Premium Blur */}
            <div className="space-y-4 relative">
              <h4 className="text-theme-primary font-semibold text-sm flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                Bewertung
              </h4>
              {user?.isPremium ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">KGV TTM</span>
                    <span className="text-theme-primary font-semibold">
                      {peTTM != null ? fmtNum(peTTM, 1) : '–'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">KGV Erw.</span>
                    <span className="text-theme-primary font-semibold">
                      {forwardPE != null ? fmtNum(forwardPE, 1) : '–'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">KBV TTM</span>
                    <span className="text-theme-primary font-semibold">
                      {pbTTM != null ? fmtNum(pbTTM, 1) : '–'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">EV/EBIT</span>
                    <span className="text-theme-primary font-semibold">
                      {evEbit != null ? fmtNum(evEbit, 1) : '–'}
                    </span>
                  </div>
                </div>
              ) : (
                <PremiumBlur featureName="Bewertung">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">KGV TTM</span>
                      <span className="text-theme-primary font-semibold">
                        {peTTM != null ? fmtNum(peTTM, 1) : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">KGV Erw.</span>
                      <span className="text-theme-primary font-semibold">
                        {forwardPE != null ? fmtNum(forwardPE, 1) : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">KBV TTM</span>
                      <span className="text-theme-primary font-semibold">
                        {pbTTM != null ? fmtNum(pbTTM, 1) : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">EV/EBIT</span>
                      <span className="text-theme-primary font-semibold">
                        {evEbit != null ? fmtNum(evEbit, 1) : '–'}
                      </span>
                    </div>
                  </div>
                </PremiumBlur>
              )}
            </div>

            {/* MARGEN - Premium Blur */}
            <div className="space-y-4 relative">
              <h4 className="text-theme-primary font-semibold text-sm flex items-center">
                <div className="w-3 h-3 bg-orange-400 rounded-full mr-3"></div>
                Margen
              </h4>
              {user?.isPremium ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">Bruttomarge</span>
                    <span className="text-theme-primary font-semibold">
                      {grossMargin != null ? fmtP(grossMargin) : '–'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">Op. Marge</span>
                    <span className="text-theme-primary font-semibold">
                      {operatingMargin != null ? fmtP(operatingMargin) : '–'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-theme-secondary text-sm">Nettomarge</span>
                    <span className="text-theme-primary font-semibold">
                      {profitMargin != null ? fmtP(profitMargin) : '–'}
                    </span>
                  </div>
                </div>
              ) : (
                <PremiumBlur featureName="Margen">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Bruttomarge</span>
                      <span className="text-theme-primary font-semibold">
                        {grossMargin != null ? fmtP(grossMargin) : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Op. Marge</span>
                      <span className="text-theme-primary font-semibold">
                        {operatingMargin != null ? fmtP(operatingMargin) : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-theme-secondary text-sm">Nettomarge</span>
                      <span className="text-theme-primary font-semibold">
                        {profitMargin != null ? fmtP(profitMargin) : '–'}
                      </span>
                    </div>
                  </div>
                </PremiumBlur>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="professional-card p-6 text-center">
          <LoadingSpinner />
          <p className="text-theme-secondary mt-3">Key Metrics werden geladen...</p>
        </div>
      )}

      {/* ✨ BULLS/BEARS + CHART SEKTION - GLEICHE HÖHE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BULLS/BEARS SEKTION */}
        <div className="lg:col-span-1">
          <BullsBearsSection 
            ticker={ticker}
            isPremium={user?.isPremium || false}
          />
        </div>

        {/* HISTORISCHER KURSVERLAUF */}
        <div className="lg:col-span-2">
          {history.length > 0 ? (
            <div className="professional-card p-6 h-[500px] flex flex-col">
              <h3 className="text-xl font-bold text-theme-primary mb-4">Historischer Kursverlauf</h3>
              <div className="flex-1">
                <WorkingStockChart ticker={ticker} data={history} />
              </div>
            </div>
          ) : (
            <div className="professional-card p-6 h-[500px] flex flex-col">
              <h3 className="text-xl font-bold text-theme-primary mb-4">Historischer Kursverlauf</h3>
              <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── KENNZAHLEN-CHARTS ─── */}
      <div className="professional-card p-6">
        <h3 className="text-xl font-bold text-theme-primary mb-4">Kennzahlen-Charts</h3>
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

      {/* ─── WALL STREET + ESTIMATES ─── */}
      {(estimates.length > 0 || recs) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* WALL STREET RATINGS */}
          {recs && (
            <div className="professional-card p-6">
              <h3 className="text-lg font-bold text-theme-primary mb-4">Wall Street Bewertungen</h3>
              {user?.isPremium ? (
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-green-400 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      Strong Buy
                    </span>
                    <span className="text-theme-primary font-bold">{recs.strongBuy}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-300 flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                      Buy
                    </span>
                    <span className="text-theme-primary font-bold">{recs.buy}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-400 flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      Hold
                    </span>
                    <span className="text-theme-primary font-bold">{recs.hold}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-300 flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                      Sell
                    </span>
                    <span className="text-theme-primary font-bold">{recs.sell}</span>
                  </div>
                  <div className="flex justify-between items-center">
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
                    <div className="flex justify-between items-center">
                      <span className="text-green-400 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        Strong Buy
                      </span>
                      <span className="text-theme-primary font-bold">{recs.strongBuy}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-300 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                        Buy
                      </span>
                      <span className="text-theme-primary font-bold">{recs.buy}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-yellow-400 flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        Hold
                      </span>
                      <span className="text-theme-primary font-bold">{recs.hold}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-300 flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-300 rounded-full"></div>
                        Sell
                      </span>
                      <span className="text-theme-primary font-bold">{recs.sell}</span>
                    </div>
                    <div className="flex justify-between items-center">
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
          )}

          {/* ESTIMATES - Mit professioneller Tabelle */}
          {estimates.length > 0 && (
            <div className="lg:col-span-2 professional-card p-6">
              <h3 className="text-lg font-bold text-theme-primary mb-4">
                Analysten Schätzungen (ab {new Date().getFullYear()})
              </h3>
              {user?.isPremium ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Revenue Estimates */}
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
                                <td className="text-right">{fmtB(e.estimatedRevenueAvg)}</td>
                                <td className="text-right text-theme-secondary">{fmtB(e.estimatedRevenueLow)}</td>
                                <td className="text-right text-theme-secondary">{fmtB(e.estimatedRevenueHigh)}</td>
                                <td className={`text-right font-medium ${yoyClass}`}>
                                  {yoy == null ? '–' : `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`}
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
                                <td className="text-right">${e.estimatedEpsAvg.toFixed(2)}</td>
                                <td className="text-right text-theme-secondary">${e.estimatedEpsLow.toFixed(2)}</td>
                                <td className="text-right text-theme-secondary">${e.estimatedEpsHigh.toFixed(2)}</td>
                                <td className={`text-right font-medium ${yoyClass}`}>
                                  {yoy == null ? '–' : `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`}
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
                                  <td className="text-right">{fmtB(e.estimatedRevenueAvg)}</td>
                                  <td className="text-right text-theme-secondary">{fmtB(e.estimatedRevenueLow)}</td>
                                  <td className="text-right text-theme-secondary">{fmtB(e.estimatedRevenueHigh)}</td>
                                  <td className={`text-right font-medium ${yoyClass}`}>
                                    {yoy == null ? '–' : `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`}
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
                                  <td className="text-right">${e.estimatedEpsAvg.toFixed(2)}</td>
                                  <td className="text-right text-theme-secondary">${e.estimatedEpsLow.toFixed(2)}</td>
                                  <td className="text-right text-theme-secondary">${e.estimatedEpsHigh.toFixed(2)}</td>
                                  <td className={`text-right font-medium ${yoyClass}`}>
                                    {yoy == null ? '–' : `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`}
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
          )}
        </div>
      )}

      {/* ─── COMPANY PROFILE ─── */}
      {profileData && (
        <div className="professional-card p-6">
          <h3 className="text-xl font-bold text-theme-primary mb-6">Company Profile</h3>
          
          {/* Info-Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-6">
            
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

            {/* Größe */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">Größe</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-theme-secondary">Mitarbeiter</span>
                  <span className="text-theme-primary font-medium">
                    {profileData.fullTimeEmployees ? 
                      `${(Number(profileData.fullTimeEmployees) / 1000).toFixed(0)}k` : '–'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-secondary">Land</span>
                  <span className="text-theme-primary font-medium">{profileData.country ?? '–'}</span>
                </div>
              </div>
            </div>

            {/* Kontakt */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">Kontakt</h4>
              <div className="space-y-2 text-sm">
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

            {/* Hauptsitz */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide">Hauptsitz</h4>
              <div className="text-sm text-theme-primary">
                {profileData.city}, {profileData.state}
                <br />
                {profileData.country}
              </div>
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <h4 className="text-sm font-semibold text-theme-secondary uppercase tracking-wide mb-3">Über das Unternehmen</h4>
            <p className="text-theme-secondary leading-relaxed">
              {profileData.description ? 
                profileData.description.length > 500 ? 
                  profileData.description.substring(0, 500) + '...' : 
                  profileData.description 
                : 'Keine Beschreibung verfügbar.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}