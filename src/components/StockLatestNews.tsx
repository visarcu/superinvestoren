'use client'

import { useEffect, useState } from 'react'
import { NewspaperIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

interface NewsArticle {
  symbol: string
  publishedDate: string
  title: string
  site: string
  url: string
  image?: string
  text?: string
}

interface StockLatestNewsProps {
  ticker: string
  limit?: number
}

function timeAgoDe(iso: string): string {
  const date = new Date(iso.replace(' ', 'T'))
  const diffMs = Date.now() - date.getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 60) return min <= 1 ? 'gerade eben' : `vor ${min} Min.`
  const h = Math.floor(min / 60)
  if (h < 24) return `vor ${h} Std.`
  const d = Math.floor(h / 24)
  if (d < 7) return d === 1 ? 'gestern' : `vor ${d} Tagen`
  const w = Math.floor(d / 7)
  if (w < 5) return w === 1 ? 'vor 1 Woche' : `vor ${w} Wochen`
  return `vor ${Math.floor(d / 30)} Monaten`
}

export default function StockLatestNews({ ticker, limit = 5 }: StockLatestNewsProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/stock-news/${ticker}?page=0&limit=${limit}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.articles) {
          setArticles(data.articles.slice(0, limit))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [ticker, limit])

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme-light rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <NewspaperIcon className="w-4 h-4 text-theme-muted" />
          <span className="text-sm font-medium text-theme-primary">Aktuelle News</span>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-theme-hover rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="bg-theme-card border border-theme-light rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <NewspaperIcon className="w-4 h-4 text-theme-muted" />
          <span className="text-sm font-medium text-theme-primary">Aktuelle News</span>
        </div>
        <p className="text-sm text-theme-muted">Keine aktuellen News verfügbar.</p>
      </div>
    )
  }

  return (
    <div className="bg-theme-card border border-theme-light rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <NewspaperIcon className="w-4 h-4 text-theme-muted" />
          <span className="text-sm font-medium text-theme-primary">Aktuelle News</span>
        </div>
        <a
          href={`/analyse/stocks/${ticker.toLowerCase()}/news`}
          className="text-xs text-theme-muted hover:text-theme-primary transition-colors"
        >
          Alle →
        </a>
      </div>

      <div className="space-y-1.5">
        {articles.map((a, i) => (
          <a
            key={`${a.url}-${i}`}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block px-3 py-2.5 rounded-lg border border-transparent hover:border-white/[0.06] hover:bg-theme-secondary/30 transition-colors"
          >
            <p className="text-[13px] text-theme-secondary group-hover:text-theme-primary line-clamp-2 leading-snug transition-colors">
              {a.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-theme-muted">
              <span className="truncate">{a.site}</span>
              <span>·</span>
              <span className="whitespace-nowrap">{timeAgoDe(a.publishedDate)}</span>
              <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
