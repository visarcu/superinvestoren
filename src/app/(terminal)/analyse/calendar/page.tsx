// /analyse/calendar – Earnings Calendar im Terminal-Layout
//
// Identisches Verhalten zu /analyse/kalendar (v2, /(aktien) Layout):
//   • Filter-Tabs: Top / Portfolio / Watchlist / Alle (Top = >$10B Market Cap)
//   • Monat- + Wochenansicht (Mo–Fr, Wochenenden ausgeblendet)
//   • Click auf Tageskarte → Detail-Modal mit Q-Quartal, EPS-Estimate, BMO/AMC
//
// Datenquelle: /api/v1/calendar/earnings (SEC 8-K Item 2.02 + NASDAQ Public).
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

// ── Types ────────────────────────────────────────────────────────────────────

interface EarningsEvent {
  ticker: string
  company: string | null
  time: 'bmo' | 'amc' | null
  fiscalQuarter: number | null
  fiscalYear: number | null
  epsEstimate: number | null
  epsActual: number | null
  revenueEstimate: number | null
  revenueActual: number | null
  marketCap: number | null
  result: 'beat' | 'miss' | 'meet' | null
}

interface CalendarDay {
  date: string
  events: EarningsEvent[]
}

type FilterMode = 'top' | 'portfolio' | 'watchlist' | 'all'

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr']
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

const FILTER_LABELS: Record<FilterMode, string> = {
  top: 'Top Earnings',
  portfolio: 'Mein Portfolio',
  watchlist: 'Watchlist',
  all: 'Alle',
}

const MIN_MARKET_CAP_TOP = 10_000_000_000 // $10B = Mid+Large Caps
const MAX_EVENTS_PER_DAY = 5
const MAX_BIG_DAY_EVENTS = 8 // Wenn ein Tag besonders voll ist, mehr zeigen

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMarketCap(v: number | null): string {
  if (!v) return ''
  if (v >= 1e12) return `${(v / 1e12).toFixed(1).replace('.', ',')}T`
  if (v >= 1e9) return `${(v / 1e9).toFixed(0)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`
  return ''
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mondayOf(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  const dow = out.getDay() // 0=So
  const diff = dow === 0 ? -6 : 1 - dow
  out.setDate(out.getDate() + diff)
  return out
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoWeekNumber(d: Date): number {
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  // Donnerstag derselben Woche → wird für ISO-KW gebraucht
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7))
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const diff = target.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * 86_400_000))
}

// Sun-Icon (BMO = Vor Börse)
function SunIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

// Moon-Icon (AMC = Nach Börse)
function MoonIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EarningsCalendarPage() {
  const router = useRouter()
  const [view, setView] = useState<'month' | 'week'>('month')
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()))
  const [filter, setFilter] = useState<FilterMode>('top')
  const [data, setData] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([])
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // ── Lade Portfolio + Watchlist Tickers (einmalig) ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || cancelled) return
      setIsLoggedIn(true)

      // Portfolio
      const { data: pf } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_default', true)
        .single()
      if (pf?.id && !cancelled) {
        const { data: holds } = await supabase
          .from('portfolio_holdings')
          .select('symbol')
          .eq('portfolio_id', pf.id)
        if (holds && !cancelled) setPortfolioTickers(holds.map(h => h.symbol))
      }

      // Watchlist
      const { data: wl } = await supabase
        .from('watchlists')
        .select('ticker')
        .eq('user_id', session.user.id)
      if (wl && !cancelled) setWatchlistTickers(wl.map(w => w.ticker))
    })()
    return () => { cancelled = true }
  }, [])

  // ── Lade Calendar-Daten (bei Filter/View/Monats-/Wochenwechsel) ──
  useEffect(() => {
    setLoading(true)

    let from: string
    let to: string
    if (view === 'week') {
      const friday = new Date(weekStart)
      friday.setDate(weekStart.getDate() + 4)
      from = dateToIso(weekStart)
      to = dateToIso(friday)
    } else {
      from = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
    }

    const params = new URLSearchParams({ from, to, limit: '5000' })
    if (filter === 'top') {
      params.set('minMarketCap', String(MIN_MARKET_CAP_TOP))
    } else if (filter === 'portfolio') {
      if (portfolioTickers.length === 0) {
        setData([])
        setLoading(false)
        return
      }
      params.set('tickers', portfolioTickers.join(','))
    } else if (filter === 'watchlist') {
      if (watchlistTickers.length === 0) {
        setData([])
        setLoading(false)
        return
      }
      params.set('tickers', watchlistTickers.join(','))
    }
    // 'all' → keine zusätzlichen Filter

    fetch(`/api/v1/calendar/earnings?${params.toString()}`)
      .then(r => (r.ok ? r.json() : { dates: [] }))
      .then(d => setData(d.dates || []))
      .finally(() => setLoading(false))
  }, [view, month, year, weekStart, filter, portfolioTickers, watchlistTickers])

  // Kalender-Grid
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 // Mo=0

  const dayMap = useMemo(() => {
    const m = new Map<string, CalendarDay>()
    for (const d of data) m.set(d.date, d)
    return m
  }, [data])

  const today = todayIso()

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }
  const prevWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }
  const nextWeek = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }
  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return d
    })
  }, [weekStart])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — kein Back-Button (Terminal-Sidebar liefert Navigation) */}
      <header className="px-6 sm:px-10 py-4 max-w-7xl mx-auto w-full">
        <h1 className="text-lg font-bold text-theme-primary">Earnings Kalender</h1>
        <p className="text-[12px] text-theme-muted">Quartalszahlen-Termine</p>
      </header>

      {/* Filter-Tabs + View-Toggle */}
      <div className="px-6 sm:px-10 max-w-7xl mx-auto w-full flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
          {(['top', 'portfolio', 'watchlist', 'all'] as FilterMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all ${
                filter === mode
                  ? 'bg-white/[0.08] text-theme-primary'
                  : 'text-theme-muted hover:text-theme-secondary hover:bg-white/[0.03]'
              }`}
            >
              {FILTER_LABELS[mode]}
            </button>
          ))}
        </div>

        {/* View-Toggle: Monat | Woche */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all ${
              view === 'month'
                ? 'bg-white/[0.08] text-theme-primary'
                : 'text-theme-muted hover:text-theme-secondary hover:bg-white/[0.03]'
            }`}
          >
            Monat
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all ${
              view === 'week'
                ? 'bg-white/[0.08] text-theme-primary'
                : 'text-theme-muted hover:text-theme-secondary hover:bg-white/[0.03]'
            }`}
          >
            Woche
          </button>
        </div>
      </div>

      {/* Navigation: Monat oder Woche */}
      <div className="px-6 sm:px-10 py-3 max-w-7xl mx-auto w-full flex items-center justify-between">
        <button
          onClick={view === 'month' ? prevMonth : prevWeek}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
        >
          <svg className="w-4 h-4 text-theme-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        {view === 'month' ? (
          <h2 className="text-[15px] font-semibold text-theme-primary">{MONTHS[month]} {year}</h2>
        ) : (
          <div className="text-center">
            <h2 className="text-[15px] font-semibold text-theme-primary">
              KW {isoWeekNumber(weekStart)} ·{' '}
              {weekStart.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} –{' '}
              {weekDays[4].toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </h2>
          </div>
        )}
        <button
          onClick={view === 'month' ? nextMonth : nextWeek}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
        >
          <svg className="w-4 h-4 text-theme-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="px-6 sm:px-10 pb-24 max-w-7xl mx-auto w-full">
        {/* Weekday headers */}
        <div className="grid grid-cols-5 gap-1.5 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-[10px] text-theme-muted py-2 font-medium uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-5 h-5 border-2 border-white/10 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            filter={filter}
            isLoggedIn={isLoggedIn}
            hasPortfolio={portfolioTickers.length > 0}
            hasWatchlist={watchlistTickers.length > 0}
          />
        ) : view === 'week' ? (
          <div className="grid grid-cols-5 gap-2">
            {weekDays.map(d => {
              const dateStr = dateToIso(d)
              const calDay = dayMap.get(dateStr)
              const isToday = dateStr === today
              const events = calDay?.events || []
              const visible = events.slice(0, 14)
              const hidden = events.length - visible.length

              return (
                <button
                  key={dateStr}
                  onClick={() => calDay && setSelectedDay(calDay)}
                  disabled={!calDay}
                  className={`min-h-[440px] rounded-2xl p-4 text-left transition-all flex flex-col ${
                    isToday
                      ? 'bg-white/[0.04] border border-white/[0.14] hover:border-white/[0.2] hover:bg-white/[0.06] cursor-pointer'
                      : events.length > 0
                        ? 'bg-theme-card border border-white/[0.04] hover:border-white/[0.12] hover:bg-theme-hover cursor-pointer'
                        : 'bg-theme-card/50 border border-white/[0.02]'
                  }`}
                >
                  <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-white/[0.04]">
                    <div>
                      <p className="text-[10px] text-theme-muted uppercase tracking-widest font-medium">
                        {WEEKDAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}
                      </p>
                      <p className={`text-[20px] font-semibold tabular-nums leading-none mt-1 ${
                        isToday ? 'text-theme-primary' : events.length > 0 ? 'text-theme-secondary' : 'text-theme-muted'
                      }`}>
                        {d.getDate()}
                        {isToday && <span className="ml-2 text-[10px] font-normal text-theme-muted align-middle">heute</span>}
                      </p>
                    </div>
                    {events.length > 0 && (
                      <span className="text-[11px] text-theme-muted tabular-nums">{events.length}</span>
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {visible.map((e, idx) => (
                      <WeekEventRow key={`${e.ticker}-${idx}`} event={e} />
                    ))}
                    {hidden > 0 && (
                      <p className="text-[10px] text-theme-muted mt-2 pl-0.5">+{hidden} weitere</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {/* Offset für den Wochentag des 1. */}
            {Array.from({ length: Math.min(offset, 4) }).map((_, i) => (
              <div key={`off-${i}`} className="min-h-[140px]" />
            ))}

            {/* Tage (nur Mo-Fr) */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayOfWeek = new Date(year, month, day).getDay()
              if (dayOfWeek === 0 || dayOfWeek === 6) return null

              const calDay = dayMap.get(dateStr)
              const isToday = dateStr === today
              const events = calDay?.events || []
              const eventCount = events.length
              const showCount = eventCount > MAX_EVENTS_PER_DAY + 1 ? MAX_EVENTS_PER_DAY : Math.min(MAX_BIG_DAY_EVENTS, eventCount)
              const visible = events.slice(0, showCount)
              const hidden = eventCount - visible.length

              return (
                <button
                  key={day}
                  onClick={() => calDay && setSelectedDay(calDay)}
                  disabled={!calDay}
                  className={`min-h-[140px] rounded-xl p-2.5 text-left transition-all ${
                    isToday
                      ? 'bg-white/[0.04] border border-white/[0.14] hover:border-white/[0.2] hover:bg-white/[0.06] cursor-pointer'
                      : eventCount > 0
                        ? 'bg-theme-card border border-white/[0.04] hover:border-white/[0.12] hover:bg-theme-hover cursor-pointer'
                        : 'bg-theme-card/50 border border-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[11px] font-semibold ${isToday ? 'text-theme-primary' : eventCount > 0 ? 'text-theme-secondary' : 'text-theme-muted'}`}>
                      {day}
                      {isToday && <span className="ml-1 text-[9px] font-normal text-theme-muted">heute</span>}
                    </span>
                    {eventCount > 0 && (
                      <span className="text-[9px] text-theme-muted tabular-nums">{eventCount}</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {visible.map((e, idx) => (
                      <DayEventRow key={`${e.ticker}-${idx}`} event={e} />
                    ))}
                    {hidden > 0 && (
                      <p className="text-[9px] text-theme-muted mt-1 pl-0.5">+{hidden} weitere</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Day Detail Modal */}
      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          onSelectTicker={t => {
            router.push(`/analyse/stocks/${t.toLowerCase()}`)
            setSelectedDay(null)
          }}
        />
      )}
    </div>
  )
}

// ── WeekEventRow ─────────────────────────────────────────────────────────────
// Größer als DayEventRow — für die Wochenansicht mit mehr Platz pro Tag.

function WeekEventRow({ event: e }: { event: EarningsEvent }) {
  return (
    <div className="flex items-center gap-2 py-1 px-1.5 rounded-md hover:bg-white/[0.03] transition-colors">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/v1/logo/${e.ticker}?size=48`}
        alt=""
        className="w-5 h-5 rounded-md bg-white/[0.06] object-contain flex-shrink-0"
        onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0' }}
      />
      <span
        className={`text-[11.5px] font-bold tabular-nums truncate ${
          e.result === 'beat' ? 'text-emerald-400' : e.result === 'miss' ? 'text-red-400' : 'text-theme-secondary'
        }`}
      >
        {e.ticker}
      </span>
      {e.time === 'bmo' ? (
        <SunIcon className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
      ) : e.time === 'amc' ? (
        <MoonIcon className="w-3 h-3 text-blue-400/60 flex-shrink-0" />
      ) : null}
      {e.result ? (
        <span
          className={`text-[8.5px] font-bold px-1 rounded ml-auto flex-shrink-0 ${
            e.result === 'beat'
              ? 'bg-emerald-500/15 text-emerald-400'
              : e.result === 'miss'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-white/10 text-theme-muted'
          }`}
        >
          {e.result === 'beat' ? 'B' : e.result === 'miss' ? 'M' : '='}
        </span>
      ) : e.epsEstimate !== null ? (
        <span className="text-[9px] text-theme-muted tabular-nums ml-auto flex-shrink-0">
          E {e.epsEstimate.toFixed(2).replace('.', ',')}
        </span>
      ) : e.marketCap ? (
        <span className="text-[9px] text-theme-muted tabular-nums ml-auto flex-shrink-0">
          {fmtMarketCap(e.marketCap)}
        </span>
      ) : null}
    </div>
  )
}

// ── DayEventRow ──────────────────────────────────────────────────────────────

function DayEventRow({ event: e }: { event: EarningsEvent }) {
  return (
    <div className="flex items-center gap-1.5 group/row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/v1/logo/${e.ticker}?size=32`}
        alt=""
        className="w-3.5 h-3.5 rounded-sm bg-white/[0.06] object-contain flex-shrink-0"
        onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0' }}
      />
      <span
        className={`text-[10px] font-bold tabular-nums truncate ${
          e.result === 'beat' ? 'text-emerald-400' : e.result === 'miss' ? 'text-red-400' : 'text-theme-secondary'
        }`}
      >
        {e.ticker}
      </span>
      {e.time === 'bmo' ? (
        <SunIcon className="w-2.5 h-2.5 text-amber-400/60 flex-shrink-0" />
      ) : e.time === 'amc' ? (
        <MoonIcon className="w-2.5 h-2.5 text-blue-400/60 flex-shrink-0" />
      ) : null}
      {e.result && (
        <span
          className={`text-[8px] font-bold px-1 rounded ml-auto ${
            e.result === 'beat'
              ? 'bg-emerald-500/15 text-emerald-400'
              : e.result === 'miss'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-white/10 text-theme-muted'
          }`}
        >
          {e.result === 'beat' ? 'B' : e.result === 'miss' ? 'M' : '='}
        </span>
      )}
    </div>
  )
}

// ── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  filter,
  isLoggedIn,
  hasPortfolio,
  hasWatchlist,
}: {
  filter: FilterMode
  isLoggedIn: boolean
  hasPortfolio: boolean
  hasWatchlist: boolean
}) {
  let primary = ''
  let secondary: React.ReactNode = null

  if (filter === 'portfolio') {
    if (!isLoggedIn) {
      primary = 'Logge dich ein, um deine Portfolio-Earnings zu sehen'
    } else if (!hasPortfolio) {
      primary = 'Du hast noch keine Portfolio-Aktien'
      secondary = (
        <Link href="/analyse/mein-portfolio" className="text-[12px] text-emerald-400/70 hover:text-emerald-400 mt-2">
          Portfolio anlegen →
        </Link>
      )
    } else {
      primary = 'Keine Earnings für deine Portfolio-Aktien in diesem Monat'
    }
  } else if (filter === 'watchlist') {
    if (!isLoggedIn) {
      primary = 'Logge dich ein, um deine Watchlist-Earnings zu sehen'
    } else if (!hasWatchlist) {
      primary = 'Deine Watchlist ist leer'
      secondary = (
        <Link href="/analyse/meine-watchlist" className="text-[12px] text-emerald-400/70 hover:text-emerald-400 mt-2">
          Aktien zur Watchlist hinzufügen →
        </Link>
      )
    } else {
      primary = 'Keine Earnings für deine Watchlist-Aktien in diesem Monat'
    }
  } else if (filter === 'top') {
    primary = 'Keine Top-Earnings (>$10B Market Cap) in diesem Monat'
  } else {
    primary = 'Keine Earnings-Daten für diesen Monat'
  }

  return (
    <div className="flex flex-col items-center justify-center py-32">
      <p className="text-[13px] text-theme-muted">{primary}</p>
      {secondary}
    </div>
  )
}

// ── Day Detail Modal ─────────────────────────────────────────────────────────

function DayDetailModal({
  day,
  onClose,
  onSelectTicker,
}: {
  day: CalendarDay
  onClose: () => void
  onSelectTicker: (ticker: string) => void
}) {
  // Sortierung: ausschließlich nach Market Cap DESC — die größten Firmen oben.
  // Bei gleicher Market Cap (oder beide null): alphabetisch nach Ticker.
  const sorted = useMemo(() => {
    return [...day.events].sort((a, b) => {
      const ma = a.marketCap || 0
      const mb = b.marketCap || 0
      if (ma !== mb) return mb - ma
      return a.ticker < b.ticker ? -1 : 1
    })
  }, [day.events])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh]"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        className="relative w-full max-w-xl mx-4"
        onClick={ev => ev.stopPropagation()}
      >
        <div className="bg-theme-card border border-white/[0.1] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-[15px] font-semibold text-theme-primary">
                {new Date(day.date).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-[11px] text-theme-muted mt-0.5">
                {day.events.length} Earnings · {day.events.filter(e => e.time === 'bmo').length} vor Börse · {day.events.filter(e => e.time === 'amc').length} nach Börse
              </p>
            </div>
            <button onClick={onClose} className="text-theme-muted hover:text-theme-secondary">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Liste */}
          <div className="overflow-y-auto p-2 space-y-0.5">
            {sorted.map((e, i) => (
              <button
                key={`${e.ticker}-${i}`}
                onClick={() => onSelectTicker(e.ticker)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/logo/${e.ticker}?size=64`}
                    alt={e.ticker}
                    className="w-9 h-9 rounded-lg bg-white/[0.06] object-contain flex-shrink-0"
                    onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-theme-primary group-hover:text-theme-primary">
                        {e.ticker}
                      </span>
                      {e.fiscalQuarter && e.fiscalYear && (
                        <span className="text-[10px] text-theme-muted tabular-nums">
                          Q{e.fiscalQuarter} {e.fiscalYear}
                        </span>
                      )}
                      {e.result && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            e.result === 'beat'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : e.result === 'miss'
                                ? 'bg-red-500/15 text-red-400'
                                : 'bg-white/10 text-theme-muted'
                          }`}
                        >
                          {e.result === 'beat' ? 'Beat' : e.result === 'miss' ? 'Miss' : 'Inline'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-theme-muted truncate max-w-[280px]">
                      {e.company || ''}
                      {e.marketCap ? ` · ${fmtMarketCap(e.marketCap)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {e.epsActual !== null ? (
                    <div>
                      <p className="text-[12px] font-medium text-theme-secondary tabular-nums">
                        EPS {e.epsActual.toFixed(2).replace('.', ',')} $
                      </p>
                      {e.epsEstimate !== null && (
                        <p className="text-[10px] text-theme-muted tabular-nums">
                          Est. {e.epsEstimate.toFixed(2).replace('.', ',')} $
                        </p>
                      )}
                    </div>
                  ) : e.epsEstimate !== null ? (
                    <p className="text-[11px] text-theme-muted tabular-nums">
                      Est. EPS {e.epsEstimate.toFixed(2).replace('.', ',')} $
                    </p>
                  ) : null}
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {e.time === 'bmo' ? (
                      <>
                        <SunIcon className="w-3 h-3 text-amber-400/70" />
                        <span className="text-[9px] text-amber-400/70">Vor Börse</span>
                      </>
                    ) : e.time === 'amc' ? (
                      <>
                        <MoonIcon className="w-3 h-3 text-blue-400/70" />
                        <span className="text-[9px] text-blue-400/70">Nach Börse</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
