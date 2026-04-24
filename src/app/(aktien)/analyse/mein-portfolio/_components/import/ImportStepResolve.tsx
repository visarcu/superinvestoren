'use client'

import React, { useEffect, useState } from 'react'
import type { NormalizedTransaction } from './types'

interface Props {
  transactions: NormalizedTransaction[]
  onDone: (resolved: NormalizedTransaction[]) => void
  onBack: () => void
}

interface ResolverStats {
  cache: number
  master: number
  eodhd: number
  unknown: number
}

export default function ImportStepResolve({ transactions, onDone, onBack }: Props) {
  const [resolving, setResolving] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ResolverStats | null>(null)
  const [resolvedTxs, setResolvedTxs] = useState<NormalizedTransaction[]>([])

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      setResolving(true)
      setError(null)

      const pendingIsins = Array.from(
        new Set(
          transactions
            .filter(t => t.isin && !t.symbol)
            .map(t => t.isin as string)
        )
      )

      try {
        let resolutionMap: Record<string, { ticker: string; source: string }> = {}

        if (pendingIsins.length > 0) {
          const res = await fetch('/api/v1/isin-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isins: pendingIsins }),
          })
          if (!res.ok) throw new Error('ISIN-Resolver hat einen Fehler geliefert')
          const data = await res.json()
          for (const r of data.data || []) {
            resolutionMap[r.isin] = { ticker: r.ticker, source: r.source }
          }
          if (!cancelled) setStats(data.stats || null)
        } else {
          if (!cancelled) setStats({ cache: 0, master: 0, eodhd: 0, unknown: 0 })
        }

        const enriched = transactions.map(t => {
          if (t.symbol) return t
          if (t.isin && resolutionMap[t.isin]) {
            const { ticker, source } = resolutionMap[t.isin]
            return {
              ...t,
              resolvedTicker: ticker || null,
              resolvedSource: source as NormalizedTransaction['resolvedSource'],
            }
          }
          return { ...t, resolvedTicker: null, resolvedSource: 'unknown' as const }
        })

        if (!cancelled) setResolvedTxs(enriched)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      } finally {
        if (!cancelled) setResolving(false)
      }
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [transactions])

  const totalPending = transactions.filter(t => t.isin && !t.symbol).length
  const uniqueUnresolved = Array.from(
    new Set(resolvedTxs.filter(t => t.isin && !t.resolvedTicker && !t.symbol).map(t => t.isin))
  )

  const totalResolved = stats ? stats.cache + stats.master + stats.eodhd : 0
  const totalIsins = totalResolved + (stats?.unknown ?? 0)
  const coverage = totalIsins > 0 ? Math.round((totalResolved / totalIsins) * 100) : 100

  return (
    <div>
      <h3 className="text-[14px] font-semibold text-white mb-1 tracking-tight">
        ISINs auflösen
      </h3>
      <p className="text-[12px] text-white/30 mb-5">
        Ermittle für jede Position den passenden Ticker.
      </p>

      {resolving ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          <p className="text-[12px] text-white/40">
            {totalPending} ISIN{totalPending === 1 ? '' : 's'} werden aufgelöst…
          </p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 text-[13px] mb-3">{error}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[12px] text-white/60 transition-all"
          >
            Zurück
          </button>
        </div>
      ) : (
        <>
          {/* Coverage-Summary */}
          {stats && totalIsins > 0 && (
            <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] mb-4 overflow-hidden">
              {/* Header mit Coverage-% */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04]">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[10px] font-medium text-white/30 uppercase tracking-[0.14em]">
                    Aufgelöst
                  </span>
                  <span className="text-[13px] font-semibold text-white tabular-nums">
                    {totalResolved} <span className="text-white/25">/ {totalIsins}</span>
                  </span>
                </div>
                <span
                  className={`text-[12px] font-medium tabular-nums ${
                    coverage === 100
                      ? 'text-emerald-400'
                      : coverage >= 85
                        ? 'text-white/70'
                        : 'text-amber-300/80'
                  }`}
                >
                  {coverage}%
                </span>
              </div>

              {/* Coverage-Balken */}
              <div className="h-[2px] bg-white/[0.04]">
                <div
                  className="h-full bg-white/40 transition-all"
                  style={{ width: `${coverage}%` }}
                />
              </div>

              {/* Source-Split: minimalistische Zeile */}
              <div className="grid grid-cols-4 divide-x divide-white/[0.04]">
                <StatCell label="Cache" value={stats.cache} />
                <StatCell label="Master" value={stats.master} />
                <StatCell label="EODHD" value={stats.eodhd} />
                <StatCell
                  label="Unbekannt"
                  value={stats.unknown}
                  accent={stats.unknown > 0 ? 'amber' : undefined}
                />
              </div>
            </section>
          )}

          {/* Unbekannte ISINs — dezente Warnung */}
          {uniqueUnresolved.length > 0 && (
            <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] px-5 py-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <svg
                  className="w-3.5 h-3.5 text-amber-300/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <p className="text-[12px] font-semibold text-white/85 tracking-tight">
                  {uniqueUnresolved.length} ISIN{uniqueUnresolved.length === 1 ? '' : 's'} nicht auflösbar
                </p>
              </div>

              {/* ISIN-Chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {uniqueUnresolved.slice(0, 8).map(isin => (
                  <span
                    key={isin}
                    className="inline-flex px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] text-[10px] font-mono text-white/55 tracking-tight"
                  >
                    {isin}
                  </span>
                ))}
                {uniqueUnresolved.length > 8 && (
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] text-white/30">
                    +{uniqueUnresolved.length - 8} weitere
                  </span>
                )}
              </div>

              <p className="text-[11px] text-white/40 leading-relaxed">
                Diese Transaktionen kannst du im nächsten Schritt manuell mappen oder beim Import überspringen.
              </p>
            </section>
          )}

          {/* Alles erfolgreich */}
          {uniqueUnresolved.length === 0 && totalPending > 0 && (
            <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] px-5 py-3.5 mb-4 flex items-center gap-2.5">
              <svg
                className="w-3.5 h-3.5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <p className="text-[12px] text-white/80 tracking-tight">
                Alle {totalPending} ISINs erfolgreich aufgelöst
              </p>
            </section>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => onDone(resolvedTxs)}
              className="px-5 py-2.5 rounded-full bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all flex items-center gap-1.5"
            >
              Weiter
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'amber'
}) {
  const valueColor = value === 0
    ? 'text-white/25'
    : accent === 'amber'
      ? 'text-amber-300'
      : 'text-white/85'
  return (
    <div className="px-4 py-3">
      <p className={`text-[18px] font-semibold tabular-nums tracking-tight ${valueColor}`}>
        {value}
      </p>
      <p className="text-[9px] font-medium text-white/30 uppercase tracking-[0.14em] mt-0.5">
        {label}
      </p>
    </div>
  )
}
