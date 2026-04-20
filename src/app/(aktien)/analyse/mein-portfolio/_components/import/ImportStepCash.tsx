'use client'

import React, { useMemo } from 'react'
import type { NormalizedTransaction } from './types'

interface Props {
  transactions: NormalizedTransaction[]
  cashMode: 'include' | 'ignore'
  onChange: (mode: 'include' | 'ignore') => void
  onNext: () => void
  onBack: () => void
  formatCurrency: (v: number) => string
}

export default function ImportStepCash({
  transactions,
  cashMode,
  onChange,
  onNext,
  onBack,
  formatCurrency,
}: Props) {
  const cashTxs = useMemo(
    () => transactions.filter(t => t.type === 'cash_deposit' || t.type === 'cash_withdrawal'),
    [transactions]
  )

  const netCash = useMemo(() => {
    return cashTxs.reduce((sum, t) => {
      const v = t.quantity * t.price || 0
      return t.type === 'cash_deposit' ? sum + v : sum - v
    }, 0)
  }, [cashTxs])

  // Wenn keine Cash-Transaktionen: Step überspringen macht Sinn, aber der Wizard
  // zeigt den Step trotzdem kurz — einfach mit "Weiter" bestätigen
  if (cashTxs.length === 0) {
    return (
      <div>
        <h3 className="text-[14px] font-semibold text-white mb-1">Cash-Handling</h3>
        <p className="text-[12px] text-white/30 mb-5">
          Keine Ein-/Auszahlungen in diesem Import — kein Cash-Mode nötig.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Zurück
          </button>
          <button
            onClick={onNext}
            className="px-5 py-2 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all"
          >
            Weiter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-[14px] font-semibold text-white mb-1">Cash-Handling</h3>
      <p className="text-[12px] text-white/30 mb-5">
        {cashTxs.length} Cash-Bewegungen · Saldo{' '}
        <span className={netCash >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          {netCash >= 0 ? '+' : ''}
          {formatCurrency(netCash)}
        </span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => onChange('include')}
          className={`text-left p-5 rounded-2xl border transition-all ${
            cashMode === 'include'
              ? 'bg-emerald-500/[0.06] border-emerald-500/30'
              : 'bg-[#0c0c16] border-white/[0.04] hover:border-white/[0.08]'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                cashMode === 'include' ? 'border-emerald-400' : 'border-white/20'
              }`}
            >
              {cashMode === 'include' && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
            </div>
            <p className="text-[13px] font-semibold text-white">Cash importieren</p>
          </div>
          <p className="text-[11px] text-white/40 leading-relaxed">
            Ein-/Auszahlungen werden als Cash-Transaktionen gebucht und beeinflussen deine
            Cash-Position. <span className="text-white/60">Empfohlen</span>, wenn du den Kontostand im
            Broker 1:1 nachbilden willst.
          </p>
        </button>

        <button
          onClick={() => onChange('ignore')}
          className={`text-left p-5 rounded-2xl border transition-all ${
            cashMode === 'ignore'
              ? 'bg-white/[0.06] border-white/[0.15]'
              : 'bg-[#0c0c16] border-white/[0.04] hover:border-white/[0.08]'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                cashMode === 'ignore' ? 'border-white/70' : 'border-white/20'
              }`}
            >
              {cashMode === 'ignore' && <div className="w-2 h-2 rounded-full bg-white/70" />}
            </div>
            <p className="text-[13px] font-semibold text-white">Cash ignorieren</p>
          </div>
          <p className="text-[11px] text-white/40 leading-relaxed">
            Ein-/Auszahlungen werden übersprungen. Wähle das, wenn du nur die Wertpapier-Positionen
            importieren willst.
          </p>
        </button>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-[12px] text-white/40 hover:text-white/70 transition-colors"
        >
          Zurück
        </button>
        <button
          onClick={onNext}
          className="px-5 py-2 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all flex items-center gap-1.5"
        >
          Weiter
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
