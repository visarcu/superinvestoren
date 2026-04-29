'use client'

import React, { useEffect, useState } from 'react'
import { Sparkles, X, ExternalLink, Newspaper } from 'lucide-react'
import type { NewsArticle } from '../_lib/types'

interface MarketInsightApiResponse {
  ticker: string
  insight: {
    text: string
    generatedAt: string
    modelUsed: string
    promptVersion: string
    triggerType: 'earnings' | 'news_spike' | 'manual'
    sourceUrl: string | null
  } | null
}

interface MarketInsightCardProps {
  ticker: string
  /** Top-News zur Aktie. Wird oben in der Card als "Marktreaktion" angezeigt
   *  und im Modal-Footer als "Aktuelle Marktreaktion"-Sektion. */
  topNews?: NewsArticle | null
}

// Wandelt eine ISO-Zeit in deutsche Relativ-Notation um — Stil: "vor 2 Std." / "vor 3 Tagen"
function timeAgoDe(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
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

// Rendert Markdown-bold (**text**) als <strong>. Andere Markdown-Features
// brauchen wir hier nicht — der Generator-Prompt produziert nur Fließtext + bold.
function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="text-white font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  )
}

function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
}

const TRIGGER_LABEL: Record<string, string> = {
  earnings: 'Quartalsbericht',
  news_spike: 'Nachrichten-Cluster',
  manual: 'Redaktion',
}

export default function MarketInsightCard({ ticker, topNews }: MarketInsightCardProps) {
  const [data, setData] = useState<MarketInsightApiResponse['insight']>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    fetch(`/api/v1/insights/${ticker}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: MarketInsightApiResponse | null) => {
        if (!cancelled && j?.insight) setData(j.insight)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [ticker])

  // ESC-Key schließt Modal
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!data) return null

  const allParagraphs = paragraphs(data.text)
  const teaserText = allParagraphs[0] ?? data.text
  const triggerLabel = TRIGGER_LABEL[data.triggerType] ?? data.triggerType

  return (
    <>
      {/* Card — klickbar öffnet Modal */}
      <div className="group bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden hover:border-white/[0.08] transition-colors">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left p-5 sm:p-6"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-violet-300" strokeWidth={2} />
            </div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-white/50 uppercase">
              Market Insights
            </p>
          </div>

          {/* Teaser: erster Absatz, max. 3 Zeilen */}
          <p className="text-[13.5px] leading-relaxed text-white/70 line-clamp-3">
            {renderBold(teaserText)}
          </p>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[10px] text-white/30">
              {timeAgoDe(data.generatedAt)} · KI-generiert · {triggerLabel}
            </p>
            <span className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors">
              Mehr lesen →
            </span>
          </div>
        </button>

        {/* News-Strip — Marktreaktion zur Aktie. Eigene Trennlinie, nicht klickbar
            zusammen mit dem Insight (öffnet stattdessen die News-URL). */}
        {topNews && (
          <a
            href={topNews.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border-t border-white/[0.04] px-5 sm:px-6 py-3.5 hover:bg-white/[0.015] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                <Newspaper className="w-3.5 h-3.5 text-white/50" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-white/40 uppercase mb-1">
                  Marktreaktion · {topNews.sourceName} · vor&nbsp;{
                    (() => {
                      const m = Math.floor((Date.now() - new Date(topNews.publishedAt).getTime()) / 60000)
                      if (m < 60) return `${m} Min.`
                      const h = Math.floor(m / 60)
                      if (h < 24) return `${h} Std.`
                      return `${Math.floor(h / 24)} T.`
                    })()
                  }
                </p>
                <p className="text-[13px] text-white/75 line-clamp-1 leading-snug">{topNews.title}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-white/30 flex-shrink-0" strokeWidth={2} />
            </div>
          </a>
        )}
      </div>

      {/* Modal mit voller Analyse */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0c0c16] border border-white/[0.06] rounded-t-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal-Header */}
            <div className="sticky top-0 bg-[#0c0c16] border-b border-white/[0.04] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-violet-300" strokeWidth={2} />
                </div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-white/60 uppercase">
                  Market Insights
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/[0.04] flex items-center justify-center"
                aria-label="Schließen"
              >
                <X className="w-4 h-4 text-white/50" strokeWidth={2} />
              </button>
            </div>

            {/* Modal-Body: voller Text */}
            <div className="px-6 py-5 space-y-4">
              {allParagraphs.map((p, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-white/85">
                  {renderBold(p)}
                </p>
              ))}
            </div>

            {/* Modal-Footer: Quelle + Disclaimer */}
            <div className="px-6 py-4 border-t border-white/[0.04] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/30">
                  {timeAgoDe(data.generatedAt)} · KI-generiert mit {data.modelUsed}
                </span>
                {data.sourceUrl && (
                  <a
                    href={data.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-violet-300/80 hover:text-violet-200"
                  >
                    SEC Filing <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-[10px] text-white/25 leading-relaxed">
                Automatisch generiert auf Basis von SEC-8-K-Quartalsdaten und der eigenen
                Vorquartal-Guidance. Keine Anlageberatung — Zahlen bitte mit dem
                Original-Filing abgleichen.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
