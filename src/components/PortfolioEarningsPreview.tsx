// src/components/PortfolioEarningsPreview.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { CalendarDaysIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'
import Link from 'next/link'

interface EarningsEvent {
  ticker: string
  companyName: string
  date: string
  time: string
  quarter: string
  estimatedEPS: number | null
}

interface PortfolioEarningsPreviewProps {
  symbols: string[]
  companyNames?: Record<string, string>
}

export default function PortfolioEarningsPreview({ symbols, companyNames = {} }: PortfolioEarningsPreviewProps) {
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (symbols.length === 0) {
      setEarnings([])
      setLoading(false)
      return
    }

    async function loadEarnings() {
      try {
        // /api/v1/calendar/earnings: SEC 8-K Item 2.02 + NASDAQ Public Calendar
        // via Supabase REST. Ersetzt /api/earnings-calendar (Prisma+FMP), das in
        // Prod am Pgbouncer-Prepared-Statement-Bug der EarningsCalendar-Query
        // hängenblieb — gleicher Fix wie 6dc1cf71 für /analyse/calendar.
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const cutoff = new Date(today)
        cutoff.setDate(cutoff.getDate() + 14)
        const fmt = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

        const response = await fetch(
          `/api/v1/calendar/earnings?tickers=${symbols.join(',')}&from=${fmt(today)}&to=${fmt(cutoff)}&limit=200`
        )
        if (response.ok) {
          const data = await response.json()
          // Flatten dates[].events[] → EarningsEvent[]; bereits nach Datum sortiert
          const flat: EarningsEvent[] = []
          for (const day of data.dates || []) {
            for (const ev of day.events || []) {
              const quarter = ev.fiscalQuarter && ev.fiscalYear
                ? `Q${ev.fiscalQuarter} ${ev.fiscalYear}`
                : ''
              flat.push({
                ticker: ev.ticker,
                companyName: ev.company || ev.ticker,
                date: day.date,
                time: ev.time || 'TBD',
                quarter,
                estimatedEPS: ev.epsEstimate ?? null,
              })
            }
          }
          setEarnings(flat.slice(0, 5))
        }
      } catch (error) {
        console.error('Error loading earnings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEarnings()
  }, [symbols])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short'
    })
  }

  const getTimeLabel = (time: string) => {
    if (time === 'bmo') return 'Vor Börsenöffnung'
    if (time === 'amc') return 'Nach Börsenschluss'
    return time || 'TBD'
  }

  const getDaysUntil = (dateString: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const earningsDate = new Date(dateString)
    earningsDate.setHours(0, 0, 0, 0)
    const diffTime = earningsDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Heute'
    if (diffDays === 1) return 'Morgen'
    if (diffDays < 7) return `In ${diffDays} Tagen`
    if (diffDays < 14) return 'Nächste Woche'
    return `In ${Math.ceil(diffDays / 7)} Wochen`
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-4 border-b border-neutral-800/60">
          <h3 className="text-sm font-semibold text-white tracking-tight">Anstehende Earnings</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">Nächste 2 Wochen</p>
        </div>
        <div className="flex-1 flex items-center justify-center py-10">
          <ArrowPathIcon className="w-5 h-5 text-neutral-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (earnings.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-4 border-b border-neutral-800/60">
          <h3 className="text-sm font-semibold text-white tracking-tight">Anstehende Earnings</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">Nächste 2 Wochen</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-10 px-5">
          <CalendarDaysIcon className="w-7 h-7 text-neutral-700 mx-auto mb-2" />
          <p className="text-[12px] text-neutral-500 text-center">Keine Earnings in den nächsten 2 Wochen</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-800/60 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">Anstehende Earnings</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">Nächste 2 Wochen · {earnings.length} Termin{earnings.length !== 1 ? 'e' : ''}</p>
        </div>
        <Link
          href="/analyse/earnings"
          className="text-[11px] text-neutral-400 hover:text-white transition-colors"
        >
          Alle →
        </Link>
      </div>

      {/* Liste */}
      <div className="flex-1">
        {earnings.map((event, index) => {
          const daysUntil = getDaysUntil(event.date)
          const isImminent = daysUntil === 'Heute' || daysUntil === 'Morgen'
          const displayName = companyNames[event.ticker] || event.companyName || event.ticker

          return (
            <Link
              key={`${event.ticker}-${event.date}-${index}`}
              href={`/analyse/stocks/${event.ticker.toLowerCase()}`}
              className="flex items-center justify-between py-2.5 px-5 border-b border-neutral-800/60 last:border-b-0 hover:bg-neutral-900/60 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Logo ticker={event.ticker} alt={displayName} className="w-7 h-7" padding="none" />
                <div className="min-w-0">
                  <span className="font-medium text-white text-[13px] block truncate">
                    {displayName}
                  </span>
                  <p className="text-[11px] text-neutral-500 truncate">{event.quarter}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-[12px] font-medium text-white tabular-nums">
                  {formatDate(event.date)}
                </p>
                <p className={`text-[10px] tabular-nums ${isImminent ? 'text-amber-400 font-medium' : 'text-neutral-500'}`}>
                  {daysUntil}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
