// src/app/(terminal)/analyse/portfolio/verwaltung/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { checkUserPremiumStatus } from '@/lib/premiumCheck'
import { 
  BriefcaseIcon, 
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  Cog6ToothIcon,
  CheckIcon,
  StarIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'

interface Portfolio {
  id: string
  name: string
  currency: string
  cash_position: number
  is_default: boolean
  created_at: string
  updated_at: string
}

export default function PortfolioManagementPage() {
  const router = useRouter()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCurrency, setEditCurrency] = useState('')
  const [editCashPosition, setEditCashPosition] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    loadPortfolios()
  }, [])

  const loadPortfolios = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
        return
      }

      // Check premium status
      const premiumStatus = await checkUserPremiumStatus()
      setIsPremium(premiumStatus?.isPremium || false)

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error
      setPortfolios(data || [])
    } catch (error) {
      console.error('Error loading portfolios:', error)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (portfolio: Portfolio) => {
    setEditingId(portfolio.id)
    setEditName(portfolio.name)
    setEditCurrency(portfolio.currency)
    setEditCashPosition(portfolio.cash_position.toString())
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName('')
    setEditCurrency('')
    setEditCashPosition('')
  }

  const savePortfolio = async (portfolioId: string) => {
    if (!editName.trim()) {
      alert('Portfolio-Name ist erforderlich')
      return
    }

    try {
      const { error } = await supabase
        .from('portfolios')
        .update({
          name: editName,
          currency: editCurrency,
          cash_position: parseFloat(editCashPosition) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', portfolioId)

      if (error) throw error

      await loadPortfolios()
      cancelEditing()
    } catch (error) {
      console.error('Error updating portfolio:', error)
      alert('Fehler beim Speichern des Portfolios')
    }
  }

  const setDefaultPortfolio = async (portfolioId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Alle Portfolios auf false setzen
      await supabase
        .from('portfolios')
        .update({ is_default: false })
        .eq('user_id', user.id)

      // Ausgewähltes Portfolio auf true setzen
      const { error } = await supabase
        .from('portfolios')
        .update({ is_default: true })
        .eq('id', portfolioId)

      if (error) throw error

      await loadPortfolios()
    } catch (error) {
      console.error('Error setting default portfolio:', error)
      alert('Fehler beim Setzen des Standard-Portfolios')
    }
  }

  const deletePortfolio = async (portfolioId: string) => {
    // Prüfen ob es das einzige Portfolio ist
    if (portfolios.length === 1) {
      alert('Sie können nicht Ihr letztes Portfolio löschen')
      return
    }

    // Bestätigung
    if (!confirm('Sind Sie sicher, dass Sie dieses Portfolio löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return
    }

    setDeleting(portfolioId)
    try {
      // Erst Holdings löschen
      await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('portfolio_id', portfolioId)

      // Dann Portfolio löschen
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', portfolioId)

      if (error) throw error

      await loadPortfolios()
    } catch (error) {
      console.error('Error deleting portfolio:', error)
      alert('Fehler beim Löschen des Portfolios')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="flex items-center gap-3">
          <ArrowPathIcon className="w-5 h-5 text-green-400 animate-spin" />
          <span className="text-theme-secondary">Lade Portfolios...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* Header */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          <Link
            href="/analyse/portfolio/dashboard"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zum Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
                <Cog6ToothIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">
                  Portfolio Verwaltung
                </h1>
                <p className="text-sm text-theme-muted mt-1">
                  Verwalten Sie Ihre Portfolios
                </p>
              </div>
            </div>

            {isPremium || portfolios.length === 0 ? (
              <Link
                href="/analyse/portfolio"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Neues Portfolio
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-white rounded-lg transition-colors"
              >
                <StarSolidIcon className="w-4 h-4" />
                Premium für Multi-Portfolio
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {portfolios.length === 0 ? (
            <div className="text-center py-12">
              <BriefcaseIcon className="w-16 h-16 text-theme-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-theme-primary mb-2">
                Keine Portfolios vorhanden
              </h3>
              <p className="text-theme-secondary mb-6">
                Erstellen Sie Ihr erstes Portfolio, um loszulegen
              </p>
              <Link
                href="/analyse/portfolio"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Portfolio erstellen
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {portfolios.map((portfolio) => (
                <div 
                  key={portfolio.id}
                  className="bg-theme-card rounded-xl p-6 border border-theme/10"
                >
                  {editingId === portfolio.id ? (
                    /* Edit Mode */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-theme-secondary mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:outline-none focus:border-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-theme-secondary mb-2">
                            Währung
                          </label>
                          <select
                            value={editCurrency}
                            onChange={(e) => setEditCurrency(e.target.value)}
                            className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:outline-none focus:border-green-400"
                          >
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                            <option value="CHF">CHF</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-theme-secondary mb-2">
                            Cash Position
                          </label>
                          <input
                            type="number"
                            value={editCashPosition}
                            onChange={(e) => setEditCashPosition(e.target.value)}
                            className="w-full px-3 py-2 bg-theme-secondary border border-theme/20 rounded-lg text-theme-primary focus:outline-none focus:border-green-400"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 bg-theme-secondary hover:bg-theme-secondary/70 text-theme-primary rounded-lg transition-colors"
                        >
                          Abbrechen
                        </button>
                        <button
                          onClick={() => savePortfolio(portfolio.id)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <CheckIcon className="w-4 h-4" />
                          Speichern
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setDefaultPortfolio(portfolio.id)}
                          className="flex-shrink-0"
                        >
                          {portfolio.is_default ? (
                            <StarSolidIcon className="w-6 h-6 text-yellow-400" />
                          ) : (
                            <StarIcon className="w-6 h-6 text-theme-muted hover:text-yellow-400 transition-colors" />
                          )}
                        </button>
                        
                        <div>
                          <h3 className="text-lg font-semibold text-theme-primary">
                            {portfolio.name}
                            {portfolio.is_default && (
                              <span className="ml-2 text-xs bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded">
                                Standard
                              </span>
                            )}
                          </h3>
                          <div className="text-sm text-theme-secondary mt-1">
                            <span>{portfolio.currency}</span>
                            <span className="mx-2">•</span>
                            <span>Cash: {portfolio.cash_position.toLocaleString('de-DE')} {portfolio.currency}</span>
                            <span className="mx-2">•</span>
                            <span>Erstellt: {new Date(portfolio.created_at).toLocaleDateString('de-DE')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href="/analyse/portfolio/dashboard"
                          className="p-2 bg-theme-secondary hover:bg-theme-secondary/70 border border-theme/20 rounded-lg transition-colors"
                          title="Portfolio öffnen"
                        >
                          <BriefcaseIcon className="w-4 h-4 text-theme-secondary" />
                        </Link>
                        
                        <button
                          onClick={() => startEditing(portfolio)}
                          className="p-2 bg-theme-secondary hover:bg-theme-secondary/70 border border-theme/20 rounded-lg transition-colors"
                          title="Portfolio bearbeiten"
                        >
                          <PencilIcon className="w-4 h-4 text-theme-secondary" />
                        </button>
                        
                        {portfolios.length > 1 && (
                          <button
                            onClick={() => deletePortfolio(portfolio.id)}
                            disabled={deleting === portfolio.id}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Portfolio löschen"
                          >
                            {deleting === portfolio.id ? (
                              <ArrowPathIcon className="w-4 h-4 text-red-400 animate-spin" />
                            ) : (
                              <TrashIcon className="w-4 h-4 text-red-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}