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

      // Sammle ungelöste ISINs (Transaktionen mit isin aber ohne symbol)
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

        // Transaktionen mit Ticker anreichern
        const enriched = transactions.map(t => {
          if (t.symbol) return t // Parser kannte den Ticker schon (z.B. Freedom24)
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
  const unresolved = resolvedTxs.filter(t => t.isin && !t.symbol && !t.resolvedTicker).length
  const uniqueUnresolved = Array.from(
    new Set(resolvedTxs.filter(t => t.isin && !t.resolvedTicker && !t.symbol).map(t => t.isin))
  )

  return (
    <div>
      <h3 className="text-[14px] font-semibold text-white mb-1">ISINs auflösen</h3>
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
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[12px] text-white/60 transition-all"
          >
            Zurück
          </button>
        </div>
      ) : (
        <>
          {/* Statistik */}
          {stats && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Stat label="Cache" value={stats.cache} color="emerald" />
              <Stat label="Master" value={stats.master} color="blue" />
              <Stat label="EODHD" value={stats.eodhd} color="violet" />
              <Stat label="Unbekannt" value={stats.unknown} color="red" />
            </div>
          )}

          {/* Unbekannte ISINs — Warnung */}
          {uniqueUnresolved.length > 0 && (
            <div className="bg-amber-500/[0.05] border border-amber-500/[0.2] rounded-xl px-4 py-3 mb-4">
              <p className="text-[12px] font-semibold text-amber-400 mb-2">
                ⚠ {uniqueUnresolved.length} ISIN{uniqueUnresolved.length === 1 ? '' : 's'} konnten nicht aufgelöst werden
              </p>
              <div className="space-y-1">
                {uniqueUnresolved.slice(0, 5).map(isin => (
                  <p key={isin} className="text-[11px] text-amber-400/70 font-mono">
                    {isin}
                  </p>
                ))}
                {uniqueUnresolved.length > 5 && (
                  <p className="text-[10px] text-amber-400/50">
                    +{uniqueUnresolved.length - 5} weitere
                  </p>
                )}
              </div>
              <p className="text-[10px] text-white/40 mt-2">
                Diese Transaktionen werden im nächsten Schritt markiert. Du kannst sie manuell mappen oder beim Import überspringen.
              </p>
            </div>
          )}

          {uniqueUnresolved.length === 0 && totalPending > 0 && (
            <div className="bg-emerald-500/[0.04] border border-emerald-500/[0.15] rounded-xl px-4 py-3 mb-4">
              <p className="text-[12px] font-semibold text-emerald-400">
                ✓ Alle {totalPending} ISINs erfolgreich aufgelöst
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => onDone(resolvedTxs)}
              className="px-5 py-2 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all flex items-center gap-1.5"
            >
              Weiter
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: 'emerald' | 'blue' | 'violet' | 'red' }) {
  const map = {
    emerald: { bg: 'bg-emerald-500/[0.06]', text: 'text-emerald-400' },
    blue: { bg: 'bg-blue-500/[0.06]', text: 'text-blue-400' },
    violet: { bg: 'bg-violet-500/[0.06]', text: 'text-violet-400' },
    red: { bg: 'bg-red-500/[0.06]', text: 'text-red-400' },
  }[color]
  return (
    <div className={`${map.bg} rounded-xl p-3 text-center`}>
      <p className={`text-xl font-bold ${value > 0 ? map.text : 'text-white/35'} tabular-nums`}>{value}</p>
      <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}
