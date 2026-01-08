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
  LockClosedIcon,
  CalendarIcon,
  ArrowPathRoundedSquareIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline'
import EnhancedDividendSection from '@/components/EnhancedDividendSection'
import StockSplitsSection from '@/components/StockSplitsSection'
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
  const [activeTab, setActiveTab] = useState<'dividends' | 'splits'>('dividends')

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
      
      {/* ✅ MAIN CONTENT - Clean and professional */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* ✅ TAB NAVIGATION - Like Morningstar */}
        <div className="bg-theme-card rounded-lg">
          <div className="border-b border-theme/10">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'dividends', label: 'Dividenden', icon: BanknotesIcon },
                { id: 'splits', label: 'Splits', icon: ArrowPathRoundedSquareIcon }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-400 text-blue-400'
                        : 'border-transparent text-theme-secondary hover:text-theme-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* ✅ TAB CONTENT */}
          <div className="p-6">
            {activeTab === 'dividends' ? (
              <div>
                <div className="mb-6">
                  <p className="text-theme-secondary">
                    Professionelle Dividenden-Analyse mit historischen Daten
                  </p>
                  <div className="text-sm text-theme-muted mt-1">
                    20 Jahre Dividendenhistorie • Split-adjusted
                  </div>
                </div>
                <EnhancedDividendSection 
                  ticker={ticker} 
                  isPremium={user?.isPremium || false}
                />
              </div>
            ) : (
              <StockSplitsSection 
                ticker={ticker} 
                isPremium={user?.isPremium || false}
              />
            )}
          </div>
        </div>

        {/* ✅ KONSISTENTE PREMIUM CTA - Goldenes Schloss + Amber */}
        {!user?.isPremium && (
          <div className="bg-theme-card rounded-xl border border-theme/10">
            <div className="px-6 py-4 border-b border-theme/10">
              <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5 text-brand" />
                Erweiterte Dividenden-Analyse
              </h3>
            </div>
            
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 bg-gradient-to-br border-brand/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <LockClosedIcon className="w-8 h-8 text-brand" />
              </div>
              <h3 className="text-xl font-semibold text-theme-primary mb-3">Premium Dividenden-Tools</h3>
              <p className="text-theme-secondary mb-6 max-w-md mx-auto leading-relaxed">
                Erhalten Sie Zugang zu detaillierten Finanzgesundheits-Metriken, 
                quartalsweisen Dividendenhistorien und erweiterten Analysefunktionen.
              </p>
              
           
              
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand hover:bg-green-400 text-black rounded-lg font-semibold transition-colors"
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