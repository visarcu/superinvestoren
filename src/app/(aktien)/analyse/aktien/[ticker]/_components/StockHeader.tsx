'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import FeyWatchlistButton from './FeyWatchlistButton'
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
            <span className="text-[11px] text-white/20 font-medium">{profile?.exchangeName}</span>
          </div>
          <p className="text-[12px] text-white/30">
            {profile?.name}
            {profile?.industry ? ` · ${profile.industry}` : ''}
          </p>
        </div>
      </div>

      {/* Price + Quick Actions */}
      <div className="flex items-center gap-4">
        {quote && (
          <div className="text-right">
            <p className="text-xl font-bold text-white tabular-nums">
              {quote.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
            </p>
            <div className="flex items-center justify-end gap-1.5">
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
                  quote.changePercent >= 0 ? 'text-emerald-400/50' : 'text-red-400/50'
                }`}
              >
                {quote.change >= 0 ? '+' : ''}
                {quote.change.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        )}
        <FeyWatchlistButton ticker={ticker} />
        <Link
          href={`/analyse/aktien/${ticker}/investoren`}
          className="px-3 py-1.5 text-[11px] text-white/25 bg-white/[0.03] border border-white/[0.05] rounded-lg hover:bg-white/[0.06] hover:text-white/50 transition-all"
        >
          Investoren
        </Link>
        <Link
          href={`/analyse/dividenden/${ticker}`}
          className="px-3 py-1.5 text-[11px] text-white/25 bg-white/[0.03] border border-white/[0.05] rounded-lg hover:bg-white/[0.06] hover:text-white/50 transition-all"
        >
          Dividenden
        </Link>
      </div>
    </header>
  )
}
