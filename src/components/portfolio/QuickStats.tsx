// src/components/portfolio/QuickStats.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { perfColor } from '@/utils/formatters'
import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface QuickStatsProps {
  totalValue: number
  cashPosition: number
  totalGainLoss: number
  totalGainLossPercent: number
  totalRealizedGain: number
  totalDividends: number
  totalReturn: number
  totalReturnPercent: number
  xirrPercent: number | null
  activeInvestments: number
  formatCurrency: (amount: number) => string
  formatPercentage: (value: number) => string
  onCashClick?: () => void
}

// Dezentes Info-Tooltip für Kennzahlen-Erklärungen
function InfoTooltip({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="ml-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        aria-label={`Info: ${title}`}
      >
        <InformationCircleIcon className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 z-50">
          {/* Pfeil nach oben */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-px">
            <div className="w-2 h-2 bg-white dark:bg-neutral-800 border-l border-t border-neutral-200 dark:border-neutral-700 rotate-45 translate-y-1" />
          </div>
          <p className="text-xs font-medium text-neutral-900 dark:text-white mb-1.5">{title}</p>
          <div className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed space-y-1.5">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export default function QuickStats({
  totalValue,
  cashPosition,
  totalGainLoss,
  totalGainLossPercent,
  totalRealizedGain,
  totalDividends,
  totalReturn,
  totalReturnPercent,
  xirrPercent,
  activeInvestments,
  formatCurrency,
  formatPercentage,
  onCashClick,
}: QuickStatsProps) {
  const hasBreakdown = totalRealizedGain !== 0 || totalDividends > 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Gesamtwert */}
      <div className="bg-white dark:bg-neutral-900/50 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800/50">
        <p className="text-xs text-neutral-500 mb-1">Gesamtwert</p>
        <p className="text-xl font-bold text-neutral-900 dark:text-white">{formatCurrency(totalValue)}</p>
        <p className="text-xs text-neutral-500 mt-1">
          {activeInvestments} Position{activeInvestments !== 1 ? 'en' : ''} + Cash
        </p>
      </div>

      {/* Cash */}
      <div
        className={`bg-white dark:bg-neutral-900/50 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800/50 ${onCashClick ? 'cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors' : ''}`}
        onClick={onCashClick}
      >
        <p className="text-xs text-neutral-500 mb-1">Cash {onCashClick && <span className="text-neutral-400 dark:text-neutral-600">✎</span>}</p>
        <p className="text-xl font-bold text-neutral-900 dark:text-white">{formatCurrency(cashPosition)}</p>
        <p className="text-xs text-neutral-500 mt-1">
          {totalValue > 0 ? ((cashPosition / totalValue) * 100).toFixed(1) : '0,0'}% Cash-Quote
        </p>
      </div>

      {/* Gesamtrendite (Unrealisiert + Realisiert + Dividenden) */}
      <div className="bg-white dark:bg-neutral-900/50 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800/50">
        <p className="text-xs text-neutral-500 mb-1 flex items-center">
          {hasBreakdown ? 'Gesamtrendite' : 'Gewinn / Verlust'}
          <InfoTooltip title="Gesamtrendite">
            <p>
              Die Gesamtrendite zeigt deinen gesamten Gewinn oder Verlust — bestehend aus drei Komponenten:
            </p>
            <p className="mt-1">
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Kursgewinn:</span> Unrealisierte Gewinne deiner aktuellen Positionen (aktueller Kurs vs. Kaufpreis).
            </p>
            <p>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Realisiert:</span> Gewinne/Verluste aus bereits verkauften Positionen.
            </p>
            <p>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Dividenden:</span> Erhaltene Dividendenzahlungen.
            </p>
            <p className="mt-1 text-neutral-500">
              Formel: Kursgewinn + Realisiert + Dividenden
            </p>
            <p className="text-neutral-500">
              Der Prozentwert ist bezogen auf das gesamte investierte Kapital.
            </p>
          </InfoTooltip>
        </p>
        <p className={`text-xl font-bold ${perfColor(totalReturn)}`}>
          {totalReturn >= 0 ? '+' : ''}{formatCurrency(totalReturn)}
        </p>
        <p className={`text-xs mt-1 ${perfColor(totalReturnPercent, 'muted')}`}>
          {formatPercentage(totalReturnPercent)} gesamt
        </p>

        {/* Breakdown: nur anzeigen wenn Realisiert oder Dividenden vorhanden */}
        {hasBreakdown && (
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800/30 space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-neutral-500">Kursgewinn</span>
              <span className={perfColor(totalGainLoss, 'muted')}>
                {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-neutral-500">Realisiert</span>
              <span className={perfColor(totalRealizedGain, 'muted')}>
                {totalRealizedGain >= 0 ? '+' : ''}{formatCurrency(totalRealizedGain)}
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-neutral-500">Dividenden</span>
              <span className="text-emerald-600/70 dark:text-emerald-400/70">
                +{formatCurrency(totalDividends)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* XIRR */}
      <div className="bg-white dark:bg-neutral-900/50 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800/50">
        <p className="text-xs text-neutral-500 mb-1 flex items-center">
          Interner Zinsfuß (XIRR)
          <InfoTooltip title="Interner Zinsfuß (XIRR)">
            <p>
              Der XIRR (Extended Internal Rate of Return) ist die <span className="font-medium text-neutral-800 dark:text-neutral-200">annualisierte Rendite</span> deines Portfolios — also deine Rendite pro Jahr.
            </p>
            <p className="mt-1">
              Im Gegensatz zur einfachen Gesamtrendite berücksichtigt der XIRR den <span className="font-medium text-neutral-800 dark:text-neutral-200">Zeitpunkt</span> jeder Transaktion (Käufe, Verkäufe, Dividenden).
            </p>
            <p className="mt-1">
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Beispiel:</span> +20% Gesamtrendite in 2 Jahren → XIRR ≈ +9,5% p.a.
            </p>
            <p className="mt-1 text-neutral-500">
              Der XIRR ist vergleichbar mit dem Zinssatz eines Sparkontos und eignet sich daher gut, um deine Performance mit anderen Anlagen zu vergleichen.
            </p>
            <p className="text-neutral-500">
              Benötigt mindestens 30 Tage Haltedauer für eine sinnvolle Berechnung.
            </p>
          </InfoTooltip>
        </p>
        {xirrPercent !== null ? (
          <>
            <p className={`text-xl font-bold ${perfColor(xirrPercent)}`}>
              {xirrPercent >= 0 ? '+' : ''}{xirrPercent.toFixed(2)}%
            </p>
            <p className="text-xs text-neutral-500 mt-1">annualisiert (p.a.)</p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-neutral-400 dark:text-neutral-600">–</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">min. 30 Tage Haltedauer</p>
          </>
        )}
      </div>
    </div>
  )
}
