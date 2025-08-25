'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  UserGroupIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BuildingOfficeIcon,
  ClockIcon,
  StarIcon,
  CircleStackIcon,
  MinusIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useCurrency } from '@/lib/CurrencyContext'

// Interfaces
interface InsiderTransaction {
  symbol: string
  reportingName: string
  typeOfOwner: string
  transactionDate: string
  transactionType: string
  securitiesOwned: number
  securitiesTransacted: number
  price: number
  securityName: string
  acquiredDisposedCode: string
  formType: string
  link: string
}

interface User {
  id: string
  email: string
  isPremium: boolean
}

interface TransactionCategory {
  type: 'purchase' | 'sale' | 'award' | 'option' | 'neutral' | 'other'
  label: string
  color: string
  bgColor: string
  icon: 'up' | 'down' | 'star' | 'circle' | 'minus' | 'question'
  isPositive: boolean
}

// KORRIGIERTE Transaktionstyp-Kategorisierung
const getTransactionCategory = (transactionType: string, acquiredDisposedCode: string): TransactionCategory => {
  const type = transactionType?.toUpperCase() || ''
  const code = acquiredDisposedCode?.toUpperCase() || ''
  
  // Direkte Käufe - BULLISH
  if (type.includes('P-PURCHASE') || type === 'P' || 
      (code === 'A' && type.includes('PURCHASE'))) {
    return {
      type: 'purchase',
      label: 'Kauf',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      icon: 'up',
      isPositive: true
    }
  }
  
  // Direkte Verkäufe - BEARISH
  if (type.includes('S-SALE') || type === 'S' ||
      (code === 'D' && type.includes('SALE'))) {
    return {
      type: 'sale',
      label: 'Verkauf',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      icon: 'down',
      isPositive: false
    }
  }
  
  // Stock Awards, Grants, Compensation - LEICHT POSITIV (Vergütung)
  if (type.includes('A-AWARD') || type === 'A' ||
      type.includes('AWARD') || type.includes('GRANT') ||
      type.includes('COMPENSATION') || type.includes('RESTRICTED')) {
    return {
      type: 'award',
      label: 'Aktien-Zuteilung',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      icon: 'star',
      isPositive: true
    }
  }
  
  // Options/Warrants Ausübung - NEUTRAL (oft gefolgt von Verkauf)
  if (type.includes('M-EXEMPT') || type === 'M' ||
      type.includes('EXERCISE') || type.includes('OPTION') ||
      type.includes('WARRANT')) {
    return {
      type: 'option',
      label: 'Optionsausübung',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      icon: 'circle',
      isPositive: false // KORRIGIERT: Nicht bullish!
    }
  }
  
  // Negative Transaktionen - BEARISH
  if (type.includes('D-RETURN') || type.includes('E-EXPIRE') ||
      type.includes('G-GIFT') || type === 'D' || type === 'E' || type === 'G' ||
      type.includes('RETURN') || type.includes('EXPIRE') || type.includes('GIFT')) {
    return {
      type: 'sale',
      label: type.includes('GIFT') ? 'Geschenk' : 
             type.includes('RETURN') ? 'Rückgabe' :
             type.includes('EXPIRE') ? 'Verfall' : 'Abgabe',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      icon: 'down',
      isPositive: false
    }
  }
  
  // Neutrale Transaktionen - NEUTRAL
  if (type.includes('F-INKIND') || type === 'F' ||
      type.includes('C-CONVERSION') || type === 'C' ||
      type.includes('CONVERSION') || type.includes('INKIND')) {
    return {
      type: 'neutral',
      label: type.includes('CONVERSION') ? 'Umwandlung' : 'Sachleistung',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      icon: 'minus',
      isPositive: false
    }
  }
  
  // J-Other und unbekannte Typen - VORSICHTIG NEUTRAL
  if (type.includes('J-OTHER') || type === 'J') {
    return {
      type: 'other',
      label: 'Sonstige',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/20',
      icon: 'question',
      isPositive: false
    }
  }
  
  // Fallback basierend auf acquiredDisposedCode
  if (code === 'A') {
    return {
      type: 'purchase',
      label: 'Erwerb',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      icon: 'up',
      isPositive: true
    }
  }
  
  if (code === 'D') {
    return {
      type: 'sale',
      label: 'Veräußerung',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      icon: 'down',
      isPositive: false
    }
  }
  
  // Unbekannt
  return {
    type: 'other',
    label: 'Unbekannt',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    icon: 'question',
    isPositive: false
  }
}

// Deutsche Übersetzungen für API-Transaktionstypen
const getTransactionTypeLabel = (apiType: string): string => {
  const type = apiType?.toUpperCase() || 'UNKNOWN'
  
  const translations: Record<string, string> = {
    'M-EXEMPT': 'M-Exempt (Optionsausübung)',
    'F-INKIND': 'F-InKind (Sachleistung)', 
    'D-RETURN': 'D-Return (Rückgabe)',
    'A-AWARD': 'A-Award (Aktien-Zuteilung)',
    'P-PURCHASE': 'P-Purchase (Kauf)',
    'S-SALE': 'S-Sale (Verkauf)',
    'J-OTHER': 'J-Other (Sonstige)',
    'E-EXPIRE': 'E-Expire (Verfall)',
    'C-CONVERSION': 'C-Conversion (Umwandlung)',
    'G-GIFT': 'G-Gift (Geschenk)',
    'UNKNOWN': 'Unbekannt'
  }
  
  return translations[type] || `${type} (${type})`
}

// Icon-Komponente basierend auf Kategorie
const TransactionIcon = ({ category }: { category: TransactionCategory }) => {
  const className = "w-3 h-3"
  
  switch (category.icon) {
    case 'up':
      return <ArrowTrendingUpIcon className={className} />
    case 'down':
      return <ArrowTrendingDownIcon className={className} />
    case 'star':
      return <StarIcon className={className} />
    case 'circle':
      return <CircleStackIcon className={className} />
    case 'minus':
      return <MinusIcon className={className} />
    default:
      return <QuestionMarkCircleIcon className={className} />
  }
}

export default function InsiderTradingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'purchase' | 'sale' | 'award' | 'option' | 'neutral' | 'other'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Currency Context für deutsche Formatierung
  const { formatCurrency, formatStockPrice } = useCurrency()

  // User laden
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('Error loading user:', error)
      }
    }

    loadUser()
  }, [])

  // ✅ NEUES useEffect mit Backend API
  useEffect(() => {
    async function loadInsiderData() {
      try {
        setLoading(true)
        setError(null)
        console.log('🔍 Loading insider trading data from backend...')
        
        const pages = [0, 1]
        const allData: any[] = []
        
        for (const page of pages) {
          const response = await fetch(`/api/insider-trading?page=${page}&limit=500`)
          
          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              allData.push(...result.data)
              console.log(`✅ Page ${page}: ${result.data.length} transactions loaded`)
            } else {
              console.warn(`⚠️ Page ${page} API error:`, result.message)
              break
            }
          } else {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
            console.warn(`⚠️ Page ${page} failed to load:`, response.status, errorData.message)
            break
          }
          
          if (page < pages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        if (allData.length === 0) {
          throw new Error('Keine Daten erhalten')
        }
        
        console.log('✅ Total Insider data loaded:', allData.length, 'transactions')
        
        const processedData = allData
          .filter((t: any) => t.symbol && t.reportingName)
          .sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
          .slice(0, 1000)
        
        setTransactions(processedData)
        
      } catch (error) {
        console.error('❌ Error loading insider data:', error)
        setError(error instanceof Error ? error.message : 'Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }

    loadInsiderData()
  }, [])

  // KORRIGIERTE Statistiken berechnen
  const extendedStats = React.useMemo(() => {
    const categories = {
      purchase: 0,
      sale: 0,
      award: 0,
      option: 0,
      neutral: 0,
      other: 0
    }
    
    let totalVolume = 0
    let positiveTransactions = 0
    let netShares = 0
    
    const typeBreakdown = new Map<string, { count: number, volume: number, shares: number }>()
    
    transactions.forEach(transaction => {
      const category = getTransactionCategory(transaction.transactionType, transaction.acquiredDisposedCode)
      const volume = (transaction.securitiesTransacted || 0) * (transaction.price || 0)
      const shares = transaction.securitiesTransacted || 0
      
      categories[category.type]++
      totalVolume += volume
      
      if (category.isPositive) {
        positiveTransactions++
        netShares += shares
      } else {
        netShares -= shares
      }
      
      const type = transaction.transactionType || 'Unknown'
      if (!typeBreakdown.has(type)) {
        typeBreakdown.set(type, { count: 0, volume: 0, shares: 0 })
      }
      const existing = typeBreakdown.get(type)!
      existing.count++
      existing.volume += volume
      existing.shares += shares
    })
    
    const total = transactions.length
    
    return {
      totalTransactions: total,
      categories,
      totalVolume,
      netShares,
      sentiment: {
        positive: positiveTransactions,
        negative: total - positiveTransactions,
        positivePercentage: Math.round((positiveTransactions / Math.max(1, total)) * 100),
        negativePercentage: Math.round(((total - positiveTransactions) / Math.max(1, total)) * 100),
        netSentiment: netShares >= 0 ? 'Bullish' : 'Bearish'
      },
      typeBreakdown: Array.from(typeBreakdown.entries())
        .map(([type, data]) => ({
          type,
          count: data.count,
          volume: data.volume,
          shares: data.shares,
          percentage: Math.round((data.count / Math.max(1, total)) * 100),
          label: getTransactionTypeLabel(type) // HINZUGEFÜGT: Deutsche Übersetzung
        }))
        .sort((a, b) => b.count - a.count)
    }
  }, [transactions])

  // Filtering mit verbesserter Kategorisierung
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reportingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.typeOfOwner.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterType === 'all') return matchesSearch
    
    const category = getTransactionCategory(transaction.transactionType, transaction.acquiredDisposedCode)
    return matchesSearch && category.type === filterType
  })

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex)

  // Formatierungshilfen - jetzt mit deutscher Formatierung
  const formatCurrencyValue = (amount: number) => {
    return formatCurrency(amount) // Verwendet CurrencyContext mit deutscher Formatierung
  }

  // Remove old formatCurrency function - it conflicts with the imported one

  const formatNumber = (num: number) => {
    return num.toLocaleString('de-DE')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Retry Function
  const retryLoading = () => {
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-theme-secondary mt-3">Lade Insider Trading Daten...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-theme-primary mb-2">Fehler beim Laden</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={retryLoading}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary flex items-center gap-3">
            <UserGroupIcon className="w-8 h-8 text-green-500" />
            Insider Trading
          </h1>
          <p className="text-theme-muted mt-2">
            Aktuelle Transaktionen von Unternehmensinsidern • Live FMP Daten
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-theme-muted">
              Letztes Update: {new Date().toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          <span className="text-theme-muted text-sm">•</span>
          <span className="text-theme-muted text-sm">
            {transactions.length.toLocaleString('de-DE')} Transaktionen
          </span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-blue-400 font-medium text-sm">Insider Trading Information</h3>
            <p className="text-blue-300 text-sm mt-1">
              Insider müssen ihre Transaktionen binnen 2 Werktagen bei der SEC melden (Form 4). 
              Die Daten umfassen: Käufe/Verkäufe, Aktien-Zuteilungen (Awards/Grants), Optionsausübungen, 
              Umwandlungen und andere Transaktionen. <strong>Hinweis:</strong> Optionsausübungen sind meist neutral - sie werden oft direkt verkauft.
            </p>
          </div>
        </div>
      </div>

      {/* ERWEITERTE Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Gesamt</p>
              <p className="text-xl font-bold text-theme-primary">{formatNumber(extendedStats.totalTransactions)}</p>
            </div>
            <DocumentTextIcon className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Käufe</p>
              <p className="text-xl font-bold text-green-400">{formatNumber(extendedStats.categories.purchase)}</p>
            </div>
            <ArrowTrendingUpIcon className="w-6 h-6 text-green-500" />
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Verkäufe</p>
              <p className="text-xl font-bold text-red-400">{formatNumber(extendedStats.categories.sale)}</p>
            </div>
            <ArrowTrendingDownIcon className="w-6 h-6 text-red-500" />
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Zuteilungen</p>
              <p className="text-xl font-bold text-blue-400">{formatNumber(extendedStats.categories.award)}</p>
            </div>
            <StarIcon className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Optionen</p>
              <p className="text-xl font-bold text-purple-400">{formatNumber(extendedStats.categories.option)}</p>
              <p className="text-xs text-theme-muted">meist neutral</p>
            </div>
            <CircleStackIcon className="w-6 h-6 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Sentiment</p>
              <p className={`text-xl font-bold ${extendedStats.netShares >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {extendedStats.sentiment.netSentiment}
              </p>
              <p className="text-xs text-theme-muted">
                {extendedStats.sentiment.positivePercentage}% positiv
              </p>
            </div>
            <CalendarIcon className="w-6 h-6 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Transaktionstyp Breakdown mit deutschen + englischen Labels */}
      <div className="bg-theme-card border border-theme rounded-lg p-6">
        <h3 className="text-lg font-bold text-theme-primary mb-4">Transaktionstyp Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {extendedStats.typeBreakdown.slice(0, 9).map(({ type, count, percentage, label }) => (
            <div key={type} className="flex justify-between items-center p-3 bg-theme-secondary rounded-lg">
              <div>
                <span className="text-sm font-medium text-theme-primary">{label}</span>
                <div className="text-xs text-theme-muted">{count} Transaktionen</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-theme-primary">{percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-theme-card border border-theme rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-muted" />
              <input
                type="text"
                placeholder="Suche nach Symbol, Insider-Name oder Position..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 bg-theme-secondary border border-theme rounded-md text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-theme-muted" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as any)
                setCurrentPage(1)
              }}
              className="bg-theme-secondary border border-theme rounded-md px-3 py-2 text-theme-primary focus:outline-none focus:border-green-500"
            >
              <option value="all">Alle Transaktionen</option>
              <option value="purchase">Käufe</option>
              <option value="sale">Verkäufe</option>
              <option value="award">Zuteilungen</option>
              <option value="option">Optionen</option>
              <option value="neutral">Neutrale</option>
              <option value="other">Sonstige</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-theme-card border border-theme rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-secondary border-b border-theme">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Datum</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Symbol</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Insider</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Position</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Transaktion</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Aktien</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Preis</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Wert</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {currentTransactions.map((transaction, index) => {
                const transactionValue = (transaction.securitiesTransacted || 0) * (transaction.price || 0)
                const category = getTransactionCategory(transaction.transactionType, transaction.acquiredDisposedCode)
                
                return (
                  <tr key={`${transaction.symbol}-${index}`} className="hover:bg-theme-secondary/50 transition-colors">
                    <td className="py-3 px-4 text-sm text-theme-secondary">
                      {formatDate(transaction.transactionDate)}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/analyse/stocks/${transaction.symbol.toLowerCase()}/insider`}
                        className="flex items-center gap-2 group"
                      >
                        <div className="w-8 h-8 bg-theme-tertiary rounded-md flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                          <span className="text-xs font-bold text-theme-primary group-hover:text-green-400 transition-colors">
                            {transaction.symbol}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-theme-primary group-hover:text-green-400 transition-colors">
                          {transaction.symbol}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-theme-primary font-medium max-w-48">
                        {transaction.reportingName}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-theme-muted max-w-32">
                        {transaction.typeOfOwner}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${category.bgColor}`}>
                        <TransactionIcon category={category} />
                        <span className={category.color}>
                          {category.label}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-theme-primary text-right font-mono">
                      {formatNumber(transaction.securitiesTransacted || 0)}
                    </td>
                    <td className="py-3 px-4 text-sm text-theme-primary text-right font-mono">
                      {transaction.price ? formatStockPrice(transaction.price) : '–'}
                    </td>
                    <td className="py-3 px-4 text-sm text-theme-primary text-right font-mono">
                      {formatCurrencyValue(transactionValue)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {transaction.link ? (
                        <a
                          href={transaction.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30 transition-colors"
                        >
                          {transaction.formType || 'Form 4'}
                        </a>
                      ) : (
                        <span className="text-theme-muted text-xs">
                          {transaction.formType || '–'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length === 0 && !loading && (
          <div className="p-8 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
            <p className="text-theme-muted">Keine Transaktionen gefunden</p>
            <p className="text-sm text-theme-muted mt-1">
              Versuche andere Filterkriterien oder einen anderen Suchbegriff
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-theme-muted">
            Zeige {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} von {filteredTransactions.length} Transaktionen
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-theme-secondary border border-theme rounded-md text-theme-primary hover:bg-theme-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Zurück
            </button>
            
            <span className="text-sm text-theme-muted">
              Seite {currentPage} von {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-theme-secondary border border-theme rounded-md text-theme-primary hover:bg-theme-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}