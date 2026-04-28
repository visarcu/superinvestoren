'use client'

import React from 'react'
import type { Tab } from '../_lib/types'

interface StockTabsProps {
  tab: Tab
  setTab: (t: Tab) => void
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'news', label: 'News' },
  { key: 'financials', label: 'Financials' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'estimates', label: 'Analysten' },
  { key: 'kpis', label: 'KPIs' },
  { key: 'insider', label: 'Insider' },
  { key: 'bewertung', label: 'Bewertung' },
  { key: 'ai', label: 'AI Analyse' },
]

export default function StockTabs({ tab, setTab }: StockTabsProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 pt-1">
      <div className="flex items-center gap-0.5 bg-white/[0.02] rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-1.5 text-[12px] font-medium rounded-lg transition-all ${
              tab === t.key
                ? 'bg-white/[0.08] text-white shadow-[0_1px_0_rgba(255,255,255,0.04)]'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
