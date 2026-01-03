// Optimized Super-Investors page - NO 38MB holdings import
'use client'

import React, { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import SuperInvestorsClient from '@/components/SuperInvestorsClient'
import LoadingSpinner from '@/components/LoadingSpinner'
import { stocks } from '@/data/stocks'

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface PageProps {
  params: {
    ticker: string
  }
}

export default function SuperInvestorsPage({ params }: PageProps) {
  const ticker = params.ticker.toUpperCase()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Basic validation - detailed validation happens in the API route
  const stock = stocks.find(s => s.ticker.toLowerCase() === ticker.toLowerCase())

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

  if (!stock) {
    notFound()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // All heavy processing moved to API route and client component
  return (
    <SuperInvestorsClient
      ticker={ticker}
      initialStockName={stock.name}
      isPremium={user?.isPremium || false}
    />
  )
}
