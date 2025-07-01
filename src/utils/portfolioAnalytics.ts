// src/utils/portfolioAnalytics.ts - FIXED: Deutsche Sektoren + richtige Holdings Count
import { stocks } from '@/data/stocks'
import type { Snapshot } from '@/data/holdings'

interface Position {
  cusip: string
  name: string
  shares: number
  value: number
  ticker?: string
}

interface PortfolioStats {
  totalValue: number
  top10Percentage: number
  avgHoldingPeriod: number // in quarters
  turnover: number // as percentage
  sectorBreakdown: Array<{
    sector: string
    value: number
    percentage: number
    count: number
  }>
}

// ✅ DEUTSCHE Sektoren-Zuordnung (automatisch von Englisch → Deutsch)
const SECTOR_TRANSLATION: Record<string, string> = {
  // Technology
  'Technology': 'Technologie',
  'Software': 'Software',
  'Hardware': 'Hardware',
  'Semiconductors': 'Halbleiter',
  'Internet': 'Internet',
  
  // Financial
  'Financial Services': 'Finanzdienstleistungen',
  'Financial': 'Finanzdienstleistungen',
  'Banking': 'Banking',
  'Insurance': 'Versicherungen',
  'Real Estate': 'Immobilien',
  'Investment': 'Investment',
  
  // Healthcare
  'Healthcare': 'Gesundheitswesen',
  'Health Care': 'Gesundheitswesen',
  'Pharmaceuticals': 'Pharma',
  'Medical': 'Medizin',
  'Biotechnology': 'Biotechnologie',
  
  // Consumer
  'Consumer Staples': 'Konsumgüter',
  'Consumer Goods': 'Konsumgüter', 
  'Consumer Defensive': 'Basiskonsumgüter',
  'Consumer Cyclical': 'Zyklische Konsumgüter',
  'Consumer Discretionary': 'Nicht-Basiskonsumgüter',
  'Retail': 'Einzelhandel',
  'Food & Beverage': 'Lebensmittel & Getränke',
  'Beverages': 'Getränke',
  
  // Energy & Materials
  'Energy': 'Energie',
  'Oil & Gas': 'Öl & Gas',
  'Materials': 'Rohstoffe',
  'Mining': 'Bergbau',
  'Chemicals': 'Chemie',
  
  // Others
  'Industrials': 'Industrie',
  'Utilities': 'Versorger',
  'Transportation': 'Transport',
  'Aerospace': 'Luft- & Raumfahrt',
  'Communication Services': 'Kommunikation',
  'Telecommunications': 'Telekommunikation',
  'Media': 'Medien',
  
  // Fallbacks
  'Other': 'Sonstige',
  '': 'Sonstige',
  'Unknown': 'Sonstige'
}

// ✅ ERWEITERTE Sektor-Zuordnung basierend auf Firmennamen (deutsch)
const COMPANY_NAME_MAPPING: Record<string, string> = {
  // Tech Giants
  'APPLE INC': 'Technologie',
  'MICROSOFT CORP': 'Technologie', 
  'AMAZON COM INC': 'Technologie',
  'ALPHABET INC': 'Technologie',
  'META PLATFORMS INC': 'Technologie',
  'TESLA INC': 'Technologie',
  'NVIDIA CORP': 'Technologie',
  
  // Finance
  'BANK OF AMERICA CORP': 'Finanzdienstleistungen',
  'JPMORGAN CHASE & CO': 'Finanzdienstleistungen',
  'WELLS FARGO & CO': 'Finanzdienstleistungen',
  'AMERICAN EXPRESS CO': 'Finanzdienstleistungen',
  'BERKSHIRE HATHAWAY INC': 'Finanzdienstleistungen',
  'GOLDMAN SACHS GROUP INC': 'Finanzdienstleistungen',
  
  // Healthcare
  'JOHNSON & JOHNSON': 'Gesundheitswesen',
  'PFIZER INC': 'Gesundheitswesen',
  'UNITEDHEALTH GROUP INC': 'Gesundheitswesen',
  'UnitedHealth Group Inc': 'Gesundheitswesen',
  'ABBVIE INC': 'Gesundheitswesen',
  
  // Consumer Staples
  'COCA COLA CO': 'Basiskonsumgüter',
  'PROCTER & GAMBLE CO': 'Basiskonsumgüter',
  'WALMART INC': 'Basiskonsumgüter',
  'PEPSICO INC': 'Basiskonsumgüter',
  
  // Energy
  'CHEVRON CORP': 'Energie',
  'EXXON MOBIL CORP': 'Energie',
  'CONOCOPHILLIPS': 'Energie',
}

function getSectorFromStock(position: Position): string {
  // 1. Versuche zuerst aus den stocks-Daten (mit deutscher Übersetzung)
  const stockData = stocks.find(s => s.cusip === position.cusip)
  if (stockData?.sector && stockData.sector.trim()) {
    const germanSector = SECTOR_TRANSLATION[stockData.sector] || stockData.sector
    return germanSector
  }
  
  // 2. Dann Company-Name Mapping (schon deutsch)
  if (COMPANY_NAME_MAPPING[position.name]) {
    return COMPANY_NAME_MAPPING[position.name]
  }
  
  // 3. Fallback: Pattern-basierte Klassifizierung (deutsch)
  const name = position.name.toUpperCase()
  
  if (name.includes('BANK') || name.includes('FINANCIAL') || name.includes('CREDIT')) {
    return 'Finanzdienstleistungen'
  }
  if (name.includes('TECH') || name.includes('SOFTWARE') || name.includes('COMPUTER')) {
    return 'Technologie'
  }
  if (name.includes('PHARMA') || name.includes('HEALTH') || name.includes('MEDICAL')) {
    return 'Gesundheitswesen'
  }
  if (name.includes('OIL') || name.includes('ENERGY') || name.includes('PETROLEUM')) {
    return 'Energie'
  }
  if (name.includes('REAL ESTATE') || name.includes('REIT')) {
    return 'Immobilien'
  }
  
  return 'Sonstige'
}

// ✅ FIXED: Merge-Funktion wie in der Investor-Seite verwenden
function mergePositions(positions: Position[]): Map<string, { shares: number; value: number; position: Position }> {
  const map = new Map<string, { shares: number; value: number; position: Position }>()
  
  positions.forEach(p => {
    const prev = map.get(p.cusip)
    if (prev) {
      prev.shares += p.shares
      prev.value += p.value
    } else {
      map.set(p.cusip, { shares: p.shares, value: p.value, position: p })
    }
  })
  
  return map
}

function calculateHoldingPeriods(snapshots: Snapshot[]): number {
  if (snapshots.length < 2) return 0
  
  const holdingPeriods: number[] = []
  const positions = new Map<string, { firstSeen: number; lastSeen: number }>()
  
  // Track when each position first appears and last appears
  snapshots.forEach((snapshot, index) => {
    const mergedPositions = mergePositions(snapshot.data.positions)
    
    mergedPositions.forEach((_, cusip) => {
      if (!positions.has(cusip)) {
        positions.set(cusip, { firstSeen: index, lastSeen: index })
      } else {
        positions.get(cusip)!.lastSeen = index
      }
    })
  })
  
  // Calculate holding periods (in quarters)
  positions.forEach(({ firstSeen, lastSeen }) => {
    const periodInQuarters = lastSeen - firstSeen + 1
    holdingPeriods.push(periodInQuarters)
  })
  
  // Return average holding period in quarters
  return holdingPeriods.length > 0 
    ? holdingPeriods.reduce((sum, period) => sum + period, 0) / holdingPeriods.length 
    : 0
}

function calculateTurnover(snapshots: Snapshot[]): number {
  if (snapshots.length < 2) return 0
  
  let totalTurnover = 0
  let periods = 0
  
  for (let i = 1; i < snapshots.length; i++) {
    const current = mergePositions(snapshots[i].data.positions)
    const previous = mergePositions(snapshots[i - 1].data.positions)
    
    const currentTotal = Array.from(current.values()).reduce((sum, p) => sum + p.value, 0)
    const previousTotal = Array.from(previous.values()).reduce((sum, p) => sum + p.value, 0)
    const avgPortfolioValue = (currentTotal + previousTotal) / 2
    
    if (avgPortfolioValue === 0) continue
    
    let totalChanges = 0
    
    // Calculate value of changes
    current.forEach(({ value }, cusip) => {
      const prevValue = previous.get(cusip)?.value || 0
      totalChanges += Math.abs(value - prevValue)
    })
    
    // Add positions that were completely sold
    previous.forEach(({ value }, cusip) => {
      if (!current.has(cusip)) {
        totalChanges += value
      }
    })
    
    // Turnover for this period
    const periodTurnover = (totalChanges / 2) / avgPortfolioValue
    totalTurnover += periodTurnover
    periods++
  }
  
  // Return average quarterly turnover as percentage
  return periods > 0 ? (totalTurnover / periods) * 100 : 0
}

export function calculatePortfolioStats(snapshots: Snapshot[]): PortfolioStats {
  if (snapshots.length === 0) {
    return {
      totalValue: 0,
      top10Percentage: 0,
      avgHoldingPeriod: 0,
      turnover: 0,
      sectorBreakdown: []
    }
  }
  
  const latest = snapshots[snapshots.length - 1].data
  const mergedPositions = mergePositions(latest.positions)
  
  // Convert to array and sort by value
  const sortedHoldings = Array.from(mergedPositions.entries())
    .map(([cusip, { shares, value, position }]) => ({
      cusip,
      shares,
      value,
      position
    }))
    .sort((a, b) => b.value - a.value)
  
  const totalValue = sortedHoldings.reduce((sum, h) => sum + h.value, 0)
  
  // Calculate top 10 percentage
  const top10Value = sortedHoldings.slice(0, 10).reduce((sum, h) => sum + h.value, 0)
  const top10Percentage = totalValue > 0 ? (top10Value / totalValue) * 100 : 0
  
  // ✅ FIXED: Calculate sector breakdown (deutsch)
  const sectorMap = new Map<string, { value: number; count: number }>()
  
  sortedHoldings.forEach(({ value, position }) => {
    const sector = getSectorFromStock(position)
    const current = sectorMap.get(sector) || { value: 0, count: 0 }
    sectorMap.set(sector, {
      value: current.value + value,
      count: current.count + 1
    })
  })
  
  const sectorBreakdown = Array.from(sectorMap.entries())
    .map(([sector, { value, count }]) => ({
      sector,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
      count
    }))
    .sort((a, b) => b.value - a.value)
  
  // Calculate average holding period and turnover
  const avgHoldingPeriod = calculateHoldingPeriods(snapshots)
  const turnover = calculateTurnover(snapshots)
  
  return {
    totalValue,
    top10Percentage,
    avgHoldingPeriod,
    turnover,
    sectorBreakdown
  }
}

// ✅ NEU: Hilfsfunktion für richtige Holdings-Count (für /investors Seite)
export function calculateMergedHoldingsCount(positions: Position[]): number {
  const mergedPositions = mergePositions(positions)
  return mergedPositions.size
}