// Datei: src/components/AnalysisClient.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { stocks } from '../data/stocks'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
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
// ✅ REMOVED: StockLineChart import (nicht verwendet und kann Konflikte verursachen)

// ✅ KORRIGIERTER Import für FinancialAnalysisClient
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

// ─── Premium Lock Component ─────────────────────────────────────────────────
const PremiumLockOverlay = ({ title, description }: { title: string; description: string }) => (
  <div className="relative">
    <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-2xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
        <LockClosedIcon className="w-8 h-8 text-yellow-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-gray-300 mb-6 max-w-md mx-auto">{description}</p>
      <Link
        href="/pricing"
        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition"
      >
        <LockClosedIcon className="w-4 h-4 mr-2" />
        Premium freischalten
      </Link>
      <p className="text-sm text-gray-400 mt-3">
        Unterstütze uns mit 9€/Monat auf Patreon
      </p>
    </div>
  </div>
)

// ─── Formatierungshilfen ────────────────────────────────────────────────────
const fmtB = (n: number) =>
  `$${(n / 1e9).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} Mrd`
const fmtP = (n?: number) =>
  typeof n === 'number' ? `${(n * 100).toFixed(2).replace('.', ',')} %` : '–'
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

// ─── Komponente: AnalysisClient ───────────────────────────────────────────────
export default function AnalysisClient({ ticker }: { ticker: string }) {
  // ────────────────────────────────────────────────────────────────────────────
  // 1) Suchen der Aktie (synchron, KEIN Hook)
  const stock = stocks.find((s) => s.ticker === ticker)

  // 2) useRouter-Hook (muss immer an derselben Stelle stehen)
  const router = useRouter()

  // 3) Auth- & Premium-Status (Hooks #1, #2, #3)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [user, setUser] = useState<null | { id: string; email: string; isPremium: boolean }>(null)

  // 4) States für Live-Daten (Hooks #4 – #11)
  const [livePrice, setLivePrice] = useState<number | null>(null)
  const [liveMarketCap, setLiveMarketCap] = useState<number | null>(null)
  const [liveChangePct, setLiveChangePct] = useState<number | null>(null)
  const [livePriceAvg200, setLivePriceAvg200] = useState<number | null>(null)
  const [volume, setVolume] = useState<number | null>(null)
  const [previousClose, setPreviousClose] = useState<number | null>(null)
  const [week52Low, setWeek52Low] = useState<number | null>(null)
  const [week52High, setWeek52High] = useState<number | null>(null)

  // 5) States für Profil, Historie, Dividend‐Historie, Segmente, Key Metrics (Hooks #12 – #19)
  const [profileData, setProfileData] = useState<Profile | null>(null)
  const [irWebsite, setIrWebsite] = useState<string | null>(null)
  const [history, setHistory] = useState<{ date: string; close: number }[]>([])
  const [dividendHistory, setDividendHistory] = useState<{ date: string; dividend: number }[]>([])
  const [segmentData, setSegmentData] = useState<SegmentEntry[]>([])
  const [keyMetrics, setKeyMetrics] = useState<Record<string, any>>({})
  const [hasKeyMetrics, setHasKeyMetrics] = useState(false)

  // 6) States für Bilanz (Hooks #20 – #22)
  const [cashBS, setCashBS] = useState<number | null>(null)
  const [debtBS, setDebtBS] = useState<number | null>(null)
  const [netDebtBS, setNetDebtBS] = useState<number | null>(null)

  // 7) States für Dividend Ex-/Pay-Datum (Hooks #23, #24)
  const [exDate, setExDate] = useState<string | null>(null)
  const [payDate, setPayDate] = useState<string | null>(null)

  // 8) States für Bewertung & Margins (Hooks #25 – #30)
  const [peTTM, setPeTTM] = useState<number | null>(null)
  const [pegTTM, setPegTTM] = useState<number | null>(null)
  const [pbTTM, setPbTTM] = useState<number | null>(null)
  const [psTTM, setPsTTM] = useState<number | null>(null)
  const [evEbit, setEvEbit] = useState<number | null>(null)
  const [grossMargin, setGrossMargin] = useState<number | null>(null)
  const [operatingMargin, setOperatingMargin] = useState<number | null>(null)
  const [profitMargin, setProfitMargin] = useState<number | null>(null)

  // 9) States für Estimates & Recommendations (Hooks #31, #32)
  const [estimates, setEstimates] = useState<any[]>([])
  const [recs, setRecs] = useState<null | {
    strongBuy: number
    buy: number
    hold: number
    sell: number
    strongSell: number
  }>(null)

  // ✅ NEU: State für aktuelle Outstanding Shares (Hook #33)
  const [currentShares, setCurrentShares] = useState<number | null>(null)

  // ✅ NEU: State für Forward P/E (Hook #34)
  const [forwardPE, setForwardPE] = useState<number | null>(null)

  // ────────────────────────────────────────────────────────────────────────────
  // 10) Effekt: Supabase-Session + User-Metadaten laden (Hook #35)
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error('[AnalysisClient] Supabase getSession error:', error.message)
        router.push('/auth/signin')
        return
      }
      if (!session?.user) {
        router.push('/auth/signin')
        return
      }
      
      // Check Premium status from profiles table instead of app_metadata
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('user_id', session.user.id)
          .maybeSingle()

        const isPremiumFlag = profile?.is_premium || false
        setUser({ 
          id: session.user.id, 
          email: session.user.email || '', 
          isPremium: isPremiumFlag 
        })
      } catch (error) {
        console.error('[AnalysisClient] Error checking premium status:', error)
        // Fallback to app_metadata
        const isPremiumFlag = session.user.app_metadata?.is_premium || false
        setUser({ 
          id: session.user.id, 
          email: session.user.email || '', 
          isPremium: isPremiumFlag 
        })
      }
      
      setLoadingAuth(false)
    }

    checkAuth()
  }, [router])

  // ✅ NEU: Effekt für Forward P/E Berechnung (Hook #36)
  useEffect(() => {
    if (livePrice && estimates.length > 0) {
      const currentYear = new Date().getFullYear()
      const nextYear = currentYear + 1
      
      // Suche nach EPS-Schätzung für nächstes Jahr
      const nextYearEstimate = estimates.find(e => 
        parseInt(e.date.slice(0, 4), 10) === nextYear
      )
      
      if (nextYearEstimate && nextYearEstimate.estimatedEpsAvg > 0) {
        const forwardPEValue = livePrice / nextYearEstimate.estimatedEpsAvg
        setForwardPE(forwardPEValue)
        console.log(`✅ Forward P/E berechnet: ${forwardPEValue.toFixed(2)} (Kurs: ${livePrice}, EPS ${nextYear}: ${nextYearEstimate.estimatedEpsAvg})`)
      } else {
        // Fallback: Verwende aktuelle Jahr EPS falls nächstes Jahr nicht verfügbar
        const currentYearEstimate = estimates.find(e => 
          parseInt(e.date.slice(0, 4), 10) === currentYear
        )
        
        if (currentYearEstimate && currentYearEstimate.estimatedEpsAvg > 0) {
          const forwardPEValue = livePrice / currentYearEstimate.estimatedEpsAvg
          setForwardPE(forwardPEValue)
          console.log(`⚠️ Forward P/E mit aktuellem Jahr berechnet: ${forwardPEValue.toFixed(2)} (Kurs: ${livePrice}, EPS ${currentYear}: ${currentYearEstimate.estimatedEpsAvg})`)
        }
      }
    }
  }, [livePrice, estimates])

  // 11) Effekt: Alle weiteren Daten fetchen (Hook #37)
  useEffect(() => {
    // Falls keine Aktie, abbrechen
    if (!stock) return

    // 11.1) Firmenprofil & IR-Website
    async function loadProfile() {
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
    }

    // 11.2) Historische Kurse
    async function loadHistory() {
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
    }

    // 11.3) Dividend-Historie
    async function loadDividendHistory() {
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
        if (res.ok) {
          const { historical = [] } = (await res.json()) as any
          const arr = (historical as any[])
            .slice()
            .reverse()
            .map((d) => ({ date: d.date, dividend: d.dividend }))
          setDividendHistory(arr)
        }
      } catch {
        console.warn(`[AnalysisClient] DividendHistory für ${ticker} fehlgeschlagen.`)
      }
    }

    // 11.4) Segmente
    async function loadSegments() {
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v4/revenue-product-segmentation?symbol=${ticker}&structure=flat&period=annual&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
        if (res.ok) {
          const segRaw = (await res.json()) as Record<string, Record<string, number>>
          const segArr: SegmentEntry[] = Object.entries(segRaw)
            .map(([date, seg]) => ({ date, ...seg }))
            .sort((a, b) => a.date.localeCompare(b.date))
          setSegmentData(segArr)
        }
      } catch {
        console.warn(`[AnalysisClient] Segmentierung für ${ticker} fehlgeschlagen.`)
      }
    }

    // 11.5) Key Metrics (eigene API-Route)
    async function loadKeyMetrics() {
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
    }

    // 11.6) Bilanzdaten
    async function loadBalanceSheet() {
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
    }

    // 11.7) Dividend-Ex-/Pay-Datum
    async function loadDividendDates() {
      try {
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
        if (res.ok) {
          const djson = (await res.json()) as any
          const list = Array.isArray(djson.historical) ? djson.historical : djson
          if (list.length) {
            const L = (list as { date: string; paymentDate: string }[])
              .sort((a, b) => b.date.localeCompare(a.date))[0]
            setExDate(L.date)
            setPayDate(L.paymentDate)
          }
        }
      } catch {
        console.warn(`[AnalysisClient] DividendDates für ${ticker} fehlgeschlagen.`)
      }
    }

    // 11.8) Live-Quote
    async function loadQuote() {
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
    }

    // ✅ NEU: 11.8.1) Aktuelle Outstanding Shares aus der korrekten API
    async function loadCurrentShares() {
      try {
        // Verwende die neue, korrekte shares-float API
        const res = await fetch(
          `https://financialmodelingprep.com/stable/shares-float?symbol=${ticker}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
        )
        if (res.ok) {
          const sharesData = (await res.json()) as any[]
          if (Array.isArray(sharesData) && sharesData.length > 0) {
            const currentSharesCount = sharesData[0].outstandingShares
            setCurrentShares(currentSharesCount)
            console.log(`✅ [AnalysisClient] Current Outstanding Shares for ${ticker}: ${(currentSharesCount / 1e9).toFixed(2)} Mrd (${sharesData[0].date})`)
          }
        }
      } catch {
        console.warn(`[AnalysisClient] CurrentShares für ${ticker} fehlgeschlagen.`)
      }
    }

    // 11.9) Company Outlook (KGV, PEG, KBV, KUV)
    async function loadOutlook() {
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
    }

    // 11.10) EV/EBIT
    async function loadEvEbit() {
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
    }

    // 11.11) Margins (Brutto, Operativ, Netto)
    async function loadMargins() {
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
    }

    // 11.12) Estimates
    async function loadEstimates() {
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
    }

    // 11.13) Recommendations
    async function loadRecs() {
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

    // 11.14) ✅ Alle Ladevorgänge parallel ausführen (inkl. neue loadCurrentShares)
    loadProfile()
    loadHistory()
    loadDividendHistory()
    loadSegments()
    loadKeyMetrics()
    loadBalanceSheet()
    loadDividendDates()
    loadQuote()
    loadCurrentShares() // ← NEU: Korrekte Outstanding Shares laden
    loadOutlook()
    loadEvEbit()
    loadMargins()
    loadEstimates()
    loadRecs()
  }, [ticker, stock])

  // ────────────────────────────────────────────────────────────────────────────
  // 12) Frühe Returns NACH Deklaration aller Hooks

  // 12.1) Wenn wir noch auf das Supabase-Ergebnis warten, zeige Spinner
  if (loadingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-100">
        <LoadingSpinner />
      </div>
    )
  }

  // 12.2) Wenn Aktie nicht gefunden, zeige 404-Text
  if (!stock) {
    return <p className="text-white">Aktie nicht gefunden.</p>
  }

  // ────────────────────────────────────────────────────────────────────────────
  // 13) Endgültiges Rendering (alles ist geladen)
  return (
    <div className="space-y-8">
      {/* ─── Header mit Watchlist Button ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold text-white">Kennzahlen-Analyse</h2>
          <p className="text-gray-400 text-lg">Detaillierte Finanzdaten für {stock.name} ({ticker})</p>
        </div>
        
        {/* Watchlist Button */}
        <div className="flex items-center space-x-4">
          <WatchlistButton ticker={ticker} />
        </div>
      </div>

      {/* ─── Key Metrics Grid - Modernes Design ─── */}
      {hasKeyMetrics ? (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
          <h3 className="text-xl font-bold text-white mb-6">Übersicht</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            
            {/* 1) Marktdaten */}
            <div className="space-y-4">
              <h4 className="text-white font-semibold text-lg flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                Marktdaten
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Marktkapitalisierung</span>
                  <span className="text-white font-medium">
                    {liveMarketCap != null ? fmtB(liveMarketCap) : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Volumen</span>
                  <span className="text-white font-medium">
                    {volume != null ? volume.toLocaleString('de-DE') : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Beta</span>
                  <span className="text-white font-medium">
                    {profileData?.beta != null ? profileData.beta.toFixed(2) : '–'}
                  </span>
                </div>
                {currentShares && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Outstanding Shares</span>
                    <span className="text-white font-medium">
                      {(currentShares / 1e9).toFixed(2)} Mrd
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2) Bilanz */}
            <div className="space-y-4">
              <h4 className="text-white font-semibold text-lg flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                Bilanz
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Cash</span>
                  <span className="text-white font-medium">
                    {cashBS != null ? fmtB(cashBS) : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Debt</span>
                  <span className="text-white font-medium">
                    {debtBS != null ? fmtB(debtBS) : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Net Debt</span>
                  <span className="text-white font-medium">
                    {netDebtBS != null ? fmtB(netDebtBS) : '–'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3) Dividende */}
            <div className="space-y-4">
              <h4 className="text-white font-semibold text-lg flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                Dividende
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Rendite</span>
                  <span className="text-white font-medium">
                    {keyMetrics.dividendYield != null ? fmtP(keyMetrics.dividendYield) : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Payout Ratio</span>
                  <span className="text-white font-medium">
                    {keyMetrics.payoutRatio != null ? fmtP(keyMetrics.payoutRatio) : '–'}
                  </span>
                </div>
              </div>
              {user?.isPremium ? (
                <span className="text-gray-400 italic text-sm">
                  Mehr zur Dividende: Coming soon…
                </span>
              ) : (
                <Link
                  href="/pricing"
                  className="inline-flex items-center text-yellow-400 hover:underline text-sm"
                >
                  <LockClosedIcon className="w-4 h-4 mr-1" /> Mehr zur Dividende
                </Link>
              )}
            </div>

            {/* 4) Bewertung - Premium */}
            <div className="space-y-4 relative">
              <h4 className="text-white font-semibold text-lg flex items-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                Bewertung
              </h4>
              <div className={`space-y-3 ${!user?.isPremium ? 'filter blur-sm' : ''}`}>
                {/* ✅ FIXED: KGV TTM und Forward P/E in einer Zeile */}
                <div className="flex justify-between items-center group relative">
                  <span className="text-gray-400 text-sm">KGV (TTM|Erw.)</span>
                  <div className="flex items-center">
                    <span className="text-white font-medium">
                      {peTTM != null ? peTTM.toFixed(2) : '–'} | {forwardPE != null ? forwardPE.toFixed(2) : '–'}
                    </span>
                    {forwardPE != null && (
                      <div className="relative ml-2">
                        <InformationCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                        {/* Custom Tooltip */}
                        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 pointer-events-none">
                          Erwartetes KGV basiert auf Analysten-Schätzungen
                          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">PEG TTM</span>
                  <span className="text-white font-medium">
                    {pegTTM != null ? pegTTM.toFixed(2) : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">KBV TTM</span>
                  <span className="text-white font-medium">
                    {pbTTM != null ? pbTTM.toFixed(2) : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">KUV TTM</span>
                  <span className="text-white font-medium">
                    {psTTM != null ? psTTM.toFixed(2) : '–'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">EV/EBIT</span>
                  <span className="text-white font-medium">
                    {evEbit != null ? evEbit.toFixed(2) : '–'}
                  </span>
                </div>
              </div>
              {!user?.isPremium && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <LockClosedIcon className="w-6 h-6 text-yellow-400" />
                </div>
              )}
            </div>
          </div>

          {/* Margins Row - nur bei Premium */}
          {user?.isPremium && (
            <div className="mt-8 pt-6 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <h4 className="text-white font-semibold text-lg flex items-center">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                    Margen
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Bruttomarge</span>
                      <span className="text-white font-medium">
                        {grossMargin != null ? fmtP(grossMargin) : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Operative Marge</span>
                      <span className="text-white font-medium">
                        {operatingMargin != null ? fmtP(operatingMargin) : '–'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Nettogewinnmarge</span>
                      <span className="text-white font-medium">
                        {profitMargin != null ? fmtP(profitMargin) : '–'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-400">Key Metrics werden geladen...</p>
        </div>
      )}


{history.length > 0 ? (
        <WorkingStockChart 
          ticker={ticker} 
          data={history}
        />
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6">
            Historischer Kursverlauf
          </h3>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </div>
      )}

      {/* ─── Kennzahlen-Charts ────────────────────────────────────────────────── */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
        <h3 className="text-2xl font-bold text-white mb-6">
          Kennzahlen-Charts
        </h3>
        {user?.isPremium ? (
          <FinancialAnalysisClient 
            ticker={ticker} 
            isPremium={user?.isPremium}
            userId={user?.id}
          />
        ) : (
          <PremiumLockOverlay
            title="Interaktive Kennzahlen-Charts"
            description="Analysiere detaillierte Finanzkennzahlen mit interaktiven Charts und Zeitraumauswahl. Verfügbar mit Premium."
          />
        )}
      </div>

      {/* ─── Earnings & Revenue Estimates ─────────────────────────────────────── */}
      {estimates.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
          <h3 className="text-2xl font-bold text-white mb-6">
            Analysten Schätzungen (ab {new Date().getFullYear()})
          </h3>
          {user?.isPremium ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue Estimates */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Umsatzschätzungen</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-100">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 font-medium text-gray-300">FY</th>
                        <th className="text-right py-3 font-medium text-gray-300">Avg</th>
                        <th className="text-right py-3 font-medium text-gray-300">Low</th>
                        <th className="text-right py-3 font-medium text-gray-300">High</th>
                        <th className="text-right py-3 font-medium text-gray-300">YoY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimates
                        .slice()
                        .reverse()
                        .map((e, idx, arr) => {
                          const fy = e.date.slice(0, 4)
                          let yoy: number | null = null
                          if (idx > 0) {
                            const prev = arr[idx - 1].estimatedRevenueAvg
                            if (prev > 0) {
                              yoy = ((e.estimatedRevenueAvg - prev) / prev) * 100
                            }
                          }
                          const formattedYoY =
                            yoy == null
                              ? '–'
                              : `${yoy >= 0 ? '+' : ''}${yoy
                                  .toFixed(1)} %`
                          const yoyClass =
                            yoy == null
                              ? ''
                              : yoy >= 0
                              ? 'text-green-400'
                              : 'text-red-400'

                          return (
                            <tr
                              key={e.date}
                              className="border-b border-gray-800/50 hover:bg-gray-800/30"
                            >
                              <td className="py-3 text-white font-medium">{fy}</td>
                              <td className="py-3 text-right text-white">
                                {fmtB(e.estimatedRevenueAvg)}
                              </td>
                              <td className="py-3 text-right text-gray-300">
                                {fmtB(e.estimatedRevenueLow)}
                              </td>
                              <td className="py-3 text-right text-gray-300">
                                {fmtB(e.estimatedRevenueHigh)}
                              </td>
                              <td className={`py-3 text-right font-medium ${yoyClass}`}>
                                {formattedYoY}
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
                <h4 className="text-lg font-semibold text-white mb-4">Gewinnschätzungen</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-gray-100">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 font-medium text-gray-300">FY</th>
                        <th className="text-right py-3 font-medium text-gray-300">EPS Avg</th>
                        <th className="text-right py-3 font-medium text-gray-300">Low</th>
                        <th className="text-right py-3 font-medium text-gray-300">High</th>
                        <th className="text-right py-3 font-medium text-gray-300">YoY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimates
                        .slice()
                        .reverse()
                        .map((e, idx, arr) => {
                          const fy = e.date.slice(0, 4)
                          let yoy: number | null = null
                          if (idx > 0) {
                            const prev = arr[idx - 1].estimatedEpsAvg
                            if (prev !== 0) {
                              yoy = ((e.estimatedEpsAvg - prev) / prev) * 100
                            }
                          }
                          const formattedYoY =
                            yoy == null
                              ? '–'
                              : `${yoy >= 0 ? '+' : ''}${yoy
                                  .toFixed(1)} %`
                          const yoyClass =
                            yoy == null
                              ? ''
                              : yoy >= 0
                              ? 'text-green-400'
                              : 'text-red-400'

                          return (
                            <tr
                              key={e.date}
                              className="border-b border-gray-800/50 hover:bg-gray-800/30"
                            >
                              <td className="py-3 text-white font-medium">{fy}</td>
                              <td className="py-3 text-right text-white">
                                {e.estimatedEpsAvg.toFixed(2)}
                              </td>
                              <td className="py-3 text-right text-gray-300">
                                {e.estimatedEpsLow.toFixed(2)}
                              </td>
                              <td className="py-3 text-right text-gray-300">
                                {e.estimatedEpsHigh.toFixed(2)}
                              </td>
                              <td className={`py-3 text-right font-medium ${yoyClass}`}>
                                {formattedYoY}
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
            <PremiumLockOverlay
              title="Analysten Schätzungen"
              description="Erhalte Zugang zu detaillierten Umsatz- und Gewinnschätzungen von Wall Street Analysten."
            />
          )}
        </div>
      )}

      {/* ─── Wall Street Rating (Donut) ─────────────────────────────────────────── */}
      {recs && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
          <h3 className="text-2xl font-bold text-white mb-6">Wall Street Bewertungen</h3>
          {user?.isPremium ? (
            <WallStreetRatingDonut recs={recs} />
          ) : (
            <PremiumLockOverlay
              title="Wall Street Analystenbewertungen"
              description="Sieh dir an, wie Wall Street Analysten diese Aktie bewerten - von Strong Buy bis Strong Sell."
            />
          )}
        </div>
      )}

      {/* ─── Company Profile ────────────────────────────────────────────────────── */}
      {profileData && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-300">
          <h3 className="text-2xl font-bold text-white mb-6">Company Profile</h3>
          <p className="text-gray-300 mb-6 leading-relaxed">
            {profileData.description}
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Sector</span>
                <span className="text-white font-medium">{profileData.sector ?? '–'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Industry</span>
                <span className="text-white font-medium">{profileData.industry ?? '–'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Employees</span>
                <span className="text-white font-medium">{profileData.fullTimeEmployees ?? '–'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">IPO Date</span>
                <span className="text-white font-medium">{fmtDate(profileData.ipoDate)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Address</span>
                <span className="text-white font-medium text-right">
                  {`${profileData.address}, ${profileData.city}, ${profileData.state} ${profileData.zip}, ${profileData.country}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Phone</span>
                <span className="text-white font-medium">{profileData.phone ?? '–'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Website</span>
                <a
                  href={profileData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 transition-colors font-medium"
                >
                  {profileData.website}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}