// /analyse/maerkte – Fey-Style Märkte & Wirtschaftskalender
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'

interface EconomicEvent {
  date: string; time: string | null; name: string; nameDE: string
  country: string; category: string; impact: string
  description: string; actual: number | null; forecast: number | null; previous: number | null
}

interface CalendarDay { date: string; events: EconomicEvent[] }

interface FredData {
  nameDE: string; unit?: string; observations: { date: string; value: number }[]
}

const TT: React.CSSProperties = {
  backgroundColor: 'rgba(6,6,14,0.96)', border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px', padding: '10px 14px', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
}

// ─── Expand Modal for Charts ─────────────────────────────────────────────────

function ChartExpandModal({ data, title, unit, onClose }: {
  data: { date: string; value: number }[]
  title: string; unit: string; onClose: () => void
}) {
  const [timeframe, setTimeframe] = useState<number>(36) // Monate
  const filtered = data.slice(-timeframe)
  const latest = filtered[filtered.length - 1]
  const first = filtered[0]
  const change = latest && first ? ((latest.value - first.value) / Math.abs(first.value)) * 100 : null
  const isPercent = unit === 'percent' || title.includes('quote') || title.includes('zins') || title.includes('Rendite')

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        <div className="bg-[#0c0c16] border border-white/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 flex items-start justify-between">
            <div>
              <p className="text-[15px] font-semibold text-white">{title}</p>
              <div className="flex items-baseline gap-3 mt-1">
                <p className="text-3xl font-bold text-white">
                  {isPercent ? `${latest?.value.toFixed(2).replace('.', ',')}%` : latest?.value.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                </p>
                {change !== null && (
                  <span className={`text-[12px] font-bold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1).replace('.', ',')}% ({timeframe}M)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/20 mt-0.5">{latest?.date} · {filtered.length} Datenpunkte</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Timeframe Buttons */}
              {[
                { label: '1J', months: 12 },
                { label: '3J', months: 36 },
                { label: '5J', months: 60 },
                { label: 'Max', months: 999 },
              ].map(t => (
                <button key={t.label} onClick={() => setTimeframe(t.months)}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                    timeframe === t.months ? 'bg-white/[0.08] text-white' : 'text-white/25 hover:text-white/50'
                  }`}>{t.label}</button>
              ))}
              <button onClick={onClose} className="ml-2 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
                <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Large Chart */}
          <div className="px-6 pb-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filtered} margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
                <defs>
                  <linearGradient id="expandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} tickLine={false}
                  interval={Math.max(Math.floor(filtered.length / 8), 1)}
                  tickFormatter={d => new Date(d).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.15)' }} axisLine={false} tickLine={false} width={50}
                  tickFormatter={v => isPercent ? `${v}%` : v.toLocaleString('de-DE')}
                  domain={['dataMin', 'dataMax']} />
                <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.06)' }} content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const v = payload[0].value as number
                  const d = payload[0].payload.date
                  return (<div style={TT}>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                      {new Date(d).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginTop: '2px' }}>
                      {isPercent ? `${v.toFixed(2).replace('.', ',')}%` : v.toLocaleString('de-DE', { maximumFractionDigits: 2 })}
                    </p>
                  </div>)
                }} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#expandGrad)"
                  dot={false} activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

const IMPACT_COLORS = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-white/[0.04] text-white/30 border-white/[0.06]',
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', DE: '🇩🇪', UK: '🇬🇧', CN: '🇨🇳', JP: '🇯🇵',
}

function ChartExpandModalWrapper({ seriesKey, initialData, onClose }: {
  seriesKey: string; initialData: FredData; onClose: () => void
}) {
  const [data, setData] = useState(initialData)
  const [loadingMore, setLoadingMore] = useState(false)

  // Lade volle Daten (bis zu 500 Punkte) beim Öffnen
  useEffect(() => {
    setLoadingMore(true)
    fetch(`/api/v1/economic/${seriesKey}?limit=300`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.observations) setData(d) })
      .finally(() => setLoadingMore(false))
  }, [seriesKey])

  return <ChartExpandModal
    data={data.observations || []}
    title={data.nameDE}
    unit={data.unit || ''}
    onClose={onClose}
  />
}

export default function MaerktePage() {
  const [events, setEvents] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [newsRecap, setNewsRecap] = useState<string>('')
  const [fredData, setFredData] = useState<Record<string, FredData>>({})
  const [activeTab, setActiveTab] = useState<'maerkte' | 'kalender' | 'indikatoren'>('maerkte')
  const [expandChart, setExpandChart] = useState<{ key: string; data: FredData } | null>(null)
  const [marketIndices, setMarketIndices] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const in30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    Promise.all([
      fetch(`/api/v1/calendar/economic?from=${today}&to=${in30d}`).then(r => r.ok ? r.json() : { dates: [] }),
      fetch(`/api/v1/news/recap?type=morning`).then(r => r.ok ? r.json() : null),
      fetch('/api/dashboard-cached').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/v1/markets').then(r => r.ok ? r.json() : null).catch(() => null),
      // FRED Daten parallel laden
      ...['cpi', 'unemployment', 'fed_funds', 'treasury_10y', 'gdp_growth', 'consumer_sentiment', 'ecb_rate', 'eu_unemployment', 'de_unemployment'].map(
        s => fetch(`/api/v1/economic/${s}?limit=36`).then(r => r.ok ? r.json() : null).catch(() => null)
      ),
    ]).then(([cal, recap, dashData, marketsData, ...fredResults]) => {
      setEvents(cal.dates || [])
      if (recap?.content) setNewsRecap(recap.content)

      // Market Indices zusammenbauen
      const indices: any[] = []
      if (dashData?.markets) {
        const m = dashData.markets
        const defs = [
          { key: 'spx', name: 'S&P 500', flag: '🇺🇸' },
          { key: 'ixic', name: 'NASDAQ 100', flag: '🇺🇸' },
          { key: 'dji', name: 'Dow Jones', flag: '🇺🇸' },
          { key: 'dax', name: 'DAX', flag: '🇩🇪' },
          { key: 'stoxx', name: 'STOXX 600', flag: '🇪🇺' },
        ]
        defs.forEach(d => {
          if (m[d.key]) indices.push({ ...d, ...m[d.key], type: 'index' })
        })
        const comDefs = [
          { key: 'btc', name: 'Bitcoin', flag: '₿' },
          { key: 'gold', name: 'Gold', flag: '🥇' },
          { key: 'silver', name: 'Silber', flag: '🥈' },
          { key: 'oil', name: 'Öl (Brent)', flag: '🛢️' },
        ]
        comDefs.forEach(d => {
          if (m[d.key]) indices.push({ ...d, ...m[d.key], type: 'commodity' })
        })
      }
      setMarketIndices({ indices, sectors: marketsData?.sectors || [], allSectorsChange: marketsData?.allSectorsChange || 0 })

      const fredMap: Record<string, FredData> = {}
      const keys = ['cpi', 'unemployment', 'fed_funds', 'treasury_10y', 'gdp_growth', 'consumer_sentiment', 'ecb_rate', 'eu_unemployment', 'de_unemployment']
      keys.forEach((key, i) => {
        if (fredResults[i]) fredMap[key] = fredResults[i]
      })
      setFredData(fredMap)
    }).finally(() => setLoading(false))
  }, [])

  const filteredEvents = events.map(day => ({
    ...day,
    events: day.events.filter(e => {
      if (filter === 'high') return e.impact === 'high'
      if (filter === 'US' || filter === 'EU' || filter === 'DE') return e.country === filter
      return true
    }),
  })).filter(day => day.events.length > 0)

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Link href="/analyse/home" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Märkte</h1>
            <p className="text-[12px] text-white/30">Wirtschaftskalender & Marktüberblick</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 sm:px-10 pb-24 max-w-6xl mx-auto w-full space-y-6">
        {/* Morning Recap */}
        {newsRecap && (
          <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
            <p className="text-[11px] text-white/20 uppercase tracking-wider mb-3">Marktüberblick</p>
            <div className="text-[13px] text-white/50 leading-relaxed whitespace-pre-line">
              {newsRecap.split('\n').filter(l => !l.startsWith('##') && !l.startsWith('**Top') && !l.startsWith('**Was')).slice(0, 4).join('\n').replace(/\*\*/g, '').replace(/\*Marktüberblick\*/, '').trim().slice(0, 300)}
            </div>
          </div>
        )}

        {/* Tabs: Kalender / Indikatoren */}
        <div className="flex gap-1 border-b border-white/[0.03] mb-4">
          {[
            { key: 'maerkte' as const, label: 'Märkte' },
            { key: 'kalender' as const, label: 'Wirtschaftskalender' },
            { key: 'indikatoren' as const, label: 'Wirtschaftsindikatoren' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-[13px] font-medium relative transition-colors ${
                activeTab === t.key ? 'text-white' : 'text-white/20 hover:text-white/40'
              }`}>
              {t.label}
              {activeTab === t.key && <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-white rounded-full" />}
            </button>
          ))}
        </div>

        {activeTab === 'maerkte' ? (
          /* ── Märkte Übersicht (Indizes + Sektoren) ──────────── */
          <div className="space-y-6">
            {/* Sector Performance */}
            {marketIndices?.sectors?.length > 0 && (
              <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-semibold text-white/80">Sektor-Performance</h3>
                  <span className={`text-[12px] font-semibold ${(marketIndices.allSectorsChange || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    Alle Sektoren: {(marketIndices.allSectorsChange || 0) >= 0 ? '+' : ''}{(marketIndices.allSectorsChange || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {marketIndices.sectors.map((s: any) => (
                    <div key={s.symbol} className="bg-white/[0.02] rounded-xl px-4 py-3 border border-white/[0.03]">
                      <p className="text-[12px] text-white/50 truncate">{s.nameDE}</p>
                      <p className={`text-[15px] font-bold tabular-nums mt-1 ${s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {s.changePercent >= 0 ? '+' : ''}{s.changePercent?.toFixed(2)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indizes Tabelle */}
            {marketIndices?.indices?.length > 0 && (
              <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.03]">
                  <h3 className="text-[14px] font-semibold text-white/80">Indizes & Rohstoffe</h3>
                  <p className="text-[11px] text-white/20 mt-0.5">Stand: {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                </div>
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-12 px-5 py-2 text-[10px] text-white/20 uppercase tracking-wider font-medium border-b border-white/[0.03]">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2 text-right">Kurs</div>
                  <div className="col-span-2 text-right">24h %</div>
                  <div className="col-span-3 text-center">Tagesrange</div>
                  <div className="col-span-2 text-right">Status</div>
                </div>
                {/* Indizes */}
                {marketIndices.indices.filter((i: any) => i.type === 'index').length > 0 && (
                  <>
                    <div className="px-5 py-2 text-[10px] text-white/15 uppercase tracking-widest">Indizes</div>
                    {marketIndices.indices.filter((i: any) => i.type === 'index').map((idx: any) => {
                      const pct = idx.changePct || idx.changePercent || 0
                      const range = idx.high && idx.low ? ((idx.price - idx.low) / (idx.high - idx.low)) * 100 : 50
                      return (
                        <div key={idx.key} className="grid grid-cols-12 items-center px-5 py-3 border-t border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                          <div className="col-span-3 flex items-center gap-2.5">
                            <span className="text-[14px]">{idx.flag}</span>
                            <span className="text-[13px] font-medium text-white/80">{idx.name}</span>
                          </div>
                          <div className="col-span-2 text-right text-[13px] text-white/70 tabular-nums font-medium">
                            {idx.price >= 10000 ? idx.price.toLocaleString('de-DE', { maximumFractionDigits: 0 }) : idx.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="col-span-2 text-right">
                            <span className={`text-[12px] font-semibold tabular-nums ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                            </span>
                          </div>
                          <div className="col-span-3 px-2">
                            {idx.high && idx.low ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/15 tabular-nums">{idx.low.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</span>
                                <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500/50" style={{ width: `${Math.max(2, Math.min(98, range))}%` }} />
                                </div>
                                <span className="text-[10px] text-white/15 tabular-nums">{idx.high.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</span>
                              </div>
                            ) : (
                              <div className="h-1 bg-white/[0.04] rounded-full" />
                            )}
                          </div>
                          <div className="col-span-2 text-right">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">Open</span>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
                {/* Rohstoffe */}
                {marketIndices.indices.filter((i: any) => i.type === 'commodity').length > 0 && (
                  <>
                    <div className="px-5 py-2 text-[10px] text-white/15 uppercase tracking-widest border-t border-white/[0.04]">Rohstoffe & Crypto</div>
                    {marketIndices.indices.filter((i: any) => i.type === 'commodity').map((c: any) => {
                      const pct = c.changePct || c.changePercent || 0
                      const range = c.high && c.low ? ((c.price - c.low) / (c.high - c.low)) * 100 : 50
                      return (
                        <div key={c.key} className="grid grid-cols-12 items-center px-5 py-3 border-t border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                          <div className="col-span-3 flex items-center gap-2.5">
                            <span className="text-[14px]">{c.flag}</span>
                            <span className="text-[13px] font-medium text-white/80">{c.name}</span>
                          </div>
                          <div className="col-span-2 text-right text-[13px] text-white/70 tabular-nums font-medium">
                            {c.price >= 10000 ? c.price.toLocaleString('de-DE', { maximumFractionDigits: 0 }) : c.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="col-span-2 text-right">
                            <span className={`text-[12px] font-semibold tabular-nums ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                            </span>
                          </div>
                          <div className="col-span-3 px-2">
                            {c.high && c.low ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/15 tabular-nums">{c.low.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</span>
                                <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-emerald-500/50" style={{ width: `${Math.max(2, Math.min(98, range))}%` }} />
                                </div>
                                <span className="text-[10px] text-white/15 tabular-nums">{c.high.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</span>
                              </div>
                            ) : (
                              <div className="h-1 bg-white/[0.04] rounded-full" />
                            )}
                          </div>
                          <div className="col-span-2 text-right">
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">Open</span>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'indikatoren' ? (
          /* ── Wirtschaftsindikatoren (FRED Charts) ──────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(fredData).map(([key, data]) => {
              const obs = data.observations
              if (!obs || obs.length === 0) return null
              const latest = obs[obs.length - 1]
              const prev = obs[obs.length - 2]
              const change = latest && prev ? latest.value - prev.value : null
              const isPercent = data.nameDE.includes('quote') || data.nameDE.includes('zins') || data.nameDE.includes('Wachstum') || data.nameDE.includes('Rendite') || data.nameDE.includes('Sentiment') || key.includes('rate') || key.includes('funds') || key.includes('treasury') || key === 'unemployment' || key === 'gdp_growth' || key.includes('inflation')

              // Region bestimmen
              const region = key.startsWith('de_') ? '🇩🇪' : key.startsWith('eu_') || key.startsWith('ecb') ? '🇪🇺' : '🇺🇸'

              return (
                <div key={key} className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5 cursor-pointer hover:border-white/[0.08] transition-all group"
                  onClick={() => setExpandChart({ key, data })}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="text-[11px] text-white/25 font-medium">
                        <span className="mr-1.5">{region}</span>{data.nameDE}
                      </p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {isPercent ? `${latest.value.toFixed(1).replace('.', ',')}%` : latest.value.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                      </p>
                    </div>
                    {change !== null && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        (key === 'unemployment' ? change <= 0 : change >= 0)
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {change >= 0 ? '+' : ''}{isPercent ? `${change.toFixed(1).replace('.', ',')} Pp.` : change.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] text-white/12">{latest.date}</p>
                    <svg className="w-3.5 h-3.5 text-white/10 group-hover:text-white/30 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  </div>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={obs} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id={`fred-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.1)' }} axisLine={false} tickLine={false} interval={Math.floor(obs.length / 4)} tickFormatter={d => d.slice(0, 7)} />
                        <YAxis hide domain={['dataMin', 'dataMax']} />
                        <Tooltip cursor={false} content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const v = payload[0].value as number
                          const d = payload[0].payload.date
                          return (<div style={TT}>
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{d}</p>
                            <p style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
                              {isPercent ? `${v.toFixed(2).replace('.', ',')}%` : v.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                            </p>
                          </div>)
                        }} />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} fill={`url(#fred-${key})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <>
        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'high', label: 'Wichtig' },
            { key: 'US', label: '🇺🇸 USA' },
            { key: 'EU', label: '🇪🇺 Eurozone' },
            { key: 'DE', label: '🇩🇪 Deutschland' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                filter === f.key
                  ? 'bg-white/[0.08] text-white/80'
                  : 'bg-white/[0.02] text-white/25 hover:text-white/40'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/20 text-[14px]">Keine Wirtschaftstermine im gewählten Zeitraum</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map(day => {
              const isToday = day.date === today
              const dateObj = new Date(day.date)
              const dateLabel = dateObj.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

              return (
                <div key={day.date}>
                  <div className="flex items-center gap-3 mb-2">
                    <p className={`text-[12px] font-medium ${isToday ? 'text-white' : 'text-white/30'}`}>
                      {isToday ? 'Heute' : dateLabel}
                    </p>
                    {isToday && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  </div>
                  <div className="space-y-1.5">
                    {day.events.map((event, i) => (
                      <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl bg-[#0c0c16] border border-white/[0.03] hover:border-white/[0.06] transition-colors">
                        {/* Time */}
                        <div className="w-12 text-center flex-shrink-0">
                          <p className="text-[11px] text-white/20 font-mono">{event.time || '–'}</p>
                        </div>

                        {/* Country Flag */}
                        <span className="text-base flex-shrink-0">{COUNTRY_FLAGS[event.country] || '🌐'}</span>

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-white/70 font-medium">{event.nameDE}</p>
                          <p className="text-[10px] text-white/20 mt-0.5">{event.description}</p>
                        </div>

                        {/* Impact Badge */}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${IMPACT_COLORS[event.impact as keyof typeof IMPACT_COLORS] || IMPACT_COLORS.low}`}>
                          {event.impact === 'high' ? 'HOCH' : event.impact === 'medium' ? 'MITTEL' : 'NIEDRIG'}
                        </span>

                        {/* Values */}
                        {(event.actual !== null || event.forecast !== null) && (
                          <div className="text-right flex-shrink-0">
                            {event.actual !== null && <p className="text-[12px] text-white/60 font-medium">{event.actual}</p>}
                            {event.forecast !== null && <p className="text-[10px] text-white/20">Prognose: {event.forecast}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
          </>
        )}
      </main>

      {/* Chart Expand Modal */}
      {expandChart && (() => {
        // Lade mehr Daten für den expandierten Chart
        return <ChartExpandModalWrapper
          seriesKey={expandChart.key}
          initialData={expandChart.data}
          onClose={() => setExpandChart(null)}
        />
      })()}

    </div>
  )
}
