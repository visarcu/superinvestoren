// src/app/(terminal)/layout.tsx - KOMPAKTERES TERMINAL LAYOUT
'use client'

import React, { ReactNode, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  ChartBarIcon,
  BookmarkIcon,
  MapIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
  BriefcaseIcon,
  SparklesIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  EnvelopeIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  XMarkIcon,
  ClockIcon,
  SignalIcon,
  SunIcon,
  MoonIcon,
  HomeIcon
} from '@heroicons/react/24/outline'
import { Analytics } from "@vercel/analytics/next"

import { useTheme } from '@/lib/useTheme'
import { CurrencyProvider } from '@/lib/CurrencyContext'
import CurrencySelector from '@/components/CurrencySelector'
import '../globals.css'

// ✅ Command Palette Interface
interface CommandPaletteItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href?: string
  action?: () => void
  category: 'navigation' | 'actions' | 'settings'
}

// ✅ Navigation Interface
interface BaseNavigationItem {
  id: string
  label: string
  description?: string
  premium?: boolean
  comingSoon?: boolean
}

interface RegularNavigationItem extends BaseNavigationItem {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  separator?: never
}

interface SeparatorNavigationItem {
  id: string
  separator: true
  icon?: never
  href?: never
  label?: never
  description?: never
  premium?: never
  comingSoon?: never
}

type NavigationItem = RegularNavigationItem | SeparatorNavigationItem

// ✅ KOMPAKTE Navigation
const NAVIGATION: NavigationItem[] = [
  // Core Features
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: HomeIcon,
    href: '/analyse',
    description: 'Marktübersicht'
  },

  {
    id: 'watchlist',
    label: 'Watchlist',
    icon: BookmarkIcon,
    href: '/analyse/watchlist',
    description: 'Gespeicherte Aktien'
  },
  {
    id: 'heatmap',
    label: 'Market Heatmap',
    icon: MapIcon,
    href: '/analyse/heatmap',
    description: 'Markt-Übersicht'
  },
  {
    id: 'earnings',
    label: 'Earnings Kalendar',
    icon: CalendarIcon,
    href: '/analyse/earnings',
    description: 'Gewinntermine'
  },
  
  // Separator
  { id: 'separator-1', separator: true },
  
  // AI & Premium
  {
    id: 'ai',
    label: 'FinClue AI',
    icon: SparklesIcon,
    href: '/analyse/ai',
    description: 'KI-gestützte Analyse',
    premium: true
  },
  
  // Separator
  { id: 'separator-2', separator: true },
  
  // Account
  {
    id: 'profile',
    label: 'Profil',
    icon: UserCircleIcon,
    href: '/profile',
    description: 'Account verwalten'
  },
  {
    id: 'settings',
    label: 'Einstellungen',
    icon: Cog6ToothIcon,
    href: '/settings',
    description: 'Konfiguration'
  }
]

// Stock Analysis Tabs
const STOCK_TABS = [
  { id: 'overview', label: 'Überblick', href: '' },
  { id: 'financials', label: 'Finanzen', href: '/financials' },
  { id: 'super-investors', label: 'Super-Investoren', href: '/super-investors' }, 
  { id: 'valuation', label: 'Bewertung', href: '/valuation' },
  { id: 'dividends', label: 'Dividende', href: '/dividends' },
  { id: 'news', label: 'News', href: '/news' },
  { id: 'ai-chat', label: 'Finclue AI', href: '/ai-chat', premium: true }
]

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface LayoutProps {
  children: ReactNode
}

// ✅ KOMPAKTE Command Palette Component
function CommandPalette({ 
  isOpen, 
  onClose, 
  onNavigate,
  theme,
  toggleTheme
}: { 
  isOpen: boolean
  onClose: () => void
  onNavigate: (href: string) => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Command items
  const commands: CommandPaletteItem[] = [
    // Navigation
    { id: 'nav-dashboard', title: 'Dashboard', subtitle: 'Marktübersicht', icon: HomeIcon, href: '/analyse', category: 'navigation' },
    { id: 'nav-watchlist', title: 'Watchlist', subtitle: 'Gespeicherte Aktien', icon: BookmarkIcon, href: '/analyse/watchlist', category: 'navigation' },
    { id: 'nav-heatmap', title: 'Heatmap', subtitle: 'Visuelle Marktansicht', icon: MapIcon, href: '/analyse/heatmap', category: 'navigation' },
    { id: 'nav-earnings', title: 'Earnings Calendar', subtitle: 'Anstehende Termine', icon: CalendarIcon, href: '/analyse/earnings', category: 'navigation' },
    { id: 'nav-ai', title: 'FinClue AI', subtitle: 'KI-gestützte Analyse', icon: SparklesIcon, href: '/analyse/ai', category: 'navigation' },
    { id: 'nav-profile', title: 'Profil', subtitle: 'Account verwalten', icon: UserCircleIcon, href: '/profile', category: 'settings' },
    { id: 'nav-settings', title: 'Einstellungen', subtitle: 'Konfiguration', icon: Cog6ToothIcon, href: '/settings', category: 'settings' },
    
    // Quick Stock Access
    { id: 'stock-aapl', title: 'AAPL Analyse', subtitle: 'Apple Inc.', icon: ChartBarIcon, href: '/analyse/stocks/aapl', category: 'navigation' },
    { id: 'stock-tsla', title: 'TSLA Analyse', subtitle: 'Tesla Inc.', icon: ChartBarIcon, href: '/analyse/stocks/tsla', category: 'navigation' },
    { id: 'stock-nvda', title: 'NVDA Analyse', subtitle: 'NVIDIA Corp.', icon: ChartBarIcon, href: '/analyse/stocks/nvda', category: 'navigation' },
    { id: 'stock-msft', title: 'MSFT Analyse', subtitle: 'Microsoft Corp.', icon: ChartBarIcon, href: '/analyse/stocks/msft', category: 'navigation' },
    
    // Actions
    { id: 'action-upgrade', title: 'Premium upgraden', subtitle: 'Alle Features freischalten', icon: SparklesIcon, href: '/pricing', category: 'actions' },
    { id: 'action-support', title: 'Support kontaktieren', subtitle: 'Hilfe erhalten', icon: EnvelopeIcon, action: () => window.location.href = 'mailto:team.finclue@gmail.com', category: 'actions' },
    { id: 'action-theme', title: `${theme === 'dark' ? 'Helles' : 'Dunkles'} Design`, subtitle: 'Theme umschalten', icon: theme === 'dark' ? SunIcon : MoonIcon, action: toggleTheme, category: 'actions' },
  ]

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.subtitle?.toLowerCase().includes(query.toLowerCase())
  )

  const groupedCommands = {
    navigation: filteredCommands.filter(cmd => cmd.category === 'navigation'),
    actions: filteredCommands.filter(cmd => cmd.category === 'actions'),
    settings: filteredCommands.filter(cmd => cmd.category === 'settings'),
  }

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (command: CommandPaletteItem) => {
    if (command.href) {
      onNavigate(command.href)
    } else if (command.action) {
      command.action()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]">
      <div className="bg-theme-card border border-theme rounded-xl w-full max-w-xl mx-4 backdrop-blur-sm shadow-2xl">
        
        {/* ✅ KOMPAKTE Header */}
        <div className="p-3 border-b border-theme">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-muted" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Suche nach Aktien, Commands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-theme-secondary border border-theme rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 text-sm"
            />
            <button
              onClick={onClose}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-theme-muted hover:text-theme-primary rounded transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ✅ KOMPAKTE Results */}
        <div className="max-h-80 overflow-y-auto">
          {Object.entries(groupedCommands).map(([category, commands]) => {
            if (commands.length === 0) return null
            
            const categoryLabels = {
              navigation: 'Navigation',
              actions: 'Aktionen',
              settings: 'Einstellungen'
            }
            
            return (
              <div key={category} className="p-2">
                <div className="px-2 py-1.5 text-xs text-theme-muted font-medium uppercase tracking-wide">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </div>
                {commands.map((command) => {
                  const Icon = command.icon
                  return (
                    <button
                      key={command.id}
                      onClick={() => handleSelect(command)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-theme-secondary transition-all text-left group"
                    >
                      <div className="w-7 h-7 bg-theme-secondary rounded-lg flex items-center justify-center group-hover:bg-theme-tertiary transition-colors">
                        <Icon className="w-3.5 h-3.5 text-theme-muted group-hover:text-green-400 transition-colors" />
                      </div>
                      <div className="flex-1">
                        <div className="text-theme-primary text-sm font-medium">{command.title}</div>
                        {command.subtitle && (
                          <div className="text-theme-muted text-xs">{command.subtitle}</div>
                        )}
                      </div>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-theme-muted group-hover:text-theme-secondary transition-colors" />
                    </button>
                  )
                })}
              </div>
            )
          })}
          
          {filteredCommands.length === 0 && (
            <div className="p-6 text-center text-theme-muted">
              <MagnifyingGlassIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine Ergebnisse für "{query}"</p>
            </div>
          )}
        </div>

        {/* ✅ KOMPAKTE Footer */}
        <div className="p-2.5 border-t border-theme flex items-center justify-between text-xs text-theme-muted">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-theme-secondary border border-theme rounded text-xs">↵</kbd>
              <span>Auswählen</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-theme-secondary border border-theme rounded text-xs">Esc</kbd>
              <span>Schließen</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-theme-secondary border border-theme rounded text-xs">⌘K</kbd>
            <span>Commands</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfessionalLayout({ children }: LayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  // ✅ Theme Hook
  const { theme, toggleTheme } = useTheme()

  // Bestimme ob wir auf einer Stock-Seite sind
  const stockMatch = pathname.match(/^\/analyse\/stocks\/([a-zA-Z]+)(.*)$/)
  const isStockPage = !!stockMatch
  const currentTicker = stockMatch?.[1]?.toUpperCase()

  // ✅ Market Status berechnen
  const getMarketStatus = () => {
    const now = new Date()
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const day = estTime.getDay()
    const hour = estTime.getHours()
    const minute = estTime.getMinutes()
    const currentMinutes = hour * 60 + minute
    
    if (day === 0 || day === 6) {
      return { status: 'Closed', reason: 'Weekend' }
    }
    
    const marketOpen = 9 * 60 + 30
    const marketClose = 16 * 60
    
    if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
      return { status: 'Open', reason: '' }
    } else {
      return { status: 'Closed', reason: 'After Hours' }
    }
  }

  const marketStatus = getMarketStatus()

  // ✅ Command Palette Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ✅ Live Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auth Logic (same as before but shorter)
  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
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

  const handleTickerSelect = (ticker: string) => {
    router.push(`/analyse/stocks/${ticker.toLowerCase()}`)
  }

  const getInitials = () => {
    if (!user?.email) return 'U'
    return user.email.charAt(0).toUpperCase()
  }

  const getDisplayName = () => {
    if (!user?.email) return 'User'
    return user.email.split('@')[0]
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleBackToSite = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <html lang="de" className={theme}>
        <head>
          <title>FinClue</title>
          <meta name="description" content="Professional Stock Analysis Platform" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Orbitron:wght@400;500;700&display=swap" rel="stylesheet" />
        </head>
        <body className="h-screen bg-theme-primary flex items-center justify-center">
          <CurrencyProvider>
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-theme-secondary text-sm">Loading FinClue...</p>
            </div>
          </CurrencyProvider>
          <Analytics />
        </body>
      </html>
    )
  }

  if (!user) return null

  return (
    <html lang="de" className={theme}>
      <head>
        <title>FinClue</title>
        <meta name="description" content="Professional Stock Analysis Platform" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&family=Orbitron:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="h-screen bg-theme-primary flex overflow-hidden">
        <CurrencyProvider>
          {/* ✅ Command Palette */}
          <CommandPalette 
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onNavigate={(href) => router.push(href)}
            theme={theme}
            toggleTheme={toggleTheme}
          />
          
          {/* ✅ KOMPAKTE Professional Sidebar */}
          <div className="w-52 bg-theme-secondary border-r border-theme flex flex-col">
            {/* ✅ KOMPAKTE Header */}
            <div className="p-3 border-b border-theme">
              <Link href="/analyse" className="flex items-center gap-2 group">
                <div className="flex items-end gap-0.5">
                  <div className="w-1.5 h-3 bg-green-500 rounded-sm"></div>
                  <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
                  <div className="w-1.5 h-5 bg-green-500 rounded-sm"></div>
                </div>
                <span className="text-lg font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                  FinClue
                </span>
              </Link>
            </div>

            {/* ✅ KOMPAKTE Search & Quick Access */}
            <div className="p-2.5 border-b border-theme">
              <button
                onClick={() => setShowCommandPalette(true)}
                className="w-full flex items-center gap-2 px-2.5 py-2 bg-theme-tertiary/30 border border-theme rounded-lg hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all duration-200 group"
                title="Suchen (⌘K)"
              >
                <MagnifyingGlassIcon className="w-3.5 h-3.5 text-theme-muted group-hover:text-green-400 transition-colors" />
                <span className="text-sm text-theme-muted group-hover:text-theme-secondary transition-colors">
                  Suche...
                </span>
                <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-theme-secondary border border-theme rounded text-theme-muted group-hover:text-theme-secondary transition-colors">
                  ⌘K
                </kbd>
              </button>

              {/* ✅ KOMPAKTE Quick Access */}
              <div className="mt-2.5">
                <div className="text-xs text-theme-muted font-medium mb-2 px-1">Schnellzugriff</div>
                <div className="grid grid-cols-4 gap-1">
                  {['AAPL', 'TSLA', 'NVDA', 'MSFT'].map((ticker) => (
                    <button
                      key={ticker}
                      onClick={() => handleTickerSelect(ticker)}
                      className="p-1.5 bg-theme-tertiary/30 hover:bg-theme-tertiary/50 rounded text-xs font-medium text-theme-secondary hover:text-green-400 transition-all duration-200 hover:scale-105"
                      title={`${ticker} analysieren`}
                    >
                      {ticker}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ✅ KOMPAKTE Navigation */}
            <nav className="flex-1 p-2.5 overflow-y-auto">
              <div className="space-y-0.5">
                {NAVIGATION.map((item) => {
                  if ('separator' in item && item.separator) {
                    return (
                      <div key={item.id} className="h-px bg-theme my-2.5"></div>
                    )
                  }
                  
                  if (!('icon' in item) || !('href' in item) || !('label' in item)) {
                    return null
                  }
                  
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  const isPremiumItem = item.premium && !user.isPremium
                  
                  // ✅ Special styling for AI
                  if (item.id === 'ai') {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : isPremiumItem
                              ? 'text-theme-muted hover:text-green-400 hover:bg-green-500/10'
                              : 'text-green-400 hover:bg-green-500/10'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="truncate">{item.label}</span>
                            {isPremiumItem && <SparklesIcon className="w-2.5 h-2.5 text-yellow-400 flex-shrink-0" />}
                          </div>
                          {item.description && (
                            <div className="text-xs text-theme-muted truncate">{item.description}</div>
                          )}
                        </div>
                        {!isActive && (
                          <ArrowRightIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        )}
                      </Link>
                    )
                  }
                  
                  // ✅ Normal navigation items
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary/50'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="truncate">{item.label}</span>
                          {!isActive && (
                            <ArrowRightIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          )}
                        </div>
                        {item.description && (
                          <div className="text-xs text-theme-muted truncate">{item.description}</div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </nav>

            {/* ✅ KOMPAKTE User Footer */}
            <div className="p-2.5 border-t border-theme">
              {/* User Info */}
              <div className="flex items-center gap-2 mb-2">
                <div className="relative">
                  <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center text-black font-semibold text-sm">
                    {getInitials()}
                  </div>
                  {user.isPremium && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-theme-primary text-sm font-medium truncate">{getDisplayName()}</div>
                  <div className="text-xs">
                    {user.isPremium ? (
                      <span className="text-green-400 font-medium">Premium</span>
                    ) : (
                      <span className="text-theme-muted">Free Plan</span>
                    )}
                  </div>
                </div>
                
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <SunIcon className="w-3.5 h-3.5" />
                  ) : (
                    <MoonIcon className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Upgrade Button for Free Users */}
              {!user.isPremium && (
                <Link 
                  href="/pricing"
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-green-500 hover:bg-green-400 text-black rounded-lg text-sm font-semibold transition-colors mb-2"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  Upgrade
                </Link>
              )}

              {/* ✅ KOMPAKTE Quick Actions */}
              <div className="flex gap-1">
                <button
                  onClick={() => window.location.href = 'mailto:team.finclue@gmail.com'}
                  className="flex-1 p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors"
                  title="Support"
                >
                  <EnvelopeIcon className="w-3.5 h-3.5 mx-auto" />
                </button>
                
                <button
                  onClick={handleBackToSite}
                  className="flex-1 p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors"
                  title="Back to Website"
                >
                  <ArrowLeftOnRectangleIcon className="w-3.5 h-3.5 mx-auto" />
                </button>
              </div>
            </div>
          </div>

          {/* ✅ KOMPAKTE Main Content */}
          <div className="flex-1 flex flex-col bg-theme-primary">
            {/* ✅ KOMPAKTE Top Bar mit Currency Selector */}
            <div className="h-11 bg-theme-secondary border-b border-theme flex items-center justify-between px-3">
              <div className="flex items-center gap-2.5">
                {/* Stock Page Header */}
                {isStockPage && currentTicker ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-theme-tertiary rounded-lg flex items-center justify-center">
                      <span className="text-theme-primary font-bold text-xs">{currentTicker}</span>
                    </div>
                    <div>
                      <h1 className="text-sm font-semibold text-green-400">{currentTicker}</h1>
                      <div className="text-xs text-theme-secondary">Aktienanalyse</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h1 className="text-sm font-semibold text-theme-primary">Dashboard</h1>
                    <div className="text-xs text-theme-secondary">Markt-Analyse</div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Currency Selector */}
                <CurrencySelector />
                
                {/* Market Status */}
                <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-theme-tertiary/30 rounded">
                  <SignalIcon className={`w-2 h-2 ${marketStatus.status === 'Open' ? 'text-green-400' : 'text-red-400'}`} />
                  <span className={`text-xs font-medium ${marketStatus.status === 'Open' ? 'text-green-400' : 'text-red-400'}`}>
                    {marketStatus.status === 'Open' ? 'Offen' : 'Geschlossen'}
                  </span>
                </div>

                {/* Premium/Upgrade Button */}
                {!user.isPremium ? (
                  <Link 
                    href="/pricing"
                    className="flex items-center gap-1 px-2.5 py-1 bg-green-500 hover:bg-green-400 text-black font-semibold rounded text-sm transition-all duration-200"
                  >
                    <SparklesIcon className="w-3 h-3" />
                    Upgrade
                  </Link>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded">
                    <SparklesIcon className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">Premium</span>
                  </div>
                )}
                
                {/* Command Palette */}
                <button
                  onClick={() => setShowCommandPalette(true)}
                  className="p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors"
                  title="Search (⌘K)"
                >
                  <MagnifyingGlassIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Stock Analysis Tabs */}
            {isStockPage && currentTicker && (
              <div className="bg-theme-secondary border-b border-theme">
                <div className="px-3">
                  <nav className="flex space-x-4">
                    {STOCK_TABS.map((tab) => {
                      const tabPath = `/analyse/stocks/${currentTicker.toLowerCase()}${tab.href}`
                      const isActive = pathname === tabPath
                      const isPremiumTab = tab.premium && !user.isPremium
                      
                      return (
                        <Link
                          key={tab.id}
                          href={tabPath}
                          className={`flex items-center gap-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                            isActive
                              ? 'border-green-500 text-green-400'
                              : isPremiumTab
                                ? 'border-transparent text-theme-muted hover:text-yellow-400'
                                : 'border-transparent text-theme-secondary hover:text-theme-primary hover:border-theme'
                          }`}
                        >
                          {tab.label}
                          {isPremiumTab && <SparklesIcon className="w-2.5 h-2.5 text-yellow-400" />}
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-theme-primary">
              {children}
            </div>

            {/* ✅ KOMPAKTE Status Bar */}
            <div className="h-5 bg-theme-secondary border-t border-theme flex items-center justify-between px-3 text-xs text-theme-muted">
              <div className="flex items-center gap-2">
                <span>Market: {marketStatus.status}</span>
                <span>•</span>
                <span>Real-time</span>
                {user.isPremium && (
                  <>
                    <span>•</span>
                    <span className="text-green-400">Premium</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>{currentTime.toLocaleTimeString('en-US', { 
                  timeZone: 'America/New_York', 
                  hour: '2-digit', 
                  minute: '2-digit'
                })} EST</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <div className={`w-1 h-1 rounded-full ${marketStatus.status === 'Open' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  Connected
                </span>
              </div>
            </div>
          </div>
        </CurrencyProvider>

        <Analytics />
      </body>
    </html>
  )
}