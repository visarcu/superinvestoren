// src/app/(terminal)/layout.tsx - CLEAN VERSION MIT ECHTEN DATEN
'use client'

import React, { ReactNode, useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  AcademicCapIcon,
  EyeIcon,
  CalculatorIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  FunnelIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'
import { Analytics } from "@vercel/analytics/next"
import { useTheme } from '@/lib/useTheme'
import { CurrencyProvider, useCurrency } from '@/lib/CurrencyContext'
import { LearnModeProvider, useLearnMode } from '@/lib/LearnModeContext'
import { useExchangeRate } from '@/hooks/useExchangeRate'

import LearnSidebar from '@/components/LearnSidebar'
import NotificationCenter from '@/components/NotificationCenter'
import Logo from '@/components/Logo'
import { stocks } from '@/data/stocks'
import ScoreBadge from '@/components/ScoreBadge'
import DashboardScreenerWidget from '@/components/DashboardScreenerWidget'



interface StockQuote {
  symbol: string
  name: string
  price: number
  changesPercentage: number
  change: number
  dayLow: number
  dayHigh: number
  yearHigh: number
  yearLow: number
  marketCap: number
  priceAvg50: number
  priceAvg200: number
  exchange: string
  volume: number
  avgVolume: number
  open: number
  previousClose: number
  eps: number
  pe: number
  earningsAnnouncement: string
  sharesOutstanding: number
  timestamp: number
}

interface CompanyProfile {
  symbol: string
  companyName: string
  exchange: string
  industry: string
  sector: string
  country: string
  description: string
  ceo: string
  employees: number
  city: string
  state: string
  zip: string
  dcfDiff: number
  dcf: number
  image: string
  ipoDate: string
  defaultImage: boolean
  isEtf: boolean
  isActivelyTrading: boolean
  isAdr: boolean
  isFund: boolean
}

// ===== HOOKS =====
function useStockData(ticker: string | null) {
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ticker) {
      setQuote(null)
      setProfile(null)
      return
    }

    let mounted = true

    async function fetchStockData() {
      setLoading(true)
      setError(null)

      try {
        // Fetch Quote
        const quoteResponse = await fetch(`/api/quote/${ticker}`)
        if (!quoteResponse.ok) throw new Error('Quote fetch failed')
        const quoteData = await quoteResponse.json()
        
        // Fetch Company Profile
        const profileResponse = await fetch(`/api/company-profile/${ticker}`)
        if (!profileResponse.ok) throw new Error('Profile fetch failed')
        const profileData = await profileResponse.json()

        if (mounted) {
          setQuote(quoteData[0] || null)
          setProfile(profileData[0] || null)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          console.error('Error fetching stock data:', err)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchStockData()

    return () => {
      mounted = false
    }
  }, [ticker])

  return { quote, profile, loading, error }
}

// ===== MEMOIZED COMPONENTS =====
const GlobalLearnToggle = React.memo(() => {
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
})

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

// ===== NAVIGATION STRUKTUR =====
interface NavCategory {
  id: string
  label: string
  items: NavigationItem[]
}

interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  premium?: boolean
  comingSoon?: boolean
}

// NAVIGATION CATEGORIES - MEMOIZED
const NAVIGATION_CATEGORIES: NavCategory[] = [
  {
    id: 'analysis',
    label: 'ANALYSE & ÜBERSICHT',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: HomeIcon,
        href: '/analyse'
      },
      {
        id: 'compare',
        label: 'Aktien-Vergleich',
        icon: ChartBarIcon,
        href: '/analyse/compare'
      },
      {
        id: 'watchlist',
        label: 'Watchlist',
        icon: BookmarkIcon,
        href: '/analyse/watchlist'
      },
      {
        id: 'heatmap',
        label: 'Heatmap',
        icon: MapIcon,
        href: '/analyse/heatmap'
      },
      {
        id: 'earnings',
        label: 'Earnings Kalender',
        icon: CalendarIcon,
        href: '/analyse/earnings'
      }
    ]
  },
  {
    id: 'portfolio-tools',
    label: 'PORTFOLIO & TOOLS',
    items: [
      {
        id: 'portfolio',
        label: 'Portfolio',
        icon: BriefcaseIcon,
        href: '/analyse/portfolio'
      },
      {
        id: 'screener',
        label: 'Aktien Screener',
        icon: FunnelIcon,
        href: '/analyse/screener'
      },
      {
        id: 'etf-screener',
        label: 'ETF Screener',
        icon: ChartBarIcon,
        href: '/analyse/etf-screener'
      },
      {
        id: 'dcf-calculator',
        label: 'DCF Calculator',
        icon: CalculatorIcon,
        href: '/analyse/dcf',
        premium: true
      },
      {
        id: 'insider',
        label: 'Insider Trading',
        icon: EyeIcon,
        href: '/analyse/insider'
      }
    ]
  },
  {
    id: 'data-lists',
    label: 'LISTEN',
    items: [
      {
        id: 'stock-lists',
        label: 'Aktien Listen',
        icon: ListBulletIcon,
        href: '/analyse/lists'
      }
    ]
  },
  {
    id: 'premium',
    label: 'PREMIUM FEATURES',
    items: [
      {
        id: 'ai',
        label: 'FinClue AI',
        icon: SparklesIcon,
        href: '/analyse/finclue-ai',
        premium: true
      }
    ]
  },
  {
    id: 'account',
    label: 'ACCOUNT',
    items: [
      {
        id: 'notifications',
        label: 'Benachrichtigungen',
        icon: BellIcon,
        href: '/notifications'
      },
      {
        id: 'profile',
        label: 'Profil',
        icon: UserCircleIcon,
        href: '/profile'
      },
      {
        id: 'settings',
        label: 'Einstellungen',
        icon: Cog6ToothIcon,
        href: '/settings'
      }
    ]
  }
]

// Stock Analysis Tabs
interface StockTab {
  id: string
  label: string
  href: string
  premium?: boolean
}

const STOCK_TABS: StockTab[] = [
  { id: 'overview', label: 'Überblick', href: '' },
  { id: 'financials', label: 'Finanzen', href: '/financials' },
  { id: 'ratings', label: 'Rating', href: '/ratings' }, // NEU!
  { id: 'growth', label: 'Wachstum', href: '/growth' },
  { id: 'quartalszahlen', label: 'Quartalszahlen', href: '/earnings' },
  { id: 'estimates', label: 'Schätzungen', href: '/estimates' },
  { id: 'super-investors', label: 'Super-Investoren', href: '/super-investors' },
  { id: 'valuation', label: 'Bewertung', href: '/valuation' },
  { id: 'dividends', label: 'Dividende', href: '/dividends' },
  { id: 'insider', label: 'Insider Trading', href: '/insider' },
  { id: 'news', label: 'News', href: '/news' }
]

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface LayoutProps {
  children: ReactNode
}

// Diese Funktionen werden jetzt durch CurrencyContext ersetzt
// Siehe formatPrice, formatPercentage, formatMarketCap unten in der LayoutContent Komponente

// KATEGORISIERTE NAVIGATION - MEMOIZED
const CategorizedNavigation = React.memo(({ user, pathname }: { user: User, pathname: string }) => {
  return (
    <nav className="flex-1 p-2 overflow-y-auto">
      <div className="space-y-3">
        {NAVIGATION_CATEGORIES.map((category) => (
          <div key={category.id} className="space-y-1">
            <div className="px-2 py-1">
              <h3 className="text-xs font-bold text-theme-muted uppercase tracking-wider">
                {category.label}
              </h3>
            </div>
            
            <div className="space-y-0.5">
              {category.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                const isPremiumItem = item.premium && !user.isPremium
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-green-500/20 text-green-400 shadow-sm ring-1 ring-green-500/30' 
                        : category.id === 'premium'
                          ? 'text-green-400 hover:bg-green-500/10 hover:text-green-300'
                          : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary/60'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      isActive 
                        ? 'bg-green-500/30' 
                        : 'bg-theme-tertiary/40 group-hover:bg-theme-tertiary/60'
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${
                        isActive 
                          ? 'text-green-300' 
                          : category.id === 'premium'
                            ? 'text-green-400'
                            : 'text-theme-muted group-hover:text-theme-primary'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{item.label}</span>
                        {isPremiumItem && (
                          <SparklesIcon className="w-2.5 h-2.5 text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                    
                    {!isActive && (
                      <ArrowRightIcon className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-all duration-200 flex-shrink-0" />
                    )}
                    
                    {isActive && (
                      <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  )
})

// COMMAND PALETTE - MEMOIZED
const CommandPalette = React.memo(({ 
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
}) => {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // MEMOIZED COMMANDS mit Stock Search
  const commands: CommandPaletteItem[] = useMemo(() => {
    const baseCommands = [
      { id: 'nav-dashboard', title: 'Dashboard', subtitle: 'Marktübersicht', icon: HomeIcon, href: '/analyse', category: 'navigation' },
      { id: 'nav-watchlist', title: 'Watchlist', subtitle: 'Gespeicherte Aktien', icon: BookmarkIcon, href: '/analyse/watchlist', category: 'navigation' },
      { id: 'nav-notifications', title: 'Benachrichtigungen', subtitle: 'E-Mail Einstellungen', icon: BellIcon, href: '/notifications', category: 'settings' },
      { id: 'nav-dcf', title: 'DCF Calculator', subtitle: 'Aktien bewerten', icon: CalculatorIcon, href: '/analyse/dcf', category: 'navigation' },
      { id: 'nav-insider', title: 'Insider Trading', subtitle: 'Aktuelle Insider-Aktivitäten', icon: EyeIcon, href: '/analyse/insider', category: 'navigation' },
      { id: 'nav-heatmap', title: 'Heatmap', subtitle: 'Visuelle Marktansicht', icon: MapIcon, href: '/analyse/heatmap', category: 'navigation' },
      { id: 'nav-earnings', title: 'Earnings Calendar', subtitle: 'Anstehende Termine', icon: CalendarIcon, href: '/analyse/earnings', category: 'navigation' },
      { id: 'nav-ai', title: 'FinClue AI', subtitle: 'KI-gestützte Analyse', icon: SparklesIcon, href: '/analyse/finclue-ai', category: 'navigation' },
      { id: 'nav-lists', title: 'Aktien Listen', subtitle: 'Kuratierte Listen', icon: ListBulletIcon, href: '/analyse/lists', category: 'navigation' },
      { id: 'nav-profile', title: 'Profil', subtitle: 'Account verwalten', icon: UserCircleIcon, href: '/profile', category: 'settings' },
      { id: 'nav-settings', title: 'Einstellungen', subtitle: 'Konfiguration', icon: Cog6ToothIcon, href: '/settings', category: 'settings' },
      
      { id: 'action-upgrade', title: 'Premium upgraden', subtitle: 'Alle Features freischalten', icon: SparklesIcon, href: '/pricing', category: 'actions' },
      { id: 'action-support', title: 'Support kontaktieren', subtitle: 'Hilfe erhalten', icon: EnvelopeIcon, action: () => window.location.href = 'mailto:team@finclue.de', category: 'actions' },
    ] as CommandPaletteItem[]
    
    // Add theme toggle if available
    if (allowsThemeToggle) {
      baseCommands.push({
        id: 'action-theme', 
        title: `${theme === 'dark' ? 'Helles' : 'Dunkles'} Design`, 
        subtitle: 'Theme umschalten', 
        icon: theme === 'dark' ? SunIcon : MoonIcon, 
        action: toggleTheme, 
        category: 'actions'
      })
    }
    
    // Add stock search results
    const searchTerm = query.toUpperCase()
    if (searchTerm.length > 0) {
      const matchingStocks = stocks.filter(stock => 
        stock.ticker.includes(searchTerm) || 
        stock.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8) // Limit to 8 results
      
      const stockCommands = matchingStocks.map(stock => ({
        id: `stock-${stock.ticker}`,
        title: `${stock.ticker} - ${stock.name}`,
        subtitle: `${stock.sector} • Aktienanalyse öffnen`,
        icon: ChartBarIcon,
        href: `/analyse/stocks/${stock.ticker.toLowerCase()}`,
        category: 'navigation' as const
      }))
      
      return [...stockCommands, ...baseCommands]
    }
    
    return baseCommands
  }, [theme, toggleTheme, allowsThemeToggle, query])

  // MEMOIZED FILTERED COMMANDS
  const filteredCommands = useMemo(() => 
    commands.filter(cmd => 
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.subtitle?.toLowerCase().includes(query.toLowerCase())
    ), [commands, query]
  )

  // MEMOIZED GROUPED COMMANDS with stocks
  const groupedCommands = useMemo(() => {
    const stocks = filteredCommands.filter(cmd => cmd.id.startsWith('stock-'))
    const navigation = filteredCommands.filter(cmd => cmd.category === 'navigation' && !cmd.id.startsWith('stock-'))
    const actions = filteredCommands.filter(cmd => cmd.category === 'actions')
    const settings = filteredCommands.filter(cmd => cmd.category === 'settings')
    
    return { stocks, navigation, actions, settings }
  }, [filteredCommands])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = useCallback((command: CommandPaletteItem) => {
    if (command.href) {
      onNavigate(command.href)
    } else if (command.action) {
      command.action()
    }
    onClose()
  }, [onNavigate, onClose])

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
              placeholder="Nach Aktien suchen oder AI-Frage stellen..."
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
          {/* AI Quick Action - Immer oben wenn Query vorhanden */}
          {query.length > 3 && (
            <div className="p-1.5 border-b border-theme">
              <div className="px-2 py-1 text-xs text-theme-muted font-medium uppercase tracking-wide">
                AI ASSISTENT
              </div>
              <button
                onClick={() => handleSelect({ 
                  id: 'ai-query', 
                  title: `"${query}" mit FinClue AI analysieren`, 
                  subtitle: 'Premium Feature', 
                  icon: SparklesIcon, 
                  href: `/analyse/finclue-ai?query=${encodeURIComponent(query)}`, 
                  category: 'actions' 
                })}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-green-500/10 transition-all text-left group"
              >
                <div className="w-6 h-6 bg-green-500/20 rounded-md flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                  <SparklesIcon className="w-3 h-3 text-green-400 group-hover:text-green-300 transition-colors" />
                </div>
                <div className="flex-1">
                  <div className="text-theme-primary text-sm font-medium">"{query}" mit AI analysieren</div>
                  <div className="text-green-400 text-xs">Premium Feature</div>
                </div>
                <ChevronRightIcon className="w-3 h-3 text-theme-muted group-hover:text-green-400 transition-colors" />
              </button>
            </div>
          )}
          
          {Object.entries(groupedCommands).map(([category, commands]) => {
            if (commands.length === 0) return null
            
            const categoryLabels = {
              stocks: 'Aktien',
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
                  const isStock = command.id.startsWith('stock-')
                  return (
                    <button
                      key={command.id}
                      onClick={() => handleSelect(command)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-md transition-all text-left group ${
                        isStock 
                          ? 'hover:bg-green-500/10 hover:border-green-500/20' 
                          : 'hover:bg-theme-secondary'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                        isStock
                          ? 'bg-green-500/20 group-hover:bg-green-500/30'
                          : 'bg-theme-secondary group-hover:bg-theme-tertiary'
                      }`}>
                        <Icon className={`w-3 h-3 transition-colors ${
                          isStock
                            ? 'text-green-400 group-hover:text-green-300'
                            : 'text-theme-muted group-hover:text-green-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-theme-primary text-sm font-medium">{command.title}</div>
                        {command.subtitle && (
                          <div className={`text-xs ${isStock ? 'text-green-400/80' : 'text-theme-muted'}`}>{command.subtitle}</div>
                        )}
                      </div>
                      <ChevronRightIcon className={`w-3 h-3 transition-colors ${
                        isStock 
                          ? 'text-theme-muted group-hover:text-green-400' 
                          : 'text-theme-muted group-hover:text-theme-secondary'
                      }`} />
                    </button>
                  )
                })}
              </div>
            )
          })}
          
          {filteredCommands.length === 0 && query.length <= 3 && (
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
})

// OPTIMIZED MARKET STATUS - CACHED
const getMarketStatus = (() => {
  let lastCheck = 0
  let cachedStatus = { status: 'Closed', reason: 'Weekend' }
  
  return () => {
    const now = Date.now()
    // Cache für 30 Sekunden
    if (now - lastCheck < 30000) {
      return cachedStatus
    }
    
    lastCheck = now
    const estTime = new Date(new Date().toLocaleString("en-US", {timeZone: "America/New_York"}))
    const day = estTime.getDay()
    const hour = estTime.getHours()
    const minute = estTime.getMinutes()
    const currentMinutes = hour * 60 + minute
    
    if (day === 0 || day === 6) {
      cachedStatus = { status: 'Closed', reason: 'Weekend' }
    } else {
      const marketOpen = 9 * 60 + 30
      const marketClose = 16 * 60
      
      if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
        cachedStatus = { status: 'Open', reason: '' }
      } else {
        cachedStatus = { status: 'Closed', reason: 'After Hours' }
      }
    }
    
    return cachedStatus
  }
})()

// MAIN LAYOUT COMPONENT
function LayoutContent({ children }: LayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const { theme, toggleTheme, allowsThemeToggle } = useTheme()
  const { formatStockPrice, formatPercentage, formatMarketCap } = useCurrency()
  const { formatPriceWithExchangeInfo } = useExchangeRate('USD', 'EUR')

  // ===== UTILITY FUNCTIONS - Mit CurrencyContext =====
  const formatPrice = (price: number): string => {
    return formatStockPrice(price) // Deutsche Formatierung mit Komma: z.B. 0,49 $
  }

  const formatPercentageWithSign = (percentage: number): string => {
    return formatPercentage(percentage, true) // showSign = true für +/- Vorzeichen
  }

  // MEMOIZED STOCK PAGE CALCULATION
  const { isStockPage, currentTicker } = useMemo(() => {
    const stockMatch = pathname.match(/^\/analyse\/stocks\/([a-zA-Z0-9.-]+)(.*)$/)
    return {
      isStockPage: !!stockMatch,
      currentTicker: stockMatch?.[1]?.toUpperCase() || null
    }
  }, [pathname])

  // STOCK DATA HOOK
  const { quote, profile, loading: stockLoading, error: stockError } = useStockData(currentTicker)

  // MEMOIZED MARKET STATUS
  const marketStatus = useMemo(() => getMarketStatus(), [currentTime])

  // OPTIMIZED KEYBOARD SHORTCUTS
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

  // OPTIMIZED LIVE CLOCK - Nur alle 10 Sekunden statt jede Sekunde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 10000) // 10 Sekunden statt 1 Sekunde
    return () => clearInterval(timer)
  }, [])

  // OPTIMIZED AUTH LOGIC - Weniger frequent checks
  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          if (mounted) router.push('/auth/signin')
          return
        }

        // Cache Profile Check
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

    // WENIGER FREQUENT AUTH STATE CHANGES
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

  // MEMOIZED CALLBACKS
  const handleTickerSelect = useCallback((ticker: string) => {
    router.push(`/analyse/stocks/${ticker.toLowerCase()}`)
  }, [router])

  const getInitials = useCallback(() => {
    if (!user?.email) return 'U'
    return user.email.charAt(0).toUpperCase()
  }, [user?.email])

  const getDisplayName = useCallback(() => {
    if (!user?.email) return 'User'
    return user.email.split('@')[0]
  }, [user?.email])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/')
  }, [router])

  const handleNavigate = useCallback((href: string) => {
    router.push(href)
  }, [router])

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
      <CommandPalette 
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onNavigate={handleNavigate}
        theme={theme}
        toggleTheme={toggleTheme}
        allowsThemeToggle={allowsThemeToggle}
      />
      
      <LearnSidebar />
      
      {/* SIDEBAR */}
      <div className="w-48 bg-theme-secondary border-r border-theme flex flex-col">
        <div className="p-3 border-b border-theme">
          <Link href="/" className="flex items-center gap-2 group">
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


        <CategorizedNavigation user={user} pathname={pathname} />

        <div className="p-3 border-t border-theme">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative">
              <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center text-black font-semibold text-sm">
                {getInitials()}
              </div>
              {user.isPremium && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
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
            
            {allowsThemeToggle && (
              <button
                onClick={toggleTheme}
                className="p-1 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <SunIcon className="w-4 h-4" />
                ) : (
                  <MoonIcon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {!user.isPremium && (
            <Link 
              href="/pricing"
              className="flex items-center justify-center gap-2 w-full py-2 bg-green-500 hover:bg-green-400 text-black rounded-lg text-sm font-semibold transition-colors mb-2"
            >
              <SparklesIcon className="w-4 h-4" />
              Upgrade
            </Link>
          )}

          <div className="space-y-0.5">
            <Link
              href="/"
              className="flex items-center gap-2 w-full p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded-lg transition-colors text-sm"
              title="Zur Startseite"
            >
              <HomeIcon className="w-4 h-4" />
              <span>Startseite</span>
            </Link>
            
            <button
              onClick={() => window.location.href = 'mailto:team@finclue.de'}
              className="flex items-center gap-2 w-full p-1.5 text-theme-muted hover:text-theme-primary hover:bg-theme-tertiary/50 rounded-lg transition-colors text-sm"
              title="Support kontaktieren"
            >
              <EnvelopeIcon className="w-4 h-4" />
              <span>Support</span>
            </button>
            
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 w-full p-1.5 text-theme-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
              title="Abmelden"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col bg-theme-primary">
        {/* TOP BAR - MIT PROMINENT SEARCH */}
        <div className="pt-4 pb-4 bg-theme-secondary border-b border-theme flex items-center px-6 shadow-sm">
          <div className="flex items-center gap-6 flex-1">
            {/* Dashboard-Anzeige nur wenn NICHT auf Stock-Seite */}
            {!isStockPage && (
              <div className="flex-shrink-0">
                <h1 className="text-lg font-bold text-theme-primary">Dashboard</h1>
                <div className="text-xs text-theme-secondary">Markt-Analyse</div>
              </div>
            )}
            
            {/* Prominent Search Bar - wie Fiscal */}
            <div className="flex-1 max-w-3xl">
              <button
                onClick={() => setShowCommandPalette(true)}
                className="w-full flex items-center gap-3 px-6 py-4 bg-theme-primary/60 hover:bg-theme-primary/80 border border-theme/40 hover:border-green-500/60 rounded-2xl transition-all duration-300 group shadow-md hover:shadow-lg backdrop-blur-sm"
                title="Aktien suchen oder AI-Frage stellen (⌘K)"
              >
                <MagnifyingGlassIcon className="w-5 h-5 text-theme-muted/80 group-hover:text-green-400 transition-all duration-300 flex-shrink-0" />
                <span className="text-base text-theme-secondary/90 group-hover:text-theme-primary transition-all duration-300 flex-1 text-left font-medium">
                  Aktien suchen oder AI-Frage stellen...
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <SparklesIcon className="w-4 h-4 text-green-400/60 group-hover:text-green-400 transition-all duration-300" />
                  <kbd className="px-2.5 py-1.5 text-xs bg-theme-tertiary/40 border border-theme/50 rounded-md text-theme-muted group-hover:text-theme-secondary transition-all duration-300 font-mono shadow-sm">
                    ⌘K
                  </kbd>
                </div>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            <GlobalLearnToggle />
            <NotificationCenter />
            
         {/*   <CurrencySelector /> */}
            
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-theme-tertiary/30 rounded-lg">
              <SignalIcon className={`w-3 h-3 ${marketStatus.status === 'Open' ? 'text-green-400' : 'text-red-400'}`} />
              <span className={`text-xs font-medium ${marketStatus.status === 'Open' ? 'text-green-400' : 'text-red-400'}`}>
                {marketStatus.status === 'Open' ? 'Markt offen' : 'Markt geschlossen'}
              </span>
            </div>

            {!user.isPremium ? (
              <Link 
                href="/pricing"
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg text-sm transition-all duration-200 shadow-sm"
              >
                <SparklesIcon className="w-4 h-4" />
                Upgrade
              </Link>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                <SparklesIcon className="w-3.5 h-3.5 text-green-400" />
                <span className="text-sm text-green-400 font-semibold">Premium</span>
              </div>
            )}
          </div>
        </div>

        {/* STOCK HEADER - KOMPAKT & CLEAN MIT ECHTEN DATEN */}
        {isStockPage && currentTicker && (
          <div className="bg-theme-primary px-6 py-4">
            <div className="bg-theme-card rounded-xl shadow-lg border border-theme/10 overflow-hidden">
              
              {/* Header Section - Mit echten Daten */}
              <div className="px-6 py-5">
                {stockLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-theme-secondary">Lade Aktien-Daten...</span>
                  </div>
                ) : stockError ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="text-red-400 font-medium">Fehler beim Laden der Daten</div>
                      <div className="text-theme-muted text-sm mt-1">{stockError}</div>
                    </div>
                  </div>
                ) : quote && profile ? (
                  <div className="flex items-center justify-between">
                    {/* Linke Seite - Logo & Info */}
                    <div className="flex items-center gap-4">
                      {/* Company Logo */}
                      <div className="w-14 h-14 bg-white rounded-xl p-2 shadow-md border border-theme/5">
                        <Logo 
                          ticker={currentTicker}
                          alt={`${currentTicker} Logo`}
                          className="w-full h-full"
                          padding="none"
                        />
                      </div>
                      
                      {/* Company Info - Mit echten Daten */}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h1 className="text-2xl font-bold text-theme-primary">
                            {quote.symbol}
                          </h1>
                          <span className="px-2.5 py-0.5 bg-theme-secondary text-theme-muted text-xs font-medium rounded">
                            {profile.exchange || quote.exchange}
                          </span>
                        </div>
                        <p className="text-sm text-theme-secondary">
                          {profile.companyName} • {profile.industry}
                        </p>
                      </div>
                    </div>
                    
                    {/* Rechte Seite - Stats kompakt nebeneinander */}
                    <div className="flex items-center gap-4">
                      {/* Kurs */}
                      <div className="text-right">
                        <div className="text-xs text-theme-muted uppercase tracking-wide">Kurs</div>
                        <div className="text-xl font-bold text-theme-primary">
                          {formatPrice(quote.price)}
                        </div>
                        {(() => {
                          const { equivalent } = formatPriceWithExchangeInfo(quote.price)
                          return equivalent ? (
                            <div className="text-xs text-theme-muted mt-1">
                              {equivalent}
                            </div>
                          ) : null
                        })()}
                      </div>
                      
                      {/* Divider */}
                      <div className="h-10 w-px bg-theme/20"></div>
                      
                      {/* Performance */}
                      <div className="flex items-center gap-2">
                        {quote.changesPercentage >= 0 ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                        )}
                        <div>
                          <div className="text-xs text-theme-muted uppercase tracking-wide">Heute</div>
                          <div className={`text-xl font-bold ${quote.changesPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatPercentageWithSign(quote.changesPercentage)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Divider */}
                      <div className="h-10 w-px bg-theme/20"></div>
                      
                      {/* Marktkapitalisierung */}
                      <div className="text-right">
                        <div className="text-xs text-theme-muted uppercase tracking-wide">Marktk.</div>
                        <div className="text-lg font-bold text-theme-primary">
                          {formatMarketCap(quote.marketCap)}
                        </div>
                      </div>
                      
                      {/* Divider */}
                      <div className="h-10 w-px bg-theme/20"></div>
                      
                         {/* Score Badge hinzufügen */}
    <ScoreBadge ticker={currentTicker} />

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Watchlist Button */}
                        <button className="p-2 text-theme-secondary hover:text-green-400 hover:bg-theme-secondary/50 rounded-lg transition-all">
                          <BookmarkIcon className="w-5 h-5" />
                        </button>
                        
                        {/* Share Button */}
                        <button className="p-2 text-theme-secondary hover:text-green-400 hover:bg-theme-secondary/50 rounded-lg transition-all">
                          <ChartBarIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="text-theme-muted">Keine Daten verfügbar</div>
                      <div className="text-theme-muted text-sm mt-1">für {currentTicker}</div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Navigation Tabs */}
              <div className="bg-theme-secondary/5 border-t border-theme/10">
                <div className="px-6">
                  <nav className="flex items-center gap-1">
                    {STOCK_TABS.map((tab) => {
                      const tabPath = `/analyse/stocks/${currentTicker.toLowerCase()}${tab.href}`
                      const isActive = pathname === tabPath
                      const isPremiumTab = tab.premium && !user.isPremium
                      
                      return (
                        <Link
                          key={tab.id}
                          href={tabPath}
                          className={`
                            relative px-4 py-4 text-sm font-medium transition-all duration-200
                            ${isActive
                              ? 'text-theme-primary'
                              : isPremiumTab
                                ? 'text-theme-muted/60 hover:text-yellow-400'
                                : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-secondary/5'
                            }
                          `}
                        >
                          <span className="flex items-center gap-1.5">
                            {tab.label}
                            {isPremiumTab && (
                              <SparklesIcon className="w-3 h-3 text-yellow-400" />
                            )}
                          </span>
                          
                          {isActive && (
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-green-500"></div>
                          )}
                        </Link>
                      )
                    })}
                    
                    {/* Premium Upgrade als Tab ganz rechts */}
                    {!user.isPremium && (
                      <Link 
                        href="/pricing"
                        className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        <span>Upgrade</span>
                      </Link>
                    )}
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      
        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-auto bg-theme-primary">
          {children}
        </div>

        {/* FOOTER STATUS BAR */}
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

// Export with Providers - OPTIMIERT
export default function TerminalLayout({ children }: LayoutProps) {
  return (
    <CurrencyProvider>
      <LearnModeProvider>
        <LayoutContent>{children}</LayoutContent>
      </LearnModeProvider>
    </CurrencyProvider>
  )
}