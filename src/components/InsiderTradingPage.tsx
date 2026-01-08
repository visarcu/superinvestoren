'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  UserGroupIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
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

// Vereinfachte Transaktionskategorisierung
const getTransactionCategory = (transactionType: string, acquiredDisposedCode: string) => {
  const type = transactionType?.toUpperCase() || ''
  const code = acquiredDisposedCode?.toUpperCase() || ''
  
  // Käufe
  if (type.includes('P-PURCHASE') || type === 'P' || (code === 'A' && type.includes('PURCHASE'))) {
    return { type: 'purchase', label: 'Kauf', isPositive: true }
  }
  
  // Verkäufe
  if (type.includes('S-SALE') || type === 'S' || (code === 'D' && type.includes('SALE'))) {
    return { type: 'sale', label: 'Verkauf', isPositive: false }
  }
  
  // Awards
  if (type.includes('A-AWARD') || type === 'A' || type.includes('AWARD') || type.includes('GRANT')) {
    return { type: 'award', label: 'Zuteilung', isPositive: true }
  }
  
  // Options
  if (type.includes('M-EXEMPT') || type === 'M' || type.includes('EXERCISE') || type.includes('OPTION')) {
    return { type: 'option', label: 'Option', isPositive: false }
  }
  
  // Rückgaben, Geschenke etc.
  if (type.includes('D-RETURN') || type.includes('G-GIFT') || type.includes('F-INKIND') || type.includes('C-CONVERSION')) {
    return { type: 'other', label: 'Sonstige', isPositive: false }
  }
  
  // Fallback
  if (code === 'A') return { type: 'purchase', label: 'Erwerb', isPositive: true }
  if (code === 'D') return { type: 'sale', label: 'Abgabe', isPositive: false }
  
  return { type: 'other', label: 'Sonstige', isPositive: false }
}

export default function InsiderTradingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<InsiderTransaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'purchase' | 'sale'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

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

  // Daten laden
  useEffect(() => {
    async function loadInsiderData() {
      try {
        setLoading(true)
        setError(null)
        
        const pages = [0, 1]
        const allData: any[] = []
        
        for (const page of pages) {
          const response = await fetch(`/api/insider-trading?page=${page}&limit=500`)
          
          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              allData.push(...result.data)
            } else {
              break
            }
          } else {
            break
          }
          
          if (page < pages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        if (allData.length === 0) {
          throw new Error('Keine Daten erhalten')
        }
        
        const processedData = allData
          .filter((t: any) => t.symbol && t.reportingName)
          .sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
          .slice(0, 1000)
        
        setTransactions(processedData)
        
      } catch (error) {
        console.error('Error loading insider data:', error)
        setError(error instanceof Error ? error.message : 'Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }

    loadInsiderData()
  }, [])

  // Stats berechnen
  const stats = React.useMemo(() => {
    let purchases = 0
    let sales = 0
    let totalBuyVolume = 0
    let totalSellVolume = 0
    
    transactions.forEach(t => {
      const category = getTransactionCategory(t.transactionType, t.acquiredDisposedCode)
      const volume = (t.securitiesTransacted || 0) * (t.price || 0)
      
      if (category.type === 'purchase') {
        purchases++
        totalBuyVolume += volume
      } else if (category.type === 'sale') {
        sales++
        totalSellVolume += volume
      }
    })
    
    return { purchases, sales, totalBuyVolume, totalSellVolume }
  }, [transactions])

  // Filtering
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reportingName.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterType === 'all') return matchesSearch
    
    const category = getTransactionCategory(transaction.transactionType, transaction.acquiredDisposedCode)
    if (filterType === 'purchase') return matchesSearch && (category.type === 'purchase' || category.type === 'award')
    if (filterType === 'sale') return matchesSearch && (category.type === 'sale' || category.type === 'option' || category.type === 'other')
    
    return matchesSearch
  })

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage)

  // Formatierung
  const formatNumber = (num: number) => num.toLocaleString('de-DE')
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatVolume = (amount: number) => {
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)} Mrd. $`
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)} Mio. $`
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(0)}K $`
    return formatCurrency(amount)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-negative mx-auto mb-4" />
          <h2 className="text-xl font-bold text-theme-primary mb-2">Fehler beim Laden</h2>
          <p className="text-negative mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* Clean Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-primary">Insider Trading</h1>
        <p className="text-theme-muted text-sm mt-1">
          Aktuelle SEC Form 4 Meldungen • {transactions.length.toLocaleString('de-DE')} Transaktionen
        </p>
      </div>

      {/* Kompakte Stats - Eine Zeile */}
      <div className="flex items-center gap-8 py-4 border-b border-theme/10">
        <div className="flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-4 h-4 text-positive" />
          <span className="text-sm text-theme-secondary">Käufe:</span>
          <span className="text-sm font-semibold text-positive">{formatNumber(stats.purchases)}</span>
          <span className="text-xs text-theme-muted">({formatVolume(stats.totalBuyVolume)})</span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowTrendingDownIcon className="w-4 h-4 text-negative" />
          <span className="text-sm text-theme-secondary">Verkäufe:</span>
          <span className="text-sm font-semibold text-negative">{formatNumber(stats.sales)}</span>
          <span className="text-xs text-theme-muted">({formatVolume(stats.totalSellVolume)})</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-2 h-2 bg-positive rounded-full animate-pulse"></div>
          <span className="text-xs text-theme-muted">Live</span>
        </div>
      </div>

      {/* Filter Bar - Minimal */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-muted" />
          <input
            type="text"
            placeholder="Symbol oder Name suchen..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-theme-secondary/50 border border-theme/10 rounded-lg text-theme-primary placeholder-theme-muted focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/20 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-1 p-1 bg-theme-secondary/50 rounded-lg">
          {[
            { value: 'all', label: 'Alle' },
            { value: 'purchase', label: 'Käufe' },
            { value: 'sale', label: 'Verkäufe' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setFilterType(option.value as any)
                setCurrentPage(1)
              }}
              className={`px-4 py-1.5 text-sm rounded-md transition-all ${
                filterType === option.value
                  ? 'bg-white dark:bg-theme-card text-theme-primary shadow-sm font-medium'
                  : 'text-theme-muted hover:text-theme-secondary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clean Table */}
      <div className="bg-theme-card rounded-xl border border-theme/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-theme/10">
              <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Datum</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Symbol</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Insider</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Typ</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Aktien</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Preis</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">Wert</th>
              <th className="text-center py-3 px-4 text-xs font-medium text-theme-muted uppercase tracking-wider">SEC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme/5">
            {currentTransactions.map((transaction, index) => {
              const category = getTransactionCategory(transaction.transactionType, transaction.acquiredDisposedCode)
              const value = (transaction.securitiesTransacted || 0) * (transaction.price || 0)
              
              return (
                <tr key={`${transaction.symbol}-${index}`} className="hover:bg-theme-secondary/30 transition-colors">
                  <td className="py-3 px-4 text-sm text-theme-muted">
                    {formatDate(transaction.transactionDate)}
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/analyse/stocks/${transaction.symbol.toLowerCase()}`}
                      className="text-sm font-medium text-theme-primary hover:text-brand transition-colors"
                    >
                      {transaction.symbol}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-theme-primary">{transaction.reportingName}</div>
                    <div className="text-xs text-theme-muted">{transaction.typeOfOwner}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-medium ${
                      category.isPositive ? 'text-positive' : 'text-negative'
                    }`}>
                      {category.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-theme-primary text-right tabular-nums">
                    {formatNumber(transaction.securitiesTransacted || 0)}
                  </td>
                  <td className="py-3 px-4 text-sm text-theme-primary text-right tabular-nums">
                    {transaction.price ? formatStockPrice(transaction.price) : '–'}
                  </td>
                  <td className="py-3 px-4 text-sm text-theme-primary text-right tabular-nums font-medium">
                    {value > 0 ? formatCurrency(value) : '–'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {transaction.link ? (
                      <a
                        href={transaction.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand hover:text-brand-hover transition-colors"
                      >
                        Form 4
                      </a>
                    ) : (
                      <span className="text-xs text-theme-muted">–</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {filteredTransactions.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-theme-muted">Keine Transaktionen gefunden</p>
          </div>
        )}
      </div>

      {/* Clean Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-theme-muted">
            {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredTransactions.length)} von {filteredTransactions.length}
          </p>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm text-theme-secondary hover:text-theme-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Zurück
            </button>
            
            <span className="text-sm text-theme-muted px-2">
              {currentPage} / {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm text-theme-secondary hover:text-theme-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Weiter →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}