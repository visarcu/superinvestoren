// /analyse/aktien/[ticker] – Fey-Style Fullscreen Stock Page
// Nutzt NUR eigene APIs (SEC XBRL, News, Company Profile)
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompanyProfile {
  name: string; ticker: string; cik: string; exchangeName: string
  sector: string; industry: string; fiscalYearEndFormatted: string
  phone: string | null; address: { street: string; city: string; state: string; zip: string } | null
}

interface FinancialPeriod {
  period: string; revenue: number | null; netIncome: number | null
  grossProfit: number | null; operatingIncome: number | null
  eps: number | null; totalAssets: number | null; cash: number | null
  longTermDebt: number | null; operatingCashFlow: number | null
  freeCashFlow: number | null; researchAndDevelopment: number | null
  shareholdersEquity: number | null; [key: string]: any
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

function fmt(val: number | null): string {
  if (val === null || val === undefined) return '–'
  const abs = Math.abs(val)
  if (abs >= 1e12) return `$${(val / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `$${(val / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(val / 1e6).toFixed(0)}M`
  return `$${val.toLocaleString('en-US')}`
}

function fmtPct(val: number | null): string {
  if (val === null || val === undefined) return '–'
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`
}

function fmtAxis(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(0)}B`
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(0)}M`
  return String(v)
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const tt: React.CSSProperties = {
  backgroundColor: 'rgba(8, 8, 16, 0.95)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FeyStockPage() {
  const params = useParams()
  const router = useRouter()
  const ticker = (params.ticker as string)?.toUpperCase() || 'AAPL'

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [financials, setFinancials] = useState<FinancialPeriod[]>([])
  const [news, setNews] = useState<NewsArticle[]>([])
  const [kpis, setKpis] = useState<Record<string, KPIMetric>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    setActiveTab('overview')
    Promise.all([
      fetch(`/api/v1/company/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/financials/income-statement/${ticker}?years=10`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/news/stock/${ticker}?limit=20`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/kpis/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([prof, fin, newsData, kpiData]) => {
      if (prof && !prof.error) setProfile(prof)
      if (fin?.data) setFinancials(fin.data)
      if (newsData?.articles) setNews(newsData.articles)
      if (kpiData?.metrics) setKpis(kpiData.metrics)
    }).finally(() => setLoading(false))
  }, [ticker])

  const L = financials[financials.length - 1]
  const P = financials[financials.length - 2]

  const revGrowth = L?.revenue && P?.revenue ? ((L.revenue - P.revenue) / Math.abs(P.revenue)) * 100 : null
  const grossMargin = L?.revenue && L?.grossProfit ? (L.grossProfit / L.revenue) * 100 : null
  const netMargin = L?.revenue && L?.netIncome ? (L.netIncome / L.revenue) * 100 : null
  const opMargin = L?.revenue && L?.operatingIncome ? (L.operatingIncome / L.revenue) * 100 : null

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'news', label: 'News', count: news.length },
    { key: 'financials', label: 'Financials', count: financials.length },
    { key: 'kpis', label: 'KPIs', count: Object.keys(kpis).length },
  ]

  return (
    <div className="min-h-screen bg-[#08080f] flex flex-col">
      {/* ── HEADER ────────────────────────────────────────────────── */}
      <header className="px-5 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
            <span className="text-white/60 text-sm">←</span>
          </button>
          <div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">{ticker}</h1>
              <span className="text-sm text-white/25">{profile?.exchangeName || ''}</span>
            </div>
            <p className="text-sm text-white/40 mt-0.5">
              {profile?.name || 'Loading...'}{profile?.industry ? ` · ${profile.industry}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                router.push(`/analyse/aktien/${searchQuery.trim().toUpperCase()}`)
                setSearchQuery('')
              }
            }}
            placeholder="Ticker..."
            className="w-28 sm:w-40 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder:text-white/15 focus:outline-none focus:border-white/15 transition-colors"
          />
        </div>
      </header>

      {/* ── KEY METRICS BAR ───────────────────────────────────────── */}
      <div className="px-5 sm:px-8 py-4 border-y border-white/[0.04]">
        <div className="flex gap-8 overflow-x-auto pb-1">
          {[
            { label: 'Revenue', value: fmt(L?.revenue || null), sub: L?.period || '' },
            { label: 'EPS', value: L?.eps ? `$${L.eps.toFixed(2)}` : '–' },
            { label: 'Gross Margin', value: grossMargin !== null ? `${grossMargin.toFixed(1)}%` : '–' },
            { label: 'Op. Margin', value: opMargin !== null ? `${opMargin.toFixed(1)}%` : '–' },
            { label: 'Net Margin', value: netMargin !== null ? `${netMargin.toFixed(1)}%` : '–' },
            { label: 'Rev. Growth', value: fmtPct(revGrowth), positive: revGrowth },
            { label: 'R&D', value: fmt(L?.researchAndDevelopment || null) },
            { label: 'Cash', value: fmt(L?.cash || null) },
            { label: 'Debt', value: fmt(L?.longTermDebt || null) },
          ].map(m => (
            <div key={m.label} className="flex-shrink-0">
              <p className="text-[11px] text-white/20 mb-1">{m.label}</p>
              <p className={`text-[15px] font-semibold ${
                'positive' in m && m.positive !== null && m.positive !== undefined
                  ? (m.positive as number) >= 0 ? 'text-emerald-400' : 'text-red-400'
                  : 'text-white'
              }`}>
                {m.value}
              </p>
              {'sub' in m && m.sub && <p className="text-[10px] text-white/10 mt-0.5">FY {m.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────────────────────── */}
      <div className="px-5 sm:px-8 border-b border-white/[0.04]">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition-all relative ${
                activeTab === tab.key ? 'text-white' : 'text-white/25 hover:text-white/50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-[10px] text-white/15">{tab.count}</span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────── */}
      <main className="flex-1 px-5 sm:px-8 py-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewContent financials={financials} news={news} profile={profile} />}
            {activeTab === 'news' && <NewsContent news={news} ticker={ticker} />}
            {activeTab === 'financials' && <FinancialsContent financials={financials} />}
            {activeTab === 'kpis' && <KPIsContent kpis={kpis} ticker={ticker} />}
          </>
        )}
      </main>
    </div>
  )
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────

function OverviewContent({ financials, news, profile }: {
  financials: FinancialPeriod[]; news: NewsArticle[]; profile: CompanyProfile | null
}) {
  const chartData = financials.filter(f => f.revenue)

  return (
    <div className="max-w-6xl space-y-8">
      {/* Revenue + Earnings Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {chartData.length > 0 && (
          <MiniChart data={chartData} dataKey="revenue" label="Revenue" color="#ffffff" />
        )}
        {chartData.some(f => f.netIncome) && (
          <MiniChart data={chartData.filter(f => f.netIncome)} dataKey="netIncome" label="Net Income" color="#4ade80" />
        )}
      </div>

      {/* EPS + Margins Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {chartData.some(f => f.eps) && (
          <MiniChart data={chartData.filter(f => f.eps)} dataKey="eps" label="Earnings Per Share" color="#fbbf24" format="dollar" />
        )}
        {chartData.some(f => f.grossProfit) && (
          <MiniChart data={chartData.filter(f => f.grossProfit)} dataKey="grossProfit" label="Gross Profit" color="#60a5fa" />
        )}
        {chartData.some(f => f.operatingCashFlow) && (
          <MiniChart data={chartData.filter(f => f.operatingCashFlow)} dataKey="operatingCashFlow" label="Operating Cash Flow" color="#22d3ee" />
        )}
      </div>

      {/* News + About Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* News */}
        <div className="lg:col-span-3">
          <p className="text-xs font-medium text-white/25 uppercase tracking-wider mb-3">Latest News</p>
          {news.length > 0 ? (
            <div className="space-y-1.5">
              {news.slice(0, 6).map(a => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] hover:border-white/[0.06] transition-all group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 group-hover:text-white/90 transition-colors leading-snug truncate">{a.title}</p>
                    <p className="text-[11px] text-white/20 mt-1">{a.sourceName} · {timeAgo(a.publishedAt)}</p>
                  </div>
                  {a.category !== 'general' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.03] text-white/20 flex-shrink-0 mt-0.5">{a.category}</span>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-white/[0.02] border border-white/[0.03] text-center">
              <p className="text-sm text-white/20">No recent news for this ticker</p>
            </div>
          )}
        </div>

        {/* About */}
        {profile && (
          <div className="lg:col-span-2">
            <p className="text-xs font-medium text-white/25 uppercase tracking-wider mb-3">Company Info</p>
            <div className="bg-white/[0.02] border border-white/[0.03] rounded-xl p-5 space-y-4">
              {[
                { label: 'Name', value: profile.name },
                { label: 'Exchange', value: profile.exchangeName },
                { label: 'Sector', value: profile.sector },
                { label: 'Industry', value: profile.industry },
                { label: 'Fiscal Year End', value: profile.fiscalYearEndFormatted },
                { label: 'CIK', value: profile.cik },
                ...(profile.phone ? [{ label: 'Phone', value: profile.phone }] : []),
                ...(profile.address ? [{ label: 'HQ', value: `${profile.address.city}, ${profile.address.state}` }] : []),
              ].map(item => (
                <div key={item.label} className="flex justify-between items-baseline">
                  <span className="text-[12px] text-white/20">{item.label}</span>
                  <span className="text-[13px] text-white/60 text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Mini Chart Component ────────────────────────────────────────────────────

function MiniChart({ data, dataKey, label, color, format }: {
  data: any[]; dataKey: string; label: string; color: string; format?: 'dollar' | 'default'
}) {
  const latest = data[data.length - 1]?.[dataKey]
  const prev = data[data.length - 2]?.[dataKey]
  const growth = latest && prev ? ((latest - prev) / Math.abs(prev)) * 100 : null

  return (
    <div className="bg-white/[0.02] border border-white/[0.03] rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] text-white/25 mb-1">{label}</p>
          <p className="text-xl font-bold text-white">
            {format === 'dollar' ? `$${latest?.toFixed(2) || '–'}` : fmt(latest)}
          </p>
        </div>
        {growth !== null && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
            growth >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="period" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.12)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              cursor={false}
              content={({ active, payload, label: lbl }) => {
                if (!active || !payload?.length) return null
                const val = payload[0].value as number
                return (
                  <div style={tt}>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>{lbl}</p>
                    <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>
                      {format === 'dollar' ? `$${val.toFixed(2)}` : fmt(val)}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey={dataKey} fill={color} opacity={0.6} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── NEWS ────────────────────────────────────────────────────────────────────

function NewsContent({ news, ticker }: { news: NewsArticle[]; ticker: string }) {
  if (news.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-24">
        <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
          <span className="text-white/20 text-lg">📰</span>
        </div>
        <p className="text-white/30 text-sm">No news for {ticker}</p>
        <p className="text-white/12 text-xs mt-1">News updates every 15 minutes from 14 sources</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-2">
      {news.map(a => (
        <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
          className="block p-4 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] hover:border-white/[0.06] transition-all group">
          <p className="text-[15px] text-white/75 group-hover:text-white transition-colors leading-snug">{a.title}</p>
          {a.summary && <p className="text-xs text-white/25 mt-2 leading-relaxed line-clamp-2">{a.summary}</p>}
          <div className="flex items-center gap-3 mt-2.5">
            <span className="text-[11px] text-white/20">{a.sourceName}</span>
            <span className="text-[11px] text-white/10">{timeAgo(a.publishedAt)}</span>
            {a.category !== 'general' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.03] text-white/20">{a.category}</span>
            )}
          </div>
        </a>
      ))}
    </div>
  )
}

// ─── FINANCIALS ──────────────────────────────────────────────────────────────

function FinancialsContent({ financials }: { financials: FinancialPeriod[] }) {
  if (financials.length === 0) {
    return <p className="text-white/20 text-sm py-24 text-center">No financial data available</p>
  }

  const charts = [
    { key: 'revenue', label: 'Revenue', color: '#ffffff' },
    { key: 'netIncome', label: 'Net Income', color: '#4ade80' },
    { key: 'grossProfit', label: 'Gross Profit', color: '#60a5fa' },
    { key: 'operatingIncome', label: 'Operating Income', color: '#c084fc' },
    { key: 'eps', label: 'EPS', color: '#fbbf24', format: 'dollar' as const },
    { key: 'operatingCashFlow', label: 'Operating Cash Flow', color: '#22d3ee' },
    { key: 'freeCashFlow', label: 'Free Cash Flow', color: '#f97316' },
    { key: 'researchAndDevelopment', label: 'R&D Expense', color: '#f472b6' },
    { key: 'totalAssets', label: 'Total Assets', color: '#a78bfa' },
    { key: 'cash', label: 'Cash & Equivalents', color: '#34d399' },
    { key: 'longTermDebt', label: 'Long-Term Debt', color: '#fb923c' },
    { key: 'shareholdersEquity', label: 'Shareholders Equity', color: '#38bdf8' },
  ].filter(c => financials.some(f => f[c.key] !== null && f[c.key] !== undefined && f[c.key] !== 0))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl">
      {charts.map(chart => (
        <MiniChart
          key={chart.key}
          data={financials.filter(f => f[chart.key])}
          dataKey={chart.key}
          label={chart.label}
          color={chart.color}
          format={chart.format}
        />
      ))}
    </div>
  )
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

function KPIsContent({ kpis, ticker }: { kpis: Record<string, KPIMetric>; ticker: string }) {
  const entries = Object.entries(kpis)

  if (entries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-24">
        <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
          <span className="text-white/20 text-lg">📊</span>
        </div>
        <p className="text-white/30 text-sm">No Operating KPIs for {ticker}</p>
        <p className="text-white/12 text-xs mt-1">Available for: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX, UBER, MA, V</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
      {entries.map(([key, metric]) => {
        const latest = metric.data[metric.data.length - 1]
        const prev = metric.data[metric.data.length - 5]
        const yoy = prev ? ((latest.value - prev.value) / Math.abs(prev.value)) * 100 : null

        const unitLabel = metric.unit === 'millions' ? 'M' : metric.unit === 'billions' ? 'B' :
          metric.unit === 'thousands' ? 'K' : metric.unit === 'percent' ? '%' :
          metric.unit === 'dollars' ? '$' : metric.unit === 'GWh' ? ' GWh' : ''

        const valueStr = metric.unit === 'dollars'
          ? `$${latest?.value.toFixed(2)}`
          : metric.unit === 'percent'
            ? `${latest?.value.toFixed(1)}%`
            : `${latest?.value.toLocaleString('en-US')}${unitLabel}`

        return (
          <div key={key} className="bg-white/[0.02] border border-white/[0.03] rounded-xl p-5">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[11px] text-white/25">{metric.label}</p>
              <div className="flex items-center gap-2">
                {yoy !== null && (
                  <span className={`text-[10px] font-semibold ${yoy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
                  </span>
                )}
                {latest && <p className="text-[10px] text-white/15">{latest.period}</p>}
              </div>
            </div>
            <p className="text-xl font-bold text-white mb-4">{valueStr}</p>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metric.data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`g-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={1.5} fill={`url(#g-${key})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}
