// src/lib/dcfUtils.ts - DCF Utility Functions and Validations

export interface DCFAssumptions {
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
  
  export interface DCFData {
    currentRevenue: number
    currentPrice: number
    currentShares: number
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
  }
  
  export interface DCFResults {
    projections: Array<{
      year: number
      revenue: number
      operatingIncome: number
      nopat: number
      capex: number
      workingCapChange: number
      fcf: number
      presentValue: number
    }>
    terminalValue: number
    terminalPV: number
    pvOfProjections: number
    enterpriseValue: number
    equityValue: number
    valuePerShare: number
    currentPrice: number
    upside: number
  }
  
  export interface ValidationError {
    field: string
    message: string
    severity: 'error' | 'warning'
  }
  
  // ✅ FORMATTING UTILITIES
  export const formatAssumption = (value: number, decimals: number = 1): number => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }
  
  export const formatPercentage = (value: number, decimals: number = 1): string => {
    return `${formatAssumption(value, decimals)}%`
  }
  
  export const formatCurrency = (value: number, decimals: number = 2): string => 
    `$${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  
  export const formatNumber = (value: number, decimals: number = 1): string => 
    value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  
  // ✅ VALIDATION UTILITIES
  export const validateAndClampGrowthRate = (value: number, max: number = 25): number => {
    return Math.max(Math.min(value, max), -10)
  }
  
  export const validateTerminalGrowthRate = (value: number, wacc: number): number => {
    // Terminal Growth Rate muss immer < WACC sein
    const maxTerminal = Math.min(wacc - 0.5, 4.0) // Max 4% oder WACC-0.5%
    return Math.max(Math.min(value, maxTerminal), 0)
  }
  
  export const validateDiscountRate = (value: number): number => {
    return Math.max(Math.min(value, 20), 5) // Between 5% and 20%
  }
  
  // ✅ COMPREHENSIVE DCF VALIDATION
  export const validateDCFAssumptions = (assumptions: DCFAssumptions): ValidationError[] => {
    const errors: ValidationError[] = []
    
    // Critical Error: Terminal Growth >= Discount Rate
    if (assumptions.discountRate <= assumptions.terminalGrowthRate) {
      errors.push({
        field: 'terminalGrowthRate',
        message: 'WACC muss höher sein als Terminal-Wachstumsrate',
        severity: 'error'
      })
    }
    
    // Warning: High Terminal Growth Rate
    if (assumptions.terminalGrowthRate > 4.0) {
      errors.push({
        field: 'terminalGrowthRate',
        message: 'Terminal-Wachstumsrate über 4% ist unrealistisch',
        severity: 'warning'
      })
    }
    
    // Warning: Extreme Discount Rate
    if (assumptions.discountRate < 5 || assumptions.discountRate > 20) {
      errors.push({
        field: 'discountRate',
        message: 'WACC sollte zwischen 5% und 20% liegen',
        severity: 'warning'
      })
    }
    
    // Warning: Very High Growth Rates
    const growthRates = [
      assumptions.revenueGrowthY1,
      assumptions.revenueGrowthY2,
      assumptions.revenueGrowthY3,
      assumptions.revenueGrowthY4,
      assumptions.revenueGrowthY5
    ]
    
    if (growthRates.some(rate => rate > 30)) {
      errors.push({
        field: 'revenueGrowth',
        message: 'Wachstumsraten über 30% sind sehr optimistisch',
        severity: 'warning'
      })
    }
    
    // Warning: Negative Operating Margin
    if (assumptions.operatingMargin <= 0) {
      errors.push({
        field: 'operatingMargin',
        message: 'Negative operative Marge führt zu unrealistischen Ergebnissen',
        severity: 'warning'
      })
    }
    
    // Warning: Very High Operating Margin
    if (assumptions.operatingMargin > 40) {
      errors.push({
        field: 'operatingMargin',
        message: 'Operative Marge über 40% ist sehr optimistisch',
        severity: 'warning'
      })
    }
    
    return errors
  }
  
  // ✅ SECTOR-SPECIFIC VALIDATION
  export const getSectorSpecificLimits = (sector: string) => {
    const sectorLimits = {
      'Technology': {
        maxGrowthY1: 25,
        maxTerminalGrowth: 3.5,
        maxOperatingMargin: 35,
        typicalCapexPercent: 3.5
      },
      'Consumer Discretionary': {
        maxGrowthY1: 20,
        maxTerminalGrowth: 3.0,
        maxOperatingMargin: 25,
        typicalCapexPercent: 4.5
      },
      'Healthcare': {
        maxGrowthY1: 15,
        maxTerminalGrowth: 3.0,
        maxOperatingMargin: 30,
        typicalCapexPercent: 4.0
      },
      'Financials': {
        maxGrowthY1: 12,
        maxTerminalGrowth: 2.5,
        maxOperatingMargin: 30,
        typicalCapexPercent: 1.0
      },
      'Utilities': {
        maxGrowthY1: 8,
        maxTerminalGrowth: 2.0,
        maxOperatingMargin: 20,
        typicalCapexPercent: 15.0
      },
      'Energy': {
        maxGrowthY1: 15,
        maxTerminalGrowth: 2.5,
        maxOperatingMargin: 25,
        typicalCapexPercent: 12.0
      }
    }
    
    return sectorLimits[sector as keyof typeof sectorLimits] || {
      maxGrowthY1: 20,
      maxTerminalGrowth: 3.0,
      maxOperatingMargin: 25,
      typicalCapexPercent: 5.0
    }
  }
  
  // ✅ SMART DEFAULT ASSUMPTIONS GENERATOR
  export const generateSmartAssumptions = (
    historicalGrowth: number,
    historicalMargin: number,
    estimatedWACC: number,
    sector: string,
    marketCap: number
  ): Partial<DCFAssumptions> => {
    const sectorLimits = getSectorSpecificLimits(sector)
    
    // Size-based adjustments
    const isLargeCap = marketCap > 100_000_000_000 // > 100B
    const isMegaCap = marketCap > 500_000_000_000  // > 500B
    
    // Growth rate calculation with size and sector constraints
    let baseGrowth = Math.max(historicalGrowth, 3.0)
    
    if (isMegaCap) {
      baseGrowth = Math.min(baseGrowth, sectorLimits.maxGrowthY1 * 0.7)
    } else if (isLargeCap) {
      baseGrowth = Math.min(baseGrowth, sectorLimits.maxGrowthY1 * 0.85)
    } else {
      baseGrowth = Math.min(baseGrowth, sectorLimits.maxGrowthY1)
    }
    
    // Declining growth rates
    const year1 = formatAssumption(baseGrowth, 1)
    const year2 = formatAssumption(Math.max(baseGrowth * 0.85, 2.0), 1)
    const year3 = formatAssumption(Math.max(baseGrowth * 0.7, 1.5), 1)
    const year4 = formatAssumption(Math.max(baseGrowth * 0.55, 1.0), 1)
    const year5 = formatAssumption(Math.max(baseGrowth * 0.4, 0.5), 1)
    
    // Terminal growth rate
    const terminalGrowth = Math.min(
      sectorLimits.maxTerminalGrowth,
      Math.max(estimatedWACC - 1.0, 2.0)
    )
    
    // Operating margin (slight improvement over historical)
    const operatingMargin = Math.min(
      historicalMargin * 1.05,
      sectorLimits.maxOperatingMargin
    )
    
    return {
      revenueGrowthY1: year1,
      revenueGrowthY2: year2,
      revenueGrowthY3: year3,
      revenueGrowthY4: year4,
      revenueGrowthY5: year5,
      terminalGrowthRate: formatAssumption(terminalGrowth, 1),
      discountRate: formatAssumption(estimatedWACC, 1),
      operatingMargin: formatAssumption(operatingMargin, 1),
      capexAsRevenuePercent: formatAssumption(sectorLimits.typicalCapexPercent, 1)
    }
  }
  
  // ✅ DCF CALCULATION FUNCTION
  export const calculateDCF = (
    assumptions: DCFAssumptions,
    currentRevenue: number,
    currentShares: number
  ): DCFResults | null => {
    // Validate assumptions first
    const validationErrors = validateDCFAssumptions(assumptions)
    const hasErrors = validationErrors.some(error => error.severity === 'error')
    
    if (hasErrors) {
      console.error('DCF Calculation failed due to validation errors:', validationErrors)
      return null
    }
    
    const {
      revenueGrowthY1, revenueGrowthY2, revenueGrowthY3, revenueGrowthY4, revenueGrowthY5,
      terminalGrowthRate, discountRate, operatingMargin, taxRate,
      capexAsRevenuePercent, workingCapitalChange, netCash
    } = assumptions
    
    // Calculate 5-year projections
    const projections = []
    let revenue = currentRevenue
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
    
    // Terminal Value calculation
    const terminalFCF = projections[4].fcf * (1 + terminalGrowthRate / 100)
    const denominator = discountRate / 100 - terminalGrowthRate / 100
    
    if (denominator <= 0.001) {
      console.error("Terminal Value calculation impossible: WACC ≤ Terminal Growth Rate")
      return null
    }
    
    const terminalValue = terminalFCF / denominator
    const terminalPV = terminalValue / Math.pow(1 + discountRate / 100, 5)
    
    // Enterprise and Equity Value
    const pvOfProjections = projections.reduce((sum, p) => sum + p.presentValue, 0)
    const enterpriseValue = pvOfProjections + terminalPV
    const equityValue = enterpriseValue + netCash
    const valuePerShare = equityValue / currentShares
    
    return {
      projections,
      terminalValue,
      terminalPV,
      pvOfProjections,
      enterpriseValue,
      equityValue,
      valuePerShare,
      currentPrice: 0, // To be set from external source
      upside: 0 // To be calculated with current price
    }
  }
  
  // ✅ UPSIDE CALCULATION
  export const calculateUpside = (fairValue: number, currentPrice: number): number => {
    return ((fairValue - currentPrice) / currentPrice) * 100
  }
  
  // ✅ UPSIDE COLOR UTILITY
  export const getUpsideColor = (upside: number): string => {
    if (upside > 20) return 'text-brand-light'
    if (upside > 0) return 'text-green-300'
    if (upside > -10) return 'text-yellow-400'
    return 'text-red-400'
  }
  
  // ✅ DCF QUALITY SCORE
  export const calculateDCFQualityScore = (
    assumptions: DCFAssumptions,
    dataQuality: {
      hasIncomeData: boolean
      hasBalanceData: boolean
      hasCashflowData: boolean
      hasCurrentQuote: boolean
      yearsOfData: number
    }
  ): { score: number; factors: string[] } => {
    let score = 0
    const factors: string[] = []
    
    // Data completeness (40% of score)
    if (dataQuality.hasIncomeData) { score += 10; factors.push('✓ Gewinn- und Verlustrechnung verfügbar') }
    if (dataQuality.hasBalanceData) { score += 10; factors.push('✓ Bilanz verfügbar') }
    if (dataQuality.hasCashflowData) { score += 10; factors.push('✓ Cashflow-Statement verfügbar') }
    if (dataQuality.hasCurrentQuote) { score += 10; factors.push('✓ Aktuelle Kursdaten verfügbar') }
    
    // Historical data depth (20% of score)
    if (dataQuality.yearsOfData >= 5) { score += 20; factors.push('✓ 5+ Jahre Finanzhistorie') }
    else if (dataQuality.yearsOfData >= 3) { score += 15; factors.push('○ 3-4 Jahre Finanzhistorie') }
    else if (dataQuality.yearsOfData >= 1) { score += 10; factors.push('⚠ Nur 1-2 Jahre Finanzhistorie') }
    
    // Assumption quality (40% of score)
    const validationErrors = validateDCFAssumptions(assumptions)
    const errorCount = validationErrors.filter(e => e.severity === 'error').length
    const warningCount = validationErrors.filter(e => e.severity === 'warning').length
    
    if (errorCount === 0) {
      if (warningCount === 0) { score += 40; factors.push('✓ Alle Annahmen realistisch') }
      else if (warningCount <= 2) { score += 30; factors.push('○ Großteils realistische Annahmen') }
      else { score += 20; factors.push('⚠ Einige optimistische Annahmen') }
    } else {
      score += 0; factors.push('❌ Unrealistische Annahmen entdeckt')
    }
    
    return { score: Math.min(score, 100), factors }
  }
  
  // ✅ EXPORT ALL UTILITIES
  export default {
    formatAssumption,
    formatPercentage,
    formatCurrency,
    formatNumber,
    validateAndClampGrowthRate,
    validateTerminalGrowthRate,
    validateDiscountRate,
    validateDCFAssumptions,
    getSectorSpecificLimits,
    generateSmartAssumptions,
    calculateDCF,
    calculateUpside,
    getUpsideColor,
    calculateDCFQualityScore
  }