'use client'

import React from 'react'
import { fmt } from '../../_lib/format'
import FeyPremiumGate from '../FeyPremiumGate'
import type { EarningsEntry } from '../../_lib/types'

interface EarningsTabProps {
  ticker: string
  earnings: EarningsEntry[]
  isPremium: boolean
  userLoading: boolean
}

export default function EarningsTab({ ticker, earnings, isPremium, userLoading }: EarningsTabProps) {
  if (earnings.length === 0) {
    return (
      <div className="text-center py-28">
        <p className="text-white/20 text-sm">Keine Earnings-Daten für {ticker}</p>
        <p className="text-white/8 text-xs mt-1">Quartalszahlen werden aus SEC 8-K Press Releases extrahiert</p>
      </div>
    )
  }

  return (
    <FeyPremiumGate
      isPremium={isPremium}
      loading={userLoading}
      feature="Earnings & Beat/Miss-Analyse"
      description={`Quartalszahlen, Umsatz/EPS-Vergleich gegen eigene Prognose und KI-Zusammenfassungen für ${ticker}.`}
    >
    <div className="w-full max-w-4xl space-y-4">
      {earnings.map(e => {
        const h = e.highlights
        const bm = e.beatMiss
        const hasBeat = bm?.revenue?.beatMiss === 'beat' || bm?.eps?.beatMiss === 'beat'
        const hasMiss = bm?.revenue?.beatMiss === 'miss' || bm?.eps?.beatMiss === 'miss'
        const beatMissLabel = hasBeat ? 'Eigene Prognose übertroffen' : hasMiss ? 'Eigene Prognose verfehlt' : null
        const beatMissStyle = hasBeat ? 'bg-emerald-500/10 text-emerald-400' : hasMiss ? 'bg-red-500/10 text-red-400' : ''

        return (
          <div
            key={e.period}
            className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden hover:border-white/[0.06] transition-all"
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.03]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    h?.sentiment === 'positiv'
                      ? 'bg-emerald-500/10'
                      : h?.sentiment === 'negativ'
                        ? 'bg-red-500/10'
                        : 'bg-blue-500/10'
                  }`}
                >
                  <svg
                    className={`w-4 h-4 ${
                      h?.sentiment === 'positiv'
                        ? 'text-emerald-400'
                        : h?.sentiment === 'negativ'
                          ? 'text-red-400'
                          : 'text-blue-400'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    {h?.sentiment === 'positiv' ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                      />
                    ) : h?.sentiment === 'negativ' ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181"
                      />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    )}
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-white">{e.period}</p>
                  <p className="text-[11px] text-white/25">
                    {new Date(e.filingDate).toLocaleDateString('de-DE', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {beatMissLabel && (
                  <span className={`text-[10px] font-medium px-2.5 py-1 rounded-lg ${beatMissStyle}`}>
                    {beatMissLabel}
                  </span>
                )}
                {e.filingUrl && (
                  <a
                    href={e.filingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-white/15 hover:text-white/40 px-2 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-all"
                  >
                    SEC Filing
                  </a>
                )}
              </div>
            </div>

            {/* Beat/Miss Detail Row */}
            {bm && (bm.revenue || bm.eps) && (
              <div className="px-6 py-2.5 flex items-center gap-5 border-b border-white/[0.03] bg-white/[0.015]">
                {bm.revenue && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/15 uppercase">Umsatz vs. Prognose:</span>
                    <span className="text-[11px] font-medium text-white/50">
                      {fmt(bm.revenue.actual * 1e6)} vs. {fmt(bm.revenue.priorGuidance * 1e6)}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        bm.revenue.beatMiss === 'beat'
                          ? 'text-emerald-400'
                          : bm.revenue.beatMiss === 'miss'
                            ? 'text-red-400'
                            : 'text-white/30'
                      }`}
                    >
                      {bm.revenue.diffPct >= 0 ? '+' : ''}
                      {bm.revenue.diffPct.toFixed(1)}%
                    </span>
                  </div>
                )}
                {bm.eps && (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/15 uppercase">EPS vs. Prognose:</span>
                    <span className="text-[11px] font-medium text-white/50">
                      {bm.eps.actual.toFixed(2).replace('.', ',')} $ vs.{' '}
                      {bm.eps.priorGuidance.toFixed(2).replace('.', ',')} $
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        bm.eps.beatMiss === 'beat'
                          ? 'text-emerald-400'
                          : bm.eps.beatMiss === 'miss'
                            ? 'text-red-400'
                            : 'text-white/30'
                      }`}
                    >
                      {bm.eps.diffPct >= 0 ? '+' : ''}
                      {bm.eps.diffPct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Key Metrics Row */}
            {h && (h.revenue_reported || h.eps_reported || h.net_income) && (
              <div className="px-6 py-3 flex flex-wrap items-center gap-6 border-b border-white/[0.03] bg-white/[0.01]">
                {h.revenue_reported && (
                  <div>
                    <p className="text-[9px] text-white/20 uppercase tracking-wider">Umsatz</p>
                    <p className="text-[14px] font-bold text-white">
                      {fmt(h.revenue_reported * 1e6)}
                      {h.revenue_yoy_pct != null && (
                        <span
                          className={`text-[10px] ml-1.5 font-medium ${
                            h.revenue_yoy_pct >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {h.revenue_yoy_pct >= 0 ? '+' : ''}
                          {h.revenue_yoy_pct.toFixed(1)}%
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {h.eps_reported && (
                  <div>
                    <p className="text-[9px] text-white/20 uppercase tracking-wider">EPS</p>
                    <p className="text-[14px] font-bold text-white">
                      {h.eps_reported.toFixed(2).replace('.', ',')} $
                      {h.eps_yoy_pct != null && (
                        <span
                          className={`text-[10px] ml-1.5 font-medium ${
                            h.eps_yoy_pct >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {h.eps_yoy_pct >= 0 ? '+' : ''}
                          {h.eps_yoy_pct.toFixed(1)}%
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {h.net_income && (
                  <div>
                    <p className="text-[9px] text-white/20 uppercase tracking-wider">Nettogewinn</p>
                    <p className="text-[14px] font-bold text-white">{fmt(h.net_income * 1e6)}</p>
                  </div>
                )}
                {h.guidance_revenue && !Array.isArray(h.guidance_revenue) && (
                  <div className="ml-auto">
                    <p className="text-[9px] text-white/15 uppercase tracking-wider">Prognose nächstes Q</p>
                    <p className="text-[13px] font-semibold text-white/40">
                      {fmt(Number(h.guidance_revenue) * 1e6)}
                    </p>
                  </div>
                )}
                {h.guidance_revenue && Array.isArray(h.guidance_revenue) && (
                  <div className="ml-auto">
                    <p className="text-[9px] text-white/15 uppercase tracking-wider">Prognose nächstes Q</p>
                    <p className="text-[13px] font-semibold text-white/40">
                      {fmt(Number(h.guidance_revenue[0]) * 1e6)} – {fmt(Number(h.guidance_revenue[1]) * 1e6)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* AI Summary */}
            {e.summary ? (
              <div className="px-6 py-4">
                <div className="[&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-white/50 [&_h2]:mt-3 [&_h2]:mb-1.5">
                  {e.summary.split('\n').map((line: string, li: number) => {
                    if (line.startsWith('## ')) return <h2 key={li}>{line.replace('## ', '')}</h2>
                    if (line.startsWith('- **')) {
                      const bold = line.match(/- \*\*(.+?)\*\*:?\s*(.*)/)
                      if (bold)
                        return (
                          <p key={li} className="text-[12px] text-white/40 leading-relaxed mb-1">
                            <strong className="text-white/55 font-medium">{bold[1]}</strong>
                            {bold[2] ? `: ${bold[2]}` : ''}
                          </p>
                        )
                    }
                    if (line.startsWith('- '))
                      return (
                        <p
                          key={li}
                          className="text-[12px] text-white/35 leading-relaxed mb-1 pl-3 border-l border-white/[0.04]"
                        >
                          {line.replace('- ', '')}
                        </p>
                      )
                    if (line.trim() === '') return null
                    return (
                      <p key={li} className="text-[12px] text-white/35 leading-relaxed mb-1">
                        {line}
                      </p>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="px-6 py-4">
                <p className="text-[12px] text-white/15 italic">Zusammenfassung wird generiert...</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
    </FeyPremiumGate>
  )
}
