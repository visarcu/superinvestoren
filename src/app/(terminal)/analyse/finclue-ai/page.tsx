// src/app/analyse/finclue-ai/page.tsx - Global AI without Ticker Selection
'use client'

import React, { useState, useEffect } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
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
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Lade FinClue AI...</p>
        </div>
      </div>
    )
  }

  // Direct global AI - no ticker selection required
  return (
    <div className="h-full">
      <FinClueAI 
        ticker={null} 
        isPremium={user?.isPremium || false} 
      />
    </div>
  )
}