// src/app/(terminal)/layout.tsx - GEFIXTE VERSION
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
  HomeIcon,
  ListBulletIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'
import { Analytics } from "@vercel/analytics/next"

import { useTheme } from '@/lib/useTheme'
import { CurrencyProvider } from '@/lib/CurrencyContext'
import { LearnModeProvider, useLearnMode } from '@/lib/LearnModeContext'
import CurrencySelector from '@/components/CurrencySelector'
import LearnSidebar from '@/components/LearnSidebar'
import '../globals.css'

// ===== GLOBAL LEARN TOGGLE =====
const GlobalLearnToggle = () => {
  const { isLearnMode, toggleLearnMode } = useLearnMode()
  
  return (
    <button
      onClick={toggleLearnMode}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all duration-200 text-xs font-medium
        ${isLearnMode 
          ? 'bg-green-500/20 border-green-500/40 text-green-400 shadow-sm' 
          : 'bg-theme-tertiary/30 border-theme text-theme-muted hover:text-theme-primary hover:border-green-500/30'
        }
      `}
      title={`Lern-Modus ${isLearnMode ? 'deaktivieren' : 'aktivieren'}`}
    >
      <AcademicCapIcon className={`w-3.5 h-3.5 ${isLearnMode ? 'text-green-400' : 'text-theme-muted'}`} />
      <span className="hidden sm:block">Lernen</span>
      
      <div className={`
        relative w-6 h-3 rounded-full transition-all duration-200
        ${isLearnMode ? 'bg-green-500' : 'bg-theme-tertiary'}
      `}>
        <div className={`
          absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all duration-200 shadow-sm
          ${isLearnMode ? 'left-3' : 'left-0.5'}
        `}></div>
      </div>
    </button>
  )
}

// Command Palette Interface
interface CommandPaletteItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href?: string
  action?: () => void
  category: 'navigation' | 'actions' | 'settings'
}

// Navigation Interface
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

// NAVIGATION
const NAVIGATION: NavigationItem[] = [
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
    id: 'portfolio',
    label: 'Portfolio',
    icon: BriefcaseIcon, // oder PieChartIcon
    href: '/analyse/portfolio',
    description: 'Mein Portfolio & Dividenden'
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
  
  { id: 'separator-1', separator: true },
  
  {
    id: 'ai',
    label: 'FinClue AI',
    icon: SparklesIcon,
    href: '/analyse/ai',
    description: 'KI-gestützte Analyse',
    premium: true
  },
  
  { id: 'separator-2', separator: true },
  
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
  },
  {
    id: 'stock-lists',
    label: 'Aktien Listen',
    icon: ListBulletIcon,
    href: '/analyse/lists',
    description: 'Kuratierte Listen'
  },
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

// ===== COMMAND PALETTE COMPONENT =====
function CommandPalette({ 
  isOpen, 
  onClose, 
  onNavigate,
  theme,
  toggleTheme,
  allowsThemeToggle
}: { 
  isOpen: boolean
  onClose: () => void
  onNavigate: (href: string) => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
  allowsThemeToggle: boolean
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: CommandPaletteItem[] = [
    { id: 'nav-dashboard', title: 'Dashboard', subtitle: 'Marktübersicht', icon: HomeIcon, href: '/analyse', category: 'navigation' },
    { id: 'nav-watchlist', title: 'Watchlist', subtitle: 'Gespeicherte Aktien', icon: BookmarkIcon, href: '/analyse/watchlist', category: 'navigation' },
    { id: 'nav-heatmap', title: 'Heatmap', subtitle: 'Visuelle Marktansicht', icon: MapIcon, href: '/analyse/heatmap', category: 'navigation' },
    { id: 'nav-earnings', title: 'Earnings Calendar', subtitle: 'Anstehende Termine', icon: CalendarIcon, href: '/analyse/earnings', category: 'navigation' },
    { id: 'nav-ai', title: 'FinClue AI', subtitle: 'KI-gestützte Analyse', icon: SparklesIcon, href: '/analyse/ai', category: 'navigation' },
    { id: 'nav-lists', title: 'Aktien Listen', subtitle: 'Kuratierte Listen', icon: ListBulletIcon, href: '/analyse/lists', category: 'navigation' },
    { id: 'nav-profile', title: 'Profil', subtitle: 'Account verwalten', icon: UserCircleIcon, href: '/profile', category: 'settings' },
    { id: 'nav-settings', title: 'Einstellungen', subtitle: 'Konfiguration', icon: Cog6ToothIcon, href: '/settings', category: 'settings' },
    
    { id: 'stock-aapl', title: 'AAPL Analyse', subtitle: 'Apple Inc.', icon: ChartBarIcon, href: '/analyse/stocks/aapl', category: 'navigation' },
    { id: 'stock-tsla', title: 'TSLA Analyse', subtitle: 'Tesla Inc.', icon: ChartBarIcon, href: '/analyse/stocks/tsla', category: 'navigation' },
    { id: 'stock-nvda', title: 'NVDA Analyse', subtitle: 'NVIDIA Corp.', icon: ChartBarIcon, href: '/analyse/stocks/nvda', category: 'navigation' },
    { id: 'stock-msft', title: 'MSFT Analyse', subtitle: 'Microsoft Corp.', icon: ChartBarIcon, href: '/analyse/stocks/msft', category: 'navigation' },
    
    { id: 'action-upgrade', title: 'Premium upgraden', subtitle: 'Alle Features freischalten', icon: SparklesIcon, href: '/pricing', category: 'actions' },
    { id: 'action-support', title: 'Support kontaktieren', subtitle: 'Hilfe erhalten', icon: EnvelopeIcon, action: () => window.location.href = 'mailto:team.finclue@gmail.com', category: 'actions' },
    
    ...(allowsThemeToggle ? [{ 
      id: 'action-theme', 
      title: `${theme === 'dark' ? 'Helles' : 'Dunkles'} Design`, 
      subtitle: 'Theme umschalten', 
      icon: theme === 'dark' ? SunIcon : MoonIcon, 
      action: toggleTheme, 
      category: 'actions' as const
    }] : []),
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]">
      <div className="bg-theme-card border border-theme rounded-lg w-full max-w-lg mx-4 backdrop-blur-sm shadow-2xl">
        
        <div className="p-3 border-b border-theme">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-muted" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Suche nach Aktien, Commands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-theme-secondary border border-theme rounded-md text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 text-sm"
            />
            <button
              onClick={onClose}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0.5 text-theme-muted hover:text-theme-primary rounded transition-colors"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          {Object.entries(groupedCommands).map(([category, commands]) => {
            if (commands.length === 0) return null
            
            const categoryLabels = {
              navigation: 'Navigation',
              actions: 'Aktionen',
              settings: 'Einstellungen'
            }
            
            return (
              <div key={category} className="p-1.5">
                <div className="px-2 py-1 text-xs text-theme-muted font-medium uppercase tracking-wide">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </div>
                {commands.map((command) => {
                  const Icon = command.icon
                  return (
                    <button
                      key={command.id}
                      onClick={() => handleSelect(command)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-theme-secondary transition-all text-left group"
                    >
                      <div className="w-6 h-6 bg-theme-secondary rounded-md flex items-center justify-center group-hover:bg-theme-tertiary transition-colors">
                        <Icon className="w-3 h-3 text-theme-muted group-hover:text-green-400 transition-colors" />
                      </div>
                      <div className="flex-1">
                        <div className="text-theme-primary text-sm font-medium">{command.title}</div>
                        {command.subtitle && (
                          <div className="text-theme-muted text-xs">{command.subtitle}</div>
                        )}
                      </div>
                      <ChevronRightIcon className="w-3 h-3 text-theme-muted group-hover:text-theme-secondary transition-colors" />
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

        <div className="p-2 border-t border-theme flex items-center justify-between text-xs text-theme-muted">
          <div className="flex items-center gap-2">
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

// ===== MAIN LAYOUT COMPONENT =====
function LayoutContent({ children }: LayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const { theme, toggleTheme, allowsThemeToggle } = useTheme()

  const stockMatch = pathname.match(/^\/analyse\/stocks\/([a-zA-Z0-9.-]+)(.*)$/)
  const isStockPage = !!stockMatch
  const currentTicker = stockMatch?.[1]?.toUpperCase() || null

  // Market Status
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

  // Keyboard shortcuts
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

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auth Logic
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

  if (loading) {
    return (
      <div className="h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-theme-secondary text-sm">Loading FinClue...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="h-screen bg-theme-primary flex overflow-hidden">
      {/* Command Palette */}
      <CommandPalette 
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={(href) => router.push(href)}
        theme={theme}
        toggleTheme={toggleTheme}
        allowsThemeToggle={allowsThemeToggle}
      />
      
      {/* Learn Sidebar */}
      <LearnSidebar />
      
      {/* Sidebar - Kompakter */}
      <div className="w-48 bg-theme-secondary border-r border-theme flex flex-col">
        {/* Header - FIX 1: Logo führt zur Homepage */}
        <div className="p-2.5 border-b border-theme">
          <Link href="/" className="flex items-center gap-1.5 group">
            <div className="flex items-end gap-0.5">
              <div className="w-1 h-2.5 bg-green-500 rounded-sm"></div>
              <div className="w-1 h-3 bg-green-500 rounded-sm"></div>
              <div className="w-1 h-4 bg-green-500 rounded-sm"></div>
            </div>
            <span className="text-base font-bold text-theme-primary group-hover:text-green-400 transition-colors">
              FinClue
            </span>
          </Link>
        </div>

        {/* Search & Quick Access */}
        <div className="p-2 border-b border-theme">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="w-full flex items-center gap-2 px-2 py-1.5 bg-theme-tertiary/30 border border-theme rounded-md hover:bg-theme-tertiary/50 hover:border-green-500/30 transition-all duration-200 group"
            title="Suchen (⌘K)"
          >
            <MagnifyingGlassIcon className="w-3 h-3 text-theme-muted group-hover:text-green-400 transition-colors" />
            <span className="text-xs text-theme-muted group-hover:text-theme-secondary transition-colors">
              Suche...
            </span>
            <kbd className="ml-auto px-1 py-0.5 text-xs bg-theme-secondary border border-theme rounded text-theme-muted group-hover:text-theme-secondary transition-colors">
              ⌘K
            </kbd>
          </button>

          <div className="mt-2">
            <div className="text-xs text-theme-muted font-medium mb-1.5 px-0.5">Schnellzugriff</div>
            <div className="grid grid-cols-4 gap-0.5">
              {['AAPL', 'TSLA', 'NVDA', 'MSFT'].map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => handleTickerSelect(ticker)}
                  className="p-1 bg-theme-tertiary/30 hover:bg-theme-tertiary/50 rounded text-xs font-medium text-theme-secondary hover:text-green-400 transition-all duration-200 hover:scale-105"
                  title={`${ticker} analysieren`}
                >
                  {ticker}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation - Kompakter */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <div className="space-y-0.5">
            {NAVIGATION.map((item) => {
              if ('separator' in item && item.separator) {
                return (
                  <div key={item.id} className="h-px bg-theme my-1.5"></div>
                )
              }
              
              if (!('icon' in item) || !('href' in item) || !('label' in item)) {
                return null
              }
              
              const Icon = item.icon
              const isActive = pathname === item.href
              const isPremiumItem = item.premium && !user.isPremium
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`group flex items-center gap-2 px-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : item.id === 'ai'
                        ? 'text-green-400 hover:bg-green-500/10'
                        : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{item.label}</span>
                      {isPremiumItem && <SparklesIcon className="w-2 h-2 text-yellow-400 flex-shrink-0" />}
                    </div>
                    {item.description && (
                      <div className="text-xs text-theme-muted truncate">{item.description}</div>
                    )}
                  </div>
                  {!isActive && (
                    <ArrowRightIcon className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User Footer - FIX 2: Bessere Button Labels */}
        <div className="p-2 border-t border-theme">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="relative">
              <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center text-black font-semibold text-xs">
                {getInitials()}
              </div>
              {user.isPremium && (
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-theme-primary text-xs font-medium truncate">{getDisplayName()}</div>
              <div className="text-xs">
                {user.isPremium ? (
                  <span className="text-green-400 font-medium">Premium</span>
                ) : (
                  <span className="text-theme-muted">Free Plan</span>
                )}
              </div>
            </div>
            
            {allowsThemeToggle && (
              <button
                onClick={toggleTheme}
                className="p-0.5 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <SunIcon className="w-3 h-3" />
                ) : (
                  <MoonIcon className="w-3 h-3" />
                )}
              </button>
            )}
          </div>

          {!user.isPremium && (
            <Link 
              href="/pricing"
              className="flex items-center justify-center gap-1 w-full py-1 bg-green-500 hover:bg-green-400 text-black rounded-md text-xs font-semibold transition-colors mb-1.5"
            >
              <SparklesIcon className="w-3 h-3" />
              Upgrade
            </Link>
          )}

          {/* FIXED BUTTONS - Mit Text Labels */}
          <div className="space-y-1">
            <Link
              href="/"
              className="flex items-center gap-2 w-full p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors text-xs"
              title="Zur Startseite"
            >
              <HomeIcon className="w-3 h-3" />
              <span>Startseite</span>
            </Link>
            
            <button
              onClick={() => window.location.href = 'mailto:team.finclue@gmail.com'}
              className="flex items-center gap-2 w-full p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors text-xs"
              title="Support kontaktieren"
            >
              <EnvelopeIcon className="w-3 h-3" />
              <span>Support</span>
            </button>
            
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full p-1.5 text-theme-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors text-xs"
              title="Abmelden"
            >
              <ArrowLeftOnRectangleIcon className="w-3 h-3" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-theme-primary">
        {/* Top Bar - Kompakter */}
        <div className="h-10 bg-theme-secondary border-b border-theme flex items-center justify-between px-2.5">
          <div className="flex items-center gap-2">
            {isStockPage && currentTicker ? (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 bg-theme-tertiary rounded-md flex items-center justify-center">
                  <span className="text-theme-primary font-bold text-xs">{currentTicker}</span>
                </div>
                <div>
                  <h1 className="text-xs font-semibold text-green-400">{currentTicker}</h1>
                  <div className="text-xs text-theme-secondary">Aktienanalyse</div>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-xs font-semibold text-theme-primary">Dashboard</h1>
                <div className="text-xs text-theme-secondary">Markt-Analyse</div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <GlobalLearnToggle />
            
            {allowsThemeToggle && (
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-2 py-1 bg-theme-tertiary/30 hover:bg-theme-tertiary/50 border border-theme hover:border-green-500/30 rounded-md transition-all duration-200 group"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <SunIcon className="w-3.5 h-3.5 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                ) : (
                  <MoonIcon className="w-3.5 h-3.5 text-blue-600 group-hover:text-blue-500 transition-colors" />
                )}
                <span className="text-xs font-medium text-theme-secondary group-hover:text-theme-primary transition-colors hidden sm:block">
                  {theme === 'dark' ? 'Hell' : 'Dunkel'}
                </span>
              </button>
            )}
            
            <CurrencySelector />
            
            <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 bg-theme-tertiary/30 rounded">
              <SignalIcon className={`w-2 h-2 ${marketStatus.status === 'Open' ? 'text-green-400' : 'text-red-400'}`} />
              <span className={`text-xs font-medium ${marketStatus.status === 'Open' ? 'text-green-400' : 'text-red-400'}`}>
                {marketStatus.status === 'Open' ? 'Offen' : 'Geschlossen'}
              </span>
            </div>

            {!user.isPremium ? (
              <Link 
                href="/pricing"
                className="flex items-center gap-1 px-2 py-1 bg-green-500 hover:bg-green-400 text-black font-semibold rounded text-xs transition-all duration-200"
              >
                <SparklesIcon className="w-2.5 h-2.5" />
                Upgrade
              </Link>
            ) : (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/20 rounded">
                <SparklesIcon className="w-2.5 h-2.5 text-green-400" />
                <span className="text-xs text-green-400 font-medium">Premium</span>
              </div>
            )}
            
            <button
              onClick={() => setShowCommandPalette(true)}
              className="p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors"
              title="Search (⌘K)"
            >
              <MagnifyingGlassIcon className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Stock Analysis Tabs */}
        {isStockPage && currentTicker && (
          <div className="bg-theme-secondary border-b border-theme">
            <div className="px-2.5">
              <nav className="flex space-x-3">
                {STOCK_TABS.map((tab) => {
                  const tabPath = `/analyse/stocks/${currentTicker.toLowerCase()}${tab.href}`
                  const isActive = pathname === tabPath
                  const isPremiumTab = tab.premium && !user.isPremium
                  
                  return (
                    <Link
                      key={tab.id}
                      href={tabPath}
                      className={`flex items-center gap-1 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                        isActive
                          ? 'border-green-500 text-green-400'
                          : isPremiumTab
                            ? 'border-transparent text-theme-muted hover:text-yellow-400'
                            : 'border-transparent text-theme-secondary hover:text-theme-primary hover:border-theme'
                      }`}
                    >
                      {tab.label}
                      {isPremiumTab && <SparklesIcon className="w-2 h-2 text-yellow-400" />}
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

        {/* Status Bar - Kompakter */}
        <div className="h-4 bg-theme-secondary border-t border-theme flex items-center justify-between px-2.5 text-xs text-theme-muted">
          <div className="flex items-center gap-1.5">
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
          <div className="flex items-center gap-1.5">
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
    </div>
  )
}

// Main Export with Providers
export default function ProfessionalLayout({ children }: LayoutProps) {
  const { theme } = useTheme()

  return (
    <html lang="de" className={theme}>
      <head>
        <title>FinClue</title>
        <meta name="description" content="Professional Stock Analysis Platform" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="h-screen bg-theme-primary">
        <CurrencyProvider>
          <LearnModeProvider>
            <LayoutContent>{children}</LayoutContent>
          </LearnModeProvider>
        </CurrencyProvider>
        <Analytics />
      </body>
    </html>
  )
}