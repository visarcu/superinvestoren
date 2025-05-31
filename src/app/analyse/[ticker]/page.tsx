// src/app/analyse/[ticker]/page.tsx
import React from 'react'
import { stocks } from '../../../data/stocks'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { LockClosedIcon } from '@heroicons/react/24/solid'
import Tooltip from '@/components/Tooltip'
import { irLinks } from '../../../data/irLinks'
import Card from '@/components/Card'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ErrorBoundary } from 'react-error-boundary'
import ErrorFallback from '@/components/ErrorFallback'
import Logo from '@/components/Logo'

// Dynamische Imports
const WatchlistButton = dynamic(
  () => import('@/components/WatchlistButton'),
  { ssr: false }
)
const StockLineChart = dynamic(
  () => import('../../../components/StockLineChart'),
  { ssr: false, loading: () => <LoadingSpinner /> }
)
const FinancialAnalysisClient = dynamic(
  () => import('../../../components/FinancialAnalysisClient'),
  { ssr: false, loading: () => <LoadingSpinner /> }
)
const DividendSection = dynamic(
  () => import('../../../components/DividendSection'),
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

// ➔ ISR: jede Seite wird nach 3600 Sekunden neu gebaut
export const revalidate = 3600

// Nur diese wenigen Ticker werden beim Build bereits statisch erzeugt:
const FEATURED_TICKERS = ['NVDA', 'AAPL', 'AMZN', 'GOOGL']

export async function generateStaticParams() {
  return FEATURED_TICKERS.map((t) => ({
    ticker: t.toLowerCase(),
  }))
}

// Formatter‐Hilfsfunktionen
const fmtB = (n: number) =>
  `$${(n / 1e9).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} b`
const fmtP = (n?: number) =>
  typeof n === 'number' ? `${(n * 100).toFixed(2).replace('.', ',')} %` : '–'
const fmtDate = (d?: string | null) => d ?? '–'
const fmtPrice = (n?: number) =>
  typeof n === 'number'
    ? n.toLocaleString('de-DE', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '–'

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

export default async function AnalysisPage({
  params,
}: {
  params: { ticker: string }
}) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker) ?? notFound()

  // Session & Premium‐Status abfragen
  const session = await getServerSession(authOptions)
  const isPremium = session?.user?.isPremium ?? false

  // Live‐Quote‐Variablen
  let livePrice: number | null = null
  let liveMarketCap: number | null = null
  let liveChangePct: number | null = null
  let livePriceAvg200: number | null = null
  let volume: number | null = null
  let previousClose: number | null = null
  let week52Low: number | null = null
  let week52High: number | null = null

  // Profile / IR‐Link laden
  let profileData: Profile | null = null
  let irWebsite: string | null = null
  try {
    const resProfile = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 24 } }
    )
    if (resProfile.ok) {
      const [p] = (await resProfile.json()) as Profile[]
      profileData = p
      irWebsite = p.website ?? null
    }
  } catch {
    console.warn(`Profile for ${ticker} failed.`)
  }
  const irUrl = irLinks[ticker] ?? irWebsite

  // 1) Historische Preise laden
  let history: { date: string; close: number }[] = []
  try {
    const resH = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?serietype=line&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resH.ok) {
      const { historical = [] } = await resH.json()
      history = (historical as any[])
        .slice()
        .reverse()
        .map((h) => ({ date: h.date, close: h.close }))
    }
  } catch {
    console.warn(`History for ${ticker} failed.`)
  }

  // 2) Dividend‐Historie laden
  let dividendHistory: { date: string; dividend: number }[] = []
  try {
    const resDiv = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resDiv.ok) {
      const { historical = [] } = (await resDiv.json()) as any
      dividendHistory = (historical as any[])
        .slice()
        .reverse()
        .map((d) => ({ date: d.date, dividend: d.dividend }))
    }
  } catch {
    console.warn(`Dividend history for ${ticker} failed.`)
  }

  // 3) Segment‐Daten laden
  let segmentRaw: Record<string, Record<string, number>> = {}
  try {
    const resSeg = await fetch(
      `https://financialmodelingprep.com/api/v4/revenue-product-segmentation?symbol=${ticker}&structure=flat&period=annual&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 } }
    )
    if (resSeg.ok) segmentRaw = await resSeg.json()
  } catch {
    console.warn(`Segmentation for ${ticker} failed.`)
  }
  const segmentData = Object.entries(segmentRaw)
    .map(([date, seg]) => ({ date, ...seg }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 4) Key Metrics laden
  const base = process.env.NEXT_PUBLIC_BASE_URL!
  const resKM = await fetch(`${base}/api/financials/${ticker}`, {
    next: { revalidate: 3600 },
  })
  if (!resKM.ok) return notFound()
  const { keyMetrics = {} } = await resKM.json()
  const hasKeyMetrics = Object.keys(keyMetrics).length > 0

  // 5) Bilanzdaten laden
  let cashBS: number | null = null
  let debtBS: number | null = null
  let netDebtBS: number | null = null
  try {
    const resBS = await fetch(
      `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=annual&limit=1&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resBS.ok) {
      const fin = (await resBS.json()) as any
      const L = Array.isArray(fin.financials) ? fin.financials[0] : fin[0]
      cashBS = L.cashAndShortTermInvestments ?? null
      debtBS = L.totalDebt ?? null
      netDebtBS = L.netDebt ?? null
    }
  } catch {
    console.warn(`BS for ${ticker} failed.`)
  }

  // 6) Dividend‐Daten (Ex/Pay‐Date) laden
  let exDate: string | null = null
  let payDate: string | null = null
  try {
    const resD = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resD.ok) {
      const djson = (await resD.json()) as any
      const list = Array.isArray(djson.historical) ? djson.historical : djson
      if (list.length) {
        const L = (list as { date: string; paymentDate: string }[])
          .sort((a, b) => b.date.localeCompare(a.date))[0]
        exDate = L.date
        payDate = L.paymentDate
      }
    }
  } catch {
    console.warn(`Dividend dates for ${ticker} failed.`)
  }

  // 7) Live‐Quote extra Felder
  try {
    const resQ = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (resQ.ok) {
      const [q] = (await resQ.json()) as any[]
      livePrice = q.price
      liveMarketCap = q.marketCap
      liveChangePct = q.changesPercentage
      livePriceAvg200 = q.priceAvg200
      volume = q.volume
      previousClose = q.previousClose
      week52Low = q.yearLow
      week52High = q.yearHigh
    }
  } catch {
    console.warn(`Quote for ${ticker} failed.`)
  }

  // 8) Company Outlook laden
  let peTTM: number | null = null
  let pegTTM: number | null = null
  let pbTTM: number | null = null
  let psTTM: number | null = null
  try {
    const resO = await fetch(
      `https://financialmodelingprep.com/api/v4/company-outlook?symbol=${ticker}&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resO.ok) {
      const { ratios = [] } = (await resO.json()) as any
      const r = ratios[0] ?? {}
      peTTM = r.peRatioTTM ?? null
      pegTTM = r.pegRatioTTM ?? null
      pbTTM = r.priceToBookRatioTTM ?? null
      psTTM = r.priceSalesRatioTTM ?? null
    }
  } catch {
    console.warn(`Outlook for ${ticker} failed.`)
  }

  // 9) EV/EBIT berechnen
  let evEbit: number | null = null
  try {
    const [resEV, resInc] = await Promise.all([
      fetch(
        `https://financialmodelingprep.com/api/v3/enterprise-values/${ticker}?period=quarter&limit=1&apikey=${process.env.FMP_API_KEY}`,
        { next: { revalidate: 60 * 60 * 6 } }
      ),
      fetch(
        `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=1&apikey=${process.env.FMP_API_KEY}`,
        { next: { revalidate: 60 * 60 * 6 } }
      ),
    ])
    if (resEV.ok && resInc.ok) {
      const [e] = (await resEV.json()) as any[]
      const [i] = (await resInc.json()) as any[]
      if (e.enterpriseValue && i.operatingIncome) {
        evEbit = e.enterpriseValue / i.operatingIncome
      }
    }
  } catch {
    console.warn(`EV/EBIT for ${ticker} failed.`)
  }

  // 10) Margins laden
  let grossMargin: number | null = null
  let operatingMargin: number | null = null
  let profitMargin: number | null = null
  try {
    const resM = await fetch(
      `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=1&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resM.ok) {
      const [inc] = (await resM.json()) as any[]
      grossMargin = inc.grossProfitRatio ?? null
      operatingMargin = inc.operatingIncomeRatio ?? null
      profitMargin = inc.netIncomeRatio ?? null
    }
  } catch {
    console.warn(`Margins for ${ticker} failed.`)
  }

  // 11) Analyst Estimates
  type Est = {
    date: string
    estimatedRevenueLow: number
    estimatedRevenueHigh: number
    estimatedRevenueAvg: number
    estimatedEpsLow: number
    estimatedEpsHigh: number
    estimatedEpsAvg: number
  }
  let estimates: Est[] = []
  try {
    const resE = await fetch(
      `https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resE.ok) {
      const all = (await resE.json()) as Est[]
      const thisYear = new Date().getFullYear()
      estimates = all.filter(
        (e) => parseInt(e.date.slice(0, 4), 10) >= thisYear
      )
    }
  } catch {
    console.warn(`Estimates for ${ticker} failed.`)
  }

  // 12) Wall Street Rating
  let recs:
    | {
        strongBuy: number
        buy: number
        hold: number
        sell: number
        strongSell: number
      }
    | null = null
  try {
    const resA = await fetch(
      `https://financialmodelingprep.com/api/v3/analyst-stock-recommendations/${ticker}?apikey=${process.env.FMP_API_KEY}`
    )
    if (resA.ok) {
      const [a] = (await resA.json()) as any[]
      recs = {
        strongBuy: a.analystRatingsStrongBuy ?? 0,
        buy: a.analystRatingsbuy ?? 0,
        hold: a.analystRatingsHold ?? 0,
        sell: a.analystRatingsSell ?? 0,
        strongSell: a.analystRatingsStrongSell ?? 0,
      }
    }
  } catch {
    console.warn(`Recommendations for ${ticker} failed.`)
  }

  // ─── RENDER ─────────────────────────────
  return (
    <main className="max-w-7xl mx-auto p-8 space-y-8">
      {/* ← Back */}
      <Link
        href={`/aktie/${ticker.toLowerCase()}`}
        className="text-blue-600 hover:underline"
      >
        ← Zurück zur Aktie
      </Link>

      {/* Header mit Logo */}
      <div className="flex items-center justify-between space-x-6">
        <div className="flex items-center space-x-4">
          <Logo
            src={`/logos/${ticker.toLowerCase()}.svg`}
            alt={`${ticker} Logo`}
            className="w-12 h-12"
          />
          <div>
            <h1 className="text-3xl font-bold">
              Kennzahlen-Analyse: {stock.name} ({ticker})
            </h1>
            <p className="text-gray-400 text-sm">
              Detaillierte Finanzkennzahlen
            </p>
          </div>
        </div>
        <WatchlistButton ticker={ticker} />
      </div>

      {/* IR-Link */}
      {irLinks[ticker] && (
        <Tooltip text="Zur IR-Seite">
          <a
            href={irLinks[ticker]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:underline gap-1"
          >
            Investor Relations <InformationCircleIcon className="w-4 h-4" />
          </a>
        </Tooltip>
      )}

      {/* Live‐Quote */}
      <div className="flex items-baseline gap-4">
        <div className="text-2xl font-semibold">
          {fmtPrice(livePrice ?? undefined)}
        </div>
        {liveChangePct != null && (
          <div
            className={`text-sm font-medium ${
              liveChangePct >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {liveChangePct >= 0 ? '↑' : '↓'}{' '}
            {Math.abs(liveChangePct).toFixed(2).replace('.', ',')} %
          </div>
        )}
        {livePriceAvg200 != null && (
          <div className="text-sm text-gray-500">
            200d-Avg: {fmtPrice(livePriceAvg200)}
          </div>
        )}
      </div>

      {/* ─── Key Metrics / Balance / Dividend / Bewertung / Margins ─── */}
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
                    {volume != null
                      ? volume.toLocaleString('de-DE')
                      : '–'}
                  </li>
                  <li>
                    Schlusskurs Vortag:{' '}
                    {previousClose != null
                      ? fmtPrice(previousClose)
                      : '–'}
                  </li>
                  <li>
                    Beta:{' '}
                    {profileData?.beta != null
                      ? profileData.beta.toFixed(2)
                      : '–'}
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
                {isPremium ? (
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
                <div className={isPremium ? '' : 'filter blur-sm'}>
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
                {!isPremium && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LockClosedIcon className="w-6 h-6 text-yellow-400" />
                  </div>
                )}
              </div>

              {/* 5) Margins */}
              <div className="relative">
                <h3 className="text-white font-semibold mb-2">Marge</h3>
                <div className={isPremium ? '' : 'filter blur-sm'}>
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
                {!isPremium && (
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

      {/* Historical Chart */}
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

      {/* Kennzahlen‐Charts */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Kennzahlen‐Charts auswählen
        </h2>
        {isPremium ? (
          <FinancialAnalysisClient ticker={ticker} />
        ) : (
          <div className="bg-card-dark p-6 rounded text-center">
            <p className="mb-4">
              Interaktive Charts sind ein Premium‐Feature.
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

      {/* ─── Earnings & Revenue Estimates ─── */}
      {estimates.length > 0 && (
        <Card>
          {/* Header */}
          <h2 className="text-2xl font-semibold mb-4">
            Analysten Schätzungen (ab {new Date().getFullYear()})
          </h2>

          {/* Zwei Spalten: Revenue & Earnings */}
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

      {/* ─── Wall Street Rating (Donut) ─── */}
      {recs && <WallStreetRatingDonut recs={recs} />}

      {/* ─── Company Profile ─── */}
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
                <strong>Employees:</strong>{' '}
                {profileData.fullTimeEmployees ?? '–'}
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
    </main>
  )
}