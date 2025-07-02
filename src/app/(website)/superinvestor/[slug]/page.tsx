// src/app/superinvestor/[slug]/page.tsx - COMPLETE mit Portfolio Analysis + Analytics Tab + Company Ownership
'use client'

import React, { useState, FormEvent, useRef, useEffect, useMemo } from 'react'
import { notFound, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  ArrowTopRightOnSquareIcon,
  EnvelopeIcon, 
  ArrowUpRightIcon,
  ArrowLeftIcon,
  UserIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  CheckIcon,
  StarIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockClosedIcon,
  LightBulbIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

import holdingsHistory from '@/data/holdings'
import InvestorTabs, { Tab } from '@/components/InvestorTabs'
import { stocks } from '@/data/stocks'
import LoadingSpinner from '@/components/LoadingSpinner'
import { ErrorBoundary } from 'react-error-boundary'
import ErrorFallback from '@/components/ErrorFallback'
import PortfolioValueChart from '@/components/PortfolioValueChart'
import InvestorAvatar from '@/components/InvestorAvatar'
import cashPositions from '@/data/cashPositions'
import CashPositionChart from '@/components/CashPositionChart'
import { supabase } from '@/lib/supabaseClient'
import PortfolioAnalysisInline from '@/components/PortfolioAnalysisInline'
import FilingsTab from '@/components/FilingsTab'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'
import AdvancedSectorAnalysis from '@/components/AdvancedSectorAnalysis'
import SectorBreakdownChart from '@/components/SectorBreakdownChart'
import Logo from '@/components/Logo'
import CompactSectorOverview from '@/components/CompactSectorOverview'
import CompactTopPositions from '@/components/CompactTopPositions'
import DividendAnalysisSection from '@/components/DividendAnalysisSection'

// Dynamic imports
const TopPositionsBarChart = dynamic(
  () => import('@/components/TopPositionsBarChart'),
  {
    ssr: false,
    loading: () => <LoadingSpinner />
  }
)

import articlesBuffett from '@/data/articles/buffett.json'
import articlesAckman from '@/data/articles/ackman.json'
import articlesGates from '@/data/articles/gates.json'
import ArticleList from '@/components/ArticleList'
import type { Article } from '@/components/ArticleList'

// User Interface für Premium-Check
interface User {
  id: string
  email: string
  isPremium: boolean
}

// Animation Hook
const useIntersectionObserver = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);
  
  return [ref, isVisible] as const;
};

interface Position {
  cusip: string
  name: string
  shares: number
  value: number
  deltaShares: number
  pctDelta: number
  ticker?: string
}

interface HistoryGroup {
  period: string
  items: Position[]
}

// Company Ownership History Types
interface CompanyInfo {
  cusip: string
  ticker: string
  name: string
  displayName: string
  totalValue?: number // ✅ Für Sortierung
}

interface OwnershipHistoryPoint {
  quarter: string
  shares: number
  value: number
  portfolioPercentage: number
  exists: boolean
}

const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett – Berkshire Hathaway',
  ackman: 'Bill Ackman – Pershing Square Capital Management',
  gates: 'Bill & Melinda Gates Foundation Trust',
  // ... rest of the investor names
}

// Utility Functions for Company Ownership
const getTicker = (position: Position): string => {
  if (position.ticker) return position.ticker
  const stock = stocks.find(s => s.cusip === position.cusip)
  if (stock?.ticker) return stock.ticker
  return position.cusip.replace(/0+$/, '')
}

const getCleanCompanyName = (position: Position): string => {
  let name = position.name
  const ticker = getTicker(position)
  
  if (ticker && name) {
    if (name.startsWith(`${ticker} - `)) {
      return name.substring(ticker.length + 3)
    }
    if (name.startsWith(`${ticker} – `)) {
      return name.substring(ticker.length + 3)
    }
    if (name === ticker) {
      return ticker
    }
  }
  
  return name
}

const getAllCompanies = (snapshots: any[]): CompanyInfo[] => {
  // ✅ NUR aktuelle Holdings aus dem letzten Snapshot
  const latestSnapshot = snapshots[snapshots.length - 1]
  if (!latestSnapshot) return []
  
  const companiesMap = new Map<string, { ticker: string; name: string; totalValue: number }>()
  
  // Aggregiere Werte für jede CUSIP
  latestSnapshot.data.positions.forEach((position: Position) => {
    const existing = companiesMap.get(position.cusip)
    
    if (existing) {
      existing.totalValue += position.value
    } else {
      const ticker = getTicker(position)
      const cleanName = getCleanCompanyName(position)
      
      companiesMap.set(position.cusip, {
        ticker,
        name: cleanName,
        totalValue: position.value
      })
    }
  })
  
  return Array.from(companiesMap.entries())
    .map(([cusip, { ticker, name, totalValue }]) => ({
      cusip,
      ticker,
      name,
      displayName: ticker !== name ? `${ticker} - ${name}` : name,
      totalValue
    }))
    .sort((a, b) => b.totalValue - a.totalValue) // ✅ Sortiere nach Wert, nicht alphabetisch
}

const calculatePortfolioPercentage = (position: Position, totalValue: number): number => {
  return totalValue > 0 ? (position.value / totalValue) * 100 : 0
}

const generateOwnershipHistory = (snapshots: any[], selectedCusip: string): OwnershipHistoryPoint[] => {
  return snapshots
    .map(snapshot => {
      // ✅ FIXED: Aggregiere alle Positionen mit derselben CUSIP (wie in mergePositions)
      const matchingPositions = snapshot.data.positions.filter((p: Position) => p.cusip === selectedCusip)
      
      const aggregatedShares = matchingPositions.reduce((sum: number, p: Position) => sum + p.shares, 0)
      const aggregatedValue = matchingPositions.reduce((sum: number, p: Position) => sum + p.value, 0)
      
      const totalValue = snapshot.data.positions.reduce((sum: number, p: Position) => sum + p.value, 0)
      
      return {
        quarter: snapshot.quarter,
        shares: aggregatedShares,
        value: aggregatedValue,
        portfolioPercentage: aggregatedShares > 0 ? (aggregatedValue / totalValue) * 100 : 0,
        exists: matchingPositions.length > 0
      }
    })
    .sort((a, b) => a.quarter.localeCompare(b.quarter))
}

// Company Ownership History Component
function CompanyOwnershipHistory({ snapshots, investorName }: { snapshots: any[], investorName: string }) {
  const companies = useMemo(() => getAllCompanies(snapshots), [snapshots])
  
  // ✅ IMPROVED: Standard auf das wertvollste Unternehmen setzen (erstes in sortierter Liste)
  const defaultCompany = useMemo(() => {
    return companies[0]?.cusip || ''
  }, [companies])
  
  const [selectedCompany, setSelectedCompany] = useState<string>(defaultCompany)
  
  // ✅ Update selectedCompany wenn defaultCompany sich ändert
  useEffect(() => {
    if (defaultCompany && defaultCompany !== selectedCompany) {
      setSelectedCompany(defaultCompany)
    }
  }, [defaultCompany])
  
  const selectedCompanyInfo = companies.find(c => c.cusip === selectedCompany)
  const ownershipHistory = useMemo(() => 
    generateOwnershipHistory(snapshots, selectedCompany), 
    [snapshots, selectedCompany]
  )
  
  const latestData = ownershipHistory[ownershipHistory.length - 1]
  const previousData = ownershipHistory[ownershipHistory.length - 2]
  
  const sharesChange = latestData && previousData ? latestData.shares - previousData.shares : 0
  const percentageChange = latestData && previousData ? latestData.portfolioPercentage - previousData.portfolioPercentage : 0
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value)
  }
  
  const formatShares = (value: number) => {
    return new Intl.NumberFormat('de-DE').format(value)
  }

  if (!selectedCompanyInfo) return null

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Einzelunternehmen-Analyse
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Verfolge {investorName}s Ownership-Geschichte für einzelne Unternehmen über die Zeit
        </p>
      </div>

      {/* Company Selector */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Unternehmen auswählen</h3>
        </div>
        
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {companies.map(company => (
            <option key={company.cusip} value={company.cusip}>
              {company.displayName} {company.totalValue ? `(${formatCurrency(company.totalValue)})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-green-400" />
            </div>
            <h4 className="text-sm font-medium text-gray-400">Aktuelle Shares</h4>
          </div>
          <p className="text-2xl font-bold text-white">
            {latestData ? formatShares(latestData.shares) : '0'}
          </p>
          {sharesChange !== 0 && (
            <p className={`text-sm flex items-center gap-1 mt-2 ${sharesChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {sharesChange > 0 ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
              {sharesChange > 0 ? '+' : ''}{formatShares(sharesChange)} vs letztes Quartal
            </p>
          )}
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-blue-400" />
            </div>
            <h4 className="text-sm font-medium text-gray-400">Aktueller Wert</h4>
          </div>
          <p className="text-2xl font-bold text-white">
            {latestData ? formatCurrency(latestData.value) : '$0'}
          </p>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-purple-400" />
            </div>
            <h4 className="text-sm font-medium text-gray-400">Portfolio-Anteil</h4>
          </div>
          <p className="text-2xl font-bold text-white">
            {latestData ? `${latestData.portfolioPercentage.toFixed(1)}%` : '0%'}
          </p>
          {percentageChange !== 0 && (
            <p className={`text-sm flex items-center gap-1 mt-2 ${percentageChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {percentageChange > 0 ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
              {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}% vs letztes Quartal
            </p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Portfolio Percentage Chart */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Portfolio-Anteil über Zeit</h3>
              <p className="text-sm text-gray-400">{selectedCompanyInfo.ticker}</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ownershipHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="quarter" 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => value.replace('Q', 'Q')}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value: any) => [`${value.toFixed(2)}%`, 'Portfolio-Anteil']}
                labelFormatter={(label) => `Quartal: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="portfolioPercentage"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Shares Chart */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Anzahl Aktien über Zeit</h3>
              <p className="text-sm text-gray-400">{selectedCompanyInfo.ticker}</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ownershipHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="quarter" 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => value.replace('Q', 'Q')}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
                  return value.toString()
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                formatter={(value: any) => [formatShares(value), 'Aktien']}
                labelFormatter={(label) => `Quartal: ${label}`}
              />
              <Bar 
                dataKey="shares" 
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white">Detaillierte Historie</h3>
          <p className="text-sm text-gray-400 mt-1">Quartalsweise Entwicklung für {selectedCompanyInfo.ticker}</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr className="text-sm text-gray-400">
                <th className="text-left p-4 font-medium">Quartal</th>
                <th className="text-right p-4 font-medium">Aktien</th>
                <th className="text-right p-4 font-medium">Wert (USD)</th>
                <th className="text-right p-4 font-medium">Portfolio %</th>
                <th className="text-right p-4 font-medium">Veränderung</th>
              </tr>
            </thead>
            <tbody>
              {ownershipHistory.map((data, index) => {
                const previousEntry = index > 0 ? ownershipHistory[index - 1] : null
                const sharesChange = previousEntry ? data.shares - previousEntry.shares : 0
                const isNew = !previousEntry?.exists && data.exists
                const isSold = previousEntry?.exists && !data.exists
                
                return (
                  <tr key={data.quarter} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 font-medium text-white">{data.quarter}</td>
                    <td className="p-4 text-right font-mono text-gray-300">
                      {data.exists ? formatShares(data.shares) : '—'}
                    </td>
                    <td className="p-4 text-right font-mono text-gray-300">
                      {data.exists ? formatCurrency(data.value) : '—'}
                    </td>
                    <td className="p-4 text-right font-mono text-gray-300">
                      {data.exists ? `${data.portfolioPercentage.toFixed(2)}%` : '—'}
                    </td>
                    <td className="p-4 text-right">
                      {isNew ? (
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                          Neukauf
                        </span>
                      ) : isSold ? (
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                          Verkauft
                        </span>
                      ) : sharesChange !== 0 ? (
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          sharesChange > 0 
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}>
                          {sharesChange > 0 ? '+' : ''}{formatShares(sharesChange)}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Kompakte Newsletter Komponente
function CompactNewsletterSignup({ investorName }: { investorName: string }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    
    if (!email.trim()) {
      setStatus('error')
      setMessage('Bitte gib eine E-Mail-Adresse ein')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage(data.message || 'Vielen Dank für deine Anmeldung!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Da ist etwas schiefgegangen.')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Verbindungsfehler. Bitte versuche es nochmal.')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-4">
        <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
          <CheckIcon className="w-4 h-4 text-green-400" />
        </div>
        <p className="text-sm text-green-400 font-medium mb-1">Erfolgreich angemeldet!</p>
        <p className="text-xs text-gray-500">Du erhältst Updates zu allen Investoren</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder="deine@email.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'loading'}
          className="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          required
        />
        
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full px-3 py-2 text-sm bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {status === 'loading' ? (
            <>
              <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              Anmelden...
            </>
          ) : (
            <>
              <EnvelopeIcon className="w-3 h-3" />
              Abonnieren
            </>
          )}
        </button>
      </form>
      
      {status === 'error' && message && (
        <p className="text-xs text-red-400 text-center">{message}</p>
      )}
    </div>
  )
}

function splitInvestorName(full: string) {
  const [name, subtitle] = full.split(' – ')
  return { name, subtitle }
}

function getPeriodFromDate(dateStr: string) {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

function formatCurrency(amount: number, currency: 'EUR' | 'USD' = 'USD') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function mergePositions(raw: { cusip: string; shares: number; value: number }[]) {
  const map = new Map<string, { shares: number; value: number }>()
  raw.forEach(p => {
    const prev = map.get(p.cusip)
    if (prev) {
      prev.shares += p.shares
      prev.value += p.value
    } else {
      map.set(p.cusip, { shares: p.shares, value: p.value })
    }
  })
  return map
}

type InvestorPageProps = {
  params: { slug: string }
}

export default function InvestorPage({ params: { slug } }: InvestorPageProps) {
  const router = useRouter()
  const titleFull = investorNames[slug] ?? slug
  const { name: mainName, subtitle } = splitInvestorName(titleFull)
  const [tab, setTab] = useState<Tab>('holdings')
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'companies' | 'sectors' | 'dividends'>('overview')
  const [showNewsletter, setShowNewsletter] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  
  // Animation refs
  const [heroRef, heroVisible] = useIntersectionObserver(0.3);
  const [chartsRef, chartsVisible] = useIntersectionObserver(0.1);
  
  // Load user data for premium check
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
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        setUser(null)
      } finally {
        setUserLoading(false)
      }
    }

    loadUser()
  }, [])

  // Unified AI Handler
  const handleAIChat = () => {
    if (!user) {
      const currentUrl = window.location.pathname
      const targetUrl = `/analyse/ai?investor=${slug}`
      router.push(`/auth/signin?redirect=${encodeURIComponent(targetUrl)}`)
      return
    }

    if (!user.isPremium) {
      router.push('/analyse/ai')
      return
    }

    router.push(`/analyse/ai?investor=${slug}`)
  }

  const snapshots = holdingsHistory[slug]
  
  if (!Array.isArray(snapshots) || snapshots.length < 1) return notFound()

  // Header data
  const latest = snapshots[snapshots.length - 1].data
  const previous = snapshots.length >= 2 
    ? snapshots[snapshots.length - 2].data 
    : { positions: [], date: '', totalValue: 0 }
  
  const formattedDate = latest.date?.split('-').reverse().join('.') || '–'
  const period = latest.date ? getPeriodFromDate(latest.date) : '–'

  // Build history for buys/sells
  const buildHistory = (isBuy: boolean): HistoryGroup[] =>
    snapshots.map((snap, idx) => {
      const prevRaw = idx > 0 ? snapshots[idx - 1].data.positions : []
      const prevMap = new Map<string, number>()
      prevRaw.forEach(p => prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares))

      const mergedEntries = Array.from(mergePositions(snap.data.positions).entries())
        .map(([cusip, { shares, value }]) => {
          const originalPosition = snap.data.positions.find(p => p.cusip === cusip)
          const stockData = stocks.find(s => s.cusip === cusip)
          
          let ticker = originalPosition?.ticker || stockData?.ticker || cusip.replace(/0+$/, '')
          let displayName = originalPosition?.name || stockData?.name || cusip
          
          const formattedName = ticker && displayName && ticker !== displayName 
            ? `${ticker} - ${displayName}`
            : displayName
          
          return { cusip, shares, value, name: formattedName, ticker }
        })

      const seen = new Set(mergedEntries.map(e => e.cusip))
      for (const [cusip, prevShares] of prevMap.entries()) {
        if (!seen.has(cusip)) {
          const stockData = stocks.find(s => s.cusip === cusip)
          let ticker = stockData?.ticker || cusip.replace(/0+$/, '')
          let displayName = stockData?.name || cusip
          
          const formattedName = ticker && displayName && ticker !== displayName 
            ? `${ticker} - ${displayName}`
            : displayName
            
          mergedEntries.push({ cusip, shares: 0, value: 0, name: formattedName, ticker })
        }
      }

      const full = mergedEntries.map(p => {
        const prevShares = prevMap.get(p.cusip) || 0
        const delta = p.shares - prevShares
        return { ...p, deltaShares: delta, pctDelta: prevShares > 0 ? delta / prevShares : 0 }
      })

      return {
        period: getPeriodFromDate(snap.data.date),
        items: full.filter(p => isBuy ? p.deltaShares > 0 : p.deltaShares < 0)
      }
    }).reverse()

  const buysHistory = buildHistory(true)
  const sellsHistory = buildHistory(false)

  // Top 10 positions
  const prevMap = new Map<string, number>()
  previous.positions.forEach(p => prevMap.set(p.cusip, (prevMap.get(p.cusip) || 0) + p.shares))

  const mergedHoldings = Array.from(mergePositions(latest.positions).entries())
    .map(([cusip, { shares, value }]) => {
      const prevShares = prevMap.get(cusip) || 0
      const delta = shares - prevShares
      
      const originalPosition = latest.positions.find(p => p.cusip === cusip)
      const stockData = stocks.find(s => s.cusip === cusip)
      
      let ticker = originalPosition?.ticker || stockData?.ticker || cusip.replace(/0+$/, '')
      let displayName = originalPosition?.name || stockData?.name || cusip
      
      const formattedName = ticker && displayName && ticker !== displayName 
        ? `${ticker} - ${displayName}`
        : displayName
      
      return {
        cusip, name: formattedName, ticker, shares, value,
        deltaShares: delta, pctDelta: prevShares > 0 ? delta / prevShares : 0
      }
    })

  const sortedHold = mergedHoldings.sort((a, b) => b.value - a.value)
  const holdings = sortedHold
  const totalVal = holdings.reduce((s, p) => s + p.value, 0)
  const top10 = holdings.slice(0, 10).map(p => ({ 
    name: p.name,
    ticker: p.ticker, // ✅ Ticker hinzufügen
    percent: (p.value / totalVal) * 100 
  }))

  // Value history
  const valueHistory = snapshots.map(snap => {
    const total = snap.data.positions.reduce((sum, p) => sum + p.value, 0)
    return { period: getPeriodFromDate(snap.data.date), value: total }
  })

  // Articles
  let articles: Article[] = []
  if (slug === 'buffett') articles = articlesBuffett
  if (slug === 'ackman') articles = articlesAckman
  if (slug === 'gates') articles = articlesGates

  // Cash series for Buffett
  let cashSeries: { period: string; cash: number }[] = []
  if (slug === 'buffett') {
    const list = cashPositions.buffett || []
    cashSeries = list.map(snap => ({
      period: getPeriodFromDate(snap.date),
      cash: snap.cash
    })).reverse()
  }

  const isNewInvestor = snapshots.length === 1

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      
      {/* Verbesserte Hero Section */}
      <section className="relative overflow-hidden bg-gray-950 noise-bg pt-24 pb-20">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-green-500/8 via-gray-950 to-gray-950"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/4 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-blue-500/3 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link 
              href="/superinvestor" 
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm group"
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Zurück zu Super-Investoren
            </Link>
          </div>
          
          {/* New Investor Info */}
          {isNewInvestor && (
            <div className="mb-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <StarIcon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-blue-400 font-medium text-sm">Neu hinzugefügter Investor</p>
                  <p className="text-gray-400 text-xs">Historische Daten werden in den kommenden Quartalen ergänzt</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Hero Content */}
          <div ref={heroRef} className={`transform transition-all duration-1000 ${
            heroVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}>
            
            {/* Main Hero Card */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5 rounded-3xl blur-2xl"></div>
              
              <div className="relative bg-gray-900/80 border border-gray-800 rounded-3xl p-8 lg:p-12 backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {slug === 'buffett' && (
                      <div className="absolute -top-3 -right-3 z-10">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                          <span className="text-black text-xl">👑</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="relative">
                      <div className="absolute -inset-3 bg-gradient-to-br from-green-500/30 via-blue-500/20 to-green-500/30 rounded-full blur-lg opacity-60"></div>
                      <div className="relative">
                        <InvestorAvatar
                          name={mainName}
                          imageUrl={`/images/${slug}.png`}
                          size="xl"
                          className="ring-4 ring-white/10 shadow-2xl"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Name & Info mit Unified AI Buttons */}
                  <div className="flex-1 text-center lg:text-left space-y-4">
                    <div>
                      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                        <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                          {mainName}
                        </span>
                      </h1>
                      {subtitle && (
                        <p className="text-xl sm:text-2xl text-gray-300 font-medium mt-3">
                          {subtitle}
                        </p>
                      )}
                    </div>
                    
                    {/* Meta Badges */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium backdrop-blur-sm">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{period}</span>
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 border border-gray-700/50 text-gray-300 rounded-full text-sm backdrop-blur-sm">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span>Aktualisiert {formattedDate}</span>
                      </div>
                    </div>
                    
                    {/* Unified AI Buttons */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-4">
                      {/* Unified AI Button */}
                      <button
                        onClick={handleAIChat}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                      >
                        {userLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Lade...</span>
                          </>
                        ) : !user ? (
                          <>
                            <LockClosedIcon className="w-5 h-5" />
                            <span>AI Chat (Anmelden)</span>
                          </>
                        ) : !user.isPremium ? (
                          <>
                            <SparklesIcon className="w-5 h-5" />
                            <span>FinClue AI (Premium)</span>
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="w-5 h-5" />
                            <span>FinClue AI</span>
                          </>
                        )}
                      </button>
                      
                      {/* Newsletter Button - Kompakt */}
                      <button
                        onClick={() => setShowNewsletter(!showNewsletter)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 text-gray-300 hover:text-white rounded-lg transition-all duration-200"
                      >
                        <EnvelopeIcon className="w-4 h-4" />
                        <span>Newsletter</span>
                        {showNewsletter ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Portfolio Value */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/15 to-emerald-500/15 rounded-2xl blur-xl"></div>
                    <div className="relative bg-gray-800/80 border border-gray-700 rounded-2xl p-6 lg:p-8 backdrop-blur-sm min-w-[280px] text-center lg:text-right">
                      <div className="flex items-center justify-center lg:justify-end gap-2 mb-3">
                        <ChartBarIcon className="w-5 h-5 text-green-400" />
                        <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">
                          Portfolio-Wert
                        </p>
                      </div>
                      <p className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight">
                        <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                          {formatCurrency(totalVal, 'USD')}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500 mt-2 flex items-center justify-center lg:justify-end gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                        {holdings.length} Positionen
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Newsletter Section */}
            {showNewsletter && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 rounded-2xl blur-xl"></div>
                <div className="relative bg-gray-900/60 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="max-w-lg mx-auto">
                    <div className="text-center mb-4">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <EnvelopeIcon className="w-5 h-5 text-green-400" />
                        <h3 className="text-lg font-semibold text-white">Investment Updates</h3>
                      </div>
                      <p className="text-gray-400 text-sm">
                        Quartalsweise Insights zu {mainName} und anderen Top-Investoren
                      </p>
                    </div>
                    <CompactNewsletterSignup investorName={mainName} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Floating AI Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="relative group">
          <button
            onClick={handleAIChat}
            className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-full shadow-lg hover:shadow-purple-500/25 transition-all duration-200 flex items-center justify-center hover:scale-110"
            title={`FinClue AI für ${mainName}`}
          >
            {!user ? (
              <LockClosedIcon className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            ) : !user.isPremium ? (
              <LockClosedIcon className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            ) : (
              <SparklesIcon className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            )}
          </button>
          
          <div className="absolute bottom-16 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {!user ? 'Anmelden für FinClue AI' : 
             !user.isPremium ? 'Premium für FinClue AI' : 
             `FinClue AI für ${mainName}`}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Tabs & Table */}
        <div className="mb-16">
          <InvestorTabs
            tab={tab}
            onTabChange={(newTab: Tab) => {
              if (
                newTab === 'holdings' ||
                newTab === 'buys' ||
                newTab === 'sells' ||
                newTab === 'activity' ||
                newTab === 'analytics' ||
                newTab === 'ai' ||
                newTab === 'filings' 
              ) {
                setTab(newTab)
                // Reset analytics view when switching tabs
                if (newTab === 'analytics') {
                  setAnalyticsView('overview')
                }
              }
            }}
            holdings={holdings}
            buys={buysHistory}
            sells={sellsHistory}
          />
        </div>

        {/* Holdings Tab mit Portfolio Analysis */}
    
{/* Holdings Tab mit kompakten Top 10 */}
{tab === 'holdings' && (
  <div ref={chartsRef} className={`transform transition-all duration-1000 ${
    chartsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
  }`}>
    
    {/* Portfolio Insights direkt oben */}
    <div className="mb-12">
      <PortfolioAnalysisInline
        investorName={mainName}
        currentPositions={holdings}
        previousPositions={previous.positions}
      />
    </div>
    
    {/* ✅ ERSTE ZEILE: 3-Spalten mit kompakten Top 10 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      {/* Spalte 1: Kompakte Top 10 Positionen */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Top 10 Positionen</h3>
            <p className="text-xs text-gray-400">Größte Holdings</p>
          </div>
        </div>
        
        {/* ✅ KOMPAKTE Liste - alle 10 ohne Scrollen */}
        <div className="space-y-2">
          {top10.map((item, index) => {
            const tickerMatch = item.name.match(/^([A-Z]{1,5})\s*[-–]\s*(.+)/)
            const ticker = item.ticker || (tickerMatch ? tickerMatch[1] : null)
            const cleanName = tickerMatch ? tickerMatch[2] : item.name
            
            return (
              <div 
                key={index} 
                className="flex items-center gap-3 group hover:bg-gray-800/20 p-2 rounded-lg transition-all duration-200"
              >
                {/* Rank */}
                <div className="w-5 h-5 rounded-full bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-gray-300">
                    {index + 1}
                  </span>
                </div>
                
                {/* Logo - kleiner */}
                {ticker && (
                  <div className="w-6 h-6 rounded-lg overflow-hidden bg-white/5 border border-gray-700/30 group-hover:border-gray-600/50 transition-colors flex-shrink-0">
                    <Logo
                      ticker={ticker}
                      alt={`${ticker} Logo`}
                      className="w-full h-full"
                      padding="small"
                    />
                  </div>
                )}
                
                {/* Info - kompakt */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      {/* Ticker + Company in einer Zeile */}
                      <div className="flex items-center gap-1.5">
                        {ticker && (
                          <span className="text-green-400 font-mono text-xs font-semibold flex-shrink-0">
                            {ticker}
                          </span>
                        )}
                        <span className="text-white text-xs font-medium truncate">
                          {cleanName.length > 16 ? cleanName.substring(0, 16) + '...' : cleanName}
                        </span>
                      </div>
                    </div>
                    
                    {/* Percentage - kompakt */}
                    <div className="flex-shrink-0 ml-2">
                      <span className="text-white font-bold text-xs">
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Mini Progress Bar */}
                  <div className="w-full bg-gray-800/50 rounded-full h-1 mt-1">
                    <div
                      className="h-1 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((item.percent / top10[0].percent) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Spalte 2: Kompakte Sektor-Übersicht */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Top 5 Sektoren</h3>
            <p className="text-xs text-gray-400">Verteilung</p>
          </div>
        </div>
        
        {/* Kompakte Sektor-Liste */}
        <div className="space-y-4">
          {(() => {
            const sectorMap = new Map()
            holdings.forEach(holding => {
              const englishSector = getSectorFromPosition({
                cusip: holding.cusip,
                ticker: holding.ticker
              })
              const sector = translateSector(englishSector)
              
              const current = sectorMap.get(sector) || { value: 0, count: 0 }
              sectorMap.set(sector, {
                value: current.value + holding.value,
                count: current.count + 1
              })
            })
            
            return Array.from(sectorMap.entries())
              .map(([sector, { value, count }]) => ({
                sector,
                value,
                count,
                percentage: (value / totalVal) * 100
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
          })().map((sector, index) => {
            const colors = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6']
            const color = colors[index] || '#9CA3AF'
            
            return (
              <div key={sector.sector} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium text-white">
                      {sector.sector}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-white">
                    {sector.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-800/50 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      backgroundColor: color,
                      width: `${sector.percentage}%`
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Spalte 3: Portfolio-Kennzahlen */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Portfolio-Stats</h3>
            <p className="text-xs text-gray-400">Kennzahlen</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Holdings Count */}
          <div className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="text-xl font-bold text-white mb-1">
              {holdings.length}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Holdings</div>
          </div>
          
          {/* Top 10 Concentration */}
          <div className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="text-xl font-bold text-green-400 mb-1">
              {((holdings.slice(0, 10).reduce((sum, h) => sum + h.value, 0) / totalVal) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Top 10</div>
          </div>
          
          {/* Largest Position */}
          <div className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="text-xl font-bold text-blue-400 mb-1">
              {holdings[0] ? (holdings[0].value / totalVal * 100).toFixed(1) : '0'}%
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Größte</div>
          </div>
          
          {/* Data Coverage */}
          <div className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="text-xl font-bold text-purple-400 mb-1">
              {snapshots.length}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Quartale</div>
          </div>
        </div>
        
        {/* Additional Info */}
        <div className="space-y-3 pt-4 border-t border-gray-800/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Ø Position:</span>
            <span className="text-white font-medium">
              ${(totalVal / holdings.length / 1000000).toFixed(0)}M
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Gesamtwert:</span>
            <span className="text-white font-medium">
              ${(totalVal / 1000000000).toFixed(1)}B
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* ✅ ZWEITE ZEILE: Portfolio-Verlauf (volle Breite, viel Platz!) */}
    {snapshots.length > 1 && (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/60 transition-all duration-200 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
            <ArrowTrendingUpIcon className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Portfolio-Verlauf</h3>
            <p className="text-xs text-gray-400">Entwicklung über Zeit</p>
          </div>
        </div>
        <div className="h-80">
          <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback message={error.message} />}>
            <PortfolioValueChart data={valueHistory} />
          </ErrorBoundary>
        </div>
      </div>
    )}

    {/* Cash Position Chart (nur für Buffett) - Full Width */}
    {slug === 'buffett' && cashSeries.length > 0 && (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Cash-Position (Treasuries)</h3>
            <p className="text-xs text-gray-400">
              Entwicklung der liquiden Mittel über die letzten Quartale
            </p>
          </div>
        </div>
        
        <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback message={error.message} />}>
          <div className="cash-chart-container h-64">
            <CashPositionChart data={cashSeries} />
          </div>
        </ErrorBoundary>
        
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Aktueller Cash-Bestand:</span>
            <span className="text-yellow-400 font-semibold text-lg">
              {formatCurrency(cashSeries[cashSeries.length - 1]?.cash || 0, 'USD')}
            </span>
          </div>
        </div>
      </div>
    )}
  </div>
)}

{tab === 'analytics' && (
  <div className="space-y-8">
    <div className="text-center mb-8">
      <h2 className="text-3xl font-bold text-white mb-4">
        Portfolio-Analytik
      </h2>
      <p className="text-gray-400 max-w-2xl mx-auto">
        Detaillierte Einblicke in {mainName}s Investment-Strategie, 
        Sektor-Allokation, Dividenden-Strategie und Portfolio-Charakteristika
      </p>
    </div>
    
    {/* ✅ 3. ERWEITERTE Tab Switcher für Analytics Sub-Sections */}
    <div className="flex flex-wrap gap-2 justify-center mb-8">
      <button
        onClick={() => setAnalyticsView('overview')}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          analyticsView === 'overview' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
      >
        Übersicht
      </button>
      <button
        onClick={() => setAnalyticsView('companies')}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          analyticsView === 'companies' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
      >
        Einzelunternehmen
      </button>
      <button
        onClick={() => setAnalyticsView('sectors')}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          analyticsView === 'sectors' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
      >
        Sektoren
      </button>
      {/* ✅ 4. NEUER Dividenden-Tab */}
      <button
        onClick={() => setAnalyticsView('dividends')}
        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          analyticsView === 'dividends' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
      >
        Dividenden
      </button>
    </div>

    {/* Overview Section - bleibt unverändert */}
    {analyticsView === 'overview' && (
      <>
        {/* Stats Grid - bleibt unverändert */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Portfolio-Wert</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              ${(totalVal / 1000000000).toFixed(1)}B
            </p>
            <p className="text-xs text-gray-500">Gesamtwert aller Positionen</p>
          </div>
          
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <StarIcon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Anzahl Holdings</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {holdings.length}
            </p>
            <p className="text-xs text-gray-500">Verschiedene Positionen</p>
          </div>
          
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Top 10 Anteil</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {((holdings.slice(0, 10).reduce((sum, h) => sum + h.value, 0) / totalVal) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">Konzentration</p>
          </div>
          
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Quartale</h3>
            </div>
            <p className="text-2xl font-bold text-white">
              {snapshots.length}
            </p>
            <p className="text-xs text-gray-500">Verfügbare Daten</p>
          </div>
        </div>
        
        {/* Sektor-Chart bleibt unverändert */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Sektor-Verteilung</h3>
              <p className="text-sm text-gray-400">Basierend auf echten Sektor-Daten</p>
            </div>
          </div>
          
          <SectorBreakdownChart
            data={(() => {
              const sectorMap = new Map()
              holdings.forEach(holding => {
                const englishSector = getSectorFromPosition({
                  cusip: holding.cusip,
                  ticker: holding.ticker
                })
                
                const sector = translateSector(englishSector)
                
                const current = sectorMap.get(sector) || { value: 0, count: 0 }
                sectorMap.set(sector, {
                  value: current.value + holding.value,
                  count: current.count + 1
                })
              })
              
              return Array.from(sectorMap.entries())
                .map(([sector, { value, count }]) => ({
                  sector,
                  value,
                  count,
                  percentage: (value / totalVal) * 100
                }))
                .sort((a, b) => b.value - a.value)
            })()}
          />
        </div>
      </>
    )}

    {/* ✅ 5. UNCHANGED: Company Analysis Section */}
    {analyticsView === 'companies' && (
      <CompanyOwnershipHistory 
        snapshots={snapshots}
        investorName={mainName}
      />
    )}

    {/* ✅ 6. UNCHANGED: Advanced Sectors Section */}
    {analyticsView === 'sectors' && (
      <AdvancedSectorAnalysis 
        snapshots={snapshots}
        investorName={mainName}
      />
    )}

    {/* ✅ 7. NEUE Dividenden Section */}
    {analyticsView === 'dividends' && (
      <DividendAnalysisSection
        investorName={mainName}
        currentPositions={holdings}
        snapshots={snapshots}
      />
    )}
  </div>
)}

        {/* AI Tab Content */}
        {tab === 'ai' && (
          <div className="mb-16">
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 backdrop-blur-sm">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SparklesIcon className="w-10 h-10 text-purple-400" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3">
                  FinClue AI Portfolio-Analyse
                </h3>
                
                <p className="text-gray-400 mb-6 leading-relaxed">
                  Starte ein intelligentes Gespräch über {mainName}s Portfolio, 
                  Investmentstrategien und Marktpositionen. Erhalte datenbasierte 
                  Antworten mit echten 13F-Filing Daten und Portfolio-Insights.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 text-sm">
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>Portfolio-Bewegungen</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Sektor-Analyse</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>Strategiebewertung</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                    <span>Performance-Vergleiche</span>
                  </div>
                </div>
                
                <button
                  onClick={handleAIChat}
                  className="w-full max-w-sm mx-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-purple-500/25 hover:scale-105"
                >
                  {userLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Lade...</span>
                    </>
                  ) : !user ? (
                    <>
                      <LockClosedIcon className="w-5 h-5" />
                      <span>Anmelden für AI Chat</span>
                    </>
                  ) : !user.isPremium ? (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      <span>Premium für AI Chat</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      <span>AI Chat starten</span>
                    </>
                  )}
                </button>
                
                <div className="mt-4 text-xs text-gray-500">
                  Powered by FinClue AI • Echte 13F-Daten • Keine Anlageberatung
                  {!user?.isPremium && (
                    <span className="block mt-1 text-yellow-400">Premium-Feature</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filings Tab */}
        {tab === 'filings' && (
          <FilingsTab 
            investorSlug={slug}
            snapshots={snapshots}
          />
        )}

        {/* Articles & Commentaries */}
        {articles.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
                <UserIcon className="w-4 h-4" />
                Artikel & Kommentare
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Insights von
                <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent"> {mainName}</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Erhalte Einblicke in die Denkweise und Strategien durch Original-Artikel und Kommentare
              </p>
            </div>
            <ArticleList articles={articles} />
          </section>        
        )}
      </div>
    </div>
  )
}