// src/app/(terminal)/analyse/stocks/[ticker]/insider/page.tsx - FEY/QUARTR CLEAN STYLE
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  StarIcon,
  CircleStackIcon,
  MinusIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { useCurrency } from '@/lib/CurrencyContext'

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

interface TransactionCategory {
  type: 'purchase' | 'sale' | 'award' | 'option' | 'neutral' | 'other'
  label: string
  color: string
  bgColor: string
  icon: 'up' | 'down' | 'star' | 'circle' | 'minus' | 'question'
  isPositive: boolean
}

// Transaction categorization
const getTransactionCategory = (transactionType: string, acquiredDisposedCode: string): TransactionCategory => {
  const type = transactionType?.toUpperCase() || ''
  const code = acquiredDisposedCode?.toUpperCase() || ''

  if (type.includes('P-PURCHASE') || type === 'P' || (code === 'A' && type.includes('PURCHASE'))) {
    return { type: 'purchase', label: 'Kauf', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: 'up', isPositive: true }
  }

  if (type.includes('S-SALE') || type === 'S' || (code === 'D' && type.includes('SALE'))) {
    return { type: 'sale', label: 'Verkauf', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: 'down', isPositive: false }
  }

  if (type.includes('A-AWARD') || type === 'A' || type.includes('AWARD') || type.includes('GRANT') || type.includes('COMPENSATION') || type.includes('RESTRICTED')) {
    return { type: 'award', label: 'Zuteilung', color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: 'star', isPositive: true }
  }

  if (type.includes('M-EXEMPT') || type === 'M' || type.includes('EXERCISE') || type.includes('OPTION') || type.includes('WARRANT')) {
    return { type: 'option', label: 'Option', color: 'text-purple-400', bgColor: 'bg-purple-500/10', icon: 'circle', isPositive: false }
  }

  if (type.includes('D-RETURN') || type.includes('E-EXPIRE') || type.includes('G-GIFT') || type === 'D' || type === 'E' || type === 'G') {
    return {
      type: 'sale',
      label: type.includes('GIFT') ? 'Geschenk' : type.includes('RETURN') ? 'Rückgabe' : type.includes('EXPIRE') ? 'Verfall' : 'Abgabe',
      color: 'text-red-400', bgColor: 'bg-red-500/10', icon: 'down', isPositive: false
    }
  }

  if (type.includes('F-INKIND') || type === 'F' || type.includes('C-CONVERSION') || type === 'C') {
    return { type: 'neutral', label: type.includes('CONVERSION') ? 'Umwandlung' : 'Sachleistung', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', icon: 'minus', isPositive: false }
  }

  if (code === 'A') return { type: 'purchase', label: 'Erwerb', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: 'up', isPositive: true }
  if (code === 'D') return { type: 'sale', label: 'Veräußerung', color: 'text-red-400', bgColor: 'bg-red-500/10', icon: 'down', isPositive: false }

  return { type: 'other', label: 'Sonstige', color: 'text-theme-muted', bgColor: 'bg-theme-secondary/50', icon: 'question', isPositive: false }
}

const getTransactionTypeLabel = (apiType: string): string => {
  const translations: Record<string, string> = {
    'M-EXEMPT': 'Optionsausübung',
    'F-INKIND': 'Sachleistung',
    'D-RETURN': 'Rückgabe',
    'A-AWARD': 'Aktien-Zuteilung',
    'P-PURCHASE': 'Kauf',
    'S-SALE': 'Verkauf',
    'J-OTHER': 'Sonstige',
    'E-EXPIRE': 'Verfall',
    'C-CONVERSION': 'Umwandlung',
    'G-GIFT': 'Geschenk'
  }
  return translations[apiType?.toUpperCase()] || apiType || 'Unbekannt'
}

const TransactionIcon = ({ category }: { category: TransactionCategory }) => {
  const className = "w-3.5 h-3.5"
  switch (category.icon) {
    case 'up': return <ArrowTrendingUpIcon className={className} />
    case 'down': return <ArrowTrendingDownIcon className={className} />
    case 'star': return <StarIcon className={className} />
    case 'circle': return <CircleStackIcon className={className} />
    case 'minus': return <MinusIcon className={className} />
    default: return <QuestionMarkCircleIcon className={className} />
  }
}

export default function TickerInsiderPage() {
  const params = useParams()
  const ticker = (params.ticker as string)?.toUpperCase()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<TickerInsiderTransaction[]>([])
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('3M')
  const [error, setError] = useState<string | null>(null)

  const { formatStockPrice } = useCurrency()

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
          setUser({ id: session.user.id, email: session.user.email || '', isPremium: profile?.is_premium || false })
        }
      } catch (error) {
        console.error('Error loading user:', error)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (!ticker) return

    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/insider-trading?symbol=${ticker}&page=0&limit=500`)

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            const sortedData = result.data
              .filter((t: any) => t.reportingName && t.transactionDate)
              .sort((a: any, b: any) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime())
            setTransactions(sortedData)
          } else {
            throw new Error(result.message || 'Failed to load insider data')
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
          throw new Error(errorData.message || `Failed to load insider data for ${ticker}`)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        setError(error instanceof Error ? error.message : 'Fehler beim Laden der Daten')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [ticker])

  const getFilteredTransactions = () => {
    if (timeframe === '1Y') return transactions
    const now = new Date()
    const cutoffDate = new Date()
    switch (timeframe) {
      case '1M': cutoffDate.setMonth(now.getMonth() - 1); break
      case '3M': cutoffDate.setMonth(now.getMonth() - 3); break
      case '6M': cutoffDate.setMonth(now.getMonth() - 6); break
    }
    return transactions.filter(t => new Date(t.transactionDate) >= cutoffDate)
  }

  const filteredTransactions = getFilteredTransactions()

  const stats = useMemo(() => {
    const categories = { purchase: 0, sale: 0, award: 0, option: 0, neutral: 0, other: 0 }
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
      if (!typeBreakdown.has(type)) typeBreakdown.set(type, { count: 0, volume: 0 })
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
        .map(([type, data]) => ({ type, count: data.count, volume: data.volume, percentage: Math.round((data.count / Math.max(1, filteredTransactions.length)) * 100), label: getTransactionTypeLabel(type) }))
        .sort((a, b) => b.count - a.count)
    }
  }, [filteredTransactions])

  const formatCurrencyDE = (amount: number): string => {
    if (amount >= 1e9) return `${(amount / 1e9).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mrd. $`
    if (amount >= 1e6) return `${(amount / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mio. $`
    if (amount >= 1e3) return `${(amount / 1e3).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k $`
    return formatStockPrice(amount, true)
  }

  const formatNumberDE = (num: number): string => num.toLocaleString('de-DE')
  const formatDateDE = (dateString: string): string => new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Loading State - Clean Style
  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-theme-muted text-sm">Lade Insider-Daten...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error State - Clean Style
  if (error) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-theme-primary mb-2">Fehler beim Laden</h2>
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      <main className="w-full px-6 lg:px-8 py-8 space-y-6">

        {/* Controls Row - Clean Style */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-theme-secondary text-sm">
              Insider-Aktivitäten der letzten <span className="font-medium text-emerald-400">{timeframe}</span>
            </p>
            <p className="text-xs text-theme-muted mt-0.5">Live SEC Daten • Täglich aktualisiert</p>
          </div>

          {/* Timeframe Selector - Pill Style */}
          <div className="flex items-center gap-1 p-1 bg-theme-secondary/30 rounded-lg w-fit">
            {(['1M', '3M', '6M', '1Y'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeframe === period
                    ? 'bg-theme-card text-theme-primary shadow-sm'
                    : 'text-theme-muted hover:text-theme-secondary'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/analyse/insider" className="text-theme-muted hover:text-emerald-400 transition-colors">
            Alle Insider Trading
          </Link>
          <span className="text-theme-muted">→</span>
          <span className="text-theme-primary font-medium">{ticker}</span>
        </div>

        {/* Info Banner - Clean Style */}
        <div className="bg-theme-card rounded-xl border border-theme-light p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-theme-muted text-sm">
              Insider müssen Transaktionen binnen 2 Werktagen bei der SEC melden.
              <span className="text-theme-secondary"> Hinweis: Optionsausübungen sind meist neutral.</span>
            </p>
          </div>
        </div>

        {/* Stats Cards - Clean Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Transaktionen', value: formatNumberDE(stats.totalTransactions), icon: DocumentTextIcon, color: 'text-blue-400' },
            { label: 'Käufe', value: formatNumberDE(stats.categories.purchase), icon: ArrowTrendingUpIcon, color: 'text-emerald-400' },
            { label: 'Verkäufe', value: formatNumberDE(stats.categories.sale), icon: ArrowTrendingDownIcon, color: 'text-red-400' },
            { label: 'Zuteilungen', value: formatNumberDE(stats.categories.award), icon: StarIcon, color: 'text-blue-400' },
            { label: 'Optionen', value: formatNumberDE(stats.categories.option), icon: CircleStackIcon, color: 'text-purple-400', note: 'neutral' },
            { label: 'Volumen', value: formatCurrencyDE(stats.totalVolume), icon: UserGroupIcon, color: 'text-theme-secondary' }
          ].map((stat, i) => (
            <div key={i} className="bg-theme-card rounded-xl border border-theme-light p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-theme-muted">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className={`text-lg font-semibold ${stat.color === 'text-theme-secondary' ? 'text-theme-primary' : stat.color}`}>
                {stat.value}
              </p>
              {stat.note && <p className="text-xs text-theme-muted mt-0.5">{stat.note}</p>}
            </div>
          ))}
        </div>

        {/* Sentiment Card - Clean Style */}
        {stats.totalTransactions > 0 && (
          <div className="bg-theme-card rounded-xl border border-theme-light p-5">
            <h3 className="text-sm font-medium text-theme-primary mb-4">Insider Sentiment</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-semibold text-emerald-400">{stats.sentiment.positivePercentage}%</p>
                <p className="text-xs text-theme-muted mt-1">Positiv</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-red-400">{stats.sentiment.negativePercentage}%</p>
                <p className="text-xs text-theme-muted mt-1">Negativ/Neutral</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-semibold ${stats.netShares >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.sentiment.netSentiment}
                </p>
                <p className="text-xs text-theme-muted mt-1">
                  {stats.netShares >= 0 ? '+' : ''}{formatNumberDE(stats.netShares)} Aktien
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-theme-primary">{formatCurrencyDE(stats.totalVolume)}</p>
                <p className="text-xs text-theme-muted mt-1">{timeframe} Volumen</p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Type Breakdown - Clean Style */}
        {stats.typeBreakdown.length > 0 && (
          <div className="bg-theme-card rounded-xl border border-theme-light p-5">
            <h3 className="text-sm font-medium text-theme-primary mb-4">Transaktionstypen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.typeBreakdown.slice(0, 6).map(({ type, count, percentage, label }) => (
                <div key={type} className="flex justify-between items-center p-3 bg-theme-secondary/30 rounded-lg">
                  <div>
                    <span className="text-sm text-theme-primary">{label}</span>
                    <p className="text-xs text-theme-muted">{count} Transaktionen</p>
                  </div>
                  <span className="text-sm font-medium text-theme-secondary">{percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Table - Clean Style */}
        <div className="bg-theme-card rounded-xl border border-theme-light overflow-hidden">
          <div className="p-5 border-b border-theme-light">
            <h2 className="text-sm font-medium text-theme-primary">
              Aktuelle Transaktionen ({timeframe})
            </h2>
          </div>

          {filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-theme-light">
                    <th className="text-left py-3 px-5 text-xs font-medium text-theme-muted">Datum</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-theme-muted">Insider</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-theme-muted">Position</th>
                    <th className="text-left py-3 px-5 text-xs font-medium text-theme-muted">Typ</th>
                    <th className="text-right py-3 px-5 text-xs font-medium text-theme-muted">Aktien</th>
                    <th className="text-right py-3 px-5 text-xs font-medium text-theme-muted">Preis</th>
                    <th className="text-right py-3 px-5 text-xs font-medium text-theme-muted">Wert</th>
                    <th className="text-right py-3 px-5 text-xs font-medium text-theme-muted">Besitz</th>
                    <th className="text-center py-3 px-5 text-xs font-medium text-theme-muted">SEC</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction, index) => {
                    const transactionValue = (transaction.securitiesTransacted || 0) * (transaction.price || 0)
                    const category = getTransactionCategory(transaction.transactionType, transaction.acquiredDisposedCode)

                    return (
                      <tr key={index} className="border-b border-theme-light last:border-b-0 hover:bg-theme-secondary/20 transition-colors">
                        <td className="py-3 px-5 text-sm text-theme-muted">
                          {formatDateDE(transaction.transactionDate)}
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-sm text-theme-primary font-medium">{transaction.reportingName}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-xs text-theme-muted">{transaction.typeOfOwner}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${category.bgColor} ${category.color}`}>
                            <TransactionIcon category={category} />
                            {category.label}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-sm text-theme-primary text-right font-mono">
                          {formatNumberDE(transaction.securitiesTransacted || 0)}
                        </td>
                        <td className="py-3 px-5 text-sm text-theme-primary text-right font-mono">
                          {transaction.price ? formatStockPrice(transaction.price, true) : '–'}
                        </td>
                        <td className="py-3 px-5 text-sm text-theme-primary text-right font-mono">
                          {formatCurrencyDE(transactionValue)}
                        </td>
                        <td className="py-3 px-5 text-sm text-theme-primary text-right font-mono">
                          {transaction.securitiesOwned ? formatNumberDE(transaction.securitiesOwned) : '–'}
                        </td>
                        <td className="py-3 px-5 text-center">
                          {transaction.link ? (
                            <a
                              href={transaction.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs hover:bg-blue-500/20 transition-colors"
                            >
                              {transaction.formType || 'Form 4'}
                            </a>
                          ) : (
                            <span className="text-theme-muted text-xs">{transaction.formType || '–'}</span>
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
              <div className="w-12 h-12 bg-theme-secondary/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-theme-muted" />
              </div>
              <p className="text-theme-muted text-sm">Keine Transaktionen für {ticker} im Zeitraum {timeframe}</p>
              <Link href="/analyse/insider" className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block transition-colors">
                Zur Übersicht
              </Link>
            </div>
          )}
        </div>

        {/* Quick Links - Clean Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/analyse/stocks/${ticker.toLowerCase()}`}
            className="flex items-center gap-3 p-4 bg-theme-card rounded-xl border border-theme-light hover:border-emerald-500/30 transition-colors group"
          >
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-theme-primary group-hover:text-emerald-400 transition-colors">
                {ticker} Analyse
              </p>
              <p className="text-xs text-theme-muted">Kennzahlen, Charts, Bewertungen</p>
            </div>
          </Link>

          <Link
            href="/analyse/insider"
            className="flex items-center gap-3 p-4 bg-theme-card rounded-xl border border-theme-light hover:border-blue-500/30 transition-colors group"
          >
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-theme-primary group-hover:text-blue-400 transition-colors">
                Alle Insider Trading
              </p>
              <p className="text-xs text-theme-muted">Marktweite Aktivitäten</p>
            </div>
          </Link>
        </div>

      </main>
    </div>
  )
}
