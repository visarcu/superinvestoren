'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  StarIcon,
  CircleStackIcon,
  MinusIcon,
  QuestionMarkCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { useCurrency } from '@/lib/CurrencyContext' // ✅ CURRENCY CONTEXT HINZUGEFÜGT
import LoadingSpinner from '@/components/LoadingSpinner'

// Interfaces
interface TickerInsiderTransaction {
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

interface CompanyProfile {
  companyName: string
  industry: string
  sector: string
  marketCap: number
}

interface TransactionCategory {
  type: 'purchase' | 'sale' | 'award' | 'option' | 'neutral' | 'other'
  label: string
  color: string
  bgColor: string
  icon: 'up' | 'down' | 'star' | 'circle' | 'minus' | 'question'
  isPositive: boolean
}

// KORRIGIERTE Transaktionstyp-Kategorisierung (identisch zur allgemeinen Seite)
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

// Icon-Komponente
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

export default function TickerInsiderPage() {
  const params = useParams()
  const ticker = (params.ticker as string)?.toUpperCase()
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<TickerInsiderTransaction[]>([])
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('3M')
  const [error, setError] = useState<string | null>(null)

  // ✅ CURRENCY CONTEXT FÜR DEUTSCHE FORMATIERUNG
  const { formatStockPrice, formatMarketCap } = useCurrency()

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
    if (!ticker) return

    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        console.log(`🔍 Loading insider data for ${ticker} from backend...`)
        
        const [profileResponse, insiderResponse] = await Promise.all([
          // Company Profile über sichere Backend-API
          fetch(`/api/company-profile/${ticker}`),
          // Insider Data über Backend-API
          fetch(`/api/insider-trading?symbol=${ticker}&page=0&limit=500`)
        ])
        
        // Company Profile verarbeiten
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          if (Array.isArray(profileData) && profileData.length > 0) {
            const profile = profileData[0]
            setCompanyProfile({
              companyName: profile.companyName || ticker,
              industry: profile.industry || 'N/A',
              sector: profile.sector || 'N/A',
              marketCap: profile.mktCap || 0
            })
          }
        }
        
        // Insider Transactions verarbeiten
        if (insiderResponse.ok) {
          const result = await insiderResponse.json()
          if (result.success) {
            console.log(`✅ Loaded ${result.data.length} insider transactions for ${ticker}`)
            
            if (result.data.length > 0) {
              console.log('🔍 Sample transaction for debugging:', result.data[0])
              console.log('🔍 Transaction types found:', [...new Set(result.data.map((t: any) => t.transactionType))])
              console.log('🔍 Acquired/Disposed codes found:', [...new Set(result.data.map((t: any) => t.acquiredDisposedCode))])
            }
            
            const sortedData = result.data
              .filter((t: any) => t.reportingName && t.transactionDate)
              .sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
            
            setTransactions(sortedData)
          } else {
            throw new Error(result.message || 'Failed to load insider data')
          }
        } else {
          const errorData = await insiderResponse.json().catch(() => ({ message: 'Unknown error' }))
          throw new Error(errorData.message || `Failed to load insider data for ${ticker}`)
        }
        
      } catch (error) {
        console.error('❌ Error loading data:', error)
        setError(error instanceof Error ? error.message : 'Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [ticker])

  // Timeframe filtering
  const getFilteredTransactions = () => {
    if (timeframe === '1Y') return transactions
    
    const now = new Date()
    const cutoffDate = new Date()
    
    switch (timeframe) {
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case '3M':
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case '6M':
        cutoffDate.setMonth(now.getMonth() - 6)
        break
    }
    
    return transactions.filter(t => new Date(t.transactionDate) >= cutoffDate)
  }

  const filteredTransactions = getFilteredTransactions()

  // KORRIGIERTE Statistiken berechnen
  const stats = React.useMemo(() => {
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
    
    const typeBreakdown = new Map<string, { count: number, volume: number }>()
    
    filteredTransactions.forEach(transaction => {
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
        typeBreakdown.set(type, { count: 0, volume: 0 })
      }
      const existing = typeBreakdown.get(type)!
      existing.count++
      existing.volume += volume
    })
    
    return {
      totalTransactions: filteredTransactions.length,
      categories,
      totalVolume,
      netShares,
      sentiment: {
        positive: positiveTransactions,
        negative: filteredTransactions.length - positiveTransactions,
        positivePercentage: Math.round((positiveTransactions / Math.max(1, filteredTransactions.length)) * 100),
        negativePercentage: Math.round(((filteredTransactions.length - positiveTransactions) / Math.max(1, filteredTransactions.length)) * 100),
        netSentiment: netShares >= 0 ? 'Bullish' : 'Bearish'
      },
      typeBreakdown: Array.from(typeBreakdown.entries())
        .map(([type, data]) => ({
          type,
          count: data.count,
          volume: data.volume,
          percentage: Math.round((data.count / Math.max(1, filteredTransactions.length)) * 100),
          label: getTransactionTypeLabel(type) // HINZUGEFÜGT: Deutsche Übersetzung
        }))
        .sort((a, b) => b.count - a.count)
    }
  }, [filteredTransactions])

  // ✅ DEUTSCHE FORMATIERUNG - Formatierungshilfen
  const formatCurrencyDE = (amount: number): string => {
    if (amount >= 1e9) {
      return `${(amount / 1e9).toLocaleString('de-DE', { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      })} Mrd. ${formatStockPrice(1, true).slice(-1)}` // Letztes Zeichen ist Währungssymbol
    }
    if (amount >= 1e6) {
      return `${(amount / 1e6).toLocaleString('de-DE', { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      })} Mio. ${formatStockPrice(1, true).slice(-1)}`
    }
    if (amount >= 1e3) {
      return `${(amount / 1e3).toLocaleString('de-DE', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      })}k ${formatStockPrice(1, true).slice(-1)}`
    }
    return formatStockPrice(amount, true)
  }

  const formatNumberDE = (num: number): string => {
    return num.toLocaleString('de-DE')
  }

  const formatDateDE = (dateString: string): string => {
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
          <p className="text-theme-secondary mt-3">Lade {ticker} Insider Trading Daten...</p>
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
      {/* ✅ EINHEITLICHER HEADER - wie FinancialsPage */}
     



      {/* ✅ CONTROLS ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-theme-secondary">
            Insider-Aktivitäten der letzten <span className="font-semibold text-green-400">{timeframe}</span>
          </p>
          <div className="text-sm text-theme-muted mt-1">
            Live FMP Daten • Täglich aktualisiert
          </div>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex rounded-lg border border-theme/20 overflow-hidden bg-theme-tertiary/50 p-0.5">
          {(['1M', '3M', '6M', '1Y'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-md ${
                timeframe === period
                  ? 'bg-green-500 text-white shadow-sm'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-green-500/10'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-2 text-sm">
        <Link 
          href="/analyse/insider" 
          className="text-theme-muted hover:text-green-400 transition-colors"
        >
          Alle Insider Trading
        </Link>
        <span className="text-theme-muted">→</span>
        <span className="text-theme-primary font-medium">{ticker} Insider Trading</span>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-blue-400 font-medium text-sm">Insider Trading Information</h3>
            <p className="text-blue-300 text-sm mt-1">
              Insider müssen ihre Transaktionen binnen 2 Werktagen bei der SEC melden. 
              Die Daten umfassen: Käufe/Verkäufe, Aktien-Zuteilungen (Awards/Grants), Optionsausübungen, 
              Umwandlungen und andere Transaktionsarten. <strong>Hinweis:</strong> Optionsausübungen sind meist neutral - sie werden oft direkt verkauft.
            </p>
          </div>
        </div>
      </div>

      {/* ✅ DEUTSCHE FORMATIERUNG - ERWEITERTE Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Transaktionen</p>
              <p className="text-xl font-bold text-theme-primary">{formatNumberDE(stats.totalTransactions)}</p>
            </div>
            <DocumentTextIcon className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Käufe</p>
              <p className="text-xl font-bold text-green-400">{formatNumberDE(stats.categories.purchase)}</p>
            </div>
            <ArrowTrendingUpIcon className="w-6 h-6 text-green-500" />
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Verkäufe</p>
              <p className="text-xl font-bold text-red-400">{formatNumberDE(stats.categories.sale)}</p>
            </div>
            <ArrowTrendingDownIcon className="w-6 h-6 text-red-500" />
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Zuteilungen</p>
              <p className="text-xl font-bold text-blue-400">{formatNumberDE(stats.categories.award)}</p>
            </div>
            <StarIcon className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Optionen</p>
              <p className="text-xl font-bold text-purple-400">{formatNumberDE(stats.categories.option)}</p>
              <p className="text-xs text-theme-muted">meist neutral</p>
            </div>
            <CircleStackIcon className="w-6 h-6 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-theme-card border border-theme rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-theme-muted text-sm">Gesamtvolumen</p>
              <p className="text-xl font-bold text-theme-primary">
                {formatCurrencyDE(stats.totalVolume)}
              </p>
            </div>
            <UserGroupIcon className="w-6 h-6 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* ✅ DEUTSCHE FORMATIERUNG - Insider Sentiment mit korrigierter Bewertung */}
      {stats.totalTransactions > 0 && (
        <div className="bg-theme-card border border-theme rounded-lg p-6">
          <h3 className="text-lg font-bold text-theme-primary mb-4">Insider Sentiment</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {stats.sentiment.positivePercentage}%
              </div>
              <div className="text-sm text-theme-muted">Positive Transaktionen</div>
              <div className="text-xs text-theme-muted mt-1">
                Käufe, Zuteilungen
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {stats.sentiment.negativePercentage}%
              </div>
              <div className="text-sm text-theme-muted">Negative/Neutrale</div>
              <div className="text-xs text-theme-muted mt-1">
                Verkäufe, Optionen, etc.
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${stats.netShares >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.sentiment.netSentiment}
              </div>
              <div className="text-sm text-theme-muted">Netto Sentiment</div>
              <div className="text-xs text-theme-muted mt-1">
                {stats.netShares >= 0 ? '+' : ''}{formatNumberDE(stats.netShares)} Aktien
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-theme-primary">
                {formatCurrencyDE(stats.totalVolume)}
              </div>
              <div className="text-sm text-theme-muted">Gesamtvolumen</div>
              <div className="text-xs text-theme-muted mt-1">
                {timeframe} Zeitraum
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaktionstyp Breakdown für diesen Ticker mit deutschen + englischen Labels */}
      {stats.typeBreakdown.length > 0 && (
        <div className="bg-theme-card border border-theme rounded-lg p-6">
          <h3 className="text-lg font-bold text-theme-primary mb-4">{ticker} Transaktionstyp Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.typeBreakdown.slice(0, 6).map(({ type, count, percentage, label }) => (
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
      )}

      {/* ✅ DEUTSCHE FORMATIERUNG - Transactions Table */}
      <div className="bg-theme-card border border-theme rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-theme">
          <h2 className="text-lg font-semibold text-theme-primary">
            Aktuelle Transaktionen ({timeframe})
          </h2>
        </div>
        
        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-theme-secondary border-b border-theme">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Datum</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Insider</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Position</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Transaktion</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Aktien</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Preis</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Wert</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Besitz</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {filteredTransactions.map((transaction, index) => {
                  const transactionValue = (transaction.securitiesTransacted || 0) * (transaction.price || 0)
                  const category = getTransactionCategory(transaction.transactionType, transaction.acquiredDisposedCode)
                  
                  return (
                    <tr key={index} className="hover:bg-theme-secondary/50 transition-colors">
                      <td className="py-3 px-4 text-sm text-theme-secondary">
                        {formatDateDE(transaction.transactionDate)}
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
                        {formatNumberDE(transaction.securitiesTransacted || 0)}
                      </td>
                      <td className="py-3 px-4 text-sm text-theme-primary text-right font-mono">
                        {transaction.price ? formatStockPrice(transaction.price, true) : '–'}
                      </td>
                      <td className="py-3 px-4 text-sm text-theme-primary text-right font-mono">
                        {formatCurrencyDE(transactionValue)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="text-sm text-theme-primary font-mono">
                          {transaction.securitiesOwned ? formatNumberDE(transaction.securitiesOwned) : '–'}
                        </div>
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
        ) : (
          <div className="p-8 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
            <p className="text-theme-muted">Keine Insider-Transaktionen für {ticker} im Zeitraum {timeframe}</p>
            <p className="text-sm text-theme-muted mt-1">
              Versuche einen längeren Zeitraum oder schaue dir die{' '}
              <Link href="/analyse/insider" className="text-green-400 hover:text-green-300 transition-colors">
                allgemeine Insider Trading Übersicht
              </Link>{' '}
              an.
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href={`/analyse/stocks/${ticker.toLowerCase()}`}
          className="flex items-center gap-3 p-4 bg-theme-card border border-theme rounded-lg hover:bg-theme-secondary/50 transition-colors group"
        >
          <ChartBarIcon className="w-5 h-5 text-green-400" />
          <div>
            <div className="text-sm font-medium text-theme-primary group-hover:text-green-400 transition-colors">
              {ticker} Aktien-Analyse
            </div>
            <div className="text-xs text-theme-muted">
              Kennzahlen, Charts und Bewertungen
            </div>
          </div>
        </Link>
        
        <Link
          href="/analyse/insider"
          className="flex items-center gap-3 p-4 bg-theme-card border border-theme rounded-lg hover:bg-theme-secondary/50 transition-colors group"
        >
          <UserGroupIcon className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-sm font-medium text-theme-primary group-hover:text-blue-400 transition-colors">
              Alle Insider Trading
            </div>
            <div className="text-xs text-theme-muted">
              Marktweite Insider-Aktivitäten
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}