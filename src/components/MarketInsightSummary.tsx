'use client'

import React, { useEffect, useState } from 'react'
import { SparklesIcon, XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

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

interface MarketInsightSummaryProps {
  ticker: string
}

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

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="text-theme-primary font-semibold">
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

export default function MarketInsightSummary({ ticker }: MarketInsightSummaryProps) {
  const [data, setData] = useState<MarketInsightApiResponse['insight']>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setLoading(true)
    fetch(`/api/v1/insights/${ticker}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: MarketInsightApiResponse | null) => {
        if (!cancelled) {
          if (j?.insight) setData(j.insight)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [ticker])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme-light rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-theme-primary">Market Insights</span>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-theme-hover rounded animate-pulse w-full" />
          <div className="h-4 bg-theme-hover rounded animate-pulse w-5/6" />
          <div className="h-4 bg-theme-hover rounded animate-pulse w-4/6" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-theme-card border border-theme-light rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-theme-primary">Market Insights</span>
        </div>
        <p className="text-sm text-theme-muted">
          Noch keine KI-Analyse für {ticker} verfügbar.
        </p>
      </div>
    )
  }

  const allParagraphs = paragraphs(data.text)
  const teaserText = allParagraphs[0] ?? data.text
  const triggerLabel = TRIGGER_LABEL[data.triggerType] ?? data.triggerType

  return (
    <>
      <div className="group bg-theme-card border border-theme-light rounded-xl overflow-hidden hover:border-white/[0.12] transition-colors">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-theme-muted uppercase">
              Market Insights
            </p>
          </div>

          <p className="text-sm leading-relaxed text-theme-secondary line-clamp-4">
            {renderBold(teaserText)}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-[10px] text-theme-muted">
              {timeAgoDe(data.generatedAt)} · KI-generiert · {triggerLabel}
            </p>
            <span className="text-[10px] text-theme-muted group-hover:text-theme-primary transition-colors">
              Mehr lesen →
            </span>
          </div>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-theme-card border border-theme-light rounded-t-2xl sm:rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-theme-card border-b border-theme-light px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <SparklesIcon className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-theme-secondary uppercase">
                  Market Insights
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-theme-hover flex items-center justify-center"
                aria-label="Schließen"
              >
                <XMarkIcon className="w-4 h-4 text-theme-muted" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {allParagraphs.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-theme-secondary">
                  {renderBold(p)}
                </p>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-theme-light space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-theme-muted">
                  {timeAgoDe(data.generatedAt)} · KI-generiert mit {data.modelUsed}
                </span>
                {data.sourceUrl && (
                  <a
                    href={data.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                  >
                    SEC Filing <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-[10px] text-theme-muted leading-relaxed">
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
