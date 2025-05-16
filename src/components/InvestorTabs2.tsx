'use client'
import React from 'react'
import clsx from 'clsx'

export type TabKey = 'hold' | 'buy' | 'sell'
interface Props {
  active: TabKey
  onChange: (t: TabKey) => void
}

const LABELS: Record<TabKey,string> = {
  hold: 'Halten',
  buy:  'Gekauft',
  sell: 'Verkauft',
}

export default function InvestorTabs({ active, onChange }: Props) {
  return (
    <nav className="flex space-x-2 border-b border-gray-700 mb-4">
      {(['hold','buy','sell'] as TabKey[]).map(key => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={clsx(
            'px-4 py-2 rounded-t-lg transition',
            active === key
              ? 'bg-card-dark text-white'
              : 'text-gray-400 hover:text-gray-200'
          )}
        >
          {LABELS[key]}
        </button>
      ))}
    </nav>
  )
}