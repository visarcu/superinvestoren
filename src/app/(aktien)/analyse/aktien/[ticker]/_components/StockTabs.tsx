'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'

interface TabDef {
  /** Sub-Route-Segment (leer = Overview/Default-Route) */
  segment: string
  label: string
}

const TABS: TabDef[] = [
  { segment: '', label: 'Overview' },
  { segment: 'news', label: 'News' },
  { segment: 'financials', label: 'Financials' },
  { segment: 'earnings', label: 'Earnings' },
  { segment: 'analysten', label: 'Analysten' },
  { segment: 'kpis', label: 'KPIs' },
  { segment: 'insider', label: 'Insider' },
  { segment: 'bewertung', label: 'Bewertung' },
  { segment: 'ai', label: 'AI Analyse' },
]

export default function StockTabs() {
  const pathname = usePathname()
  const params = useParams()
  // Raw case beibehalten — Tab-Links matchen so die aktuelle URL-Form
  const ticker = String(params?.ticker ?? '')
  const base = `/analyse/aktien/${ticker}`

  // Aktiven Tab bestimmen — case-insensitive Match weil Next.js URL-Casing
  // bei dynamic routes nicht garantiert
  const lowerPath = (pathname ?? '').toLowerCase()
  const lowerBase = base.toLowerCase()
  const rest = lowerPath.startsWith(lowerBase) ? lowerPath.slice(lowerBase.length).replace(/^\//, '') : ''
  const currentSegment = rest

  return (
    <div className="w-full border-b border-white/[0.06] mt-4">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const active = t.segment === currentSegment
            const href = t.segment ? `${base}/${t.segment}` : base
            return (
              <Link
                key={t.segment || 'overview'}
                href={href}
                scroll={false}
                className={`relative px-3 py-3.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                  active ? 'text-white/90' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute bottom-[-1px] left-3 right-3 h-px bg-white/85" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
