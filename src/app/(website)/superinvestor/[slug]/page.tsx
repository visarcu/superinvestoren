// src/app/superinvestor/[slug]/page.tsx - CLEAN DESIGN VERSION
'use client'

import React, { useState, FormEvent, useEffect, useMemo } from 'react'
import { notFound, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  ArrowTopRightOnSquareIcon,
  EnvelopeIcon,
  ArrowUpRightIcon,
  UserIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  StarIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockClosedIcon,
  LightBulbIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

// ✅ OPTIMIZED: Replaced 38MB client imports with API hook
import { useInvestorData } from '@/hooks/useInvestorData'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import InvestorTabs, { Tab } from '@/components/InvestorTabs'
import LoadingSpinner from '@/components/LoadingSpinner'
import PortfolioValueChart from '@/components/PortfolioValueChart'
import InvestorAvatar from '@/components/InvestorAvatar'
import cashPositions from '@/data/cashPositions'
import CashPositionChart from '@/components/CashPositionChart'
import { supabase } from '@/lib/supabaseClient'
import FilingsTab from '@/components/FilingsTab'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'
import AdvancedSectorAnalysis from '@/components/AdvancedSectorAnalysis'
import SectorBreakdownChart from '@/components/SectorBreakdownChart'
import Logo from '@/components/Logo'
import { CurrencyProvider, useCurrency } from '@/lib/CurrencyContext'

import articlesBuffett from '@/data/articles/buffett.json'
import articlesAckman from '@/data/articles/ackman.json'
import articlesGates from '@/data/articles/gates.json'
import ArticleList from '@/components/ArticleList'
import type { Article } from '@/components/ArticleList'
import PublicInvestorFollowButton from '@/components/PublicInvestorFollowButton'

// User Interface für Premium-Check
interface User {
  id: string
  email: string
  isPremium: boolean
}


// Position Interface
interface Position {
  cusip: string
  name: string
  shares: number
  value: number
  deltaShares: number
  pctDelta: number
  ticker?: string
  optionType?: 'STOCK' | 'CALL' | 'PUT' | 'OPTION'
  typeInfo?: {
    label: string
    emoji: string
    sentiment: 'bullish' | 'bearish' | 'neutral'
  }
  titleOfClass?: string | null
  putCall?: string | null
}

interface HistoryGroup {
  period: string
  items: Position[]
}

interface CompanyInfo {
  cusip: string
  ticker: string
  name: string
  displayName: string
  totalValue?: number
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
  torray: 'Torray Investment Partners LLC',
  davis: 'Christoper Davis - Davis Selected Advisers',
  altarockpartners: 'Mark Massey - Altarock Partners Llc',
  greenhaven:'Edgar Wachenheim III - Greenhaven Associates Inc',
  vinall:'Robert Vinall - RV Capital AG',
  meridiancontrarian: 'Meridian Contrarian Fund',
  hawkins:' Mason Hawkins - Southeastern Asset Management Inc',
  olstein:'Robert Olstein - Olstein Capital Management',
  peltz: 'Nelson Peltz - Trian Fund Management',
  gregalexander:'Greg Alexander - Conifer Management',
  miller: 'Bill Miller - Miller Value Partners',
  tangen: 'Nicolai Tangen - AKO Capital',
  burry:'Michael Burry - Scion Asset Management',
  pabrai: 'Mohnish Pabrai - Dalal Street Llc',
  kantesaria: 'Dev Kantesaria - Valley Forge Capital Management',
  greenblatt: 'Joel Greenblatt - Gotham Asset Management',
  fisher: 'Ken Fisher - Fisher Asset Management',
  soros:'George Soros - Soros Fund Management Llc',
  haley:'Connor Haley - Alta Fox Capital Management',
  vandenberg: 'Arnold Van Den Berg - Van Den Berg Management',
  dodgecox:'Van Duyn Dodge & E. Morris Cox - Dodge & Cox',
  pzena:'Richard Pzena - Pzena Investment Management',
  mairspower:'Mairs & Power Inc',
  weitz: 'Wallace Weitz - Weitz Investment Management',
  yacktman:'Yacktman Asset Management LP',
  gayner:'Thomas Gayner - Markel Group',
  armitage:'John Armitage - Egerton Capital',
  burn: 'Harry Burn - Sound Shore',
  cantillon:'William von Mueffling - Cantillon Capital Management',
  jensen:'Eric Schoenstein - Jensen Investment Management',
  abrams: 'David Abrams - Abrams Capital Management',
  firsteagle: 'First Eagle Investment Management',
  polen: 'Polen Capital Management',
  tarasoff:'Josh Tarasoff - Greenlea Lane Capital',
  rochon: 'Francois Rochon - Giverny Capital',
  russo: 'Thomas Russo - Gardner Russo & Quinn',
  akre: 'Chuck Akre - Akre Capital Management',
  triplefrond:'Triple Frond Partners',
  whitman: 'Marty Whitman - Third Avenue Management',
  patientcapital:'Samantha McLemore - Patient Capital Management',
  klarman: 'Seth Klarman - Baupost Group',
  makaira: 'Tom Bancroft - Makaira Partners',
  ketterer: 'Sarah Ketterer - Causeway Capital Management',
  train:'Lindsell Train',
  smith: 'Terry Smith - Fundsmith',
  watsa: 'Prem Watsa - Fairfax Financial Holdings',
  lawrence: 'Bryan Lawrence - Oakliff Capital',
  dorsey: 'Pat Dorsey - Dorsey Asset Management',
  hohn:'Chris Hohn - TCI Fund Management',
  hong: 'Dennis Hong - ShawSpring Partners',
  kahn: 'Kahn Brothers Group',
  coleman: 'Chase Coleman - Tiger Global Management',
  dalio:'Ray Dalio - Bridgewater Associates',
  loeb: 'Daniel Loeb - Third Point',
  tepper: 'David Tepper - Appaloosa Management',
  icahn: 'Carl Icahn - Icahn Capital Management',
  lilu: 'Li Lu - Himalaya Capital Management',
  ainslie:'Lee Ainslie - Maverick Capital',
  greenberg:'Glenn Greenberg - Brave Warrior Advisors',
  mandel: 'Stephen Mandel - Lone Pine Capital',
  marks: 'Howard Marks - Oaktree Capital Management',
  rogers:'John Rogers - Ariel Investments',
  ariel_appreciation: 'Ariel Appreciation Fund', 
  ariel_focus: 'Ariel Focus Fund', 
  cunniff: 'Ruane, Cunniff & Goldfarb L.P.',
  spier: 'Guy Spier - Aquamarine Capital',
  chou: 'Francis Chou - Chou Associates',
  sosin: 'Clifford Sosin - CAS Investment Partners',
  welling: 'Glenn Welling - Engaged Capital',
  lou: 'Norbert Lou - Punch Card Management',
  munger: 'Charlie Munger',
  ark_investment_management: 'Catherine Wood',
  druckenmiller: 'Stanley Druckenmiller',
  thiel: 'Peter Thiel - Thiel Macro LLC',

  //mutual funds
  cunniff_sequoia: 'Ruane Cunniff – Sequoia Fund',
  katz: 'David Katz - Matrix Asset Advisors Inc/ny',
  tweedy_browne_fund_inc: 'Tweedy, Browne International Value Fund II - Currency Unhedged',

}

// Option-Styling Helper
const getOptionStyling = (optionType: string | undefined) => {
  if (!optionType) return null
  
  switch (optionType) {
    case 'PUT':
      return {
        badge: 'bg-red-900/20 text-red-400/60 border-red-900/20',
        label: 'PUT',
        icon: '📉'
      }
    case 'CALL':
      return {
        badge: 'bg-green-900/20 text-brand-light/60 border-green-900/20',
        label: 'CALL',
        icon: '📈'
      }
    case 'OPTION':
      return {
        badge: 'bg-gray-800/50 text-theme-muted border-gray-800/30',
        label: 'OPTION',
        icon: '⚡'
      }
    default:
      return null
  }
}

// Option Badge Komponente
const OptionBadge = ({ position }: { position: Position }) => {
  const optionType = position.optionType
  
  if (!optionType || optionType === 'STOCK') return null
  
  const styling = getOptionStyling(optionType)
  if (!styling) return null
  
  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${styling.badge}`}
      title={position.titleOfClass || `${optionType} Option`}
    >
      <span className="opacity-60">{styling.icon}</span>
      {styling.label}
    </span>
  )
}

// Enhanced Company Name mit Option-Badge
const CompanyNameWithOptions = ({ position, showLogo = true }: { position: Position, showLogo?: boolean }) => {
  const ticker = getTicker(position)
  const cleanName = getCleanCompanyName(position)
  
  const content = (
    <div className="flex items-center gap-3">
      {showLogo && ticker && (
        <div className="w-6 h-6 flex-shrink-0 opacity-80">
          <Logo
            ticker={ticker}
            alt={`${ticker} Logo`}
            className="w-full h-full"
            padding="none"
          />
        </div>
      )}
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-theme-primary">
            {ticker || cleanName}
          </span>
          <OptionBadge position={position} />
        </div>
        
        {ticker && cleanName !== ticker && (
          <div className="text-sm text-theme-muted font-normal truncate">
            {cleanName}
          </div>
        )}
        
        {position.titleOfClass && position.optionType && position.optionType !== 'STOCK' && (
          <div className="text-xs text-gray-600 truncate">
            {position.titleOfClass}
          </div>
        )}
      </div>
    </div>
  )
  
  if (ticker) {
    return (
      <Link
        href={`/analyse/stocks/${ticker.toLowerCase()}/super-investors`}
        className="group hover:text-brand-light/80 transition-colors"
      >
        {content}
      </Link>
    )
  }
  
  return content
}

// Utility Functions
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
  const latestSnapshot = snapshots[snapshots.length - 1]
  if (!latestSnapshot) return []
  
  const companiesMap = new Map<string, { ticker: string; name: string; totalValue: number }>()
  
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
    .sort((a, b) => b.totalValue - a.totalValue)
}

const generateOwnershipHistory = (snapshots: any[], selectedCusip: string): OwnershipHistoryPoint[] => {
  return snapshots
    .map(snapshot => {
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

// CompanyOwnershipHistory Komponente
function CompanyOwnershipHistory({ snapshots, investorName }: { snapshots: any[], investorName: string }) {
  const { formatCurrency, formatShares } = useCurrency()
  const companies = useMemo(() => getAllCompanies(snapshots), [snapshots])
  
  const defaultCompany = useMemo(() => {
    return companies[0]?.cusip || ''
  }, [companies])
  
  const [selectedCompany, setSelectedCompany] = useState<string>(defaultCompany)
  
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
  

  if (!selectedCompanyInfo) return null

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-theme-primary mb-4">
          Einzelunternehmen-Analyse
        </h2>
        <p className="text-theme-muted max-w-2xl mx-auto">
          Verfolge {investorName}s Ownership-Geschichte für einzelne Unternehmen über die Zeit
        </p>
      </div>

      {/* Company Selector */}
      <div className="bg-theme-card border border-theme-light rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-theme-primary rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-theme-secondary" />
          </div>
          <h3 className="text-lg font-medium text-theme-primary">Unternehmen auswählen</h3>
        </div>
        
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="w-full px-4 py-3 bg-theme-primary border border-white/5 rounded-lg text-theme-primary focus:outline-none focus:ring-1 focus:ring-green-900/50 focus:border-green-900/50"
        >
          {companies.map(company => (
            <option key={company.cusip} value={company.cusip} className="bg-theme-primary">
              {company.displayName} {company.totalValue ? `(${formatCurrency(company.totalValue)})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-theme-card border border-theme-light rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-green-900/60" />
            </div>
            <h4 className="text-sm font-medium text-theme-muted">Aktuelle Shares</h4>
          </div>
          <p className="text-xl font-medium text-theme-primary">
            {latestData ? formatShares(latestData.shares) : '0'}
          </p>
          {sharesChange !== 0 && (
            <p className={`text-sm flex items-center gap-1 mt-2 ${sharesChange > 0 ? 'text-brand-light/60' : 'text-red-400/60'}`}>
              {sharesChange > 0 ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
              {sharesChange > 0 ? '+' : ''}{formatShares(sharesChange)} vs Q
            </p>
          )}
        </div>

        <div className="bg-theme-card border border-theme-light rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-theme-secondary" />
            </div>
            <h4 className="text-sm font-medium text-theme-muted">Aktueller Wert</h4>
          </div>
          <p className="text-xl font-medium text-theme-primary">
            {latestData ? formatCurrency(latestData.value) : formatCurrency(0)}
          </p>
        </div>

        <div className="bg-theme-card border border-theme-light rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-theme-secondary" />
            </div>
            <h4 className="text-sm font-medium text-theme-muted">Portfolio-Anteil</h4>
          </div>
          <p className="text-xl font-medium text-theme-primary">
            {latestData ? `${formatCurrency(latestData.portfolioPercentage, 'number')}%` : '0%'}
          </p>
          {percentageChange !== 0 && (
            <p className={`text-sm flex items-center gap-1 mt-2 ${percentageChange > 0 ? 'text-brand-light/60' : 'text-red-400/60'}`}>
              {percentageChange > 0 ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
              {percentageChange > 0 ? '+' : ''}{formatCurrency(percentageChange, 'number')}% vs Q
            </p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Portfolio Percentage Chart */}
        <div className="bg-theme-card border border-theme-light rounded-xl p-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-theme-secondary" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-theme-primary">Portfolio-Anteil über Zeit</h3>
              <p className="text-sm text-theme-muted">{selectedCompanyInfo.ticker}</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ownershipHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1c" />
              <XAxis 
                dataKey="quarter" 
                stroke="#4a4a4f"
                fontSize={12}
                tickFormatter={(value) => value.replace('Q', 'Q')}
              />
              <YAxis 
                stroke="#4a4a4f"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0b',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
                formatter={(value: any) => [`${formatCurrency(value, 'number')}%`, 'Portfolio-Anteil']}
                labelFormatter={(label) => `Quartal: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="portfolioPercentage"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, stroke: '#22c55e', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Shares Chart */}
        <div className="bg-theme-card border border-theme-light rounded-xl p-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-theme-secondary" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-theme-primary">Anzahl Aktien über Zeit</h3>
              <p className="text-sm text-theme-muted">{selectedCompanyInfo.ticker}</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ownershipHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1c" />
              <XAxis 
                dataKey="quarter" 
                stroke="#4a4a4f"
                fontSize={12}
                tickFormatter={(value) => value.replace('Q', 'Q')}
              />
              <YAxis 
                stroke="#4a4a4f"
                fontSize={12}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${formatCurrency(value / 1000000, 'number')}M`
                  if (value >= 1000) return `${formatCurrency(value / 1000, 'number')}K`
                  return value.toString()
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0b',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  color: '#ffffff'
                }}
                formatter={(value: any) => [formatShares(value), 'Aktien']}
                labelFormatter={(label) => `Quartal: ${label}`}
              />
              <Bar 
                dataKey="shares" 
                fill="#22c55e"
                opacity={0.8}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-theme-card border border-theme-light rounded-2xl overflow-hidden hover:bg-theme-hover hover:border-white/[0.1] transition-all duration-300">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-medium text-theme-primary">Detaillierte Historie</h3>
          <p className="text-sm text-theme-muted mt-1">Quartalsweise Entwicklung für {selectedCompanyInfo.ticker}</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-theme-secondary/20 border-b border-white/[0.1]">
              <tr className="text-sm text-theme-secondary">
                <th className="text-left p-5 font-semibold tracking-wide">Quartal</th>
                <th className="text-right p-5 font-semibold tracking-wide">Aktien</th>
                <th className="text-right p-5 font-semibold tracking-wide">Wert</th>
                <th className="text-right p-5 font-semibold tracking-wide">Portfolio %</th>
                <th className="text-right p-5 font-semibold tracking-wide">Veränderung</th>
              </tr>
            </thead>
            <tbody>
              {ownershipHistory.map((data, index) => {
                const previousEntry = index > 0 ? ownershipHistory[index - 1] : null
                const sharesChange = previousEntry ? data.shares - previousEntry.shares : 0
                const isNew = !previousEntry?.exists && data.exists
                const isSold = previousEntry?.exists && !data.exists
                
                return (
                  <tr key={data.quarter} className="border-b border-white/[0.04] hover:bg-theme-hover/30 transition-all duration-200">
                    <td className="p-5 font-semibold text-theme-primary">{data.quarter}</td>
                    <td className="p-5 text-right font-mono text-gray-300 text-sm">
                      {data.exists ? formatShares(data.shares) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="p-5 text-right font-mono text-gray-300 text-sm">
                      {data.exists ? formatCurrency(data.value) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="p-5 text-right font-mono text-gray-300 text-sm">
                      {data.exists ? `${formatCurrency(data.portfolioPercentage, 'number')}%` : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="p-5 text-right">
                      {isNew ? (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-brand/10 text-brand-light border border-brand/20">
                          Neukauf
                        </span>
                      ) : isSold ? (
                        <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                          Verkauft
                        </span>
                      ) : sharesChange !== 0 ? (
                        <span className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg ${
                          sharesChange > 0 
                            ? 'bg-brand/10 text-brand-light border border-brand/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {sharesChange > 0 ? '+' : ''}{formatShares(sharesChange)}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
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

// Main Component
function InvestorPageContent({ params: { slug } }: InvestorPageProps) {
  const router = useRouter()
  const { formatCurrency } = useCurrency()
  const titleFull = investorNames[slug] ?? slug
  const { name: mainName, subtitle } = splitInvestorName(titleFull)

  // Tab State
  const [tab, setTab] = useState<Tab>('portfolio')
  const [analyticsView, setAnalyticsView] = useState<'overview' | 'companies' | 'sectors'>('overview')
  const [user, setUser] = useState<User | null>(null)
  const [userLoading, setUserLoading] = useState(true)

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
        }
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setUserLoading(false)
      }
    }

    loadUser()
  }, [])

  // AI Handler
  const handleAIChat = () => {
    if (!user) {
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

  // Data processing
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
          
          return { 
            cusip, 
            shares, 
            value, 
            name: formattedName, 
            ticker,
            deltaShares: 0,
            pctDelta: 0,
            optionType: (originalPosition?.optionType as 'STOCK' | 'CALL' | 'PUT' | 'OPTION') || 'STOCK',
            typeInfo: originalPosition?.typeInfo ? {
              label: originalPosition.typeInfo.label || 'Stock',
              emoji: originalPosition.typeInfo.emoji || '📈',
              sentiment: (originalPosition.typeInfo.sentiment as 'bullish' | 'bearish' | 'neutral') || 'neutral'
            } : undefined,
            titleOfClass: originalPosition?.titleOfClass || null,
            putCall: originalPosition?.putCall || null
          }
        })

      const seen = new Set(mergedEntries.map(e => e.cusip))
      for (const [cusip] of prevMap.entries()) {
        if (!seen.has(cusip)) {
          const stockData = stocks.find(s => s.cusip === cusip)
          let ticker = stockData?.ticker || cusip.replace(/0+$/, '')
          let displayName = stockData?.name || cusip
          
          const formattedName = ticker && displayName && ticker !== displayName 
            ? `${ticker} - ${displayName}`
            : displayName
            
          mergedEntries.push({ 
            cusip, 
            shares: 0, 
            value: 0, 
            name: formattedName, 
            ticker,
            deltaShares: 0,
            pctDelta: 0,
            optionType: 'STOCK',
            typeInfo: undefined,
            titleOfClass: null,
            putCall: null
          })
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

  // Process holdings
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
        cusip, 
        name: formattedName, 
        ticker, 
        shares, 
        value,
        deltaShares: delta, 
        pctDelta: prevShares > 0 ? delta / prevShares : 0,
        optionType: (originalPosition?.optionType as 'STOCK' | 'CALL' | 'PUT' | 'OPTION') || 'STOCK',
        typeInfo: originalPosition?.typeInfo ? {
          label: originalPosition.typeInfo.label || 'Stock',
          emoji: originalPosition.typeInfo.emoji || '📈',
          sentiment: (originalPosition.typeInfo.sentiment as 'bullish' | 'bearish' | 'neutral') || 'neutral'
        } : undefined,
        titleOfClass: originalPosition?.titleOfClass || null,
        putCall: originalPosition?.putCall || null
      }
    })

  const holdings = mergedHoldings.sort((a, b) => b.value - a.value)
  const totalVal = holdings.reduce((s, p) => s + p.value, 0)

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

  return (
    <div className="min-h-screen bg-theme-primary">

      {/* Hero Section */}
      <section className="relative bg-theme-primary pt-8 pb-10">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Main Hero Card - Fey/Quartr Style */}
          <div className="bg-theme-card border border-theme-light rounded-xl p-6 lg:p-8">

            {/* Top Row: Avatar, Name, Follow Button */}
            <div className="flex items-start justify-between gap-6 mb-6">

              {/* Left: Avatar & Name */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <InvestorAvatar
                    name={mainName}
                    imageUrl={`/images/${slug}.png`}
                    size="lg"
                    className="ring-1 ring-theme-light"
                  />
                  {slug === 'buffett' && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/30">
                      <span className="text-[10px]">👑</span>
                    </div>
                  )}
                </div>

                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-theme-primary">
                    {mainName}
                  </h1>
                  {subtitle && (
                    <p className="text-theme-muted text-sm mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Compact Follow Button */}
              <PublicInvestorFollowButton
                investorSlug={slug}
                investorName={mainName}
                compact={true}
              />
            </div>

            {/* Meta Row: Period & Update Date */}
            <div className="flex items-center gap-3 mb-6">
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-md">
                {period}
              </span>
              <span className="text-theme-muted text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                Aktualisiert {formattedDate}
              </span>
            </div>

            {/* Stats Row - Clean Inline Design */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-5 border-t border-theme-light">
              <div>
                <p className="text-xs text-theme-muted uppercase tracking-wider mb-0.5">Portfolio-Wert</p>
                <p className="text-lg font-semibold text-theme-primary">{formatCurrency(totalVal)}</p>
              </div>

              <div className="w-px h-8 bg-theme-light hidden sm:block"></div>

              <div>
                <p className="text-xs text-theme-muted uppercase tracking-wider mb-0.5">Positionen</p>
                <p className="text-lg font-semibold text-theme-primary">{holdings.length}</p>
              </div>

              <div className="w-px h-8 bg-theme-light hidden sm:block"></div>

              <div>
                <p className="text-xs text-theme-muted uppercase tracking-wider mb-0.5">Top 3 Anteil</p>
                <p className="text-lg font-semibold text-theme-primary">
                  {formatCurrency((holdings.slice(0, 3).reduce((sum, h) => sum + h.value, 0) / totalVal) * 100, 'number')}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Tabs */}
        <div className="mb-12">
          <InvestorTabs
            tab={tab}
            onTabChange={(newTab: Tab) => {
              setTab(newTab)
              if (newTab === 'analytics') {
                setAnalyticsView('overview')
              }
            }}
            holdings={holdings}
            buys={buysHistory}
            sells={sellsHistory}
          />
        </div>

        {/* PORTFOLIO TAB */}
        {tab === 'portfolio' && (
          <div className="space-y-10">
            
            {/* Portfolio Value Chart */}
            <div className="bg-theme-card border border-theme-light rounded-xl p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-4 h-4 text-theme-muted" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-theme-primary">Portfolio-Entwicklung</h3>
                  <p className="text-sm text-theme-muted">Historische Wertentwicklung</p>
                </div>
              </div>
              
              <PortfolioValueChart 
                data={valueHistory}
              />
            </div>

            {/* Cash Position Chart (nur für Buffett) */}
            {slug === 'buffett' && cashSeries.length > 0 && (
              <div className="bg-theme-card border border-theme-light rounded-xl p-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="w-4 h-4 text-theme-muted" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-theme-primary">Cash Position</h3>
                    <p className="text-sm text-theme-muted">Berkshire Hathaways Liquiditätsreserven</p>
                  </div>
                </div>
                
                <CashPositionChart 
                  data={cashSeries}
                />
              </div>
            )}

            {/* Sektor Overview */}
            <div className="bg-theme-card border border-theme-light rounded-xl p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-4 h-4 text-theme-muted" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-theme-primary">Sektor-Übersicht</h3>
                  <p className="text-sm text-theme-muted">Diversifikation nach Branchen</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    .slice(0, 6)
                    .map((sector) => (
                      <div key={sector.sector} className="bg-theme-card border border-theme-light rounded-lg p-4 hover:bg-theme-hover hover:border-green-500/30 transition-all duration-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-2 h-2 bg-green-400/40 rounded-full"></div>
                          <span className="text-theme-primary font-medium text-sm">{sector.sector}</span>
                        </div>
                        <div className="text-theme-muted text-xs mb-1">
                          {formatCurrency(sector.value)} ({formatCurrency(sector.percentage, 'number')}%)
                        </div>
                        <div className="text-gray-700 text-xs">
                          {sector.count} Position{sector.count !== 1 ? 'en' : ''}
                        </div>
                      </div>
                    ))
                })()}
              </div>
            </div>

            {/* Top Positions */}
            <div className="bg-theme-card border border-theme-light rounded-xl p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                  <StarIcon className="w-4 h-4 text-theme-muted" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-theme-primary">Top Positionen</h3>
                  <p className="text-sm text-theme-muted">Größte Holdings im Portfolio</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {holdings.slice(0, 10).map((holding, index) => (
                  <div key={holding.cusip} className="group flex items-center justify-between py-4 px-5 bg-theme-secondary/20 rounded-xl border border-white/[0.04] hover:bg-theme-hover hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/20 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 text-xs font-bold text-brand-light/70 bg-brand/10 rounded-lg group-hover:bg-brand/20 transition-all duration-300">
                        {index + 1}
                      </div>
                      <CompanyNameWithOptions position={holding} />
                    </div>
                    <div className="text-right">
                      <div className="text-theme-primary font-semibold text-lg group-hover:text-brand-light transition-colors">
                        {formatCurrency(holding.value)}
                      </div>
                      <div className="text-theme-muted text-sm font-medium">
                        {formatCurrency((holding.value / totalVal) * 100, 'number')}% Portfolio
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sektor Breakdown Chart */}
            <div className="bg-theme-card border border-theme-light rounded-xl p-5">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="w-4 h-4 text-theme-muted" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-theme-primary">Sektor-Verteilung</h3>
                  <p className="text-sm text-theme-muted">Detaillierte Aufschlüsselung nach Branchen</p>
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
          </div>
        )}


        {/* ANALYTICS TAB */}
        {tab === 'analytics' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-theme-primary mb-4">
                Portfolio-Analytik
              </h2>
              <p className="text-theme-muted max-w-2xl mx-auto">
                Detaillierte Einblicke in {mainName}s Investment-Strategie
              </p>
            </div>
            
            {/* Analytics Sub-Tabs */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              <button
                onClick={() => setAnalyticsView('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  analyticsView === 'overview' 
                    ? 'bg-green-900/20 text-theme-primary border border-green-900/30' 
                    : 'bg-theme-card text-theme-muted hover:bg-theme-hover hover:text-theme-primary border border-theme-light'
                }`}
              >
                Übersicht
              </button>
              <button
                onClick={() => setAnalyticsView('companies')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  analyticsView === 'companies' 
                    ? 'bg-green-900/20 text-theme-primary border border-green-900/30' 
                    : 'bg-theme-card text-theme-muted hover:bg-theme-hover hover:text-theme-primary border border-theme-light'
                }`}
              >
                Einzelunternehmen
              </button>
              <button
                onClick={() => setAnalyticsView('sectors')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  analyticsView === 'sectors' 
                    ? 'bg-green-900/20 text-theme-primary border border-green-900/30' 
                    : 'bg-theme-card text-theme-muted hover:bg-theme-hover hover:text-theme-primary border border-theme-light'
                }`}
              >
                Sektoren
              </button>
            </div>

            {/* Analytics Overview */}
            {analyticsView === 'overview' && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  
                  <div className="bg-theme-card border border-theme-light rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                        <ChartBarIcon className="w-5 h-5 text-green-900/60" />
                      </div>
                      <h3 className="text-sm font-medium text-theme-muted">Portfolio-Wert</h3>
                    </div>
                    <p className="text-xl font-medium text-theme-primary">
                      {formatCurrency(totalVal, 'number')}
                    </p>
                    <p className="text-xs text-gray-600">Gesamtwert aller Positionen</p>
                  </div>
                  
                  <div className="bg-theme-card border border-theme-light rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                        <StarIcon className="w-4 h-4 text-theme-muted" />
                      </div>
                      <h3 className="text-sm font-medium text-theme-muted">Anzahl Holdings</h3>
                    </div>
                    <p className="text-xl font-medium text-theme-primary">
                      {holdings.length}
                    </p>
                    <p className="text-xs text-gray-600">Verschiedene Positionen</p>
                  </div>
                  
                  <div className="bg-theme-card border border-theme-light rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                        <ChartBarIcon className="w-4 h-4 text-theme-muted" />
                      </div>
                      <h3 className="text-sm font-medium text-theme-muted">Top 10 Anteil</h3>
                    </div>
                    <p className="text-xl font-medium text-theme-primary">
                      {formatCurrency((holdings.slice(0, 10).reduce((sum, h) => sum + h.value, 0) / totalVal) * 100, 'number')}%
                    </p>
                    <p className="text-xs text-gray-600">Konzentration</p>
                  </div>
                  
                  <div className="bg-theme-card border border-theme-light rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                        <CalendarIcon className="w-4 h-4 text-theme-muted" />
                      </div>
                      <h3 className="text-sm font-medium text-theme-muted">Quartale</h3>
                    </div>
                    <p className="text-xl font-medium text-theme-primary">
                      {snapshots.length}
                    </p>
                    <p className="text-xs text-gray-600">Verfügbare Daten</p>
                  </div>
                </div>
                
                {/* Sektor-Chart */}
                <div className="bg-theme-card border border-theme-light rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                      <ChartBarIcon className="w-4 h-4 text-theme-muted" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-theme-primary">Sektor-Verteilung</h3>
                      <p className="text-sm text-theme-muted">Basierend auf echten Sektor-Daten</p>
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

            {/* Company Ownership History */}
            {analyticsView === 'companies' && (
              <CompanyOwnershipHistory 
                snapshots={snapshots}
                investorName={mainName}
              />
            )}

            {analyticsView === 'sectors' && (
              <AdvancedSectorAnalysis 
                snapshots={snapshots}
                investorName={mainName}
                />
           )}
         </div>
       )}

       {/* FILINGS TAB */}
       {tab === 'filings' && (
         <div className="space-y-8">
           <div className="text-center mb-8">
             <h2 className="text-2xl font-semibold text-theme-primary mb-4">
               13F Filings
             </h2>
             <p className="text-theme-muted max-w-2xl mx-auto">
               Offizielle Quartalsberichte und Filing-Historie für {mainName}
             </p>
           </div>
           
           <div className="bg-theme-card border border-theme-light rounded-2xl p-8 hover:bg-theme-hover hover:border-white/[0.1] transition-all duration-300">
             <div className="flex items-center gap-3 mb-6">
               <div className="w-8 h-8 bg-theme-secondary/30 rounded-lg flex items-center justify-center">
                 <DocumentTextIcon className="w-4 h-4 text-theme-muted" />
               </div>
               <div>
                 <h3 className="text-lg font-medium text-theme-primary">Originaldokumente</h3>
                 <p className="text-sm text-theme-muted">SEC Filing-Historie und offizielle Berichte</p>
               </div>
             </div>
             
             <FilingsTab 
               investorSlug={slug}
               snapshots={snapshots}
             />
           </div>
         </div>
       )}

       {/* AI TAB */}
       {tab === 'ai' && (
         <div className="space-y-8">
           <div className="max-w-2xl mx-auto text-center">
             <div className="bg-theme-card border border-theme-light rounded-2xl p-8 hover:bg-theme-hover hover:border-white/[0.1] transition-all duration-300">
               <div className="w-20 h-20 bg-gradient-to-br from-green-900/20 to-green-800/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <SparklesIcon className="w-10 h-10 text-brand-light/60" />
               </div>
               
               <h3 className="text-xl font-medium text-theme-primary mb-3">
                 FinClue AI Portfolio-Analyse
               </h3>
               
               <p className="text-theme-muted mb-6 leading-relaxed">
                 Starte ein intelligentes Gespräch über {mainName}s Portfolio, 
                 Investmentstrategien und Marktpositionen.
               </p>
               
               <button
                 onClick={handleAIChat}
                 className="w-full max-w-sm mx-auto px-8 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-theme-primary font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-brand/10"
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
             </div>
           </div>
         </div>
       )}

  
      
     </div>
   </div>
 )
}

// Main Export with Currency Provider
export default function InvestorPage(props: InvestorPageProps) {
 return (
   <CurrencyProvider>
     <InvestorPageContent {...props} />
   </CurrencyProvider>
 )
}
