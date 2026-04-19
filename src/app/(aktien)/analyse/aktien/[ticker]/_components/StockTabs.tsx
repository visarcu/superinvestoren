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
  { key: 'kpis', label: 'KPIs' },
  { key: 'ai', label: 'AI Analyse' },
]

export default function StockTabs({ tab, setTab }: StockTabsProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 border-b border-white/[0.03]">
      <div className="flex">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-[13px] font-medium relative transition-colors ${
              tab === t.key ? 'text-white' : 'text-white/20 hover:text-white/40'
            }`}
          >
            {t.label}
            {tab === t.key && <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-white rounded-full" />}
          </button>
        ))}
      </div>
    </div>
  )
}
