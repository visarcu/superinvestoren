// src/components/StockComparisonPage.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
 ResponsiveContainer,
 LineChart,
 Line,
 BarChart,
 Bar,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip as RechartsTooltip,
 Legend,
} from 'recharts'
import { 
 XMarkIcon, 
 PlusIcon,
 ChartBarIcon,
 SparklesIcon,
 ChevronDownIcon,
 ArrowPathIcon,
 CheckIcon,
 MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { stocks as availableStocks } from '@/data/stocks'
import { useCurrency } from '@/lib/CurrencyContext'
import { supabase } from '@/lib/supabaseClient'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'

// Kennzahlen-Liste
const METRICS = [
 { value: 'revenue', label: 'Umsatz', category: 'Gewinn & Verlust' },
 { value: 'netIncome', label: 'Nettogewinn', category: 'Gewinn & Verlust' },
 { value: 'ebitda', label: 'EBITDA', category: 'Gewinn & Verlust' },
 { value: 'eps', label: 'Gewinn je Aktie (EPS)', category: 'Gewinn & Verlust' },
 { value: 'operatingIncome', label: 'Betriebsergebnis', category: 'Gewinn & Verlust' },
 { value: 'grossProfit', label: 'Bruttogewinn', category: 'Gewinn & Verlust' },
 
 { value: 'freeCashFlow', label: 'Free Cash Flow', category: 'Cash Flow' },
 { value: 'operatingCashFlow', label: 'Operating Cash Flow', category: 'Cash Flow' },
 { value: 'capitalExpenditure', label: 'CapEx', category: 'Cash Flow' },
 
 { value: 'totalAssets', label: 'Bilanzsumme', category: 'Bilanz' },
 { value: 'totalDebt', label: 'Verschuldung', category: 'Bilanz' },
 { value: 'cash', label: 'Liquidität', category: 'Bilanz' },
 { value: 'totalEquity', label: 'Eigenkapital', category: 'Bilanz' },
 
 { value: 'peRatio', label: 'KGV (P/E)', category: 'Kennzahlen' },
 { value: 'pbRatio', label: 'KBV (P/B)', category: 'Kennzahlen' },
 { value: 'psRatio', label: 'KUV (P/S)', category: 'Kennzahlen' },
 { value: 'roe', label: 'Eigenkapitalrendite (ROE)', category: 'Kennzahlen' },
 { value: 'roa', label: 'Gesamtkapitalrendite (ROA)', category: 'Kennzahlen' },
 { value: 'currentRatio', label: 'Current Ratio', category: 'Kennzahlen' },
 { value: 'debtToEquity', label: 'Debt/Equity', category: 'Kennzahlen' },
 
 { value: 'grossMargin', label: 'Bruttomarge', category: 'Margen' },
 { value: 'operatingMargin', label: 'Operative Marge', category: 'Margen' },
 { value: 'netMargin', label: 'Nettomarge', category: 'Margen' },
]

// Erweiterte Farbpalette für bessere Unterscheidung
const CHART_COLORS = [
 '#3B82F6', // Blau
 '#10B981', // Grün
 '#F59E0B', // Gelb/Orange
 '#EF4444', // Rot
 '#8B5CF6', // Lila
 '#EC4899', // Pink
 '#14B8A6', // Türkis
 '#F97316', // Orange
 '#6366F1', // Indigo
 '#84CC16', // Lime
 '#06B6D4', // Cyan
 '#A855F7', // Purple
 '#F43F5E', // Rose
 '#0EA5E9', // Sky
 '#22C55E', // Green
]

interface User {
 id: string
 email: string
 isPremium: boolean
}

export default function StockComparisonPage() {
 const { formatCurrency, formatAxisValueDE } = useCurrency()
 
 // User State
 const [user, setUser] = useState<User | null>(null)
 const [loadingUser, setLoadingUser] = useState(true)
 
 // Comparison States
 const [selectedStocks, setSelectedStocks] = useState<string[]>([])
 const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['revenue'])
 const [stockSearch, setStockSearch] = useState('')
 const [metricSearch, setMetricSearch] = useState('')
 const [showStockDropdown, setShowStockDropdown] = useState(false)
 const [showMetricDropdown, setShowMetricDropdown] = useState(false)
 const [comparisonData, setComparisonData] = useState<any>(null)
 const [loading, setLoading] = useState(false)
 const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual')
 const [years, setYears] = useState(10)
 const [chartType, setChartType] = useState<'line' | 'bar'>('line')

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

 // Filtered stocks for search
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

 // Gefilterte Kennzahlen für Suche
 const filteredMetrics = useMemo(() => {
   if (!metricSearch) return METRICS
   const query = metricSearch.toLowerCase()
   return METRICS.filter(metric => 
     metric.label.toLowerCase().includes(query) ||
     metric.value.toLowerCase().includes(query) ||
     metric.category.toLowerCase().includes(query)
   )
 }, [metricSearch])

 // KOMBINIERTE Chart-Daten für ALLE Aktien und ALLE Kennzahlen
 const chartData = useMemo(() => {
   if (!comparisonData || selectedStocks.length === 0 || selectedMetrics.length === 0) return []

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
 }, [comparisonData, selectedMetrics, selectedStocks])

 // Generiere alle Linien/Balken für den Chart mit eindeutigen Farben
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

 // Berechne aggregierte Statistiken
 const calculateStatistics = useMemo(() => {
   if (!chartData || chartData.length < 2) return null
   
   const stats: Record<string, any> = {}
   
   chartLines.forEach(line => {
     const values = chartData
       .map(d => d[line.key])
       .filter(v => v != null && v !== 0)
     
     if (values.length < 2) return
     
     // CAGR berechnen
     const firstValue = values[0]
     const lastValue = values[values.length - 1]
     const yearsCount = chartData.length - 1
     const cagr = yearsCount > 0 ? (Math.pow(Math.abs(lastValue / firstValue), 1 / yearsCount) - 1) * 100 : 0
     
     // Durchschnitt
     const average = values.reduce((a, b) => a + b, 0) / values.length
     
     // Median
     const sorted = [...values].sort((a, b) => a - b)
     const median = sorted.length % 2 === 0
       ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
       : sorted[Math.floor(sorted.length / 2)]
     
     // Min/Max
     const min = Math.min(...values)
     const max = Math.max(...values)
     
     // Volatilität (Standardabweichung)
     const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length
     const volatility = Math.sqrt(variance)
     
     stats[line.key] = {
       cagr: isNaN(cagr) ? 0 : cagr,
       average,
       median,
       min,
       max,
       volatility,
       latest: lastValue,
       first: firstValue,
       totalChange: firstValue !== 0 ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100 : 0
     }
   })
   
   return stats
 }, [chartData, chartLines])

 // Custom Legend Renderer
 const renderCustomLegend = (props: any) => {
   const { payload } = props
   
   if (selectedMetrics.length > 1) {
     const grouped: Record<string, any[]> = {}
     
     payload.forEach((entry: any) => {
       const [ticker] = entry.value.split('_')
       if (!grouped[ticker]) grouped[ticker] = []
       grouped[ticker].push(entry)
     })
     
     return (
       <div className="flex flex-wrap gap-4 justify-center mt-4">
         {Object.entries(grouped).map(([ticker, entries]) => (
           <div key={ticker} className="flex flex-col gap-1 p-2 bg-theme-tertiary/20 rounded">
             <div className="text-xs font-semibold text-theme-primary mb-1">{ticker}</div>
             {entries.map((entry: any) => {
               const metricName = entry.value.split('_')[1]
               const metric = METRICS.find(m => m.value === metricName)
               return (
                 <div key={entry.value} className="flex items-center gap-2">
                   <div 
                     className="w-3 h-3 rounded-full" 
                     style={{ backgroundColor: entry.color }}
                   />
                   <span className="text-xs text-theme-secondary">
                     {metric?.label || metricName}
                   </span>
                 </div>
               )
             })}
           </div>
         ))}
       </div>
     )
   }
   
   return (
     <div className="flex flex-wrap gap-3 justify-center mt-4">
       {payload.map((entry: any) => (
         <div key={entry.value} className="flex items-center gap-2">
           <div 
             className="w-3 h-3 rounded-full" 
             style={{ backgroundColor: entry.color }}
           />
           <span className="text-xs text-theme-secondary">{entry.value}</span>
         </div>
       ))}
     </div>
   )
 }

 // Format Y-Axis
 const formatYAxis = (value: number) => {
   if (selectedMetrics.length > 1) {
     return formatAxisValueDE(value)
   }
   
   const metric = selectedMetrics[0]
   const metricDef = METRICS.find(m => m.value === metric)
   
   if (metricDef?.category === 'Margen' || metric === 'roe' || metric === 'roa') {
     return `${(value * 100).toFixed(0)}%`
   }
   if (metric === 'eps' || metricDef?.category === 'Kennzahlen') {
     return value.toFixed(1)
   }
   return formatAxisValueDE(value)
 }

 const formatTooltipValue = (value: number, name: string) => {
   let metric = selectedMetrics[0]
   if (selectedMetrics.length > 1 && name.includes(' - ')) {
     const metricLabel = name.split(' - ')[1]
     const found = METRICS.find(m => m.label === metricLabel)
     if (found) metric = found.value
   }
   
   const metricDef = METRICS.find(m => m.value === metric)
   
   if (metricDef?.category === 'Margen' || metric === 'roe' || metric === 'roa') {
     return `${(value * 100).toFixed(1)}%`
   }
   if (metric === 'eps') {
     return formatCurrency(value, 'currency')
   }
   if (metricDef?.category === 'Kennzahlen') {
     return value.toFixed(2)
   }
   return formatCurrency(value)
 }

 const maxStocks = user?.isPremium ? 5 : 2
 const maxMetrics = user?.isPremium ? 10 : 3

 // Toggle Metric Selection
 const toggleMetric = (metricValue: string) => {
   if (selectedMetrics.includes(metricValue)) {
     setSelectedMetrics(prev => prev.filter(m => m !== metricValue))
   } else {
     if (selectedMetrics.length < maxMetrics) {
       setSelectedMetrics(prev => [...prev, metricValue])
     }
   }
 }

 // Get current metrics labels
 const currentMetricsLabel = selectedMetrics
   .map(m => METRICS.find(metric => metric.value === m)?.label)
   .filter(Boolean)
   .join(', ')

 if (loadingUser) {
   return (
     <div className="flex h-screen items-center justify-center">
       <LoadingSpinner />
     </div>
   )
 }

 return (
   <div className="min-h-screen bg-theme-primary">
     <div className="max-w-[1600px] mx-auto p-4">
       
       {/* HEADER */}
       <div className="mb-4">
         <h1 className="text-xl font-bold text-theme-primary">Aktien-Vergleich</h1>
         <p className="text-xs text-theme-secondary">
           Vergleiche bis zu {maxStocks} Aktien • {selectedMetrics.length} von {maxMetrics} Kennzahlen ausgewählt
         </p>
       </div>

       {/* CONTROLS BAR */}
       <div className="bg-theme-secondary rounded-lg p-3 mb-4 border border-theme/10">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
           
           {/* AKTIEN SECTION */}
           <div className="lg:col-span-3">
             <label className="text-xs text-theme-muted uppercase tracking-wider font-semibold block mb-2">
               AKTIEN ({selectedStocks.length}/{maxStocks})
             </label>
             
             <div className="flex flex-wrap gap-2 mb-2">
               {selectedStocks.map((ticker, index) => (
                 <div
                   key={ticker}
                   className="inline-flex items-center gap-2 px-3 py-1.5 bg-theme-card rounded-full border border-theme/20"
                 >
                   <div 
                     className="w-2 h-2 rounded-full"
                     style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                   />
                   <span className="text-sm font-medium text-theme-primary">{ticker}</span>
                   <button
                     onClick={() => setSelectedStocks(prev => prev.filter(s => s !== ticker))}
                     className="hover:text-red-400 transition-colors"
                   >
                     <XMarkIcon className="w-3 h-3" />
                   </button>
                 </div>
               ))}
             </div>
             
             {selectedStocks.length < maxStocks && (
               <div className="relative">
                 <input
                   type="text"
                   placeholder="+ Aktie hinzufügen"
                   value={stockSearch}
                   onChange={(e) => {
                     setStockSearch(e.target.value)
                     setShowStockDropdown(true)
                   }}
                   onFocus={() => setShowStockDropdown(true)}
                   className="w-full px-3 py-2 bg-theme-card border border-theme/20 rounded-lg text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                 />
                 
                 {showStockDropdown && filteredStocks.length > 0 && (
                   <>
                     <div 
                       className="fixed inset-0 z-40" 
                       onClick={() => setShowStockDropdown(false)}
                     />
                     <div className="absolute top-full mt-2 left-0 right-0 bg-theme-card border border-theme/20 rounded-lg shadow-2xl z-50 max-h-64 overflow-y-auto">
                       {filteredStocks.map(stock => (
                         <button
                           key={stock.ticker}
                           onClick={() => {
                             setSelectedStocks(prev => [...prev, stock.ticker])
                             setStockSearch('')
                             setShowStockDropdown(false)
                           }}
                           className="w-full px-4 py-2.5 text-left hover:bg-green-500/10 transition-colors flex items-center justify-between group"
                         >
                           <div>
                             <span className="font-semibold text-sm text-theme-primary">{stock.ticker}</span>
                             <span className="text-xs text-theme-secondary ml-2">{stock.name}</span>
                           </div>
                           <PlusIcon className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                         </button>
                       ))}
                     </div>
                   </>
                 )}
               </div>
             )}
             
             {selectedStocks.length >= maxStocks && !user?.isPremium && (
               <Link
                 href="/pricing"
                 className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-500/10 text-yellow-600 rounded-lg text-xs font-medium hover:bg-yellow-500/20 transition-colors mt-2"
               >
                 <SparklesIcon className="w-3 h-3" />
                 Premium für mehr Aktien
               </Link>
             )}
           </div>

           {/* KENNZAHL MULTI-SELECT mit SUCHE */}
           <div className="lg:col-span-3">
             <label className="text-xs text-theme-muted uppercase tracking-wider font-semibold block mb-2">
               KENNZAHL ({selectedMetrics.length}/{maxMetrics})
             </label>
             
             <div className="relative">
               <button
                 onClick={() => setShowMetricDropdown(!showMetricDropdown)}
                 className="w-full px-3 py-2 bg-theme-card border border-theme/20 rounded-lg text-sm text-theme-primary text-left flex items-center justify-between hover:border-green-500/50 transition-all focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
               >
                 <span className="truncate">
                   {selectedMetrics.length === 0 
                     ? 'Kennzahlen auswählen...' 
                     : currentMetricsLabel.length > 30 
                       ? `${selectedMetrics.length} ausgewählt`
                       : currentMetricsLabel
                   }
                 </span>
                 <ChevronDownIcon className={`w-4 h-4 text-theme-muted transition-transform flex-shrink-0 ${showMetricDropdown ? 'rotate-180' : ''}`} />
               </button>
               
               {showMetricDropdown && (
                 <>
                   <div 
                     className="fixed inset-0 z-40" 
                     onClick={() => {
                       setShowMetricDropdown(false)
                       setMetricSearch('')
                     }}
                   />
                   <div className="absolute top-full mt-2 left-0 right-0 bg-black/95 backdrop-blur-xl border border-green-500/20 rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden">
                     <div className="sticky top-0 bg-black/95 backdrop-blur-xl border-b border-theme/20 p-3 space-y-2">
                       <div className="flex items-center justify-between">
                         <span className="text-xs font-semibold text-theme-muted">
                           {selectedMetrics.length} von {maxMetrics} ausgewählt
                         </span>
                         {selectedMetrics.length > 0 && (
                           <button
                             onClick={() => setSelectedMetrics([])}
                             className="text-xs text-red-400 hover:text-red-300"
                           >
                             Alle entfernen
                           </button>
                         )}
                       </div>
                       <div className="relative">
                         <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-theme-muted" />
                         <input
                           type="text"
                           placeholder="Kennzahlen durchsuchen..."
                           value={metricSearch}
                           onChange={(e) => setMetricSearch(e.target.value)}
                           onClick={(e) => e.stopPropagation()}
                           className="w-full pl-9 pr-3 py-2 bg-theme-tertiary/50 border border-theme/20 rounded-md text-sm text-theme-primary placeholder-theme-muted focus:outline-none focus:border-green-500/50 focus:bg-theme-tertiary/70"
                         />
                       </div>
                     </div>
                     
                     <div className="overflow-y-auto max-h-80">
                       {Array.from(new Set(filteredMetrics.map(m => m.category))).map(category => {
                         const categoryMetrics = filteredMetrics.filter(m => m.category === category)
                         if (categoryMetrics.length === 0) return null
                         
                         return (
                           <div key={category}>
                             <div className="px-4 py-2 text-xs font-semibold text-theme-muted bg-theme-tertiary/30 sticky top-0">
                               {category}
                             </div>
                             {categoryMetrics.map(metric => {
                               const isSelected = selectedMetrics.includes(metric.value)
                               const isDisabled = !isSelected && selectedMetrics.length >= maxMetrics
                               
                               return (
                                 <button
                                   key={metric.value}
                                   onClick={() => !isDisabled && toggleMetric(metric.value)}
                                   disabled={isDisabled}
                                   className={`
                                     w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between
                                     ${isSelected 
                                       ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                                       : isDisabled
                                         ? 'text-theme-muted cursor-not-allowed opacity-50'
                                         : 'text-theme-primary hover:bg-theme-tertiary/50'
                                     }
                                   `}
                                 >
                                   <span>{metric.label}</span>
                                   {isSelected && <CheckIcon className="w-4 h-4 text-green-500" />}
                                   {isDisabled && <SparklesIcon className="w-3 h-3 text-yellow-500" />}
                                 </button>
                               )
                             })}
                           </div>
                         )
                       })}
                       
                       {filteredMetrics.length === 0 && (
                         <div className="p-8 text-center text-theme-muted text-sm">
                           Keine Kennzahlen gefunden für "{metricSearch}"
                         </div>
                       )}
                     </div>
                     
                     {!user?.isPremium && (
                       <div className="sticky bottom-0 bg-black/95 backdrop-blur-xl border-t border-theme/20 p-3">
                         <Link
                           href="/pricing"
                           className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-600 rounded-lg text-xs font-medium hover:bg-yellow-500/20 transition-colors"
                         >
                           <SparklesIcon className="w-3 h-3" />
                           Premium: Bis zu {maxMetrics} Kennzahlen
                         </Link>
                       </div>
                     )}
                   </div>
                 </>
               )}
             </div>
           </div>

           {/* ZEITRAUM */}
           <div className="lg:col-span-2">
             <label className="text-xs text-theme-muted uppercase tracking-wider font-semibold block mb-2">
               ZEITRAUM
             </label>
             <div className="flex gap-1 bg-theme-card rounded-lg p-1 border border-theme/20">
               {[5, 10, 15].map(y => (
                 <button
                   key={y}
                   onClick={() => setYears(y)}
                   className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                     years === y 
                       ? 'bg-green-500 text-white shadow-sm' 
                       : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary/50'
                   }`}
                 >
                   {y}J
                 </button>
               ))}
             </div>
           </div>

           {/* PERIODE */}
           <div className="lg:col-span-2">
             <label className="text-xs text-theme-muted uppercase tracking-wider font-semibold block mb-2">
               PERIODE
             </label>
             <div className="flex gap-1 bg-theme-card rounded-lg p-1 border border-theme/20">
               <button
                 onClick={() => setPeriod('annual')}
                 className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                   period === 'annual' 
                     ? 'bg-green-500 text-white shadow-sm' 
                     : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary/50'
                 }`}
               >
                 Jährlich
               </button>
               <button
                 onClick={() => setPeriod('quarterly')}
                 className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                   period === 'quarterly' 
                     ? 'bg-green-500 text-white shadow-sm' 
                     : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary/50'
                 }`}
               >
                 Quartal
               </button>
             </div>
           </div>

           {/* CHART-TYP */}
           <div className="lg:col-span-1">
             <label className="text-xs text-theme-muted uppercase tracking-wider font-semibold block mb-2">
               CHART
             </label>
             <div className="flex gap-1 bg-theme-card rounded-lg p-1 border border-theme/20">
               <button
                 onClick={() => setChartType('line')}
                 className={`flex-1 px-2 py-1.5 rounded-md text-sm font-medium transition-all ${
                   chartType === 'line' 
                     ? 'bg-green-500 text-white shadow-sm' 
                     : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary/50'
                 }`}
                 title="Linien"
               >
                 <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M3 10h18M3 16h18" />
                 </svg>
               </button>
               <button
                 onClick={() => setChartType('bar')}
                 className={`flex-1 px-2 py-1.5 rounded-md text-sm font-medium transition-all ${
                   chartType === 'bar' 
                     ? 'bg-green-500 text-white shadow-sm' 
                     : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary/50'
                 }`}
                 title="Balken"
               >
                 <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                 </svg>
               </button>
             </div>
           </div>

           {/* REFRESH */}
           <div className="lg:col-span-1 flex items-end">
             <button
               onClick={() => {
                 setLoading(true)
                 setTimeout(() => setLoading(false), 1000)
               }}
               className="w-full h-[42px] bg-theme-card border border-theme/20 rounded-lg hover:bg-theme-tertiary/50 transition-colors flex items-center justify-center"
               title="Aktualisieren"
             >
               <ArrowPathIcon className={`w-4 h-4 text-theme-muted ${loading ? 'animate-spin' : ''}`} />
             </button>
           </div>
         </div>
       </div>

       {/* GROSSER CHART */}
       <div className="bg-theme-card rounded-lg shadow-sm border border-theme/5">
         <div className="p-3 border-b border-theme/10">
           <h3 className="font-semibold text-theme-primary flex items-center gap-2 text-sm">
             <ChartBarIcon className="w-4 h-4 text-theme-muted" />
             {selectedMetrics.length > 0 
               ? currentMetricsLabel 
               : 'Kennzahlen-Vergleich'
             }
           </h3>
         </div>
         
         <div className="p-4">
           {loading ? (
             <div className="h-[600px] flex items-center justify-center">
               <LoadingSpinner />
             </div>
           ) : selectedStocks.length === 0 || selectedMetrics.length === 0 ? (
             <div className="h-[600px] flex items-center justify-center">
               <div className="text-center">
                 <ChartBarIcon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
                 <p className="text-theme-secondary">
                   {selectedStocks.length === 0 
                     ? 'Wähle mindestens eine Aktie aus'
                     : 'Wähle mindestens eine Kennzahl aus'
                   }
                 </p>
               </div>
             </div>
           ) : (
             <>
               {/* Chart Container */}
               <div className="h-[600px]">
                 <ResponsiveContainer width="100%" height="100%">
                   {chartType === 'line' ? (
                     <LineChart 
                       data={chartData} 
                       margin={{ top: 10, right: 40, left: 70, bottom: 60 }}
                     >
                       <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.1} />
                       <XAxis 
                         dataKey="year" 
                         stroke="var(--text-muted)"
                         tick={{ fontSize: 11 }}
                         axisLine={{ stroke: 'var(--border-color)', opacity: 0.2 }}
                         angle={-45}
                         textAnchor="end"
                         height={60}
                       />
                       <YAxis 
                         stroke="var(--text-muted)"
                         tick={{ fontSize: 11 }}
                         tickFormatter={formatYAxis}
                         axisLine={{ stroke: 'var(--border-color)', opacity: 0.2 }}
                         width={70}
                       />
                       <RechartsTooltip
                         contentStyle={{
                           backgroundColor: 'var(--card-bg)',
                           border: '1px solid var(--border-color)',
                           borderRadius: '8px',
                           fontSize: '13px',
                           padding: '8px 12px'
                         }}
                         formatter={(value: any, name: any) => formatTooltipValue(value, name)}
                         labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}
                       />
                       <Legend content={renderCustomLegend} />
                       
                       {chartLines.map((line) => (
                         <Line
                           key={line.key}
                           type="monotone"
                           dataKey={line.key}
                           stroke={line.color}
                           strokeWidth={2.5}
                           dot={{ r: 4, fill: line.color }}
                           activeDot={{ r: 6, fill: line.color }}
                           name={line.name}
                         />
                       ))}
                     </LineChart>
                   ) : (
                     <BarChart 
                       data={chartData} 
                       margin={{ top: 10, right: 40, left: 70, bottom: 60 }}
                     >
                       <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.1} />
                       <XAxis 
                         dataKey="year" 
                         stroke="var(--text-muted)"
                         tick={{ fontSize: 11 }}
                         axisLine={{ stroke: 'var(--border-color)', opacity: 0.2 }}
                         angle={-45}
                         textAnchor="end"
                         height={60}
                       />
                       <YAxis 
                         stroke="var(--text-muted)"
                         tick={{ fontSize: 11 }}
                         tickFormatter={formatYAxis}
                         axisLine={{ stroke: 'var(--border-color)', opacity: 0.2 }}
                         width={70}
                       />
                       <RechartsTooltip
                         contentStyle={{
                           backgroundColor: 'var(--card-bg)',
                           border: '1px solid var(--border-color)',
                           borderRadius: '8px',
                           fontSize: '13px',
                           padding: '8px 12px'
                         }}
                         formatter={(value: any, name: any) => formatTooltipValue(value, name)}
                         labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}
                       />
                       <Legend content={renderCustomLegend} />
                       
                       {chartLines.map((line) => (
                         <Bar
                           key={line.key}
                           dataKey={line.key}
                           fill={line.color}
                           name={line.name}
                         />
                       ))}
                     </BarChart>
                   )}
                 </ResponsiveContainer>
               </div>

               {/* Erweiterte Statistik-Tabelle */}
               {chartData.length > 0 && calculateStatistics && (
                 <div className="mt-6 border-t border-theme/10 pt-4">
                   <div className="flex items-center justify-between mb-3">
                     <h4 className="text-sm font-semibold text-theme-primary">
                       Kennzahlen-Analyse ({chartData[0].year} - {chartData[chartData.length - 1].year})
                     </h4>
                     <div className="flex gap-2">
                       <span className="text-xs text-theme-muted px-2 py-1 bg-theme-tertiary/30 rounded">
                         {chartData.length} Datenpunkte
                       </span>
                       <span className="text-xs text-theme-muted px-2 py-1 bg-theme-tertiary/30 rounded">
                         {period === 'annual' ? 'Jährlich' : 'Quartalsweise'}
                       </span>
                     </div>
                   </div>
                   
                   {/* Kompakte Statistik-Cards */}
                   <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                     {chartLines.map((line) => {
                       const stats = calculateStatistics[line.key]
                       if (!stats) return null
                       
                       const metricInfo = selectedMetrics.length > 1 && line.name.includes(' - ')
                         ? METRICS.find(m => m.label === line.name.split(' - ')[1])
                         : METRICS.find(m => m.value === selectedMetrics[0])
                       
                       return (
                         <div key={line.key} className="bg-theme-tertiary/20 rounded-lg p-4 border border-theme/10">
                           {/* Header */}
                           <div className="flex items-start justify-between mb-3">
                             <div className="flex items-center gap-2">
                               <div 
                                 className="w-3 h-3 rounded-full"
                                 style={{ backgroundColor: line.color }}
                               />
                               <div>
                                 <h5 className="font-medium text-sm text-theme-primary">
                                   {line.name}
                                 </h5>
                                 <p className="text-xs text-theme-muted mt-0.5">
                                   {metricInfo?.category}
                                 </p>
                               </div>
                             </div>
                             <div className={`text-right ${stats.totalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                               <div className="text-sm font-semibold">
                                 {stats.totalChange >= 0 ? '↑' : '↓'} {Math.abs(stats.totalChange).toFixed(1)}%
                               </div>
                               <div className="text-xs opacity-75">Gesamt</div>
                             </div>
                           </div>
                           
                           {/* Key Metrics Grid */}
                           <div className="grid grid-cols-3 gap-3 mb-3">
                             <div>
                               <div className="text-xs text-theme-muted mb-1">CAGR</div>
                               <div className={`text-sm font-semibold ${stats.cagr >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                 {stats.cagr.toFixed(1)}%
                               </div>
                             </div>
                             <div>
                               <div className="text-xs text-theme-muted mb-1">Ø Durchschnitt</div>
                               <div className="text-sm font-semibold text-theme-primary">
                                 {formatTooltipValue(stats.average, line.name)}
                               </div>
                             </div>
                             <div>
                               <div className="text-xs text-theme-muted mb-1">Median</div>
                               <div className="text-sm font-semibold text-theme-primary">
                                 {formatTooltipValue(stats.median, line.name)}
                               </div>
                             </div>
                           </div>
                           
                           {/* Min/Max Range */}
                           <div className="space-y-2">
                             <div className="flex items-center justify-between text-xs">
                               <span className="text-theme-muted">Bereich</span>
                               <span className="text-theme-secondary">
                                 {formatTooltipValue(stats.min, line.name)} - {formatTooltipValue(stats.max, line.name)}
                               </span>
                             </div>
                             
                             {/* Visual Range Bar */}
                             <div className="relative h-2 bg-theme-tertiary/30 rounded-full overflow-hidden">
                               <div 
                                 className="absolute h-full rounded-full"
                                 style={{
                                   backgroundColor: line.color,
                                   opacity: 0.3,
                                   width: '100%'
                                 }}
                               />
                               <div 
                                 className="absolute h-full rounded-full"
                                 style={{
                                   backgroundColor: line.color,
                                   left: `${((stats.latest - stats.min) / (stats.max - stats.min)) * 100}%`,
                                   width: '2px'
                                 }}
                               />
                             </div>
                             
                             {/* Aktueller Wert */}
                             <div className="flex items-center justify-between">
                               <span className="text-xs text-theme-muted">Aktuell ({chartData[chartData.length - 1].year})</span>
                               <span className="text-sm font-semibold text-theme-primary">
                                 {formatTooltipValue(stats.latest, line.name)}
                               </span>
                             </div>
                           </div>
                         </div>
                       )
                     })}
                   </div>
                   
                   {/* Aggregierte Gesamtstatistik wenn nur eine Kennzahl */}
                   {selectedMetrics.length === 1 && selectedStocks.length > 1 && calculateStatistics && (
                     <div className="mt-4 p-4 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-lg border border-green-500/20">
                       <h5 className="text-sm font-semibold text-theme-primary mb-3">
                         Vergleichsübersicht: {METRICS.find(m => m.value === selectedMetrics[0])?.label}
                       </h5>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         <div>
                           <div className="text-xs text-theme-muted mb-1">Bester CAGR</div>
                           <div className="text-sm font-semibold text-green-400">
                             {(() => {
                               const best = chartLines.reduce((prev, curr) => 
                                 (calculateStatistics[curr.key]?.cagr || 0) > (calculateStatistics[prev.key]?.cagr || 0) ? curr : prev
                               )
                               return `${best.name}: ${calculateStatistics[best.key]?.cagr?.toFixed(1) || 0}%`
                             })()}
                           </div>
                         </div>
                         <div>
                           <div className="text-xs text-theme-muted mb-1">Höchster Wert</div>
                           <div className="text-sm font-semibold text-theme-primary">
                             {(() => {
                               const best = chartLines.reduce((prev, curr) => 
                                 (calculateStatistics[curr.key]?.max || 0) > (calculateStatistics[prev.key]?.max || 0) ? curr : prev
                               )
                               return `${best.name}: ${formatTooltipValue(calculateStatistics[best.key]?.max || 0, best.name)}`
                             })()}
                           </div>
                         </div>
                         <div>
                           <div className="text-xs text-theme-muted mb-1">Stabilste (niedrigste Volatilität)</div>
                           <div className="text-sm font-semibold text-blue-400">
                             {(() => {
                               const best = chartLines.reduce((prev, curr) => 
                                 (calculateStatistics[curr.key]?.volatility || Infinity) < (calculateStatistics[prev.key]?.volatility || Infinity) ? curr : prev
                               )
                               return best.name
                             })()}
                           </div>
                         </div>
                         <div>
                           <div className="text-xs text-theme-muted mb-1">Beste Gesamtperformance</div>
                           <div className="text-sm font-semibold text-green-400">
                             {(() => {
                               const best = chartLines.reduce((prev, curr) => 
                                 (calculateStatistics[curr.key]?.totalChange || -Infinity) > (calculateStatistics[prev.key]?.totalChange || -Infinity) ? curr : prev
                               )
                               return `${best.name}: ${calculateStatistics[best.key]?.totalChange >= 0 ? '+' : ''}${calculateStatistics[best.key]?.totalChange?.toFixed(1) || 0}%`
                             })()}
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               )}
             </>
           )}
         </div>

         {/* Info-Text wenn mehrere Kennzahlen */}
         {selectedMetrics.length > 1 && chartData.length > 0 && (
           <div className="px-4 pb-3">
             <p className="text-xs text-theme-muted opacity-70">
               ⚠️ Bei mehreren Kennzahlen werden alle Werte in derselben Skala angezeigt. 
               Für bessere Vergleichbarkeit empfiehlt es sich, ähnliche Kennzahlen auszuwählen.
             </p>
           </div>
         )}
       </div>

       {/* PREMIUM CTA */}
       {!user?.isPremium && (
         <div className="mt-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20">
           <div className="flex items-center justify-between">
             <div>
               <h3 className="font-semibold text-theme-primary text-sm">Mehr Möglichkeiten mit Premium</h3>
               <p className="text-xs text-theme-secondary">
                 Vergleiche bis zu 5 Aktien mit bis zu 10 Kennzahlen gleichzeitig
               </p>
             </div>
             <Link
               href="/pricing"
               className="px-3 py-1.5 bg-green-500 text-white rounded-lg font-medium text-xs hover:bg-green-600 transition-colors flex items-center gap-2"
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