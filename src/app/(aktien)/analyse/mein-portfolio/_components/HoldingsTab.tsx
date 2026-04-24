'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import HoldingRowMenu from './HoldingRowMenu'
import type { Holding } from '../_lib/types'
import type { SuperInvestorOverlap } from './PortfolioClient'

interface HoldingsTabProps {
  holdings: Holding[]
  totalValue: number
  isAllDepotsView: boolean
  /** Tagesänderung in Quote-Währung pro Symbol (aus /api/v1/quotes/batch) */
  dayChangeBySymbol?: Record<string, number>
  /** Tagesänderung in % pro Symbol */
  dayChangePercentBySymbol?: Record<string, number>
  /** Superinvestor-Overlap pro Ticker */
  overlapBySymbol?: Record<string, SuperInvestorOverlap>
  formatCurrency: (v: number) => string
  formatStockPrice: (price: number, showCurrency?: boolean) => string
  formatPercentage: (v: number) => string
  onTopUp: (h: Holding) => void
  onSell: (h: Holding) => void
  onAddDividend: (h: Holding) => void
  onEdit: (h: Holding) => void
  onDelete: (h: Holding) => void
}

export default function HoldingsTab({
  holdings,
  totalValue,
  isAllDepotsView,
  dayChangeBySymbol = {},
  dayChangePercentBySymbol = {},
  overlapBySymbol = {},
  formatCurrency,
  formatStockPrice,
  formatPercentage,
  onTopUp,
  onSell,
  onAddDividend,
  onEdit,
  onDelete,
}: HoldingsTabProps) {
  const sorted = useMemo(() => [...holdings].sort((a, b) => b.value - a.value), [holdings])

  if (sorted.length === 0) return null

  const maxValue = sorted[0]?.value ?? 0

  return (
    <section className="rounded-xl bg-[#0a0a12]/70 border border-white/[0.05] overflow-hidden shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-3 px-5 py-2.5 pr-14 text-[10px] font-medium text-white/30 uppercase tracking-[0.14em] border-b border-white/[0.04] bg-white/[0.015]">
        <div className="col-span-4">Position</div>
        <div className="col-span-1 text-right">Stk.</div>
        <div className="col-span-2 text-right">Kurs</div>
        <div className="col-span-2 text-right">Wert</div>
        <div className="col-span-1 text-right">Heute</div>
        <div className="col-span-2 text-right">Rendite</div>
      </div>

      <div>
        {sorted.map((h, i) => {
          const positive = h.gain_loss >= 0

          const dayChangePerShare = dayChangeBySymbol[h.symbol]
          const dayChangePct = dayChangePercentBySymbol[h.symbol]
          const dayPositionChange =
            typeof dayChangePerShare === 'number' ? dayChangePerShare * h.quantity : null
          const dayPositive = (dayPositionChange ?? 0) >= 0
          const weightPct = totalValue > 0 ? (h.value / totalValue) * 100 : 0
          const weightBarPct = maxValue > 0 ? (h.value / maxValue) * 100 : 0
          const costBasis = h.purchase_price_display * h.quantity
          const overlap = overlapBySymbol[h.symbol]

          return (
            <div
              key={h.id}
              className={`
                relative group
                ${i > 0 ? 'border-t border-white/[0.04]' : ''}
                hover:bg-white/[0.02] transition-colors
              `}
            >
              <Link
                href={`/analyse/mein-portfolio/aktien/${h.symbol}`}
                className="grid grid-cols-12 gap-3 items-center px-5 py-3.5 pr-14"
              >
                {/* Position */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  {/* Logo-Well */}
                  <div className="w-9 h-9 rounded-[8px] bg-white/[0.04] border border-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.02)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/v1/logo/${h.symbol}?size=60`}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={e => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[13px] font-semibold text-white/90 group-hover:text-white transition-colors tracking-tight">
                        {h.symbol}
                      </p>
                      {h.investment_case && (
                        <span
                          title="Investment-Case vorhanden"
                          className="text-amber-400/60 group-hover:text-amber-400 transition-colors"
                          aria-label="Investment-Case vorhanden"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.749 8.713L23 9.423l-5 4.875 1.182 6.882L13 18l-6.182 3.18L8 14.298 3 9.423l3.252-.71L9.999 2l3.751 6.713 5.999 0z" />
                          </svg>
                        </span>
                      )}
                      {/* Weight-Chip */}
                      <span className="px-1.5 py-0.5 rounded-md bg-white/[0.04] text-[9px] font-medium text-white/40 tabular-nums">
                        {weightPct.toFixed(1).replace('.', ',')}%
                      </span>
                      {/* Superinvestor-Overlap Badge */}
                      {overlap && overlap.count > 0 && (
                        <span
                          title={
                            overlap.investors.length > 0
                              ? `Gehalten von ${overlap.investors
                                  .slice(0, 5)
                                  .map(i => i.name)
                                  .join(', ')}${overlap.investors.length > 5 ? ` +${overlap.investors.length - 5}` : ''}`
                              : undefined
                          }
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-400/[0.08] text-amber-300/85 text-[9px] font-medium"
                        >
                          <svg
                            className="w-2.5 h-2.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                            />
                          </svg>
                          <span className="tabular-nums">{overlap.count}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 truncate">{h.name}</p>
                    {/* Tertiary Line: Kostenbasis + Kaufdatum (+ Depot bei All-View) */}
                    <p className="text-[10px] text-white/30 mt-0.5 truncate">
                      <span className="tabular-nums">Ø {formatCurrency(h.purchase_price_display)}</span>
                      <span className="text-white/20 mx-1">·</span>
                      <span className="tabular-nums">{formatCurrency(costBasis)}</span>
                      {h.purchase_date && (
                        <>
                          <span className="text-white/20 mx-1">·</span>
                          <span>seit {formatShortDate(h.purchase_date)}</span>
                        </>
                      )}
                      {isAllDepotsView && h.portfolio_name && (
                        <>
                          <span className="text-white/20 mx-1">·</span>
                          <span className="text-white/40">{h.portfolio_name}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Stk */}
                <div className="col-span-1 text-right">
                  <p className="text-[12px] text-white/40 tabular-nums">
                    {h.quantity.toLocaleString('de-DE', { maximumFractionDigits: 4 })}
                  </p>
                </div>

                {/* Kurs (+ 1D %) */}
                <div className="col-span-2 text-right">
                  <p className="text-[13px] text-white/75 tabular-nums">
                    {formatStockPrice(h.current_price_display ?? h.current_price, true)}
                  </p>
                  {typeof dayChangePct === 'number' && (
                    <p
                      className={`text-[10px] tabular-nums ${
                        dayChangePct >= 0 ? 'text-emerald-400/60' : 'text-red-400/60'
                      }`}
                    >
                      {dayChangePct >= 0 ? '+' : ''}
                      {dayChangePct.toFixed(2).replace('.', ',')}%
                    </p>
                  )}
                </div>

                {/* Wert + Weight-Bar */}
                <div className="col-span-2 text-right">
                  <p className="text-[13px] font-semibold text-white tabular-nums">
                    {formatCurrency(h.value)}
                  </p>
                  <div className="mt-1 ml-auto w-full max-w-[80px] h-[2px] rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-white/25 group-hover:bg-white/40 transition-colors"
                      style={{ width: `${weightBarPct}%` }}
                    />
                  </div>
                </div>

                {/* Heute */}
                <div className="col-span-1 text-right">
                  {dayPositionChange !== null ? (
                    <p
                      className={`text-[12px] font-semibold tabular-nums ${
                        dayPositive ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {dayPositive ? '+' : ''}
                      {formatCurrency(dayPositionChange)}
                    </p>
                  ) : (
                    <p className="text-[12px] text-white/20 tabular-nums">–</p>
                  )}
                </div>

                {/* Rendite — Chip */}
                <div className="col-span-2 flex items-start justify-end">
                  <div
                    className={`
                      inline-flex flex-col items-end px-2 py-1 rounded-md
                      ${
                        positive
                          ? 'bg-emerald-400/[0.08] text-emerald-300'
                          : 'bg-red-400/[0.08] text-red-300'
                      }
                    `}
                  >
                    <span className="text-[12px] font-semibold tabular-nums leading-none">
                      {positive ? '+' : ''}
                      {formatPercentage(h.gain_loss_percent)}
                    </span>
                    <span
                      className={`text-[10px] tabular-nums mt-0.5 leading-none ${
                        positive ? 'text-emerald-300/60' : 'text-red-300/60'
                      }`}
                    >
                      {positive ? '+' : ''}
                      {formatCurrency(h.gain_loss)}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Row-Menu Kebab — absolut positioniert, erscheint bei Hover */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                <HoldingRowMenu
                  holding={h}
                  onTopUp={() => onTopUp(h)}
                  onSell={() => onSell(h)}
                  onAddDividend={() => onAddDividend(h)}
                  onEdit={() => onEdit(h)}
                  onDelete={() => onDelete(h)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function formatShortDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return iso
  }
}
