// src/components/portfolio/QuickStats.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { perfColor } from '@/utils/formatters'
import { ChevronRightIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { formatDecimal } from '@/lib/displayFormat'
import type { DepotReturn } from '@/lib/portfolio/metrics'

interface QuickStatsProps {
  totalValue: number
  /** Wert der Wertpapiere ohne Cash */
  securitiesValue: number
  cashPosition: number
  brokerCredit?: number
  depotReturn: DepotReturn
  xirrPercent: number | null
  activeInvestments: number
  formatCurrency: (amount: number) => string
  formatPercentage: (value: number) => string
  onCashClick?: () => void
  onCreditClick?: () => void
  onRealizedClick?: () => void
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
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 terminal-glass-strong rounded-lg p-3 z-50">
          {/* Pfeil nach oben */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-px">
            <div className="w-2 h-2 hidden rotate-45 translate-y-1" />
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
  securitiesValue,
  cashPosition,
  brokerCredit = 0,
  depotReturn,
  xirrPercent,
  activeInvestments,
  formatCurrency,
  formatPercentage,
  onCashClick,
  onCreditClick,
  onRealizedClick,
}: QuickStatsProps) {
  const { priceGain, realized, dividends, total, totalPercent, orderFees, orderTaxes } = depotReturn
  // Seltenere Teile nur, wenn es sie gibt. Alle Zeilen zusammen ergeben die Summe.
  const otherRows = [
    { label: 'Zinsen', value: depotReturn.interest },
    { label: 'Kontogebühren', value: depotReturn.accountFees },
    { label: 'Steuerausgleich', value: depotReturn.taxes },
    { label: 'Überträge', value: depotReturn.transfers },
  ].filter(row => Math.abs(row.value) >= 0.005)
  const hasBreakdown = realized !== 0 || dividends !== 0 || otherRows.length > 0
  // Negatives Cash ist ein Kredit beim Broker
  const borrowed = cashPosition < 0
  const hasCredit = brokerCredit < 0
  // Eigenkapital = Gesamtwert + Kredit (Kredit ist negativ)
  const equity = totalValue + brokerCredit
  const statCardClass = 'bg-theme-card border border-theme rounded-xl p-4'

  return (
    <div className={`grid gap-4 ${hasCredit ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4'}`}>
      {/* Wertpapiere (der Gesamtwert steht groß im Kopf darüber) */}
      <div className={statCardClass}>
        <p className="text-xs text-neutral-500 mb-1">Wertpapiere</p>
        <p className="depot-num text-lg font-semibold text-neutral-900 dark:text-white">{formatCurrency(securitiesValue)}</p>
        <p className="text-xs text-neutral-500 mt-1">
          {activeInvestments} Position{activeInvestments !== 1 ? 'en' : ''}
        </p>
        {hasCredit && (
          <p className="text-xs text-amber-500/80 mt-0.5">
            Eigenkapital: {formatCurrency(equity)}
          </p>
        )}
      </div>

      {/* Cash */}
      <div
        className={`${statCardClass} ${onCashClick ? 'cursor-pointer hover:border-neutral-300 dark:hover:border-teal-300/30 dark:hover:bg-white/[0.05] transition-colors' : ''}`}
        onClick={onCashClick}
      >
        <p className="text-xs text-neutral-500 mb-1">
          {borrowed ? 'Kredit' : 'Cash'} {onCashClick && <span className="text-neutral-400 dark:text-neutral-600">✎</span>}
        </p>
        <p className={`depot-num text-lg font-semibold ${cashPosition < 0 ? 'text-red-500 dark:text-red-400' : 'text-neutral-900 dark:text-white'}`}>{formatCurrency(cashPosition)}</p>
        <p className="text-xs text-neutral-500 mt-1">
          {borrowed
            ? `${formatDecimal(securitiesValue > 0 ? (-cashPosition / securitiesValue) * 100 : 0, 1)} % der Wertpapiere beliehen`
            : `${formatDecimal(totalValue > 0 ? (cashPosition / totalValue) * 100 : 0, 1)} % Cash-Quote`}
        </p>
      </div>

      {/* Wertpapierkredit — nur anzeigen wenn vorhanden */}
      {hasCredit && (
        <div
          className={`bg-theme-card border border-theme rounded-xl p-4 border-red-200/30 dark:border-red-400/20 ${onCreditClick ? 'cursor-pointer hover:border-red-300/50 dark:hover:border-red-400/35 transition-colors' : ''}`}
          onClick={onCreditClick}
        >
          <p className="text-xs text-neutral-500 mb-1">
            Wertpapierkredit {onCreditClick && <span className="text-neutral-400 dark:text-neutral-600">✎</span>}
          </p>
          <p className="depot-num text-lg font-semibold text-red-500 dark:text-red-400">{formatCurrency(brokerCredit)}</p>
          <p className="text-xs text-neutral-500 mt-1">
            {formatDecimal(totalValue > 0 ? Math.abs((brokerCredit / totalValue) * 100) : 0, 1)}% Leverage-Quote
          </p>
        </div>
      )}

      {/* Gesamtrendite mit allen Teilen */}
      <div className={statCardClass}>
        <div className="text-xs text-neutral-500 mb-1 flex items-center">
          {hasBreakdown ? 'Gesamtrendite' : 'Gewinn / Verlust'}
          <InfoTooltip title="Gesamtrendite">
            <p>
              Dein gesamter Gewinn oder Verlust in diesem Depot. Alle Zeilen zusammen ergeben die Summe.
            </p>
            <p className="mt-1">
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Kursgewinn:</span> Wertzuwachs der Positionen, die du noch hältst.
            </p>
            <p>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Realisiert:</span> Verkäufe nach Gebühren und Steuern.
            </p>
            <p>
              <span className="font-medium text-neutral-800 dark:text-neutral-200">Dividenden:</span> so, wie dein Broker sie gutgeschrieben hat.
            </p>
            {otherRows.some(row => row.label === 'Zinsen') && (
              <p>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">Zinsen:</span> Guthabenzinsen minus Kreditzinsen.
              </p>
            )}
            {otherRows.some(row => row.label === 'Kontogebühren') && (
              <p>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">Kontogebühren:</span> Abo und Gebühren auf Einzahlungen.
              </p>
            )}
            {otherRows.some(row => row.label === 'Überträge') && (
              <p>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">Überträge:</span> Wertzuwachs von Anteilen, die du in ein anderes Depot übertragen hast, bis zum Übertrag.
              </p>
            )}
            {(orderFees > 0 || orderTaxes > 0) && (
              <p className="mt-1 text-neutral-500">
                Schon enthalten: {formatCurrency(orderFees)} Ordergebühren{orderTaxes > 0 ? ` und ${formatCurrency(orderTaxes)} Steuern auf Orders` : ''}.
              </p>
            )}
            <p className="text-neutral-500">
              Der Prozentwert bezieht sich auf den Einstand der Positionen, die du noch hältst, nicht auf das gesamte jemals investierte Kapital.
            </p>
          </InfoTooltip>
        </div>
        <p className={`depot-num text-lg font-semibold ${perfColor(total)}`}>
          {total >= 0 ? '+' : ''}{formatCurrency(total)}
        </p>
        <p className={`text-xs mt-1 ${perfColor(totalPercent, 'muted')}`}>
          {formatPercentage(totalPercent)} gesamt
        </p>

        {/* Breakdown: nur anzeigen wenn Realisiert oder Dividenden vorhanden */}
        {hasBreakdown && (
          <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-white/[0.05] space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-neutral-500">Kursgewinn</span>
              <span className={perfColor(priceGain, 'muted')}>
                {priceGain >= 0 ? '+' : ''}{formatCurrency(priceGain)}
              </span>
            </div>
            {onRealizedClick && realized !== 0 ? (
              <button
                type="button"
                onClick={onRealizedClick}
                className="group flex w-full items-center justify-between rounded-md -mx-1 px-1 py-0.5 text-[10px] transition-colors hover:bg-neutral-100 dark:hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                title="Details zu realisierten Gewinnen anzeigen"
              >
                <span className="flex items-center gap-1 text-neutral-500">
                  Realisiert
                  <span className="rounded-full border border-teal-400/20 px-1.5 py-px text-[9px] font-medium text-teal-400/80 opacity-90 transition-colors group-hover:border-teal-300/40 group-hover:text-teal-300">
                    Details
                  </span>
                </span>
                <span className={`flex items-center gap-0.5 ${perfColor(realized, 'muted')}`}>
                  {realized >= 0 ? '+' : ''}{formatCurrency(realized)}
                  <ChevronRightIcon className="h-3 w-3 text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:text-teal-400" />
                </span>
              </button>
            ) : (
              <div className="flex justify-between text-[10px]">
                <span className="text-neutral-500">Realisiert</span>
                <span className={perfColor(realized, 'muted')}>
                  {realized >= 0 ? '+' : ''}{formatCurrency(realized)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[10px]">
              <span className="text-neutral-500">Dividenden</span>
              <span className={perfColor(dividends, 'muted')}>
                {dividends >= 0 ? '+' : ''}{formatCurrency(dividends)}
              </span>
            </div>
            {otherRows.map(row => (
              <div key={row.label} className="flex justify-between text-[10px]">
                <span className="text-neutral-500">{row.label}</span>
                <span className={perfColor(row.value, 'muted')}>
                  {row.value >= 0 ? '+' : ''}{formatCurrency(row.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* XIRR */}
      <div className={statCardClass}>
        <div className="text-xs text-neutral-500 mb-1 flex items-center">
          Interner Zinsfuß (XIRR)
          <InfoTooltip title="Interner Zinsfuß (XIRR)">
            <p>
              Der XIRR (Extended Internal Rate of Return) ist die <span className="font-medium text-neutral-800 dark:text-neutral-200">annualisierte Rendite</span> deines Portfolios, also deine Rendite pro Jahr.
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
        </div>
        {xirrPercent !== null ? (
          <>
            <p className={`depot-num text-lg font-semibold ${perfColor(xirrPercent)}`}>
              {formatPercentage(xirrPercent)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">annualisiert (p.a.)</p>
          </>
        ) : (
          <>
            <p className="depot-num text-lg font-semibold text-neutral-400 dark:text-neutral-600">–</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">min. 30 Tage Haltedauer</p>
          </>
        )}
      </div>
    </div>
  )
}
