'use client'

import React from 'react'
import FeyPremiumGate from '../FeyPremiumGate'

interface AiTabProps {
  ticker: string
  aiAnalysis: string | null
  aiLoading: boolean
  startAnalysis: () => void
  isPremium: boolean
  userLoading: boolean
}

export default function AiTab({
  ticker,
  aiAnalysis,
  aiLoading,
  startAnalysis,
  isPremium,
  userLoading,
}: AiTabProps) {
  return (
    <FeyPremiumGate
      isPremium={isPremium}
      loading={userLoading}
      feature="AI Aktienanalyse"
      description={`Vollständige KI-Analyse für ${ticker} basierend auf SEC-Filings, Earnings, Insider-Trades und Superinvestoren.`}
    >
    <div className="w-full max-w-4xl">
      {aiAnalysis ? (
        <div className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-violet-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-white/60">Finclue AI Analyse</p>
            <span className="text-[9px] text-white/15 ml-auto">Basierend auf eigenen SEC-Daten</span>
          </div>
          <div
            className="[&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:text-white/60 [&_h2]:mt-5 [&_h2]:mb-2
            [&_p]:text-[13px] [&_p]:text-white/45 [&_p]:leading-relaxed [&_p]:mb-2
            [&_li]:text-[13px] [&_li]:text-white/45 [&_li]:leading-relaxed
            [&_strong]:text-white/65 [&_strong]:font-medium
            [&_ul]:my-1.5 [&_ul]:pl-4 [&_ul]:list-disc"
          >
            {aiAnalysis.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <h2 key={i}>{line.replace('## ', '')}</h2>
              if (line.startsWith('- **')) {
                const m = line.match(/- \*\*(.+?)\*\*:?\s*(.*)/)
                if (m)
                  return (
                    <p key={i}>
                      <strong>{m[1]}</strong>
                      {m[2] ? `: ${m[2]}` : ''}
                    </p>
                  )
              }
              if (line.startsWith('- '))
                return (
                  <p key={i} className="pl-3 border-l-2 border-violet-500/10">
                    {line.replace('- ', '')}
                  </p>
                )
              if (line.trim() === '') return null
              return <p key={i}>{line}</p>
            })}
          </div>
        </div>
      ) : aiLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-5 h-5 border-2 border-violet-500/20 border-t-violet-400 rounded-full animate-spin" />
          <p className="text-[12px] text-white/20">AI analysiert {ticker}...</p>
          <p className="text-[10px] text-white/10">Sammelt Finanzdaten, Earnings, Insider-Trades, Superinvestoren</p>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-violet-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <p className="text-white/30 text-sm">AI Aktienanalyse</p>
          <p className="text-white/12 text-xs mt-1 mb-4">
            Basierend auf SEC Finanzdaten, Earnings, Insider-Trades & Superinvestoren
          </p>
          <button
            onClick={startAnalysis}
            className="px-5 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[13px] font-medium hover:bg-violet-500/15 hover:border-violet-500/30 transition-all"
          >
            Analyse starten
          </button>
        </div>
      )}
    </div>
    </FeyPremiumGate>
  )
}
