// src/app/analyse/[ticker]/valuation/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import ProfessionalValuationTable from '@/components/ProfessionalValuationTable'
import { supabase } from '@/lib/supabaseClient'

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

  // ✅ User-Daten laden (wie in deinem AnalysisClient)
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Premium Status holen
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
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-400">Lade Bewertungsdaten...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {ticker.toUpperCase()} Bewertungsanalyse
        </h1>
        <p className="text-gray-400 text-lg">
          Professionelle Bewertungsmetriken und Ratio-Vergleiche
        </p>
      </div>

      {/* Main Content */}
      <ProfessionalValuationTable 
        ticker={ticker} 
        isPremium={user?.isPremium || false}
      />

      {/* Additional Sections können hier später ergänzt werden */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Peer Vergleich</h3>
          <p className="text-gray-400 text-sm">Coming soon - Vergleich mit Branchenkonkurrenten</p>
        </div>
        
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">DCF Modell</h3>
          <p className="text-gray-400 text-sm">Coming soon - Discounted Cash Flow Bewertung</p>
        </div>
      </div>
    </div>
  )
}