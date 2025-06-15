// src/app/analyse/layout.tsx - Erweiterte Layout-Lösung
'use client'

import React, { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  ChartBarIcon,
  BookmarkIcon,
  MapIcon,
  CalendarIcon,
  BellIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  DocumentChartBarIcon,
  NewspaperIcon,
  BanknotesIcon,
  UserGroupIcon,
  SparklesIcon,
  CalculatorIcon, 
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

// Bestehende Sidebar Tabs
const analyseTabs = [
  { id: 'overview', href: '/analyse', label: 'Übersicht', icon: ChartBarIcon, description: 'Aktien-Dashboard' },
  { id: 'watchlist', href: '/analyse/watchlist', label: 'Watchlist', icon: BookmarkIcon, description: 'Gespeicherte Aktien' },
  { id: 'heatmap', href: '/analyse/heatmap', label: 'Heatmap', icon: MapIcon, description: 'Markt-Übersicht' },
  { id: 'earnings', href: '/analyse/earnings', label: 'Earnings', icon: CalendarIcon, description: 'Gewinntermine' },
]

const terminalTabs = [
  { id: 'news', label: 'News', icon: NewspaperIcon, href: '/analyse/news', description: 'Aktuelle Nachrichten' },
  { id: 'dividends', label: 'Dividends', icon: BanknotesIcon, href: '/analyse/dividends', description: 'Dividenden-Tracker' },
  { id: 'superinvestors', label: 'Super-Investoren', icon: UserGroupIcon, href: '/superinvestor', description: 'Investor Portfolios' },
]

// Ticker-spezifische Tabs
const tickerTabs = [
  { id: 'overview', label: 'Übersicht', icon: ChartBarIcon, description: 'Fundamentaldaten & Charts' },
  { id: 'valuation', label: 'Bewertung', icon: CalculatorIcon, description: 'Ratios & Vergleiche' }, 
  { id: 'dividends', label: 'Dividenden', icon: BanknotesIcon, description: 'Historie & Wachstum' },
  { id: 'news', label: 'News', icon: NewspaperIcon, description: 'Aktuelle Nachrichten' },
  { id: 'investors', label: 'Investoren', icon: UserGroupIcon, description: 'Institutional Holdings' },
  { id: 'financials', label: 'Kennzahlen', icon: DocumentChartBarIcon, description: 'Erweiterte Daten' }
]

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface TerminalAnalyseLayoutProps {
  children: ReactNode
}

export default function TerminalAnalyseLayout({ children }: TerminalAnalyseLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [selectedTicker, setSelectedTicker] = useState('AAPL')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // ✅ Bestimme ob wir auf einer Ticker-spezifischen Seite sind
  const isTickerPage = pathname.match(/^\/analyse\/[a-zA-Z]+(\/.+)?$/)
  const tickerFromPath = isTickerPage ? pathname.split('/')[2] : null

  // ✅ Auth Logic (unverändert)
  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[AnalyseLayout] Session error:', error.message)
          if (mounted) router.push('/auth/signin')
          return
        }
        
        if (!session?.user) {
          if (mounted) router.push('/auth/signin')
          return
        }

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          const isPremium = profile?.is_premium || false
          
          if (mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              isPremium
            })
            setLoading(false)
          }
        } catch (profileError) {
          console.error('[AnalyseLayout] Error fetching profile:', profileError)
          if (mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              isPremium: false
            })
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('[AnalyseLayout] Unexpected auth error:', error)
        if (mounted) router.push('/auth/signin')
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/auth/signin')
        return
      }
      
      if (event === 'SIGNED_IN' && session) {
        checkAuth()
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  // ✅ Bestimme aktive Sektion
  const getActiveSection = () => {
    if (pathname === '/analyse') return 'overview'
    if (pathname.includes('/watchlist')) return 'watchlist'
    if (pathname.includes('/heatmap')) return 'heatmap'
    if (pathname.includes('/earnings')) return 'earnings'
    if (pathname.includes('/news')) return 'news'
    if (pathname.includes('/dividends')) return 'dividends'
    if (pathname.includes('/superinvestor')) return 'superinvestors'
    return 'overview'
  }

  // ✅ Bestimme aktiven Ticker-Tab
  const getActiveTickerTab = () => {
    if (!isTickerPage) return 'overview'
    const pathParts = pathname.split('/')
    if (pathParts.length === 3) return 'overview' // /analyse/msft
    if (pathParts.includes('valuation')) return 'valuation'
    if (pathParts.includes('dividends')) return 'dividends'
    if (pathParts.includes('news')) return 'news'
    if (pathParts.includes('investors')) return 'investors'
    if (pathParts.includes('financials')) return 'financials'
    return 'overview'
  }

  const activeSection = getActiveSection()
  const activeTickerTab = getActiveTickerTab()
  
  const activeTab = [...analyseTabs, ...terminalTabs].find(tab => 
    pathname === tab.href || 
    (tab.id === 'overview' && pathname === '/analyse') ||
    (tab.id === activeSection)
  )

  const handleTickerSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && selectedTicker.trim()) {
      router.push(`/analyse/${selectedTicker.toLowerCase()}`)
    }
  }

  const getInitials = () => {
    if (!user?.email) return 'U'
    return user.email.charAt(0).toUpperCase()
  }

  const getDisplayName = () => {
    if (!user?.email) return 'User'
    return user.email.split('@')[0]
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Lade Analyse-Terminal...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-gray-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-end gap-0.5">
              <div className="w-1.5 h-3 bg-green-500 rounded-sm"></div>
              <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
              <div className="w-1.5 h-5 bg-green-500 rounded-sm"></div>
            </div>
            <span className="text-xl font-bold text-white">FinClue</span>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-medium">
              Terminal
            </span>
          </Link>
        </div>

        {/* ✅ Conditional Search - nur auf Übersichts-Seiten */}
        {!isTickerPage && (
          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Ticker suchen..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-green-500"
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                onKeyDown={handleTickerSearch}
              />
            </div>
          </div>
        )}

        {/* ✅ Ticker Info - nur auf Ticker-Seiten */}
        {isTickerPage && tickerFromPath && (
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">{tickerFromPath.toUpperCase()}</span>
              </div>
              <div>
                <div className="text-white font-medium">{tickerFromPath.toUpperCase()}</div>
                <div className="text-xs text-gray-400">Aktienanalyse</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Analyse Tools
            </div>
            
            {analyseTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = pathname === tab.href || 
                (tab.id === 'overview' && pathname === '/analyse')
              
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <div className="flex-1">
                    <div>{tab.label}</div>
                    <div className="text-xs text-gray-500">{tab.description}</div>
                  </div>
                </Link>
              )
            })}

            <div className="my-4 h-px bg-gray-800"></div>
            
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Premium Features
            </div>

            {terminalTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = pathname === tab.href
              const isComingSoon = !['superinvestors', 'dividends'].includes(tab.id)
              
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : isComingSoon
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                  onClick={isComingSoon ? (e) => e.preventDefault() : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {tab.label}
                      {isComingSoon && (
                        <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                          Bald
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{tab.description}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-black font-semibold text-sm">
                {getInitials()}
              </div>
              {user.isPremium && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
                  <SparklesIcon className="w-2 h-2 text-black" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{getDisplayName()}</div>
              <div className="flex items-center gap-1 text-xs">
                {user.isPremium ? (
                  <span className="text-green-400">Premium</span>
                ) : (
                  <span className="text-gray-400">Free</span>
                )}
              </div>
            </div>
            <Link href="/profile" className="p-1 text-gray-400 hover:text-white transition-colors">
              <Cog6ToothIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">
              {isTickerPage 
                ? `${tickerFromPath?.toUpperCase()} Analyse`
                : activeTab?.label || 'Analyse'
              }
            </h1>
            {activeTab?.description && !isTickerPage && (
              <div className="text-sm text-gray-400">
                {activeTab.description}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {!user.isPremium && (
              <Link 
                href="/pricing"
                className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
              >
                Premium
              </Link>
            )}
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <BellIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ✅ Ticker-spezifische Tab Navigation */}
        {isTickerPage && tickerFromPath && (
          <div className="border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-1 px-6 py-3">
              <Link 
                href="/analyse"
                className="flex items-center gap-1 text-gray-400 hover:text-green-400 transition-colors text-sm"
              >
                <ArrowLeftIcon className="w-3 h-3" />
                <span>Zurück</span>
              </Link>
              <span className="text-gray-600 mx-2">/</span>
              <span className="text-gray-400 text-sm">{tickerFromPath.toUpperCase()}</span>
            </div>
            <div className="flex px-6">
              {tickerTabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTickerTab === tab.id
                const href = tab.id === 'overview' 
                  ? `/analyse/${tickerFromPath}` 
                  : `/analyse/${tickerFromPath}/${tab.id}`
                
                return (
                  <Link
                    key={tab.id}
                    href={href}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                      isActive
                        ? 'border-green-400 text-green-400'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{tab.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}