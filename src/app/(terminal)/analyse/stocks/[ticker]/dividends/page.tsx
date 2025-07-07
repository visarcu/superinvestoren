// src/app/analyse/stocks/[ticker]/dividends/page.tsx - CLEAN PROFESSIONAL VERSION
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

  // ✅ Load user data only
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
      {/* ✅ PROFESSIONAL HEADER - Clean, no API details */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          
          {/* Back Navigation */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Aktien-Auswahl
          </Link>

          {/* Stock Header */}
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

      {/* ✅ MAIN CONTENT - Clean and professional */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* ✅ CLEAN Status Indicator - No API details */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-theme-secondary">
              Professionelle Dividenden-Analyse mit historischen Daten
            </p>
            <div className="text-sm text-theme-muted mt-1">
              20 Jahre Dividendenhistorie • Split-adjusted
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Aktuelle Daten</span>
          </div>
        </div>

        {/* ✅ ENHANCED DIVIDEND SECTION */}
        <EnhancedDividendSection 
          ticker={ticker} 
          isPremium={user?.isPremium || false}
        />

        {/* ✅ PREMIUM Upgrade Card - Only if not premium */}
        {!user?.isPremium && (
          <div className="bg-theme-card rounded-xl p-6 text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
              <BanknotesIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-theme-primary mb-3">
              Erweiterte Dividenden-Analyse
            </h3>
            <p className="text-theme-muted mb-6 max-w-xl mx-auto">
              Erhalten Sie Zugang zu detaillierten Finanzgesundheits-Metriken, 
              quartalsweisen Dividendenhistorien und erweiterten Analysefunktionen.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
              <div className="text-center">
                <div className="text-sm font-semibold text-blue-400">FCF Coverage</div>
                <div className="text-xs text-theme-muted">Free Cash Flow Abdeckung</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-purple-400">Debt Metrics</div>
                <div className="text-xs text-theme-muted">Verschuldungsanalyse</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-green-400">Quarterly Data</div>
                <div className="text-xs text-theme-muted">Quartalsweise Historie</div>
              </div>
            </div>
            <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-400 hover:to-purple-400 transition-all">
              Premium freischalten
            </button>
          </div>
        )}
      </main>
    </div>
  )
}