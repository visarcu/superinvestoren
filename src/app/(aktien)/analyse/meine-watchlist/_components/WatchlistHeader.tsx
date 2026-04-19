'use client'

import React from 'react'
import type { ViewMode } from '../_lib/types'

interface WatchlistHeaderProps {
  count: number
  viewMode: ViewMode
  onViewModeChange: (m: ViewMode) => void
  onRefresh: () => void
  refreshing: boolean
}

export default function WatchlistHeader({
  count,
  viewMode,
  onViewModeChange,
  onRefresh,
  refreshing,
}: WatchlistHeaderProps) {
  const today = new Date()
  const dayName = today.toLocaleDateString('de-DE', { weekday: 'long' })
  const monthDay = today.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">Watchlist</h1>
          <span className="text-[12px] text-white/25 tabular-nums">
            {count} {count === 1 ? 'Aktie' : 'Aktien'}
          </span>
        </div>
        <p className="text-[12px] text-white/30 mt-0.5">
          {dayName}, {monthDay}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-all disabled:opacity-40"
          title="Aktualisieren"
          aria-label="Watchlist aktualisieren"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>

        {/* View Toggle */}
        <div className="flex items-center gap-0.5 bg-white/[0.02] rounded-xl p-0.5">
          <button
            onClick={() => onViewModeChange('list')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/60'
            }`}
            title="Listen-Ansicht"
            aria-label="Listen-Ansicht"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-white/[0.08] text-white' : 'text-white/30 hover:text-white/60'
            }`}
            title="Karten-Ansicht"
            aria-label="Karten-Ansicht"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
