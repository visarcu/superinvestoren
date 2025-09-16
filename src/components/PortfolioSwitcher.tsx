// src/components/PortfolioSwitcher.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDownIcon, PlusIcon, BriefcaseIcon, StarIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { checkUserPremiumStatus, getPortfolioLimits } from '@/lib/premiumCheck'

interface Portfolio {
  id: string
  name: string
  is_default: boolean
  currency: string
  created_at: string
}

interface PortfolioSwitcherProps {
  activePortfolioId?: string
  onPortfolioChange?: (portfolioId: string) => void
  className?: string
}

const PortfolioSwitcher: React.FC<PortfolioSwitcherProps> = ({
  activePortfolioId,
  onPortfolioChange,
  className = ""
}) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [activePortfolio, setActivePortfolio] = useState<Portfolio | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    loadPortfolios()
  }, [])

  useEffect(() => {
    if (portfolios.length > 0 && activePortfolioId) {
      const portfolio = portfolios.find(p => p.id === activePortfolioId)
      if (portfolio) {
        setActivePortfolio(portfolio)
      }
    } else if (portfolios.length > 0 && !activePortfolioId) {
      // Default zu dem Portfolio mit is_default = true oder dem ersten
      const defaultPortfolio = portfolios.find(p => p.is_default) || portfolios[0]
      setActivePortfolio(defaultPortfolio)
      onPortfolioChange?.(defaultPortfolio.id)
    }
  }, [portfolios, activePortfolioId])

  const loadPortfolios = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check premium status
      const premiumStatus = await checkUserPremiumStatus()
      setIsPremium(premiumStatus?.isPremium || false)

      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name, is_default, currency, created_at')
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

  const handlePortfolioSelect = async (portfolio: Portfolio) => {
    setActivePortfolio(portfolio)
    setIsOpen(false)
    onPortfolioChange?.(portfolio.id)
    
    // Optional: Setze als Standard-Portfolio
    if (!portfolio.is_default) {
      try {
        // Erst alle auf false setzen
        await supabase
          .from('portfolios')
          .update({ is_default: false })
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)

        // Dann das ausgewählte auf true setzen
        await supabase
          .from('portfolios')
          .update({ is_default: true })
          .eq('id', portfolio.id)

        // Portfolios neu laden
        loadPortfolios()
      } catch (error) {
        console.error('Error setting default portfolio:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-4 h-4 bg-theme-secondary/50 rounded animate-pulse"></div>
        <div className="w-24 h-4 bg-theme-secondary/50 rounded animate-pulse"></div>
      </div>
    )
  }

  if (portfolios.length === 0) {
    return (
      <Link
        href="/analyse/portfolio"
        className={`flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors ${className}`}
      >
        <PlusIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Portfolio erstellen</span>
      </Link>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-theme-card border border-theme/20 hover:border-theme/40 rounded-lg transition-colors min-w-[200px]"
      >
        <BriefcaseIcon className="w-4 h-4 text-theme-secondary" />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-theme-primary truncate">
            {activePortfolio?.name || 'Portfolio auswählen'}
          </div>
          <div className="text-xs text-theme-muted">
            {activePortfolio?.currency}
          </div>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 text-theme-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-theme-card border border-theme/20 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
            {portfolios.map((portfolio) => (
              <button
                key={portfolio.id}
                onClick={() => handlePortfolioSelect(portfolio)}
                className={`w-full text-left px-4 py-3 hover:bg-theme-secondary/20 transition-colors border-b border-theme/10 last:border-b-0 ${
                  activePortfolio?.id === portfolio.id ? 'bg-green-400/10' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-theme-primary">
                      {portfolio.name}
                    </div>
                    <div className="text-xs text-theme-muted">
                      {portfolio.currency} • {portfolio.is_default ? 'Standard' : 'Portfolio'}
                    </div>
                  </div>
                  {activePortfolio?.id === portfolio.id && (
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  )}
                </div>
              </button>
            ))}
            
            {/* Neues Portfolio erstellen */}
            {isPremium || portfolios.length === 0 ? (
              <Link
                href="/analyse/portfolio"
                className="w-full text-left px-4 py-3 hover:bg-theme-secondary/20 transition-colors border-t border-theme/10 flex items-center gap-2 text-green-400"
                onClick={() => setIsOpen(false)}
              >
                <PlusIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Neues Portfolio erstellen</span>
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="w-full text-left px-4 py-3 hover:bg-theme-secondary/20 transition-colors border-t border-theme/10 flex items-center gap-2"
                onClick={() => setIsOpen(false)}
              >
                <StarIcon className="w-4 h-4 text-yellow-400" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-theme-primary">Weitere Portfolios</span>
                  <p className="text-xs text-theme-muted">Premium für Multi-Portfolio</p>
                </div>
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default PortfolioSwitcher