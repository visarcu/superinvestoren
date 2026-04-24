'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface EarningsEvent {
  ticker: string
  companyName: string
  date: string
  time: string
  quarter: string
  estimatedEPS: number | null
}

interface EarningsPreviewCardProps {
  symbols: string[]
}

export default function EarningsPreviewCard({ symbols }: EarningsPreviewCardProps) {
  const [earnings, setEarnings] = useState<EarningsEvent[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (symbols.length === 0) {
      setEarnings([])
      setLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/earnings-calendar?tickers=${symbols.join(',')}`)
        if (!r.ok) throw new Error('fetch failed')
        const data: EarningsEvent[] = await r.json()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const cutoff = new Date(today)
        cutoff.setDate(cutoff.getDate() + 14)
        const filtered = data
          .filter(e => {
            const d = new Date(e.date)
            d.setHours(0, 0, 0, 0)
            return d >= today && d <= cutoff
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        if (!cancelled) setEarnings(filtered.slice(0, 6))
      } catch {
        if (!cancelled) setEarnings([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [symbols])

  // Nichts rendern solange kein Fetch abgeschlossen ODER keine Ergebnisse
  if (loading || earnings === null) return null
  if (earnings.length === 0) return null

  return (
    <section className="mt-6 rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] overflow-hidden">
      <div className="px-6 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[13px] font-semibold text-white/90 tracking-tight">
            Anstehende Earnings
          </h2>
          <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em]">
            nächste 2 Wochen · {earnings.length}
          </span>
        </div>
        <Link
          href="/analyse/earnings"
          className="text-[11px] text-white/45 hover:text-white/90 transition-colors"
        >
          Alle →
        </Link>
      </div>

      {/* Horizontale Karten-Row */}
      <div className="px-5 py-4 flex gap-2 overflow-x-auto scrollbar-none">
        {earnings.map((event, i) => {
          const daysUntil = getDaysUntil(event.date)
          const isImminent = daysUntil === 'Heute' || daysUntil === 'Morgen'
          return (
            <Link
              key={`${event.ticker}-${event.date}-${i}`}
              href={`/analyse/aktien/${event.ticker.toLowerCase()}`}
              className="
                shrink-0 w-[180px] rounded-[10px] bg-white/[0.02] border border-white/[0.05]
                hover:border-white/[0.12] hover:bg-white/[0.04] transition-all
                px-3.5 py-3 group
              "
            >
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-[7px] bg-white/[0.04] border border-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/logo/${event.ticker}?size=60`}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={e => {
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white/90 group-hover:text-white tracking-tight truncate">
                    {event.ticker}
                  </p>
                  <p className="text-[10px] text-white/40 truncate">{event.quarter}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[12px] font-medium text-white/80 tabular-nums">
                  {formatShortDate(event.date)}
                </span>
                <span
                  className={`text-[10px] tabular-nums ${
                    isImminent ? 'text-amber-400/90 font-semibold' : 'text-white/40'
                  }`}
                >
                  {daysUntil}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function formatShortDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
}

function getDaysUntil(iso: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ed = new Date(iso)
  ed.setHours(0, 0, 0, 0)
  const diff = Math.ceil((ed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Morgen'
  if (diff < 7) return `in ${diff} Tagen`
  if (diff < 14) return 'nächste Woche'
  return `in ${Math.ceil(diff / 7)} Wochen`
}
