// src/app/analyse/[ticker]/valuation/page.tsx - MIT DEUTSCHER FORMATIERUNG
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import LearnSidebar, { LearnTooltipButton } from '@/components/LearnSidebar'
import { useLearnMode } from '@/lib/LearnModeContext'
import { useCurrency } from '@/lib/CurrencyContext' // ✅ CURRENCY CONTEXT HINZUGEFÜGT
import { 
  CalculatorIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  InformationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

import ProfessionalValuationTable from '@/components/ProfessionalValuationTable'

interface User {
  id: string
  email: string
  isPremium: boolean
}

export default function ValuationPage() {
  const params = useParams()
  const ticker = params.ticker as string
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // ✅ CURRENCY CONTEXT FÜR DEUTSCHE FORMATIERUNG
  const { formatPercentage } = useCurrency()

  // Get stock info for header
  const stock = stocks.find(s => s.ticker === ticker.toUpperCase())

  // User-Daten laden
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
        console.error('[ValuationPage] Error loading user:', error)
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
              <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-theme-muted">Lade Bewertungsdaten...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* ✅ EINHEITLICHER HEADER - wie andere Pages */}


      {/* ✅ MAIN CONTENT - konsistent mit anderen Pages */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">

        {/* Main Valuation Table */}
        <ProfessionalValuationTable 
          ticker={ticker.toUpperCase()} 
          companyName={stock ? stock.name : undefined}
          isPremium={user?.isPremium || false}
        />

        {/* ✅ Additional Sections MIT LEARN TOOLTIPS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
          
      
        </div>

        {/* ✅ CTA für Premium Users */}
        {user?.isPremium && (
          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary mb-1">
                  Vollständige {ticker.toUpperCase()} Analyse
                </h3>
                <p className="text-theme-muted text-sm">
                  Charts, Fundamentaldaten, Dividenden und technische Analyse
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href={`/analyse/stocks/${ticker.toLowerCase()}`}
                  className="px-4 py-2 bg-theme-primary hover:bg-theme-secondary text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Zur Analyse
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ✅ LEARN SIDEBAR hinzugefügt */}
      <LearnSidebar />
    </div>
  )
}