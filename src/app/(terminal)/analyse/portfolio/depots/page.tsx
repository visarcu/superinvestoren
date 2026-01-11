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

      // Lade alle Portfolios des Users
      const { data: portfoliosData, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      if (portfoliosError) throw portfoliosError

      // Lade Holdings für jedes Portfolio
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

      // Erst alle auf nicht-default setzen
      await supabase
        .from('portfolios')
        .update({ is_default: false })
        .eq('user_id', session.user.id)

      // Dann das gewählte auf default setzen
      await supabase
        .from('portfolios')
        .update({ is_default: true })
        .eq('id', portfolioId)

      // Neu laden
      await loadPortfolios()
    } catch (err) {
      console.error('Error setting default portfolio:', err)
    }
  }

  const handleDelete = async (portfolioId: string) => {
    try {
      // Lösche zuerst alle Holdings
      await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('portfolio_id', portfolioId)

      // Lösche alle Transaktionen
      await supabase
        .from('portfolio_transactions')
        .delete()
        .eq('portfolio_id', portfolioId)

      // Dann das Portfolio selbst
      await supabase
        .from('portfolios')
        .delete()
        .eq('id', portfolioId)

      // Neu laden
      await loadPortfolios()
    } catch (err) {
      console.error('Error deleting portfolio:', err)
    }
  }

  const handleEdit = (portfolioId: string) => {
    // TODO: Modal oder separate Seite für Bearbeitung
    router.push(`/analyse/portfolio/depots/${portfolioId}/edit`)
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <div className="bg-theme-card border-b border-theme/10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/analyse/portfolio/dashboard"
                className="flex items-center gap-2 text-theme-secondary hover:text-theme-primary transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="text-sm">Dashboard</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadPortfolios}
                disabled={loading}
                className="p-2 hover:bg-theme-secondary/30 rounded-lg transition-colors"
                title="Aktualisieren"
              >
                <ArrowPathIcon className={`w-5 h-5 text-theme-secondary ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/analyse/portfolio/depots/neu"
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand/90 text-white font-semibold rounded-lg transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Neues Depot
              </Link>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-2xl font-bold text-theme-primary flex items-center gap-3">
              <BriefcaseIcon className="w-7 h-7" />
              Meine Depots
            </h1>
            <p className="text-theme-secondary mt-1">
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
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
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
