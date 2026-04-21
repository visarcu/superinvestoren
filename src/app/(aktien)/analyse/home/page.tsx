// /analyse/home – Fey-Style Startseite / Dashboard
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import IndexChart from './_components/IndexChart'

// ── Types ────────────────────────────────────────────────────────────────────

interface MarketIndex {
  symbol: string; name: string; nameDE: string; region: string
  country: string; flag: string; price: number; change: number
  changePercent: number; previousClose: number
  dayHigh?: number; dayLow?: number
  /** Unix-Timestamp (Sekunden) des letzten Kurses */
  timestamp?: number
}

interface DashboardMarket {
  price: number; change: number; changePct: number
  high: number; low: number; previousClose: number
  timestamp?: number
}

interface Sector {
  symbol: string; name: string; nameDE: string
  price: number; change: number; changePercent: number
}

interface Commodity {
  symbol: string; name: string; nameDE: string
  price: number; change: number; changePercent: number
  timestamp?: number
}

interface MarketData {
  sentiment: 'bullish' | 'bearish' | 'neutral'
  indices: MarketIndex[]; sectors: Sector[]; commodities: Commodity[]
  allSectorsChange: number
}

interface PortfolioHolding {
  symbol: string; name: string; quantity: number; purchase_price: number
  currentPrice?: number; change?: number; changePercent?: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(v: number): string {
  if (v >= 10000) return v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtLarge(v: number): string {
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1).replace('.', ',')} Mrd.`
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',')} Mio.`
  return v.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}

function PctBadge({ value }: { value: number }) {
  const isPos = value >= 0
  return (
    <span className={`text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md ${
      isPos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {isPos ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

/**
 * Dezenter "vor X min" / "Uhrzeit" Indikator für Live-Daten.
 * < 2min: "live" (grüner Punkt)
 * < 60min: "vor X min"
 * sonst: Uhrzeit "HH:MM"
 */
function TimestampDot({ ts }: { ts?: number }) {
  if (!ts || ts <= 0) return null
  const ageMin = (Date.now() / 1000 - ts) / 60
  if (ageMin < 2) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400/80">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        live
      </span>
    )
  }
  if (ageMin < 60) {
    return <span className="text-[9px] text-white/30 tabular-nums">vor {Math.round(ageMin)} min</span>
  }
  if (ageMin < 24 * 60) {
    const date = new Date(ts * 1000)
    return (
      <span className="text-[9px] text-white/30 tabular-nums">
        {date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
      </span>
    )
  }
  // Älter als ein Tag → Datum
  const date = new Date(ts * 1000)
  return (
    <span className="text-[9px] text-amber-400/60 tabular-nums">
      {date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
    </span>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function AnalyseDashboard() {
  const [market, setMarket] = useState<MarketData | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioHolding[]>([])
  const [portfolioValue, setPortfolioValue] = useState<number>(0)
  const [portfolioChange, setPortfolioChange] = useState<number>(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState<string>('spx')
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiSources, setAiSources] = useState<string[]>([])
  const [aiSourceLink, setAiSourceLink] = useState<string>('')

  // Markets-Fetch als separate Funktion für initial + periodisches Refresh
  const fetchMarkets = async (isInitial = false) => {
    try {
      // /api/v1/markets/live liefert tagaktuelle Yahoo-Quotes (matcht TradingView).
      // Alte /api/dashboard-cached hatte Werte mehrere Minuten bis Stunden daneben.
      const [marketData, dashData] = await Promise.all([
        fetch('/api/v1/markets').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/v1/markets/live').then(r => r.ok ? r.json() : null).catch(() => null),
      ])

      if (marketData && !marketData.error) {
        if (dashData?.markets) {
          const m = dashData.markets as Record<string, DashboardMarket>
          const realIndices: MarketIndex[] = [
            { symbol: 'spx',   name: 'S&P 500',     nameDE: 'S&P 500',     region: 'americas', country: 'USA', flag: '🇺🇸', ...(m.spx || {}) as any },
            { symbol: 'ixic',  name: 'NASDAQ 100',   nameDE: 'NASDAQ 100',  region: 'americas', country: 'USA', flag: '🇺🇸', ...(m.ixic || {}) as any },
            { symbol: 'dji',   name: 'Dow Jones',    nameDE: 'Dow Jones',   region: 'americas', country: 'USA', flag: '🇺🇸', ...(m.dji || {}) as any },
            { symbol: 'dax',   name: 'DAX',          nameDE: 'DAX',         region: 'emea', country: 'Deutschland', flag: '🇩🇪', ...(m.dax || {}) as any },
            { symbol: 'stoxx', name: 'STOXX 600',    nameDE: 'STOXX 600',   region: 'emea', country: 'Europa', flag: '🇪🇺', ...(m.stoxx || {}) as any },
          ].filter(i => i.price).map(i => ({
            ...i,
            change: i.change || 0,
            changePercent: i.changePct || i.changePercent || 0,
            previousClose: i.previousClose || 0,
            dayHigh: i.high || i.dayHigh,
            dayLow: i.low || i.dayLow,
            timestamp: i.timestamp,
          }))
          if (realIndices.length > 0) marketData.indices = realIndices

          const realCommodities = [
            { symbol: 'btc',    name: 'Bitcoin',  nameDE: 'Bitcoin', ...(m.btc || {}) as any },
            { symbol: 'gold',   name: 'Gold',     nameDE: 'Gold', ...(m.gold || {}) as any },
            { symbol: 'silver', name: 'Silber',   nameDE: 'Silber', ...(m.silver || {}) as any },
            { symbol: 'oil',    name: 'Öl (Brent)', nameDE: 'Öl (Brent)', ...(m.oil || {}) as any },
          ].filter(c => c.price).map(c => ({
            ...c,
            change: c.change || 0,
            changePercent: c.changePct || c.changePercent || 0,
            timestamp: c.timestamp,
          }))
          if (realCommodities.length > 0) marketData.commodities = realCommodities
        }
        setMarket(marketData)
      }

      // AI-Summary NUR beim initialen Load — der Call ist teuer (GPT)
      if (isInitial && dashData?.markets) {
        fetch('/api/sector-performance').then(r => r.ok ? r.json() : { sectors: [] }).then(sectorData => {
          fetch('/api/market-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ markets: dashData.markets, sectors: sectorData.sectors || [] })
          }).then(r => r.ok ? r.json() : null).then(data => {
            if (data?.summary) {
              setAiSummary(data.summary)
              setAiSources(data.sources || [])
              setAiSourceLink(data.source || '')
            }
          }).catch(() => {})
        }).catch(() => {})
      }
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  useEffect(() => {
    fetchMarkets(true)

    // Live-Refresh alle 30s: nur Markets, keine AI-Summary
    const interval = setInterval(() => fetchMarkets(false), 30_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Portfolio laden + alle 45s Quotes refreshen
  useEffect(() => {
    let cancelled = false
    let portfolioId: string | null = null
    let holdings: PortfolioHolding[] = []

    const refreshQuotes = async () => {
      if (!portfolioId || holdings.length === 0 || cancelled) return
      const symbols = holdings.map(x => x.symbol).join(',')
      try {
        const qd = await fetch(`/api/v1/quotes/batch?symbols=${symbols}`).then(r => (r.ok ? r.json() : null))
        if (!qd?.quotes || cancelled) return
        const qm = new Map<string, any>(
          qd.quotes.filter((q: any) => !q.error).map((q: any) => [q.symbol, q])
        )
        let tv = 0,
          tc = 0
        const enriched = holdings.map(hd => {
          const q: any = qm.get(hd.symbol)
          const cp = q?.price || hd.purchase_price
          const v = cp * hd.quantity
          tv += v
          tc += (q?.change || 0) * hd.quantity
          return { ...hd, currentPrice: cp, change: q?.change || 0, changePercent: q?.changePercent || 0 }
        })
        setPortfolio(enriched)
        setPortfolioValue(tv)
        setPortfolioChange(tc)
      } catch {
        /* transient network error ignorieren */
      }
    }

    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session || cancelled) return
      setIsLoggedIn(true)

      const { data: pf } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_default', true)
        .single()
      if (!pf || cancelled) return
      portfolioId = pf.id

      const { data: h } = await supabase
        .from('portfolio_holdings')
        .select('symbol, name, quantity, purchase_price')
        .eq('portfolio_id', pf.id)
      if (!h || h.length === 0 || cancelled) return

      holdings = h
      setPortfolio(h)
      await refreshQuotes()
    })()

    const interval = setInterval(refreshQuotes, 45_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const now = new Date()
  const dateStr = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const greeting = (() => { const h = now.getHours(); return h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend' })()
  // selectedIdx sucht zuerst in den Indizes, fallback auf Commodities
  // (damit der Chart rechts auch für Bitcoin/Gold/Silber/Öl greift)
  const selectedIdx =
    market?.indices.find(i => i.symbol === selectedIndex) ??
    (market?.commodities.find(c => c.symbol === selectedIndex) as MarketIndex | undefined)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-14 pb-2 flex items-start justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-white tracking-tight">{greeting}</h1>
          <p className="text-[13px] text-white/30 mt-0.5 capitalize">{dateStr}</p>
        </div>
        {/* Live-Indikator: Pulsierender Dot, unaufdringlich */}
        <div className="hidden sm:flex items-center gap-2 mt-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400/60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[11px] text-white/45 font-medium">Live</span>
        </div>
      </div>

      {/* ── Row 1: News Recap + Sector Performance ─────────────── */}
      <div className="px-5 mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* News / Sentiment Card — wie Prod, AI-generiert */}
        <div className="bg-[#111119] border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between min-h-[200px]">
          {market && (
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${
                market.sentiment === 'bullish' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' :
                market.sentiment === 'bearish' ? 'border-red-500/30 text-red-400 bg-red-500/5' :
                'border-white/10 text-white/40 bg-white/[0.02]'
              }`}>
                Die Märkte sind <span className="font-bold">{market.sentiment === 'bullish' ? 'bullisch' : market.sentiment === 'bearish' ? 'bärisch' : 'neutral'}</span>
              </span>
              <svg className="w-4 h-4 text-emerald-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
          )}
          <div className="flex-1">
            {aiSummary ? (
              <p className="text-[14px] text-white/70 leading-relaxed">{aiSummary}</p>
            ) : (
              <div className="space-y-2">
                <div className="h-4 bg-white/[0.04] rounded animate-pulse w-full" />
                <div className="h-4 bg-white/[0.04] rounded animate-pulse w-5/6" />
                <div className="h-4 bg-white/[0.04] rounded animate-pulse w-4/6" />
              </div>
            )}
          </div>
          {aiSources.length > 0 && (
            <p className="text-[11px] text-white/35 mt-4">
              Quellen: {aiSources.join(', ')}
              {aiSourceLink === 'finclue-news' && (
                <> · <Link href="/analyse/aktien/AAPL" className="text-emerald-400/50 hover:text-emerald-400/80">Finclue News</Link></>
              )}
            </p>
          )}
        </div>

        {/* Sector Performance */}
        <div className="bg-[#111119] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold text-white/80">Sector Performance</h2>
            <span className="text-[10px] text-white/35">% Tagesveränderung</span>
          </div>
          {market?.sectors && market.sectors.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {market.sectors.map(s => (
                <div key={s.symbol} className="flex items-center justify-between py-1">
                  <span className="text-[12px] text-white/50">{s.nameDE}</span>
                  <span className={`text-[12px] font-semibold tabular-nums ${
                    s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
              <div className="col-span-2 border-t border-white/[0.04] mt-1 pt-2 flex items-center justify-between">
                <span className="text-[12px] text-white/70 font-medium">Alle Sektoren</span>
                <span className={`text-[12px] font-bold tabular-nums ${
                  market.allSectorsChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {market.allSectorsChange >= 0 ? '+' : ''}{market.allSectorsChange.toFixed(2)}%
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-white/25">Lade Sektoren...</p>
          )}
        </div>
      </div>

      {/* ── Row 2: Markets ──────────────────────────────────────── */}
      <div className="px-5 mt-6">
        <h2 className="text-[16px] font-semibold text-white/80 mb-4">Markets</h2>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Index-Liste (links) */}
          <div className="lg:col-span-2 bg-[#111119] border border-white/[0.06] rounded-2xl overflow-hidden">
            {market?.indices.map((idx, i) => (
              <button
                key={idx.symbol}
                onClick={() => setSelectedIndex(idx.symbol)}
                className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${
                  selectedIndex === idx.symbol ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                } ${i > 0 ? 'border-t border-white/[0.03]' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[13px]">{idx.flag}</span>
                  <span className={`text-[13px] font-medium ${selectedIndex === idx.symbol ? 'text-white' : 'text-white/60'}`}>
                    {idx.nameDE}
                  </span>
                  <TimestampDot ts={idx.timestamp} />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-white/50 tabular-nums">{fmtPrice(idx.price)}</span>
                  <span className={`text-[11px] font-medium tabular-nums ${idx.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {idx.changePercent >= 0 ? '+' : ''}{idx.change.toFixed(2)}
                  </span>
                  <PctBadge value={idx.changePercent} />
                </div>
              </button>
            ))}

            {/* Commodities */}
            {market?.commodities && market.commodities.length > 0 && (
              <>
                <div className="border-t border-white/[0.06] px-5 py-2">
                  <span className="text-[10px] text-white/35 uppercase tracking-wider">Rohstoffe</span>
                </div>
                {market.commodities.map(c => (
                  <button
                    key={c.symbol}
                    onClick={() => setSelectedIndex(c.symbol)}
                    className={`w-full flex items-center justify-between px-5 py-2.5 border-t border-white/[0.03] transition-colors ${
                      selectedIndex === c.symbol ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`text-[13px] ${selectedIndex === c.symbol ? 'text-white' : 'text-white/60'}`}>
                        {c.nameDE}
                      </span>
                      <TimestampDot ts={c.timestamp} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] text-white/50 tabular-nums">{fmtPrice(c.price)}</span>
                      <span className={`text-[11px] font-medium tabular-nums ${c.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {c.changePercent >= 0 ? '+' : ''}{c.change.toFixed(2)}
                      </span>
                      <PctBadge value={c.changePercent} />
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Ausgewählter Index Detail (rechts) mit echtem Chart */}
          <div className="lg:col-span-3 bg-[#111119] border border-white/[0.06] rounded-2xl p-5">
            {selectedIdx ? (
              <IndexChart
                indexSymbol={selectedIdx.symbol}
                label={selectedIdx.name}
                flag={selectedIdx.flag ?? ''}
                quote={{
                  price: selectedIdx.price,
                  change: selectedIdx.change,
                  changePercent: selectedIdx.changePercent,
                  previousClose: selectedIdx.previousClose,
                  dayHigh: selectedIdx.dayHigh,
                  dayLow: selectedIdx.dayLow,
                }}
              />
            ) : (
              <p className="text-[13px] text-white/25">Wähle einen Index</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Portfolio (wenn eingeloggt) ──────────────────── */}
      {isLoggedIn && portfolio.length > 0 && (
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-white/80">Mein Portfolio</h2>
            <Link href="/analyse/mein-portfolio" className="text-[11px] text-white/25 hover:text-white/50 transition-colors">
              Details →
            </Link>
          </div>
          <div className="bg-[#111119] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-baseline gap-3 mb-4">
              <p className="text-[24px] font-bold text-white tabular-nums">{fmtLarge(portfolioValue)} $</p>
              <span className={`text-[13px] font-semibold ${portfolioChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {portfolioChange >= 0 ? '+' : ''}{fmtLarge(portfolioChange)} $
              </span>
            </div>
            <div className="space-y-1">
              {portfolio.slice(0, 6).map(h => (
                <Link key={h.symbol} href={`/analyse/aktien/${h.symbol}`}
                  className="flex items-center justify-between py-2 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white/40">{h.symbol.slice(0, 2)}</span>
                    </div>
                    <span className="text-[13px] font-medium text-white/70">{h.symbol}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] text-white/50 tabular-nums">{fmtPrice(h.currentPrice || h.purchase_price)}</span>
                    <PctBadge value={h.changePercent || 0} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="h-8" />
    </div>
  )
}
