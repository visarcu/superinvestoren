'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  UserGroupIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  StarIcon,
  CircleStackIcon,
  MinusIcon,
  QuestionMarkCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'

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
      bgColor: 'bg-green-500/10',
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
      bgColor: 'bg-red-500/10',
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
      bgColor: 'bg-blue-500/10',
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
      bgColor: 'bg-purple-500/10',
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
      bgColor: 'bg-red-500/10',
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
      bgColor: 'bg-yellow-500/10',
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
      bgColor: 'bg-gray-500/10',
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
      bgColor: 'bg-green-500/10',
      icon: 'up',
      isPositive: true
    }
  }
  
  if (code === 'D') {
    return {
      type: 'sale',
      label: 'Veräußerung',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      icon: 'down',
      isPositive: false
    }
  }
  
  // Unbekannt
  return {
    type: 'other',
    label: 'Unbekannt',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
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
            `/api/insider-trading?page=${page}`
          )
          
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              allData.push(...result.data)
              console.log(`✅ Page ${page}: ${result.data.length} transactions loaded`)
            }
          } else {
            console.warn(`⚠️ Page ${page} failed to load`)
            break
          }
          
          if (page < pages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        console.log('✅ Total insider data loaded:', allData.length, 'transactions')
        
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gray-700 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Lade Insider Trading Daten...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-24">
      {/* Header */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium backdrop-blur-sm mb-4">
            <UserGroupIcon className="w-3 h-3" />
            Insider Trading
          </div>
          
          <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4">
            Live Insider Trading
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Aktuelle Transaktionen von Unternehmensinsidern • Live Daten aus über 1000 Transaktionen
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>
              Letztes Update: {new Date().toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            <span>•</span>
            <span>
              {transactions.length.toLocaleString('de-DE')} Transaktionen
            </span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] mb-8">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <InformationCircleIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-2">Über Insider Trading</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Insider müssen ihre Transaktionen binnen 2 Werktagen bei der SEC melden (Form 4). 
                Die Daten umfassen: Käufe/Verkäufe, Aktien-Zuteilungen, Optionsausübungen und andere Transaktionen. 
                <span className="text-yellow-400 font-medium">Hinweis:</span> Optionsausübungen sind meist neutral - sie werden oft direkt verkauft.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Gesamt</p>
                <p className="text-xl font-bold text-white">{formatNumber(extendedStats.totalTransactions)}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Käufe</p>
                <p className="text-xl font-bold text-green-400">{formatNumber(extendedStats.categories.purchase)}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Verkäufe</p>
                <p className="text-xl font-bold text-red-400">{formatNumber(extendedStats.categories.sale)}</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <ArrowTrendingDownIcon className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Zuteilungen</p>
                <p className="text-xl font-bold text-blue-400">{formatNumber(extendedStats.categories.award)}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <StarIcon className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#161618] rounded-xl p-4 border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Optionen</p>
                <p className="text-xl font-bold text-purple-400">{formatNumber(extendedStats.categories.option)}</p>
                <p className="text-xs text-gray-500">meist neutral</p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <CircleStackIcon className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Transaktionstyp Breakdown */}
        <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] mb-8">
          <h3 className="text-lg font-semibold text-white mb-6">Transaktionstyp Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extendedStats.typeBreakdown.slice(0, 9).map(({ type, count, percentage, label }) => (
              <div key={type} className="bg-black/20 rounded-lg p-4 border border-white/[0.06]">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-white">{label}</span>
                    <div className="text-xs text-gray-400">{count} Transaktionen</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">{percentage}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#161618] rounded-2xl p-6 border border-white/[0.06] mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Suche nach Symbol, Insider-Name oder Position..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value as any)
                  setCurrentPage(1)
                }}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
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
        <div className="bg-[#161618] rounded-2xl overflow-hidden border border-white/[0.06] mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/[0.06]">
                <tr>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Datum</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Symbol</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Insider</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Position</th>
                  <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Transaktion</th>
                  <th className="text-right py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Aktien</th>
                  <th className="text-right py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Preis</th>
                  <th className="text-right py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Wert</th>
                  <th className="text-center py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {currentTransactions.map((transaction, index) => {
                  const transactionValue = (transaction.securitiesTransacted || 0) * (transaction.price || 0)
                  const category = getTransactionCategory(transaction.transactionType, transaction.acquiredDisposedCode)
                  
                  return (
                    <tr key={`${transaction.symbol}-${index}`} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6 text-sm text-gray-400">
                        {formatDate(transaction.transactionDate)}
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/analyse/stocks/${transaction.symbol.toLowerCase()}/insider`}
                          className="group inline-flex items-center gap-2"
                        >
                          <span className="bg-white/5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white group-hover:text-green-400 group-hover:bg-green-500/10 transition-all border border-white/10 group-hover:border-green-500/20">
                            {transaction.symbol}
                          </span>
                          <ArrowTopRightOnSquareIcon className="w-3 h-3 text-gray-500 group-hover:text-green-400 transition-colors" />
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-white font-medium max-w-48 truncate">
                          {transaction.reportingName}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-xs text-gray-400 max-w-32 truncate">
                          {transaction.typeOfOwner}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${category.bgColor} ${category.color === 'text-green-400' ? 'border-green-500/20' : category.color === 'text-red-400' ? 'border-red-500/20' : category.color === 'text-blue-400' ? 'border-blue-500/20' : category.color === 'text-purple-400' ? 'border-purple-500/20' : category.color === 'text-yellow-400' ? 'border-yellow-500/20' : 'border-gray-500/20'}`}>
                          <TransactionIcon category={category} />
                          <span className={category.color}>
                            {category.label}
                          </span>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-white text-right font-mono">
                        {formatNumber(transaction.securitiesTransacted || 0)}
                      </td>
                      <td className="py-4 px-6 text-sm text-white text-right font-mono">
                        {transaction.price ? `$${transaction.price.toFixed(2)}` : '–'}
                      </td>
                      <td className="py-4 px-6 text-sm text-white text-right font-mono">
                        {formatCurrency(transactionValue)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {transaction.link ? (
                          <a
                            href={transaction.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                          >
                            {transaction.formType || 'Form 4'}
                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-500 text-xs">
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
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Keine Transaktionen gefunden</h3>
              <p className="text-gray-400 text-sm">
                Versuche andere Filterkriterien oder einen anderen Suchbegriff
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Zeige {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} von {filteredTransactions.length} Transaktionen
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-[#161618] border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zurück
              </button>
              
              <span className="text-sm text-gray-400">
                Seite {currentPage} von {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-[#161618] border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}