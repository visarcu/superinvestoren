'use client'

import React from 'react'
import Link from 'next/link'
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

      <div className="flex items-center gap-2">
        {/* Sub-Page Links */}
        <Link
          href="/analyse/mein-portfolio/performance"
          className="px-3 py-1.5 text-[11px] text-white/30 hover:text-white/70 hover:bg-white/[0.04] rounded-lg transition-all"
        >
          Performance
        </Link>
        <Link
          href="/analyse/mein-portfolio/dividenden"
          className="px-3 py-1.5 text-[11px] text-white/30 hover:text-white/70 hover:bg-white/[0.04] rounded-lg transition-all"
        >
          Dividenden
        </Link>
        <Link
          href="/analyse/mein-portfolio/depots"
          className="px-3 py-1.5 text-[11px] text-white/30 hover:text-white/70 hover:bg-white/[0.04] rounded-lg transition-all"
        >
          Depots
        </Link>
        <Link
          href="/analyse/mein-portfolio/einstellungen"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-white/70 transition-all"
          title="Einstellungen"
          aria-label="Einstellungen"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.137.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>

        {/* Depot-Switcher */}
        {hasMultipleDepots && (
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
        )}
      </div>
    </header>
  )
}
