// src/app/analyse/[ticker]/page.tsx
import React from 'react'
import { stocks } from '../../../data/stocks'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import Tooltip from '@/components/Tooltip'
import { irLinks } from '../../../data/irLinks'
import Image from 'next/image'

// Chart-Komponenten (nur client-side)
const StockLineChart = dynamic(
  () => import('../../../components/StockLineChart'),
  { ssr: false }
)
const FinancialAnalysisClient = dynamic(
  () => import('../../../components/FinancialAnalysisClient'),
  { ssr: false }
)

const DividendSection = dynamic(
  () => import('../../../components/DividendSection'),
  { ssr: false }
)

const RevenueBySegmentChart = dynamic(
  () => import('@/components/RevenueBySegmentChart'),
  { ssr: false }
)

// Hilfs-Formatter
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

// Typ für Company Profile
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

export async function generateStaticParams() {
  return stocks.map((s) => ({ ticker: s.ticker.toLowerCase() }))
}

export default async function AnalysisPage({
  params,
}: {
  params: { ticker: string }
}) {
  const ticker = params.ticker.toUpperCase()
  const stock = stocks.find((s) => s.ticker === ticker) ?? notFound()

  // ─── Live‐Quote Variablen ───
let livePrice: number | null      = null
let liveMarketCap: number | null  = null
let liveChangePct: number | null  = null
let livePriceAvg200: number | null= null
let volume: number | null         = null
let previousClose: number | null  = null
let week52Low: number | null      = null
let week52High: number | null     = null

  // ─── Profil holen für IR-Link und Company Profile ───
  let profileData: Profile | null = null
  let irWebsite: string | null = null
  try {
    const resProfile = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 24 } }
    )
    if (resProfile.ok) {
      const [p] = (await resProfile.json()) as Array<Profile>
      profileData = p
      irWebsite = p.website ?? null
    }
  } catch {
    console.warn(`Profile for ${ticker} could not be fetched.`)
  }
  // Override mit manuellen IR-Links
  const irUrl = irLinks[ticker] ?? irWebsite

  // ─── 1) Historische Kurse ───

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
    console.warn(`Historical data for ${ticker} could not be fetched.`)
  }


  // ─── Dividend‐Historie ───
let dividendHistory: { date: string; dividend: number }[] = []
try {
  const resDivHist = await fetch(
    `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.FMP_API_KEY}`,
    { next: { revalidate: 60 * 60 * 6 } }
  )
  if (resDivHist.ok) {
    const { historical = [] } = await resDivHist.json() as any
    dividendHistory = (historical as any[])
      .slice()
      .reverse()
      .map((d) => ({ date: d.date, dividend: d.dividend }))
  }
} catch {
  console.warn(`Dividend‐Historie für ${ticker} fehlgeschlagen.`)
}

// ─── Seg­ment-Daten ───
let segmentRaw: Record<string, Record<string, number>> = {}
try {
  const resSeg = await fetch(
    `https://financialmodelingprep.com/api/v4/revenue-product-segmentation?symbol=${ticker}&structure=flat&period=annual&apikey=${process.env.FMP_API_KEY}`,
    { next: { revalidate: 60 * 60 } }
  )
  if (resSeg.ok) {
    segmentRaw = await resSeg.json()
  }
} catch {
  console.warn(`Revenue-Segmentation für ${ticker} fehlgeschlagen.`)
}

// In Array umwandeln und nach Datum sortieren:
const segmentData = Object.entries(segmentRaw)
  .map(([date, seg]) => ({ date, ...seg }))
  .sort((a, b) => a.date.localeCompare(b.date))

  // ─── 2) Key-Metrics via interne API ───
  const base = process.env.NEXT_PUBLIC_BASE_URL!
  const resKM = await fetch(`${base}/api/financials/${ticker}`, {
    next: { revalidate: 3600 },
  })
  if (!resKM.ok) return notFound()
  const { keyMetrics = {} } = await resKM.json()
  const hasKeyMetrics = Object.keys(keyMetrics).length > 0

  // ─── 3) Bilanz (Cash, Debt, Net Debt) ───
  let cashBS: number | null = null
  let debtBS: number | null = null
  let netDebtBS: number | null = null
  try {
    const resBS = await fetch(
      `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=annual&limit=1&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resBS.ok) {
      const bs = (await resBS.json()) as any
      const fin = Array.isArray(bs.financials) ? bs.financials : bs
      if (fin.length > 0) {
        const L = fin[0]
        cashBS = L.cashAndShortTermInvestments ?? null
        debtBS = L.totalDebt ?? null
        netDebtBS = L.netDebt ?? null
      }
    }
  } catch {
    console.warn(`Balance sheet for ${ticker} failed.`)
  }

  // ─── 4) Dividend Dates ───
  let exDate: string | null = null
  let payDate: string | null = null
  try {
    const resD = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/stock_dividend/${ticker}?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resD.ok) {
      const djson = (await resD.json()) as any
      const list: any[] = Array.isArray(djson.historical)
        ? djson.historical
        : djson
      if (list.length > 0) {
        const L = list
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))[0]
        exDate = L.date
        payDate = L.paymentDate
      }
    }
  } catch {
    console.warn(`Dividend dates for ${ticker} failed.`)
  }

// ─── 5) Live-Quote ───
try {
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.FMP_API_KEY}`,
    { next: { revalidate: 60 } }
  )
  if (res.ok) {
    const [q] = (await res.json()) as any[]
    livePrice       = q.price
    liveMarketCap   = q.marketCap
    liveChangePct   = q.changesPercentage
    livePriceAvg200 = q.priceAvg200

    // neu:
    volume          = q.volume
    previousClose   = q.previousClose
    week52Low       = q.yearLow
    week52High      = q.yearHigh
  }
} catch {
  console.warn(`Live quote for ${ticker} failed.`)
}

  // ─── 6) Company Outlook (Bewertungen) ───
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
    console.warn(`Company-Outlook for ${ticker} failed.`)
  }

  // ─── 7) EV/EBIT ───
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

  // ─── 8) Margins ───
  let grossMargin: number | null = null
  let operatingMargin: number | null = null
  let profitMargin: number | null = null
  try {
    const resM = await fetch(
      `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=1&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resM.ok) {
      const [inc] = (await resM.json()) as Array<{
        grossProfitRatio?: number
        operatingIncomeRatio?: number
        netIncomeRatio?: number
      }>
      grossMargin = inc.grossProfitRatio ?? null
      operatingMargin = inc.operatingIncomeRatio ?? null
      profitMargin = inc.netIncomeRatio ?? null
    }
  } catch {
    console.warn(`Margins for ${ticker} failed.`)
  }

  // ─── 9) Analyst Estimates ───
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
      estimates = all.filter(e => parseInt(e.date.slice(0,4),10) >= thisYear)
    }
  } catch {
    console.warn(`Analyst estimates for ${ticker} failed.`)
  }

  // ─── 10) Wall Street Rating ───
  let recs:
    | { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }
    | null = null
  try {
    const resA = await fetch(
      `https://financialmodelingprep.com/api/v3/analyst-stock-recommendations/${ticker}?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
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
    console.warn(`Analyst recommendations for ${ticker} failed.`)
  }

  return (
    <main className="max-w-7xl mx-auto p-8 space-y-8">
      {/* ← Zurück */}
      <Link
        href={`/aktie/${ticker.toLowerCase()}`}
        className="text-blue-600 hover:underline"
      >
        ← Zurück zur Aktie
      </Link>

      {/* Titel */}
      <h1 className="text-3xl font-bold">
        Kennzahlen-Analyse: {stock.name} ({ticker})
      </h1>

      {/* Investor Relations */}
      {irUrl && (
        <div className="mt-2">
          <Tooltip text="Zur Investor-Relations-Seite des Unternehmens">
            <a
              href={irUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:underline gap-1"
            >
              Investor Relations
              <InformationCircleIcon className="w-4 h-4" />
            </a>
          </Tooltip>
        </div>
      )}

     

      {/* Live-Quote in der Kopfzeile */}
      <div className="flex items-baseline gap-6">
        <div className="text-2xl font-semibold">{fmtPrice(livePrice)}</div>
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

      {/* Key Metrics / Balance / Dividend / Bewertung / Margins */}
      {hasKeyMetrics ? (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 bg-white rounded-xl shadow p-6">
{/* Value */}
<div>
  <h3 className="font-semibold mb-2">Value</h3>
  <ul className="text-sm space-y-1">
    <li>
      Market Cap:{' '}
      {liveMarketCap != null
        ? fmtB(liveMarketCap)
        : keyMetrics.marketCap != null
        ? fmtB(keyMetrics.marketCap)
        : '–'}
    </li>
    <li>
      Volume:{' '}
      {volume != null
        ? volume.toLocaleString('de-DE')
        : '–'}
    </li>
    <li>
      Prev. Close:{' '}
      {fmtPrice(previousClose)}
    </li>
    <li>
      52 W-Range:{' '}
      {fmtPrice(week52Low)} – {fmtPrice(week52High)}
    </li>
    <li>
      Beta:{' '}
      {profileData?.beta != null
        ? profileData.beta.toFixed(2)
        : '–'}
    </li>
  </ul>
</div>
          {/* Balance */}
          <div>
            <h3 className="font-semibold mb-2">Balance</h3>
            <ul className="text-sm space-y-1">
              <li>Cash: {cashBS != null ? fmtB(cashBS) : '–'}</li>
              <li>Debt: {debtBS != null ? fmtB(debtBS) : '–'}</li>
              <li>Net Debt: {netDebtBS != null ? fmtB(netDebtBS) : '–'}</li>
            </ul>
          </div>
          {/* Dividend mit “Mehr zur Dividende” */}
          <div>
  <h3 className="font-semibold mb-2">Dividend</h3>
  <ul className="text-sm space-y-1">
    <li>Rendite: {fmtP(keyMetrics.dividendYield)}</li>
    <li>Payout Ratio: {fmtP(keyMetrics.payoutRatio)}</li>
  </ul>

  <Link
    href={`/analyse/${ticker.toLowerCase()}/dividende`}
    className="mt-2 inline-block text-blue-600 hover:underline text-sm"
  >
    Mehr zur Dividende →
  </Link>
</div>
          {/* Bewertung */}
          <div>
            <h3 className="font-semibold mb-2">Bewertung</h3>
            <ul className="text-sm space-y-1">
              <li>KGV TTM: {peTTM?.toFixed(2) ?? '–'}</li>
              <li>PEG TTM: {pegTTM?.toFixed(2) ?? '–'}</li>
              <li>KBV TTM: {pbTTM?.toFixed(2) ?? '–'}</li>
              <li>KUV TTM: {psTTM?.toFixed(2) ?? '–'}</li>
              <li>EV/EBIT: {evEbit?.toFixed(2) ?? '–'}</li>
            </ul>
          </div>
          {/* Margins */}
          <div>
            <h3 className="font-semibold mb-2">Margins</h3>
            <ul className="text-sm space-y-1">
              <li>Gross Margin: {fmtP(grossMargin)}</li>
              <li>Operating Margin: {fmtP(operatingMargin)}</li>
              <li>Profit Margin: {fmtP(profitMargin)}</li>
            </ul>
          </div>
        </section>
      ) : (
        <p className="text-gray-500">Key Metrics nicht verfügbar.</p>
      )}

      {/* Historischer Kursverlauf */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Historischer Kursverlauf</h2>
        {history.length > 0 ? (
          <StockLineChart data={history} />
        ) : (
          <p className="text-gray-500">Keine historischen Kursdaten.</p>
        )}
      </section>

      {/* Kennzahlen-Charts */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Kennzahlen-Charts auswählen
        </h2>
        <FinancialAnalysisClient ticker={ticker} />
      </section>

       {/* ─── Earnings & Revenue Estimates ─── */}
{estimates.length > 0 && (
  <section className="bg-white rounded-xl shadow p-6">
    <h2 className="text-2xl font-semibold mb-4">Estimates (ab {new Date().getFullYear()})</h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Revenue Estimates */}
      <div className="overflow-x-auto">
        <h3 className="font-semibold mb-2">Revenue Estimates</h3>
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">FY</th>
              <th className="px-3 py-2 text-right font-medium">Avg</th>
              <th className="px-3 py-2 text-right font-medium">Low</th>
              <th className="px-3 py-2 text-right font-medium">High</th>
              <th className="px-3 py-2 text-right font-medium">YoY</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {estimates
              .slice()           // make a copy
              .reverse()         // earliest year first
              .map((e, idx, arr) => {
                const fy = e.date.slice(0,4)
                // YoY: compare with previous entry in the reversed array
                let yoy: number | null = null
                if (idx > 0) {
                  const prev = arr[idx - 1].estimatedRevenueAvg
                  if (prev > 0) {
                    yoy = (e.estimatedRevenueAvg - prev) / prev * 100
                  }
                }
                const formattedYoY = 
                  yoy == null ? '–' :
                  `${yoy >= 0 ? '+' : ''}${yoy.toFixed(2).replace('.', ',')} %`
                const yoyClass =
                  yoy == null ? '' :
                  yoy >= 0 ? 'text-green-600' : 'text-red-600'

                return (
                  <tr key={e.date} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-1">{fy}</td>
                    <td className="px-3 py-1 text-right">{fmtB(e.estimatedRevenueAvg)}</td>
                    <td className="px-3 py-1 text-right">{fmtB(e.estimatedRevenueLow)}</td>
                    <td className="px-3 py-1 text-right">{fmtB(e.estimatedRevenueHigh)}</td>
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
      <div className="overflow-x-auto">
        <h3 className="font-semibold mb-2">Earnings Estimates</h3>
        <table className="min-w-full text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">FY</th>
              <th className="px-3 py-2 text-right font-medium">EPS Avg</th>
              <th className="px-3 py-2 text-right font-medium">Low</th>
              <th className="px-3 py-2 text-right font-medium">High</th>
              <th className="px-3 py-2 text-right font-medium">YoY</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {estimates
              .slice()
              .reverse()
              .map((e, idx, arr) => {
                const fy = e.date.slice(0,4)
                let yoy: number | null = null
                if (idx > 0) {
                  const prev = arr[idx - 1].estimatedEpsAvg
                  if (prev !== 0) {
                    yoy = (e.estimatedEpsAvg - prev) / prev * 100
                  }
                }
                const formattedYoY = 
                  yoy == null ? '–' :
                  `${yoy >= 0 ? '+' : ''}${yoy.toFixed(2).replace('.', ',')} %`
                const yoyClass =
                  yoy == null ? '' :
                  yoy >= 0 ? 'text-green-600' : 'text-red-600'

                return (
                  <tr key={e.date} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-1">{fy}</td>
                    <td className="px-3 py-1 text-right">{e.estimatedEpsAvg.toFixed(2)}</td>
                    <td className="px-3 py-1 text-right">{e.estimatedEpsLow.toFixed(2)}</td>
                    <td className="px-3 py-1 text-right">{e.estimatedEpsHigh.toFixed(2)}</td>
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
  </section>
)}

      {/* Wall Street Rating */}
      {recs && (
        <section className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Wall Street Rating</h2>
            <Tooltip text="Aggregierte Analysten‐Empfehlungen von über 20 Research‐Häusern via FMP API.">
              <InformationCircleIcon className="w-5 h-5 text-gray-500 cursor-pointer" />
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            <div>
              <span className="block text-xl font-bold text-green-800">
                {recs.strongBuy}
              </span>
              <small className="text-gray-600">Strong Buy</small>
            </div>
            <div>
              <span className="block text-xl font-bold text-green-600">
                {recs.buy}
              </span>
              <small className="text-gray-600">Buy</small>
            </div>
            <div>
              <span className="block text-xl font-bold text-yellow-600">
                {recs.hold}
              </span>
              <small className="text-gray-600">Hold</small>
            </div>
            <div>
              <span className="block text-xl font-bold text-red-600">
                {recs.sell}
              </span>
              <small className="text-gray-600">Sell</small>
            </div>
            <div>
              <span className="block text-xl font-bold text-red-800">
                {recs.strongSell}
              </span>
              <small className="text-gray-600">Strong Sell</small>
            </div>
          </div>
        </section>

        
      )}

       {/* Company Profile */}
       {profileData && (
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">Company Profile</h2>
          <p className="text-sm text-gray-700 mb-4">{profileData.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <ul className="text-sm space-y-1">
                <li>
                  <strong>Sector</strong>: {profileData.sector ?? '–'}
                </li>
                <li>
                  <strong>Industry</strong>: {profileData.industry ?? '–'}
                </li>
                <li>
                  <strong>Employees</strong>: {profileData.fullTimeEmployees ?? '–'}
                </li>
                <li>
                  <strong>Founded</strong>: {fmtDate(profileData.ipoDate)}
                </li>
              </ul>
            </div>
            <div>
              <ul className="text-sm space-y-1">
                <li>
                  <strong>Address</strong>: {profileData.address}, {profileData.city}, {profileData.state}{' '}
                  {profileData.zip}, {profileData.country}
                </li>
                <li>
                  <strong>Phone</strong>: {profileData.phone ?? '–'}
                </li>
                <li>
                  <strong>Website</strong>:{' '}
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
          </div>
        </section>
      )}


    </main>
  )
}