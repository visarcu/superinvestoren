'use client'

// "Frisches Geld": Was wirklich vom Bankkonto kam — die Basis der echten
// Sparquote. Weist ehrlich aus, wenn mehr investiert wurde als netto
// eingezahlt (Kredit oder reinvestierte Verkaufserlöse).

import React, { useMemo } from 'react'
import type { Transaction } from '@/hooks/usePortfolio'

interface FreshMoneyCardProps {
  transactions: Transaction[]
  formatCurrency: (value: number) => string
}

function Stat({
  label,
  value,
  tone,
  hint,
  emphasised = false,
}: {
  label: string
  value: string
  tone: 'emerald' | 'red' | 'neutral'
  hint: string
  emphasised?: boolean
}) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-400' : tone === 'red' ? 'text-red-400' : 'text-theme-primary'
  return (
    <div className="bg-theme-card px-4 py-3">
      <p className="text-[10px] font-medium text-theme-muted uppercase tracking-[0.14em] mb-1">
        {label}
      </p>
      <p className={`text-[15px] font-semibold tabular-nums ${toneClass} ${emphasised ? 'text-[17px]' : ''}`}>
        {value}
      </p>
      <p className="text-[10px] text-theme-muted mt-0.5">{hint}</p>
    </div>
  )
}

export default function FreshMoneyCard({ transactions, formatCurrency }: FreshMoneyCardProps) {
  const stats = useMemo(() => {
    let depositsIn = 0       // Σ Einzahlungen (vom Bankkonto rein)
    let withdrawalsOut = 0   // Σ Auszahlungen (raus aufs Bankkonto)
    let bought = 0           // Σ Käufe (in Markt investiert)
    let sold = 0             // Σ Verkäufe (aus Markt zurück)
    for (const t of transactions) {
      const v = t.total_value || t.price * t.quantity
      if (t.type === 'cash_deposit') depositsIn += v
      else if (t.type === 'cash_withdrawal') withdrawalsOut += v
      else if (t.type === 'buy') bought += v
      else if (t.type === 'sell') sold += v
    }
    const netDeposits = depositsIn - withdrawalsOut  // echte Sparquote-Basis
    const netInvested = bought - sold                // netto in den Markt
    // "Fremdfinanziert" = Käufe minus echtes Geld (Kredit / Reinvest aus Verkäufen)
    const externallyFinanced = Math.max(0, netInvested - netDeposits)
    return { depositsIn, withdrawalsOut, netDeposits, bought, sold, netInvested, externallyFinanced }
  }, [transactions])

  const hasData = stats.depositsIn > 0 || stats.withdrawalsOut > 0 || stats.bought > 0
  if (!hasData) return null

  return (
    <section className="bg-theme-card border border-theme mb-5 rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-[13px] font-semibold text-theme-primary tracking-tight">
          Frisches Geld
        </h3>
        <p className="text-[11px] text-theme-muted mt-0.5">
          Was wirklich vom Bankkonto kam — die Basis deiner echten Sparquote.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-theme-secondary rounded-lg overflow-hidden border border-theme">
        <Stat
          label="Eingezahlt"
          value={`+${formatCurrency(stats.depositsIn)}`}
          tone="emerald"
          hint="Σ Einzahlungen aufs Depot"
        />
        <Stat
          label="Ausgezahlt"
          value={stats.withdrawalsOut > 0
            ? `−${formatCurrency(stats.withdrawalsOut)}`
            : `${formatCurrency(0)}`}
          tone={stats.withdrawalsOut > 0 ? 'red' : 'neutral'}
          hint="Σ Auszahlungen vom Depot"
        />
        <Stat
          label="Netto-Sparen"
          value={`${stats.netDeposits >= 0 ? '+' : '−'}${formatCurrency(Math.abs(stats.netDeposits))}`}
          tone={stats.netDeposits >= 0 ? 'emerald' : 'red'}
          hint="Eingezahlt − Ausgezahlt"
          emphasised
        />
        <Stat
          label="Investiert"
          value={`${formatCurrency(stats.bought)}`}
          tone="neutral"
          hint={stats.externallyFinanced > 0
            ? `Davon ${formatCurrency(stats.externallyFinanced)} aus Kredit/Verkäufen`
            : 'Σ Käufe (brutto)'}
        />
      </div>
      {stats.externallyFinanced > 0 && (
        <p className="mt-3 text-[11px] text-amber-500 dark:text-amber-400/80 leading-relaxed">
          Du hast {formatCurrency(stats.bought)} investiert, aber nur{' '}
          {formatCurrency(stats.netDeposits)} netto eingezahlt — die Differenz von{' '}
          <span className="font-medium">{formatCurrency(stats.externallyFinanced)}</span>{' '}
          kam aus Kredit oder Verkaufserlösen.
        </p>
      )}
    </section>
  )
}
