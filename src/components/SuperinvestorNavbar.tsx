'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ChevronRightIcon,
  MagnifyingGlassIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { investors } from '@/data/investors'

// Page title mapping for known routes
const pageTitles: Record<string, string> = {
  '/superinvestor': 'Dashboard',
  '/superinvestor/investors': 'Alle Investoren',
  '/superinvestor/insights': 'Market Insights',
  '/superinvestor/momentum': 'Momentum',
  '/superinvestor/sectors': 'Sektoren',
  '/superinvestor/activity': 'Aktivität',
  '/superinvestor/insider': 'Insider Trading',
}

// Get investor name from slug
function getInvestorName(slug: string): string {
  const investor = investors.find((inv) => inv.slug === slug)
  if (investor) {
    return investor.name.split('–')[0].trim()
  }
  // Fallback: format slug
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// User Dropdown Component
function UserDropdown({ user, profile }: { user: any; profile: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitials = () => {
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase()
    }
    return (user.email || '').charAt(0).toUpperCase()
  }

  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name + (profile.last_name ? ` ${profile.last_name}` : '')
    }
    return (user.email || '').split('@')[0]
  }

  const isPremium = profile?.is_premium || false

  const handleLogout = async () => {
    setIsOpen(false)
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
      >
        {getInitials()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* User Info */}
          <div className="p-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-black font-semibold">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">{getDisplayName()}</div>
                <div className="text-neutral-500 text-xs truncate">{user.email}</div>
              </div>
              {isPremium && (
                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-xs font-medium">
                  Premium
                </span>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={() => handleNavigation('/profile')}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-neutral-800 transition-colors group"
            >
              <UserIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />
              <span className="text-sm text-neutral-300 group-hover:text-white">Profil</span>
            </button>

            <button
              onClick={() => handleNavigation('/settings')}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-neutral-800 transition-colors group"
            >
              <Cog6ToothIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />
              <span className="text-sm text-neutral-300 group-hover:text-white">Einstellungen</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
                window.location.href = 'mailto:team@finclue.de'
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-neutral-800 transition-colors group"
            >
              <EnvelopeIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />
              <span className="text-sm text-neutral-300 group-hover:text-white">Support</span>
            </button>

            <div className="my-2 h-px bg-neutral-800"></div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-red-500/10 transition-colors group"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 text-neutral-500 group-hover:text-red-400" />
              <span className="text-sm text-neutral-300 group-hover:text-red-400">Abmelden</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Guest Actions Component
function GuestActions() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/signin"
        className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
      >
        Anmelden
      </Link>
      <Link
        href="/auth/signup"
        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg text-sm transition-colors"
      >
        Registrieren
      </Link>
    </div>
  )
}

export default function SuperinvestorNavbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (mounted) {
          if (error) {
            setUser(null)
            setProfile(null)
          } else if (session?.user) {
            setUser(session.user)
            loadProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
          }
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    async function loadProfile(userId: string) {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('user_id, is_premium, subscription_status, first_name, last_name, email_verified')
          .eq('user_id', userId)
          .maybeSingle()

        if (mounted) {
          if (error) {
            setProfile({ user_id: userId, is_premium: false })
          } else {
            setProfile(profileData)
          }
        }
      } catch {
        if (mounted) {
          setProfile({ user_id: userId, is_premium: false })
        }
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        if (session?.user) {
          setUser(session.user)
          loadProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Get current page title and breadcrumb
  const getBreadcrumb = () => {
    // Check if it's a known page
    if (pageTitles[pathname]) {
      return {
        title: pageTitles[pathname],
        isSubpage: pathname !== '/superinvestor',
      }
    }

    // Check if it's an investor detail page (/superinvestor/[slug])
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 2 && segments[0] === 'superinvestor') {
      const slug = segments[1]
      return {
        title: getInvestorName(slug),
        isSubpage: true,
      }
    }

    return {
      title: 'Dashboard',
      isSubpage: false,
    }
  }

  const { title, isSubpage } = getBreadcrumb()

  return (
    <nav className="h-14 border-b border-neutral-800/50 bg-[#0F0F11] flex items-center justify-between px-6 lg:ml-60">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Superinvestoren Link */}
        <Link
          href="/superinvestor"
          className={`text-sm font-medium transition-colors ${
            isSubpage ? 'text-neutral-500 hover:text-neutral-300' : 'text-white'
          }`}
        >
          Superinvestoren
        </Link>

        {/* Breadcrumb for subpages */}
        {isSubpage && (
          <>
            <ChevronRightIcon className="w-4 h-4 text-neutral-600 flex-shrink-0" />
            <span className="text-sm font-medium text-white truncate">{title}</span>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search Button */}
        <button className="p-2 text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-neutral-800/50">
          <MagnifyingGlassIcon className="w-5 h-5" />
        </button>

        {/* User Menu */}
        {loading ? (
          <div className="w-8 h-8 rounded-full bg-neutral-800 animate-pulse"></div>
        ) : user ? (
          <UserDropdown user={user} profile={profile} />
        ) : (
          <GuestActions />
        )}
      </div>
    </nav>
  )
}
