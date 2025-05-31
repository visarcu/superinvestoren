// src/app/analyse/layout.tsx
'use client'

import React, { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'



export default function AnalyseLayout({ children }: { children: ReactNode }) {
  const path = usePathname()
  const tabs = [
    { href: '/analyse',           label: 'Übersicht' },
    { href: '/analyse/watchlist', label: 'Watchlist' },
    { href: '/analyse/heatmap',   label: 'Heatmap' },
    { href: '/analyse/earnings',  label: 'Earnings' },
  ]

  return (
    <div className="mb-8">
      <nav className="flex space-x-4 border-b border-gray-700 pb-2 max-w-4xl mx-auto px-4 text-gray-300">
        {tabs.map((tab) => (
          <Link
          href={tab.href}
          className={`px-4 py-2 rounded ${
            path === tab.href ? 'bg-accent text-black' : ''
          }`}
        >
          {tab.label}
        </Link>
        ))}
      </nav>
      <div className="px-4">{children}</div>
    </div>
  )
}