'use client'

// Watchlist-Logik für ein einzelnes Ticker.
// Kapselt Supabase-Queries + Limit-Check für Free-User.
// Unterstützt benannte Listen (watchlist_groups, Premium-Feature):
// group_id = null → Standard-Watchlist, sonst Mitgliedschaft in einer Liste.
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { hasPremiumAccess } from '@/lib/premiumAccess'

export const FREE_WATCHLIST_LIMIT = 5

export interface WatchlistGroupOption {
  id: string
  name: string
}

export interface WatchlistMembership {
  ungrouped: boolean
  groupIds: string[]
}

export function useWatchlist(ticker: string) {
  const [membership, setMembership] = useState<WatchlistMembership>({ ungrouped: false, groupIds: [] })
  const [groups, setGroups] = useState<WatchlistGroupOption[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [count, setCount] = useState(0)
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()

  const exists = membership.ungrouped || membership.groupIds.length > 0

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

        const [tickerRes, countRes, profileRes, groupsRes] = await Promise.all([
          supabase
            .from('watchlists')
            .select('id, group_id')
            .eq('user_id', session.user.id)
            .eq('ticker', ticker.toUpperCase()),
          supabase
            .from('watchlists')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', session.user.id),
          supabase.from('profiles').select('is_premium, subscription_status, subscription_end_date').eq('user_id', session.user.id).maybeSingle(),
          supabase
            .from('watchlist_groups')
            .select('id, name')
            .eq('user_id', session.user.id)
            .order('position', { ascending: true })
            .order('created_at', { ascending: true }),
        ])

        if (cancelled) return
        setUserId(session.user.id)
        const rows = tickerRes.data ?? []
        setMembership({
          ungrouped: rows.some(r => r.group_id === null),
          groupIds: rows.filter(r => r.group_id !== null).map(r => r.group_id as string),
        })
        setCount(countRes.count ?? 0)
        setIsPremium(hasPremiumAccess(profileRes.data))
        setGroups(groupsRes.data ?? [])
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

  // Schnell-Toggle (Stern-Klick): hinzufügen zur Standard-Watchlist,
  // Entfernen löscht den Ticker aus allen Listen.
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
          const removed = (membership.ungrouped ? 1 : 0) + membership.groupIds.length
          setMembership({ ungrouped: false, groupIds: [] })
          setCount(c => Math.max(0, c - removed))
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
          setMembership(m => ({ ...m, ungrouped: true }))
          setCount(c => c + 1)
        }
      }
    } catch (err) {
      console.error('[useWatchlist] toggle error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, exists, membership, limitReached, ticker, router])

  // Mitgliedschaft in einer Liste umschalten (groupId = null → Standard-Watchlist)
  const toggleList = useCallback(
    async (groupId: string | null) => {
      if (!userId) return
      const inList = groupId === null ? membership.ungrouped : membership.groupIds.includes(groupId)
      setLoading(true)
      try {
        if (inList) {
          let query = supabase
            .from('watchlists')
            .delete()
            .eq('user_id', userId)
            .eq('ticker', ticker.toUpperCase())
          query = groupId === null ? query.is('group_id', null) : query.eq('group_id', groupId)
          const { error } = await query
          if (!error) {
            setMembership(m => ({
              ungrouped: groupId === null ? false : m.ungrouped,
              groupIds: groupId === null ? m.groupIds : m.groupIds.filter(id => id !== groupId),
            }))
            setCount(c => Math.max(0, c - 1))
          }
        } else {
          if (!exists && limitReached) {
            router.push('/pricing')
            return
          }
          const { error } = await supabase.from('watchlists').insert({
            user_id: userId,
            ticker: ticker.toUpperCase(),
            group_id: groupId,
            created_at: new Date().toISOString(),
          })
          if (!error) {
            setMembership(m => ({
              ungrouped: groupId === null ? true : m.ungrouped,
              groupIds: groupId === null ? m.groupIds : [...m.groupIds, groupId],
            }))
            setCount(c => c + 1)
          }
        }
      } catch (err) {
        console.error('[useWatchlist] toggleList error:', err)
      } finally {
        setLoading(false)
      }
    },
    [userId, membership, exists, limitReached, ticker, router]
  )

  return {
    exists,
    membership,
    groups,
    loading,
    isPremium,
    count,
    limitReached,
    initialized,
    isAuthenticated: !!userId,
    toggle,
    toggleList,
  }
}
