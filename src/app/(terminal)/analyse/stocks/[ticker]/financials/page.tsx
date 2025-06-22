'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import FinancialsPage from '@/components/FinancialsPage'
import LoadingSpinner from '@/components/LoadingSpinner'

interface User {
  id: string
  email: string
  isPremium: boolean
}

export default function FinancialsPageWrapper({ 
  params 
}: { 
  params: { ticker: string } 
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <FinancialsPage 
      ticker={params.ticker} 
      isPremium={user?.isPremium || false}
    />
  )
}
