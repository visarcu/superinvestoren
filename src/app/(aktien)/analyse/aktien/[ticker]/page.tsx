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

  return (
    <div className={`bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5 hover:border-white/[0.08] transition-colors ${className || ''}`}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-[11px] text-white/30 font-medium tracking-wide">{label}</p>
        {growth !== null && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
            growth >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>{growth >= 0 ? '+' : ''}{growth.toFixed(1)}%</span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-4">
        {format === 'dollar' ? `$${latest?.toFixed(2)}` : fmt(latest)}
      </p>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={vals} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="period" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.12)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip cursor={false} content={({ active, payload, label: l }) => {
              if (!active || !payload?.length) return null
              const v = payload[0].value as number
              return (<div style={TT}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{l}</p>
                <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{format === 'dollar' ? `$${v.toFixed(2)}` : fmt(v)}</p>
              </div>)
            }} />
            <Bar dataKey={dataKey} fill={color} opacity={0.65} radius={[4, 4, 0, 0]} />
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
      <header className="px-6 sm:px-10 py-4 flex items-center justify-between border-b border-white/[0.03]">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
            <span className="text-white/50">←</span>
          </button>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold text-white">{ticker}</h1>
              <span className="text-xs text-white/20">{profile?.exchangeName}</span>
            </div>
            <p className="text-[13px] text-white/35">{profile?.name}{profile?.industry ? ` · ${profile.industry}` : ''}</p>
          </div>
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && search.trim()) { router.push(`/analyse/aktien/${search.trim().toUpperCase()}`); setSearch('') } }}
          placeholder="Search..."
          className="w-32 sm:w-44 px-3 py-2 bg-white/[0.03] border border-white/[0.05] rounded-xl text-sm text-white placeholder:text-white/12 focus:outline-none focus:border-white/12"
        />
      </header>

      {/* ── METRICS STRIP ─────────────────────────────────── */}
      <div className="px-6 sm:px-10 py-3 border-b border-white/[0.03] overflow-x-auto">
        <div className="flex gap-7 min-w-max">
          {metrics.map(m => (
            <div key={m.label}>
              <p className="text-[10px] text-white/15 mb-0.5">{m.label}</p>
              <p className={`text-[14px] font-semibold ${
                'color' in m && m.color !== null && m.color !== undefined
                  ? (m.color as number) >= 0 ? 'text-emerald-400' : 'text-red-400'
                  : 'text-white/90'
              }`}>{m.value}</p>
              {'sub' in m && m.sub && <p className="text-[9px] text-white/8">{m.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────── */}
      <div className="px-6 sm:px-10 border-b border-white/[0.03]">
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
      <main className="flex-1 px-6 sm:px-10 py-8 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : tab === 'overview' ? (
          <div className="max-w-7xl space-y-6">
            {/* Row 1: Revenue + Net Income (large) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard data={income} dataKey="revenue" label="Revenue" color="#ffffff" className="min-h-[240px]" />
              <ChartCard data={income} dataKey="netIncome" label="Net Income" color="#4ade80" className="min-h-[240px]" />
            </div>

            {/* Row 2: EPS + Gross Profit + Op CF (medium) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ChartCard data={income} dataKey="eps" label="Earnings Per Share" color="#fbbf24" format="dollar" />
              <ChartCard data={income} dataKey="grossProfit" label="Gross Profit" color="#60a5fa" />
              <ChartCard data={cashflow} dataKey="operatingCashFlow" label="Operating Cash Flow" color="#22d3ee" />
            </div>

            {/* Row 3: Balance Sheet highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ChartCard data={balance} dataKey="cash" label="Cash & Equivalents" color="#34d399" />
              <ChartCard data={balance} dataKey="totalAssets" label="Total Assets" color="#a78bfa" />
              <ChartCard data={balance} dataKey="shareholdersEquity" label="Equity" color="#38bdf8" />
            </div>

            {/* Row 4: News + Company Info */}
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
            <div className="max-w-3xl space-y-1.5">
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
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

      {/* ── BOTTOM NAV (Fey-Style) ────────────────────────── */}
      <nav className="border-t border-white/[0.04] bg-[#06060e]/80 backdrop-blur-xl px-6 sm:px-10 py-2">
        <div className="flex items-center justify-center gap-1 max-w-lg mx-auto">
          {[
            { icon: '🏠', label: 'Home', href: '/analyse' },
            { icon: '📅', label: 'Earnings', href: '/analyse/calendar' },
            { icon: '📊', label: 'Markets', href: '/analyse' },
            { icon: '🔍', label: 'Search', href: '#', action: () => document.querySelector<HTMLInputElement>('header input')?.focus() },
          ].map(item => (
            <Link key={item.label} href={item.href}
              onClick={item.action ? (e) => { e.preventDefault(); item.action?.() } : undefined}
              className="flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors">
              <span className="text-base">{item.icon}</span>
              <span className="text-[10px] text-white/25">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
