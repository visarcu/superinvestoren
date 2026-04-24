'use client'

import React from 'react'
import FeyPremiumGate from '../FeyPremiumGate'
import { fmt } from '../../_lib/format'
import type { AnalystEstimate } from '../../_lib/types'

interface EstimatesTabProps {
  ticker: string
  estimates: AnalystEstimate[]
  isPremium: boolean
  userLoading: boolean
}

function fmtEps(v: number | null): string {
  if (v === null) return '–'
  return `${v.toFixed(2).replace('.', ',')} $`
}

export default function EstimatesTab({ ticker, estimates, isPremium, userLoading }: EstimatesTabProps) {
  const currentYear = new Date().getFullYear()
  const future = estimates.filter(e => e.year >= currentYear)

  if (future.length === 0) {
    return (
      <div className="text-center py-28">
        <p className="text-white/35 text-sm">Keine Analysten-Schätzungen für {ticker}</p>
        <p className="text-white/25 text-xs mt-1">Konsensus-Prognosen werden aktuell nicht abgedeckt</p>
      </div>
    )
  }

  return (
    <FeyPremiumGate
      isPremium={isPremium}
      loading={userLoading}
      feature="Analysten-Schätzungen"
      description={`Konsensus-Prognosen für Umsatz, EPS, EBITDA und Nettogewinn mit Low/Avg/High-Range und Analysten-Anzahl für ${ticker}.`}
    >
      <div className="w-full max-w-5xl space-y-4">
        {future.map(e => {
          const revRangeOk = e.revenue.low !== null && e.revenue.high !== null
          const epsRangeOk = e.eps.low !== null && e.eps.high !== null
          const analystCount = e.eps.analystCount ?? e.revenue.analystCount ?? null

          return (
            <div
              key={e.date}
              className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden hover:border-white/[0.06] transition-all"
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10 text-violet-300 text-[11px] font-semibold">
                    {e.year}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">Geschäftsjahr {e.year}</div>
                    <div className="text-white/40 text-[11px]">Fiscal End {e.date}</div>
                  </div>
                </div>
                {analystCount !== null && (
                  <div className="text-[11px] text-white/40">
                    <span className="font-medium text-white/60">{analystCount}</span> Analysten
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.03]">
                <div className="px-5 py-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Umsatz (Avg)</div>
                  <div className="text-white text-sm font-semibold">{fmt(e.revenue.avg)}</div>
                  {revRangeOk && (
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {fmt(e.revenue.low)} – {fmt(e.revenue.high)}
                    </div>
                  )}
                </div>

                <div className="px-5 py-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">EPS (Avg)</div>
                  <div className="text-white text-sm font-semibold">{fmtEps(e.eps.avg)}</div>
                  {epsRangeOk && (
                    <div className="text-[10px] text-white/30 mt-0.5">
                      {fmtEps(e.eps.low)} – {fmtEps(e.eps.high)}
                    </div>
                  )}
                </div>

                <div className="px-5 py-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">EBITDA (Avg)</div>
                  <div className="text-white text-sm font-semibold">{fmt(e.ebitda.avg)}</div>
                </div>

                <div className="px-5 py-4">
                  <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Nettogewinn (Avg)</div>
                  <div className="text-white text-sm font-semibold">{fmt(e.netIncome.avg)}</div>
                </div>
              </div>
            </div>
          )
        })}

        <p className="text-[11px] text-white/25 pt-2">
          Konsensus-Prognosen von Sell-Side-Analysten. Avg = Durchschnitt, Low/High = Range aller abgegebenen Schätzungen.
        </p>
      </div>
    </FeyPremiumGate>
  )
}
