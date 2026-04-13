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

interface CompanyProfile {
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

type Tab = 'overview' | 'news' | 'financials' | 'kpis'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v: number | null): string {
  if (v === null || v === undefined) return '–'
  const a = Math.abs(v)
  if (a >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (a >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString('en-US')}`
}

function fmtPct(v: number | null): string {
  if (v === null) return '–'
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
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

function ChartCard({ data, dataKey, label, color, format, className }: {
  data: any[]; dataKey: string; label: string; color: string; format?: 'dollar'; className?: string
}) {
  const vals = data.filter(d => d[dataKey] !== null && d[dataKey] !== undefined && d[dataKey] !== 0)
  if (vals.length === 0) return null

  const latest = vals[vals.length - 1]?.[dataKey]
  const prev = vals[vals.length - 2]?.[dataKey]
  const growth = latest && prev ? ((latest - prev) / Math.abs(prev)) * 100 : null

  // Period label for latest value
  const latestPeriod = vals[vals.length - 1]?.period

  return (
    <div className={`bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5 hover:border-white/[0.06] transition-all ${className || ''}`}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-[11px] text-white/30 font-medium tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">
            {format === 'dollar' ? `$${latest?.toFixed(2)}` : fmt(latest)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {growth !== null && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
              growth >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>{growth >= 0 ? '+' : ''}{growth.toFixed(1)}%</span>
          )}
          {latestPeriod && <span className="text-[9px] text-white/15">FY {latestPeriod}</span>}
        </div>
      </div>
      <div className="h-36 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={vals} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
            <XAxis dataKey="period" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={({ active, payload, label: l }) => {
              if (!active || !payload?.length) return null
              const v = payload[0].value as number
              return (<div style={TT}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{l}</p>
                <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{format === 'dollar' ? `$${v.toFixed(2)}` : fmt(v)}</p>
              </div>)
            }} />
            <Bar dataKey={dataKey} fill={color} opacity={0.7} radius={[4, 4, 0, 0]} />
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
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [income, setIncome] = useState<Period[]>([])
  const [balance, setBalance] = useState<BalancePeriod[]>([])
  const [cashflow, setCashflow] = useState<CashFlowPeriod[]>([])
  const [news, setNews] = useState<NewsArticle[]>([])
  const [kpis, setKpis] = useState<Record<string, KPIMetric>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = React.useRef<HTMLInputElement>(null)

  // Cmd+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    setLoading(true)
    setTab('overview')
    Promise.all([
      fetch(`/api/v1/company/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/financials/income-statement/${ticker}?years=10`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/financials/balance-sheet/${ticker}?years=10`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/financials/cash-flow/${ticker}?years=10`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/news/stock/${ticker}?limit=20`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/kpis/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([p, inc, bal, cf, n, k]) => {
      if (p && !p.error) setProfile(p)
      if (inc?.data) setIncome(inc.data)
      if (bal?.data) setBalance(bal.data)
      if (cf?.data) setCashflow(cf.data)
      if (n?.articles) setNews(n.articles)
      if (k?.metrics) setKpis(k.metrics)
    }).finally(() => setLoading(false))
  }, [ticker])

  const L = income[income.length - 1]
  const P = income[income.length - 2]
  const LB = balance[balance.length - 1]
  const LC = cashflow[cashflow.length - 1]

  const revGrowth = L?.revenue && P?.revenue ? ((L.revenue - P.revenue) / Math.abs(P.revenue)) * 100 : null
  const grossMargin = L?.revenue && L?.grossProfit ? (L.grossProfit / L.revenue) * 100 : null
  const opMargin = L?.revenue && L?.operatingIncome ? (L.operatingIncome / L.revenue) * 100 : null
  const netMargin = L?.revenue && L?.netIncome ? (L.netIncome / L.revenue) * 100 : null

  const metrics = [
    { label: 'Revenue', value: fmt(L?.revenue || null), sub: L ? `FY ${L.period}` : '' },
    { label: 'Net Income', value: fmt(L?.netIncome || null) },
    { label: 'EPS', value: L?.eps ? `$${L.eps.toFixed(2)}` : '–' },
    { label: 'Gross Margin', value: grossMargin ? `${grossMargin.toFixed(1)}%` : '–' },
    { label: 'Op. Margin', value: opMargin ? `${opMargin.toFixed(1)}%` : '–' },
    { label: 'Net Margin', value: netMargin ? `${netMargin.toFixed(1)}%` : '–' },
    { label: 'Rev. Growth', value: fmtPct(revGrowth), color: revGrowth },
    { label: 'Cash', value: fmt(LB?.cash || null) },
    { label: 'Debt', value: fmt(LB?.totalDebt || LB?.longTermDebt || null) },
    { label: 'Op. CF', value: fmt(LC?.operatingCashFlow || null) },
    { label: 'FCF', value: fmt(LC?.freeCashFlow || null) },
    { label: 'R&D', value: fmt(L?.researchAndDevelopment || null) },
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
          {/* Ticker Logo Placeholder */}
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
            <span className="text-sm font-bold text-white/40">{ticker.slice(0, 2)}</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-lg font-bold text-white tracking-tight">{ticker}</h1>
              <span className="text-[11px] text-white/20 font-medium">{profile?.exchangeName}</span>
            </div>
            <p className="text-[12px] text-white/30">{profile?.name}{profile?.industry ? ` · ${profile.industry}` : ''}</p>
          </div>
        </div>
        {/* Intentionally empty – search is in bottom nav */}
        <div />
      </header>

      {/* ── HERO: Revenue Trend + Key Metrics ─────────────── */}
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Revenue Chart (Hero – 2 cols) */}
          <div className="lg:col-span-2 bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[11px] text-white/25 font-medium">Revenue</p>
                <p className="text-3xl font-bold text-white mt-1">{fmt(L?.revenue || null)}</p>
                {L?.period && <p className="text-[11px] text-white/15 mt-0.5">FY {L.period}</p>}
              </div>
              {revGrowth !== null && (
                <span className={`text-[12px] font-bold px-2.5 py-1 rounded-lg ${
                  revGrowth >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>{revGrowth >= 0 ? '+' : ''}{revGrowth.toFixed(1)}% YoY</span>
              )}
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={income.filter(d => d.revenue)} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="heroRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip cursor={false} content={({ active, payload, label: l }) => {
                    if (!active || !payload?.length) return null
                    return (<div style={TT}>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{l}</p>
                      <p style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>{fmt(payload[0].value as number)}</p>
                    </div>)
                  }} />
                  <Area type="monotone" dataKey="revenue" stroke="rgba(255,255,255,0.4)" strokeWidth={2} fill="url(#heroRevGrad)" dot={false} activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Metrics Grid (1 col) */}
          <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
            <p className="text-[11px] text-white/25 font-medium mb-4">Key Metrics</p>
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
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────── */}
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 border-b border-white/[0.03]">
        <div className="flex">
          {(['overview', 'news', 'financials', 'kpis'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-[13px] font-medium relative transition-colors ${
                tab === t ? 'text-white' : 'text-white/20 hover:text-white/40'
              }`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {tab === t && <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-white rounded-full" />}
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
              <ChartCard data={income} dataKey="netIncome" label="Net Income" color="#4ade80" />
              <ChartCard data={income} dataKey="eps" label="Earnings Per Share" color="#fbbf24" format="dollar" />
              <ChartCard data={income} dataKey="grossProfit" label="Gross Profit" color="#60a5fa" />
            </div>

            {/* Row 2: Cash Flow + Balance Sheet */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ChartCard data={cashflow} dataKey="operatingCashFlow" label="Operating Cash Flow" color="#22d3ee" />
              <ChartCard data={cashflow} dataKey="freeCashFlow" label="Free Cash Flow" color="#f97316" />
              <ChartCard data={balance} dataKey="cash" label="Cash & Equivalents" color="#34d399" />
            </div>

            {/* Row 3: News + Company Info */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3">
                <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Latest News</p>
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
                    <p className="text-[13px] text-white/15">No recent news</p>
                  </div>
                )}
              </div>
              {profile && (
                <div className="lg:col-span-2">
                  <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Company</p>
                  <div className="bg-[#0c0c16] border border-white/[0.03] rounded-xl p-5 space-y-3.5">
                    {[
                      ['Name', profile.name], ['Exchange', profile.exchangeName],
                      ['Sector', profile.sector], ['Industry', profile.industry],
                      ['FY End', profile.fiscalYearEndFormatted], ['CIK', profile.cik],
                      ...(profile.phone ? [['Phone', profile.phone]] : []),
                      ...(profile.address ? [['HQ', `${profile.address.city}, ${profile.address.state}`]] : []),
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
            <div className="text-center py-28">
              <p className="text-white/20 text-sm">No news for {ticker}</p>
              <p className="text-white/8 text-xs mt-1">Updates every 15 min from 14 sources</p>
            </div>
          ) : (
            <div className="w-full max-w-3xl space-y-1.5">
              {news.map(a => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                  className="block p-4 rounded-xl bg-[#0c0c16] border border-white/[0.03] hover:border-white/[0.08] transition-all group">
                  <p className="text-[14px] text-white/70 group-hover:text-white transition-colors">{a.title}</p>
                  {a.summary && <p className="text-[12px] text-white/20 mt-1.5 line-clamp-2">{a.summary}</p>}
                  <div className="flex gap-3 mt-2">
                    <span className="text-[11px] text-white/15">{a.sourceName}</span>
                    <span className="text-[11px] text-white/8">{timeAgo(a.publishedAt)}</span>
                  </div>
                </a>
              ))}
            </div>
          )

        ) : tab === 'financials' ? (
          <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              { d: income, k: 'revenue', l: 'Revenue', c: '#fff' },
              { d: income, k: 'netIncome', l: 'Net Income', c: '#4ade80' },
              { d: income, k: 'grossProfit', l: 'Gross Profit', c: '#60a5fa' },
              { d: income, k: 'operatingIncome', l: 'Operating Income', c: '#c084fc' },
              { d: income, k: 'eps', l: 'EPS', c: '#fbbf24', f: 'dollar' as const },
              { d: income, k: 'researchAndDevelopment', l: 'R&D Expense', c: '#f472b6' },
              { d: cashflow, k: 'operatingCashFlow', l: 'Operating Cash Flow', c: '#22d3ee' },
              { d: cashflow, k: 'freeCashFlow', l: 'Free Cash Flow', c: '#f97316' },
              { d: cashflow, k: 'shareRepurchase', l: 'Share Repurchase', c: '#e879f9' },
              { d: balance, k: 'totalAssets', l: 'Total Assets', c: '#a78bfa' },
              { d: balance, k: 'cash', l: 'Cash & Equivalents', c: '#34d399' },
              { d: balance, k: 'longTermDebt', l: 'Long-Term Debt', c: '#fb923c' },
              { d: balance, k: 'shareholdersEquity', l: 'Equity', c: '#38bdf8' },
            ].map(({ d, k, l, c, f }) => (
              <ChartCard key={k} data={d} dataKey={k} label={l} color={c} format={f} />
            ))}
          </div>

        ) : tab === 'kpis' ? (
          Object.keys(kpis).length === 0 ? (
            <div className="text-center py-28">
              <p className="text-white/20 text-sm">No Operating KPIs for {ticker}</p>
              <p className="text-white/8 text-xs mt-1">Available for AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX, UBER, MA, V</p>
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

      {/* ── SEARCH MODAL (Cmd+K) ─────────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="bg-[#12121e] border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                <svg className="w-5 h-5 text-white/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && search.trim()) {
                      router.push(`/analyse/aktien/${search.trim().toUpperCase()}`)
                      setSearch('')
                      setSearchOpen(false)
                    }
                    if (e.key === 'Escape') setSearchOpen(false)
                  }}
                  placeholder="Search for a stock..."
                  className="flex-1 bg-transparent text-[16px] text-white placeholder:text-white/20 focus:outline-none"
                  autoFocus
                />
                <kbd className="text-[10px] text-white/15 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">ESC</kbd>
              </div>

              {/* Quick suggestions */}
              <div className="px-3 py-2">
                <p className="text-[10px] text-white/15 uppercase tracking-wider px-2 py-1.5">Popular</p>
                {['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'NFLX'].map(t => (
                  <button
                    key={t}
                    onClick={() => { router.push(`/analyse/aktien/${t}`); setSearch(''); setSearchOpen(false) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors ${
                      t === ticker ? 'bg-white/[0.04] text-white/60' : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
                    }`}
                  >
                    <span className="font-medium text-white/60">{t}</span>
                    {t === ticker && <span className="text-[10px] text-white/15 ml-2">current</span>}
                  </button>
                ))}
              </div>

              {/* Keyboard hint */}
              <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-4 text-[10px] text-white/12">
                <span><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">↵</kbd> to go</span>
                <span><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">ESC</kbd> to close</span>
                <span className="ml-auto"><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">⌘K</kbd> to search</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING BOTTOM NAV (Fey-Style Pill) ───────────── */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <nav className="flex items-center gap-1 bg-[#141420]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <Link href="/analyse" className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-[9px] text-white/25 group-hover:text-white/50">Home</span>
          </Link>
          <Link href="/analyse/calendar" className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="text-[9px] text-white/25 group-hover:text-white/50">Earnings</span>
          </Link>
          <Link href="/analyse" className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-[9px] text-white/25 group-hover:text-white/50">Markets</span>
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
