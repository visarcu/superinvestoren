// src/app/(terminal)/analyse/ai/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import FinClueAI from '@/components/FinclueAI'
import { supabase } from '@/lib/supabaseClient'

interface User {
  id: string
  email: string
  isPremium: boolean
}

export default function FinClueAIPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const ticker = searchParams?.get('ticker') || null

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          setUser(null)
          setLoading(false)
          return
        }

        // Get premium status
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
        setLoading(false)
      } catch (error) {
        console.error('Error loading user:', error)
        setUser(null)
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Lade FinClue AI...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center max-w-md mx-auto p-8">
          <h3 className="text-xl font-bold text-white mb-4">Anmeldung erforderlich</h3>
          <p className="text-gray-400 mb-6">
            Du musst angemeldet sein, um FinClue AI zu verwenden.
          </p>
          <button 
            onClick={() => window.location.href = '/auth/signin'}
            className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
          >
            Jetzt anmelden
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <FinClueAI 
        ticker={ticker} 
        isPremium={user.isPremium} 
      />
    </div>
  )
}