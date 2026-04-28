'use client'

import React, { useState, useEffect, useMemo } from 'react'
import StockHeader from './StockHeader'
import EarningsBanner from './EarningsBanner'
import HeroPriceChart from './HeroPriceChart'
import KeyMetricsCard from './KeyMetricsCard'
import StockStatsStrip from './StockStatsStrip'
import StockTabs from './StockTabs'
import ExpandedChartModal from './ExpandedChartModal'
import { fmt, fmtPct } from '../_lib/format'
import { useStockUser } from '@/lib/hooks/useStockUser'
import { addRecentTicker } from '@/lib/recentlyViewed'
import { StockContextProvider } from '../_lib/StockContext'
import type {
  UnternehmenProfile,
  Period,
  BalancePeriod,
  CashFlowPeriod,
  NewsArticle,
  KPIMetric,
  EarningsEntry,
  AnalystEstimate,
  Quote,
  AftermarketQuote,
  PricePoint,
  ChartTimeframe,
  ExpandedChartState,
} from '../_lib/types'

interface StockPageClientProps {
  ticker: string
  children: React.ReactNode
}

export default function StockPageClient({ ticker, children }: StockPageClientProps) {
  const { isPremium, loading: userLoading } = useStockUser()
  const [profile, setProfile] = useState<UnternehmenProfile | null>(null)
  const [income, setIncome] = useState<Period[]>([])
  const [balance, setBalance] = useState<BalancePeriod[]>([])
  const [cashflow, setCashflow] = useState<CashFlowPeriod[]>([])
  // Herkunft der Finanzdaten (für "Eigene Daten"-Badge bei DAX-Firmen)
  const [financialSource, setFinancialSource] = useState<'sec-xbrl' | 'finclue-manual' | 'no-data' | null>(null)
  const [financialNotice, setFinancialNotice] = useState<string | null>(null)
  const [news, setNews] = useState<NewsArticle[]>([])
  const [kpis, setKpis] = useState<Record<string, KPIMetric>>({})
  const [earnings, setEarnings] = useState<EarningsEntry[]>([])
  const [estimates, setEstimates] = useState<AnalystEstimate[]>([])
  const [quote, setQuote] = useState<Quote | null>(null)
  const [aftermarket, setAftermarket] = useState<AftermarketQuote | null>(null)
  const [priceChart, setPriceChart] = useState<PricePoint[]>([])
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('1Y')
  const [chartLoading, setChartLoading] = useState(false)
  const [fullPriceHistory, setFullPriceHistory] = useState<PricePoint[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedChart, setExpandedChart] = useState<ExpandedChartState | null>(null)
  const [financialPeriod, setFinancialPeriod] = useState<'annual' | 'quarterly'>('annual')

  // Fetch all data
  useEffect(() => {
    setLoading(true)
    setQuote(null)
    Promise.all([
      fetch(`/api/v1/company/${ticker}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/v1/financials/income-statement/${ticker}?years=10`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/v1/financials/balance-sheet/${ticker}?years=10`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/v1/financials/cash-flow/${ticker}?years=10`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/v1/news/stock/${ticker}?limit=20`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/v1/kpis/${ticker}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/v1/earnings/${ticker}?limit=12`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/v1/quotes/${ticker}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`/api/v1/analyst-estimates/${ticker}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([p, inc, bal, cf, n, k, e, q, est]) => {
        if (p && !p.error) setProfile(p)
        if (inc?.data) setIncome(inc.data)
        if (bal?.data) setBalance(bal.data)
        if (cf?.data) setCashflow(cf.data)
        // Source-Info aus Income-Statement übernehmen (Balance + Cashflow haben dieselbe Quelle)
        if (inc?.source) setFinancialSource(inc.source)
        if (inc?.notice) setFinancialNotice(inc.notice)
        if (n?.articles) setNews(n.articles)
        if (k?.metrics) setKpis(k.metrics)
        if (e?.earnings) setEarnings(e.earnings)
        if (est?.estimates) setEstimates(est.estimates)
        if (q?.price)
          setQuote({
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            marketCap: q.marketCap,
            dayHigh: q.dayHigh,
            dayLow: q.dayLow,
            open: q.open,
            previousClose: q.previousClose,
            timestamp: q.timestamp,
            source: q.source,
          })
      })
      .finally(() => setLoading(false))
  }, [ticker])

  // Recently-Viewed: Sobald das Profil geladen ist, Ticker + Firmenname in die
  // localStorage-LRU schreiben. Dedup + Reordering machen wir im Helper.
  useEffect(() => {
    if (!profile?.name) return
    addRecentTicker(ticker, profile.name)
  }, [ticker, profile?.name])

  // Aftermarket-Quote laden (FMP, US-Aktien) — initial + alle 60s refreshen
  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch(`/api/v1/quotes/aftermarket/${ticker}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (cancelled) return
          if (d && typeof d.available === 'boolean') setAftermarket(d as AftermarketQuote)
        })
        .catch(() => {})
    }
    load()
    const id = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [ticker])

  // Auto-refresh quote every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/v1/quotes/${ticker}`)
        .then(r => (r.ok ? r.json() : null))
        .then(q => {
          if (q?.price)
            setQuote({
              price: q.price,
              change: q.change,
              changePercent: q.changePercent,
              marketCap: q.marketCap,
              dayHigh: q.dayHigh,
              dayLow: q.dayLow,
              open: q.open,
              previousClose: q.previousClose,
              timestamp: q.timestamp,
              source: q.source,
            })
        })
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [ticker])

  // EOD-History für 1M+ (einmal laden, dann clientseitig filtern)
  useEffect(() => {
    setChartLoading(true)
    fetch(`/api/v1/historical/${ticker}?days=1900`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.historical) {
          // adjClose ist split-adjustiert (EODHD adjusted_close), close ist raw.
          // Für die Chart-Darstellung wollen wir adjustiert, sonst sehen Splits
          // wie ein Crash aus (z.B. NOW 5:1 am 18.12.2025).
          const sorted = [...d.historical]
            .sort((a: any, b: any) => a.date.localeCompare(b.date))
            .map((h: any) => ({ date: h.date, price: h.adjClose ?? h.close }))
          setFullPriceHistory(sorted)
        }
      })
      .catch(() => {})
      .finally(() => setChartLoading(false))
  }, [ticker])

  // Timeframe-Logik:
  //   1D  → Intraday 5min, range=1d   (schöne Live-Kurve wie Broker)
  //   1W  → Intraday 15min, range=5d  (Stundenauflösung, mehrere Tage)
  //   1M+ → EOD aus fullPriceHistory, clientseitig gefiltert
  useEffect(() => {
    const useIntraday = chartTimeframe === '1D' || chartTimeframe === '1W'

    if (useIntraday) {
      setChartLoading(true)
      const interval = chartTimeframe === '1D' ? '5m' : '15m'
      const range = chartTimeframe === '1D' ? '1d' : '5d'
      let cancelled = false

      fetch(`/api/v1/intraday/${ticker}?interval=${interval}&range=${range}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (cancelled) return
          const pts = (d?.points || [])
            .filter((p: any) => p.close > 0)
            .map((p: any) => ({
              // Eindeutiger Key pro Intraday-Punkt: ISO-Timestamp
              date: `${p.date}T${p.time}`,
              price: p.close,
            }))
          setPriceChart(pts)
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setChartLoading(false)
        })
      return () => {
        cancelled = true
      }
    }

    // EOD-Pfad für 1M+
    if (fullPriceHistory.length === 0) return
    const now = new Date()
    const cutoff = new Date()
    switch (chartTimeframe) {
      case '1M':
        cutoff.setMonth(now.getMonth() - 1)
        break
      case '3M':
        cutoff.setMonth(now.getMonth() - 3)
        break
      case '1Y':
        cutoff.setFullYear(now.getFullYear() - 1)
        break
      case '5Y':
        cutoff.setFullYear(now.getFullYear() - 5)
        break
    }
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const filtered = fullPriceHistory.filter(p => p.date >= cutoffStr)
    const base = filtered.length > 0 ? filtered : fullPriceHistory.slice(-30)

    // Letzten Punkt auf Live-Quote aktualisieren (EOD hängt tagsüber hinterher)
    if (quote?.price && base.length > 0) {
      const todayISO = new Date().toISOString().slice(0, 10)
      const last = base[base.length - 1]
      if (last.date === todayISO) {
        setPriceChart([...base.slice(0, -1), { date: todayISO, price: quote.price }])
      } else if (last.date < todayISO) {
        setPriceChart([...base, { date: todayISO, price: quote.price }])
      } else {
        setPriceChart(base)
      }
    } else {
      setPriceChart(base)
    }
  }, [ticker, fullPriceHistory, chartTimeframe, quote?.price])

  // Derived metrics for KeyMetricsCard
  const { metrics, fyLabel } = useMemo(() => {
    const L = income[income.length - 1]
    const P = income[income.length - 2]
    const LB = balance[balance.length - 1]
    const LC = cashflow[cashflow.length - 1]

    const revGrowth = L?.revenue && P?.revenue ? ((L.revenue - P.revenue) / Math.abs(P.revenue)) * 100 : null
    const grossMargin = L?.revenue && L?.grossProfit ? (L.grossProfit / L.revenue) * 100 : null
    const opMargin = L?.revenue && L?.operatingIncome ? (L.operatingIncome / L.revenue) * 100 : null
    const netMargin = L?.revenue && L?.netIncome ? (L.netIncome / L.revenue) * 100 : null
    const pe = quote?.price && L?.eps && L.eps > 0 ? quote.price / L.eps : null

    // Forward KGV: Preis / Consensus-EPS der nächsten beiden Prognose-Jahre über dem letzten Ist-Jahr.
    // Wenn nur ein Jahr verfügbar ist, fallback auf einzelne Anzeige.
    const lastIncomeYear = L?.period ? parseInt(L.period, 10) : 0
    const futureEps = estimates
      .filter(e => e.year > lastIncomeYear && e.eps.avg !== null && (e.eps.avg as number) > 0)
      .slice(0, 2)
    const [nextEst, nextNextEst] = futureEps
    const fwdPe = (eps: number | null | undefined) =>
      quote?.price && eps && eps > 0 ? quote.price / eps : null
    const fwdPe1 = fwdPe(nextEst?.eps.avg)
    const fwdPe2 = fwdPe(nextNextEst?.eps.avg)
    const fwd = (v: number | null) => (v ? v.toFixed(1).replace('.', ',') : null)

    let forwardKgvLabel = 'Forward KGV'
    let forwardKgvValue = '–'
    if (nextEst && nextNextEst && fwdPe1 && fwdPe2) {
      forwardKgvLabel = `Forward KGV (${nextEst.year}e | ${nextNextEst.year}e)`
      forwardKgvValue = `${fwd(fwdPe1)} | ${fwd(fwdPe2)}`
    } else if (nextEst && fwdPe1) {
      forwardKgvLabel = `Forward KGV (${nextEst.year}e)`
      forwardKgvValue = fwd(fwdPe1) || '–'
    }

    const items = [
      { label: 'KGV (P/E)', value: pe ? pe.toFixed(1).replace('.', ',') : '–' },
      { label: forwardKgvLabel, value: forwardKgvValue },
      { label: 'Umsatz', value: fmt(L?.revenue || null) },
      { label: 'Nettogewinn', value: fmt(L?.netIncome || null) },
      { label: 'Gewinn/Aktie', value: L?.eps ? `${L.eps.toFixed(2).replace('.', ',')} $` : '–' },
      { label: 'Bruttomarge', value: grossMargin ? `${grossMargin.toFixed(1).replace('.', ',')}%` : '–' },
      { label: 'Op. Marge', value: opMargin ? `${opMargin.toFixed(1).replace('.', ',')}%` : '–' },
      { label: 'Nettomarge', value: netMargin ? `${netMargin.toFixed(1).replace('.', ',')}%` : '–' },
      { label: 'Umsatzwachstum', value: fmtPct(revGrowth), color: revGrowth ?? undefined },
      { label: 'Barmittel', value: fmt(LB?.cash || null) },
      { label: 'Schulden', value: fmt(LB?.totalDebt || LB?.longTermDebt || null) },
      { label: 'Op. Cashflow', value: fmt(LC?.operatingCashFlow || null) },
      { label: 'Free Cashflow', value: fmt(LC?.freeCashFlow || null) },
      { label: 'F&E', value: fmt(L?.researchAndDevelopment || null) },
    ].filter(m => m.value !== '–')

    return { metrics: items, fyLabel: L?.period ? `GJ ${L.period}` : '' }
  }, [income, balance, cashflow, quote, estimates])

  const startAiAnalysis = () => {
    setAiLoading(true)
    fetch(`/api/v1/ai/stock/${ticker}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.analysis) setAiAnalysis(d.analysis)
      })
      .catch(() => {})
      .finally(() => setAiLoading(false))
  }

  const contextValue = {
    ticker,
    profile,
    income,
    balance,
    cashflow,
    financialSource,
    financialNotice,
    news,
    kpis,
    earnings,
    estimates,
    quote,
    aftermarket,
    priceChart,
    fullPriceHistory,
    chartTimeframe,
    setChartTimeframe,
    chartLoading,
    aiAnalysis,
    aiLoading,
    startAiAnalysis,
    loading,
    expandedChart,
    setExpandedChart,
    financialPeriod,
    setFinancialPeriod,
    isPremium,
    userLoading,
    metrics,
    fyLabel,
  }

  return (
    <StockContextProvider value={contextValue}>
    <div className="min-h-screen bg-[#06060e] flex flex-col">
      <StockHeader ticker={ticker} profile={profile} quote={quote} />

      <StockStatsStrip quote={quote} fullPriceHistory={fullPriceHistory} aftermarket={aftermarket} />

      <EarningsBanner earnings={earnings} ticker={ticker} />

      {/* HERO: Price Chart + Key Metrics */}
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <HeroPriceChart
            quote={quote}
            priceChart={priceChart}
            chartTimeframe={chartTimeframe}
            setChartTimeframe={setChartTimeframe}
            chartLoading={chartLoading}
          />
          <KeyMetricsCard metrics={metrics} fyLabel={fyLabel} topNews={news[0] ?? null} />
        </div>
      </div>

      <StockTabs />

      {/* CONTENT */}
      <main className="flex-1 px-6 sm:px-10 py-10 pb-32 overflow-y-auto flex flex-col items-center">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : (
          children
        )}
      </main>

      <ExpandedChartModal state={expandedChart} onClose={() => setExpandedChart(null)} />
    </div>
    </StockContextProvider>
  )
}
