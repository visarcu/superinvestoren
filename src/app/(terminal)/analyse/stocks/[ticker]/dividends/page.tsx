// src/app/analyse/stocks/[ticker]/dividends/page.tsx - MIT EINHEITLICHEM HEADER
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import { 
  ArrowLeftIcon,
  BanknotesIcon 
} from '@heroicons/react/24/outline'
// ✅ NEUE: Enhanced Dividend Section (ersetzt den ganzen komplexen Code)
import EnhancedDividendSection from '@/components/EnhancedDividendSection'
import LoadingSpinner from '@/components/LoadingSpinner'

interface User {
  id: string
  email: string
  isPremium: boolean
}

export default function DividendsPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase()
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // Get stock info for header
  const stock = stocks.find(s => s.ticker === ticker)

  // ✅ NUR User laden - alle Dividendendaten macht jetzt EnhancedDividendSection
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
            <LoadingSpinner />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* ✅ EINHEITLICHER HEADER - wie andere Pages */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          
          {/* Zurück-Link */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Aktien-Auswahl
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
              <Logo
                ticker={ticker}
                alt={`${ticker} Logo`}
                className="w-8 h-8"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">
                {stock?.name || ticker}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg text-green-400 font-semibold">{ticker}</span>
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm text-theme-muted">
                  Dividenden-Analyse
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MAIN CONTENT - konsistent mit anderen Pages */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* Status Indicator */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-theme-secondary">
              Multi-Source Dividendendaten mit Qualitätsindikatoren
            </p>
            <div className="text-sm text-theme-muted mt-1">
              Täglich aktualisiert • FMP + Alpha Vantage
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live Multi-Source Data</span>
          </div>
        </div>

        {/* ✅ ENHANCED DIVIDEND SECTION - Ersetzt den ganzen komplexen Code! */}
        <EnhancedDividendSection 
          ticker={ticker} 
          isPremium={user?.isPremium || false}
        />

        {/* ✅ OPTIONAL: Premium Hinweis falls nicht Premium */}
        {!user?.isPremium && (
          <div className="bg-theme-card rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
              <BanknotesIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-3">
              Erweiterte Multi-Source Analyse
            </h3>
            <p className="text-theme-muted mb-6 max-w-xl mx-auto">
              Vergleiche {ticker} Dividenden aus mehreren Datenquellen, 
              erhalte Qualitätsindikatoren und erkenne Dateninkonsistenzen.
            </p>
            <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-400 hover:to-purple-400 transition-all">
              Premium freischalten
            </button>
          </div>
        )}
      </main>
    </div>
  )
}