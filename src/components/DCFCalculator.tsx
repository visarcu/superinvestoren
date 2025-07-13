// src/components/DCFCalculator.tsx - ENHANCED LEARN MODE VERSION
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  CalculatorIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  LockClosedIcon,
  SparklesIcon,
  ShieldCheckIcon,
  PresentationChartBarIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  BookOpenIcon,
  LightBulbIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { LearnTooltipButton } from '@/components/LearnSidebar'
import LoadingSpinner from '@/components/LoadingSpinner'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useLearnMode } from '@/lib/LearnModeContext'
import Logo from '@/components/Logo'
import { DCFCalculationBreakdown } from '@/components/DCFCalculationBreakdown'

// ✅ FIXED: Complete Types with currentFreeCashFlow
interface DCFData {
  currentRevenue: number
  currentPrice: number
  currentShares: number
  currentFreeCashFlow: number // ✅ ADDED: Real current FCF
  assumptions: DCFAssumptions
  companyInfo: {
    name: string
    sector: string
    industry: string
  }
  historical: {
    avgRevenueGrowth: number
    avgOperatingMargin: number
    estimatedWACC: number
  }
  // ✅ ENHANCED: Data Quality Info
  dataQuality?: {
    fcfDataSource?: string
    fcfIsEstimated?: boolean
    fcfSourceDescription?: string
    fcfValue?: number        // ✅ ADDED: Raw FCF value
    fcfDate?: string         // ✅ ADDED: FCF date
    fcfDataType?: string     // ✅ ADDED: Annual vs TTM
  }
}

interface DCFAssumptions {
  revenueGrowthY1: number
  revenueGrowthY2: number
  revenueGrowthY3: number
  revenueGrowthY4: number
  revenueGrowthY5: number
  terminalGrowthRate: number
  discountRate: number
  operatingMargin: number
  taxRate: number
  capexAsRevenuePercent: number
  workingCapitalChange: number
  netCash: number
}

interface User {
  id: string
  email: string
  isPremium: boolean
}

// ✅ PROFESSIONAL: Number Formatting & Validation Utilities
const formatAssumption = (value: number, decimals: number = 1): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${formatAssumption(value, decimals)}%`
}

// ✅ NEW: Input validation functions
const validateAndClampGrowthRate = (value: number, max: number = 25): number => {
  return Math.max(Math.min(value, max), -10)
}

const validateTerminalGrowthRate = (value: number, wacc: number): number => {
  // Terminal Growth Rate muss immer < WACC sein
  const maxTerminal = Math.min(wacc - 0.5, 4.0) // Max 4% oder WACC-0.5%
  return Math.max(Math.min(value, maxTerminal), 0)
}

const validateDiscountRate = (value: number): number => {
  return Math.max(Math.min(value, 20), 5) // Between 5% and 20%
}

// Premium CTA Component
const PremiumCTA = ({ title, description }: { title: string; description: string }) => (
  <div className="text-center py-12 px-6">
    <div className="w-16 h-16 bg-gradient-to-br border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
      {/* ✅ NUR DIESE ZEILE ÄNDERN - von CalculatorIcon zu LockClosedIcon */}
      <LockClosedIcon className="w-8 h-8 text-green-500" />
    </div>
    <h3 className="text-xl font-semibold text-theme-primary mb-3">{title}</h3>
    <p className="text-theme-secondary mb-6 max-w-md mx-auto leading-relaxed">{description}</p>
    
    <Link
      href="/pricing"
      className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black rounded-lg font-semibold transition-colors"
    >
      {/* ✅ NUR DIESE ZEILE ÄNDERN - von SparklesIcon zu LockClosedIcon */}
      <LockClosedIcon className="w-5 h-5" />
      14 Tage kostenlos testen
    </Link>
  </div>
)

// Premium Blur Component  
const PremiumBlur = ({ 
  children, 
  featureName 
}: { 
  children: React.ReactNode; 
  featureName: string 
}) => (
  <div className="relative">
    <div className="filter blur-sm opacity-60 pointer-events-none select-none">
      {children}
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-theme-card/90 backdrop-blur-sm rounded-lg p-3 text-center shadow-lg">
        {/* ✅ NUR DIESE ZEILE ÄNDERN - zu LockClosedIcon */}
        <LockClosedIcon className="w-5 h-5 text-green-500 mx-auto mb-1" />
        <p className="text-theme-secondary text-xs font-medium">{featureName}</p>
        <p className="text-theme-muted text-xs">Premium erforderlich</p>
      </div>
    </div>
  </div>
)

// Main DCF Calculator Component
export default function DCFCalculator({ ticker }: { ticker: string }) {
  // ✅ Self-Loading User State
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  
  // ✅ Global Learn Mode
  const { isLearnMode } = useLearnMode()

  // States
  const [dcfData, setDcfData] = useState<DCFData | null>(null)
  const [assumptions, setAssumptions] = useState<DCFAssumptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeScenario, setActiveScenario] = useState<'conservative' | 'base' | 'optimistic'>('base')
  const [showDetails, setShowDetails] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showBreakdown, setShowBreakdown] = useState(false)

  // ✅ Load User Data
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
        console.error('[DCFCalculator] Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  // Load DCF data
  useEffect(() => {
    async function loadDCFData() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/dcf/${ticker}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        // ✅ ENHANCED: Log FCF Data Source for Debugging
        console.log(`🔍 [DCFCalculator] Complete FCF Data for ${ticker}:`, {
          currentFreeCashFlow: data.currentFreeCashFlow,
          fcfDataSource: data.dataQuality?.fcfDataSource,
          fcfDataType: data.dataQuality?.fcfDataType,
          isEstimated: data.dataQuality?.fcfIsEstimated,
          description: data.dataQuality?.fcfSourceDescription,
          fcfValue: data.dataQuality?.fcfValue,
          fcfDate: data.dataQuality?.fcfDate
        })
        
        setDcfData(data)
        
        // ✅ PROFESSIONAL: Clean up assumptions with proper formatting
        const cleanAssumptions = {
          ...data.assumptions,
          revenueGrowthY1: formatAssumption(data.assumptions.revenueGrowthY1, 1),
          revenueGrowthY2: formatAssumption(data.assumptions.revenueGrowthY2, 1),
          revenueGrowthY3: formatAssumption(data.assumptions.revenueGrowthY3, 1),
          revenueGrowthY4: formatAssumption(data.assumptions.revenueGrowthY4, 1),
          revenueGrowthY5: formatAssumption(data.assumptions.revenueGrowthY5, 1),
          terminalGrowthRate: formatAssumption(data.assumptions.terminalGrowthRate, 1),
          discountRate: formatAssumption(data.assumptions.discountRate, 1),
          operatingMargin: formatAssumption(data.assumptions.operatingMargin, 1),
          taxRate: formatAssumption(data.assumptions.taxRate, 1),
          capexAsRevenuePercent: formatAssumption(data.assumptions.capexAsRevenuePercent, 1),
          workingCapitalChange: formatAssumption(data.assumptions.workingCapitalChange, 1),
          netCash: Math.round(data.assumptions.netCash)
        }
        
        setAssumptions(cleanAssumptions)
        
        console.log('✅ DCF data loaded:', data)
        
      } catch (err) {
        console.error('❌ Error loading DCF data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load DCF data')
      } finally {
        setLoading(false)
      }
    }

    loadDCFData()
  }, [ticker])

  // ✅ IMPROVED: Robust DCF Calculation with Validation
  const dcfResults = useMemo(() => {
    if (!assumptions || !dcfData) return null

    // ✅ NEW: Input validation
    const errors: string[] = []
    
    if (assumptions.discountRate <= assumptions.terminalGrowthRate) {
      errors.push("WACC muss höher sein als Terminal-Wachstumsrate")
    }
    
    if (assumptions.terminalGrowthRate > 4.0) {
      errors.push("Terminal-Wachstumsrate sollte nicht über 4% liegen")
    }

    if (assumptions.discountRate < 5 || assumptions.discountRate > 20) {
      errors.push("WACC sollte zwischen 5% und 20% liegen")
    }
    
    setValidationErrors(errors)
    
    if (errors.length > 0) {
      return null // Keine Berechnung bei Fehlern
    }

    const { 
      revenueGrowthY1, revenueGrowthY2, revenueGrowthY3, revenueGrowthY4, revenueGrowthY5,
      terminalGrowthRate, discountRate, operatingMargin, taxRate, 
      capexAsRevenuePercent, workingCapitalChange, netCash
    } = assumptions

    // Calculate 5-year projections
    const projections = []
    let revenue = dcfData.currentRevenue
    const growthRates = [revenueGrowthY1, revenueGrowthY2, revenueGrowthY3, revenueGrowthY4, revenueGrowthY5]
    
    for (let year = 1; year <= 5; year++) {
      revenue = revenue * (1 + growthRates[year - 1] / 100)
      const operatingIncome = revenue * (operatingMargin / 100)
      const tax = operatingIncome * (taxRate / 100)
      const nopat = operatingIncome - tax
      const capex = revenue * (capexAsRevenuePercent / 100)
      const workingCapChange = revenue * (workingCapitalChange / 100)
      const fcf = nopat - capex - workingCapChange
      
      projections.push({
        year,
        revenue,
        operatingIncome,
        nopat,
        capex,
        workingCapChange,
        fcf,
        presentValue: fcf / Math.pow(1 + discountRate / 100, year)
      })
    }

    // ✅ FIXED: Safe Terminal Value calculation
    const terminalFCF = projections[4].fcf * (1 + terminalGrowthRate / 100)
    const denominator = discountRate / 100 - terminalGrowthRate / 100
    
    // Additional safety check
    if (denominator <= 0.001) {
      console.error("Terminal Value calculation impossible: WACC ≤ Terminal Growth Rate")
      return null
    }
    
    const terminalValue = terminalFCF / denominator
    const terminalPV = terminalValue / Math.pow(1 + discountRate / 100, 5)

    // Enterprise Value
    const pvOfProjections = projections.reduce((sum, p) => sum + p.presentValue, 0)
    const enterpriseValue = pvOfProjections + terminalPV

    // Equity Value
    const equityValue = enterpriseValue + netCash
    const valuePerShare = equityValue / dcfData.currentShares

    return {
      projections,
      terminalValue,
      terminalPV,
      pvOfProjections,
      enterpriseValue,
      equityValue,
      valuePerShare,
      currentPrice: dcfData.currentPrice,
      upside: ((valuePerShare - dcfData.currentPrice) / dcfData.currentPrice) * 100
    }
  }, [assumptions, dcfData])

  // ✅ IMPROVED: Realistic scenario presets
  const scenarios = useMemo(() => {
    if (!dcfData) return {}
    
    const baseGrowth = dcfData.historical.avgRevenueGrowth
    const baseMargin = dcfData.historical.avgOperatingMargin
    const baseWACC = dcfData.historical.estimatedWACC

    return {
      conservative: {
        revenueGrowthY1: formatAssumption(Math.max(baseGrowth * 0.7, 3.0), 1),
        revenueGrowthY2: formatAssumption(Math.max(baseGrowth * 0.6, 2.5), 1),
        revenueGrowthY3: formatAssumption(Math.max(baseGrowth * 0.5, 2.0), 1),
        revenueGrowthY4: formatAssumption(Math.max(baseGrowth * 0.4, 1.5), 1),
        revenueGrowthY5: formatAssumption(Math.max(baseGrowth * 0.3, 1.0), 1),
        terminalGrowthRate: 2.0,
        discountRate: formatAssumption(Math.min(baseWACC + 1.5, 16.0), 1),
        operatingMargin: formatAssumption(Math.max(baseMargin * 0.9, 8.0), 1)
      },
      base: dcfData.assumptions,
      optimistic: {
        revenueGrowthY1: formatAssumption(Math.min(baseGrowth * 1.2, 18.0), 1),
        revenueGrowthY2: formatAssumption(Math.min(baseGrowth * 1.1, 15.0), 1),
        revenueGrowthY3: formatAssumption(Math.min(baseGrowth * 1.0, 12.0), 1),
        revenueGrowthY4: formatAssumption(Math.min(baseGrowth * 0.9, 10.0), 1),
        revenueGrowthY5: formatAssumption(Math.min(baseGrowth * 0.8, 8.0), 1),
        terminalGrowthRate: 3.0,
        discountRate: formatAssumption(Math.max(baseWACC - 1.0, 8.0), 1),
        operatingMargin: formatAssumption(Math.min(baseMargin * 1.1, 25.0), 1)
      }
    }
  }, [dcfData])

  // Event handlers with improved validation
  const applyScenario = (scenario: keyof typeof scenarios) => {
    setActiveScenario(scenario)
    const scenarioData = scenarios[scenario]
    if (scenarioData && assumptions) {
      // ✅ PROFESSIONAL: Clean formatting when applying scenarios
      const cleanScenario = {
        ...assumptions,
        ...scenarioData,
        revenueGrowthY1: formatAssumption(scenarioData.revenueGrowthY1 || assumptions.revenueGrowthY1, 1),
        revenueGrowthY2: formatAssumption(scenarioData.revenueGrowthY2 || assumptions.revenueGrowthY2, 1),
        revenueGrowthY3: formatAssumption(scenarioData.revenueGrowthY3 || assumptions.revenueGrowthY3, 1),
        revenueGrowthY4: formatAssumption(scenarioData.revenueGrowthY4 || assumptions.revenueGrowthY4, 1),
        revenueGrowthY5: formatAssumption(scenarioData.revenueGrowthY5 || assumptions.revenueGrowthY5, 1),
        terminalGrowthRate: formatAssumption(scenarioData.terminalGrowthRate || assumptions.terminalGrowthRate, 1),
        discountRate: formatAssumption(scenarioData.discountRate || assumptions.discountRate, 1),
        operatingMargin: formatAssumption(scenarioData.operatingMargin || assumptions.operatingMargin, 1)
      }
      setAssumptions(cleanScenario)
    }
  }

  // ✅ IMPROVED: Smart input validation
  const updateAssumption = (key: keyof DCFAssumptions, value: number) => {
    let validatedValue = value
    
    // Validierung je nach Parameter
    if (key.includes('Growth') && !key.includes('terminal')) {
      validatedValue = validateAndClampGrowthRate(value, 25)
    } else if (key === 'terminalGrowthRate') {
      validatedValue = validateTerminalGrowthRate(value, assumptions?.discountRate || 10)
    } else if (key === 'discountRate') {
      validatedValue = validateDiscountRate(value)
    } else if (key === 'netCash') {
      validatedValue = Math.round(value)
    } else {
      validatedValue = formatAssumption(value, 1)
    }
    
    setAssumptions(prev => prev ? { 
      ...prev, 
      [key]: validatedValue
    } : null)
  }

  // Utility functions
  const formatCurrency = (value: number) => 
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatNumber = (value: number, decimals = 1) => 
    value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

  const getUpsideColor = (upside: number) => {
    if (upside > 20) return 'text-green-400'
    if (upside > 0) return 'text-green-300'
    if (upside > -10) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Loading states
  if (loadingUser || loading) {
    return (
      <div className="bg-theme-card rounded-lg p-8">
        <div className="flex flex-col items-center justify-center">
          <LoadingSpinner />
          <p className="text-theme-secondary mt-4">
            {loadingUser ? 'Benutzerdaten werden geladen...' : 'DCF-Daten werden geladen...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !dcfData || !assumptions) {
    return (
      <div className="bg-theme-card rounded-lg p-8">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-theme-primary mb-2">DCF-Daten nicht verfügbar</h3>
          <p className="text-theme-secondary">
            {error || 'Keine ausreichenden Finanzdaten für DCF-Berechnung verfügbar.'}
          </p>
        </div>
      </div>
    )
  }

  // Premium check
  if (!user?.isPremium) {
    return (
      <div className="bg-theme-card rounded-lg">
        <div className="px-6 py-4 border-b border-theme/10">
          <div className="flex items-center gap-3">
            <CalculatorIcon className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-bold text-theme-primary">DCF Calculator</h3>
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-lg">
              <SparklesIcon className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-amber-400 font-medium">Premium</span>
            </div>
          </div>
        </div>
        
        <PremiumCTA
          title="Professioneller DCF Calculator"
          description="Bewerte Aktien mit unserem interaktiven DCF Calculator. Anpassbare Annahmen, Szenario-Analyse und detaillierte Berechnungen."
        />
      </div>
    )
  }

  return (
    <div className="bg-theme-card rounded-lg">
      {/* ✅ IMPROVED: Header with Real Logo */}
      <div className="px-6 py-4 border-b border-theme/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <CalculatorIcon className="w-6 h-6 text-green-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-theme-primary">DCF Calculator</h3>
                  {/* ✅ LEARN TOOLTIP für DCF Begriff */}
                  <LearnTooltipButton term="DCF" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Logo 
                    ticker={ticker} 
                    className="w-5 h-5"
                    alt={`${ticker} company logo`}
                  />
                  <p className="text-theme-secondary text-sm">
                    Discounted Cash Flow Bewertung für {dcfData.companyInfo.name} ({ticker})
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* ✅ FIXED: German Button */}
            {dcfResults && (
              <button
                onClick={() => setShowBreakdown(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <EyeIcon className="w-4 h-4" />
                Berechnung anzeigen
              </button>
            )}
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-2 bg-theme-secondary hover:bg-theme-tertiary text-theme-primary rounded-lg text-sm font-medium transition-colors"
            >
              {showDetails ? 'Details ausblenden' : 'Details anzeigen'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* ✅ ENHANCED Learn Mode Info mit Lexikon-Links */}
        {isLearnMode && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-green-400 font-semibold mb-2">DCF Calculator erklärt</h4>
                <p className="text-theme-secondary text-sm leading-relaxed mb-4">
                  Ein DCF Calculator projiziert die zukünftigen freien Cashflows eines Unternehmens für 5 Jahre, 
                  berechnet einen Terminalwert und diskontiert alle Cashflows auf den heutigen Wert zurück. 
                  Das Ergebnis ist der theoretische "faire Wert" der Aktie basierend auf fundamentalen Daten.
                </p>
                
                {/* ✅ LEXIKON CROSS-LINKS */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Link 
                    href="/lexikon/dcf"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md text-xs hover:bg-blue-500/30 transition-colors"
                  >
                    <BookOpenIcon className="w-3 h-3" />
                    DCF erklärt
                  </Link>
                  <Link 
                    href="/lexikon/wacc"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md text-xs hover:bg-blue-500/30 transition-colors"
                  >
                    <BookOpenIcon className="w-3 h-3" />
                    Was ist WACC?
                  </Link>
                  <Link 
                    href="/lexikon/terminal_value"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md text-xs hover:bg-blue-500/30 transition-colors"
                  >
                    <BookOpenIcon className="w-3 h-3" />
                    Terminal Value
                  </Link>
                  <Link 
                    href="/lexikon/free_cash_flow"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md text-xs hover:bg-blue-500/30 transition-colors"
                  >
                    <BookOpenIcon className="w-3 h-3" />
                    Free Cash Flow
                  </Link>
                </div>
                
                {/* ✅ BLOG ARTIKEL LINK */}
                <div className="border-t border-green-500/20 pt-3">
                  <Link 
                    href="/blog/dcf-bewertung-guide" // ✅ Dein zukünftiger Blog-Artikel
                    className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 text-sm font-medium"
                  >
                    <LightBulbIcon className="w-4 h-4" />
                    Vollständigen DCF-Guide lesen
                    <ArrowRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ PROFESSIONAL: Simplified FCF Data Source Info */}
        {dcfData.dataQuality && (
          <div className="p-4 bg-theme-secondary border border-theme/10 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-400" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-theme-primary font-medium">
                    FCF-Datenquelle: {dcfData.dataQuality.fcfSourceDescription}
                  </p>
                  {/* ✅ LEARN TOOLTIP für Free Cash Flow */}
                  <LearnTooltipButton term="Free Cash Flow" />
                </div>
                <p className="text-theme-muted text-sm mt-1">
                  {dcfData.dataQuality.fcfDate ? `Daten vom ${dcfData.dataQuality.fcfDate}` : 'Aktuelle Finanzdaten'} • 
                  {dcfData.dataQuality.fcfIsEstimated ? ' Geschätzte Werte' : ' Echte Finanzdaten'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: Validation Error Display */}
        {validationErrors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-semibold mb-2">Eingabefehler</h4>
                <ul className="text-theme-secondary text-sm space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        {dcfResults && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-theme-secondary rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-blue-400" />
                <div className="flex items-center gap-2">
                  <h4 className="text-theme-primary font-semibold">DCF Faire Bewertung</h4>
                  {/* ✅ LEARN TOOLTIP für Intrinsischer Wert */}
                  <LearnTooltipButton term="Intrinsischer Wert" />
                </div>
              </div>
              <div className="text-2xl font-bold text-theme-primary mb-1">
                {formatCurrency(dcfResults.valuePerShare)}
              </div>
              <div className="text-xs text-theme-muted">Pro Aktie</div>
            </div>

            <div className="bg-theme-secondary rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <ChartBarIcon className="w-5 h-5 text-green-400" />
                <h4 className="text-theme-primary font-semibold">Aktueller Preis</h4>
              </div>
              <div className="text-2xl font-bold text-theme-primary mb-1">
                {formatCurrency(dcfResults.currentPrice)}
              </div>
              <div className="text-xs text-theme-muted">Marktpreis</div>
            </div>

            <div className="bg-theme-secondary rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                {dcfResults.upside > 0 ? (
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-400" />
                ) : (
                  <ArrowTrendingDownIcon className="w-5 h-5 text-red-400" />
                )}
                <h4 className="text-theme-primary font-semibold">Upside/Downside</h4>
              </div>
              <div className={`text-2xl font-bold mb-1 ${getUpsideColor(dcfResults.upside)}`}>
                {dcfResults.upside > 0 ? '+' : ''}{formatNumber(dcfResults.upside)}%
              </div>
              <div className="text-xs text-theme-muted">
                {dcfResults.upside > 0 ? 'Unterbewertet' : 'Überbewertet'}
              </div>
            </div>
          </div>
        )}

        {/* Scenario Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => applyScenario('conservative')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeScenario === 'conservative'
                ? 'bg-orange-500 text-white'
                : 'bg-theme-secondary text-theme-primary hover:bg-theme-tertiary'
            }`}
          >
            <ShieldCheckIcon className="w-4 h-4" />
            Konservativ
          </button>
          
          <button
            onClick={() => applyScenario('base')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeScenario === 'base'
                ? 'bg-blue-500 text-white'
                : 'bg-theme-secondary text-theme-primary hover:bg-theme-tertiary'
            }`}
          >
            <PresentationChartBarIcon className="w-4 h-4" />
            Basis
          </button>
          
          <button
            onClick={() => applyScenario('optimistic')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeScenario === 'optimistic'
                ? 'bg-green-500 text-white'
                : 'bg-theme-secondary text-theme-primary hover:bg-theme-tertiary'
            }`}
          >
            <RocketLaunchIcon className="w-4 h-4" />
            Optimistisch
          </button>
        </div>

        {/* Assumptions Panel */}
        <div className="bg-theme-secondary rounded-lg mb-6">
          <div className="px-4 py-3 border-b border-theme/10">
            <div className="flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-theme-muted" />
              <h4 className="font-semibold text-theme-primary">Annahmen anpassen</h4>
              {dcfResults && validationErrors.length === 0 && (
                <CheckCircleIcon className="w-4 h-4 text-green-400 ml-2" />
              )}
            </div>
          </div>
          
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Revenue Growth */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-theme-secondary">Umsatzwachstum (%)</h5>
                {[1, 2, 3, 4, 5].map((year) => (
                  <div key={year} className="space-y-1">
                    <label className="text-xs text-theme-muted">Jahr {year}</label>
                    <input
                      type="number"
                      value={assumptions[`revenueGrowthY${year}` as keyof DCFAssumptions] as number}
                      onChange={(e) => updateAssumption(`revenueGrowthY${year}` as keyof DCFAssumptions, parseFloat(e.target.value) || 0)}
                      className="w-full bg-theme-tertiary border border-theme/20 rounded-md px-3 py-2 text-theme-primary text-sm focus:border-green-500 focus:outline-none"
                      step="0.1"
                      min="-10"
                      max="25"
                    />
                  </div>
                ))}
              </div>

              {/* Key Rates */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-theme-secondary">Zentrale Kennzahlen (%)</h5>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-theme-muted">
                      Terminal-Wachstumsrate (max {Math.min(assumptions.discountRate - 0.5, 4.0).toFixed(1)}%)
                    </label>
                    {/* ✅ LEARN TOOLTIP für Terminal Value */}
                    <LearnTooltipButton term="Terminal Value" />
                  </div>
                  <input
                    type="number"
                    value={assumptions.terminalGrowthRate}
                    onChange={(e) => updateAssumption('terminalGrowthRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-theme-tertiary border border-theme/20 rounded-md px-3 py-2 text-theme-primary text-sm focus:border-green-500 focus:outline-none"
                    step="0.1"
                    min="0"
                    max="4"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-theme-muted">Diskontierungssatz (WACC) (5-20%)</label>
                    {/* ✅ LEARN TOOLTIP für WACC */}
                    <LearnTooltipButton term="WACC" />
                  </div>
                  <input
                    type="number"
                    value={assumptions.discountRate}
                    onChange={(e) => updateAssumption('discountRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-theme-tertiary border border-theme/20 rounded-md px-3 py-2 text-theme-primary text-sm focus:border-green-500 focus:outline-none"
                    step="0.1"
                    min="5"
                    max="20"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-theme-muted">Operative Marge</label>
                    {/* ✅ LEARN TOOLTIP für Operating Margin */}
                    <LearnTooltipButton term="Operative Marge" />
                  </div>
                  <input
                    type="number"
                    value={assumptions.operatingMargin}
                    onChange={(e) => updateAssumption('operatingMargin', parseFloat(e.target.value) || 0)}
                    className="w-full bg-theme-tertiary border border-theme/20 rounded-md px-3 py-2 text-theme-primary text-sm focus:border-green-500 focus:outline-none"
                    step="0.1"
                    min="0"
                    max="50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-theme-muted">Steuersatz</label>
                  <input
                    type="number"
                    value={assumptions.taxRate}
                    onChange={(e) => updateAssumption('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-theme-tertiary border border-theme/20 rounded-md px-3 py-2 text-theme-primary text-sm focus:border-green-500 focus:outline-none"
                    step="0.1"
                    min="0"
                    max="50"
                  />
                </div>
              </div>

              {/* Other Assumptions */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-theme-secondary">Weitere Kennzahlen</h5>
                
                <div className="space-y-1">
                  <label className="text-xs text-theme-muted">Investitionen (% vom Umsatz)</label>
                  <input
                    type="number"
                    value={assumptions.capexAsRevenuePercent}
                    onChange={(e) => updateAssumption('capexAsRevenuePercent', parseFloat(e.target.value) || 0)}
                    className="w-full bg-theme-tertiary border border-theme/20 rounded-md px-3 py-2 text-theme-primary text-sm focus:border-green-500 focus:outline-none"
                    step="0.1"
                    min="0"
                    max="20"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-theme-muted">Working Capital Änderung (%)</label>
                    {/* ✅ LEARN TOOLTIP für Working Capital */}
                    <LearnTooltipButton term="Working Capital" />
                  </div>
                  <input
                    type="number"
                    value={assumptions.workingCapitalChange}
                    onChange={(e) => updateAssumption('workingCapitalChange', parseFloat(e.target.value) || 0)}
                    className="w-full bg-theme-tertiary border border-theme/20 rounded-md px-3 py-2 text-theme-primary text-sm focus:border-green-500 focus:outline-none"
                    step="0.1"
                    min="-10"
                    max="10"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Disclaimer */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-yellow-400 font-medium mb-1">Wichtiger Hinweis</h5>
              <p className="text-theme-secondary text-sm">
                Diese DCF-Berechnung basiert auf Annahmen über zukünftige Entwicklungen und dient nur zu Informationszwecken. 
                Alle Daten stammen aus FMP APIs. Sie stellt keine Anlageberatung dar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ FIXED: DCF Calculation Breakdown Modal with REAL Current FCF */}
      {dcfResults && dcfData && assumptions && (
        <DCFCalculationBreakdown
          isOpen={showBreakdown}
          onClose={() => setShowBreakdown(false)}
          results={dcfResults}
          assumptions={assumptions}
          currentRevenue={dcfData.currentRevenue}
          currentShares={dcfData.currentShares}
          companyName={dcfData.companyInfo.name}
          ticker={ticker}
          fcfDataSource={dcfData.dataQuality?.fcfDataSource}
          isEstimated={dcfData.dataQuality?.fcfIsEstimated}
          currentFreeCashFlow={dcfData.currentFreeCashFlow}
          fcfDataType={dcfData.dataQuality?.fcfDataType}
          fcfDate={dcfData.dataQuality?.fcfDate}
        />
      )}
    </div>
  )
}