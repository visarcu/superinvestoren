'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import FeyWatchlistButton from './FeyWatchlistButton'
import { MarketStatusDot, MarketStatusText } from './MarketStatusBadge'
import type { UnternehmenProfile, Quote } from '../_lib/types'

interface StockHeaderProps {
  ticker: string
  profile: UnternehmenProfile | null
  quote: Quote | null
}

export default function StockHeader({ ticker, profile, quote }: StockHeaderProps) {
  const router = useRouter()

  return (
    <header className="px-6 sm:px-10 py-4 flex items-center justify-between border-b border-white/[0.03] max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          aria-label="Zurück"
        >
          <svg
            className="w-4 h-4 text-white/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        {/* Ticker Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/v1/logo/${ticker}?size=80`}
          alt={ticker}
          className="w-10 h-10 rounded-xl bg-white/[0.06] object-contain"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        <div>
          <div className="flex items-baseline gap-2.5">
            <h1 className="text-lg font-bold text-white tracking-tight">{ticker}</h1>
            <span className="text-[11px] text-white/35 font-medium">{profile?.exchangeName}</span>
          </div>
          <p className="text-[12px] text-white/30">
            {profile?.name}
            {profile?.industry ? ` · ${profile.industry}` : ''}
          </p>
        </div>
      </div>

      {/* Price + Quick Actions */}
      <div className="flex items-center gap-5">
        {quote && (
          <div className="text-right">
            <div className="flex items-center justify-end gap-2.5">
              <MarketStatusDot ticker={ticker} quoteTs={quote.timestamp} />
              <p className="text-[22px] font-bold text-white tabular-nums leading-none">
                {quote.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 mt-2">
              <span
                className={`text-[12px] font-semibold tabular-nums ${
                  quote.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {quote.changePercent >= 0 ? '+' : ''}
                {quote.changePercent.toFixed(2).replace('.', ',')}%
              </span>
              <span
                className={`text-[11px] tabular-nums ${
                  quote.changePercent >= 0 ? 'text-emerald-400/55' : 'text-red-400/55'
                }`}
              >
                {quote.change >= 0 ? '+' : ''}
                {quote.change.toFixed(2).replace('.', ',')}
              </span>
              <MarketStatusText ticker={ticker} quoteTs={quote.timestamp} />
            </div>
          </div>
        )}
        <div className="w-px h-9 bg-white/[0.06]" aria-hidden />
        <div className="flex items-center gap-1.5">
          <Link
            href={`/analyse/vergleich?stocks=${ticker}`}
            className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[12px] font-medium text-white/55 hover:text-white/85 transition-colors"
            title="Diese Aktie mit anderen vergleichen"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Vergleichen
          </Link>
          <FeyWatchlistButton ticker={ticker} />
          <MoreMenu ticker={ticker} />
        </div>
      </div>
    </header>
  )
}

/**
 * Dezentes "Mehr"-Menü für selten genutzte Sub-Seiten.
 * Ersetzt die aufdringlichen Investoren/Dividenden-Pills im Header.
 */
function MoreMenu({ ticker }: { ticker: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
          open ? 'bg-white/[0.08] text-white/80' : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/80'
        }`}
        aria-label="Weitere Ansichten"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-11 bg-[#0c0c16] border border-white/[0.08] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden min-w-[180px] z-20">
          <Link
            href={`/analyse/aktien/${ticker}/investoren`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Investoren
          </Link>
          <Link
            href={`/analyse/dividenden/${ticker}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors border-t border-white/[0.03]"
          >
            <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-2.25 0-4.5-2-4.5-4.5S9.75 3 12 3s4.5 2 4.5 4.5" />
            </svg>
            Dividenden
          </Link>
        </div>
      )}
    </div>
  )
}
