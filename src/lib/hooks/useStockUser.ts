'use client'

// Lädt aktuellen Supabase-User + Premium-Status.
// Wiederverwendbarer Hook für die Aktien-Seiten (Watchlist, Premium-Gating, Personalisierung).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export interface StockUser {
  id: string
  email: string
  isPremium: boolean
}

export function useStockUser() {
  const [user, setUser] = useState<StockUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          if (!cancelled) setUser(null)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (cancelled) return
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          isPremium: profile?.is_premium || false,
        })
      } catch (err) {
        console.error('[useStockUser] load error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { user, loading, isPremium: user?.isPremium ?? false }
}
