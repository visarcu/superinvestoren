'use client'

// ─────────────────────────────────────────────────────────────
// ForwardPETable.tsx
// Zeigt aktuelles KGV (TTM) + Forward-KGV für künftige Jahre
// basierend auf Analysten-Konsensus-EPS-Schätzungen.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'

interface PERow {
  year: number
  label: string
  pe: number | null
  eps: number | null
  isActual: boolean
}

interface Props {
  ticker: string
}

export default function ForwardPETable({ ticker }: Props) {
  const [rows, setRows] = useState<PERow[]>([])
  const [loading, setLoading] = useState(true)
  const [analystCount, setAnalystCount] = useState<number | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)

  useEffect(() => { load() }, [ticker])

  async function load() {
    setLoading(true)
    try {
      const [quoteRes, estimatesRes] = await Promise.all([
        fetch(`/api/quotes?symbols=${ticker}`),
        fetch(`/api/analyst-estimates/${ticker}`),
      ])

      const quoteArr = quoteRes.ok ? await quoteRes.json() : []
      const quote = Array.isArray(quoteArr) ? quoteArr[0] : quoteArr
      const estimates: any[] = estimatesRes.ok ? await estimatesRes.json() : []

      const price = quote?.price ?? 0
      const peActual: number | null = quote?.pe && quote.pe > 0 ? quote.pe : null
      const actualEPS: number | null = quote?.eps && quote.eps > 0 ? quote.eps : null

      setCurrentPrice(price)

      const currentYear = new Date().getFullYear()
      const result: PERow[] = []

      // Reihe 1: aktuelles TTM-KGV
      result.push({
        year: currentYear,
        label: `${currentYear} Aktuell (TTM)`,
        pe: peActual,
        eps: actualEPS,
        isActual: true,
      })

      if (Array.isArray(estimates) && estimates.length > 0) {
        // Analysten-Anzahl aus nächstem Jahr
        const nextEst = estimates.find(
          (e: any) => parseInt(e.date?.slice(0, 4), 10) === currentYear + 1
        )
        if (nextEst?.numberAnalystsEstimatedEps) {
          setAnalystCount(nextEst.numberAnalystsEstimatedEps)
        }

        // Künftige Jahre sortiert, max. 4
        const future = estimates
          .filter((e: any) => parseInt(e.date?.slice(0, 4), 10) > currentYear)
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
          .slice(0, 4)

        for (const est of future) {
          const year = parseInt(est.date?.slice(0, 4), 10)
          const eps = est.estimatedEpsAvg ?? null
          const forwardPE = eps != null && eps > 0 && price > 0 ? price / eps : null
          result.push({
            year,
            label: `${year} Geschätzt`,
            pe: forwardPE,
            eps: eps,
            isActual: false,
          })
        }
      }

      setRows(result)
    } catch (e) {
      console.error('[ForwardPETable]', e)
    } finally {
      setLoading(false)
    }
  }

  function peColor(pe: number | null, isActual: boolean): string {
    if (pe == null) return 'text-theme-muted'
    return isActual ? 'text-theme-primary' : 'text-theme-secondary'
  }

  if (loading) {
    return (
      <div className="bg-theme-card rounded-xl p-6 border border-theme-border">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-theme-muted border-t-transparent rounded-full animate-spin" />
          <span className="text-theme-muted text-sm">Lade KGV-Daten…</span>
        </div>
      </div>
    )
  }

  if (rows.length === 0) return null

  return (
    <div className="bg-theme-card rounded-xl border border-theme-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-theme-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-theme-primary">
              {ticker.toUpperCase()} Kurs-Gewinn-Verhältnis (KGV)
            </h3>
            <p className="text-xs text-theme-muted mt-1">
              TTM-KGV sowie Forward-KGV basierend auf Analysten-Konsensus
              {analystCount ? <> &middot; <span className="font-medium">{analystCount} Analysten</span></> : null}
              {currentPrice ? <> &middot; Kurs: <span className="font-medium">${currentPrice.toFixed(2)}</span></> : null}
            </p>
          </div>
          <span className="shrink-0 text-xs text-theme-muted bg-theme-secondary px-2 py-1 rounded-md">
            Forward P/E
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-theme-border">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`flex items-center justify-between px-6 py-4 transition-colors ${
              row.isActual ? 'bg-theme-secondary/30' : 'hover:bg-theme-secondary/20'
            }`}
          >
            <div className="flex flex-col gap-0.5">
              <span className={`text-sm font-semibold ${row.isActual ? 'text-theme-primary' : 'text-theme-secondary'}`}>
                {row.label}
              </span>
              {row.eps != null && (
                <span className="text-xs text-theme-muted">
                  EPS (Konsensus): <span className="font-medium text-theme-secondary">${row.eps.toFixed(2)}</span>
                </span>
              )}
            </div>
            <span className={`text-xl font-bold tabular-nums ${peColor(row.pe, row.isActual)}`}>
              {row.pe != null ? row.pe.toFixed(1) + 'x' : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-theme-border bg-theme-secondary/20">
        <p className="text-xs text-theme-muted">
          Forward-KGV = Aktueller Kurs ÷ Geschätzter EPS (Analysten-Konsensus)
        </p>
      </div>
    </div>
  )
}
