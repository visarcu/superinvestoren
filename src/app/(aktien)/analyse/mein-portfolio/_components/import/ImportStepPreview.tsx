'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { checkBulkDuplicates } from '@/lib/duplicateCheck'
import type { NormalizedTransaction } from './types'

interface Props {
  transactions: NormalizedTransaction[]
  cashMode: 'include' | 'ignore'
  portfolioId: string
  onBack: () => void
  onImport: (selected: NormalizedTransaction[]) => void
  formatCurrency: (v: number) => string
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  buy: { label: 'Kauf', color: 'text-emerald-400 bg-emerald-500/10' },
  sell: { label: 'Verkauf', color: 'text-red-400 bg-red-500/10' },
  dividend: { label: 'Dividende', color: 'text-amber-400 bg-amber-500/10' },
  cash_deposit: { label: 'Einzahlung', color: 'text-emerald-400/80 bg-emerald-500/10' },
  cash_withdrawal: { label: 'Auszahlung', color: 'text-red-400/80 bg-red-500/10' },
  transfer_in: { label: 'Transfer rein', color: 'text-blue-400 bg-blue-500/10' },
  transfer_out: { label: 'Transfer raus', color: 'text-rose-400 bg-rose-500/10' },
}

export default function ImportStepPreview({
  transactions,
  cashMode,
  portfolioId,
  onBack,
  onImport,
  formatCurrency,
}: Props) {
  // Filter nach Cash-Mode + mit Tickern
  const candidateTxs = useMemo(() => {
    return transactions.filter(t => {
      if (cashMode === 'ignore' && (t.type === 'cash_deposit' || t.type === 'cash_withdrawal')) {
        return false
      }
      return true
    })
  }, [transactions, cashMode])

  const [duplicateIdxs, setDuplicateIdxs] = useState<Set<number>>(new Set())
  const [checking, setChecking] = useState(true)
  const [excludedIdxs, setExcludedIdxs] = useState<Set<number>>(new Set())

  // Duplicate-Check beim Mount
  useEffect(() => {
    let cancelled = false
    async function check() {
      setChecking(true)
      try {
        const candidates = candidateTxs.map(t => ({
          type: t.type,
          symbol: (t.resolvedTicker || t.symbol || '').toUpperCase(),
          date: t.date,
          quantity: t.quantity,
          price: t.price,
        }))
        const dups = await checkBulkDuplicates(portfolioId, candidates)
        if (!cancelled) {
          setDuplicateIdxs(dups)
          // Duplikate initial ausgeschlossen
          setExcludedIdxs(new Set(dups))
        }
      } catch (err) {
        console.error('[Preview] Duplicate-Check error:', err)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [candidateTxs, portfolioId])

  const toggleExclude = (idx: number) => {
    setExcludedIdxs(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const unresolvedIdxs = useMemo(() => {
    const set = new Set<number>()
    candidateTxs.forEach((t, idx) => {
      // Nur Buy/Sell/Dividend brauchen Ticker — Cash/Transfer-out auch
      const needsTicker = ['buy', 'sell', 'dividend', 'transfer_in', 'transfer_out'].includes(t.type)
      if (needsTicker && !t.resolvedTicker && !t.symbol) {
        set.add(idx)
      }
    })
    return set
  }, [candidateTxs])

  // Unresolved auch initial ausschließen
  useEffect(() => {
    setExcludedIdxs(prev => {
      const next = new Set(prev)
      unresolvedIdxs.forEach(i => next.add(i))
      return next
    })
  }, [unresolvedIdxs])

  const toImport = candidateTxs.filter((_, idx) => !excludedIdxs.has(idx))

  return (
    <div>
      <h3 className="text-[14px] font-semibold text-white mb-1">Vorschau</h3>
      <p className="text-[12px] text-white/30 mb-4">
        {candidateTxs.length} Transaktionen erkannt, <span className="text-white/60">{toImport.length}</span> werden importiert.
        {duplicateIdxs.size > 0 && (
          <span className="text-amber-400/80">
            {' · '}
            {duplicateIdxs.size} Duplikate übersprungen
          </span>
        )}
        {unresolvedIdxs.size > 0 && (
          <span className="text-red-400/80">
            {' · '}
            {unresolvedIdxs.size} ohne Ticker
          </span>
        )}
      </p>

      {checking && (
        <div className="flex items-center gap-2 mb-3 text-[11px] text-white/40">
          <div className="w-3 h-3 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
          Duplikate werden geprüft…
        </div>
      )}

      {/* Transaktion-Liste */}
      <div className="max-h-80 overflow-y-auto border border-white/[0.04] rounded-xl divide-y divide-white/[0.03]">
        {candidateTxs.map((t, idx) => {
          const isDup = duplicateIdxs.has(idx)
          const isUnresolved = unresolvedIdxs.has(idx)
          const isExcluded = excludedIdxs.has(idx)
          const typeStyle = TYPE_LABELS[t.type] ?? { label: t.type, color: 'text-white/60 bg-white/[0.04]' }
          const ticker = t.resolvedTicker || t.symbol
          const value = t.quantity * t.price

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                isExcluded ? 'opacity-40' : 'hover:bg-white/[0.015]'
              }`}
            >
              <input
                type="checkbox"
                checked={!isExcluded}
                onChange={() => toggleExclude(idx)}
                disabled={isUnresolved}
                className="w-4 h-4 rounded bg-white/[0.04] border border-white/[0.1] checked:bg-emerald-500 checked:border-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
              />

              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 ${typeStyle.color}`}>
                {typeStyle.label}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-white/80 truncate">
                  {ticker ? (
                    <span className="font-semibold">{ticker}</span>
                  ) : (
                    <span className="text-red-400">Kein Ticker</span>
                  )}
                  <span className="text-white/30 ml-2 font-normal">{t.name}</span>
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-white/30 tabular-nums">
                    {new Date(t.date).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </span>
                  {t.quantity > 0 && (
                    <span className="text-[10px] text-white/30 tabular-nums">
                      {t.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })} × {formatCurrency(t.price)}
                    </span>
                  )}
                  {isDup && (
                    <span className="text-[9px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      DUPLIKAT
                    </span>
                  )}
                  {isUnresolved && (
                    <span className="text-[9px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                      ISIN: {t.isin ?? 'n/a'}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] font-semibold text-white/60 tabular-nums flex-shrink-0">
                {value > 0 ? formatCurrency(value) : '–'}
              </p>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-[12px] text-white/40 hover:text-white/70 transition-colors"
        >
          Zurück
        </button>
        <button
          onClick={() => onImport(toImport)}
          disabled={toImport.length === 0 || checking}
          className="px-5 py-2 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {toImport.length} Transaktionen importieren
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
