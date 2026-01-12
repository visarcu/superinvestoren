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
            className="py-4 border-b border-neutral-800 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-neutral-800 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-neutral-800 rounded mb-2" />
                <div className="h-3 w-24 bg-neutral-800/50 rounded" />
              </div>
              <div className="h-6 w-24 bg-neutral-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (portfolios.length === 0) {
    return (
      <div className="py-12 text-center">
        <BriefcaseIcon className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
        <h3 className="text-base font-medium text-white mb-2">
          Noch keine Depots vorhanden
        </h3>
        <p className="text-neutral-500 text-sm mb-6 max-w-sm mx-auto">
          Erstelle dein erstes Depot, um deine Investments zu tracken.
        </p>
        <Link
          href="/analyse/portfolio/depots/neu"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg transition-colors text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Erstes Depot erstellen
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Aggregated Overview */}
      {portfolios.length > 1 && (
        <Link
          href="/analyse/portfolio/dashboard?depot=all"
          className="block py-4 border-b border-neutral-800 hover:bg-neutral-900/30 transition-colors -mx-2 px-2 rounded-lg group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <ChartBarSquareIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-medium text-white flex items-center gap-2">
                  Alle Depots
                  <span className="text-xs font-normal text-neutral-500">
                    ({portfolios.length})
                  </span>
                </h3>
                <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                  <span>{aggregated.holdings_count} Positionen</span>
                  <span>·</span>
                  <span>{formatCurrency(aggregated.cash_position)} Cash</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(aggregated.total_value + aggregated.cash_position)}
                </p>
                <p className={`text-xs ${aggregatedGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {aggregatedGainLoss >= 0 ? '+' : ''}{formatCurrency(aggregatedGainLoss)}{' '}
                  ({aggregatedGainLossPercent >= 0 ? '+' : ''}{aggregatedGainLossPercent.toFixed(2)}%)
                </p>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-neutral-600 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>
        </Link>
      )}

      {/* Portfolio List */}
      <div className="space-y-0">
        {portfolios.map((portfolio) => {
          const brokerColor = getBrokerColor(portfolio.broker_type, portfolio.broker_color)
          const isMenuOpen = openMenuId === portfolio.id

          return (
            <div
              key={portfolio.id}
              className="py-4 border-b border-neutral-800 last:border-0"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {/* Broker Color Indicator */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${brokerColor}20` }}
                  >
                    <BriefcaseIcon className="w-5 h-5" style={{ color: brokerColor }} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-white">
                        {portfolio.name}
                      </h3>
                      {portfolio.is_default && (
                        <StarIconSolid className="w-3.5 h-3.5 text-yellow-500" />
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
                    className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <EllipsisVerticalIcon className="w-4 h-4 text-neutral-500" />
                  </button>

                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-44 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-20 py-1">
                        <Link
                          href={`/analyse/portfolio/dashboard?depot=${portfolio.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-neutral-800 transition-colors"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <ChartBarSquareIcon className="w-4 h-4 text-neutral-400" />
                          Dashboard öffnen
                        </Link>
                        <button
                          onClick={() => {
                            onEdit(portfolio.id)
                            setOpenMenuId(null)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-neutral-800 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4 text-neutral-400" />
                          Bearbeiten
                        </button>
                        {!portfolio.is_default && (
                          <button
                            onClick={() => {
                              onSetDefault(portfolio.id)
                              setOpenMenuId(null)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-neutral-800 transition-colors"
                          >
                            <StarIcon className="w-4 h-4 text-neutral-400" />
                            Als Hauptdepot
                          </button>
                        )}
                        <hr className="my-1 border-neutral-700" />
                        <button
                          onClick={() => {
                            if (confirm(`Depot "${portfolio.name}" wirklich löschen? Alle Positionen und Transaktionen werden gelöscht.`)) {
                              onDelete(portfolio.id)
                            }
                            setOpenMenuId(null)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Löschen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mt-4 pl-14">
                <div>
                  <span className="text-xs text-neutral-500 mr-2">Wert</span>
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(portfolio.total_value)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 mr-2">Cash</span>
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(portfolio.cash_position)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 mr-2">Positionen</span>
                  <span className="text-sm font-medium text-white">
                    {portfolio.holdings_count}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 mr-2">G/V</span>
                  <span className={`text-sm font-medium ${portfolio.gain_loss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {portfolio.gain_loss >= 0 ? '+' : ''}{formatCurrency(portfolio.gain_loss)}
                    <span className="ml-1 text-xs">
                      ({portfolio.gain_loss_percent >= 0 ? '+' : ''}{portfolio.gain_loss_percent.toFixed(2)}%)
                    </span>
                  </span>
                </div>
              </div>

              {/* Quick Action */}
              <div className="mt-3 pl-14">
                <Link
                  href={`/analyse/portfolio/dashboard?depot=${portfolio.id}`}
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Dashboard öffnen
                  <ArrowRightIcon className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add New Depot */}
      <Link
        href="/analyse/portfolio/depots/neu"
        className="flex items-center gap-3 py-4 text-neutral-400 hover:text-white transition-colors"
      >
        <div className="w-10 h-10 border border-dashed border-neutral-700 rounded-lg flex items-center justify-center hover:border-emerald-500/50 transition-colors">
          <PlusIcon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium">Neues Depot erstellen</span>
      </Link>
    </div>
  )
}
