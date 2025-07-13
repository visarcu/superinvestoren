// src/app/analyse/stocks/[ticker]/dividends/page.tsx - KONSISTENTE PREMIUM UI
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import { 
  ArrowLeftIcon,
  BanknotesIcon,
  LockClosedIcon
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

        {/* ✅ KONSISTENTE PREMIUM CTA - Goldenes Schloss + Amber */}
        {!user?.isPremium && (
          <div className="bg-theme-card rounded-xl border border-theme/10">
            <div className="px-6 py-4 border-b border-theme/10">
              <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5 text-green-500" />
                Erweiterte Dividenden-Analyse
              </h3>
            </div>
            
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-gradient-to-br border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <LockClosedIcon className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">Premium Dividenden-Tools</h3>
              <p className="text-theme-secondary mb-6 max-w-md mx-auto leading-relaxed">
                Erhalten Sie Zugang zu detaillierten Finanzgesundheits-Metriken, 
                quartalsweisen Dividendenhistorien und erweiterten Analysefunktionen.
              </p>
              
           
              
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black rounded-lg font-semibold transition-colors"
              >
                <LockClosedIcon className="w-5 h-5" />
                14 Tage kostenlos testen
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}