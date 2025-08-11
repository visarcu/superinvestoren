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
import LoadingSpinner from '@/components/LoadingSpinner'

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
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'purchase' | 'sale' | 'award' | 'option' | 'neutral' | 'other'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Insider Trading Daten laden
  useEffect(() => {
    async function loadInsiderData() {
      try {
        console.log('🔍 Loading real FMP insider trading data...')
        
        const pages = [0, 1]
        const allData: any[] = []
        
        for (const page of pages) {
          const response = await fetch(
            `https://financialmodelingprep.com/api/v4/insider-trading?page=${page}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          )
          
          if (response.ok) {
            const data = await response.json()
            allData.push(...data)
            console.log(`✅ Page ${page}: ${data.length} transactions loaded`)
          } else {
            console.warn(`⚠️ Page ${page} failed to load`)
            break
          }
          
          if (page < pages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        console.log('✅ Total FMP Insider data loaded:', allData.length, 'transactions')
        
        const processedData = allData
          .filter((t: any) => t.symbol && t.reportingName)
          .sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
          .slice(0, 1000)
        
        setTransactions(processedData)
        
      } catch (error) {
        console.error('❌ Error loading insider data:', error)
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
          label: getTransactionTypeLabel(type)
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

  // Formatierungshilfen
  const formatCurrency = (amount: number) => {
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`
    return `$${amount.toFixed(0)}`
  }

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

  if (loading) {
    return (
      <div className="bg-theme-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-theme-secondary mt-3">Lade Insider Trading Daten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-theme-bg">
      
      {/* Header - Angepasst für SuperInvestor */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium backdrop-blur-sm mb-6">
              <UserGroupIcon className="w-4 h-4" />
              Insider Trading
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Live Insider Trading
            </h1>
            <p className="text-xl text-theme-secondary max-w-3xl mx-auto leading-relaxed">
              Aktuelle Transaktionen von Unternehmensinsidern • Live FMP Daten
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm text-theme-secondary mt-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>
                Letztes Update: {new Date().toLocaleTimeString('de-DE', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              <span className="text-theme-secondary">•</span>
              <span>
                {transactions.length.toLocaleString('de-DE')} Transaktionen geladen
              </span>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-500/10 border-blue-500/20 rounded-lg p-4 mb-12">
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12">
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                 className=" rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-theme-secondary text-sm">Gesamt</p>
                  <p className="text-xl font-bold text-white">{formatNumber(extendedStats.totalTransactions)}</p>
                </div>
                <DocumentTextIcon className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                 className=" rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-theme-secondary text-sm">Käufe</p>
                  <p className="text-xl font-bold text-green-400">{formatNumber(extendedStats.categories.purchase)}</p>
                </div>
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-500" />
              </div>
            </div>
            
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                 className=" rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-theme-secondary text-sm">Verkäufe</p>
                  <p className="text-xl font-bold text-red-400">{formatNumber(extendedStats.categories.sale)}</p>
                </div>
                <ArrowTrendingDownIcon className="w-6 h-6 text-red-500" />
              </div>
            </div>
            
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                 className=" rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-theme-secondary text-sm">Zuteilungen</p>
                  <p className="text-xl font-bold text-blue-400">{formatNumber(extendedStats.categories.award)}</p>
                </div>
                <StarIcon className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                 className=" rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-theme-secondary text-sm">Optionen</p>
                  <p className="text-xl font-bold text-purple-400">{formatNumber(extendedStats.categories.option)}</p>
                  <p className="text-xs text-theme-secondary">meist neutral</p>
                </div>
                <CircleStackIcon className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            
          
          </div>

          {/* Transaktionstyp Breakdown mit deutschen + englischen Labels */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
               className=" rounded-lg p-6 mb-12">
            <h3 className="text-lg font-bold text-white mb-4">Transaktionstyp Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {extendedStats.typeBreakdown.slice(0, 9).map(({ type, count, percentage, label }) => (
                <div key={type} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                     className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-white">{label}</span>
                    <div className="text-xs text-theme-secondary">{count} Transaktionen</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-white">{percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
               className=" rounded-lg p-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-secondary" />
                  <input
                    type="text"
                    placeholder="Suche nach Symbol, Insider-Name oder Position..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                    className="w-full pl-10 pr-4 py-2 border rounded-md text-white placeholder-theme-secondary focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-4 h-4 text-theme-secondary" />
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value as any)
                    setCurrentPage(1)
                  }}
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                  className="border rounded-md px-3 py-2 text-white focus:outline-none focus:border-green-500"
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
          <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
               className=" rounded-lg overflow-hidden mb-8">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                       className="border-b">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-theme-secondary uppercase tracking-wider">Datum</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-theme-secondary uppercase tracking-wider">Symbol</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-theme-secondary uppercase tracking-wider">Insider</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-theme-secondary uppercase tracking-wider">Position</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-theme-secondary uppercase tracking-wider">Transaktion</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-theme-secondary uppercase tracking-wider">Aktien</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-theme-secondary uppercase tracking-wider">Preis</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-theme-secondary uppercase tracking-wider">Wert</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-theme-secondary uppercase tracking-wider">Form</th>
                  </tr>
                </thead>
                <tbody style={{ borderColor: 'var(--border-color)' }}
                       className="divide-y">
                  {currentTransactions.map((transaction, index) => {
                    const transactionValue = (transaction.securitiesTransacted || 0) * (transaction.price || 0)
                    const category = getTransactionCategory(transaction.transactionType, transaction.acquiredDisposedCode)
                    
                    return (
                      <tr key={`${transaction.symbol}-${index}`} className="hover:bg-theme-hover transition-colors">
                        <td className="py-3 px-4 text-sm text-theme-secondary">
                          {formatDate(transaction.transactionDate)}
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/analyse/stocks/${transaction.symbol.toLowerCase()}/insider`}
                            className="group"
                          >
                            <span style={{ backgroundColor: 'var(--bg-card)' }}
                                  className="inline-flex items-center px-2 py-1 rounded text-sm font-bold text-white group-hover:text-green-400 group-hover:bg-green-500/20 transition-colors">
                              {transaction.symbol}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-white font-medium max-w-48">
                            {transaction.reportingName}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-xs text-theme-secondary max-w-32">
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
                        <td className="py-3 px-4 text-sm text-white text-right font-mono">
                          {formatNumber(transaction.securitiesTransacted || 0)}
                        </td>
                        <td className="py-3 px-4 text-sm text-white text-right font-mono">
                          {transaction.price ? `$${transaction.price.toFixed(2)}` : '–'}
                        </td>
                        <td className="py-3 px-4 text-sm text-white text-right font-mono">
                          {formatCurrency(transactionValue)}
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
                            <span className="text-theme-secondary text-xs">
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
                <ExclamationTriangleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-theme-secondary">Keine Transaktionen gefunden</p>
                <p className="text-sm text-theme-secondary mt-1">
                  Versuche andere Filterkriterien oder einen anderen Suchbegriff
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-theme-secondary">
                Zeige {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} von {filteredTransactions.length} Transaktionen
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                  className="px-3 py-1 text-sm border rounded-md text-white hover:bg-theme-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Zurück
                </button>
                
                <span className="text-sm text-theme-secondary">
                  Seite {currentPage} von {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                  className="px-3 py-1 text-sm border rounded-md text-white hover:bg-theme-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}