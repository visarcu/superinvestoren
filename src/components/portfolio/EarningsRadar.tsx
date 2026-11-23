// Earnings-Radar fürs Depot (Workspace-Übersicht).
//
// Verbindet die Earnings-Termine dieser und nächster Woche mit den eigenen
// Positionen:
//   • anstehend: Anteil am Depot und übliche Schwankung in Euro
//     (Positionswert × Ø Kursreaktion der letzten Quartale)
//   • schon gemeldet (diese Woche): tatsächliche Kursreaktion und ihr Effekt
//     aufs Depot in Euro
// Termine, Ergebnis und Kursreaktion kommen aus /api/v1/calendar/earnings,
// die Positionswerte (Live-Kurs, EUR) aus usePortfolio.

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowPathIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'
import type { Holding } from '@/hooks/usePortfolio'
import { leaveDepotHref } from '@/lib/siteHosts'
import {
  fmtSurprise,
  fmtTypicalMove,
  moveTextClass,
  resultBadgeClass,
  resultLabel,
  type EarningsResultKind,
} from '@/components/earnings/EarningsResult'

interface ApiEvent {
  ticker: string
  company: string | null
  time: 'bmo' | 'amc' | null
  epsActual: number | null
  revenueActual: number | null
  result: EarningsResultKind | null
  reactionPct: number | null
  typicalMovePct: number | null
}

interface RadarEvent {
  ticker: string
  name: string
  date: string
  time: 'bmo' | 'amc' | null
  value: number
  weightPct: number
  result: EarningsResultKind | null
  reactionPct: number | null
  typicalMovePct: number | null
  /** übliche Schwankung in Euro (Betrag) */
  typicalEur: number | null
  /** geschätzte Wirkung der Kursreaktion in Euro */
  impactEur: number | null
  reported: boolean
}

interface EarningsRadarProps {
  holdings: Holding[]
  totalValue: number
  formatCurrency: (amount: number) => string
}

// Die API nimmt höchstens 100 Ticker; bei sehr großen Depots die wertvollsten
const MAX_TICKERS = 100
const MAX_UPCOMING_ROWS = 8
const MAX_REPORTED_ROWS = 5

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mondayOf(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  const dow = out.getDay()
  out.setDate(out.getDate() + (dow === 0 ? -6 : 1 - dow))
  return out
}

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Heute'
  const d = new Date(`${date}T00:00:00`)
  const t = new Date(`${today}T00:00:00`)
  const diff = Math.round((d.getTime() - t.getTime()) / 86_400_000)
  if (diff === 1) return 'Morgen'
  if (diff === -1) return 'Gestern'
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function timeLabel(time: 'bmo' | 'amc' | null): string | null {
  if (time === 'bmo') return 'vor Börse'
  if (time === 'amc') return 'nach Börse'
  return null
}

export default function EarningsRadar({ holdings, totalValue, formatCurrency }: EarningsRadarProps) {
  const [days, setDays] = useState<Array<{ date: string; events: ApiEvent[] }>>([])
  const [loading, setLoading] = useState(true)

  // Werte je Ticker zusammenfassen ("Alle Depots" kann denselben Ticker mehrfach enthalten)
  const positions = useMemo(() => {
    const map = new Map<string, { value: number; name: string }>()
    for (const h of holdings) {
      const symbol = (h.symbol || '').trim().toUpperCase()
      if (!symbol || symbol === 'CASH' || !(h.value > 0)) continue
      const entry = map.get(symbol) ?? { value: 0, name: h.name || symbol }
      entry.value += h.value
      map.set(symbol, entry)
    }
    return map
  }, [holdings])

  const tickersKey = useMemo(
    () =>
      Array.from(positions.entries())
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, MAX_TICKERS)
        .map(([symbol]) => symbol)
        .sort()
        .join(','),
    [positions]
  )

  const today = isoDate(new Date())

  // Laden nur, wenn sich die Ticker ändern (nicht bei jeder Kursaktualisierung)
  useEffect(() => {
    if (!tickersKey) {
      setDays([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    const monday = mondayOf(new Date())
    const endOfNextWeek = new Date(monday)
    endOfNextWeek.setDate(monday.getDate() + 13)
    const params = new URLSearchParams({
      tickers: tickersKey,
      from: isoDate(monday),
      to: isoDate(endOfNextWeek),
      limit: '500',
      fallback: 'fmp',
    })

    fetch(`/api/v1/calendar/earnings?${params.toString()}`)
      .then(r => (r.ok ? r.json() : { dates: [] }))
      .then((data: { dates?: Array<{ date: string; events: ApiEvent[] }> }) => {
        if (!cancelled) setDays(data.dates ?? [])
      })
      .catch(() => {
        if (!cancelled) setDays([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tickersKey])

  const events = useMemo(() => {
    const out: RadarEvent[] = []
    for (const day of days) {
      for (const e of day.events ?? []) {
        const pos = positions.get(e.ticker.toUpperCase())
        if (!pos) continue
        const reported =
          day.date < today || e.epsActual !== null || e.revenueActual !== null || e.reactionPct != null
        const reaction = e.reactionPct ?? null
        out.push({
          ticker: e.ticker,
          name: pos.name || e.company || e.ticker,
          date: day.date,
          time: e.time,
          value: pos.value,
          weightPct: totalValue > 0 ? (pos.value / totalValue) * 100 : 0,
          result: e.result,
          reactionPct: reaction,
          typicalMovePct: e.typicalMovePct ?? null,
          typicalEur: e.typicalMovePct != null ? (pos.value * e.typicalMovePct) / 100 : null,
          // Der Positionswert ist schon nach der Reaktion bewertet:
          // Wirkung = Wert × r / (100 + r). Spätere Kursbewegungen machen es ungenau.
          impactEur: reaction !== null && reaction > -100 ? (pos.value * reaction) / (100 + reaction) : null,
          reported,
        })
      }
    }
    return out
  }, [days, positions, totalValue, today])

  const upcoming = useMemo(() => events.filter(e => !e.reported), [events])
  const reported = useMemo(
    () => events.filter(e => e.reported).sort((a, b) => (a.date > b.date ? -1 : 1)),
    [events]
  )

  const upcomingWeight = upcoming.reduce((s, e) => s + e.weightPct, 0)
  const upcomingSwing = upcoming.reduce((s, e) => s + (e.typicalEur ?? 0), 0)
  const swingKnown = upcoming.some(e => e.typicalEur !== null)
  const reportedImpact = reported.reduce((s, e) => s + (e.impactEur ?? 0), 0)
  const impactKnown = reported.some(e => e.impactEur !== null)

  const whole = (v: number) => formatCurrency(Math.round(v)).replace(/,00(?!\d)/, '')
  const signedWhole = (v: number) => {
    const rounded = Math.round(v)
    return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${whole(Math.abs(rounded))}`
  }
  const pct = (v: number) => `${v.toFixed(1).replace('.', ',')} %`

  const header = (
    <div className="px-5 py-4 border-b border-neutral-800/60 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-white tracking-tight">Earnings-Radar</h3>
        <p className="text-[11px] text-neutral-500 mt-0.5">Deine Positionen, diese und nächste Woche</p>
      </div>
      <Link href={leaveDepotHref('/analyse/calendar')} className="text-[11px] text-neutral-400 hover:text-white transition-colors">
        Kalender →
      </Link>
    </div>
  )

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <div className="flex-1 flex items-center justify-center py-10">
          <ArrowPathIcon className="w-5 h-5 text-neutral-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {header}
        <div className="flex-1 flex flex-col items-center justify-center py-10 px-5">
          <CalendarDaysIcon className="w-7 h-7 text-neutral-700 mx-auto mb-2" />
          <p className="text-[12px] text-neutral-500 text-center">Keine Quartalszahlen deiner Positionen in diesen zwei Wochen</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {header}

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 border-b border-neutral-800/60">
        <div className="px-5 py-3 border-r border-neutral-800/60">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">Steht an</p>
          <p className="text-[15px] font-semibold text-white tabular-nums mt-0.5">
            {upcoming.length > 0 ? `${pct(upcomingWeight)} des Depots` : 'Nichts mehr'}
          </p>
          <p className="text-[11px] text-neutral-500 tabular-nums">
            {upcoming.length > 0 && swingKnown
              ? `übliche Schwankung ±${whole(upcomingSwing)}`
              : `${upcoming.length} Position${upcoming.length === 1 ? '' : 'en'}`}
          </p>
        </div>
        <div className="px-5 py-3">
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">Schon gemeldet</p>
          <p
            className={`text-[15px] font-semibold tabular-nums mt-0.5 ${
              impactKnown ? moveTextClass(reportedImpact, 'text-white') : 'text-white'
            }`}
          >
            {impactKnown ? `≈ ${signedWhole(reportedImpact)}` : reported.length > 0 ? 'Kurse folgen' : 'Noch nichts'}
          </p>
          <p className="text-[11px] text-neutral-500 tabular-nums">
            {reported.length} Position{reported.length === 1 ? '' : 'en'} diese Woche
          </p>
        </div>
      </div>

      <div className="flex-1">
        {upcoming.slice(0, MAX_UPCOMING_ROWS).map(e => (
          <RadarRow key={`u-${e.ticker}-${e.date}`} event={e} today={today}>
            {e.typicalEur !== null ? (
              <>
                <p className="text-[12px] font-medium text-white tabular-nums">±{whole(e.typicalEur)}</p>
                <p className="text-[10px] text-neutral-500 tabular-nums">
                  {pct(e.weightPct)} · üblich {fmtTypicalMove(e.typicalMovePct!)}
                </p>
              </>
            ) : (
              <>
                <p className="text-[12px] font-medium text-white tabular-nums">{pct(e.weightPct)}</p>
                <p className="text-[10px] text-neutral-500">des Depots</p>
              </>
            )}
          </RadarRow>
        ))}

        {reported.length > 0 && (
          <p className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-wide text-neutral-500">Diese Woche gemeldet</p>
        )}
        {reported.slice(0, MAX_REPORTED_ROWS).map(e => (
          <RadarRow key={`r-${e.ticker}-${e.date}`} event={e} today={today}>
            {e.reactionPct !== null ? (
              <>
                <p className={`text-[12px] font-medium tabular-nums ${moveTextClass(e.reactionPct, 'text-white')}`}>
                  {fmtSurprise(e.reactionPct)}
                </p>
                <p className="text-[10px] text-neutral-500 tabular-nums">
                  {e.impactEur !== null ? `≈ ${signedWhole(e.impactEur)}` : ''}
                  {e.typicalMovePct !== null ? ` · üblich ${fmtTypicalMove(e.typicalMovePct)}` : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-[12px] font-medium text-white tabular-nums">{pct(e.weightPct)}</p>
                <p className="text-[10px] text-neutral-500">Kursreaktion folgt</p>
              </>
            )}
          </RadarRow>
        ))}
      </div>
    </div>
  )
}

function RadarRow({ event: e, today, children }: { event: RadarEvent; today: string; children: React.ReactNode }) {
  const when = [dayLabel(e.date, today), timeLabel(e.time)].filter(Boolean).join(' · ')
  return (
    <Link
      href={leaveDepotHref(`/analyse/stocks/${e.ticker.toLowerCase()}`)}
      className="flex items-center justify-between py-2.5 px-5 border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-900/60 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Logo ticker={e.ticker} alt={e.name} className="w-7 h-7" padding="none" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-white text-[13px] truncate">{e.name}</span>
            {e.result && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${resultBadgeClass(e.result, 'bg-white/10 text-neutral-400')}`}>
                {resultLabel(e.result)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-neutral-500 truncate">{when}</p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-3">{children}</div>
    </Link>
  )
}
