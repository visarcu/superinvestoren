'use client'

import React from 'react'
import type { ImportResult } from './importExecutor'

interface Props {
  result: ImportResult
  onClose: () => void
}

export default function ImportStepDone({ result, onClose }: Props) {
  const hasErrors = result.errors.length > 0

  return (
    <div className="text-center py-6">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
          hasErrors ? 'bg-amber-500/10' : 'bg-emerald-500/10'
        }`}
      >
        {hasErrors ? (
          <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>

      <h3 className="text-[15px] font-semibold text-white mb-1">
        {hasErrors ? 'Import teilweise erfolgreich' : 'Import erfolgreich'}
      </h3>

      <div className="max-w-sm mx-auto mt-5 space-y-2">
        <Row label="Transaktionen" value={result.insertedTransactions} />
        <Row label="Positionen aktualisiert" value={result.upsertedHoldings} />
        {result.cashUpdated > 0 && <Row label="Cash-Position angepasst" value="✓" />}
      </div>

      {hasErrors && (
        <div className="max-w-md mx-auto mt-5 text-left bg-amber-500/[0.05] border border-amber-500/[0.15] rounded-xl px-4 py-3">
          <p className="text-[11px] font-semibold text-amber-400 mb-1.5">{result.errors.length} Warnung{result.errors.length === 1 ? '' : 'en'}</p>
          <ul className="space-y-1">
            {result.errors.slice(0, 3).map((e, i) => (
              <li key={i} className="text-[11px] text-amber-400/80">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-6 px-5 py-2 rounded-xl bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-all"
      >
        Fertig
      </button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] rounded-lg">
      <span className="text-[12px] text-white/60">{label}</span>
      <span className="text-[13px] font-bold text-white tabular-nums">{value}</span>
    </div>
  )
}
