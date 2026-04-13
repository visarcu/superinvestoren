// /analyse/dividenden/[ticker] – Fey-Style Dividenden-Analyse
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip,
} from 'recharts'

interface AnnualDiv { year: number; totalDividend: number; growthPercent: number | null; quartersReported: number }
interface QuarterlyDiv { endDate: string; amount: number; fiscalQuarter: string; calendarYear: number }
interface CAGR { period: string; years: number; cagr: number; startValue: number; endValue: number }
interface Payout { year: number; dividendPerShare: number; eps: number; payoutRatio: number }

const TT: React.CSSProperties = {
  backgroundColor: 'rgba(6,6,14,0.96)', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px', padding: '10px 14px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
}

export default function DividendenPage() {
  const params = useParams()
  const router = useRouter()
  const ticker = (params.ticker as string)?.toUpperCase() || 'MSFT'

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ ticker: string; name: string; exchange: string }[]>([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const searchRef = React.useRef<HTMLInputElement>(null)

  // Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); setSearch(''); setSearchResults([]); setTimeout(() => searchRef.current?.focus(), 50) }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Live search
  useEffect(() => {
    if (!search || search.length < 1) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      try { const r = await fetch(`/api/v1/companies?search=${encodeURIComponent(search)}&pageSize=6`); if (r.ok) { const d = await r.json(); setSearchResults(d.data || []); setSelectedIdx(0) } } catch {}
    }, 150)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/v1/dividends/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/company/${ticker}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([d, p]) => {
      setData(d)
      if (p && !p.error) setProfile(p)
    }).finally(() => setLoading(false))
  }, [ticker])

  const annuals: AnnualDiv[] = data?.annualDividends || []
  const quarterlys: QuarterlyDiv[] = data?.quarterlyDividends || []
  const cagrs: CAGR[] = data?.cagr || []
  const payouts: Payout[] = data?.payoutHistory || []

  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <img src={`/api/v1/logo/${ticker}?size=80`} alt="" className="w-10 h-10 rounded-xl bg-white/[0.06] object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-lg font-bold text-white">{ticker}</h1>
              <span className="text-[11px] text-white/20">Dividenden</span>
            </div>
            <p className="text-[12px] text-white/30">{profile?.name || '...'}</p>
          </div>
        </div>
        <Link href={`/analyse/aktien/${ticker}`} className="text-[12px] text-white/25 hover:text-white/50 transition-colors">
          Zur Übersicht →
        </Link>
      </header>

      <main className="flex-1 px-6 sm:px-10 py-6 pb-24 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : !data || annuals.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-white/20 text-[14px]">{ticker} zahlt keine Dividende</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
                <p className="text-[10px] text-white/25 mb-1">Jahresdividende</p>
                <p className="text-2xl font-bold text-white">{data.currentAnnualDividend?.toFixed(2).replace('.', ',')} $</p>
              </div>
              <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
                <p className="text-[10px] text-white/25 mb-1">Steigerung in Folge</p>
                <p className="text-2xl font-bold text-emerald-400">{data.consecutiveYearsGrowth} Jahre</p>
              </div>
              {cagrs.find(c => c.years === 5) && (
                <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
                  <p className="text-[10px] text-white/25 mb-1">CAGR (5 Jahre)</p>
                  <p className="text-2xl font-bold text-white">{cagrs.find(c => c.years === 5)!.cagr.toFixed(1).replace('.', ',')}%</p>
                </div>
              )}
              {payouts.length > 0 && (
                <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
                  <p className="text-[10px] text-white/25 mb-1">Payout Ratio</p>
                  <p className="text-2xl font-bold text-white">{payouts[payouts.length - 1].payoutRatio.toFixed(1).replace('.', ',')}%</p>
                </div>
              )}
            </div>

            {/* Annual Dividend Chart */}
            <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6">
              <p className="text-[11px] text-white/25 font-medium mb-1">Dividende je Aktie (jährlich)</p>
              <p className="text-2xl font-bold text-white mb-4">{data.currentAnnualDividend?.toFixed(2).replace('.', ',')} $</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={annuals.slice(-15)} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.18)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (<div style={TT}>
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{d.year}</p>
                        <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{d.totalDividend.toFixed(4).replace('.', ',')} $</p>
                        {d.growthPercent !== null && (
                          <p style={{ color: d.growthPercent >= 0 ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 600 }}>
                            {d.growthPercent >= 0 ? '+' : ''}{d.growthPercent.toFixed(1).replace('.', ',')}%
                          </p>
                        )}
                      </div>)
                    }} />
                    <Bar dataKey="totalDividend" fill="#22c55e" opacity={0.75} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CAGR + Payout Ratio */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* CAGR */}
              <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
                <p className="text-[11px] text-white/25 font-medium mb-4">Dividendenwachstum (CAGR)</p>
                <div className="space-y-3">
                  {cagrs.map(c => (
                    <div key={c.period} className="flex items-center justify-between">
                      <span className="text-[12px] text-white/30">{c.period}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-white/15">
                          {c.startValue.toFixed(2).replace('.', ',')} → {c.endValue.toFixed(2).replace('.', ',')} $
                        </span>
                        <span className={`text-[13px] font-bold ${c.cagr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {c.cagr >= 0 ? '+' : ''}{c.cagr.toFixed(1).replace('.', ',')}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payout Ratio Chart */}
              {payouts.length > 0 && (
                <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
                  <p className="text-[11px] text-white/25 font-medium mb-4">Payout Ratio (Dividende / Gewinn)</p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={payouts.slice(-10)} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.18)' }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0].payload
                          return (<div style={TT}>
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{d.year}</p>
                            <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>Payout: {d.payoutRatio.toFixed(1).replace('.', ',')}%</p>
                            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>
                              Div: {d.dividendPerShare.toFixed(2).replace('.', ',')} $ / EPS: {d.eps.toFixed(2).replace('.', ',')} $
                            </p>
                          </div>)
                        }} />
                        <Bar dataKey="payoutRatio" fill="#8b5cf6" opacity={0.7} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Quarterly Timeline */}
            {quarterlys.length > 0 && (
              <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
                <p className="text-[11px] text-white/25 font-medium mb-4">Quartalsdividenden</p>
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quarterlys.slice(-20)} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
                      <XAxis
                        dataKey="endDate"
                        tickFormatter={d => { const dt = new Date(d); return `Q${Math.ceil((dt.getMonth() + 1) / 3)} ${dt.getFullYear().toString().slice(2)}` }}
                        tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false}
                        interval={1}
                      />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        return (<div style={TT}>
                          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{d.fiscalQuarter} {d.calendarYear}</p>
                          <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>{d.amount.toFixed(4).replace('.', ',')} $</p>
                        </div>)
                      }} />
                      <Bar dataKey="amount" fill="#22d3ee" opacity={0.65} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Annual History Table */}
            <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
              <p className="text-[11px] text-white/25 font-medium mb-4">Dividendenhistorie</p>
              <div className="space-y-1">
                {annuals.slice(-15).reverse().map(a => (
                  <div key={a.year} className="flex items-center justify-between py-2 border-b border-white/[0.02] last:border-0">
                    <span className="text-[13px] text-white/50">{a.year}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-[12px] text-white/70 font-medium">{a.totalDividend.toFixed(4).replace('.', ',')} $</span>
                      {a.growthPercent !== null && (
                        <span className={`text-[11px] font-semibold w-16 text-right ${
                          a.growthPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>{a.growthPercent >= 0 ? '+' : ''}{a.growthPercent.toFixed(1).replace('.', ',')}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Source */}
            <p className="text-[10px] text-white/10 text-center">
              Daten: SEC XBRL · Quelle: Finclue Data API
            </p>
          </div>
        )}
      </main>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative w-full max-w-xl mx-4" onClick={e => e.stopPropagation()}>
            <div className="bg-[#111119] border border-white/[0.1] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4">
                <svg className="w-5 h-5 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, (searchResults.length || 6) - 1)) }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
                    if (e.key === 'Enter') { const t = searchResults.length > 0 ? searchResults[selectedIdx]?.ticker : search.trim().toUpperCase(); if (t) { router.push(`/analyse/dividenden/${t}`); setSearch(''); setSearchOpen(false) } }
                    if (e.key === 'Escape') setSearchOpen(false)
                  }}
                  placeholder="Aktie suchen..." className="flex-1 bg-transparent text-[17px] text-white placeholder:text-white/25 focus:outline-none" autoFocus />
                <kbd className="text-[10px] text-white/15 bg-white/[0.05] px-2 py-1 rounded-lg border border-white/[0.06]">ESC</kbd>
              </div>
              <div className="border-t border-white/[0.05] py-2">
                {searchResults.length > 0 ? searchResults.map((r, i) => (
                  <button key={r.ticker} onClick={() => { router.push(`/analyse/dividenden/${r.ticker}`); setSearchOpen(false) }}
                    onMouseEnter={() => setSelectedIdx(i)}
                    className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors ${i === selectedIdx ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center"><span className="text-[10px] font-bold text-white/40">{r.ticker.slice(0, 2)}</span></div>
                      <div className="text-left"><p className="text-[13px] font-medium text-white/80">{r.ticker}</p><p className="text-[11px] text-white/25 truncate max-w-[280px]">{r.name}</p></div>
                    </div>
                    <span className="text-[10px] text-white/15">{r.exchange}</span>
                  </button>
                )) : <p className="text-[10px] text-white/15 uppercase tracking-widest px-5 py-2">Ticker eingeben...</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <nav className="flex items-center gap-1 bg-[#141420]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <Link href="/analyse" className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-[9px] text-white/25">Home</span>
          </Link>
          <Link href="/analyse/kalendar" className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span className="text-[9px] text-white/25">Earnings</span>
          </Link>
          <Link href={`/analyse/aktien/${ticker}`} className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-[9px] text-white/25">Aktie</span>
          </Link>
          <button onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50) }} className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <svg className="w-[18px] h-[18px] text-white/35 group-hover:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <span className="text-[9px] text-white/25">Search</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
