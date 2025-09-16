// src/lib/PortfolioContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Portfolio {
  id: string
  name: string
  is_default: boolean
  currency: string
  cash_position: number
  created_at: string
  updated_at: string
}

interface PortfolioContextType {
  activePortfolio: Portfolio | null
  portfolios: Portfolio[]
  setActivePortfolio: (portfolio: Portfolio) => void
  refreshPortfolios: () => Promise<void>
  loading: boolean
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined)

export const usePortfolio = () => {
  const context = useContext(PortfolioContext)
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider')
  }
  return context
}

interface PortfolioProviderProps {
  children: React.ReactNode
}

export const PortfolioProvider: React.FC<PortfolioProviderProps> = ({ children }) => {
  const [activePortfolio, setActivePortfolioState] = useState<Portfolio | null>(null)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPortfolios()
  }, [])

  const loadPortfolios = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error

      const portfolioData = data || []
      setPortfolios(portfolioData)

      // Setze aktives Portfolio (Standard oder erstes)
      if (portfolioData.length > 0 && !activePortfolio) {
        const defaultPortfolio = portfolioData.find(p => p.is_default) || portfolioData[0]
        setActivePortfolioState(defaultPortfolio)
      }
    } catch (error) {
      console.error('Error loading portfolios:', error)
    } finally {
      setLoading(false)
    }
  }

  const setActivePortfolio = async (portfolio: Portfolio) => {
    setActivePortfolioState(portfolio)
    
    // Optional: Portfolio als Standard setzen
    if (!portfolio.is_default) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Alle portfolios auf false setzen
        await supabase
          .from('portfolios')
          .update({ is_default: false })
          .eq('user_id', user.id)

        // Ausgewähltes Portfolio auf true setzen
        await supabase
          .from('portfolios')
          .update({ is_default: true })
          .eq('id', portfolio.id)

        // Portfolios refreshen
        await loadPortfolios()
      } catch (error) {
        console.error('Error setting default portfolio:', error)
      }
    }
  }

  const refreshPortfolios = async () => {
    await loadPortfolios()
  }

  const value: PortfolioContextType = {
    activePortfolio,
    portfolios,
    setActivePortfolio,
    refreshPortfolios,
    loading
  }

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}

export default PortfolioProvider