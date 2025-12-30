// src/components/PublicInvestorFollowButton.tsx
'use client'

import { useState, useEffect } from 'react'
import { BellIcon, UserPlusIcon, CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import { supabase } from '@/lib/supabaseClient'

interface PublicInvestorFollowButtonProps {
  investorSlug: string
  investorName: string
  className?: string
  compact?: boolean
}

export default function PublicInvestorFollowButton({
  investorSlug,
  investorName,
  className = '',
  compact = false
}: PublicInvestorFollowButtonProps) {
  const [user, setUser] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Check auth status
  useEffect(() => {
    checkAuthAndFollowStatus()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuthAndFollowStatus()
    })

    return () => subscription.unsubscribe()
  }, [investorSlug])

  async function checkAuthAndFollowStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setUser(null)
        setIsFollowing(false)
        setLoading(false)
        return
      }

      setUser(session.user)

      // Check if user follows this investor
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('preferred_investors')
        .eq('user_id', session.user.id)
        .maybeSingle()

      const preferredInvestors = settings?.preferred_investors || []
      setIsFollowing(preferredInvestors.includes(investorSlug))

    } catch (error) {
      console.error('Error checking auth:', error)
      setUser(null)
      setIsFollowing(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleFollow() {
    if (!user) {
      // Redirect to signin with return URL
      const currentUrl = window.location.pathname
      window.location.href = `/auth/signin?redirect=${encodeURIComponent(currentUrl)}`
      return
    }

    setActionLoading(true)
    const action = isFollowing ? 'unfollow' : 'follow'

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No valid session')
      }

      const response = await fetch('/api/notifications/follow-investor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
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

      setIsFollowing(result.isFollowing)

      // Show success message (falls du Toast-System hast)
      if (typeof window !== 'undefined' && 'showToast' in window) {
        (window as any).showToast(
          result.isFollowing 
            ? `Folge jetzt ${investorName} - erhältst E-Mails bei 13F-Filings!`
            : `Folge ${investorName} nicht mehr`,
          result.isFollowing ? 'success' : 'info'
        )
      }

    } catch (error) {
      console.error('Follow error:', error)
      
      // Show error message (falls du Toast-System hast)
      if (typeof window !== 'undefined' && 'showToast' in window) {
        (window as any).showToast('Fehler beim Aktualisieren der Benachrichtigungen', 'error')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Loading state
  if (loading) {
    if (compact) {
      return (
        <div className={`p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] ${className}`}>
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="animate-pulse bg-gray-300 dark:bg-gray-700 h-12 rounded-lg"></div>
        <div className="animate-pulse bg-gray-300 dark:bg-gray-700 h-4 rounded w-3/4 mx-auto"></div>
      </div>
    )
  }

  // COMPACT MODE - Icon button only
  if (compact) {
    return (
      <button
        onClick={handleFollow}
        disabled={actionLoading}
        className={`group relative p-3 rounded-xl border transition-all duration-200 ${
          isFollowing
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-white/[0.03] border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white'
        } ${className}`}
        title={isFollowing ? 'Du folgst diesem Investor' : 'Investor folgen für Updates'}
      >
        {actionLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isFollowing ? (
          <BellIconSolid className="w-5 h-5" />
        ) : (
          <BellIcon className="w-5 h-5" />
        )}
        {isFollowing && !actionLoading && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161618]"></span>
        )}
      </button>
    )
  }

  // NOT LOGGED IN - Show signup prompt
  if (!user) {
    return (
      <div className={`space-y-4 ${className}`}>
        <button
          onClick={handleFollow}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-500 hover:bg-green-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          <UserPlusIcon className="w-5 h-5" />
          <span>{investorName} folgen</span>
          <ArrowRightIcon className="w-4 h-4" />
        </button>
        
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            📧 E-Mail-Benachrichtigungen bei neuen 13F-Filings
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Kostenlos registrieren • Keine Spam • Jederzeit abmelden
          </p>
        </div>

        {/* Features Preview */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Was du erhältst:
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>✅ Sofortige E-Mails bei neuen Filings</li>
            <li>✅ Portfolio-Änderungen im Detail</li>
            <li>✅ Neue Käufe und Verkäufe</li>
            <li>⭐ Premium: Erweiterte Analysen</li>
          </ul>
        </div>
      </div>
    )
  }

  // LOGGED IN - Show follow/unfollow button
  return (
    <div className={`space-y-4 ${className}`}>
      <button
        onClick={handleFollow}
        disabled={actionLoading}
        className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
          isFollowing 
            ? 'bg-green-500/20 border-2 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/30' 
            : 'bg-green-500 hover:bg-green-400 text-white'
        } ${actionLoading ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}
      >
        {actionLoading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        ) : isFollowing ? (
          <BellIconSolid className="w-5 h-5" />
        ) : (
          <BellIcon className="w-5 h-5" />
        )}
        
        <span>
          {actionLoading 
            ? 'Wird gespeichert...' 
            : isFollowing 
              ? `Folge ${investorName}` 
              : `${investorName} folgen`
          }
        </span>
        
        {isFollowing && !actionLoading && <CheckIcon className="w-4 h-4" />}
      </button>
      
      <div className="text-center">
        {isFollowing ? (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400 font-medium">
              ✅ Du erhältst E-Mails bei neuen 13F-Filings
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            📧 Erhalte E-Mails bei neuen Portfolio-Änderungen
          </p>
        )}
      </div>
    </div>
  )
}