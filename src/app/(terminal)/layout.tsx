// src/app/(terminal)/layout.tsx - FISCAL.AI STYLE COLLAPSED SIDEBAR
'use client'

import React, { ReactNode, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  ChartBarIcon,
  BookmarkIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  BriefcaseIcon,
  SparklesIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  ChevronRightIcon,
  XMarkIcon,
  SignalIcon,
  SunIcon,
  MoonIcon,
  HomeIcon,
  AcademicCapIcon,
  EyeIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InboxIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/useTheme'
import { CurrencyProvider, useCurrency } from '@/lib/CurrencyContext'
import { LearnModeProvider, useLearnMode } from '@/lib/LearnModeContext'
import { useExchangeRate } from '@/hooks/useExchangeRate'

import LearnSidebar from '@/components/LearnSidebar'
import MobileNav from '@/components/MobileNav'
import Sidebar from '@/components/layout/Sidebar'
import Logo from '@/components/Logo'
import { ProductTour } from '@/components/tour/ProductTour'
import { stocks } from '@/data/stocks'
import { searchETFs } from '@/lib/etfUtils'
import ScoreBadge from '@/components/ScoreBadge'

// ===== INTERFACES =====
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

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface LayoutProps {
  children: ReactNode
}

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href: string
  premium?: boolean
  isNew?: boolean
}

interface CommandPaletteItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  href?: string
  action?: () => void
  category: 'navigation' | 'actions' | 'settings'
}

// ===== NAVIGATION ITEMS =====
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, href: '/analyse' },
  { id: 'compare', label: 'Vergleich', icon: ChartBarIcon, href: '/analyse/compare' },
  { id: 'portfolio', label: 'Portfolio', icon: BriefcaseIcon, href: '/analyse/portfolio/dashboard' },
  { id: 'watchlist', label: 'Watchlist', icon: BookmarkIcon, href: '/analyse/watchlist' },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon, href: '/analyse/calendar' },
  { id: 'dividends', label: 'Dividenden', icon: CurrencyDollarIcon, href: '/analyse/dividends' },
  { id: 'finder', label: 'Finder', icon: SparklesIcon, href: '/analyse/finder' },
  { id: 'inbox', label: 'Inbox', icon: InboxIcon, href: '/inbox' },
  { id: 'dcf', label: 'DCF', icon: CalculatorIcon, href: '/analyse/dcf', premium: true },
  { id: 'analyst-ratings', label: 'Analyst Ratings', icon: ArrowTrendingUpIcon, href: '/analyse/analyst-ratings' },
  { id: 'insider', label: 'Insider', icon: EyeIcon, href: '/analyse/insider' },
  { id: 'ai', label: 'AI', icon: SparklesIcon, href: '/analyse/finclue-ai', premium: true },
]

const SETTINGS_ITEMS: NavItem[] = [
  { id: 'notifications', label: 'Benachrichtigungen', icon: BellIcon, href: '/inbox' },
  { id: 'profile', label: 'Profil', icon: UserCircleIcon, href: '/profile' },
  { id: 'settings', label: 'Einstellungen', icon: Cog6ToothIcon, href: '/settings' },
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
  { id: 'ratings', label: 'Rating', href: '/ratings' },
  { id: 'growth', label: 'Wachstum', href: '/growth' },
  { id: 'quartalszahlen', label: 'Quartalszahlen', href: '/earnings' },
  { id: 'estimates', label: 'Schätzungen', href: '/estimates' },
  { id: 'super-investors', label: 'Super-Investoren', href: '/super-investors' },
  { id: 'valuation', label: 'Bewertung', href: '/valuation' },
  { id: 'dividends', label: 'Dividende', href: '/dividends' },
  { id: 'insider', label: 'Insider Trading', href: '/insider' },
  { id: 'politiker', label: 'Politiker', href: '/politiker' },
  { id: 'news', label: 'News', href: '/news' }
]

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
        const quoteResponse = await fetch(`/api/quote/${ticker}`)
        if (!quoteResponse.ok) throw new Error('Quote fetch failed')
        const quoteData = await quoteResponse.json()
        
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
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchStockData()
    return () => { mounted = false }
  }, [ticker])

  return { quote, profile, loading, error }
}

// ===== COMPONENTS =====
const GlobalLearnToggle = React.memo(() => {
  const { isLearnMode, toggleLearnMode } = useLearnMode()
  
  return (
    <button
      onClick={toggleLearnMode}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-all duration-200 text-xs font-medium
        ${isLearnMode 
          ? 'bg-brand/20 border-green-500/40 text-brand-light shadow-sm' 
          : 'bg-theme-tertiary/30 border-white/[0.06] text-theme-muted hover:text-theme-primary hover:border-green-500/30'
        }
      `}
      title={`Lern-Modus ${isLearnMode ? 'deaktivieren' : 'aktivieren'}`}
    >
      <AcademicCapIcon className={`w-3.5 h-3.5 ${isLearnMode ? 'text-brand-light' : 'text-theme-muted'}`} />
      <span className="hidden sm:block">Lernen</span>
      <div className={`relative w-6 h-3 rounded-full transition-all duration-200 ${isLearnMode ? 'bg-brand' : 'bg-theme-tertiary'}`}>
        <div className={`absolute top-0.5 w-2 h-2 bg-white rounded-full transition-all duration-200 shadow-sm ${isLearnMode ? 'left-3' : 'left-0.5'}`}></div>
      </div>
    </button>
  )
})

// COMMAND PALETTE
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
  const [apiResults, setApiResults] = useState<Array<{ ticker: string; name: string; exchange?: string; type?: 'stock' | 'etf' }>>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced live search via /api/v1/search-instruments
  // (kennt etfMaster + xetraETFs + lokale stocks + SEC + FMP-Fallback +
  // OpenFIGI für ISIN/WKN). Ergänzt die lokale Suche um internationale
  // Wertpapiere (z.B. Vulcan Energy / VUL.AX) und ISIN/WKN-Lookups.
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setApiResults([])
      return
    }
    const trimmed = query.trim()
    const isLong = trimmed.length >= 6
    const delay = isLong ? 220 : 150
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search-instruments?q=${encodeURIComponent(trimmed)}&limit=8`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled) setApiResults(data.data || [])
      } catch {
        /* ignore */
      }
    }, delay)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query])

  const commands: CommandPaletteItem[] = useMemo(() => {
    const baseCommands = [
      { id: 'nav-dashboard', title: 'Dashboard', subtitle: 'Marktübersicht', icon: HomeIcon, href: '/analyse', category: 'navigation' },
      { id: 'nav-watchlist', title: 'Watchlist', subtitle: 'Gespeicherte Aktien', icon: BookmarkIcon, href: '/analyse/watchlist', category: 'navigation' },
      { id: 'nav-notifications', title: 'Benachrichtigungen', subtitle: 'E-Mail Einstellungen', icon: BellIcon, href: '/inbox', category: 'settings' },
      { id: 'nav-dcf', title: 'DCF Calculator', subtitle: 'Aktien bewerten', icon: CalculatorIcon, href: '/analyse/dcf', category: 'navigation' },
      { id: 'nav-insider', title: 'Insider Trading', subtitle: 'Aktuelle Insider-Aktivitäten', icon: EyeIcon, href: '/analyse/insider', category: 'navigation' },
      { id: 'nav-earnings', title: 'Earnings Calendar', subtitle: 'Anstehende Termine', icon: CalendarIcon, href: '/analyse/earnings', category: 'navigation' },
      { id: 'nav-dividends', title: 'Dividenden Calendar', subtitle: 'Dividenden-Termine', icon: CurrencyDollarIcon, href: '/analyse/dividends', category: 'navigation' },
      { id: 'nav-ai', title: 'Finclue AI', subtitle: 'KI-gestützte Analyse', icon: SparklesIcon, href: '/analyse/finclue-ai', category: 'navigation' },
      { id: 'nav-profile', title: 'Profil', subtitle: 'Account verwalten', icon: UserCircleIcon, href: '/profile', category: 'settings' },
      { id: 'nav-settings', title: 'Einstellungen', subtitle: 'Konfiguration', icon: Cog6ToothIcon, href: '/settings', category: 'settings' },
      { id: 'action-upgrade', title: 'Premium upgraden', subtitle: 'Alle Features freischalten', icon: SparklesIcon, href: '/pricing', category: 'actions' },
      { id: 'action-support', title: 'Support kontaktieren', subtitle: 'Hilfe erhalten', icon: EnvelopeIcon, action: () => window.location.href = 'mailto:team@finclue.de', category: 'actions' },
    ] as CommandPaletteItem[]
    
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
    
    const searchTerm = query.toUpperCase()
    if (searchTerm.length > 0) {
      // Aktien durchsuchen
      const q = query.toLowerCase()
      const matchingStocks = stocks
        .filter(stock =>
          stock.ticker.includes(searchTerm) ||
          stock.name.toLowerCase().includes(q)
        )
        .sort((a, b) => {
          const score = (s: typeof a) =>
            s.ticker === searchTerm ? 0
            : s.ticker.startsWith(searchTerm) ? 1
            : s.name.toLowerCase().startsWith(q) ? 2
            : 3
          return score(a) - score(b)
        })
        .slice(0, 6)

      const stockCommands = matchingStocks.map(stock => ({
        id: `stock-${stock.ticker}`,
        title: `${stock.ticker} - ${stock.name}`,
        subtitle: `${stock.sector} • Aktienanalyse öffnen`,
        icon: ChartBarIcon,
        href: `/analyse/stocks/${stock.ticker.toLowerCase()}`,
        category: 'navigation' as const
      }))

      // ETFs durchsuchen
      const matchingETFs = searchETFs(query, 6)
      const etfCommands = matchingETFs.map(etf => ({
        id: `etf-${etf.symbol}`,
        title: `${etf.symbol} - ${etf.name}`,
        subtitle: `${etf.issuer} • ${etf.category}${etf.ter !== undefined ? ` • TER ${etf.ter.toFixed(2).replace('.', ',')}%` : ''}`,
        icon: ChartBarIcon,
        href: `/analyse/stocks/${etf.symbol.toLowerCase()}`,
        category: 'navigation' as const
      }))

      // API-Ergebnisse als Ergänzung (deduped gegen lokale Treffer).
      // Für Tickers, die NICHT in lokal stocks/ETFs sind (z.B. VUL.AX über
      // FMP-Fallback), gibt es noch keine Detail-Page → diese linken auf
      // Portfolio-Dashboard mit Hinweis statt ins Leere zu führen.
      const localTickers = new Set([
        ...matchingStocks.map(s => s.ticker.toUpperCase()),
        ...matchingETFs.map(e => e.symbol.toUpperCase()),
      ])
      const apiCommands = apiResults
        .filter(r => !localTickers.has(r.ticker.toUpperCase()))
        .slice(0, 6)
        .map(r => ({
          id: `${r.type === 'etf' ? 'etf' : 'stock'}-${r.ticker}`,
          title: `${r.ticker} - ${r.name}`,
          subtitle: `${r.exchange ? r.exchange + ' • ' : ''}Nur im Portfolio verfügbar`,
          icon: ChartBarIcon,
          href: '/analyse/portfolio/dashboard',
          category: 'navigation' as const
        }))

      return [...stockCommands, ...etfCommands, ...apiCommands, ...baseCommands]
    }

    return baseCommands
  }, [theme, toggleTheme, allowsThemeToggle, query, apiResults])

  const filteredCommands = useMemo(() => 
    commands.filter(cmd => 
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.subtitle?.toLowerCase().includes(query.toLowerCase())
    ), [commands, query]
  )

  const groupedCommands = useMemo(() => {
    const stocks = filteredCommands.filter(cmd => cmd.id.startsWith('stock-'))
    const etfs = filteredCommands.filter(cmd => cmd.id.startsWith('etf-'))
    const navigation = filteredCommands.filter(cmd => cmd.category === 'navigation' && !cmd.id.startsWith('stock-') && !cmd.id.startsWith('etf-'))
    const actions = filteredCommands.filter(cmd => cmd.category === 'actions')
    const settings = filteredCommands.filter(cmd => cmd.category === 'settings')

    return { stocks, etfs, navigation, actions, settings }
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
      <div className="bg-theme-card border border-white/[0.06] rounded-xl w-full max-w-lg mx-4 shadow-2xl">

        <div className="p-3 border-b border-white/[0.06]">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-theme-muted" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Aktien suchen oder AI-Frage stellen..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-theme-input border border-white/[0.06] rounded-lg text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-white/[0.15] focus:ring-0 text-sm"
            />
            <button
              onClick={onClose}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-0.5 text-theme-muted hover:text-theme-primary rounded transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {Object.entries(groupedCommands).map(([category, commands]) => {
            if (commands.length === 0) return null
            
            const categoryLabels = {
              stocks: 'AKTIEN',
              etfs: 'ETFs',
              navigation: 'Navigation',
              actions: 'Aktionen',
              settings: 'Einstellungen'
            }
            
            return (
              <div key={category} className="p-2">
                <div className="px-2 py-1 text-xs text-theme-muted font-medium uppercase tracking-wide">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </div>
                {commands.map((command) => {
                  const Icon = command.icon
                  const isStock = command.id.startsWith('stock-')
                  const isETF = command.id.startsWith('etf-')
                  const isAsset = isStock || isETF
                  return (
                    <button
                      key={command.id}
                      onClick={() => handleSelect(command)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group ${
                        isStock
                          ? 'bg-brand/5 hover:bg-brand/10'
                          : isETF
                            ? 'bg-violet-500/5 hover:bg-violet-500/10'
                            : 'hover:bg-theme-secondary'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        isStock
                          ? 'bg-brand/20 group-hover:bg-brand/30'
                          : isETF
                            ? 'bg-violet-500/20 group-hover:bg-violet-500/30'
                            : 'bg-theme-secondary group-hover:bg-theme-tertiary'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          isAsset ? (isETF ? 'text-violet-400' : 'text-brand-light') : 'text-theme-muted group-hover:text-brand-light'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-theme-primary">
                          {isStock ? command.title.split(' - ')[0] : command.title}
                        </div>
                        {command.subtitle && (
                          <div className="text-xs text-theme-muted">
                            {isStock ? command.title.split(' - ')[1] || command.subtitle : command.subtitle}
                          </div>
                        )}
                      </div>
                      <ChevronRightIcon className="w-4 h-4 text-theme-muted group-hover:text-theme-secondary" />
                    </button>
                  )
                })}
              </div>
            )
          })}
          
          {filteredCommands.length === 0 && (
            <div className="p-8 text-center text-theme-muted">
              <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Keine Ergebnisse für "{query}"</p>
            </div>
          )}
          
          {query.length > 0 && !query.match(/^[A-Z]{1,5}$/i) && (
            <div className="p-2 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  onNavigate(`/analyse/finclue-ai?q=${encodeURIComponent(query)}`)
                  onClose()
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group hover:bg-theme-secondary/50"
              >
                <div className="w-8 h-8 rounded-lg bg-theme-secondary/60 group-hover:bg-blue-500/20 flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 text-theme-muted group-hover:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-theme-secondary group-hover:text-theme-primary">
                    "{query}" mit Finclue AI analysieren
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="p-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-theme-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-theme-secondary border border-white/[0.08] rounded text-xs">↵</kbd>
              Auswählen
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-theme-secondary border border-white/[0.08] rounded text-xs">Esc</kbd>
              Schließen
            </span>
          </div>
          <kbd className="px-1.5 py-0.5 bg-theme-secondary border border-white/[0.08] rounded text-xs">⌘K</kbd>
        </div>
      </div>
    </div>
  )
})

// MARKET STATUS
const getMarketStatus = (() => {
  let lastCheck = 0
  let cachedStatus = { status: 'Closed', reason: 'Weekend' }
  
  return () => {
    const now = Date.now()
    if (now - lastCheck < 30000) return cachedStatus
    
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

// ===== MAIN LAYOUT =====
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

  const formatPrice = (price: number): string => formatStockPrice(price)
  const formatPercentageWithSign = (percentage: number): string => formatPercentage(percentage, true)

  const { isStockPage, currentTicker } = useMemo(() => {
    const stockMatch = pathname.match(/^\/analyse\/stocks\/([a-zA-Z0-9.-]+)(.*)$/)
    return {
      isStockPage: !!stockMatch,
      currentTicker: stockMatch?.[1]?.toUpperCase() || null
    }
  }, [pathname])

  const { quote, profile, loading: stockLoading, error: stockError } = useStockData(currentTicker)
  const marketStatus = useMemo(() => getMarketStatus(), [currentTime])

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session?.user) {
          if (mounted) router.replace('/auth/signin')
          return
        }

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          if (mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              isPremium: profile?.is_premium || false
            })
            setLoading(false)
          }
        } catch {
          if (mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              isPremium: false
            })
            setLoading(false)
          }
        }
      } catch {
        if (mounted) router.replace('/auth/signin')
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/auth/signin')
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
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-theme-secondary text-sm">Loading Finclue...</p>
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
      
      <Sidebar
        user={user}
        pathname={pathname}
        navItems={NAV_ITEMS}
        settingsItems={SETTINGS_ITEMS}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onSignOut={handleSignOut}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col bg-theme-primary">
        
        {/* TOP BAR */}
        <div className="py-4 bg-theme-primary border-b border-white/[0.04] flex items-center px-6">
          <div className="flex items-center gap-6 flex-1">
            
            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <button
                onClick={() => setShowCommandPalette(true)}
                className="w-full flex items-center gap-3 px-5 py-3.5 bg-theme-card hover:bg-theme-card border border-white/[0.04] hover:border-green-500/50 rounded-xl transition-all duration-200 group shadow-sm hover:shadow-md"
              >
                <MagnifyingGlassIcon className="w-5 h-5 text-theme-muted group-hover:text-brand-light transition-colors" />
                <span className="text-sm text-theme-muted group-hover:text-theme-secondary transition-colors flex-1 text-left">
                  Aktien suchen oder AI-Frage stellen...
                </span>
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-brand-light/50 group-hover:text-brand-light transition-colors" />
                  <kbd className="px-2 py-1 text-xs bg-theme-tertiary/50 border border-white/[0.08] rounded text-theme-muted">
                    ⌘K
                  </kbd>
                </div>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <GlobalLearnToggle />
            
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-theme-tertiary/30 rounded-lg">
              <SignalIcon className={`w-3 h-3 ${marketStatus.status === 'Open' ? 'text-brand-light' : 'text-red-400'}`} />
              <span className={`text-xs font-medium ${marketStatus.status === 'Open' ? 'text-brand-light' : 'text-red-400'}`}>
                {marketStatus.status === 'Open' ? 'Markt offen' : 'Geschlossen'}
              </span>
            </div>

            {!user.isPremium ? (
              <Link 
                href="/pricing"
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-green-400 text-black font-semibold rounded-lg text-sm transition-all shadow-sm"
              >
                <SparklesIcon className="w-4 h-4" />
                Premium
              </Link>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/20 rounded-lg border border-green-500/30">
                <SparklesIcon className="w-3.5 h-3.5 text-brand-light" />
                <span className="text-sm text-brand-light font-medium">Premium</span>
              </div>
            )}
          </div>
        </div>

        {/* STOCK HEADER */}
        {isStockPage && currentTicker && (
          <div className="bg-theme-primary px-6 py-4">
            <div className="bg-theme-card rounded-xl shadow-lg border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-5">
                {stockLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-theme-secondary">Lade Aktien-Daten...</span>
                  </div>
                ) : stockError ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="text-red-400 font-medium">Fehler beim Laden</div>
                      <div className="text-theme-muted text-sm mt-1">{stockError}</div>
                    </div>
                  </div>
                ) : quote && profile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white rounded-xl p-2 shadow-md border border-white/[0.04]">
                        <Logo 
                          ticker={currentTicker}
                          alt={`${currentTicker} Logo`}
                          className="w-full h-full"
                          padding="none"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h1 className="text-2xl font-bold text-theme-primary">{quote.symbol}</h1>
                          <span className="px-2.5 py-0.5 bg-theme-secondary text-theme-muted text-xs font-medium rounded">
                            {profile.exchange || quote.exchange}
                          </span>
                        </div>
                        <p className="text-sm text-theme-secondary">
                          {profile.companyName} • {profile.industry}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-theme-muted uppercase tracking-wide">Kurs</div>
                        <div className="text-xl font-bold text-theme-primary">{formatPrice(quote.price)}</div>
                        {(() => {
                          const { equivalent } = formatPriceWithExchangeInfo(quote.price)
                          return equivalent ? <div className="text-xs text-theme-muted mt-1">{equivalent}</div> : null
                        })()}
                      </div>
                      
                      <div className="h-10 w-px bg-theme/20"></div>
                      
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
                      
                      <div className="h-10 w-px bg-theme/20"></div>
                      
                      <div className="text-right">
                        <div className="text-xs text-theme-muted uppercase tracking-wide">Marktk.</div>
                        <div className="text-lg font-bold text-theme-primary">{formatMarketCap(quote.marketCap)}</div>
                      </div>
                      
                      <div className="h-10 w-px bg-theme/20"></div>
                      
                      <ScoreBadge ticker={currentTicker} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-theme-muted">Keine Daten für {currentTicker}</div>
                  </div>
                )}
              </div>
              
              {/* Tabs */}
              <div className="bg-theme-secondary/5 border-t border-white/[0.04]" data-tour="stock-tabs">
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
                          data-tour={`stock-tab-${tab.id}`}
                          className={`
                            relative px-4 py-4 text-sm font-medium transition-all
                            ${isActive
                              ? 'text-theme-primary'
                              : isPremiumTab
                                ? 'text-theme-muted/60 hover:text-yellow-400'
                                : 'text-theme-secondary hover:text-theme-primary'
                            }
                          `}
                        >
                          <span className="flex items-center gap-1.5">
                            {tab.label}
                            {isPremiumTab && <SparklesIcon className="w-3 h-3 text-yellow-400" />}
                          </span>
                          {isActive && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-brand"></div>}
                        </Link>
                      )
                    })}
                    
                    {!user.isPremium && (
                      <Link 
                        href="/pricing"
                        className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-green-400 text-black rounded-lg font-semibold text-sm transition-all"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        Upgrade
                      </Link>
                    )}
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      
        {/* CONTENT */}
        <div className="flex-1 bg-theme-primary overflow-x-hidden has-mobile-nav">
          {children}
        </div>

        {/* MOBILE BOTTOM NAVIGATION */}
        <MobileNav />

        {/* ONBOARDING TOUR — nur für neue User, wird nach Abschluss nicht mehr gezeigt */}
        <ProductTour />

        {/* FOOTER */}
        <div className="hidden sm:flex h-5 bg-theme-secondary/50 border-t border-white/[0.04] items-center justify-between px-3 text-xs text-theme-muted">
          <div className="flex items-center gap-2">
            <span>Market: {marketStatus.status}</span>
            <span>•</span>
            <span>Real-time</span>
            {user.isPremium && (
              <>
                <span>•</span>
                <span className="text-brand-light">Premium</span>
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
              <div className={`w-1.5 h-1.5 rounded-full ${marketStatus.status === 'Open' ? 'bg-green-400' : 'bg-red-400'}`}></div>
              Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TerminalLayout({ children }: LayoutProps) {
  return (
    <CurrencyProvider>
      <LearnModeProvider>
        <LayoutContent>{children}</LayoutContent>
      </LearnModeProvider>
    </CurrencyProvider>
  )
}
