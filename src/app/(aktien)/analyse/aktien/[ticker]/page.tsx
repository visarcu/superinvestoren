// /analyse/aktien/[ticker] – Fey-Style Fullscreen Stock Page
// Nutzt NUR eigene APIs (SEC XBRL, News, Company Profile)
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompanyProfile {
  name: string; ticker: string; cik: string; exchangeName: string
  sector: string; industry: string; fiscalYearEndFormatted: string
}

interface FinancialPeriod {
  period: string; revenue: number | null; netIncome: number | null
  grossProfit: number | null; operatingIncome: number | null
  eps: number | null; totalAssets: number | null; cash: number | null
  longTermDebt: number | null; operatingCashFlow: number | null
  freeCashFlow: number | null; researchAndDevelopment: number | null
  shareholdersEquity: number | null; capitalExpenditure: number | null
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

function formatLargeNumber(val: number | null): string {
  if (val === null) return '–'
  const abs = Math.abs(val)
  if (abs >= 1e12) return `${(val / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${(val / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(val / 1e6).toFixed(0)}M`
  return val.toLocaleString('en-US')
}

function formatPercent(val: number | null): string {
  if (val === null) return '–'
  return `${val.toFixed(2)}%`
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'rgba(10, 10, 20, 0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  padding: '8px 12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
  const [searchOpen, setSearchOpen] = useState(false)

  // ── Data Loading ──────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/v1/company/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/financials/income-statement/${ticker}?years=10`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/news/stock/${ticker}?limit=15`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/kpis/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([prof, fin, newsData, kpiData]) => {
      if (prof && !prof.error) setProfile(prof)
      if (fin?.data) setFinancials(fin.data)
      if (newsData?.articles) setNews(newsData.articles)
      if (kpiData?.metrics) setKpis(kpiData.metrics)
    }).finally(() => setLoading(false))
  }, [ticker])

  // Key metrics from latest financial period
  const latest = financials[financials.length - 1]
  const prevYear = financials[financials.length - 2]

  const revenueGrowth = latest?.revenue && prevYear?.revenue
    ? ((latest.revenue - prevYear.revenue) / prevYear.revenue) * 100
    : null

  const grossMargin = latest?.revenue && latest?.grossProfit
    ? (latest.grossProfit / latest.revenue) * 100
    : null

  const netMargin = latest?.revenue && latest?.netIncome
    ? (latest.netIncome / latest.revenue) * 100
    : null

  // Latest news for summary card
  const topNews = news[0]

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header className="px-4 sm:px-6 py-3 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-white/40 hover:text-white transition-colors text-sm"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white">{ticker}</h1>
              {profile && (
                <span className="text-xs text-white/30 font-medium">
                  {profile.exchangeName}
                </span>
              )}
            </div>
            <p className="text-xs text-white/40">
              {profile?.name || '...'} {profile?.sector ? `· ${profile.sector}` : ''}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            onKeyDown={e => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                router.push(`/analyse/aktien/${searchQuery.trim().toUpperCase()}`)
                setSearchQuery('')
              }
            }}
            placeholder="Search ticker..."
            className="w-36 sm:w-48 px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
          />
        </div>
      </header>

      {/* ── CHART AREA + NEWS SUMMARY ───────────────────────────────── */}
      <div className="relative px-4 sm:px-6 py-6 flex-shrink-0">
        {/* Placeholder Chart */}
        <div className="h-48 sm:h-64 bg-white/[0.02] rounded-xl border border-white/[0.04] flex items-center justify-center">
          <p className="text-white/20 text-sm">Chart (Aktienkurs via FMP)</p>
        </div>

        {/* News Summary Card – Fey Style */}
        {topNews && (
          <div className="absolute top-8 right-8 sm:right-10 w-64 bg-[#12121a]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 shadow-2xl">
            <p className="text-[10px] text-white/30 font-medium mb-2">News summary</p>
            <p className="text-xs text-white/70 leading-relaxed line-clamp-4">
              {topNews.summary || topNews.title}
            </p>
            <p className="text-[10px] text-white/20 mt-2">
              {topNews.sourceName} · {timeAgo(topNews.publishedAt)}
            </p>
          </div>
        )}
      </div>

      {/* ── KEY METRICS BAR ─────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-3 border-y border-white/[0.06] overflow-x-auto">
        <div className="flex gap-6 sm:gap-8 min-w-max">
          {[
            { label: 'FY Revenue', value: formatLargeNumber(latest?.revenue || null) },
            { label: 'EPS', value: latest?.eps ? `$${latest.eps.toFixed(2)}` : '–' },
            { label: 'Gross Margin', value: formatPercent(grossMargin) },
            { label: 'Net Margin', value: formatPercent(netMargin) },
            { label: 'Rev Growth', value: revenueGrowth ? `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%` : '–' },
            { label: 'Free Cash Flow', value: formatLargeNumber(latest?.freeCashFlow || null) },
            { label: 'Cash', value: formatLargeNumber(latest?.cash || null) },
            { label: 'Sector', value: profile?.sector || '–' },
          ].map(m => (
            <div key={m.label} className="text-center flex-shrink-0">
              <p className="text-[10px] text-white/30 mb-0.5">{m.label}</p>
              <p className="text-sm font-semibold text-white">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM TABS ─────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-3 border-b border-white/[0.06]">
        <div className="flex gap-1">
          {[
            { key: 'overview' as Tab, label: 'Overview' },
            { key: 'news' as Tab, label: 'News' },
            { key: 'financials' as Tab, label: 'Financials' },
            { key: 'kpis' as Tab, label: 'KPIs' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-white/30 hover:text-white/60'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab financials={financials} news={news} profile={profile} />}
            {activeTab === 'news' && <NewsTab news={news} ticker={ticker} />}
            {activeTab === 'financials' && <FinancialsTab financials={financials} />}
            {activeTab === 'kpis' && <KPIsTab kpis={kpis} ticker={ticker} />}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ financials, news, profile }: {
  financials: FinancialPeriod[]; news: NewsArticle[]; profile: CompanyProfile | null
}) {
  return (
    <div className="space-y-6 max-w-5xl">
      {/* Revenue Trend Mini Chart */}
      {financials.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white/50 mb-3">Revenue Trend</h3>
          <div className="h-40 bg-white/[0.02] rounded-xl border border-white/[0.04] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financials.filter(f => f.revenue)} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fff" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Area type="monotone" dataKey="revenue" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} fill="url(#revGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent News */}
      {news.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white/50 mb-3">Recent News</h3>
          <div className="space-y-2">
            {news.slice(0, 5).map(a => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 hover:bg-white/[0.04] transition-colors"
              >
                <p className="text-sm text-white/80 leading-snug">{a.title}</p>
                <p className="text-[10px] text-white/25 mt-1">{a.sourceName} · {timeAgo(a.publishedAt)}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* About */}
      {profile && (
        <div>
          <h3 className="text-sm font-medium text-white/50 mb-3">About</h3>
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 text-sm text-white/50">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-white/25">Name</span><br /><span className="text-white/70">{profile.name}</span></div>
              <div><span className="text-white/25">Exchange</span><br /><span className="text-white/70">{profile.exchangeName}</span></div>
              <div><span className="text-white/25">Sector</span><br /><span className="text-white/70">{profile.sector}</span></div>
              <div><span className="text-white/25">Industry</span><br /><span className="text-white/70">{profile.industry}</span></div>
              <div><span className="text-white/25">Fiscal Year End</span><br /><span className="text-white/70">{profile.fiscalYearEndFormatted}</span></div>
              <div><span className="text-white/25">CIK</span><br /><span className="text-white/70">{profile.cik}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── News Tab ────────────────────────────────────────────────────────────────

function NewsTab({ news, ticker }: { news: NewsArticle[]; ticker: string }) {
  if (news.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/30 text-sm">Keine News für {ticker} gefunden.</p>
        <p className="text-white/15 text-xs mt-1">News werden alle 15 Minuten aktualisiert.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-w-3xl">
      {news.map(article => (
        <a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 hover:bg-white/[0.04] transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm text-white/80 leading-snug group-hover:text-white transition-colors">
                {article.title}
              </p>
              {article.summary && (
                <p className="text-xs text-white/35 mt-1.5 leading-relaxed line-clamp-2">{article.summary}</p>
              )}
            </div>
            <span className="text-[10px] text-white/15 flex-shrink-0">{timeAgo(article.publishedAt)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-white/25">{article.sourceName}</span>
            {article.category !== 'general' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30">{article.category}</span>
            )}
          </div>
        </a>
      ))}
    </div>
  )
}

// ─── Financials Tab ──────────────────────────────────────────────────────────

function FinancialsTab({ financials }: { financials: FinancialPeriod[] }) {
  if (financials.length === 0) {
    return <p className="text-white/30 text-sm py-20 text-center">Keine Finanzdaten verfügbar.</p>
  }

  const charts = [
    { key: 'revenue', label: 'Revenue', color: '#fff' },
    { key: 'netIncome', label: 'Net Income', color: '#4ade80' },
    { key: 'grossProfit', label: 'Gross Profit', color: '#60a5fa' },
    { key: 'operatingIncome', label: 'Operating Income', color: '#c084fc' },
    { key: 'freeCashFlow', label: 'Free Cash Flow', color: '#f97316' },
    { key: 'operatingCashFlow', label: 'Operating Cash Flow', color: '#22d3ee' },
  ].filter(c => financials.some(f => f[c.key] !== null && f[c.key] !== 0))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">
      {charts.map(chart => (
        <div key={chart.key} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
          <p className="text-xs text-white/40 mb-3">{chart.label}</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financials.filter(f => f[chart.key])} margin={{ top: 5, right: 5, bottom: 20, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => formatLargeNumber(v)}
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.15)' }}
                  axisLine={false} tickLine={false} width={40}
                />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div style={tooltipStyle}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{label}</p>
                        <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                          ${formatLargeNumber(payload[0].value as number)}
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey={chart.key} fill={chart.color} opacity={0.7} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}

      {/* EPS separate (smaller values) */}
      {financials.some(f => f.eps) && (
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
          <p className="text-xs text-white/40 mb-3">Earnings Per Share</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financials.filter(f => f.eps)} margin={{ top: 5, right: 5, bottom: 20, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => `$${v}`}
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.15)' }}
                  axisLine={false} tickLine={false} width={35}
                />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div style={tooltipStyle}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{label}</p>
                        <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>${(payload[0].value as number).toFixed(2)}</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="eps" fill="#fbbf24" opacity={0.7} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── KPIs Tab ────────────────────────────────────────────────────────────────

function KPIsTab({ kpis, ticker }: { kpis: Record<string, KPIMetric>; ticker: string }) {
  const entries = Object.entries(kpis)

  if (entries.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-white/30 text-sm">Keine Operating KPIs für {ticker}.</p>
        <p className="text-white/15 text-xs mt-1">
          Verfügbar für: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX, UBER, ABNB, SHOP, MA, V
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
      {entries.map(([key, metric]) => {
        const latest = metric.data[metric.data.length - 1]
        return (
          <div key={key} className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-white/40">{metric.label}</p>
              {latest && <p className="text-[10px] text-white/20">{latest.period}</p>}
            </div>
            <p className="text-lg font-bold text-white mb-3">
              {latest ? `${latest.value.toLocaleString('en-US')} ${metric.unit === 'millions' ? 'M' : metric.unit === 'billions' ? 'B' : metric.unit === 'thousands' ? 'K' : metric.unit === 'percent' ? '%' : metric.unit === 'dollars' ? '$' : ''}` : '–'}
            </p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metric.data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                  <defs>
                    <linearGradient id={`kpi-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={1.5} fill={`url(#kpi-${key})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {latest?.filingUrl && (
              <a href={latest.filingUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/15 hover:text-white/30 mt-1 block">
                Source: SEC EDGAR ↗
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}
