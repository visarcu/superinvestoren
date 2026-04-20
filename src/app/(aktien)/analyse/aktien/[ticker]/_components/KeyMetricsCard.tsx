'use client'

import React from 'react'
import { timeAgo } from '../_lib/format'
import type { NewsArticle } from '../_lib/types'

interface MetricItem {
  label: string
  value: string
  color?: number | null
}

interface KeyMetricsCardProps {
  metrics: MetricItem[]
  fyLabel?: string
  topNews: NewsArticle | null
}

export default function KeyMetricsCard({ metrics, fyLabel, topNews }: KeyMetricsCardProps) {
  return (
    <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[11px] text-white/25 font-medium">Kennzahlen</p>
        {fyLabel && <p className="text-[10px] text-white/25">{fyLabel}</p>}
      </div>
      <div className="space-y-3">
        {metrics.slice(0, 10).map(m => (
          <div key={m.label} className="flex items-center justify-between">
            <span className="text-[12px] text-white/25">{m.label}</span>
            <span
              className={`text-[13px] font-semibold ${
                m.color !== undefined && m.color !== null
                  ? m.color >= 0
                    ? 'text-emerald-400'
                    : 'text-red-400'
                  : 'text-white/80'
              }`}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* News Snippet in Key Metrics */}
      {topNews && (
        <div className="mt-4 pt-4 border-t border-white/[0.04]">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Aktuell</p>
          <a href={topNews.url} target="_blank" rel="noopener noreferrer" className="block group">
            <p className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors line-clamp-2 leading-relaxed">
              {topNews.title}
            </p>
            <p className="text-[9px] text-white/25 mt-1">
              {topNews.sourceName} · {timeAgo(topNews.publishedAt)}
            </p>
          </a>
        </div>
      )}
    </div>
  )
}
