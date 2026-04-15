// /analyse/kalendar – Fey-Style Earnings Calendar
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface EarningsEvent {
  ticker: string; company: string; time: string
  fiscalQuarter: number | null; fiscalYear: number | null
  epsEstimate: number | null; epsActual: number | null
  revenueEstimate: number | null; revenueActual: number | null
  result: 'beat' | 'miss' | 'meet' | null
}

interface CalendarDay { date: string; events: EarningsEvent[] }

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function fmtRev(v: number | null): string {
  if (!v) return '–'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace('.', ',')} Mrd.`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)} Mio.`
  return v.toLocaleString('de-DE')
}

export default function EarningsCalendarPage() {
  const router = useRouter()
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  useEffect(() => {
    setLoading(true)
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

    fetch(`/api/v1/calendar/earnings?from=${from}&to=${to}&limit=500`)
      .then(r => r.ok ? r.json() : { dates: [] })
      .then(d => setData(d.dates || []))
      .finally(() => setLoading(false))
  }, [month, year])

  // Kalender-Grid
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 // Mo=0

  const dayMap = new Map<string, CalendarDay>()
  data.forEach(d => dayMap.set(d.date, d))

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-[#06060e] flex flex-col">
      {/* Header */}
      <header className="px-6 sm:px-10 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Link href="/analyse/home" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
            <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Earnings Kalender</h1>
            <p className="text-[12px] text-white/30">Quartalszahlen-Termine</p>
          </div>
        </div>
      </header>

      {/* Month Navigation */}
      <div className="px-6 sm:px-10 py-3 max-w-7xl mx-auto w-full flex items-center justify-between">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
          <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-[15px] font-semibold text-white">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors">
          <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="px-6 sm:px-10 pb-24 max-w-7xl mx-auto w-full">
        {/* Weekday headers */}
        <div className="grid grid-cols-5 gap-1 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] text-white/20 py-2 font-medium">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1">
            {/* Offset für den Wochentag des 1. */}
            {Array.from({ length: Math.min(offset, 4) }).map((_, i) => (
              <div key={`off-${i}`} className="min-h-[120px]" />
            ))}

            {/* Tage (nur Mo-Fr) */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayOfWeek = new Date(year, month, day).getDay()

              // Wochenenden überspringen
              if (dayOfWeek === 0 || dayOfWeek === 6) return null

              const calDay = dayMap.get(dateStr)
              const isToday = dateStr === today
              const eventCount = calDay?.events.length || 0

              return (
                <div
                  key={day}
                  onClick={() => calDay && setSelectedDay(calDay)}
                  className={`min-h-[120px] rounded-xl p-2 transition-all cursor-pointer ${
                    isToday ? 'bg-white/[0.06] border border-white/[0.1]' : 'bg-[#0c0c16] border border-white/[0.03] hover:border-white/[0.06]'
                  }`}
                >
                  <p className={`text-[11px] font-medium mb-1.5 ${isToday ? 'text-white' : 'text-white/30'}`}>{day}</p>
                  <div className="space-y-0.5">
                    {calDay?.events.slice(0, 4).map((e, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold ${
                          e.result === 'beat' ? 'text-emerald-400' : e.result === 'miss' ? 'text-red-400' : 'text-white/50'
                        }`}>{e.ticker}</span>
                        {e.result && (
                          <span className={`text-[8px] px-1 rounded ${
                            e.result === 'beat' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>{e.result === 'beat' ? 'Beat' : 'Miss'}</span>
                        )}
                      </div>
                    ))}
                    {eventCount > 4 && (
                      <p className="text-[8px] text-white/15">+{eventCount - 4} more</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]" onClick={() => setSelectedDay(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="bg-[#111119] border border-white/[0.1] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden max-h-[70vh] flex flex-col">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div>
                  <p className="text-[15px] font-semibold text-white">
                    {new Date(selectedDay.date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-[11px] text-white/25">{selectedDay.events.length} Earnings</p>
                </div>
                <button onClick={() => setSelectedDay(null)} className="text-white/30 hover:text-white/60">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto p-3 space-y-1">
                {selectedDay.events.map((e, i) => (
                  <button
                    key={i}
                    onClick={() => { router.push(`/analyse/aktien/${e.ticker}`); setSelectedDay(null) }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white/40">{e.ticker.slice(0, 2)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-white/80">{e.ticker}</span>
                          {e.result && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              e.result === 'beat' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>{e.result === 'beat' ? 'Beat' : 'Miss'}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/20 truncate max-w-[200px]">{e.company}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {e.epsActual !== null ? (
                        <p className="text-[12px] text-white/60">EPS: {e.epsActual.toFixed(2).replace('.', ',')} $</p>
                      ) : e.epsEstimate !== null ? (
                        <p className="text-[11px] text-white/25">Est: {e.epsEstimate.toFixed(2).replace('.', ',')} $</p>
                      ) : null}
                      {e.time && e.time !== 'unknown' && (
                        <p className="text-[9px] text-white/12">{e.time === 'bmo' ? 'Vor Börse' : e.time === 'amc' ? 'Nach Börse' : e.time}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
