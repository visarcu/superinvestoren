'use client'

import React from 'react'
import { timeAgo } from '../../_lib/format'
import type { NewsArticle } from '../../_lib/types'

interface NewsTabProps {
  news: NewsArticle[]
  ticker: string
}

export default function NewsTab({ news, ticker }: NewsTabProps) {
  if (news.length === 0) {
    return (
      <div className="w-full max-w-3xl text-center py-28">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-white/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
            />
          </svg>
        </div>
        <p className="text-white/25 text-[14px]">Keine News für {ticker}</p>
        <p className="text-white/25 text-[12px] mt-1">News werden alle 15 Min. aus 14 Quellen aktualisiert</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-3xl space-y-3">
      {/* Featured News Card */}
      {news[0] && (
        <a
          href={news[0].url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-6 rounded-2xl bg-[#0c0c16] border border-white/[0.06] hover:border-white/[0.1] transition-all group"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-medium text-white/35 bg-white/[0.04] px-2 py-0.5 rounded-md">
              {news[0].sourceName}
            </span>
            <span className="text-[10px] text-white/25">{timeAgo(news[0].publishedAt)}</span>
            {news[0].category !== 'general' && (
              <span className="text-[9px] text-white/30 bg-white/[0.03] px-1.5 py-0.5 rounded">
                {news[0].category}
              </span>
            )}
          </div>
          <p className="text-[16px] text-white/80 group-hover:text-white transition-colors font-medium leading-snug">
            {news[0].title}
          </p>
          {news[0].summary && (
            <p className="text-[13px] text-white/25 mt-2 leading-relaxed line-clamp-3">{news[0].summary}</p>
          )}
        </a>
      )}

      {/* Rest of news */}
      {news.slice(1).map(a => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 rounded-xl bg-[#0c0c16] border border-white/[0.03] hover:border-white/[0.06] transition-all group"
        >
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-[13px] text-white/65 group-hover:text-white/90 transition-colors truncate">{a.title}</p>
            <div className="flex gap-2 mt-1">
              <span className="text-[10px] text-white/30">{a.sourceName}</span>
              <span className="text-[10px] text-white/25">{timeAgo(a.publishedAt)}</span>
            </div>
          </div>
          {a.category !== 'general' && (
            <span className="text-[9px] text-white/25 bg-white/[0.03] px-1.5 py-0.5 rounded flex-shrink-0">
              {a.category}
            </span>
          )}
        </a>
      ))}
    </div>
  )
}
