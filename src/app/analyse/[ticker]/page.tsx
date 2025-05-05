// src/app/analyse/[ticker]/page.tsx
import React from 'react'
import { stocks } from '../../../data/stocks'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'

// Chart-Komponenten (nur client-side)
const StockLineChart = dynamic(
  () => import('../../../components/StockLineChart'),
  { ssr: false }
)
const FinancialAnalysisClient = dynamic(
  () => import('../../../components/FinancialAnalysisClient'),
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
      const bsJson = (await resBS.json()) as any
      const fin = Array.isArray(bsJson.financials)
        ? bsJson.financials
        : bsJson
      if (fin.length > 0) {
        const L = fin[0]
        cashBS = L.cashAndShortTermInvestments ?? null
        debtBS = L.totalDebt ?? null
        netDebtBS = L.netDebt ?? null
      }
    }
  } catch (err) {
    console.warn(`Balance sheet for ${ticker} failed:`, err)
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
    console.warn(`Dividend dates for ${ticker} could not be fetched.`)
  }

  // ─── 5) Live-Quote ───
  let livePrice: number | null = null
  let liveMarketCap: number | null = null
  let liveChangePct: number | null = null
  let livePriceAvg200: number | null = null
  try {
    const resQ = await fetch(
      `https://financialmodelingprep.com/api/v3/quote-order/${ticker}?apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 } }
    )
    if (resQ.ok) {
      const [q] = (await resQ.json()) as any[]
      livePrice = q.price
      liveMarketCap = q.marketCap
      liveChangePct = q.changesPercentage
      livePriceAvg200 = q.priceAvg200
    }
  } catch {
    console.warn(`Live quote for ${ticker} could not be fetched.`)
  }

  // ─── 6) Company Outlook (v4) für Bewertungs-Kennzahlen ───
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
    // NICHT: const [o] = await resO.json() as any[]
    const outlook = await resO.json() as {
      ratios?: Array<{
        peRatioTTM?: number
        pegRatioTTM?: number
        priceToBookRatioTTM?: number
        priceSalesRatioTTM?: number
      }>
    }

    // Echte Werte aus ratios[0] ziehen
    const r = outlook.ratios?.[0]
    if (r) {
      peTTM = r.peRatioTTM ?? null
      pegTTM = r.pegRatioTTM ?? null
      pbTTM = r.priceToBookRatioTTM ?? null
      psTTM = r.priceSalesRatioTTM ?? null
    }
  } else {
    console.warn(`Company-Outlook request for ${ticker} returned ${resO.status}`)
  }
} catch (err) {
  console.warn(`Company-Outlook for ${ticker} failed:`, err)
}

  // ─── 7) EV und Operating Income für EV/EBIT ───
  let ev: number | null = null
  let opIncome: number | null = null
  let evEbit: number | null = null
  try {
    // enterprise-values (aktuelles Quartal)
    const resEV = await fetch(
      `https://financialmodelingprep.com/api/v3/enterprise-values/${ticker}?period=quarter&limit=1&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    // income-statement (letztes Jahr)
    const resInc = await fetch(
      `https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=1&apikey=${process.env.FMP_API_KEY}`,
      { next: { revalidate: 60 * 60 * 6 } }
    )
    if (resEV.ok && resInc.ok) {
      const [e] = (await resEV.json()) as any[]
      const [i] = (await resInc.json()) as any[]
      ev = e.enterpriseValue ?? null
      opIncome = i.operatingIncome ?? null
      if (ev != null && opIncome) {
        evEbit = ev / opIncome
      }
    }
  } catch {
    console.warn(`EV/EBIT for ${ticker} failed.`)
  }

  return (
    <main className="max-w-7xl mx-auto p-8 space-y-8">
      <Link
        href={`/aktie/${ticker.toLowerCase()}`}
        className="text-blue-600 hover:underline"
      >
        ← Zurück zur Aktie
      </Link>

      <h1 className="text-3xl font-bold">
        Kennzahlen-Analyse: {stock.name} ({ticker})
      </h1>

      {/* ─── Live-Quote in der Kopfzeile ─── */}
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

      {/* ─── Key Metrics / Balance / Dividend / Bewertung ─── */}
      {hasKeyMetrics ? (
        <section className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-8 gap-6 bg-white rounded-xl shadow p-6">
          {/* Value */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
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
                KUV (TTM):{' '}
                {keyMetrics.priceToSalesRatio != null
                  ? keyMetrics.priceToSalesRatio.toFixed(2)
                  : '–'}
              </li>
              <li>
                FCF-Yield:{' '}
                {fmtP(keyMetrics.freeCashFlowYield)}
              </li>
            </ul>
          </div>
          {/* Balance */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <h3 className="font-semibold mb-2">Balance</h3>
            <ul className="text-sm space-y-1">
              <li>Cash: {cashBS != null ? fmtB(cashBS) : '–'}</li>
              <li>Debt: {debtBS != null ? fmtB(debtBS) : '–'}</li>
              <li>Net Debt: {netDebtBS != null ? fmtB(netDebtBS) : '–'}</li>
            </ul>
          </div>
          {/* Dividend */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <h3 className="font-semibold mb-2">Dividend</h3>
            <ul className="text-sm space-y-1">
              <li>Rendite: {fmtP(keyMetrics.dividendYield)}</li>
              <li>Payout Ratio: {fmtP(keyMetrics.payoutRatio)}</li>
              <li>Ex-Date: {fmtDate(exDate)}</li>
              <li>Payment Date: {fmtDate(payDate)}</li>
            </ul>
          </div>
          {/* Bewertung */}
          <div className="col-span-1 sm:col-span-4 lg:col-span-2">
            <h3 className="font-semibold mb-2">Bewertung</h3>
            <ul className="text-sm space-y-1">
              <li>KGV TTM: {peTTM?.toFixed(2) ?? '–'}</li>
              <li>PEG TTM: {pegTTM?.toFixed(2) ?? '–'}</li>
              <li>KBV TTM: {pbTTM?.toFixed(2) ?? '–'}</li>
              <li>KUV TTM: {psTTM?.toFixed(2) ?? '–'}</li>
              <li>EV/EBIT: {evEbit?.toFixed(2) ?? '–'}</li>
            </ul>
          </div>
        </section>
      ) : (
        <p className="text-gray-500">Key Metrics nicht verfügbar.</p>
      )}

      {/* ─── Historischer Kursverlauf ─── */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">Historischer Kursverlauf</h2>
        {history.length > 0 ? (
          <StockLineChart data={history} />
        ) : (
          <p className="text-gray-500">Keine historischen Kursdaten.</p>
        )}
      </section>

      {/* ─── Kennzahlen-Charts mit Checkbox-Auswahl ─── */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">
          Kennzahlen-Charts auswählen
        </h2>
        <FinancialAnalysisClient ticker={ticker} />
      </section>
    </main>
  )
}