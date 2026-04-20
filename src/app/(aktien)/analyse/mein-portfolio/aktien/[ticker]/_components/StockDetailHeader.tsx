'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface StockDetailHeaderProps {
  ticker: string
  name: string
}

export default function StockDetailHeader({ ticker, name }: StockDetailHeaderProps) {
  const router = useRouter()

  return (
    <header className="px-6 sm:px-10 py-4 flex items-center gap-4 border-b border-white/[0.03] max-w-6xl mx-auto w-full">
      <button
        onClick={() => router.back()}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
        aria-label="Zurück"
      >
        <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/v1/logo/${ticker}?size=80`}
        alt={ticker}
        className="w-10 h-10 rounded-xl bg-white/[0.06] object-contain"
        onError={e => {
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-lg font-bold text-white tracking-tight">{ticker}</h1>
          <span className="text-[11px] text-white/25">in Mein Portfolio</span>
        </div>
        <p className="text-[12px] text-white/30 truncate">{name || '–'}</p>
      </div>

      <a
        href={`/analyse/aktien/${ticker}`}
        className="px-3 py-1.5 text-[11px] text-white/40 bg-white/[0.04] border border-white/[0.05] rounded-lg hover:bg-white/[0.08] hover:text-white/70 transition-all flex-shrink-0"
      >
        Aktien-Detail →
      </a>
    </header>
  )
}
