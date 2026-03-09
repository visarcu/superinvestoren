// src/components/portfolio/SoldPositions.tsx
'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import Logo from '@/components/Logo'
import { perfColor } from '@/utils/formatters'

interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal' | 'transfer_in' | 'transfer_out'
  symbol: string
  name: string
  quantity: number
  price: number
  total_value: number
  date: string
}

interface ClosedPosition {
  symbol: string
  name: string
  totalBought: number       // Gesamte Stückzahl gekauft
  avgBuyPrice: number       // Durchschnittlicher Kaufpreis
  avgSellPrice: number      // Durchschnittlicher Verkaufspreis
  totalInvested: number     // Gesamtsumme investiert
  totalReceived: number     // Gesamtsumme aus Verkäufen
  realizedGain: number      // Realisierter Gewinn/Verlust
  realizedGainPercent: number
  dividends: number         // Erhaltene Dividenden
  firstBuyDate: string      // Erster Kauf
  lastSellDate: string      // Letzter Verkauf
  totalReturn: number       // G/V + Dividenden
}

interface SoldPositionsProps {
  transactions: Transaction[]
  formatCurrency: (amount: number) => string
  portfolioId?: string
  totalValue?: number
}

export default function SoldPositions({ transactions, formatCurrency, portfolioId, totalValue }: SoldPositionsProps) {
  const [expanded, setExpanded] = useState(false)

  const closedPositions = useMemo(() => {
    if (!transactions || transactions.length === 0) return []

    // Gruppiere nach Symbol
    const bySymbol = new Map<string, Transaction[]>()
    transactions.forEach(tx => {
      if (!tx.symbol || tx.symbol === '') return
      if (!bySymbol.has(tx.symbol)) {
        bySymbol.set(tx.symbol, [])
      }
      bySymbol.get(tx.symbol)!.push(tx)
    })

    const closed: ClosedPosition[] = []

    bySymbol.forEach((txs, symbol) => {
      // Chronologisch sortieren
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

          // Floating-point guard
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

      // Nur geschlossene Positionen (vollständig verkauft)
      if (totalShares <= 0.0001 && totalSharesSold > 0) {
        const totalInvested = totalSharesBought > 0
          ? (sorted.filter(t => t.type === 'buy' || t.type === 'transfer_in')
              .reduce((sum, t) => sum + t.quantity * t.price, 0))
          : 0

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

    // Sortieren: Letzte Verkäufe zuerst
    return closed.sort((a, b) => new Date(b.lastSellDate).getTime() - new Date(a.lastSellDate).getTime())
  }, [transactions])

  if (closedPositions.length === 0) return null

  const totalRealizedGain = closedPositions.reduce((sum, p) => sum + p.realizedGain, 0)
  const totalDividends = closedPositions.reduce((sum, p) => sum + p.dividends, 0)

  // Gewinner vs. Verlierer zählen
  const winners = closedPositions.filter(p => p.realizedGain > 0).length
  const losers = closedPositions.filter(p => p.realizedGain < 0).length

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-neutral-400 group-hover:text-neutral-300 transition-colors">
            Verkaufte Wertpapiere
          </h3>
          <span className="text-xs text-neutral-600">
            · ↑ {winners} ↓ {losers}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${perfColor(totalRealizedGain)}`}>
            {totalRealizedGain >= 0 ? '+' : ''}{formatCurrency(totalRealizedGain)}
          </span>
          {expanded ? (
            <ChevronUpIcon className="w-4 h-4 text-neutral-500" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-neutral-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="space-y-0">
          {/* Mini Icon Bar (collapsed preview) */}
          {closedPositions.length > 5 && !expanded && (
            <div className="flex flex-wrap gap-1 mb-2">
              {closedPositions.map(pos => (
                <Logo key={pos.symbol} ticker={pos.symbol} alt={pos.symbol} className="w-6 h-6" padding="none" />
              ))}
            </div>
          )}

          {closedPositions.map((pos) => (
            <div
              key={pos.symbol}
              className="flex items-center justify-between py-2.5 border-b border-neutral-800/30 cursor-pointer hover:bg-neutral-900/50 -mx-2 px-2 rounded transition-colors"
              onClick={() => {
                if (portfolioId) {
                  window.location.href = `/analyse/portfolio/stocks/${pos.symbol.toLowerCase()}?portfolioId=${portfolioId}&totalValue=${totalValue || 0}`
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Logo ticker={pos.symbol} alt={pos.symbol} className="w-7 h-7 opacity-60" padding="none" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-neutral-400 text-sm">{pos.symbol}</span>
                    <span className="text-[10px] text-neutral-600">
                      {pos.totalBought.toLocaleString('de-DE', { maximumFractionDigits: 2 })} St.
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600">
                    {new Date(pos.firstBuyDate).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}
                    {' → '}
                    {new Date(pos.lastSellDate).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${perfColor(pos.realizedGain)}`}>
                  {pos.realizedGain >= 0 ? '+' : ''}{formatCurrency(pos.realizedGain)}
                </p>
                <span className={`text-xs ${perfColor(pos.realizedGainPercent)}`}>
                  {pos.realizedGainPercent >= 0 ? '+' : ''}{pos.realizedGainPercent.toFixed(1)}%
                  {pos.dividends > 0 && (
                    <span className="text-neutral-600 ml-1">+ {formatCurrency(pos.dividends)} Div.</span>
                  )}
                </span>
              </div>
            </div>
          ))}

          {/* Summary */}
          <div className="flex items-center justify-between pt-3 mt-1">
            <span className="text-xs text-neutral-500">
              {closedPositions.length} geschlossene Position{closedPositions.length !== 1 ? 'en' : ''}
            </span>
            <div className="text-right">
              <span className={`text-xs font-medium ${perfColor(totalRealizedGain)}`}>
                Σ {totalRealizedGain >= 0 ? '+' : ''}{formatCurrency(totalRealizedGain)}
              </span>
              {totalDividends > 0 && (
                <span className="text-xs text-neutral-600 ml-2">
                  + {formatCurrency(totalDividends)} Div.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collapsed: Icon bar */}
      {!expanded && closedPositions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {closedPositions.map(pos => (
            <Logo key={pos.symbol} ticker={pos.symbol} alt={pos.symbol} className="w-6 h-6 opacity-50" padding="none" />
          ))}
        </div>
      )}
    </div>
  )
}
