// src/app/analyse/stocks/[ticker]/dividends/page.tsx - FEY/QUARTR CLEAN STYLE
'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import {
  BanknotesIcon,
  ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline'
import EnhancedDividendSection from '@/components/EnhancedDividendSection'
import StockSplitsSection from '@/components/StockSplitsSection'

interface User {
  id: string
  email: string
  isPremium: boolean
}

export default function DividendsPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [activeTab, setActiveTab] = useState<'dividends' | 'splits'>('dividends')

  const stock = stocks.find(s => s.ticker === ticker)

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }
    loadUser()
  }, [])

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-theme-muted text-sm">Lade Daten...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="w-full px-6 lg:px-8 py-8 space-y-6">

        {/* Tab Navigation - Clean Fey Style */}
        <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg w-fit">
          {[
            { id: 'dividends', label: 'Dividenden', icon: BanknotesIcon },
            { id: 'splits', label: 'Splits', icon: ArrowPathRoundedSquareIcon }
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-theme-card text-theme-primary shadow-sm'
                    : 'text-theme-muted hover:text-theme-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'dividends' ? (
          <EnhancedDividendSection
            ticker={ticker}
            stockName={stock?.name}
            isPremium={user?.isPremium || false}
          />
        ) : (
          <StockSplitsSection
            ticker={ticker}
            isPremium={user?.isPremium || false}
          />
        )}
      </main>
    </div>
  )
}
