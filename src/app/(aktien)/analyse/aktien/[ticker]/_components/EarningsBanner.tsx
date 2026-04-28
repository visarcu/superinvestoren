'use client'

import React from 'react'
import Link from 'next/link'
import { fmt } from '../_lib/format'
import type { EarningsEntry } from '../_lib/types'

interface EarningsBannerProps {
  earnings: EarningsEntry[]
  ticker: string
}

export default function EarningsBanner({ earnings, ticker }: EarningsBannerProps) {
  const recentEarning = earnings.find(e => {
    const age = Date.now() - new Date(e.filingDate).getTime()
    return age < 7 * 24 * 60 * 60 * 1000
  })
  if (!recentEarning) return null

  const h = recentEarning.highlights
  const bm = recentEarning.beatMiss
  const isBeat = bm?.revenue?.beatMiss === 'beat'
  const isMiss = bm?.revenue?.beatMiss === 'miss'
  const daysAgo = Math.floor((Date.now() - new Date(recentEarning.filingDate).getTime()) / (24 * 60 * 60 * 1000))
  const timeLabel = daysAgo === 0 ? 'Heute' : daysAgo === 1 ? 'Gestern' : `Vor ${daysAgo} Tagen`

  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 pt-4">
      <Link
        href={`/analyse/aktien/${ticker}/earnings`}
        className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all hover:scale-[1.005] ${
          isBeat
            ? 'bg-emerald-500/[0.04] border-emerald-500/10 hover:border-emerald-500/20'
            : isMiss
              ? 'bg-red-500/[0.04] border-red-500/10 hover:border-red-500/20'
              : 'bg-blue-500/[0.04] border-blue-500/10 hover:border-blue-500/20'
        }`}
      >
        {/* Pulse dot */}
        <div className="relative flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${isBeat ? 'bg-emerald-400' : isMiss ? 'bg-red-400' : 'bg-blue-400'}`} />
          <div
            className={`absolute inset-0 w-2 h-2 rounded-full animate-ping ${
              isBeat ? 'bg-emerald-400' : isMiss ? 'bg-red-400' : 'bg-blue-400'
            }`}
          />
        </div>

        <div className="flex-1 text-left">
          <p className="text-[13px] font-semibold text-white">
            Neue Quartalszahlen: {recentEarning.period}
            <span className="text-white/35 font-normal ml-2">{timeLabel}</span>
          </p>
          <p className="text-[11px] text-white/30 mt-0.5">
            {h?.revenue_reported ? `Umsatz: ${fmt(h.revenue_reported * 1e6)}` : ''}
            {h?.revenue_reported && h?.eps_reported ? ' · ' : ''}
            {h?.eps_reported ? `EPS: ${h.eps_reported.toFixed(2).replace('.', ',')} $` : ''}
            {bm?.revenue
              ? ` · ${bm.revenue.diffPct >= 0 ? '+' : ''}${bm.revenue.diffPct.toFixed(1)}% vs. eigene Prognose`
              : ''}
          </p>
        </div>

        {/* Badge */}
        {(isBeat || isMiss) && (
          <span
            className={`text-[10px] font-medium px-2.5 py-1 rounded-lg flex-shrink-0 ${
              isBeat ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {isBeat ? 'Prognose übertroffen' : 'Prognose verfehlt'}
          </span>
        )}

        <svg
          className="w-4 h-4 text-white/30 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    </div>
  )
}
