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
  { key: 'analyse', label: 'Analyse' },
]

export default function PortfolioTabs({ tab, onChange }: PortfolioTabsProps) {
  return (
    <div className="max-w-6xl mx-auto w-full px-6 sm:px-10">
      <div
        role="tablist"
        className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-white/[0.03] border border-white/[0.05]"
      >
        {TABS.map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.key)}
              className={`
                relative px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors
                ${
                  active
                    ? 'text-[#06060e] bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]'
                    : 'text-white/40 hover:text-white/80'
                }
              `}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
