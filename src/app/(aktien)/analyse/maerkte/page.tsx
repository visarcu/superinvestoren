// /analyse/maerkte – Fey-Style Märkte & Wirtschaftskalender
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface EconomicEvent {
  date: string; time: string | null; name: string; nameDE: string
  country: string; category: string; impact: string
  description: string; actual: number | null; forecast: number | null; previous: number | null
}

interface CalendarDay { date: string; events: EconomicEvent[] }

const IMPACT_COLORS = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-white/[0.04] text-white/30 border-white/[0.06]',
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', DE: '🇩🇪', UK: '🇬🇧', CN: '🇨🇳', JP: '🇯🇵',
}

export default function MaerktePage() {
  const [events, setEvents] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all') // all, high, US, EU, DE
  const [newsRecap, setNewsRecap] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    const today = new Date().toISOString().slice(0, 10)
    const in30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    Promise.all([
      fetch(`/api/v1/calendar/economic?from=${today}&to=${in30d}`).then(r => r.ok ? r.json() : { dates: [] }),
      fetch(`/api/v1/news/recap?type=morning`).then(r => r.ok ? r.json() : null),
    ]).then(([cal, recap]) => {
      setEvents(cal.dates || [])
      if (recap?.content) setNewsRecap(recap.content)
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
      </main>

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
