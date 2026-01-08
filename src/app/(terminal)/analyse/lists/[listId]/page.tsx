// src/app/(terminal)/analyse/lists/[listId]/page.tsx - IMPROVED VERSION
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, EyeIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface StockListItem {
  symbol?: string
  ticker?: string
  name?: string
  companyName?: string
  marketCap?: number
  marketCapitalization?: number
  price?: number
  change?: number
  changesPercentage?: number
  changePercentage?: number
  volume?: number
  sector?: string
  industry?: string
}

interface ListConfig {
  id: string
  title: string
  description: string
  visualMode?: 'marketCap' | 'performance'
}

export default function StockListDetailPage() {
  const params = useParams()
  const listId = params.listId as string
  
  const [stocks, setStocks] = useState<StockListItem[]>([])
  const [listConfig, setListConfig] = useState<ListConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  
  // ✅ NEUE STATE FÜR PAGINATION
  const [showAll, setShowAll] = useState(false)
  const [displayCount, setDisplayCount] = useState(20)

  useEffect(() => {
    loadListData()
  }, [listId])

  const loadListData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔄 Loading list: ${listId}`)
      
      const response = await fetch(`/api/lists/${listId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const { data, listConfig: config } = await response.json()
      
      console.log(`✅ Loaded ${data.length} stocks for ${config.title}`)
      
      setStocks(data)
      setListConfig(config)
      
    } catch (error: any) {
      console.error('❌ Error loading list:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getListTitle = () => {
    return listConfig?.title || 'Aktien Liste'
  }

  // ✅ DEUTSCHE LOKALISIERUNG für Marktkapitalisierung (KURZE LABELS)
  const formatMarketCap = (value: number): string => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1).replace('.', ',')} Bio` // Billionen (kurz)
    if (value >= 1e9) return `${(value / 1e9).toFixed(1).replace('.', ',')} Mrd`  // Milliarden (kurz)
    if (value >= 1e6) return `${(value / 1e6).toFixed(1).replace('.', ',')} Mio`  // Millionen (kurz)
    return `${value.toFixed(0)} €`
  }

  const formatValue = (value: number | string | undefined | null, type: 'marketCap' | 'price' | 'percentage') => {
    if (value === undefined || value === null || value === '' || value === 'N/A') return '–'
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return '–'
    
    try {
      switch (type) {
        case 'marketCap':
          return formatMarketCap(numValue)
        case 'price':
          return `${numValue.toFixed(2).replace('.', ',')} $` // Deutsche Komma-Notation
        case 'percentage':
          return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(2).replace('.', ',')} %`
        default:
          return numValue.toString()
      }
    } catch (error) {
      console.warn('Error formatting value:', { value, type, error })
      return '–'
    }
  }

  const getTicker = (stock: StockListItem) => {
    return stock.symbol || stock.ticker || 'unknown'
  }

  const getDisplaySymbol = (stock: StockListItem) => {
    const symbol = stock.symbol || stock.ticker
    return symbol ? symbol.slice(0, 2).toUpperCase() : '??'
  }

  // ✅ DYNAMISCHE ANZEIGE-ANZAHL
  const getDisplayedStocks = () => {
    if (viewMode === 'table') return stocks // Tabelle zeigt immer alle
    return showAll ? stocks : stocks.slice(0, displayCount)
  }

  // ✅ ERWEITERTE SHOW-MORE LOGIK
  const handleShowMore = () => {
    if (displayCount >= stocks.length) {
      setShowAll(true)
    } else {
      setDisplayCount(prev => Math.min(prev + 20, stocks.length))
    }
  }

  const handleShowLess = () => {
    setShowAll(false)
    setDisplayCount(20)
  }

  // Performance-Balken mit verbessertem Label
  const renderPerformanceBar = (stock: StockListItem, index: number) => {
    const changePercentage = stock.changePercentage || 0
    const maxChange = Math.max(...stocks.map(s => Math.abs(s.changePercentage || 0)))
    const barWidth = maxChange > 0 ? (Math.abs(changePercentage) / maxChange) * 100 : 10
    
    const isPositive = changePercentage >= 0
    const barColorClass = isPositive 
      ? 'bg-gradient-to-r from-green-500 to-green-400' 
      : 'bg-gradient-to-r from-red-500 to-red-400'
    
    return (
      <div className="grid grid-cols-12 gap-3 items-center py-2">
        <div className="col-span-1 text-right text-sm font-medium text-theme-secondary">
          {index + 1}
        </div>
        
        <div className="col-span-1 flex justify-center">
          <div className="w-8 h-8 bg-theme-tertiary rounded-lg flex items-center justify-center">
            <span className="text-theme-primary font-bold text-xs">
              {getDisplaySymbol(stock)}
            </span>
          </div>
        </div>
        
        <div className="col-span-3">
          <Link 
            href={`/analyse/stocks/${getTicker(stock).toLowerCase()}`}
            className="font-medium text-theme-primary hover:text-brand-light transition-colors block"
          >
            <div className="truncate text-sm font-semibold">
              {getTicker(stock)}
            </div>
          </Link>
          <div className="text-xs text-theme-secondary truncate">
            {stock.name || 'Name nicht verfügbar'}
          </div>
        </div>
        
        <div className="col-span-4">
          <div className="relative h-8 bg-theme-secondary rounded-lg overflow-hidden">
            <div 
              className={`h-full ${barColorClass} rounded-lg transition-all duration-1000 ease-out flex items-center justify-end pr-2`}
              style={{ 
                width: `${Math.max(barWidth, 15)}%`,
                minWidth: '80px'
              }}
            >
              <span className="text-white font-semibold text-xs whitespace-nowrap">
                {formatValue(changePercentage, 'percentage')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="col-span-3 text-right">
          <span className="text-sm text-theme-secondary">
            {formatValue(stock.marketCap, 'marketCap')}
          </span>
        </div>
      </div>
    )
  }

  // Marktkapitalisierung-Balken
  const renderMarketCapBar = (stock: StockListItem, index: number) => {
    const maxMarketCap = stocks[0]?.marketCap || 1

    return (
      <div className="grid grid-cols-12 gap-3 items-center py-2">
        <div className="col-span-1 text-right text-sm font-medium text-theme-secondary">
          {index + 1}
        </div>
        
        <div className="col-span-1 flex justify-center">
          <div className="w-8 h-8 bg-theme-tertiary rounded-lg flex items-center justify-center">
            <span className="text-theme-primary font-bold text-xs">
              {getDisplaySymbol(stock)}
            </span>
          </div>
        </div>
        
        <div className="col-span-3">
          <Link 
            href={`/analyse/stocks/${getTicker(stock).toLowerCase()}`}
            className="font-medium text-theme-primary hover:text-brand-light transition-colors block"
          >
            <div className="truncate text-sm font-semibold">
              {getTicker(stock)}
            </div>
          </Link>
          <div className="text-xs text-theme-secondary truncate">
            {stock.name || 'Name nicht verfügbar'}
          </div>
        </div>
        
        <div className="col-span-4">
          <div className="relative h-8 bg-theme-secondary rounded-lg overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-lg transition-all duration-1000 ease-out flex items-center justify-end pr-2"
              style={{ 
                width: `${stock.marketCap ? (stock.marketCap / maxMarketCap) * 100 : 10}%`,
                minWidth: '80px'
              }}
            >
              <span className="text-black font-semibold text-xs whitespace-nowrap">
                {formatValue(stock.marketCap, 'marketCap')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="col-span-3 text-right">
          <span className={`text-sm font-medium ${
            (stock.changePercentage || 0) >= 0 ? 'text-brand-light' : 'text-red-400'
          }`}>
            {formatValue(stock.changePercentage, 'percentage')}
          </span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-theme-secondary">
              Lade Aktien-Liste...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="professional-card p-8 text-center">
          <div className="text-red-400 text-lg mb-4">❌ Fehler beim Laden</div>
          <p className="text-theme-secondary mb-4">{error}</p>
          <button
            onClick={loadListData}
            className="px-4 py-2 bg-brand hover:bg-green-400 text-black font-medium rounded-lg transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  if (stocks.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="professional-card p-8 text-center">
          <div className="text-theme-secondary text-lg mb-4">📭 Keine Daten verfügbar</div>
          <p className="text-theme-muted">Für diese Liste sind momentan keine Daten verfügbar.</p>
        </div>
      </div>
    )
  }

  const isPerformanceMode = listConfig?.visualMode === 'performance'
  const renderBar = isPerformanceMode ? renderPerformanceBar : renderMarketCapBar
  const displayedStocks = getDisplayedStocks()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link 
            href="/analyse/lists"
            className="text-theme-secondary hover:text-brand-light text-sm mb-2 inline-flex items-center gap-1"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Zurück zu Listen
          </Link>
          <h1 className="text-3xl font-bold text-theme-primary">
            {getListTitle()}
          </h1>
          {/* ✅ KORRIGIERTE ANZEIGE */}
          <p className="text-theme-secondary mt-1">
            {viewMode === 'chart' 
              ? `${displayedStocks.length} von ${stocks.length} Unternehmen angezeigt`
              : `Alle ${stocks.length} Unternehmen`
            }
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-theme-secondary rounded-lg p-1">
          <button
            onClick={() => setViewMode('chart')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'chart' 
                ? 'bg-brand text-black' 
                : 'text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              viewMode === 'table' 
                ? 'bg-brand text-black' 
                : 'text-theme-secondary hover:text-theme-primary'
            }`}
          >
            Tabelle
          </button>
        </div>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' && (
        <div className="professional-card p-6 mb-8">
          <h3 className="text-lg font-semibold text-theme-primary mb-6">
            {isPerformanceMode ? 'Nach Performance sortiert' : 'Nach Marktkapitalisierung sortiert'}
          </h3>
          
          {/* ✅ VERBESSERTE GRID HEADER */}
          <div className="grid grid-cols-12 gap-3 items-center pb-4 mb-4 border-b border-theme-secondary/30">
            <div className="col-span-1 text-right text-xs font-medium text-theme-secondary uppercase tracking-wide">
              Rang
            </div>
            <div className="col-span-1 text-center text-xs font-medium text-theme-secondary uppercase tracking-wide">
              Logo
            </div>
            <div className="col-span-3 text-xs font-medium text-theme-secondary uppercase tracking-wide">
              Unternehmen
            </div>
            <div className="col-span-4 text-xs font-medium text-theme-secondary uppercase tracking-wide">
              {isPerformanceMode ? 'Tagesperformance' : 'Marktkapitalisierung'}
            </div>
            <div className="col-span-3 text-right text-xs font-medium text-theme-secondary uppercase tracking-wide">
              {isPerformanceMode ? 'Marktkapital' : 'Tagesperformance'}
            </div>
          </div>
          
          {/* Rows */}
          <div className="space-y-2">
            {displayedStocks.map((stock, index) => (
              <div key={`${getTicker(stock)}-${index}`} className="hover:bg-theme-secondary/20 rounded-lg transition-colors">
                {renderBar(stock, index)}
              </div>
            ))}
          </div>
          
          {/* ✅ SHOW MORE/LESS BUTTONS - UNTEN POSITIONIERT */}
          {stocks.length > 20 && (
            <div className="mt-6 flex justify-center">
              {!showAll && displayedStocks.length < stocks.length && (
                <button
                  onClick={handleShowMore}
                  className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-green-400 text-black rounded-lg transition-colors font-medium"
                >
                  <EyeIcon className="w-5 h-5" />
                  {displayCount >= stocks.length ? 'Alle anzeigen' : `Weitere ${Math.min(20, stocks.length - displayCount)} laden`}
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
              )}
              
              {(showAll || displayedStocks.length > 20) && (
                <button
                  onClick={handleShowLess}
                  className="flex items-center gap-2 px-6 py-3 bg-theme-secondary hover:bg-theme-tertiary text-theme-primary rounded-lg transition-colors font-medium"
                >
                  Nur Top 20 anzeigen
                  <ChevronUpIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          
          {/* ✅ BOTTOM PAGINATION INFO */}
          {viewMode === 'chart' && stocks.length > 20 && (
            <div className="mt-6 pt-4 border-t border-theme-secondary/30 text-center">
              <p className="text-sm text-theme-secondary">
                {displayedStocks.length < stocks.length 
                  ? `${displayedStocks.length} von ${stocks.length} Unternehmen angezeigt`
                  : `Alle ${stocks.length} Unternehmen angezeigt`
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="professional-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th className="text-left">Rang</th>
                  <th className="text-left">Unternehmen</th>
                  <th className="text-right">Kurs</th>
                  <th className="text-right">Marktkapitalisierung</th>
                  <th className="text-right">Tagesperformance</th> {/* ✅ KLARERER LABEL */}
                  <th className="text-right">Volumen</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock, index) => {
                  const ticker = getTicker(stock)
                  
                  return (
                    <tr key={`${ticker}-${index}`}>
                      <td className="font-medium">{index + 1}</td>
                      <td>
                        <Link 
                          href={`/analyse/stocks/${ticker.toLowerCase()}`}
                          className="hover:text-brand-light transition-colors"
                        >
                          <div className="font-medium">{ticker}</div>
                          <div className="text-xs text-theme-secondary truncate max-w-[200px]">
                            {stock.name || 'Name nicht verfügbar'}
                          </div>
                        </Link>
                      </td>
                      <td className="text-right">{formatValue(stock.price, 'price')}</td>
                      <td className="text-right">{formatValue(stock.marketCap, 'marketCap')}</td>
                      <td className={`text-right font-medium ${
                        (stock.changePercentage || 0) >= 0 ? 'text-brand-light' : 'text-red-400'
                      }`}>
                        {formatValue(stock.changePercentage, 'percentage')}
                      </td>
                      <td className="text-right text-theme-secondary">
                        {stock.volume ? `${(stock.volume / 1e6).toFixed(1).replace('.', ',')} Mio` : '–'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}