// /analyse/aktien/[ticker] – Fey-Style Fullscreen Stock Page v3
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UnternehmenProfile {
  name: string; ticker: string; cik: string; exchangeName: string
  sector: string; industry: string; fiscalYearEndFormatted: string
  phone: string | null
  address: { street: string; city: string; state: string; zip: string } | null
}

interface Period {
  period: string; revenue: number | null; netIncome: number | null
  grossProfit: number | null; operatingIncome: number | null
  eps: number | null; [key: string]: any
}

interface BalancePeriod {
  period: string; totalAssets: number | null; cash: number | null
  longTermDebt: number | null; totalDebt: number | null
  shareholdersEquity: number | null; [key: string]: any
}

interface CashFlowPeriod {
  period: string; operatingCashFlow: number | null
  capitalExpenditure: number | null; freeCashFlow: number | null
  dividendPerShare: number | null; shareRepurchase: number | null
  [key: string]: any
}

interface NewsArticle {
  id: string; title: string; summary: string; url: string
  sourceName: string; publishedAt: string; category: string
}

interface KPIMetric {
  label: string; unit: string
  data: { period: string; value: number; filingUrl?: string }[]
}

interface EarningsBeatMiss {
  revenue?: { actual: number; priorGuidance: number; beatMiss: 'beat' | 'miss' | 'inline'; diffPct: number }
  eps?: { actual: number; priorGuidance: number; beatMiss: 'beat' | 'miss' | 'inline'; diffPct: number }
  source: string
}

interface EarningsEntry {
  period: string
  fiscalQuarter: number
  fiscalYear: number
  filingDate: string
  periodEndDate: string
  filingUrl: string
  summary: string | null
  highlights: {
    revenue_reported?: number | null
    eps_reported?: number | null
    net_income?: number | null
    revenue_yoy_pct?: number | null
    eps_yoy_pct?: number | null
    guidance_revenue?: number | null
    guidance_eps?: number | null
    sentiment?: 'positiv' | 'negativ' | 'neutral'
  } | null
  beatMiss: EarningsBeatMiss | null
}

type Tab = 'overview' | 'news' | 'financials' | 'earnings' | 'kpis'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number | null): string {
  if (v === null || v === undefined) return '–'
  const a = Math.abs(v)
  if (a >= 1e12) return `${(v / 1e12).toFixed(2).replace('.', ',')} Bio. $`
  if (a >= 1e9) return `${(v / 1e9).toFixed(1).replace('.', ',')} Mrd. $`
  if (a >= 1e6) return `${(v / 1e6).toFixed(0)} Mio. $`
  return `${v.toLocaleString('de-DE')} $`
}

function fmtPct(v: number | null): string {
  if (v === null) return '–'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}%`
}

function timeAgo(d: string): string {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const TT: React.CSSProperties = {
  backgroundColor: 'rgba(6,6,14,0.96)', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px', padding: '10px 14px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
}

// ─── Chart Card ──────────────────────────────────────────────────────────────

function ChartCard({ data, dataKey, label, color, format, className, guidanceValue, guidanceLabel, onExpand }: {
  data: any[]; dataKey: string; label: string; color: string; format?: 'dollar'; className?: string
  guidanceValue?: number | null; guidanceLabel?: string; onExpand?: () => void
}) {
  let vals = data.filter(d => d[dataKey] !== null && d[dataKey] !== undefined && d[dataKey] !== 0)
  if (vals.length === 0) return null

  // Guidance als letzten grauen Balken hinzufügen
  if (guidanceValue) {
    const lastPeriod = vals[vals.length - 1]?.period
    const nextYear = lastPeriod ? String(parseInt(lastPeriod) + 1) : 'Guidance'
    vals = [...vals, { period: `${guidanceLabel || nextYear}*`, [dataKey]: guidanceValue, _isGuidance: true }]
  }

  const latest = vals[vals.length - (guidanceValue ? 2 : 1)]?.[dataKey]
  const prev = vals[vals.length - (guidanceValue ? 3 : 2)]?.[dataKey]
  const growth = latest && prev ? ((latest - prev) / Math.abs(prev)) * 100 : null

  // Period label for latest value
  const latestPeriod = vals[vals.length - 1]?.period

  return (
    <div className={`bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5 hover:border-white/[0.06] transition-all group ${onExpand ? 'cursor-pointer' : ''} ${className || ''}`}
      onClick={onExpand}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-[11px] text-white/30 font-medium tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {format === 'dollar' ? `${latest?.toFixed(2).replace('.', ',')} $` : fmt(latest)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            {growth !== null && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                growth >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>{growth >= 0 ? '+' : ''}{growth.toFixed(1)}%</span>
            )}
            {onExpand && (
              <svg className="w-3.5 h-3.5 text-white/0 group-hover:text-white/25 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </div>
          {latestPeriod && <span className="text-[9px] text-white/15">GJ {latestPeriod}</span>}
        </div>
      </div>
      <div className="h-40 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={vals} margin={{ top: 4, right: 2, bottom: 0, left: 2 }} barCategoryGap={vals.length > 8 ? '15%' : '20%'}>
            <XAxis
              dataKey="period"
              tick={{ fontSize: vals.length > 8 ? 8 : 9, fill: 'rgba(255,255,255,0.18)' }}
              axisLine={false} tickLine={false}
              interval={vals.length > 12 ? 1 : 0}
            />
            <YAxis hide />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={({ active, payload, label: l }) => {
              if (!active || !payload?.length) return null
              const v = payload[0].value as number
              const isG = payload[0]?.payload?._isGuidance
              return (<div style={TT}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                  {l} {isG && <span style={{ color: 'rgba(255,255,255,0.15)' }}>Guidance</span>}
                </p>
                <p style={{ color: isG ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: '15px', fontWeight: 700 }}>
                  {format === 'dollar' ? `${v.toFixed(2).replace('.', ',')} $` : fmt(v)}
                </p>
                {isG && <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '9px', marginTop: '2px' }}>Unternehmens-Prognose</p>}
              </div>)
            }} />
            <Bar
              dataKey={dataKey}
              fill={color}
              opacity={0.75}
              radius={[3, 3, 0, 0]}
              // Guidance Bars grau darstellen
              shape={(props: any) => {
                const { x, y, width, height, payload } = props
                const isGuidance = payload?._isGuidance
                return (
                  <rect
                    x={x} y={y} width={width} height={height}
                    rx={3} ry={3}
                    fill={isGuidance ? 'rgba(255,255,255,0.08)' : color}
                    opacity={isGuidance ? 1 : 0.75}
                    stroke={isGuidance ? 'rgba(255,255,255,0.12)' : 'none'}
                    strokeWidth={isGuidance ? 1 : 0}
                    strokeDasharray={isGuidance ? '3 3' : 'none'}
                  />
                )
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function FeyStockPage() {
  const params = useParams()
  const router = useRouter()
  const ticker = (params.ticker as string)?.toUpperCase() || 'AAPL'

  const [tab, setTab] = useState<Tab>('overview')
  const [profile, setProfile] = useState<UnternehmenProfile | null>(null)
  const [income, setIncome] = useState<Period[]>([])
  const [balance, setBalance] = useState<BalancePeriod[]>([])
  const [cashflow, setCashflow] = useState<CashFlowPeriod[]>([])
  const [news, setNews] = useState<NewsArticle[]>([])
  const [kpis, setKpis] = useState<Record<string, KPIMetric>>({})
  const [earnings, setEarnings] = useState<EarningsEntry[]>([])
  const [quote, setQuote] = useState<{ price: number; change: number; changePercent: number; marketCap?: number; source: string } | null>(null)
  const [priceChart, setPriceChart] = useState<{ date: string; price: number }[]>([])
  const [chartTimeframe, setChartTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'>('1Y')
  const [chartLoading, setChartLoading] = useState(false)
  const [fullPriceHistory, setFullPriceHistory] = useState<{ date: string; price: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<{ ticker: string; name: string; exchange: string }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const [expandedChart, setExpandedChart] = useState<{ data: any[]; dataKey: string; label: string; color: string; format?: 'dollar' } | null>(null)
  const [financialPeriod, setFinancialPeriod] = useState<'annual' | 'quarterly'>('annual')

  // Cmd+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setSearch('')
        setSearchResults([])
        setSelectedIdx(0)
        setTimeout(() => searchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Live search with our own API
  useEffect(() => {
    if (!search || search.length < 1) { setSearchResults([]); return }
    const timeout = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/v1/companies?search=${encodeURIComponent(search)}&pageSize=8`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.data || [])
          setSelectedIdx(0)
        }
      } catch { /* ignore */ }
      setSearchLoading(false)
    }, 150)
    return () => clearTimeout(timeout)
  }, [search])

  // Fetch all data
  useEffect(() => {
    setLoading(true)
    setTab('overview')
    setQuote(null)
    Promise.all([
      fetch(`/api/v1/company/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/financials/income-statement/${ticker}?years=10`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/financials/balance-sheet/${ticker}?years=10`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/financials/cash-flow/${ticker}?years=10`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/news/stock/${ticker}?limit=20`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/kpis/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/earnings/${ticker}?limit=12`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/quotes/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([p, inc, bal, cf, n, k, e, q]) => {
      if (p && !p.error) setProfile(p)
      if (inc?.data) setIncome(inc.data)
      if (bal?.data) setBalance(bal.data)
      if (cf?.data) setCashflow(cf.data)
      if (n?.articles) setNews(n.articles)
      if (k?.metrics) setKpis(k.metrics)
      if (e?.earnings) setEarnings(e.earnings)
      if (q?.price) setQuote({ price: q.price, change: q.change, changePercent: q.changePercent, marketCap: q.marketCap, source: q.source })
    }).finally(() => setLoading(false))
  }, [ticker])

  // Auto-refresh quote every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/v1/quotes/${ticker}`)
        .then(r => r.ok ? r.json() : null)
        .then(q => { if (q?.price) setQuote({ price: q.price, change: q.change, changePercent: q.changePercent, marketCap: q.marketCap, source: q.source }) })
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [ticker])

  // Fetch full historical price data and filter by timeframe
  useEffect(() => {
    setChartLoading(true)
    fetch(`/api/historical/${ticker}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.historical) {
          const sorted = [...d.historical]
            .sort((a: any, b: any) => a.date.localeCompare(b.date))
            .map((h: any) => ({ date: h.date, price: h.close }))
          setFullPriceHistory(sorted)
        }
      })
      .catch(() => {})
      .finally(() => setChartLoading(false))
  }, [ticker])

  useEffect(() => {
    if (fullPriceHistory.length === 0) return
    const now = new Date()
    const cutoff = new Date()
    switch (chartTimeframe) {
      case '1D': cutoff.setDate(now.getDate() - 1); break
      case '1W': cutoff.setDate(now.getDate() - 7); break
      case '1M': cutoff.setMonth(now.getMonth() - 1); break
      case '3M': cutoff.setMonth(now.getMonth() - 3); break
      case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break
      case '5Y': cutoff.setFullYear(now.getFullYear() - 5); break
    }
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const filtered = fullPriceHistory.filter(p => p.date >= cutoffStr)
    setPriceChart(filtered.length > 0 ? filtered : fullPriceHistory.slice(-30))
  }, [fullPriceHistory, chartTimeframe])

  const L = income[income.length - 1]
  const P = income[income.length - 2]
  const LB = balance[balance.length - 1]
  const LC = cashflow[cashflow.length - 1]

  const revGrowth = L?.revenue && P?.revenue ? ((L.revenue - P.revenue) / Math.abs(P.revenue)) * 100 : null
  const grossMargin = L?.revenue && L?.grossProfit ? (L.grossProfit / L.revenue) * 100 : null
  const opMargin = L?.revenue && L?.operatingIncome ? (L.operatingIncome / L.revenue) * 100 : null
  const netMargin = L?.revenue && L?.netIncome ? (L.netIncome / L.revenue) * 100 : null

  const fyLabel = L?.period ? `GJ ${L.period}` : ''
  const pe = quote?.price && L?.eps && L.eps > 0 ? quote.price / L.eps : null
  const metrics = [
    { label: 'Marktkapitalisierung', value: quote?.marketCap ? fmt(quote.marketCap) : '–' },
    { label: 'KGV (P/E)', value: pe ? pe.toFixed(1).replace('.', ',') : '–' },
    { label: 'Umsatz', value: fmt(L?.revenue || null) },
    { label: 'Nettogewinn', value: fmt(L?.netIncome || null) },
    { label: 'Gewinn/Aktie', value: L?.eps ? `${L.eps.toFixed(2).replace('.', ',')} $` : '–' },
    { label: 'Bruttomarge', value: grossMargin ? `${grossMargin.toFixed(1).replace('.', ',')}%` : '–' },
    { label: 'Op. Marge', value: opMargin ? `${opMargin.toFixed(1).replace('.', ',')}%` : '–' },
    { label: 'Nettomarge', value: netMargin ? `${netMargin.toFixed(1).replace('.', ',')}%` : '–' },
    { label: 'Umsatzwachstum', value: fmtPct(revGrowth), color: revGrowth },
    { label: 'Barmittel', value: fmt(LB?.cash || null) },
    { label: 'Schulden', value: fmt(LB?.totalDebt || LB?.longTermDebt || null) },
    { label: 'Op. Cashflow', value: fmt(LC?.operatingCashFlow || null) },
    { label: 'Free Cashflow', value: fmt(LC?.freeCashFlow || null) },
    { label: 'F&E', value: fmt(L?.researchAndDevelopment || null) },
  ].filter(m => m.value !== '–')

  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col">
      {/* ── HEADER ──────────────────────────────────────────── */}
      <header className="px-6 sm:px-10 py-4 flex items-center justify-between border-b border-white/[0.03] max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          {/* Ticker Logo */}
          <img
            src={`/api/v1/logo/${ticker}?size=80`}
            alt={ticker}
            className="w-10 h-10 rounded-xl bg-white/[0.06] object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-lg font-bold text-white tracking-tight">{ticker}</h1>
              <span className="text-[11px] text-white/20 font-medium">{profile?.exchangeName}</span>
            </div>
            <p className="text-[12px] text-white/30">{profile?.name}{profile?.industry ? ` · ${profile.industry}` : ''}</p>
          </div>
        </div>
        {/* Price + Quick Actions */}
        <div className="flex items-center gap-4">
          {quote && (
            <div className="text-right">
              <p className="text-xl font-bold text-white tabular-nums">{quote.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</p>
              <div className="flex items-center justify-end gap-1.5">
                <span className={`text-[12px] font-semibold tabular-nums ${quote.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2).replace('.', ',')}%
                </span>
                <span className={`text-[11px] tabular-nums ${quote.changePercent >= 0 ? 'text-emerald-400/50' : 'text-red-400/50'}`}>
                  {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          )}
          <Link href={`/analyse/dividenden/${ticker}`}
            className="px-3 py-1.5 text-[11px] text-white/25 bg-white/[0.03] border border-white/[0.05] rounded-lg hover:bg-white/[0.06] hover:text-white/50 transition-all">
            Dividenden
          </Link>
        </div>
      </header>

      {/* ── EARNINGS BANNER (letzte 7 Tage) ─────────────── */}
      {(() => {
        const recentEarning = earnings.find(e => {
          const age = Date.now() - new Date(e.filingDate).getTime()
          return age < 7 * 24 * 60 * 60 * 1000
        })
        if (!recentEarning) return null

        const h = recentEarning.highlights
        const bm = recentEarning.beatMiss
        const isBeat = bm?.revenue?.beatMiss === 'beat'
        const isMiss = bm?.revenue?.beatMiss === 'miss'
        const daysAgo = Math.floor((Date.now() - new Date(recentEarning.filingDate).getTime()) / (24 * 60 * 60 * 1000))
        const timeLabel = daysAgo === 0 ? 'Heute' : daysAgo === 1 ? 'Gestern' : `Vor ${daysAgo} Tagen`

        return (
          <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 pt-4">
            <button
              onClick={() => setTab('earnings')}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all hover:scale-[1.005] ${
                isBeat ? 'bg-emerald-500/[0.04] border-emerald-500/10 hover:border-emerald-500/20'
                : isMiss ? 'bg-red-500/[0.04] border-red-500/10 hover:border-red-500/20'
                : 'bg-blue-500/[0.04] border-blue-500/10 hover:border-blue-500/20'
              }`}
            >
              {/* Pulse dot */}
              <div className="relative flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${isBeat ? 'bg-emerald-400' : isMiss ? 'bg-red-400' : 'bg-blue-400'}`} />
                <div className={`absolute inset-0 w-2 h-2 rounded-full animate-ping ${isBeat ? 'bg-emerald-400' : isMiss ? 'bg-red-400' : 'bg-blue-400'}`} />
              </div>

              <div className="flex-1 text-left">
                <p className="text-[13px] font-semibold text-white">
                  Neue Quartalszahlen: {recentEarning.period}
                  <span className="text-white/20 font-normal ml-2">{timeLabel}</span>
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">
                  {h?.revenue_reported ? `Umsatz: ${fmt(h.revenue_reported * 1e6)}` : ''}
                  {h?.revenue_reported && h?.eps_reported ? ' · ' : ''}
                  {h?.eps_reported ? `EPS: ${h.eps_reported.toFixed(2).replace('.', ',')} $` : ''}
                  {bm?.revenue ? ` · ${bm.revenue.diffPct >= 0 ? '+' : ''}${bm.revenue.diffPct.toFixed(1)}% vs. eigene Prognose` : ''}
                </p>
              </div>

              {/* Badge */}
              {(isBeat || isMiss) && (
                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg flex-shrink-0 ${
                  isBeat ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {isBeat ? 'Prognose übertroffen' : 'Prognose verfehlt'}
                </span>
              )}

              <svg className="w-4 h-4 text-white/15 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )
      })()}

      {/* ── HERO: Price Chart + Key Metrics ────────────────── */}
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Price Chart (Hero – 2 cols) */}
          <div className="lg:col-span-2 bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6">
            {(() => {
              // Performance berechnen: Zeitraum-abhängig (nicht immer Tagesänderung)
              const firstPrice = priceChart.length > 0 ? priceChart[0].price : null
              const lastPrice = priceChart.length > 0 ? priceChart[priceChart.length - 1].price : null
              const periodChange = firstPrice && lastPrice ? lastPrice - firstPrice : null
              const periodChangePct = firstPrice && periodChange ? (periodChange / firstPrice) * 100 : null
              // Für 1D: Tagesänderung aus Quote verwenden
              const displayChange = chartTimeframe === '1D' ? quote?.change ?? periodChange : periodChange
              const displayChangePct = chartTimeframe === '1D' ? quote?.changePercent ?? periodChangePct : periodChangePct
              const isPositive = (displayChangePct ?? 0) >= 0
              const tfLabels: Record<string, string> = { '1D': 'Heute', '1W': '1 Woche', '1M': '1 Monat', '3M': '3 Monate', '1Y': '1 Jahr', '5Y': '5 Jahre' }

              return <>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {quote ? (
                      <>
                        <p className="text-3xl font-bold text-white tabular-nums">{quote.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</p>
                        <div className="flex items-center gap-2 mt-1">
                          {displayChangePct !== null && (
                            <span className={`text-[13px] font-semibold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                              {displayChangePct >= 0 ? '+' : ''}{displayChangePct.toFixed(2).replace('.', ',')}%
                            </span>
                          )}
                          {displayChange !== null && (
                            <span className={`text-[12px] tabular-nums ${isPositive ? 'text-emerald-400/50' : 'text-red-400/50'}`}>
                              {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2).replace('.', ',')} $
                            </span>
                          )}
                          <span className="text-[10px] text-white/15">{tfLabels[chartTimeframe]}</span>
                        </div>
                      </>
                    ) : (
                      <div className="h-12 flex items-center"><div className="w-32 h-6 bg-white/[0.04] rounded animate-pulse" /></div>
                    )}
                  </div>
                  {/* Timeframe Buttons */}
                  <div className="flex gap-1">
                    {(['1D', '1W', '1M', '3M', '1Y', '5Y'] as const).map(tf => (
                      <button key={tf} onClick={() => setChartTimeframe(tf)}
                        className={`px-2.5 py-1 text-[10px] font-medium rounded-lg transition-all ${
                          chartTimeframe === tf ? 'bg-white/[0.08] text-white' : 'text-white/20 hover:text-white/40 hover:bg-white/[0.03]'
                        }`}>{tf}</button>
                    ))}
                  </div>
                </div>
                <div className="h-52 relative">
                  {chartLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
                    </div>
                  )}
                  {priceChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={priceChart} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                        <defs>
                          <linearGradient id="heroPriceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0.15} />
                            <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.12)' }} axisLine={false} tickLine={false}
                          tickFormatter={(d: string) => {
                            const date = new Date(d)
                            if (chartTimeframe === '1D') return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                            if (chartTimeframe === '1W') return date.toLocaleDateString('de-DE', { weekday: 'short' })
                            if (['1M', '3M'].includes(chartTimeframe)) return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
                            return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
                          }}
                          interval={Math.max(0, Math.floor(priceChart.length / 8))}
                        />
                        <YAxis hide domain={['dataMin * 0.98', 'dataMax * 1.02']} />
                        <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const v = payload[0].value as number
                          const d = new Date(payload[0].payload.date)
                          const sinceStart = firstPrice ? ((v - firstPrice) / firstPrice) * 100 : null
                          return (<div style={TT}>
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>
                              {d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p style={{ color: '#fff', fontSize: '17px', fontWeight: 700, marginTop: '2px' }}>
                              {v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                            </p>
                            {sinceStart !== null && (
                              <p style={{ color: sinceStart >= 0 ? '#4ade80' : '#f87171', fontSize: '11px', marginTop: '2px' }}>
                                {sinceStart >= 0 ? '+' : ''}{sinceStart.toFixed(2)}% seit {tfLabels[chartTimeframe]}
                              </p>
                            )}
                          </div>)
                        }} />
                        <Area type="monotone" dataKey="price" stroke={isPositive ? '#22c55e' : '#ef4444'}
                          strokeWidth={1.5} fill="url(#heroPriceGrad)" dot={false} activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : !chartLoading ? (
                    <div className="h-full flex items-center justify-center"><p className="text-white/10 text-[12px]">Keine Kursdaten</p></div>
                  ) : null}
                </div>
              </>
            })()}
          </div>

          {/* Key Metrics Grid (1 col) */}
          <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-[11px] text-white/25 font-medium">Kennzahlen</p>
              {fyLabel && <p className="text-[10px] text-white/12">{fyLabel}</p>}
            </div>
            <div className="space-y-3">
              {metrics.slice(0, 10).map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-[12px] text-white/25">{m.label}</span>
                  <span className={`text-[13px] font-semibold ${
                    'color' in m && m.color !== null && m.color !== undefined
                      ? (m.color as number) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      : 'text-white/80'
                  }`}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* News Snippet in Key Metrics */}
            {news.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <p className="text-[10px] text-white/15 uppercase tracking-wider mb-2">Aktuell</p>
                <a href={news[0].url} target="_blank" rel="noopener noreferrer" className="block group">
                  <p className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors line-clamp-2 leading-relaxed">
                    {news[0].title}
                  </p>
                  <p className="text-[9px] text-white/12 mt-1">{news[0].sourceName} · {timeAgo(news[0].publishedAt)}</p>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────── */}
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 border-b border-white/[0.03]">
        <div className="flex">
          {([
            { key: 'overview', label: 'Overview' },
            { key: 'news', label: 'News' },
            { key: 'financials', label: 'Financials' },
            { key: 'earnings', label: 'Earnings' },
            { key: 'kpis', label: 'KPIs' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-[13px] font-medium relative transition-colors ${
                tab === t.key ? 'text-white' : 'text-white/20 hover:text-white/40'
              }`}>
              {t.label}
              {tab === t.key && <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-white rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────── */}
      <main className="flex-1 px-6 sm:px-10 py-8 pb-24 overflow-y-auto flex flex-col items-center">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : tab === 'overview' ? (
          <div className="w-full max-w-6xl space-y-4">
            {/* Row 1: Net Income + EPS + Gross Profit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ChartCard data={income} dataKey="netIncome" label="Nettogewinn" color="#4ade80" />
              <ChartCard data={income} dataKey="eps" label="Gewinn je Aktie" color="#fbbf24" format="dollar" />
              <ChartCard data={income} dataKey="grossProfit" label="Bruttogewinn" color="#60a5fa" />
            </div>

            {/* Row 2: Cash Flow + Balance Sheet */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ChartCard data={cashflow} dataKey="operatingCashFlow" label="Operativer Cashflow" color="#22d3ee" />
              <ChartCard data={cashflow} dataKey="freeCashFlow" label="Free Cashflow" color="#f97316" />
              <ChartCard data={balance} dataKey="cash" label="Barmittel" color="#34d399" />
            </div>

            {/* Row 3: News + Unternehmen Info */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Aktuelle News</p>
                {news.length > 0 ? (
                  <div className="space-y-1.5">
                    {news.slice(0, 5).map(a => (
                      <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl bg-[#0c0c16] border border-white/[0.03] hover:border-white/[0.08] transition-all group">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="text-[13px] text-white/65 group-hover:text-white/90 transition-colors truncate">{a.title}</p>
                          <p className="text-[11px] text-white/15 mt-0.5">{a.sourceName} · {timeAgo(a.publishedAt)}</p>
                        </div>
                        {a.category !== 'general' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] text-white/15">{a.category}</span>
                        )}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 rounded-xl bg-[#0c0c16] border border-white/[0.03] text-center">
                    <p className="text-[13px] text-white/15">Keine aktuellen News</p>
                  </div>
                )}
              </div>
              {profile && (
                <div className="lg:col-span-2">
                  <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Unternehmen</p>
                  <div className="bg-[#0c0c16] border border-white/[0.03] rounded-xl p-5 space-y-3.5">
                    {[
                      ['Name', profile.name], ['Börse', profile.exchangeName],
                      ['Sektor', profile.sector], ['Branche', profile.industry],
                      ['GJ Ende', profile.fiscalYearEndFormatted], ['CIK', profile.cik],
                      ...(profile.phone ? [['Telefon', profile.phone]] : []),
                      ...(profile.address ? [['Sitz', `${profile.address.city}, ${profile.address.state}`]] : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-[12px] text-white/15">{k}</span>
                        <span className="text-[12px] text-white/50 text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        ) : tab === 'news' ? (
          news.length === 0 ? (
            <div className="w-full max-w-3xl text-center py-28">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                </svg>
              </div>
              <p className="text-white/25 text-[14px]">Keine News für {ticker}</p>
              <p className="text-white/10 text-[12px] mt-1">News werden alle 15 Min. aus 14 Quellen aktualisiert</p>
            </div>
          ) : (
            <div className="w-full max-w-3xl space-y-3">
              {/* Featured News Card */}
              {news[0] && (
                <a href={news[0].url} target="_blank" rel="noopener noreferrer"
                  className="block p-6 rounded-2xl bg-[#0c0c16] border border-white/[0.06] hover:border-white/[0.1] transition-all group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium text-white/20 bg-white/[0.04] px-2 py-0.5 rounded-md">{news[0].sourceName}</span>
                    <span className="text-[10px] text-white/10">{timeAgo(news[0].publishedAt)}</span>
                    {news[0].category !== 'general' && (
                      <span className="text-[9px] text-white/15 bg-white/[0.03] px-1.5 py-0.5 rounded">{news[0].category}</span>
                    )}
                  </div>
                  <p className="text-[16px] text-white/80 group-hover:text-white transition-colors font-medium leading-snug">{news[0].title}</p>
                  {news[0].summary && <p className="text-[13px] text-white/25 mt-2 leading-relaxed line-clamp-3">{news[0].summary}</p>}
                </a>
              )}

              {/* Rest of news */}
              {news.slice(1).map(a => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 rounded-xl bg-[#0c0c16] border border-white/[0.03] hover:border-white/[0.06] transition-all group">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-[13px] text-white/65 group-hover:text-white/90 transition-colors truncate">{a.title}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] text-white/15">{a.sourceName}</span>
                      <span className="text-[10px] text-white/8">{timeAgo(a.publishedAt)}</span>
                    </div>
                  </div>
                  {a.category !== 'general' && (
                    <span className="text-[9px] text-white/12 bg-white/[0.03] px-1.5 py-0.5 rounded flex-shrink-0">{a.category}</span>
                  )}
                </a>
              ))}
            </div>
          )

        ) : tab === 'financials' ? (
          <div className="w-full max-w-6xl space-y-6">
            {/* Period Toggle */}
            <div className="flex items-center gap-1 bg-white/[0.02] rounded-lg p-0.5 w-fit">
              <button onClick={() => setFinancialPeriod('annual')}
                className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-colors ${financialPeriod === 'annual' ? 'bg-white/[0.08] text-white' : 'text-white/25 hover:text-white/40'}`}>
                Jährlich
              </button>
              <button onClick={() => setFinancialPeriod('quarterly')}
                className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-colors ${financialPeriod === 'quarterly' ? 'bg-white/[0.08] text-white' : 'text-white/25 hover:text-white/40'}`}>
                Quartalsweise
              </button>
            </div>

            {/* Guidance Revenue extrahieren */}
            {(() => {
              const guidanceRev = kpis['guidance_revenue']?.data?.slice(-1)[0]?.value
              const guidanceRevLabel = kpis['guidance_revenue']?.data?.slice(-1)[0]?.period
              const segmentKpis = Object.entries(kpis).filter(([k]) =>
                !k.startsWith('guidance_') && !k.startsWith('gaap_') && k !== 'total_revenue'
              )

              return (
                <>
                  {/* Quartalsansicht: KPI-basiert */}
                  {financialPeriod === 'quarterly' && Object.keys(kpis).length > 0 ? (
                    <div>
                      <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Quartalszahlen (aus Earnings Reports)</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Object.entries(kpis)
                          .filter(([k]) => !k.startsWith('guidance_'))
                          .map(([key, metric]) => {
                            const chartData = metric.data.map((d: any) => ({
                              period: d.period,
                              [key]: metric.unit === 'millions' ? d.value * 1e6 : d.value,
                            }))
                            // Guidance für dieses Segment?
                            const gKey = `guidance_${key.replace('total_', '')}`
                            const gVal = kpis[gKey]?.data?.slice(-1)[0]
                            return <ChartCard
                              key={key}
                              data={chartData}
                              dataKey={key}
                              label={metric.label}
                              color="#22c55e"
                              guidanceValue={gVal ? (metric.unit === 'millions' ? gVal.value * 1e6 : gVal.value) : null}
                              guidanceLabel={gVal?.period}
                              onExpand={() => setExpandedChart({ data: chartData, dataKey: key, label: metric.label, color: '#22c55e' })}
                            />
                          })}
                      </div>
                      {guidanceRev && (
                        <p className="text-[10px] text-white/15 mt-3">
                          Guidance: Revenue {guidanceRevLabel} = {fmt(guidanceRev * 1e6)}
                          {kpis['guidance_gross_margin'] && ` · Gross Margin ${kpis['guidance_gross_margin'].data.slice(-1)[0]?.value}%`}
                        </p>
                      )}
                    </div>
                  ) : financialPeriod === 'quarterly' ? (
                    <div className="text-center py-20">
                      <p className="text-white/20 text-[14px]">Keine Quartalsdaten für {ticker}</p>
                      <p className="text-white/10 text-[12px] mt-1">Quartalsdaten verfügbar für: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX</p>
                    </div>
                  ) : null}

                  {/* Jahresansicht: SEC XBRL */}
                  {financialPeriod === 'annual' && (<>
                  <div>
                    <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Gewinn- & Verlustrechnung</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <ChartCard data={income} dataKey="revenue" label="Umsatz" color="#fff"
                        guidanceValue={financialPeriod === 'annual' ? null : (guidanceRev ? guidanceRev * 1e6 : null)}
                        guidanceLabel={guidanceRevLabel || undefined}
                        onExpand={() => setExpandedChart({ data: income, dataKey: 'revenue', label: 'Umsatz', color: '#fff' })} />
                      <ChartCard data={income} dataKey="netIncome" label="Nettogewinn" color="#4ade80"
                        onExpand={() => setExpandedChart({ data: income, dataKey: 'netIncome', label: 'Nettogewinn', color: '#4ade80' })} />
                      <ChartCard data={income} dataKey="grossProfit" label="Bruttogewinn" color="#60a5fa"
                        onExpand={() => setExpandedChart({ data: income, dataKey: 'grossProfit', label: 'Bruttogewinn', color: '#60a5fa' })} />
                      <ChartCard data={income} dataKey="operatingIncome" label="Operatives Ergebnis" color="#c084fc"
                        onExpand={() => setExpandedChart({ data: income, dataKey: 'operatingIncome', label: 'Operatives Ergebnis', color: '#c084fc' })} />
                      <ChartCard data={income} dataKey="eps" label="Gewinn je Aktie" color="#fbbf24" format="dollar"
                        onExpand={() => setExpandedChart({ data: income, dataKey: 'eps', label: 'Gewinn je Aktie', color: '#fbbf24', format: 'dollar' })} />
                      <ChartCard data={income} dataKey="researchAndDevelopment" label="F&E Aufwand" color="#f472b6"
                        onExpand={() => setExpandedChart({ data: income, dataKey: 'researchAndDevelopment', label: 'F&E Aufwand', color: '#f472b6' })} />
                    </div>
                  </div>

                  {/* Segment Revenue (wenn vorhanden) */}
                  {segmentKpis.length > 0 && (
                    <div>
                      <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Umsatz nach Segmenten</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {segmentKpis.map(([key, metric]) => {
                          // KPI Daten in ChartCard Format umwandeln
                          const chartData = metric.data.map((d: any) => ({
                            period: d.period.replace('Q1 ', '').replace('Q2 ', '').replace('Q3 ', '').replace('Q4 ', ''),
                            [key]: metric.unit === 'millions' ? d.value * 1e6 : d.value,
                          }))
                          return <ChartCard key={key} data={chartData} dataKey={key} label={metric.label} color="#22c55e" />
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cash Flow */}
                  <div>
                    <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Cashflow</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <ChartCard data={cashflow} dataKey="operatingCashFlow" label="Operativer Cashflow" color="#22d3ee" />
                      <ChartCard data={cashflow} dataKey="freeCashFlow" label="Free Cashflow" color="#f97316" />
                      <ChartCard data={cashflow} dataKey="shareRepurchase" label="Aktienrückkäufe" color="#e879f9" />
                    </div>
                  </div>

                  {/* Bilanz */}
                  <div>
                    <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Bilanz</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      <ChartCard data={balance} dataKey="totalAssets" label="Bilanzsumme" color="#a78bfa" />
                      <ChartCard data={balance} dataKey="cash" label="Barmittel" color="#34d399" />
                      <ChartCard data={balance} dataKey="longTermDebt" label="Langfristige Schulden" color="#fb923c" />
                      <ChartCard data={balance} dataKey="shareholdersEquity" label="Eigenkapital" color="#38bdf8" />
                    </div>
                  </div>
                  </>)}
                </>
              )
            })()}
          </div>

        ) : tab === 'earnings' ? (
          earnings.length === 0 ? (
            <div className="text-center py-28">
              <p className="text-white/20 text-sm">Keine Earnings-Daten für {ticker}</p>
              <p className="text-white/8 text-xs mt-1">Quartalszahlen werden aus SEC 8-K Press Releases extrahiert</p>
            </div>
          ) : (
            <div className="w-full max-w-4xl space-y-4">
              {earnings.map((e) => {
                const h = e.highlights
                const bm = e.beatMiss
                // Beat/Miss: nur aus echtem Guidance-Vergleich, nie geraten
                const hasBeat = bm?.revenue?.beatMiss === 'beat' || bm?.eps?.beatMiss === 'beat'
                const hasMiss = bm?.revenue?.beatMiss === 'miss' || bm?.eps?.beatMiss === 'miss'
                const beatMissLabel = hasBeat ? 'Eigene Prognose übertroffen' : hasMiss ? 'Eigene Prognose verfehlt' : null
                const beatMissStyle = hasBeat ? 'bg-emerald-500/10 text-emerald-400' : hasMiss ? 'bg-red-500/10 text-red-400' : ''

                return (
                  <div key={e.period} className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden hover:border-white/[0.06] transition-all">
                    {/* Header */}
                    <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.03]">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          h?.sentiment === 'positiv' ? 'bg-emerald-500/10' : h?.sentiment === 'negativ' ? 'bg-red-500/10' : 'bg-blue-500/10'
                        }`}>
                          <svg className={`w-4 h-4 ${h?.sentiment === 'positiv' ? 'text-emerald-400' : h?.sentiment === 'negativ' ? 'text-red-400' : 'text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {h?.sentiment === 'positiv'
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                              : h?.sentiment === 'negativ'
                              ? <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
                              : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                            }
                          </svg>
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold text-white">{e.period}</p>
                          <p className="text-[11px] text-white/25">
                            {new Date(e.filingDate).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {beatMissLabel && (
                          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg ${beatMissStyle}`}>
                            {beatMissLabel}
                          </span>
                        )}
                        {e.filingUrl && (
                          <a href={e.filingUrl} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-white/15 hover:text-white/40 px-2 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                            SEC Filing
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Beat/Miss Detail Row (nur wenn berechnet aus Guidance) */}
                    {bm && (bm.revenue || bm.eps) && (
                      <div className="px-6 py-2.5 flex items-center gap-5 border-b border-white/[0.03] bg-white/[0.015]">
                        {bm.revenue && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-white/15 uppercase">Umsatz vs. Prognose:</span>
                            <span className="text-[11px] font-medium text-white/50">
                              {fmt(bm.revenue.actual * 1e6)} vs. {fmt(bm.revenue.priorGuidance * 1e6)}
                            </span>
                            <span className={`text-[10px] font-bold ${bm.revenue.beatMiss === 'beat' ? 'text-emerald-400' : bm.revenue.beatMiss === 'miss' ? 'text-red-400' : 'text-white/30'}`}>
                              {bm.revenue.diffPct >= 0 ? '+' : ''}{bm.revenue.diffPct.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {bm.eps && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-white/15 uppercase">EPS vs. Prognose:</span>
                            <span className="text-[11px] font-medium text-white/50">
                              {bm.eps.actual.toFixed(2).replace('.', ',')} $ vs. {bm.eps.priorGuidance.toFixed(2).replace('.', ',')} $
                            </span>
                            <span className={`text-[10px] font-bold ${bm.eps.beatMiss === 'beat' ? 'text-emerald-400' : bm.eps.beatMiss === 'miss' ? 'text-red-400' : 'text-white/30'}`}>
                              {bm.eps.diffPct >= 0 ? '+' : ''}{bm.eps.diffPct.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key Metrics Row */}
                    {h && (h.revenue_reported || h.eps_reported || h.net_income) && (
                      <div className="px-6 py-3 flex flex-wrap items-center gap-6 border-b border-white/[0.03] bg-white/[0.01]">
                        {h.revenue_reported && (
                          <div>
                            <p className="text-[9px] text-white/20 uppercase tracking-wider">Umsatz</p>
                            <p className="text-[14px] font-bold text-white">
                              {fmt(h.revenue_reported * 1e6)}
                              {h.revenue_yoy_pct != null && (
                                <span className={`text-[10px] ml-1.5 font-medium ${h.revenue_yoy_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {h.revenue_yoy_pct >= 0 ? '+' : ''}{h.revenue_yoy_pct.toFixed(1)}%
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        {h.eps_reported && (
                          <div>
                            <p className="text-[9px] text-white/20 uppercase tracking-wider">EPS</p>
                            <p className="text-[14px] font-bold text-white">
                              {h.eps_reported.toFixed(2).replace('.', ',')} $
                              {h.eps_yoy_pct != null && (
                                <span className={`text-[10px] ml-1.5 font-medium ${h.eps_yoy_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {h.eps_yoy_pct >= 0 ? '+' : ''}{h.eps_yoy_pct.toFixed(1)}%
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                        {h.net_income && (
                          <div>
                            <p className="text-[9px] text-white/20 uppercase tracking-wider">Nettogewinn</p>
                            <p className="text-[14px] font-bold text-white">{fmt(h.net_income * 1e6)}</p>
                          </div>
                        )}
                        {h.guidance_revenue && !Array.isArray(h.guidance_revenue) && (
                          <div className="ml-auto">
                            <p className="text-[9px] text-white/15 uppercase tracking-wider">Prognose nächstes Q</p>
                            <p className="text-[13px] font-semibold text-white/40">{fmt(Number(h.guidance_revenue) * 1e6)}</p>
                          </div>
                        )}
                        {h.guidance_revenue && Array.isArray(h.guidance_revenue) && (
                          <div className="ml-auto">
                            <p className="text-[9px] text-white/15 uppercase tracking-wider">Prognose nächstes Q</p>
                            <p className="text-[13px] font-semibold text-white/40">{fmt(Number(h.guidance_revenue[0]) * 1e6)} – {fmt(Number(h.guidance_revenue[1]) * 1e6)}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI Summary */}
                    {e.summary ? (
                      <div className="px-6 py-4">
                        <div className="[&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-white/50 [&_h2]:mt-3 [&_h2]:mb-1.5">
                          {e.summary.split('\n').map((line: string, li: number) => {
                            if (line.startsWith('## ')) return <h2 key={li}>{line.replace('## ', '')}</h2>
                            if (line.startsWith('- **')) {
                              const bold = line.match(/- \*\*(.+?)\*\*:?\s*(.*)/)
                              if (bold) return <p key={li} className="text-[12px] text-white/40 leading-relaxed mb-1"><strong className="text-white/55 font-medium">{bold[1]}</strong>{bold[2] ? `: ${bold[2]}` : ''}</p>
                            }
                            if (line.startsWith('- ')) return <p key={li} className="text-[12px] text-white/35 leading-relaxed mb-1 pl-3 border-l border-white/[0.04]">{line.replace('- ', '')}</p>
                            if (line.trim() === '') return null
                            return <p key={li} className="text-[12px] text-white/35 leading-relaxed mb-1">{line}</p>
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="px-6 py-4">
                        <p className="text-[12px] text-white/15 italic">Zusammenfassung wird generiert...</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )

        ) : tab === 'kpis' ? (
          Object.keys(kpis).length === 0 ? (
            <div className="text-center py-28">
              <p className="text-white/20 text-sm">Keine Operating KPIs für {ticker}</p>
              <p className="text-white/8 text-xs mt-1">Verfügbar für AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX, UBER, MA, V</p>
            </div>
          ) : (
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(kpis).map(([key, m]) => {
                const latest = m.data[m.data.length - 1]
                const prev = m.data[m.data.length - 5]
                const yoy = prev ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100 : null
                const unit = m.unit === 'millions' ? 'M' : m.unit === 'billions' ? 'B' : m.unit === 'thousands' ? 'K' : m.unit === 'percent' ? '%' : m.unit === 'dollars' ? '$' : m.unit === 'GWh' ? ' GWh' : ''
                const val = m.unit === 'dollars' ? `$${latest?.value.toFixed(2)}` : m.unit === 'percent' ? `${latest?.value.toFixed(1)}%` : `${latest?.value.toLocaleString('en-US')}${unit}`

                return (
                  <div key={key} className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
                    <div className="flex justify-between mb-1">
                      <p className="text-[11px] text-white/25">{m.label}</p>
                      <div className="flex items-center gap-2">
                        {yoy !== null && <span className={`text-[10px] font-bold ${yoy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%</span>}
                        <span className="text-[10px] text-white/12">{latest?.period}</span>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-white mb-4">{val}</p>
                    <div className="h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={m.data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                          <defs><linearGradient id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient></defs>
                          <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={1.5} fill={`url(#g-${key})`} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : null}
      </main>

      {/* ── CHART EXPAND MODAL ─────────────────────────────── */}
      {expandedChart && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setExpandedChart(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="bg-[#0c0c16] border border-white/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
              <div className="px-6 py-5 flex items-start justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-white">{expandedChart.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {(() => {
                      const vals = expandedChart.data.filter(d => d[expandedChart.dataKey])
                      const v = vals[vals.length - 1]?.[expandedChart.dataKey]
                      return expandedChart.format === 'dollar' ? `${v?.toFixed(2).replace('.', ',')} $` : fmt(v)
                    })()}
                  </p>
                </div>
                <button onClick={() => setExpandedChart(null)} className="p-1.5 rounded-lg hover:bg-white/[0.06]">
                  <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-6 pb-6 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expandedChart.data.filter(d => d[expandedChart.dataKey])} margin={{ top: 10, right: 10, bottom: 20, left: 50 }}>
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} width={50}
                      tickFormatter={v => expandedChart.format === 'dollar' ? `$${v}` : fmt(v).replace(' $', '')} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={({ active, payload, label: l }) => {
                      if (!active || !payload?.length) return null
                      const v = payload[0].value as number
                      return (<div style={TT}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{l}</p>
                        <p style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>
                          {expandedChart.format === 'dollar' ? `${v.toFixed(2).replace('.', ',')} $` : fmt(v)}
                        </p>
                      </div>)
                    }} />
                    <Bar dataKey={expandedChart.dataKey} fill={expandedChart.color} opacity={0.75} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH MODAL (Cmd+K) ─────────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative w-full max-w-xl mx-4 animate-in fade-in slide-in-from-top-4 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-[#111119] border border-white/[0.1] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4">
                <svg className="w-5 h-5 text-white/25 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, (searchResults.length || 8) - 1)) }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
                    if (e.key === 'Enter') {
                      const target = searchResults.length > 0 ? searchResults[selectedIdx]?.ticker : search.trim().toUpperCase()
                      if (target) { router.push(`/analyse/aktien/${target}`); setSearch(''); setSearchOpen(false) }
                    }
                    if (e.key === 'Escape') setSearchOpen(false)
                  }}
                  placeholder="Aktie suchen..."
                  className="flex-1 bg-transparent text-[17px] text-white placeholder:text-white/25 focus:outline-none"
                  autoFocus
                />
                {searchLoading && <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />}
                <kbd className="text-[10px] text-white/15 bg-white/[0.05] px-2 py-1 rounded-lg border border-white/[0.06]">ESC</kbd>
              </div>

              <div className="border-t border-white/[0.05]" />

              {/* Results */}
              <div className="py-2 max-h-[50vh] overflow-y-auto">
                {searchResults.length > 0 ? (
                  <>
                    <p className="text-[10px] text-white/15 uppercase tracking-widest font-medium px-5 py-1.5">Ergebnisse</p>
                    {searchResults.map((r, i) => (
                      <button
                        key={r.ticker}
                        onClick={() => { router.push(`/analyse/aktien/${r.ticker}`); setSearch(''); setSearchOpen(false) }}
                        onMouseEnter={() => setSelectedIdx(i)}
                        className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors ${
                          i === selectedIdx ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-white/40">{r.ticker.slice(0, 2)}</span>
                          </div>
                          <div className="text-left">
                            <p className="text-[13px] font-medium text-white/80">{r.ticker}</p>
                            <p className="text-[11px] text-white/25 truncate max-w-[280px]">{r.name}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-white/15">{r.exchange}</span>
                      </button>
                    ))}
                  </>
                ) : search.length > 0 && !searchLoading ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-[13px] text-white/20">Keine Ergebnisse für "{search}"</p>
                    <p className="text-[11px] text-white/10 mt-1">Drücke Enter um direkt zu {search.toUpperCase()} zu gehen</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] text-white/15 uppercase tracking-widest font-medium px-5 py-1.5">Beliebt</p>
                    {[
                      { t: 'AAPL', n: 'Apple Inc.' }, { t: 'MSFT', n: 'Microsoft Corp.' },
                      { t: 'NVDA', n: 'NVIDIA Corp.' }, { t: 'TSLA', n: 'Tesla, Inc.' },
                      { t: 'GOOGL', n: 'Alphabet Inc.' }, { t: 'AMZN', n: 'Amazon.com' },
                    ].map((item, i) => (
                      <button
                        key={item.t}
                        onClick={() => { router.push(`/analyse/aktien/${item.t}`); setSearch(''); setSearchOpen(false) }}
                        onMouseEnter={() => setSelectedIdx(i)}
                        className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors ${
                          i === selectedIdx ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-white/40">{item.t.slice(0, 2)}</span>
                          </div>
                          <div className="text-left">
                            <p className="text-[13px] font-medium text-white/80">{item.t}</p>
                            <p className="text-[11px] text-white/25">{item.n}</p>
                          </div>
                        </div>
                        {item.t === ticker && <span className="text-[9px] text-white/10 bg-white/[0.04] px-2 py-0.5 rounded-md">Aktuell</span>}
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-5 text-[10px] text-white/15">
                <span className="flex items-center gap-1.5"><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">↑↓</kbd> Navigieren</span>
                <span className="flex items-center gap-1.5"><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">↵</kbd> Öffnen</span>
                <span className="flex items-center gap-1.5 ml-auto"><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">⌘K</kbd> Suche</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING BOTTOM NAV (Fey-Style Pill) ───────────── */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <nav className="flex items-center gap-1 bg-[#141420]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <Link href="/analyse/maerkte" className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-[9px] text-white/25 group-hover:text-white/50">Home</span>
          </Link>
          <Link href="/analyse/kalendar" className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="text-[9px] text-white/25 group-hover:text-white/50">Earnings</span>
          </Link>
          <Link href="/analyse/maerkte" className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-[9px] text-white/25 group-hover:text-white/50">Märkte</span>
          </Link>
          <button onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50) }}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <span className="text-[9px] text-white/25 group-hover:text-white/50">Search</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
