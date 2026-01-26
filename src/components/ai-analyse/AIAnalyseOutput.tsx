'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Logo from '@/components/Logo'

interface AIAnalyseOutputProps {
  analysis: string
  ticker: string
  companyName: string
  currentPrice: number
  marketCap: number
  timestamp: string
}

export default function AIAnalyseOutput({
  analysis,
  ticker,
  companyName,
  currentPrice,
  marketCap,
  timestamp
}: AIAnalyseOutputProps) {
  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T USD`
    if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B USD`
    if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M USD`
    return `${cap.toFixed(2)} USD`
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Stock Header */}
      <div className="bg-theme-card border border-theme rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <Logo ticker={ticker} className="w-16 h-16" alt={companyName} />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-theme-primary">{companyName}</h2>
              <span className="px-2 py-1 bg-theme-secondary rounded-md text-sm font-medium text-theme-secondary">
                {ticker}
              </span>
            </div>
            <div className="flex items-center gap-6 mt-2">
              <div>
                <span className="text-theme-muted text-sm">Aktueller Kurs</span>
                <p className="text-xl font-semibold text-theme-primary">${currentPrice?.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-theme-muted text-sm">Marktkapitalisierung</span>
                <p className="text-xl font-semibold text-theme-primary">{formatMarketCap(marketCap)}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-sm font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              AI-Analyse
            </div>
            <p className="text-xs text-theme-muted mt-2">
              {new Date(timestamp).toLocaleString('de-DE')}
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Content */}
      <div className="bg-theme-card border border-theme rounded-xl p-8">
        <div className="prose prose-invert max-w-none
          prose-headings:text-theme-primary prose-headings:font-semibold
          prose-h1:text-2xl prose-h1:mb-4 prose-h1:mt-8 prose-h1:first:mt-0
          prose-h2:text-xl prose-h2:mb-3 prose-h2:mt-6 prose-h2:pb-2 prose-h2:border-b prose-h2:border-theme
          prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4
          prose-p:text-theme-secondary prose-p:leading-relaxed prose-p:mb-4
          prose-strong:text-theme-primary prose-strong:font-semibold
          prose-ul:text-theme-secondary prose-ul:my-3
          prose-ol:text-theme-secondary prose-ol:my-3
          prose-li:text-theme-secondary prose-li:my-1
          prose-table:w-full prose-table:my-4
          prose-th:bg-theme-secondary prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:text-theme-primary prose-th:font-medium prose-th:text-sm
          prose-td:px-4 prose-td:py-2 prose-td:text-theme-secondary prose-td:border-t prose-td:border-theme prose-td:text-sm
          prose-code:bg-theme-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-brand prose-code:text-sm
          prose-a:text-brand prose-a:no-underline hover:prose-a:underline
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {analysis}
          </ReactMarkdown>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <p className="text-amber-400 text-sm">
          <strong>Disclaimer:</strong> Diese Analyse dient ausschließlich Informationszwecken und stellt keine Anlageberatung dar.
          Die Berechnungen basieren auf historischen Daten und Annahmen, die sich als ungenau erweisen können.
          Investitionsentscheidungen sollten immer unter Berücksichtigung der eigenen finanziellen Situation und nach
          Rücksprache mit einem Finanzberater getroffen werden.
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 mt-6 text-sm text-theme-muted">
        <span>Powered by</span>
        <span className="font-semibold text-brand flex items-center gap-1">
          <span className="flex items-end gap-0.5">
            <div className="w-1 h-2 bg-brand rounded-sm"></div>
            <div className="w-1 h-2.5 bg-brand rounded-sm"></div>
            <div className="w-1 h-3 bg-brand rounded-sm"></div>
          </span>
          FINCLUE AI
        </span>
      </div>
    </div>
  )
}
