// src/app/(terminal)/analyse/portfolio/depots/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  PlusIcon,
  BriefcaseIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import PortfolioDepotList, { PortfolioSummary } from '@/components/PortfolioDepotList'
import { BrokerType } from '@/lib/brokerConfig'

export default function DepotsPage() {
  const router = useRouter()
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPortfolios()
  }, [])

  const loadPortfolios = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/auth/signin')
        return
      }

      const { data: portfoliosData, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      if (portfoliosError) throw portfoliosError

      const portfoliosWithStats: PortfolioSummary[] = await Promise.all(
        (portfoliosData || []).map(async (portfolio) => {
          const { data: holdings } = await supabase
            .from('portfolio_holdings')
            .select('symbol, name, quantity, purchase_price, current_price')
            .eq('portfolio_id', portfolio.id)

          const holdingsArray = holdings || []
          const totalValue = holdingsArray.reduce((sum, h) => sum + (h.quantity * (h.current_price || h.purchase_price)), 0)
          const totalCost = holdingsArray.reduce((sum, h) => sum + (h.quantity * h.purchase_price), 0)
          const gainLoss = totalValue - totalCost
          const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0

          return {
            id: portfolio.id,
            name: portfolio.name,
            broker_type: portfolio.broker_type as BrokerType || 'manual',
            broker_name: portfolio.broker_name,
            broker_color: portfolio.broker_color,
            cash_position: portfolio.cash_position || 0,
            is_default: portfolio.is_default || false,
            created_at: portfolio.created_at,
            total_value: totalValue,
            total_cost: totalCost,
            holdings_count: holdingsArray.length,
            gain_loss: gainLoss,
            gain_loss_percent: gainLossPercent
          }
        })
      )

      setPortfolios(portfoliosWithStats)
    } catch (err: any) {
      console.error('Error loading portfolios:', err)
      setError(err.message || 'Fehler beim Laden der Depots')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (portfolioId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      await supabase
        .from('portfolios')
        .update({ is_default: false })
        .eq('user_id', session.user.id)

      await supabase
        .from('portfolios')
        .update({ is_default: true })
        .eq('id', portfolioId)

      await loadPortfolios()
    } catch (err) {
      console.error('Error setting default portfolio:', err)
    }
  }

  const handleDelete = async (portfolioId: string) => {
    try {
      await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('portfolio_id', portfolioId)

      await supabase
        .from('portfolio_transactions')
        .delete()
        .eq('portfolio_id', portfolioId)

      await supabase
        .from('portfolios')
        .delete()
        .eq('id', portfolioId)

      await loadPortfolios()
    } catch (err) {
      console.error('Error deleting portfolio:', err)
    }
  }

  const handleEdit = (portfolioId: string) => {
    router.push(`/analyse/portfolio/depots/${portfolioId}/edit`)
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/analyse/portfolio/dashboard"
                className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadPortfolios}
                disabled={loading}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
                title="Aktualisieren"
              >
                <ArrowPathIcon className={`w-5 h-5 text-neutral-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/analyse/portfolio/depots/neu"
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg transition-colors text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                Neues Depot
              </Link>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-xl font-semibold text-white flex items-center gap-3">
              <BriefcaseIcon className="w-6 h-6" />
              Meine Depots
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Verwalte deine verschiedenen Broker-Depots an einem Ort
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={loadPortfolios}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <PortfolioDepotList
            portfolios={portfolios}
            onSetDefault={handleSetDefault}
            onDelete={handleDelete}
            onEdit={handleEdit}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}
