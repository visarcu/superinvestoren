import React, { useState, useMemo } from 'react'
import { ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Mock data structure (replace with your actual data)
interface Position {
  cusip: string
  name: string
  shares: number
  value: number
  ticker?: string
}

interface Snapshot {
  quarter: string
  data: {
    date: string
    positions: Position[]
  }
}

interface CompanyOwnershipHistoryProps {
  snapshots: Snapshot[]
  investorName: string
}

// Utility function to calculate portfolio percentage
const calculatePortfolioPercentage = (position: Position, totalValue: number): number => {
  return totalValue > 0 ? (position.value / totalValue) * 100 : 0
}

// Utility function to get clean company name
const getCleanCompanyName = (position: Position): string => {
  let name = position.name
  const ticker = position.ticker
  
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

// Get all unique companies across all snapshots
const getAllCompanies = (snapshots: Snapshot[]) => {
  const companiesMap = new Map<string, { ticker?: string; name: string }>()
  
  snapshots.forEach(snapshot => {
    snapshot.data.positions.forEach(position => {
      if (!companiesMap.has(position.cusip)) {
        companiesMap.set(position.cusip, {
          ticker: position.ticker,
          name: getCleanCompanyName(position)
        })
      }
    })
  })
  
  return Array.from(companiesMap.entries()).map(([cusip, { ticker, name }]) => ({
    cusip,
    ticker: ticker || cusip.replace(/0+$/, ''),
    name,
    displayName: ticker ? `${ticker} - ${name}` : name
  }))
}

// Generate ownership history for selected company
const generateOwnershipHistory = (snapshots: Snapshot[], selectedCusip: string) => {
  return snapshots.map(snapshot => {
    const position = snapshot.data.positions.find(p => p.cusip === selectedCusip)
    const totalValue = snapshot.data.positions.reduce((sum, p) => sum + p.value, 0)
    
    return {
      quarter: snapshot.quarter,
      shares: position?.shares || 0,
      value: position?.value || 0,
      portfolioPercentage: position ? calculatePortfolioPercentage(position, totalValue) : 0,
      exists: !!position
    }
  }).sort((a, b) => a.quarter.localeCompare(b.quarter))
}

export default function CompanyOwnershipHistory({ snapshots, investorName }: CompanyOwnershipHistoryProps) {
  const companies = useMemo(() => getAllCompanies(snapshots), [snapshots])
  const [selectedCompany, setSelectedCompany] = useState<string>(companies[0]?.cusip || '')
  
  const selectedCompanyInfo = companies.find(c => c.cusip === selectedCompany)
  const ownershipHistory = useMemo(() => 
    generateOwnershipHistory(snapshots, selectedCompany), 
    [snapshots, selectedCompany]
  )
  
  const latestData = ownershipHistory[ownershipHistory.length - 1]
  const previousData = ownershipHistory[ownershipHistory.length - 2]
  
  // Calculate changes
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
              {company.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-brand/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-brand-light" />
            </div>
            <h4 className="text-sm font-medium text-gray-400">Aktuelle Shares</h4>
          </div>
          <p className="text-2xl font-bold text-white">
            {latestData ? formatShares(latestData.shares) : '0'}
          </p>
          {sharesChange !== 0 && (
            <p className={`text-sm flex items-center gap-1 mt-2 ${sharesChange > 0 ? 'text-brand-light' : 'text-red-400'}`}>
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
            <p className={`text-sm flex items-center gap-1 mt-2 ${percentageChange > 0 ? 'text-brand-light' : 'text-red-400'}`}>
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
            <div className="w-8 h-8 bg-brand/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-brand-light" />
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
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-brand/20 text-green-300 border border-green-500/30">
                          Neukauf
                        </span>
                      ) : isSold ? (
                        <span className="inline-block px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                          Verkauft
                        </span>
                      ) : sharesChange !== 0 ? (
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          sharesChange > 0 
                            ? 'bg-brand/20 text-green-300 border border-green-500/30' 
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