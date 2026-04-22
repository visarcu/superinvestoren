'use client'

// Anstehende Earnings für die Home-Seite — gescoped auf User-Portfolio.
//
// Quelle: /api/v1/calendar/earnings?upcoming=true&days=14&tickers=...
// (NASDAQ Public Calendar, in Supabase gecacht).
//
// Eingabe: `tickers` Prop (Portfolio-Symbole). Ohne Tickers → Card rendert
// nichts (Home-Page versteckt sie konditional).
//
// Design: Fey-clean Card mit max. 6 Events. Jede Zeile:
//   [Logo]  TICKER · Q4 2026         23. Apr.
//           Company Name             In 2 Tagen · Vor Börse

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface EarningsEvent {
  ticker: string
  company: string | null
  time: string | null           // 'bmo' | 'amc' | null
  fiscalQuarter: number | null
  fiscalYear: number | null
  epsEstimate: number | null
  isUpcoming: boolean
  source: string | null
}

interface CalendarDay {
  date: string
  events: EarningsEvent[]
}

const MONTHS_SHORT = [
  'Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni',
  'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.',
]

/**
 * Liefert "Heute" / "Morgen" / "In 3 Tagen" / "Nächste Woche" etc.
 * ageDays = Tage ab heute. 0 = heute.
 */
function relativeLabel(ageDays: number): string {
  if (ageDays === 0) return 'Heute'
  if (ageDays === 1) return 'Morgen'
  if (ageDays < 7) return `In ${ageDays} Tagen`
  if (ageDays < 14) return 'Nächste Woche'
  const weeks = Math.floor(ageDays / 7)
  return `In ${weeks} Wochen`
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  return `${d}. ${MONTHS_SHORT[m - 1]}`
}

function formatCallTime(time: string | null): string | null {
  if (time === 'bmo') return 'Vor Börse'
  if (time === 'amc') return 'Nach Börse'
  return null
}

/** Tage zwischen YYYY-MM-DD und heute (00:00 lokal). */
function daysFromToday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d, 0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (24 * 3600 * 1000))
}

/** Flach aus `dates[]` auf ein Event-Array mit Top-Level-Date. */
function flatten(dates: CalendarDay[], limit: number): (EarningsEvent & { date: string })[] {
  const out: (EarningsEvent & { date: string })[] = []
  for (const day of dates) {
    for (const ev of day.events) {
      out.push({ ...ev, date: day.date })
      if (out.length >= limit) return out
    }
  }
  return out
}

interface UpcomingEarningsCardProps {
  /** Tickers aus dem User-Portfolio. Ohne Tickers → Card zeigt Empty-State. */
  tickers: string[]
}

export default function UpcomingEarningsCard({ tickers }: UpcomingEarningsCardProps) {
  const [events, setEvents] = useState<(EarningsEvent & { date: string })[]>([])
  const [loading, setLoading] = useState(true)

  // Stable Key für useEffect-Dependency (Array-Identität wechselt sonst pro Render)
  const tickersKey = tickers.slice().sort().join(',')

  useEffect(() => {
    if (tickers.length === 0) {
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/v1/calendar/earnings?upcoming=true&days=14&tickers=${tickersKey}&limit=200`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.dates) {
          setEvents([])
          return
        }
        // Bei Portfolio-Filter sind alle Events bereits relevant — wir nehmen
        // chronologisch die ersten 6.
        const all = flatten(d.dates, 50)
        all.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
        setEvents(all.slice(0, 6))
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [tickersKey, tickers.length])

  return (
    <div className="bg-[#111119] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[14px] font-semibold text-white/80">Anstehende Earnings</h2>
          <p className="text-[11px] text-white/30 mt-0.5">
            Aus deinem Portfolio · Nächste 2 Wochen
            {events.length > 0 ? ` · ${events.length} Termine` : ''}
          </p>
        </div>
        <Link
          href="/analyse/kalendar"
          className="text-[11px] text-white/35 hover:text-white/70 transition-colors"
        >
          Alle →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-white/[0.02] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-[12px] text-white/25 py-4">
          Keine Earnings in den nächsten 2 Wochen für dein Portfolio.
        </p>
      ) : (
        <div className="space-y-0.5">
          {events.map((e, i) => {
            const days = daysFromToday(e.date)
            const rel = relativeLabel(days)
            const callTime = formatCallTime(e.time)
            return (
              <Link
                key={`${e.ticker}-${e.date}-${i}`}
                href={`/analyse/aktien/${e.ticker}`}
                className="flex items-center justify-between py-2.5 px-2 -mx-2 hover:bg-white/[0.02] rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/logo/${e.ticker}?size=64`}
                    alt={e.ticker}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] object-contain flex-shrink-0"
                    onError={ev => { (ev.target as HTMLImageElement).style.opacity = '0' }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-white/85 group-hover:text-white transition-colors">
                        {e.ticker}
                      </span>
                      {e.fiscalQuarter && e.fiscalYear && (
                        <span className="text-[10px] text-white/30 tabular-nums">
                          Q{e.fiscalQuarter} {e.fiscalYear}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/35 truncate max-w-[240px]">
                      {e.company || ''}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[12px] font-medium text-white/70 tabular-nums">
                    {formatDate(e.date)}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {rel}
                    {callTime ? ` · ${callTime}` : ''}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
