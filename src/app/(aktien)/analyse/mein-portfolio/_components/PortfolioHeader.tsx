'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import type { Portfolio } from '../_lib/types'

interface PortfolioHeaderProps {
  portfolios: Portfolio[]
  activePortfolio: Portfolio | null
  isAllDepotsView: boolean
  onSelectPortfolio: (id: string | null) => void
}

export default function PortfolioHeader({
  portfolios,
  activePortfolio,
  isAllDepotsView,
  onSelectPortfolio,
}: PortfolioHeaderProps) {
  const router = useRouter()
  const hasMultipleDepots = portfolios.length > 1

  return (
    <header className="px-6 sm:px-10 py-4 flex items-center justify-between border-b border-white/[0.03] max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
          aria-label="Zurück"
        >
          <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Portfolio</h1>
          <p className="text-[12px] text-white/25">
            {isAllDepotsView ? 'Alle Depots' : activePortfolio?.name ?? '–'}
          </p>
        </div>
      </div>

      {/* Depot-Switcher (nur wenn mehrere Depots existieren) */}
      {hasMultipleDepots && (
        <div className="flex items-center gap-2">
          <select
            value={isAllDepotsView ? '__all__' : activePortfolio?.id ?? ''}
            onChange={e => onSelectPortfolio(e.target.value === '__all__' ? null : e.target.value)}
            className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-[12px] text-white/60 focus:outline-none focus:border-white/[0.12]"
          >
            <option value="__all__">Alle Depots</option>
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </header>
  )
}
