'use client'

// Watchlist-Logik für ein einzelnes Ticker.
// Kapselt Supabase-Queries + Limit-Check für Free-User.
// Logisch identisch zu src/components/WatchlistButton.tsx (kann später dorthin migriert werden).
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export const FREE_WATCHLIST_LIMIT = 5

export function useWatchlist(ticker: string) {
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [count, setCount] = useState(0)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.user) {
          if (!cancelled) setInitialized(true)
          return
        }

        const [tickerRes, countRes, profileRes] = await Promise.all([
          supabase
            .from('watchlists')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('ticker', ticker.toUpperCase())
            .maybeSingle(),
          supabase
            .from('watchlists')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id),
          supabase.from('profiles').select('is_premium').eq('user_id', session.user.id).maybeSingle(),
        ])

        if (cancelled) return
        setUserId(session.user.id)
        setExists(!!tickerRes.data)
        setCount(countRes.count ?? 0)
        setIsPremium(profileRes.data?.is_premium ?? false)
      } catch (err) {
        console.error('[useWatchlist] init error:', err)
      } finally {
        if (!cancelled) setInitialized(true)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [ticker])

  const limitReached = !isPremium && !exists && count >= FREE_WATCHLIST_LIMIT

  const toggle = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      if (exists) {
        const { error } = await supabase
          .from('watchlists')
          .delete()
          .eq('user_id', userId)
          .eq('ticker', ticker.toUpperCase())
        if (!error) {
          setExists(false)
          setCount(c => Math.max(0, c - 1))
        }
      } else {
        if (limitReached) {
          router.push('/pricing')
          return
        }
        const { error } = await supabase.from('watchlists').insert({
          user_id: userId,
          ticker: ticker.toUpperCase(),
          created_at: new Date().toISOString(),
        })
        if (!error) {
          setExists(true)
          setCount(c => c + 1)
        }
      }
    } catch (err) {
      console.error('[useWatchlist] toggle error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, exists, limitReached, ticker, router])

  return {
    exists,
    loading,
    isPremium,
    count,
    limitReached,
    initialized,
    isAuthenticated: !!userId,
    toggle,
  }
}
