// src/components/PublicInvestorFollowButton.tsx
'use client'

import { useState, useEffect } from 'react'
import { BellIcon, UserPlusIcon, CheckIcon, ArrowRightIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

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
  const [isPremium, setIsPremium] = useState(false)
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
        setIsPremium(false)
        setLoading(false)
        return
      }

      setUser(session.user)

      // Check premium status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', session.user.id)
        .maybeSingle()

      setIsPremium(profile?.is_premium || false)

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
      setIsPremium(false)
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

    const action = isFollowing ? 'unfollow' : 'follow'

    // Premium check for follow action
    if (action === 'follow' && !isPremium) {
      if (typeof window !== 'undefined' && 'showToast' in window) {
        (window as any).showToast('Investoren folgen ist ein Premium Feature', 'error')
      }
      window.location.href = '/pricing'
      return
    }

    setActionLoading(true)

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

      // Handle premium required error
      if (response.status === 403 && result.error === 'Premium required') {
        if (typeof window !== 'undefined' && 'showToast' in window) {
          (window as any).showToast('Investoren folgen ist ein Premium Feature', 'error')
        }
        window.location.href = '/pricing'
        return
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Follow failed')
      }

      setIsFollowing(result.isFollowing)

      // Show success message
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

      // Show error message
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

  // Show premium locked state for non-premium authenticated users
  const showPremiumLock = user && !isPremium && !isFollowing

  // COMPACT MODE - Button with text
  if (compact) {
    return (
      <button
        onClick={handleFollow}
        disabled={actionLoading}
        className={`group inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
          isFollowing
            ? 'bg-brand/10 border border-green-500/30 text-brand-light'
            : showPremiumLock
              ? 'bg-white/[0.03] border border-white/[0.08] text-gray-400 hover:bg-white/[0.06]'
              : 'bg-white/[0.03] border border-white/[0.08] text-gray-300 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white'
        } ${className}`}
        title={showPremiumLock ? 'Premium Feature - Upgrade für Benachrichtigungen' : isFollowing ? 'Du folgst diesem Investor' : 'Investor folgen für Updates'}
      >
        {actionLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isFollowing ? (
          <BellIconSolid className="w-4 h-4" />
        ) : showPremiumLock ? (
          <LockClosedIcon className="w-4 h-4" />
        ) : (
          <BellIcon className="w-4 h-4" />
        )}
        <span>
          {isFollowing
            ? 'Du folgst diesem Investor'
            : showPremiumLock
              ? 'Folgen'
              : 'Folgen'
          }
        </span>
      </button>
    )
  }

  // NOT LOGGED IN - Show signup prompt
  if (!user) {
    return (
      <div className={`space-y-4 ${className}`}>
        <button
          onClick={handleFollow}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-brand hover:bg-green-400 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          <UserPlusIcon className="w-5 h-5" />
          <span>{investorName} folgen</span>
          <ArrowRightIcon className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            E-Mail-Benachrichtigungen bei neuen 13F-Filings
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Registrieren und Premium upgraden
          </p>
        </div>

        {/* Features Preview */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Premium Feature:
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>Sofortige E-Mails bei neuen Filings</li>
            <li>Portfolio-Änderungen im Detail</li>
            <li>Neue Käufe und Verkäufe</li>
          </ul>
        </div>
      </div>
    )
  }

  // LOGGED IN BUT NOT PREMIUM - Show upgrade prompt
  if (showPremiumLock) {
    return (
      <div className={`space-y-4 ${className}`}>
        <button
          onClick={handleFollow}
          disabled={actionLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gray-700/50 border border-gray-600 text-gray-400 rounded-xl font-semibold transition-all duration-200 hover:bg-gray-600/50"
        >
          <LockClosedIcon className="w-5 h-5" />
          <span>{investorName} folgen</span>
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">
            <LockClosedIcon className="w-4 h-4 inline mr-1" />
            Investoren folgen ist ein Premium Feature
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm text-brand-light hover:underline font-medium"
          >
            Jetzt upgraden
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  // LOGGED IN AND PREMIUM - Show follow/unfollow button
  return (
    <div className={`space-y-4 ${className}`}>
      <button
        onClick={handleFollow}
        disabled={actionLoading}
        className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] ${
          isFollowing
            ? 'bg-brand/20 border-2 border-green-500/30 text-brand dark:text-brand-light hover:bg-brand/30'
            : 'bg-brand hover:bg-green-400 text-white'
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
          <div className="p-3 bg-brand/10 border border-brand/20 rounded-lg">
            <p className="text-sm text-brand-light font-medium">
              Du erhältst E-Mails bei neuen 13F-Filings
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Erhalte E-Mails bei neuen Portfolio-Änderungen
          </p>
        )}
      </div>
    </div>
  )
}
