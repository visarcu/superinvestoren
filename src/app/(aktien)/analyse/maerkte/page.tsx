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
  const [activeTab, setActiveTab] = useState<'kalender' | 'indikatoren'>('kalender')
  const [expandChart, setExpandChart] = useState<{ key: string; data: FredData } | null>(null)

  useEffect(() => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const in30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    Promise.all([
      fetch(`/api/v1/calendar/economic?from=${today}&to=${in30d}`).then(r => r.ok ? r.json() : { dates: [] }),
      fetch(`/api/v1/news/recap?type=morning`).then(r => r.ok ? r.json() : null),
      // FRED Daten parallel laden
      ...['cpi', 'unemployment', 'fed_funds', 'treasury_10y', 'gdp_growth', 'consumer_sentiment', 'ecb_rate', 'eu_unemployment', 'de_unemployment'].map(
        s => fetch(`/api/v1/economic/${s}?limit=36`).then(r => r.ok ? r.json() : null).catch(() => null)
      ),
    ]).then(([cal, recap, ...fredResults]) => {
      setEvents(cal.dates || [])
      if (recap?.content) setNewsRecap(recap.content)

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
          <Link href="/analyse" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
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

        {activeTab === 'indikatoren' ? (
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
          <div className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl bg-white/[0.06]">
            <svg className="w-[18px] h-[18px] text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-[9px] text-white/50">Märkte</span>
          </div>
        </nav>
      </div>
    </div>
  )
}
