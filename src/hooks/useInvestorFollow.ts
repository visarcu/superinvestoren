// src/hooks/useInvestorFollow.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface UseInvestorFollowReturn {
  isFollowing: boolean
  isLoading: boolean
  isAuthenticated: boolean
  toggleFollow: () => Promise<void>
  followedInvestors: string[]
}

export function useInvestorFollow(investorSlug: string): UseInvestorFollowReturn {
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [followedInvestors, setFollowedInvestors] = useState<string[]>([])

  // Load current follow status
  useEffect(() => {
    async function loadFollowStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          setIsAuthenticated(false)
          setIsLoading(false)
          return
        }

        setIsAuthenticated(true)

        // ✅ Verwende den normalen Supabase Client mit RLS
        const { data: settings } = await supabase
          .from('notification_settings')
          .select('preferred_investors')
          .eq('user_id', session.user.id)
          .maybeSingle()

        const preferredInvestors = settings?.preferred_investors || []
        setFollowedInvestors(preferredInvestors)
        setIsFollowing(preferredInvestors.includes(investorSlug))

      } catch (error) {
        console.error('Error loading follow status:', error)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadFollowStatus()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadFollowStatus()
    })

    return () => subscription.unsubscribe()
  }, [investorSlug])

  const toggleFollow = async () => {
    if (!isAuthenticated) {
      // Redirect to signin
      window.location.href = `/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`
      return
    }

    const action = isFollowing ? 'unfollow' : 'follow'
    
    // Optimistic update
    const previousState = isFollowing
    const previousFollowed = [...followedInvestors]
    
    setIsFollowing(!isFollowing)
    setFollowedInvestors(prev => 
      action === 'follow' 
        ? [...prev, investorSlug]
        : prev.filter(inv => inv !== investorSlug)
    )

    try {
      // ✅ Session Token für Authorization Header holen
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No valid session')
      }

      // ✅ API Route aufrufen mit Authorization Header
      const response = await fetch('/api/notifications/follow-investor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // ✅ Access Token hinzufügen
        },
        body: JSON.stringify({
          investorSlug,
          action
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Follow failed')
      }

      // Update with server response
      setIsFollowing(result.isFollowing)
      setFollowedInvestors(result.followedInvestors || [])

      // Show success toast
      const investorName = investorSlug.charAt(0).toUpperCase() + investorSlug.slice(1)
      if (typeof window !== 'undefined' && 'showToast' in window) {
        (window as any).showToast(
          result.isFollowing 
            ? `Folge jetzt ${investorName} - erhältst E-Mails bei 13F-Filings!`
            : `Folge ${investorName} nicht mehr`,
          result.isFollowing ? 'success' : 'info'
        )
      }

    } catch (error) {
      console.error('Follow toggle error:', error)
      
      // Revert optimistic update
      setIsFollowing(previousState)
      setFollowedInvestors(previousFollowed)

      // Show error toast
      if (typeof window !== 'undefined' && 'showToast' in window) {
        (window as any).showToast('Fehler beim Aktualisieren der Benachrichtigungen', 'error')
      }
    }
  }

  return {
    isFollowing,
    isLoading,
    isAuthenticated,
    toggleFollow,
    followedInvestors
  }
}