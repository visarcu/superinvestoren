// Professional Stock Comparison - TradingView Style
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
 ResponsiveContainer,
 LineChart,
 Line,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip as RechartsTooltip,
} from 'recharts'
import { 
 XMarkIcon, 
 PlusIcon,
 ChartBarIcon,
 SparklesIcon,
 TableCellsIcon
} from '@heroicons/react/24/outline'
import { stocks as availableStocks } from '@/data/stocks'
import { useCurrency } from '@/lib/CurrencyContext'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'

// Professional Metrics with categories
const METRICS = [
 // Fundamentals
 { value: 'revenue', label: 'Umsatz', category: 'Fundamentale Daten', unit: 'currency' },
 { value: 'netIncome', label: 'Nettogewinn', category: 'Fundamentale Daten', unit: 'currency' },
 { value: 'ebitda', label: 'EBITDA', category: 'Fundamentale Daten', unit: 'currency' },
 { value: 'eps', label: 'Gewinn je Aktie', category: 'Fundamentale Daten', unit: 'currency' },
 { value: 'freeCashFlow', label: 'Free Cash Flow', category: 'Fundamentale Daten', unit: 'currency' },
 
 // Valuation
 { value: 'peRatio', label: 'KGV', category: 'Bewertung', unit: 'ratio' },
 { value: 'pbRatio', label: 'KBV', category: 'Bewertung', unit: 'ratio' },
 { value: 'psRatio', label: 'KUV', category: 'Bewertung', unit: 'ratio' },
 
 // Profitability 
 { value: 'roe', label: 'Eigenkapitalrendite', category: 'Rentabilität', unit: 'percentage' },
 { value: 'roa', label: 'Gesamtkapitalrendite', category: 'Rentabilität', unit: 'percentage' },
 { value: 'grossMargin', label: 'Bruttomarge', category: 'Rentabilität', unit: 'percentage' },
 { value: 'operatingMargin', label: 'Operative Marge', category: 'Rentabilität', unit: 'percentage' },
 { value: 'netMargin', label: 'Nettomarge', category: 'Rentabilität', unit: 'percentage' },
 
 // Financial Health
 { value: 'currentRatio', label: 'Liquidität 1. Grades', category: 'Finanzielle Gesundheit', unit: 'ratio' },
 { value: 'debtToEquity', label: 'Verschuldungsgrad', category: 'Finanzielle Gesundheit', unit: 'ratio' },
 { value: 'totalDebt', label: 'Gesamtverschuldung', category: 'Finanzielle Gesundheit', unit: 'currency' },
 { value: 'cash', label: 'Liquide Mittel', category: 'Finanzielle Gesundheit', unit: 'currency' },
]

// Professional color scheme
const CHART_COLORS = [
 '#2962FF', '#00C851', '#FF9800', '#FF5722', '#9C27B0', 
 '#00BCD4', '#607D8B', '#795548', '#E91E63', '#009688'
]

interface User {
 id: string
 email: string
 isPremium: boolean
}

export default function StockComparisonPage() {
 const { formatCurrency } = useCurrency()
 
 const [user, setUser] = useState<User | null>(null)
 const [loadingUser, setLoadingUser] = useState(true)
 const [selectedStocks, setSelectedStocks] = useState<string[]>([])
 const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['revenue', 'netIncome', 'peRatio'])
 const [stockSearch, setStockSearch] = useState('')
 const [showStockDropdown, setShowStockDropdown] = useState(false)
 const [emptyStateSearch, setEmptyStateSearch] = useState('')
 const [showEmptyStateDropdown, setShowEmptyStateDropdown] = useState(false)
 const [comparisonData, setComparisonData] = useState<any>(null)
 const [loading, setLoading] = useState(false)
 const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual')
 const [years, setYears] = useState(5)
 const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
 const [showAllData, setShowAllData] = useState(false)

 // Load User
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
       setLoadingUser(false)
     }
   }

   loadUser()
 }, [])

 // Load comparison data
 useEffect(() => {
   if (selectedStocks.length === 0) return

   const loadComparisonData = async () => {
     setLoading(true)
     try {
       const response = await fetch(
         `/api/compare-stocks?tickers=${selectedStocks.join(',')}&period=${period}&years=${years}`
       )
       const data = await response.json()
       setComparisonData(data)
     } catch (error) {
       console.error('Error loading comparison data:', error)
     } finally {
       setLoading(false)
     }
   }

   loadComparisonData()
 }, [selectedStocks, period, years])

 const filteredStocks = useMemo(() => {
   if (!stockSearch || stockSearch.length < 1) return []
   const query = stockSearch.toLowerCase()
   return availableStocks
     .filter(stock => 
       stock.ticker.toLowerCase().includes(query) || 
       stock.name.toLowerCase().includes(query)
     )
     .filter(stock => !selectedStocks.includes(stock.ticker))
     .slice(0, 8)
 }, [stockSearch, selectedStocks])

 const filteredEmptyStateStocks = useMemo(() => {
   if (!emptyStateSearch || emptyStateSearch.length < 1) return []
   const query = emptyStateSearch.toLowerCase()
   return availableStocks
     .filter(stock => 
       stock.ticker.toLowerCase().includes(query) || 
       stock.name.toLowerCase().includes(query)
     )
     .slice(0, 8)
 }, [emptyStateSearch])

 const maxStocks = user?.isPremium ? 8 : 3
 const maxMetrics = user?.isPremium ? 15 : 6

 // Chart data calculation - Common time range or all data
 const chartData = useMemo(() => {
   if (!comparisonData || selectedStocks.length === 0 || selectedMetrics.length === 0) return []

   if (showAllData) {
     // Show all available years
     const allYears = new Set<string>()
     Object.values(comparisonData).forEach((stockData: any) => {
       stockData.data?.forEach((d: any) => {
         allYears.add(d.year)
       })
     })

     return Array.from(allYears).sort().map(year => {
       const dataPoint: any = { year }
       
       selectedStocks.forEach(ticker => {
         selectedMetrics.forEach(metric => {
           const stockData = comparisonData[ticker]
           const yearData = stockData?.data?.find((d: any) => d.year === year)
           if (yearData) {
             const key = selectedMetrics.length > 1 ? `${ticker}_${metric}` : ticker
             dataPoint[key] = yearData[metric] || 0
           }
         })
       })
       
       return dataPoint
     })
   } else {
     // Common time range only
     const stockYears = selectedStocks.map(ticker => {
       const stockData = comparisonData[ticker]
       return new Set(stockData?.data?.map((d: any) => d.year) || [])
     })
     
     const commonYears = stockYears.length > 0 
       ? stockYears.reduce((intersection, years) => 
           new Set([...intersection].filter(year => years.has(year)))
         )
       : new Set()

     return Array.from(commonYears).sort().map(year => {
       const dataPoint: any = { year }
       
       selectedStocks.forEach(ticker => {
         selectedMetrics.forEach(metric => {
           const stockData = comparisonData[ticker]
           const yearData = stockData?.data?.find((d: any) => d.year === year)
           if (yearData) {
             const key = selectedMetrics.length > 1 ? `${ticker}_${metric}` : ticker
             dataPoint[key] = yearData[metric] || 0
           }
         })
       })
       
       return dataPoint
     })
   }
 }, [comparisonData, selectedMetrics, selectedStocks, showAllData])

 // Check for additional available data
 const additionalDataInfo = useMemo(() => {
   if (!comparisonData || selectedStocks.length === 0) return null
   
   const allAvailableYears = new Set<string>()
   const commonYears = new Set(chartData.map(d => d.year))
   
   selectedStocks.forEach(ticker => {
     const stockData = comparisonData[ticker]
     stockData?.data?.forEach((d: any) => allAvailableYears.add(d.year))
   })
   
   const additionalYears = Array.from(allAvailableYears).filter(year => !commonYears.has(year))
   
   if (additionalYears.length === 0) return null
   
   const stocksWithAdditional = selectedStocks.filter(ticker => {
     const stockData = comparisonData[ticker]
     return additionalYears.some(year => 
       stockData?.data?.some((d: any) => d.year === year)
     )
   })
   
   return {
     years: additionalYears.sort(),
     stocks: stocksWithAdditional
   }
 }, [comparisonData, selectedStocks, chartData])

 // Chart lines calculation
 const chartLines = useMemo(() => {
   const lines: { key: string; name: string; color: string }[] = []
   let colorIndex = 0
   
   selectedStocks.forEach((ticker) => {
     selectedMetrics.forEach((metric) => {
       const stockInfo = comparisonData?.[ticker]
       const metricInfo = METRICS.find(m => m.value === metric)
       
       if (selectedMetrics.length > 1) {
         lines.push({
           key: `${ticker}_${metric}`,
           name: `${stockInfo?.name || ticker} - ${metricInfo?.label || metric}`,
           color: CHART_COLORS[colorIndex % CHART_COLORS.length],
         })
       } else {
         lines.push({
           key: ticker,
           name: stockInfo?.name || ticker,
           color: CHART_COLORS[colorIndex % CHART_COLORS.length],
         })
       }
       colorIndex++
     })
   })
   
   return lines
 }, [selectedStocks, selectedMetrics, comparisonData])

 // Professional multi-year table data
 const tableData = useMemo(() => {
   if (!comparisonData || selectedStocks.length === 0) return []
   
   // Get available years from data
   const allYears = new Set<string>()
   Object.values(comparisonData).forEach((stockData: any) => {
     stockData.data?.forEach((d: any) => allYears.add(d.year))
   })
   const sortedYears = Array.from(allYears).sort().slice(-years) // Last N years
   
   return selectedMetrics.map(metric => {
     const metricInfo = METRICS.find(m => m.value === metric)
     const row: any = { 
       metric: metricInfo?.label || metric,
       category: metricInfo?.category || '',
       unit: metricInfo?.unit || 'currency'
     }
     
     selectedStocks.forEach(ticker => {
       const stockData = comparisonData[ticker]
       
       // Add data for each year
       sortedYears.forEach(year => {
         const yearData = stockData?.data?.find((d: any) => d.year === year)
         row[`${ticker}_${year}`] = yearData?.[metric]
       })
       
       // Calculate statistics
       const values = sortedYears
         .map(year => stockData?.data?.find((d: any) => d.year === year)?.[metric])
         .filter(v => v != null && v !== 0)
       
       if (values.length >= 2) {
         // CAGR calculation
         const firstValue = values[0]
         const lastValue = values[values.length - 1]
         const yearsCount = values.length - 1
         const cagr = yearsCount > 0 ? (Math.pow(Math.abs(lastValue / firstValue), 1 / yearsCount) - 1) * 100 : 0
         row[`${ticker}_cagr`] = isNaN(cagr) ? 0 : cagr
         
         // Average
         row[`${ticker}_avg`] = values.reduce((a, b) => a + b, 0) / values.length
         
         // Latest value
         row[`${ticker}_latest`] = lastValue
       }
     })
     
     return row
   })
 }, [comparisonData, selectedStocks, selectedMetrics, years])

 // Get available years for table headers
 const availableYears = useMemo(() => {
   if (!comparisonData) return []
   
   const allYears = new Set<string>()
   Object.values(comparisonData).forEach((stockData: any) => {
     stockData.data?.forEach((d: any) => allYears.add(d.year))
   })
   return Array.from(allYears).sort().slice(-Math.min(years, 5)) // Show max 5 years in table
 }, [comparisonData, years])

 const formatTableValue = (value: number, unit: string) => {
   if (!value && value !== 0) return '--'
   
   switch (unit) {
     case 'percentage':
       return `${(value * 100).toFixed(1)}%`
     case 'ratio':
       return value.toFixed(2)
     case 'currency':
       return formatCurrency(value)
     default:
       return formatCurrency(value)
   }
 }

 // Y-Axis formatter for charts
 const formatYAxis = (value: number) => {
   // Use German number formatting
   if (Math.abs(value) >= 1e12) {
     return `${(value / 1e12).toFixed(1).replace('.', ',')} B`
   }
   if (Math.abs(value) >= 1e9) {
     return `${(value / 1e9).toFixed(1).replace('.', ',')} Mrd`
   }
   if (Math.abs(value) >= 1e6) {
     return `${(value / 1e6).toFixed(1).replace('.', ',')} Mio`
   }
   if (Math.abs(value) >= 1e3) {
     return `${(value / 1e3).toFixed(1).replace('.', ',')} T`
   }
   
   // For percentages and ratios
   const currentMetric = selectedMetrics[0]
   const metricInfo = METRICS.find(m => m.value === currentMetric)
   
   if (metricInfo?.unit === 'percentage') {
     return `${(value * 100).toFixed(0)}%`
   }
   if (metricInfo?.unit === 'ratio') {
     return value.toFixed(1).replace('.', ',')
   }
   
   return value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
 }

 // Tooltip formatter with German formatting
 const formatTooltipValue = (value: number, name: string) => {
   const metric = selectedMetrics.find(m => name.includes(METRICS.find(met => met.value === m)?.label || ''))
   const metricInfo = metric ? METRICS.find(m => m.value === metric) : METRICS.find(m => m.value === selectedMetrics[0])
   
   if (!value && value !== 0) return '--'
   
   switch (metricInfo?.unit) {
     case 'percentage':
       return `${(value * 100).toFixed(2).replace('.', ',')}%`
     case 'ratio':
       return value.toFixed(2).replace('.', ',')
     case 'currency':
       return formatCurrency(value)
     default:
       return formatCurrency(value)
   }
 }

 if (loadingUser) {
   return (
     <div className="flex h-screen items-center justify-center">
       <LoadingSpinner />
     </div>
   )
 }

 return (
   <div className="min-h-screen bg-theme-primary">
     <div className="max-w-full mx-auto px-4 py-3">
       
       {/* PROFESSIONAL HEADER */}
       <div className="flex items-center justify-between mb-3 pb-3 border-b border-theme/10">
         <div className="flex items-center gap-4">
           <div>
             <h1 className="text-base font-semibold text-theme-primary">Aktien-Vergleich</h1>
             <p className="text-xs text-theme-muted">
               {selectedStocks.length}/{maxStocks} Aktien • {selectedMetrics.length}/{maxMetrics} Metriken
             </p>
           </div>
           
           <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded text-xs">
             <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
             <span className="text-green-400 font-medium">Live</span>
           </div>
         </div>
         
         <div className="flex items-center gap-3">
           {/* View Toggle */}
           <div className="flex bg-theme-secondary/30 rounded-md p-0.5">
             <button
               onClick={() => setViewMode('table')}
               className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                 viewMode === 'table' 
                   ? 'bg-theme-card text-theme-primary shadow-sm' 
                   : 'text-theme-muted hover:text-theme-primary'
               }`}
             >
               <TableCellsIcon className="w-3 h-3 mr-1 inline" />
               Table
             </button>
             <button
               onClick={() => setViewMode('chart')}
               className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                 viewMode === 'chart' 
                   ? 'bg-theme-card text-theme-primary shadow-sm' 
                   : 'text-theme-muted hover:text-theme-primary'
               }`}
             >
               <ChartBarIcon className="w-3 h-3 mr-1 inline" />
               Chart
             </button>
           </div>
           
           {!user?.isPremium && (
             <Link
               href="/pricing"
               className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors"
             >
               <SparklesIcon className="w-3 h-3" />
               Pro
             </Link>
           )}
         </div>
       </div>

       {/* INLINE CONTROLS */}
       <div className="flex items-center gap-4 mb-4 p-3 bg-theme-card/50 rounded-lg border border-theme/10">
         
         {/* Stock Selection */}
         <div className="flex items-center gap-2">
           <span className="text-xs text-theme-muted font-medium">Aktien:</span>
           <div className="flex gap-1">
             {selectedStocks.map((ticker, index) => (
               <div
                 key={ticker}
                 className="inline-flex items-center gap-1 px-2 py-0.5 bg-theme-secondary/60 rounded text-xs border border-theme/20"
               >
                 <div 
                   className="w-1 h-1 rounded-full"
                   style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                 />
                 <span className="font-medium text-theme-primary">{ticker}</span>
                 <button
                   onClick={() => setSelectedStocks(prev => prev.filter(s => s !== ticker))}
                   className="hover:text-red-400 transition-colors"
                 >
                   <XMarkIcon className="w-2.5 h-2.5" />
                 </button>
               </div>
             ))}
             
             {selectedStocks.length < maxStocks && (
               <div className="relative">
                 <div className="flex items-center gap-1">
                   <input
                     type="text"
                     placeholder="Aktie hinzufügen..."
                     value={stockSearch}
                     onChange={(e) => {
                       setStockSearch(e.target.value)
                       setShowStockDropdown(e.target.value.length > 0)
                     }}
                     onFocus={() => setShowStockDropdown(stockSearch.length > 0)}
                     onBlur={() => setTimeout(() => setShowStockDropdown(false), 150)}
                     className="px-2 py-0.5 bg-theme-secondary border border-dashed border-theme/60 rounded text-xs text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500 focus:bg-theme-card focus:shadow-sm w-32"
                   />
                   <PlusIcon className="w-3 h-3 text-theme-muted" />
                 </div>
                 
                 {showStockDropdown && filteredStocks.length > 0 && (
                   <div className="absolute top-full mt-1 left-0 w-64 bg-theme-card border border-theme/20 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                     {filteredStocks.map(stock => (
                       <button
                         key={stock.ticker}
                         onMouseDown={() => {
                           setSelectedStocks(prev => [...prev, stock.ticker])
                           setStockSearch('')
                           setShowStockDropdown(false)
                         }}
                         className="w-full px-3 py-2 text-left hover:bg-theme-secondary/30 transition-colors flex items-center justify-between"
                       >
                         <div>
                           <span className="font-medium text-xs text-theme-primary">{stock.ticker}</span>
                           <div className="text-xs text-theme-muted truncate max-w-40">{stock.name}</div>
                         </div>
                         <PlusIcon className="w-3 h-3 text-green-500" />
                       </button>
                     ))}
                   </div>
                 )}
               </div>
             )}
           </div>
         </div>

         <div className="w-px h-4 bg-theme/20"></div>

         {/* Quick Metric Toggles */}
         <div className="flex items-center gap-2">
           <span className="text-xs text-theme-muted font-medium">Kennzahlen:</span>
           {['revenue', 'netIncome', 'peRatio', 'roe', 'freeCashFlow'].map(metric => {
             const metricInfo = METRICS.find(m => m.value === metric)
             const isSelected = selectedMetrics.includes(metric)
             const canToggle = isSelected || selectedMetrics.length < maxMetrics
             
             return (
               <button
                 key={metric}
                 onClick={() => {
                   if (isSelected) {
                     setSelectedMetrics(prev => prev.filter(m => m !== metric))
                   } else if (canToggle) {
                     setSelectedMetrics(prev => [...prev, metric])
                   }
                 }}
                 disabled={!canToggle}
                 className={`px-2 py-0.5 rounded text-xs font-medium transition-all border ${
                   isSelected
                     ? 'bg-green-600 text-white border-green-600'
                     : canToggle
                       ? 'bg-theme-secondary/30 text-theme-secondary border-theme/20 hover:border-green-500/50 hover:text-theme-primary'
                       : 'bg-theme-secondary/20 text-theme-muted border-theme/10 cursor-not-allowed opacity-50'
                 }`}
               >
                 {metricInfo?.label}
               </button>
             )
           })}
         </div>

         <div className="w-px h-4 bg-theme/20"></div>

         {/* Period & Years */}
         <div className="flex items-center gap-2">
           <div className="flex bg-theme-secondary/20 rounded p-0.5">
             {[3, 5, 10].map(y => (
               <button
                 key={y}
                 onClick={() => setYears(y)}
                 className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                   years === y 
                     ? 'bg-theme-card text-theme-primary shadow-sm' 
                     : 'text-theme-muted hover:text-theme-primary'
                 }`}
               >
                 {y}Y
               </button>
             ))}
           </div>
           
           <div className="flex bg-theme-secondary/20 rounded p-0.5">
             <button
               onClick={() => setPeriod('annual')}
               className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                 period === 'annual' 
                   ? 'bg-theme-card text-theme-primary shadow-sm' 
                   : 'text-theme-muted hover:text-theme-primary'
               }`}
             >
               Jährlich
             </button>
             <button
               onClick={() => setPeriod('quarterly')}
               className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                 period === 'quarterly' 
                   ? 'bg-theme-card text-theme-primary shadow-sm' 
                   : 'text-theme-muted hover:text-theme-primary'
               }`}
             >
               Quartalsweise
             </button>
           </div>
         </div>
       </div>

       {selectedStocks.length === 0 ? (
         /* EMPTY STATE */
         <div className="flex items-center justify-center min-h-96">
           <div className="text-center">
             <ChartBarIcon className="w-16 h-16 text-theme-muted/40 mx-auto mb-4" />
             <h3 className="text-lg font-medium text-theme-primary mb-2">Aktien-Vergleich starten</h3>
             <p className="text-sm text-theme-muted mb-4 max-w-md">
               Füge Aktien hinzu um ihre Finanzkennzahlen, Ratios und Performance zu vergleichen.
             </p>
             <div className="flex items-center justify-center gap-2 relative">
               <input
                 type="text"
                 placeholder="Ticker eingeben..."
                 value={emptyStateSearch}
                 onChange={(e) => {
                   setEmptyStateSearch(e.target.value)
                   setShowEmptyStateDropdown(e.target.value.length > 0)
                 }}
                 onFocus={() => setShowEmptyStateDropdown(emptyStateSearch.length > 0)}
                 onBlur={() => setTimeout(() => setShowEmptyStateDropdown(false), 150)}
                 className="px-3 py-2 bg-theme-card border border-theme/20 rounded-lg text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
               />
               {filteredEmptyStateStocks.length > 0 && showEmptyStateDropdown && (
                 <div className="absolute top-full mt-2 w-64 bg-theme-card border border-theme/20 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                   {filteredEmptyStateStocks.map(stock => (
                     <button
                       key={stock.ticker}
                       onMouseDown={() => {
                         setSelectedStocks([stock.ticker])
                         setEmptyStateSearch('')
                         setShowEmptyStateDropdown(false)
                       }}
                       className="w-full px-3 py-2 text-left hover:bg-theme-secondary/30 transition-colors"
                     >
                       <div className="font-medium text-sm text-theme-primary">{stock.ticker}</div>
                       <div className="text-xs text-theme-muted truncate">{stock.name}</div>
                     </button>
                   ))}
                 </div>
               )}
             </div>
           </div>
         </div>
       ) : (
         /* MAIN CONTENT - StockUnlock Layout */
         <div className="space-y-4">
           
           {/* METRICS SELECTOR - Horizontal */}
           <div className="bg-theme-card rounded-lg border border-theme/10 p-3">
             <div className="text-xs font-medium text-theme-muted uppercase tracking-wide mb-3">
               Kennzahlen ({selectedMetrics.length}/{maxMetrics})
             </div>
             
             <div className="grid grid-cols-4 gap-0">
               {Object.entries(
                 METRICS.reduce((acc, metric) => {
                   if (!acc[metric.category]) acc[metric.category] = []
                   acc[metric.category].push(metric)
                   return acc
                 }, {} as Record<string, typeof METRICS>)
               ).map(([category, metrics], categoryIndex, array) => (
                 <div key={category} className={`px-3 ${categoryIndex % 2 === 1 ? 'bg-theme-secondary/5' : ''} ${categoryIndex < array.length - 1 ? 'border-r border-theme/10' : ''}`}>
                   <div className="text-xs font-medium text-theme-primary mb-2">{category}</div>
                   <div className="space-y-1">
                     {metrics.map(metric => {
                       const isSelected = selectedMetrics.includes(metric.value)
                       const canSelect = isSelected || selectedMetrics.length < maxMetrics
                       
                       return (
                         <button
                           key={metric.value}
                           onClick={() => {
                             if (isSelected) {
                               setSelectedMetrics(prev => prev.filter(m => m !== metric.value))
                             } else if (canSelect) {
                               setSelectedMetrics(prev => [...prev, metric.value])
                             }
                           }}
                           disabled={!canSelect}
                           className={`w-full text-left px-2 py-1 rounded text-xs transition-all ${
                             isSelected
                               ? 'bg-green-600 text-white'
                               : canSelect
                                 ? 'hover:bg-theme-secondary/40 text-theme-secondary'
                                 : 'text-theme-muted/50 cursor-not-allowed'
                           }`}
                         >
                           {metric.label}
                         </button>
                       )
                     })}
                   </div>
                 </div>
               ))}
             </div>
           </div>

           {loading ? (
             <div className="bg-theme-card rounded-lg border border-theme/10 h-96 flex items-center justify-center">
               <LoadingSpinner />
             </div>
           ) : viewMode === 'table' ? (
             /* PROFESSIONAL MULTI-YEAR TABLE */
             <div className="bg-theme-card rounded-lg border border-theme/10">
               <div className="p-4 overflow-auto max-h-[600px]">
                 <table className="w-full text-xs">
                   <thead className="sticky top-0 bg-theme-card z-10">
                     <tr className="border-b border-theme/20">
                       <th className="text-left py-2 px-3 text-theme-muted font-medium uppercase tracking-wide w-40">
                         Kennzahl
                       </th>
                       {selectedStocks.map((ticker, stockIndex) => (
                         <React.Fragment key={ticker}>
                           <th 
                             className={`text-center py-2 px-1 border-l border-theme/20 ${stockIndex === 0 ? '' : 'border-l-2'}`}
                             colSpan={availableYears.length + 2}
                           >
                             <div className="flex items-center justify-center gap-1.5 mb-1">
                               <div 
                                 className="w-2 h-2 rounded-full"
                                 style={{ backgroundColor: CHART_COLORS[stockIndex % CHART_COLORS.length] }}
                               />
                               <span className="font-semibold text-theme-primary text-sm">{ticker}</span>
                             </div>
                             <div className="flex text-xs text-theme-muted font-normal">
                               {availableYears.map(year => (
                                 <div key={year} className="flex-1 text-center py-1">
                                   {year}
                                 </div>
                               ))}
                               <div className="flex-1 text-center py-1 font-medium">Ø</div>
                               <div className="flex-1 text-center py-1 font-medium">CAGR</div>
                             </div>
                           </th>
                         </React.Fragment>
                       ))}
                     </tr>
                   </thead>
                   <tbody>
                     {tableData.map((row, rowIndex) => (
                       <tr key={row.metric} className={`border-b border-theme/10 hover:bg-theme-secondary/10 ${rowIndex % 2 === 0 ? 'bg-theme-secondary/5' : ''}`}>
                         <td className="py-2 px-3 sticky left-0 bg-theme-card">
                           <div className="flex flex-col">
                             <span className="font-medium text-theme-primary text-xs">{row.metric}</span>
                             <span className="text-theme-muted/60 text-xs">({row.category})</span>
                           </div>
                         </td>
                         {selectedStocks.map((ticker, stockIndex) => (
                           <React.Fragment key={ticker}>
                             {availableYears.map(year => {
                               const value = row[`${ticker}_${year}`]
                               return (
                                 <td key={year} className={`text-right py-2 px-1 ${stockIndex === 0 ? '' : stockIndex === 1 ? 'border-l border-theme/20' : 'border-l-2 border-theme/20'}`}>
                                   <span className="font-medium text-theme-primary">
                                     {formatTableValue(value, row.unit)}
                                   </span>
                                 </td>
                               )
                             })}
                             
                             <td className={`text-right py-2 px-1 bg-theme-secondary/20 ${stockIndex === 0 ? '' : 'border-l border-theme/20'}`}>
                               <span className="font-semibold text-theme-primary">
                                 {formatTableValue(row[`${ticker}_avg`], row.unit)}
                               </span>
                             </td>
                             
                             <td className="text-right py-2 px-1 bg-theme-secondary/20">
                               <span className={`font-semibold ${
                                 row[`${ticker}_cagr`] > 0 ? 'text-green-500' : row[`${ticker}_cagr`] < 0 ? 'text-red-500' : 'text-theme-muted'
                               }`}>
                                 {row[`${ticker}_cagr`] ? `${row[`${ticker}_cagr`].toFixed(1)}%` : '--'}
                               </span>
                             </td>
                           </React.Fragment>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           ) : (
             /* CHART VIEW - StockUnlock Layout */
             <>
               {chartData.length === 0 ? (
                 <div className="bg-theme-card rounded-lg border border-theme/10 h-96 flex items-center justify-center">
                   <div className="text-center">
                     <ChartBarIcon className="w-12 h-12 text-theme-muted/40 mx-auto mb-3" />
                     <p className="text-theme-muted">Keine Daten für Chart-Ansicht</p>
                     <p className="text-xs text-theme-muted mt-1">Wähle Aktien und Kennzahlen aus</p>
                   </div>
                 </div>
               ) : (
                 <>
                   {/* Chart */}
                   <div className="bg-theme-card rounded-lg border border-theme/10 p-4 h-[450px]">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart 
                         data={chartData} 
                         margin={{ top: 20, right: 20, left: 70, bottom: 60 }}
                       >
                         <CartesianGrid 
                           strokeDasharray="2 4" 
                           stroke="#404040" 
                           strokeWidth={0.8}
                           opacity={0.6}
                           horizontal={true}
                           vertical={true}
                         />
                         <XAxis 
                           dataKey="year" 
                           stroke="var(--text-muted)"
                           tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                           axisLine={{ stroke: 'var(--border-color)', opacity: 0.3 }}
                           tickLine={false}
                           dy={10}
                         />
                         <YAxis 
                           stroke="var(--text-muted)"
                           tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                           axisLine={{ stroke: 'rgba(255,255,255,0.1)', opacity: 0.5 }}
                           tickLine={false}
                           width={70}
                           tickFormatter={formatYAxis}
                         />
                         <RechartsTooltip
                           contentStyle={{
                             backgroundColor: 'var(--card-bg)',
                             border: '1px solid var(--border-color)',
                             borderRadius: '8px',
                             fontSize: '12px',
                             padding: '12px',
                             boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                           }}
                           cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, opacity: 0.7 }}
                           formatter={formatTooltipValue}
                           labelFormatter={(label) => `Jahr: ${label}`}
                         />
                         
                         {chartLines.map((line) => (
                           <Line
                             key={line.key}
                             type="monotone"
                             dataKey={line.key}
                             stroke={line.color}
                             strokeWidth={2.5}
                             dot={false}
                             activeDot={{ r: 4, fill: line.color, stroke: 'var(--card-bg)', strokeWidth: 2 }}
                             name={line.name}
                           />
                         ))}
                       </LineChart>
                     </ResponsiveContainer>
                   </div>
                   
                   {/* Professional Legend */}
                   <div className="bg-theme-card rounded-lg border border-theme/10 p-3 mt-4">
                     <div className="flex flex-wrap items-center justify-between">
                       <div className="flex flex-wrap gap-4">
                         {chartLines.map((line) => (
                           <div key={line.key} className="flex items-center gap-2">
                             <div 
                               className="w-4 h-0.5 rounded-full"
                               style={{ backgroundColor: line.color }}
                             />
                             <span className="text-xs font-medium text-theme-primary">
                               {line.name}
                             </span>
                           </div>
                         ))}
                       </div>
                       
                       {/* Info Badge for Additional Data */}
                       {additionalDataInfo && !showAllData && (
                         <div className="flex items-center gap-3">
                           <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 rounded text-xs">
                             <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                             <span className="text-blue-400 font-medium">
                               {additionalDataInfo.stocks.join(', ')} hat Daten bis {Math.max(...additionalDataInfo.years.map(y => parseInt(y)))}
                             </span>
                           </div>
                           <button
                             onClick={() => setShowAllData(true)}
                             className="px-2 py-1 bg-theme-secondary/30 hover:bg-blue-500/20 rounded text-xs font-medium text-theme-secondary hover:text-blue-400 transition-colors"
                           >
                             Alle Daten zeigen
                           </button>
                         </div>
                       )}
                       
                       {/* Toggle back to common range */}
                       {showAllData && (
                         <button
                           onClick={() => setShowAllData(false)}
                           className="px-2 py-1 bg-orange-500/10 hover:bg-orange-500/20 rounded text-xs font-medium text-orange-400 transition-colors"
                         >
                           Nur gemeinsamer Zeitraum
                         </button>
                       )}
                     </div>
                   </div>
                   
                   {/* Statistics Below Chart */}
                   <div className="bg-theme-card rounded-lg border border-theme/10 p-4 mt-4">
                     <div className="text-sm font-semibold text-theme-primary mb-4">Statistiken</div>
                     
                     <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                       {chartLines.map((line, lineIndex) => {
                         const values = chartData
                           .map(d => d[line.key])
                           .filter(v => v != null && v !== 0)
                         
                         if (values.length < 2) return null
                         
                         const firstValue = values[0]
                         const lastValue = values[values.length - 1]
                         const yearsCount = values.length - 1
                         const cagr = yearsCount > 0 ? (Math.pow(Math.abs(lastValue / firstValue), 1 / yearsCount) - 1) * 100 : 0
                         const average = values.reduce((a, b) => a + b, 0) / values.length
                         const sortedValues = [...values].sort((a, b) => a - b)
                         const median = sortedValues.length % 2 === 0
                           ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
                           : sortedValues[Math.floor(sortedValues.length / 2)]
                         const min = Math.min(...values)
                         const max = Math.max(...values)
                         
                         return (
                           <div key={line.key} className="bg-theme-secondary/10 rounded-lg p-4 border border-theme/5">
                             <div className="flex items-center gap-2 mb-4 pb-2 border-b border-theme/15">
                               <div 
                                 className="w-3 h-3 rounded-full shadow-sm"
                                 style={{ 
                                   backgroundColor: line.color,
                                   boxShadow: `0 0 0 2px ${line.color}20`
                                 }}
                               />
                               <div className="flex flex-col flex-1">
                                 <span className="text-sm font-semibold text-theme-primary">
                                   {line.name.split(' - ')[0]}
                                 </span>
                                 {line.name.includes(' - ') && (
                                   <span className="text-xs text-theme-muted font-medium">
                                     {line.name.split(' - ')[1]}
                                   </span>
                                 )}
                               </div>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4">
                               <div className="flex flex-col">
                                 <div className="text-theme-muted text-xs mb-2 font-medium uppercase tracking-wide">CAGR</div>
                                 <div className={`font-bold text-sm ${cagr >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                   {isNaN(cagr) ? '--' : `${cagr.toFixed(1)}%`}
                                 </div>
                               </div>
                               
                               <div className="flex flex-col">
                                 <div className="text-theme-muted text-xs mb-2 font-medium uppercase tracking-wide">Aktuell</div>
                                 <div className="font-bold text-theme-primary text-sm">
                                   {formatTooltipValue(lastValue, line.name)}
                                 </div>
                               </div>
                               
                               <div className="flex flex-col">
                                 <div className="text-theme-muted text-xs mb-2 font-medium uppercase tracking-wide">Durchschnitt</div>
                                 <div className="font-bold text-theme-primary text-sm">
                                   {formatTooltipValue(average, line.name)}
                                 </div>
                               </div>
                               
                               <div className="flex flex-col">
                                 <div className="text-theme-muted text-xs mb-2 font-medium uppercase tracking-wide">Median</div>
                                 <div className="font-bold text-theme-primary text-sm">
                                   {formatTooltipValue(median, line.name)}
                                 </div>
                               </div>
                             </div>
                           </div>
                         )
                       })}
                     </div>
                   </div>
                 </>
               )}
             </>
           )}
         </div>
       )}

       {/* PREMIUM CTA - COMPACT */}
       {!user?.isPremium && (
         <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 mt-4">
           <div className="flex items-center justify-between">
             <div>
               <div className="text-sm font-medium text-theme-primary">Professionelle Features freischalten</div>
               <div className="text-xs text-theme-muted">Bis zu 8 Aktien mit 15+ Kennzahlen vergleichen</div>
             </div>
             <Link
               href="/pricing"
               className="px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors flex items-center gap-1"
             >
               <SparklesIcon className="w-3 h-3" />
               Premium freischalten
             </Link>
           </div>
         </div>
       )}
     </div>
   </div>
 )
}