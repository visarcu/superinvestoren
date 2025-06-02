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

// ─── Dynamische Komponentenimporte ─────────────────────────────────────────
const WatchlistButton = dynamic(
  () => import('@/components/WatchlistButton'),
  { ssr: false }
)
const StockLineChart = dynamic(
  () => import('@/components/StockLineChart'),
  { ssr: false, loading: () => <LoadingSpinner /> }
)
const FinancialAnalysisClient = dynamic(
  () => import('@/components/FinancialAnalysisClient'),
  { ssr: false, loading: () => <LoadingSpinner /> }
)
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

// ─── Formatierungshilfen ────────────────────────────────────────────────────
const fmtB = (n: number) =>
  `$${(n / 1e9).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} b`
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

  // ────────────────────────────────────────────────────────────────────────────
  // 10) Effekt: Supabase-Session + User-Metadaten laden (Hook #33)
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
      const isPremiumFlag = session.user.app_metadata?.is_premium || false
      setUser({ id: session.user.id, email: session.user.email || '', isPremium: isPremiumFlag })
      setLoadingAuth(false)
    }

    checkAuth()
  }, [router])

  // 11) Effekt: Alle weiteren Daten fetchen (Hook #34)
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

    // 11.14) Alle Ladevorgänge parallel ausführen
    loadProfile()
    loadHistory()
    loadDividendHistory()
    loadSegments()
    loadKeyMetrics()
    loadBalanceSheet()
    loadDividendDates()
    loadQuote()
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
      <div className="flex h-screen items-center justify-center bg-gray-900 text-gray-100">
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
    <>
      {/* ─── Key Metrics / Bilanz / Dividende / Bewertung / Margins ─── */}
      {hasKeyMetrics ? (
        <Card>
          <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {/* 1) Value */}
              <div>
                <h3 className="text-white font-semibold mb-2">Value</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>
                    Marktkapitalisierung:{' '}
                    {liveMarketCap != null ? fmtB(liveMarketCap) : '–'}
                  </li>
                  <li>
                    Volumen:{' '}
                    {volume != null ? volume.toLocaleString('de-DE') : '–'}
                  </li>
                  <li>
                    Schlusskurs Vortag:{' '}
                    {previousClose != null ? fmtPrice(previousClose) : '–'}
                  </li>
                  <li>
                    Beta:{' '}
                    {profileData?.beta != null ? profileData.beta.toFixed(2) : '–'}
                  </li>
                </ul>
              </div>

              {/* 2) Bilanz */}
              <div>
                <h3 className="text-white font-semibold mb-2">Bilanz</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>Cash: {cashBS != null ? fmtB(cashBS) : '–'}</li>
                  <li>Debt: {debtBS != null ? fmtB(debtBS) : '–'}</li>
                  <li>Net Debt:{' '}
                    {netDebtBS != null ? fmtB(netDebtBS) : '–'}
                  </li>
                </ul>
              </div>

              {/* 3) Dividende */}
              <div>
                <h3 className="text-white font-semibold mb-2">Dividende</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>
                    Rendite:{' '}
                    {keyMetrics.dividendYield != null
                      ? fmtP(keyMetrics.dividendYield)
                      : '–'}
                  </li>
                  <li>
                    Payout Ratio:{' '}
                    {keyMetrics.payoutRatio != null
                      ? fmtP(keyMetrics.payoutRatio)
                      : '–'}
                  </li>
                </ul>
                {user?.isPremium ? (
                  <span className="mt-2 inline-block text-gray-400 italic text-sm">
                    Mehr zur Dividende: Coming soon…
                  </span>
                ) : (
                  <Link
                    href="/pricing"
                    className="mt-2 inline-flex items-center text-yellow-400 hover:underline text-sm"
                  >
                    <LockClosedIcon className="w-4 h-4 mr-1" /> Mehr zur Dividende
                  </Link>
                )}
              </div>

              {/* 4) Bewertung */}
              <div className="relative">
                <h3 className="text-white font-semibold mb-2">Bewertung</h3>
                <div className={user?.isPremium ? '' : 'filter blur-sm'}>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>
                      KGV TTM:{' '}
                      {peTTM != null ? peTTM.toFixed(2) : '–'}
                    </li>
                    <li>
                      PEG TTM:{' '}
                      {pegTTM != null ? pegTTM.toFixed(2) : '–'}
                    </li>
                    <li>
                      KBV TTM:{' '}
                      {pbTTM != null ? pbTTM.toFixed(2) : '–'}
                    </li>
                    <li>
                      KUV TTM:{' '}
                      {psTTM != null ? psTTM.toFixed(2) : '–'}
                    </li>
                    <li>
                      EV/EBIT:{' '}
                      {evEbit != null ? evEbit.toFixed(2) : '–'}
                    </li>
                  </ul>
                </div>
                {!user?.isPremium && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LockClosedIcon className="w-6 h-6 text-yellow-400" />
                  </div>
                )}
              </div>

              {/* 5) Margins */}
              <div className="relative">
                <h3 className="text-white font-semibold mb-2">Marge</h3>
                <div className={user?.isPremium ? '' : 'filter blur-sm'}>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>
                      Bruttomarge:{' '}
                      {grossMargin != null ? fmtP(grossMargin) : '–'}
                    </li>
                    <li>
                      Operative Marge:{' '}
                      {operatingMargin != null
                        ? fmtP(operatingMargin)
                        : '–'}
                    </li>
                    <li>
                      Nettogewinnmarge:{' '}
                      {profitMargin != null
                        ? fmtP(profitMargin)
                        : '–'}
                    </li>
                  </ul>
                </div>
                {!user?.isPremium && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LockClosedIcon className="w-6 h-6 text-yellow-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <p className="text-gray-500">Key Metrics nicht verfügbar.</p>
      )}

      {/* ─── Historical Chart ──────────────────────────────────────────────────── */}
      <Card>
        <h2 className="text-2xl font-semibold mb-4">
          Historischer Kursverlauf
        </h2>
        {history.length > 0 ? (
          <StockLineChart data={history} />
        ) : (
          <p className="text-gray-500">Keine historischen Kursdaten.</p>
        )}
      </Card>

      {/* ─── Kennzahlen-Charts ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Kennzahlen-Charts auswählen
        </h2>
        {user?.isPremium ? (
          <FinancialAnalysisClient ticker={ticker} />
        ) : (
          <div className="bg-card-dark p-6 rounded text-center">
            <p className="mb-4">
              Interaktive Charts sind ein Premium-Feature.
            </p>
            <Link
              href="/pricing"
              className="inline-block bg-accent text-black bold px-4 py-2 rounded"
            >
              Jetzt upgraden
            </Link>
          </div>
        )}
      </section>

      {/* ─── Earnings & Revenue Estimates ─────────────────────────────────────── */}
      {estimates.length > 0 && (
        <Card>
          <h2 className="text-2xl font-semibold mb-4">
            Analysten Schätzungen (ab {new Date().getFullYear()})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Estimates */}
            <div>
              <h3 className="font-semibold mb-2">Umsatzschätzungen</h3>
              <table className="min-w-full text-sm text-gray-100 divide-y divide-gray-700">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-3 py-2 text-left font-medium">FY</th>
                    <th className="px-3 py-2 text-right font-medium">Avg</th>
                    <th className="px-3 py-2 text-right font-medium">Low</th>
                    <th className="px-3 py-2 text-right font-medium">High</th>
                    <th className="px-3 py-2 text-right font-medium">YoY</th>
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
                              .toFixed(2)
                              .replace('.', ',')} %`
                      const yoyClass =
                        yoy == null
                          ? ''
                          : yoy >= 0
                          ? 'text-green-500'
                          : 'text-red-500'

                      return (
                        <tr
                          key={e.date}
                          className="odd:bg-gray-800 even:bg-transparent hover:bg-gray-700"
                        >
                          <td className="px-3 py-1">{fy}</td>
                          <td className="px-3 py-1 text-right">
                            {fmtB(e.estimatedRevenueAvg)}
                          </td>
                          <td className="px-3 py-1 text-right">
                            {fmtB(e.estimatedRevenueLow)}
                          </td>
                          <td className="px-3 py-1 text-right">
                            {fmtB(e.estimatedRevenueHigh)}
                          </td>
                          <td className={`px-3 py-1 text-right ${yoyClass}`}>
                            {formattedYoY}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            {/* Earnings Estimates */}
            <div>
              <h3 className="font-semibold mb-2">Gewinnschätzungen</h3>
              <table className="min-w-full text-sm text-gray-100 divide-y divide-gray-700">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-3 py-2 text-left font-medium">FY</th>
                    <th className="px-3 py-2 text-right font-medium">EPS Avg</th>
                    <th className="px-3 py-2 text-right font-medium">Low</th>
                    <th className="px-3 py-2 text-right font-medium">High</th>
                    <th className="px-3 py-2 text-right font-medium">YoY</th>
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
                              .toFixed(2)
                              .replace('.', ',')} %`
                      const yoyClass =
                        yoy == null
                          ? ''
                          : yoy >= 0
                          ? 'text-green-500'
                          : 'text-red-500'

                      return (
                        <tr
                          key={e.date}
                          className="odd:bg-gray-800 even:bg-transparent hover:bg-gray-700"
                        >
                          <td className="px-3 py-1">{fy}</td>
                          <td className="px-3 py-1 text-right">
                            {e.estimatedEpsAvg.toFixed(2)}
                          </td>
                          <td className="px-3 py-1 text-right">
                            {e.estimatedEpsLow.toFixed(2)}
                          </td>
                          <td className="px-3 py-1 text-right">
                            {e.estimatedEpsHigh.toFixed(2)}
                          </td>
                          <td className={`px-3 py-1 text-right ${yoyClass}`}>
                            {formattedYoY}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* ─── Wall Street Rating (Donut) ─────────────────────────────────────────── */}
      {recs && <WallStreetRatingDonut recs={recs} />}

      {/* ─── Company Profile ────────────────────────────────────────────────────── */}
      {profileData && (
        <Card>
          <h2 className="text-2xl font-semibold mb-4">Company Profile</h2>
          <p className="text-sm text-gray-300 mb-4">
            {profileData.description}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ul className="text-sm space-y-1">
              <li>
                <strong>Sector:</strong> {profileData.sector ?? '–'}
              </li>
              <li>
                <strong>Industry:</strong> {profileData.industry ?? '–'}
              </li>
              <li>
                <strong>Employees:</strong> {profileData.fullTimeEmployees ?? '–'}
              </li>
              <li>
                <strong>IPO Date:</strong> {fmtDate(profileData.ipoDate)}
              </li>
            </ul>
            <ul className="text-sm space-y-1">
              <li>
                <strong>Address:</strong>{' '}
                {`${profileData.address}, ${profileData.city}, ${profileData.state} ${profileData.zip}, ${profileData.country}`}
              </li>
              <li>
                <strong>Phone:</strong> {profileData.phone ?? '–'}
              </li>
              <li>
                <strong>Website:</strong>{' '}
                <a
                  href={profileData.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {profileData.website}
                </a>
              </li>
            </ul>
          </div>
        </Card>
      )}
    </>
  )
}