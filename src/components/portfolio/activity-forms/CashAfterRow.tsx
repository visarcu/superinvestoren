// src/components/portfolio/activity-forms/CashAfterRow.tsx
'use client'

import React from 'react'

/**
 * Zeile "Bargeld danach" in den Formularen für Kauf, Verkauf und Dividende.
 * Nur für Depots, die Geld führen (usePortfolio.tracksCash): Dort bewegt die
 * Buchung das Bargeld wie beim Import, in anderen Depots bleibt es stehen und
 * die Zeile entfällt. Rutscht das Bargeld ins Minus, fehlt meist eine
 * Einzahlung; gebucht wird trotzdem, wie beim Import.
 */
export default function CashAfterRow({
  cashAfter,
  formatCurrency,
}: {
  cashAfter: number
  formatCurrency: (amount: number) => string
}) {
  const negative = cashAfter < -0.005
  return (
    <div className="pt-1.5 border-t border-white/[0.04] space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-white/55">Bargeld danach</span>
        <span className={`font-semibold tabular-nums ${negative ? 'text-amber-300' : 'text-white'}`}>
          {formatCurrency(cashAfter)}
        </span>
      </div>
      {negative && (
        <p className="text-[11px] text-amber-300/80">Das Bargeld wird negativ. Fehlt eine Einzahlung?</p>
      )}
    </div>
  )
}
