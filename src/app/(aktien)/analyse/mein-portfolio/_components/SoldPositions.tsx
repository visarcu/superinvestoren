'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Transaction } from '../_lib/types'

interface SoldPositionsProps {
  transactions: Transaction[]
  formatCurrency: (v: number) => string
  formatPercentage: (v: number) => string
}

interface ClosedPosition {
  symbol: string
  name: string
  totalBought: number
  avgBuyPrice: number
  avgSellPrice: number
  totalInvested: number
  totalReceived: number
  realizedGain: number
  realizedGainPercent: number
  dividends: number
  firstBuyDate: string
  lastSellDate: string
  totalReturn: number
}

/**
 * Berechnet alle vollständig verkauften Positionen via Average-Cost-Method.
 * Logik 1:1 aus src/components/portfolio/SoldPositions.tsx übernommen.
 */
function computeClosedPositions(transactions: Transaction[]): ClosedPosition[] {
  if (!transactions || transactions.length === 0) return []
  const bySymbol = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    if (!tx.symbol) continue
    if (!bySymbol.has(tx.symbol)) bySymbol.set(tx.symbol, [])
    bySymbol.get(tx.symbol)!.push(tx)
  }

  const closed: ClosedPosition[] = []
  bySymbol.forEach((txs, symbol) => {
    const sorted = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let totalShares = 0
    let totalCost = 0
    let totalSellRevenue = 0
    let totalSharesBought = 0
    let totalSharesSold = 0
    let dividends = 0
    let firstName = ''
    let firstBuyDate = ''
    let lastSellDate = ''

    for (const tx of sorted) {
      if (tx.type === 'buy' || tx.type === 'transfer_in') {
        totalShares += tx.quantity
        totalCost += tx.quantity * tx.price
        totalSharesBought += tx.quantity
        if (!firstName) firstName = tx.name
        if (!firstBuyDate) firstBuyDate = tx.date
      } else if (tx.type === 'sell') {
        const avgCost = totalShares > 0 ? totalCost / totalShares : 0
        totalShares -= tx.quantity
        totalCost -= tx.quantity * avgCost
        totalSellRevenue += tx.quantity * tx.price
        totalSharesSold += tx.quantity
        lastSellDate = tx.date
        if (totalShares <= 0.0001) {
          totalShares = 0
          totalCost = 0
        }
      } else if (tx.type === 'transfer_out') {
        if (totalShares > 0) {
          const avgCost = totalCost / totalShares
          totalShares -= tx.quantity
          totalCost -= tx.quantity * avgCost
          if (totalShares <= 0.0001) {
            totalShares = 0
            totalCost = 0
          }
        }
      } else if (tx.type === 'dividend') {
        dividends += tx.total_value
      }
    }

    // Nur vollständig geschlossene Positionen
    if (totalShares <= 0.0001 && totalSharesSold > 0) {
      const totalInvested = sorted
        .filter(t => t.type === 'buy' || t.type === 'transfer_in')
        .reduce((sum, t) => sum + t.quantity * t.price, 0)
      const realizedGain = totalSellRevenue - totalInvested
      const realizedGainPercent = totalInvested > 0 ? (realizedGain / totalInvested) * 100 : 0
      closed.push({
        symbol,
        name: firstName,
        totalBought: totalSharesBought,
        avgBuyPrice: totalSharesBought > 0 ? totalInvested / totalSharesBought : 0,
        avgSellPrice: totalSharesSold > 0 ? totalSellRevenue / totalSharesSold : 0,
        totalInvested,
        totalReceived: totalSellRevenue,
        realizedGain,
        realizedGainPercent,
        dividends,
        firstBuyDate,
        lastSellDate,
        totalReturn: realizedGain + dividends,
      })
    }
  })

  return closed.sort((a, b) => new Date(b.lastSellDate).getTime() - new Date(a.lastSellDate).getTime())
}

export default function SoldPositions({
  transactions,
  formatCurrency,
  formatPercentage,
}: SoldPositionsProps) {
  const [expanded, setExpanded] = useState(false)

  const closedPositions = useMemo(() => computeClosedPositions(transactions), [transactions])

  if (closedPositions.length === 0) return null

  const totalRealized = closedPositions.reduce((s, p) => s + p.realizedGain, 0)
  const totalDividends = closedPositions.reduce((s, p) => s + p.dividends, 0)
  const totalReturn = totalRealized + totalDividends

  const visible = expanded ? closedPositions : closedPositions.slice(0, 3)

  return (
    <section className="bg-[#0c0c16] border border-white/[0.04] rounded-2xl overflow-hidden mt-6">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-6 py-4 flex items-center justify-between border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors"
      >
        <div className="text-left">
          <h2 className="text-[13px] font-semibold text-white/80">Verkaufte Positionen</h2>
          <p className="text-[11px] text-white/25 mt-0.5">
            {closedPositions.length} {closedPositions.length === 1 ? 'Position' : 'Positionen'} · realisiert{' '}
            <span className={totalRealized >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}>
              {totalRealized >= 0 ? '+' : ''}
              {formatCurrency(totalRealized)}
            </span>
            {totalDividends > 0 && (
              <>
                {' · Dividenden '}
                <span className="text-emerald-400/80">+{formatCurrency(totalDividends)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-white/15 uppercase tracking-wider">Gesamt</p>
            <p
              className={`text-[15px] font-bold tabular-nums ${
                totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {totalReturn >= 0 ? '+' : ''}
              {formatCurrency(totalReturn)}
            </p>
          </div>
          <svg
            className={`w-4 h-4 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Liste */}
      <div>
        {visible.map(p => {
          const positive = p.realizedGain >= 0
          return (
            <Link
              key={p.symbol}
              href={`/analyse/aktien/${p.symbol}`}
              className="grid grid-cols-12 gap-3 items-center px-6 py-3 border-b border-white/[0.03] last:border-b-0 hover:bg-white/[0.02] transition-colors group"
            >
              {/* Aktie */}
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/v1/logo/${p.symbol}?size=60`}
                  alt={p.symbol}
                  className="w-7 h-7 rounded-lg bg-white/[0.06] object-contain flex-shrink-0"
                  onError={e => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-white/70 group-hover:text-white">{p.symbol}</p>
                  <p className="text-[10px] text-white/20 truncate">{p.name}</p>
                </div>
              </div>

              {/* Stk verkauft */}
              <div className="col-span-2 text-right">
                <p className="text-[11px] text-white/30 tabular-nums">
                  {p.totalBought.toLocaleString('de-DE', { maximumFractionDigits: 4 })} Stk.
                </p>
              </div>

              {/* Avg-Kauf → Avg-Verkauf */}
              <div className="col-span-3 text-right">
                <p className="text-[11px] text-white/40 tabular-nums">
                  Ø {formatCurrency(p.avgBuyPrice)} → {formatCurrency(p.avgSellPrice)}
                </p>
              </div>

              {/* Realisiert */}
              <div className="col-span-3 text-right">
                <p
                  className={`text-[12px] font-semibold tabular-nums ${
                    positive ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {positive ? '+' : ''}
                  {formatCurrency(p.realizedGain)}
                </p>
                <p
                  className={`text-[10px] tabular-nums ${
                    positive ? 'text-emerald-400/50' : 'text-red-400/50'
                  }`}
                >
                  {formatPercentage(p.realizedGainPercent)}
                </p>
              </div>
            </Link>
          )
        })}

        {!expanded && closedPositions.length > 3 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full px-6 py-3 text-[11px] text-white/30 hover:text-white/60 hover:bg-white/[0.02] transition-colors"
          >
            Alle {closedPositions.length} verkauften Positionen zeigen
          </button>
        )}
      </div>
    </section>
  )
}
