// src/app/analyse/[ticker]/ai-chat/page.tsx - Ticker-spezifische AI Chat Seite mit Theme Support
'use client'

import React, { useState, useEffect } from 'react'
import FinClueAI from '@/components/FinclueAI'  // ✅ Korrigierter Import
import { supabase } from '@/lib/supabaseClient'

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface TickerAIChatPageProps {
  params: {
    ticker: string
  }
}

export default function TickerAIChatPage({ params }: TickerAIChatPageProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const ticker = params.ticker.toUpperCase()

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .single()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-theme-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-theme-secondary">Lade FinClue AI...</p>
        </div>
      </div>
    )
  }

  return (
    <FinClueAI  // ✅ Korrigierter Component Name
      ticker={ticker} 
      isPremium={user?.isPremium || false} 
    />
  )
}