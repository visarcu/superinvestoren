// src/components/portfolio/PortfolioStockDetail.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getEURRate } from '@/lib/portfolioCurrency'
import { useCurrency } from '@/lib/CurrencyContext'
import WorkingStockChart from '@/components/WorkingStockChart'
import Logo from '@/components/Logo'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export interface PurchaseMarker {
  date: string      // YYYY-MM-DD
  priceEUR: number  // Kaufpreis in EUR
  quantity: number
  label: string     // "K1", "K2", ...
}

interface PortfolioStockDetailProps {
  ticker: string
}

export default function PortfolioStockDetail({ ticker }: PortfolioStockDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const portfolioId = searchParams.get('portfolioId')
  const { formatStockPrice, formatPercentage } = useCurrency()

  const [history, setHistory] = useState<{ date: string; close: number }[]>([])
  const [purchaseMarkers, setPurchaseMarkers] = useState<PurchaseMarker[]>([])
  const [eurRate, setEurRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Daten parallel laden
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      setLoading(true)

      try {
        // Parallel: Historische Kurse + Transaktionen + EUR-Rate
        const [histRes, eurRateResult] = await Promise.all([
          fetch(`/api/historical/${ticker}`),
          getEURRate().catch(() => null),
        ])

        if (cancelled) return

        // Historische Kurse verarbeiten
        if (histRes.ok) {
          const { historical = [] } = await histRes.json()
          const arr = (historical as any[])
            .slice()
            .reverse()
            .map((h: any) => ({ date: h.date, close: h.close }))
          setHistory(arr)
        }

        // EUR Rate setzen
        if (eurRateResult) {
          setEurRate(eurRateResult)
        }

        // Buy- und Transfer-In-Transaktionen laden (nur wenn portfolioId vorhanden)
        if (portfolioId) {
          const { data: transactions } = await supabase
            .from('portfolio_transactions')
            .select('date, quantity, price, type')
            .eq('portfolio_id', portfolioId)
            .eq('symbol', ticker)
            .in('type', ['buy', 'transfer_in'])
            .order('date', { ascending: true })

          if (!cancelled && transactions) {
            const markers: PurchaseMarker[] = transactions.map((tx, i) => ({
              date: tx.date,
              priceEUR: tx.price,
              quantity: tx.quantity,
              label: tx.type === 'transfer_in' ? `E${i + 1}` : `K${i + 1}`,
            }))
            setPurchaseMarkers(markers)
          }
        }
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [ticker, portfolioId])

  // Aktuellen EUR-Preis berechnen
  const currentPriceEUR = useMemo(() => {
    if (!history.length || !eurRate) return null
    const latestUSD = history[history.length - 1].close
    return latestUSD * eurRate
  }, [history, eurRate])

  // Gesamt-Investment berechnen
  const totalInvestment = useMemo(() => {
    if (!purchaseMarkers.length || currentPriceEUR === null) return null

    const totalQuantity = purchaseMarkers.reduce((sum, m) => sum + m.quantity, 0)
    const totalCost = purchaseMarkers.reduce((sum, m) => sum + m.quantity * m.priceEUR, 0)
    const totalValue = totalQuantity * currentPriceEUR
    const totalGainLoss = totalValue - totalCost
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

    return { totalQuantity, totalCost, totalValue, totalGainLoss, totalGainLossPercent }
  }, [purchaseMarkers, currentPriceEUR])

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
  }

  const handleBack = () => {
    if (portfolioId) {
      router.push(`/analyse/portfolio/dashboard?depot=${portfolioId}`)
    } else {
      router.back()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-neutral-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Zurück
        </button>
        <div className="flex items-center gap-3">
          <Logo ticker={ticker} alt={ticker} className="w-8 h-8" padding="none" />
          <h1 className="text-xl font-bold text-white">{ticker}</h1>
          {currentPriceEUR !== null && (
            <span className="text-neutral-400 text-sm">
              {formatCurrency(currentPriceEUR)}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      {history.length > 0 ? (
        <WorkingStockChart
          ticker={ticker}
          data={history}
          purchaseMarkers={purchaseMarkers.length > 0 ? purchaseMarkers : undefined}
        />
      ) : (
        <div className="bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-12 text-center">
          <p className="text-neutral-500">Keine Kursdaten verfügbar</p>
        </div>
      )}

      {/* Dein Investment Panel */}
      {purchaseMarkers.length > 0 && currentPriceEUR !== null && (
        <div className="mt-6 bg-neutral-900/50 rounded-xl border border-neutral-800/50 p-4">
          <h3 className="text-sm font-medium text-neutral-400 mb-3">Dein Investment</h3>

          <div className="space-y-0">
            {purchaseMarkers.map((marker) => {
              const cost = marker.quantity * marker.priceEUR
              const value = marker.quantity * currentPriceEUR
              const gainLoss = value - cost
              const gainLossPercent = cost > 0 ? (gainLoss / cost) * 100 : 0
              const isPositive = gainLoss >= 0

              return (
                <div
                  key={marker.label}
                  className="flex items-center justify-between py-2.5 border-b border-neutral-800/50 last:border-0"
                >
                  {/* Label + Datum */}
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 flex items-center justify-center bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">
                      {marker.label}
                    </span>
                    <span className="text-sm text-neutral-400">
                      {new Date(marker.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </span>
                  </div>

                  {/* Menge × Preis */}
                  <div className="text-sm text-neutral-300">
                    {marker.quantity.toLocaleString('de-DE')} Stk. × {formatCurrency(marker.priceEUR)}
                  </div>

                  {/* G/V */}
                  <div className="text-right">
                    <span className={`text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{formatCurrency(gainLoss)}
                    </span>
                    <span className={`text-xs ml-1.5 ${isPositive ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                      ({isPositive ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Gesamt-Zeile */}
            {totalInvestment && purchaseMarkers.length > 1 && (
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-neutral-700/50">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 flex items-center justify-center bg-neutral-700/50 text-neutral-300 text-xs font-bold rounded-full">
                    Σ
                  </span>
                  <span className="text-sm text-neutral-300 font-medium">
                    Gesamt
                  </span>
                </div>

                <div className="text-sm text-neutral-300">
                  {totalInvestment.totalQuantity.toLocaleString('de-DE')} Stk. — {formatCurrency(totalInvestment.totalCost)}
                </div>

                <div className="text-right">
                  <span className={`text-sm font-semibold ${totalInvestment.totalGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalInvestment.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalInvestment.totalGainLoss)}
                  </span>
                  <span className={`text-xs ml-1.5 ${totalInvestment.totalGainLossPercent >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                    ({totalInvestment.totalGainLossPercent >= 0 ? '+' : ''}{totalInvestment.totalGainLossPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
