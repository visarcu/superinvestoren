'use client'

import React from 'react'
import type { Tab } from '../_lib/types'

interface PortfolioTabsProps {
  tab: Tab
  onChange: (t: Tab) => void
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'holdings', label: 'Holdings' },
  { key: 'transaktionen', label: 'Transaktionen' },
  { key: 'dividenden', label: 'Dividenden' },
]

export default function PortfolioTabs({ tab, onChange }: PortfolioTabsProps) {
  return (
    <div className="max-w-6xl mx-auto w-full px-6 sm:px-10 border-b border-white/[0.03]">
      <div className="flex">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
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
