// src/components/PortfolioDepotList.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  EllipsisVerticalIcon,
  BriefcaseIcon,
  ChartBarSquareIcon,
  BanknotesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { BrokerBadge } from './PortfolioBrokerSelector'
import { BrokerType, getBrokerColor } from '@/lib/brokerConfig'
import { useCurrency } from '@/lib/CurrencyContext'

export interface PortfolioSummary {
  id: string
  name: string
  broker_type: BrokerType | string | null
  broker_name: string | null
  broker_color: string | null
  cash_position: number
  is_default: boolean
  created_at: string
  // Berechnete Werte
  total_value: number
  total_cost: number
  holdings_count: number
  gain_loss: number
  gain_loss_percent: number
}

interface PortfolioDepotListProps {
  portfolios: PortfolioSummary[]
  onSetDefault: (portfolioId: string) => void
  onDelete: (portfolioId: string) => void
  onEdit: (portfolioId: string) => void
  loading?: boolean
}

export default function PortfolioDepotList({
  portfolios,
  onSetDefault,
  onDelete,
  onEdit,
  loading = false
}: PortfolioDepotListProps) {
  const { formatCurrency } = useCurrency()
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Aggregierte Werte berechnen
  const aggregated = portfolios.reduce(
    (acc, p) => ({
      total_value: acc.total_value + p.total_value,
      total_cost: acc.total_cost + p.total_cost,
      cash_position: acc.cash_position + p.cash_position,
      holdings_count: acc.holdings_count + p.holdings_count
    }),
    { total_value: 0, total_cost: 0, cash_position: 0, holdings_count: 0 }
  )
  const aggregatedGainLoss = aggregated.total_value - aggregated.total_cost
  const aggregatedGainLossPercent = aggregated.total_cost > 0
    ? (aggregatedGainLoss / aggregated.total_cost) * 100
    : 0

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-theme-card rounded-xl border border-theme/10 p-6 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-theme-secondary/30 rounded-xl" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-theme-secondary/30 rounded mb-2" />
                <div className="h-4 w-24 bg-theme-secondary/20 rounded" />
              </div>
              <div className="h-8 w-24 bg-theme-secondary/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (portfolios.length === 0) {
    return (
      <div className="bg-theme-card rounded-xl border border-theme/10 p-12 text-center">
        <BriefcaseIcon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-theme-primary mb-2">
          Noch keine Depots vorhanden
        </h3>
        <p className="text-theme-secondary mb-6 max-w-sm mx-auto">
          Erstelle dein erstes Depot, um deine Investments zu tracken.
        </p>
        <Link
          href="/analyse/portfolio/depots/neu"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand/90 text-white font-semibold rounded-xl transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Erstes Depot erstellen
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Aggregierte Übersicht (nur wenn > 1 Portfolio) */}
      {portfolios.length > 1 && (
        <Link
          href="/analyse/portfolio/dashboard?depot=all"
          className="block bg-gradient-to-r from-brand/10 to-blue-500/10 rounded-xl border border-brand/20 p-6 hover:border-brand/40 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-brand/20 rounded-xl flex items-center justify-center">
                <ChartBarSquareIcon className="w-7 h-7 text-brand" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                  Alle Depots
                  <span className="text-sm font-normal text-theme-secondary">
                    ({portfolios.length} Depots)
                  </span>
                </h3>
                <div className="flex items-center gap-4 text-sm text-theme-secondary mt-1">
                  <span>{aggregated.holdings_count} Positionen</span>
                  <span>•</span>
                  <span>{formatCurrency(aggregated.cash_position)} Cash</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-2xl font-bold text-theme-primary">
                  {formatCurrency(aggregated.total_value + aggregated.cash_position)}
                </p>
                <p className={`text-sm font-medium ${aggregatedGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {aggregatedGainLoss >= 0 ? '+' : ''}{formatCurrency(aggregatedGainLoss)}{' '}
                  ({aggregatedGainLossPercent >= 0 ? '+' : ''}{aggregatedGainLossPercent.toFixed(2)}%)
                </p>
              </div>
              <ArrowRightIcon className="w-5 h-5 text-theme-muted group-hover:text-brand transition-colors" />
            </div>
          </div>
        </Link>
      )}

      {/* Einzelne Depots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {portfolios.map((portfolio) => {
          const brokerColor = getBrokerColor(portfolio.broker_type, portfolio.broker_color)
          const isMenuOpen = openMenuId === portfolio.id

          return (
            <div
              key={portfolio.id}
              className="bg-theme-card rounded-xl border border-theme/10 overflow-hidden hover:border-theme/20 transition-colors"
            >
              {/* Color Bar */}
              <div className="h-1" style={{ backgroundColor: brokerColor }} />

              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Broker Color Indicator */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${brokerColor}20` }}
                    >
                      <BriefcaseIcon className="w-5 h-5" style={{ color: brokerColor }} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-theme-primary">
                          {portfolio.name}
                        </h3>
                        {portfolio.is_default && (
                          <StarIconSolid className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <BrokerBadge
                        brokerId={portfolio.broker_type}
                        customName={portfolio.broker_name}
                        customColor={portfolio.broker_color}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(isMenuOpen ? null : portfolio.id)}
                      className="p-2 hover:bg-theme-secondary/30 rounded-lg transition-colors"
                    >
                      <EllipsisVerticalIcon className="w-5 h-5 text-theme-secondary" />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-theme-card border border-theme/20 rounded-lg shadow-xl z-20 py-1">
                          <Link
                            href={`/analyse/portfolio/dashboard?depot=${portfolio.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-theme-primary hover:bg-theme-secondary/30 transition-colors"
                            onClick={() => setOpenMenuId(null)}
                          >
                            <ChartBarSquareIcon className="w-4 h-4" />
                            Dashboard öffnen
                          </Link>
                          <button
                            onClick={() => {
                              onEdit(portfolio.id)
                              setOpenMenuId(null)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-theme-primary hover:bg-theme-secondary/30 transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Bearbeiten
                          </button>
                          {!portfolio.is_default && (
                            <button
                              onClick={() => {
                                onSetDefault(portfolio.id)
                                setOpenMenuId(null)
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-theme-primary hover:bg-theme-secondary/30 transition-colors"
                            >
                              <StarIcon className="w-4 h-4" />
                              Als Hauptdepot
                            </button>
                          )}
                          <hr className="my-1 border-theme/10" />
                          <button
                            onClick={() => {
                              if (confirm(`Depot "${portfolio.name}" wirklich löschen? Alle Positionen und Transaktionen werden gelöscht.`)) {
                                onDelete(portfolio.id)
                              }
                              setOpenMenuId(null)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Löschen
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-theme-muted mb-1">Wert</p>
                    <p className="font-semibold text-theme-primary">
                      {formatCurrency(portfolio.total_value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-theme-muted mb-1">Cash</p>
                    <p className="font-semibold text-theme-primary">
                      {formatCurrency(portfolio.cash_position)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-theme-muted mb-1">Positionen</p>
                    <p className="font-semibold text-theme-primary">
                      {portfolio.holdings_count}
                    </p>
                  </div>
                </div>

                {/* Performance */}
                <div className="flex items-center justify-between pt-4 border-t border-theme/10">
                  <span className="text-sm text-theme-secondary">Gesamt G/V</span>
                  <div className="text-right">
                    <span className={`font-semibold ${portfolio.gain_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {portfolio.gain_loss >= 0 ? '+' : ''}{formatCurrency(portfolio.gain_loss)}
                    </span>
                    <span className={`text-sm ml-2 ${portfolio.gain_loss_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ({portfolio.gain_loss_percent >= 0 ? '+' : ''}{portfolio.gain_loss_percent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Action */}
              <Link
                href={`/analyse/portfolio/dashboard?depot=${portfolio.id}`}
                className="block px-5 py-3 bg-theme-secondary/20 text-center text-sm font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/30 transition-colors"
              >
                Dashboard öffnen
              </Link>
            </div>
          )
        })}

        {/* Add New Depot Card */}
        <Link
          href="/analyse/portfolio/depots/neu"
          className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-theme/20 hover:border-brand/50 hover:bg-brand/5 transition-colors min-h-[200px]"
        >
          <div className="w-14 h-14 bg-theme-secondary/20 rounded-xl flex items-center justify-center mb-4">
            <PlusIcon className="w-7 h-7 text-theme-muted" />
          </div>
          <span className="font-medium text-theme-secondary">Neues Depot</span>
        </Link>
      </div>
    </div>
  )
}
