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
    <div className="w-full border-b border-white/[0.06] mt-4">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative px-3 py-3.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                  active ? 'text-white/90' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute bottom-[-1px] left-3 right-3 h-px bg-white/85" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
