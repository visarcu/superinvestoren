// src/utils/insightsCalculations.ts - Berechnungsfunktionen für Insights Page

import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { etfs } from '@/data/etfs'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'
import type {
  Position,
  HoldingSnapshot,
  TopBuyItem,
  TopOwnedItem,
  BiggestInvestmentItem,
  DataSourceStats,
  MomentumShift,
  ExitTrackerItem,
  NewDiscoveryItem,
  ResearchGemsResult,
  BuySellBalance,
  SectorAnalysis
} from '@/types/insights'

// ========== CACHE ==========
export const calculationCache = new Map<string, any>()

// ========== INVESTOR NAMES MAPPING ==========
export const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett',
  einhorn: 'David Einhorn',
  ackman: 'Bill Ackman',
  thiel: 'Peter Thiel',
  gates: 'Bill & Melinda Gates Foundation Trust',
  torray: 'Torray Investment Partners LLC',
  davis: 'Christoper Davis',
  altarockpartners: 'Mark Massey',
  greenhaven: 'Edgar Wachenheim III',
  vinall: 'Robert Vinall',
  meridiancontrarian: 'Meridian Contrarian Fund',
  hawkins: ' Mason Hawkins',
  olstein: 'Robert Olstein',
  peltz: 'Nelson Peltz',
  gregalexander: 'Greg Alexander',
  miller: 'Bill Miller',
  tangen: 'Nicolai Tangen',
  burry: 'Michael Burry',
  pabrai: 'Mohnish Pabrai',
  kantesaria: 'Dev Kantesaria',
  greenblatt: 'Joel Greenblatt',
  fisher: 'Ken Fisher',
  soros: 'George Soros',
  haley: 'Connor Haley',
  vandenberg: 'Arnold Van Den Berg',
  dodgecox: 'Dodge & Cox',
  pzena: 'Richard Pzena',
  mairspower: 'Mairs & Power Inc',
  weitz: 'Wallace Weitz',
  yacktman: 'Yacktman Asset Management LP',
  gayner: 'Thomas Gayner',
  armitage: 'John Armitage',
  burn: 'Harry Burn - Sound Shore',
  cantillon: 'William von Mueffling - Cantillon Capital Management',
  jensen: 'Eric Schoenstein - Jensen Investment Management',
  abrams: 'David Abrams - Abrams Capital Management',
  firsteagle: 'First Eagle Investment Management',
  polen: 'Polen Capital Management',
  tarasoff: 'Josh Tarasoff',
  rochon: 'Francois Rochon',
  russo: 'Thomas Russo',
  akre: 'Chuck Akre',
  triplefrond: 'Triple Frond Partners',
  whitman: 'Marty Whitman',
  patientcapital: 'Samantha McLemore',
  klarman: 'Seth Klarman',
  makaira: 'Tom Bancroft',
  ketterer: 'Sarah Ketterer',
  train: 'Lindsell Train',
  smith: 'Terry Smith',
  watsa: 'Prem Watsa',
  lawrence: 'Bryan Lawrence',
  dorsey: 'Pat Dorsey',
  hohn: 'Chris Hohn',
  hong: 'Dennis Hong',
  kahn: 'Kahn Brothers Group',
  coleman: 'Chase Coleman',
  dalio: 'Ray Dalio',
  loeb: 'Daniel Loeb',
  tepper: 'David Tepper',
  icahn: 'Carl Icahn',
  lilu: 'Li Lu',
  ainslie: 'Lee Ainslie',
  greenberg: 'Glenn Greenberg',
  mandel: 'Stephen Mandel',
  marks: 'Howard Marks',
  rogers: 'John Rogers',
  ariel_appreciation: 'Ariel Appreciation Fund',
  ariel_focus: 'Ariel Focus Fund',
  cunniff: 'Ruane, Cunniff & Goldfarb L.P.',
  spier: 'Guy Spier',
  druckenmiller: 'druckenmiller',
}

// ========== HELPER FUNCTIONS ==========

export function getPeriodFromDate(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number)
  const filingQ = Math.ceil(month / 3)
  let reportQ = filingQ - 1, reportY = year
  if (reportQ === 0) {
    reportQ = 4
    reportY = year - 1
  }
  return `Q${reportQ} ${reportY}`
}

export function formatCurrencyGerman(amount: number, showCurrency = true): string {
  const suffix = showCurrency ? ' $' : ''
  const absAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (absAmount >= 1_000_000_000) {
    return `${sign}${(absAmount / 1_000_000_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mrd.${suffix}`
  } else if (absAmount >= 1_000_000) {
    return `${sign}${(absAmount / 1_000_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Mio.${suffix}`
  } else if (absAmount >= 1_000) {
    return `${sign}${(absAmount / 1_000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Tsd.${suffix}`
  }
  return `${sign}${absAmount.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${suffix}`
}

export function formatCurrency(amount: number, currency: 'USD' | 'EUR' = 'USD', maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(amount)
}

// ========== PREPROCESSED DATA ==========

// Temporäre Hilfsfunktionen für Initialisierung
function getTickerTemp(position: Position, cusipToTickerMap: Map<string, string>): string | null {
  if (position.ticker) return position.ticker
  return cusipToTickerMap.get(position.cusip) || null
}

function getStockNameTemp(position: Position, cusipToTickerMap: Map<string, string>, nameMap: Map<string, string>): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ')
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const ticker = getTickerTemp(position, cusipToTickerMap)
  return ticker ? (nameMap.get(ticker) || position.name || position.cusip) : position.cusip
}

// Optimierte Datenstrukturen vorab erstellen
export const preprocessedData = (() => {
  const tickerMap = new Map<string, string>()
  const nameMap = new Map<string, string>()
  const cusipToTicker = new Map<string, string>()

  // Stocks-Daten vorverarbeiten
  stocks.forEach(stock => {
    tickerMap.set(stock.ticker, stock.name)
    nameMap.set(stock.ticker, stock.name)
    if (stock.cusip) {
      cusipToTicker.set(stock.cusip, stock.ticker)
    }
  })

  // Holdings-Daten einmal durchgehen
  const activeInvestors = new Set<string>()
  const allQuarters = new Set<string>()

  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    if (!snaps || snaps.length === 0) return

    const latest = snaps[snaps.length - 1]?.data
    if (latest?.positions?.length > 0) {
      activeInvestors.add(slug)
    }

    snaps.forEach(snap => {
      if (snap?.data?.date) {
        const quarter = getPeriodFromDate(snap.data.date)
        allQuarters.add(quarter)

        // Ticker-Namen aus Holdings extrahieren
        snap.data.positions?.forEach((position: Position) => {
          const ticker = getTickerTemp(position, cusipToTicker)
          if (ticker && position.name && !nameMap.has(ticker)) {
            nameMap.set(ticker, getStockNameTemp(position, cusipToTicker, nameMap))
          }
        })
      }
    })
  })

  return {
    tickerMap,
    nameMap,
    cusipToTicker,
    activeInvestors: Array.from(activeInvestors),
    allQuarters: Array.from(allQuarters).sort().reverse()
  }
})()

// Finale Hilfsfunktionen (nach preprocessedData Initialisierung)
export function getTicker(position: Position): string | null {
  if (position.ticker) return position.ticker
  return preprocessedData.cusipToTicker.get(position.cusip) || null
}

export function getStockName(position: Position): string {
  if (position.name && position.ticker) {
    return position.name.includes(' - ')
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  const ticker = getTicker(position)
  return ticker ? (preprocessedData.nameMap.get(ticker) || position.name || position.cusip) : position.cusip
}

// ========== CALCULATION FUNCTIONS ==========

export function getSmartLatestQuarter(): string {
  const cacheKey = 'smartLatestQuarter'
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey)
  }

  const totalActiveInvestors = preprocessedData.activeInvestors.length
  const requiredThreshold = Math.ceil(totalActiveInvestors * 0.3)

  const quarterCounts = new Map<string, number>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps) return

    snaps.forEach(snap => {
      if (snap?.data?.date) {
        const quarter = getPeriodFromDate(snap.data.date)
        quarterCounts.set(quarter, (quarterCounts.get(quarter) || 0) + 1)
      }
    })
  })

  const sortedQuarters = Array.from(quarterCounts.entries())
    .sort(([a], [b]) => {
      const [qA, yearA] = a.split(' ')
      const [qB, yearB] = b.split(' ')

      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA)
      return parseInt(qB.substring(1)) - parseInt(qA.substring(1))
    })

  for (const [quarter, count] of sortedQuarters) {
    if (count >= requiredThreshold) {
      calculationCache.set(cacheKey, quarter)
      return quarter
    }
  }

  const fallbackQuarter = sortedQuarters[0]?.[0] || 'Q1 2025'
  calculationCache.set(cacheKey, fallbackQuarter)
  return fallbackQuarter
}

export function calculateTopBuys(targetQuarters: string[]): TopBuyItem[] & { totalUniqueStocks?: number } {
  const buyCounts = new Map<string, number>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length === 0) return

    snaps.forEach((snap, idx) => {
      const currentQuarter = getPeriodFromDate(snap.data.date)
      if (!targetQuarters.includes(currentQuarter)) return

      const cur = snap.data

      if (idx > 0) {
        const prev = snaps[idx - 1].data

        const prevMap = new Map<string, number>()
        prev.positions?.forEach((p: Position) => {
          const ticker = getTicker(p)
          if (ticker) {
            prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
          }
        })

        const seen = new Set<string>()
        cur.positions?.forEach((p: Position) => {
          const ticker = getTicker(p)
          if (!ticker || seen.has(ticker)) return
          seen.add(ticker)

          const prevShares = prevMap.get(ticker) || 0
          const delta = p.shares - prevShares

          if (delta > 0) {
            buyCounts.set(ticker, (buyCounts.get(ticker) || 0) + 1)
          }
        })
      } else {
        const seen = new Set<string>()
        cur.positions?.forEach((p: Position) => {
          const ticker = getTicker(p)
          if (ticker && !seen.has(ticker)) {
            seen.add(ticker)
            buyCounts.set(ticker, (buyCounts.get(ticker) || 0) + 1)
          }
        })
      }
    })
  })

  const stocksArray = Array.from(buyCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([ticker, count]) => ({ ticker, count }))

  const result = stocksArray as TopBuyItem[] & { totalUniqueStocks?: number }
  result.totalUniqueStocks = buyCounts.size

  return result
}

export function calculateTopOwned(): TopOwnedItem[] & { totalUniqueStocks?: number } {
  const ownershipCount = new Map<string, number>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length === 0) return

    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return

    const seen = new Set<string>()
    latest.positions.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (ticker && !seen.has(ticker)) {
        seen.add(ticker)
        ownershipCount.set(ticker, (ownershipCount.get(ticker) || 0) + 1)
      }
    })
  })

  const stocksArray = Array.from(ownershipCount.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([ticker, count]) => ({ ticker, count }))

  const result = stocksArray as TopOwnedItem[] & { totalUniqueStocks?: number }
  result.totalUniqueStocks = Array.from(ownershipCount.values()).filter(count => count >= 5).length

  return result
}

export function calculateBiggestInvestments(): BiggestInvestmentItem[] {
  const cacheKey = 'biggestInvestments'
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey)
  }

  const investmentTotals = new Map<string, { value: number, name: string }>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length === 0) return

    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return

    latest.positions.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (!ticker) return

      const name = getStockName(p)
      const current = investmentTotals.get(ticker)

      if (current) {
        current.value += p.value
      } else {
        investmentTotals.set(ticker, { value: p.value, name })
      }
    })
  })

  const result = Array.from(investmentTotals.entries())
    .map(([ticker, { value, name }]) => ({ ticker, name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20)

  calculationCache.set(cacheKey, result)
  return result
}

export function calculateDataSourceStats(targetQuarters: string[]): DataSourceStats {
  const stats: DataSourceStats = {
    totalInvestors: 0,
    investorsWithData: 0,
    totalFilings: 0,
    filingsInPeriod: 0,
    lastUpdated: '',
    quarters: targetQuarters
  }

  stats.totalInvestors = preprocessedData.activeInvestors.length

  let latestDate = ''
  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps) return

    const hasDataInPeriod = snaps.some(snap => {
      const quarter = getPeriodFromDate(snap.data.date)
      return targetQuarters.includes(quarter)
    })

    if (hasDataInPeriod) {
      stats.investorsWithData++
    }

    stats.totalFilings += snaps.length

    snaps.forEach(snap => {
      const quarter = getPeriodFromDate(snap.data.date)
      if (targetQuarters.includes(quarter)) {
        stats.filingsInPeriod++
      }

      if (snap.data.date > latestDate) {
        latestDate = snap.data.date
      }
    })
  })

  stats.lastUpdated = latestDate
  return stats
}

export function calculateMomentumShifts(targetQuarters: string[]): MomentumShift[] {
  if (targetQuarters.length < 2) return []

  const shifts = new Map<string, {
    name: string
    shifters: Set<string>
    fromSelling: number
    toBuying: number
  }>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length < 2) return

    const relevantSnaps = snaps.filter(snap =>
      targetQuarters.includes(getPeriodFromDate(snap.data.date))
    ).slice(-2)

    if (relevantSnaps.length < 2) return

    const [older, newer] = relevantSnaps

    const olderMap = new Map<string, number>()
    older.data.positions?.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (ticker) olderMap.set(ticker, p.shares)
    })

    const newerMap = new Map<string, number>()
    newer.data.positions?.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (ticker) newerMap.set(ticker, p.shares)
    })

    newerMap.forEach((newShares, ticker) => {
      const oldShares = olderMap.get(ticker) || 0

      if (oldShares > newShares * 1.2 && newShares > 0) {
        // Position wurde reduziert
      } else if (newShares > oldShares * 1.2) {
        const current = shifts.get(ticker) || {
          name: getStockName(newer.data.positions.find(p => getTicker(p) === ticker)!),
          shifters: new Set<string>(),
          fromSelling: oldShares,
          toBuying: newShares
        }

        current.shifters.add(investorNames[slug] || slug)
        shifts.set(ticker, current)
      }
    })
  })

  return Array.from(shifts.entries())
    .map(([ticker, data]) => ({
      ticker,
      name: data.name,
      shifters: Array.from(data.shifters),
      fromSelling: data.fromSelling,
      toBuying: data.toBuying,
      totalShift: data.toBuying - data.fromSelling
    }))
    .filter(item => item.shifters.length >= 2)
    .sort((a, b) => b.shifters.length - a.shifters.length)
    .slice(0, 10)
}

export function calculateExitTracker(targetQuarters: string[]): ExitTrackerItem[] {
  const exits = new Map<string, {
    name: string
    exitedBy: string[]
    holdingPeriods: number[]
    totalValue: number
  }>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length < 2) return

    const latest = snaps[snaps.length - 1]
    const previous = snaps[snaps.length - 2]

    if (!targetQuarters.includes(getPeriodFromDate(latest.data.date))) return

    const currentPositions = new Map<string, boolean>()
    latest.data.positions?.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (ticker) currentPositions.set(ticker, true)
    })

    previous.data.positions?.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (!ticker) return

      if (!currentPositions.has(ticker) && p.value > 1000000) {
        let holdingPeriod = 1
        for (let i = snaps.length - 3; i >= 0; i--) {
          const hasPosition = snaps[i].data.positions?.some(
            pos => getTicker(pos) === ticker
          )
          if (hasPosition) {
            holdingPeriod++
          } else {
            break
          }
        }

        const current = exits.get(ticker) || {
          name: getStockName(p),
          exitedBy: [],
          holdingPeriods: [],
          totalValue: 0
        }

        current.exitedBy.push(investorNames[slug] || slug)
        current.holdingPeriods.push(holdingPeriod)
        current.totalValue += p.value

        exits.set(ticker, current)
      }
    })
  })

  return Array.from(exits.entries())
    .map(([ticker, data]) => ({
      ticker,
      name: data.name,
      exitedBy: data.exitedBy,
      avgHoldingPeriod: data.holdingPeriods.reduce((a, b) => a + b, 0) / data.holdingPeriods.length,
      totalValueExited: data.totalValue
    }))
    .sort((a, b) => b.exitedBy.length - a.exitedBy.length)
    .slice(0, 10)
}

export function calculateNewDiscoveries(targetQuarters: string[]): NewDiscoveryItem[] {
  const discoveries = new Map<string, {
    name: string
    discoveredBy: Map<string, number>
  }>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length === 0) return

    const latest = snaps[snaps.length - 1]
    if (!targetQuarters.includes(getPeriodFromDate(latest.data.date))) return

    const historicalPositions = new Set<string>()
    for (let i = 0; i < snaps.length - 1; i++) {
      snaps[i].data.positions?.forEach((p: Position) => {
        const ticker = getTicker(p)
        if (ticker) historicalPositions.add(ticker)
      })
    }

    latest.data.positions?.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (!ticker) return

      if (!historicalPositions.has(ticker) && p.value > 5000000) {
        const current = discoveries.get(ticker) || {
          name: getStockName(p),
          discoveredBy: new Map<string, number>()
        }

        current.discoveredBy.set(investorNames[slug] || slug, p.value)
        discoveries.set(ticker, current)
      }
    })
  })

  return Array.from(discoveries.entries())
    .map(([ticker, data]) => {
      const values = Array.from(data.discoveredBy.values())
      const totalValue = values.reduce((a, b) => a + b, 0)

      return {
        ticker,
        name: data.name,
        discoveredBy: Array.from(data.discoveredBy.keys()),
        totalValue,
        avgPosition: totalValue / values.length
      }
    })
    .filter(item => item.discoveredBy.length >= 2)
    .sort((a, b) => b.discoveredBy.length - a.discoveredBy.length)
    .slice(0, 10)
}

export function calculateResearchGems(): ResearchGemsResult {
  const GERMAN_COMPANY_NAMES = new Set([
    'SAP SE', 'SAP',
    'SIEMENS', 'SIEMENS AG',
    'ALLIANZ', 'ALLIANZ SE', 'ALLIANZ AG',
    'BASF', 'BASF SE',
    'BAYER', 'BAYER AG',
    'BEIERSDORF', 'BEIERSDORF AG',
    'BMW', 'BAYERISCHE MOTOREN WERKE',
    'BRENNTAG', 'BRENNTAG SE',
    'COMMERZBANK', 'COMMERZBANK AG',
    'CONTINENTAL', 'CONTINENTAL AG',
    'DAIMLER TRUCK', 'DAIMLER TRUCK HOLDING',
    'DEUTSCHE BANK', 'DEUTSCHE BANK AG', 'DEUTSCHE BANK A G',
    'DEUTSCHE BÖRSE', 'DEUTSCHE BOERSE', 'DEUTSCHE BOERSE (ADR)',
    'DEUTSCHE TELEKOM', 'DEUTSCHE TELEKOM AG',
    'DEUTSCHE POST', 'DHL GROUP',
    'E\\.ON', 'EON SE', 'E ON SE',
    'FRESENIUS', 'FRESENIUS SE',
    'FRESENIUS MEDICAL CARE',
    'GEA GROUP', 'GEA',
    'HANNOVER RUECK', 'HANNOVER RÜCK', 'HANNOVER RE',
    'HEIDELBERG MATERIALS', 'HEIDELBERGCEMENT',
    'HENKEL', 'HENKEL AG',
    'INFINEON', 'INFINEON TECHNOLOGIES',
    'MERCEDES-BENZ', 'MERCEDES BENZ GROUP', 'MERCEDES-BENZ GROUP',
    'MERCK KGAA', 'MERCK KOMMANDITGESELLSCHAFT',
    'MTU AERO ENGINES',
    'MUENCHENER RUECK', 'MÜNCHENER RÜCK',
    'PORSCHE', 'PORSCHE AG', 'PORSCHE AUTOMOBIL', 'PORSCHE AUTOMOBIL HOLDING',
    'QIAGEN',
    'RHEINMETALL',
    'RWE', 'RWE AG',
    'SCOUT24',
    'SIEMENS ENERGY', 'SIEMENS HEALTHINEERS',
    'SYMRISE', 'SYMRISE AG',
    'VOLKSWAGEN', 'VOLKSWAGEN AG',
    'VONOVIA', 'VONOVIA SE',
    'ZALANDO', 'ZALANDO SE',
    'ADIDAS', 'ADIDAS AG'
  ])

  function isGermanStock(ticker: string, name?: string): boolean {
    const germanTickers = new Set([
      'DB', 'SAP', 'MBGYY', 'DTEGY', 'POAHY', 'MTUAY', 'RWEOY',
      'SIEGY', 'SCCTY', 'SMMNY', 'SMNEY', 'VWAGY', 'VONOY',
      'DHLGY', 'ZLNDY', 'RNMBY', 'HVRRY', 'HDLMY', 'IFNNY'
    ])

    if (germanTickers.has(ticker.toUpperCase())) {
      return true
    }

    if (name) {
      const upperName = name.toUpperCase()
      for (const germanName of GERMAN_COMPANY_NAMES) {
        const regex = new RegExp(`\\b${germanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
        if (regex.test(upperName)) {
          return true
        }
      }
    }

    return false
  }

  function isETF(ticker: string, name?: string): boolean {
    const etfTicker = etfs.find(etf => etf.symbol.toUpperCase() === ticker.toUpperCase())
    if (etfTicker) return true

    if (name) {
      const upperName = name.toUpperCase()
      if (upperName.includes(' ETF') || upperName.endsWith('ETF') || upperName.startsWith('ETF ')) {
        return true
      }

      if ((upperName.includes('ISHARES') || upperName.includes('VANGUARD') ||
        upperName.includes('SPDR') || upperName.includes('INVESCO QQQ')) &&
        (upperName.includes('ETF') || upperName.includes('TRUST'))) {
        return true
      }
    }

    return false
  }

  const MAX_MARKET_CAP_FOR_HIDDEN_GEMS = 15_000_000_000

  function getMarketCapEstimate(ticker: string, totalValue: number, investorCount: number): number {
    const knownLargeCaps = new Set([
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA',
      'BRK.A', 'BRK.B', 'BRKB', 'JPM', 'JNJ', 'V', 'UNH', 'MA', 'PG'
    ])

    if (knownLargeCaps.has(ticker.toUpperCase())) {
      return 100_000_000_000
    }

    const estimatedMarketCap = (totalValue * investorCount) * 50
    return estimatedMarketCap
  }

  const stockData = new Map<string, {
    name: string
    investors: Set<string>
    totalValue: number
    isGerman: boolean
    isETF: boolean
    etfCategory?: string
  }>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length === 0) return

    const latest = snaps[snaps.length - 1]
    if (!latest?.data?.positions) return

    latest.data.positions.forEach((position: Position) => {
      const ticker = getTicker(position)
      if (!ticker) return

      const isGerman = isGermanStock(ticker, position.name)
      const isETFFlag = isETF(ticker, position.name)
      const etfData = etfs.find(etf => etf.symbol.toUpperCase() === ticker.toUpperCase())

      if (!stockData.has(ticker)) {
        stockData.set(ticker, {
          name: getStockName(position),
          investors: new Set(),
          totalValue: 0,
          isGerman,
          isETF: isETFFlag,
          etfCategory: etfData?.category
        })
      }

      const stock = stockData.get(ticker)!
      stock.investors.add(investorNames[slug] || slug)
      stock.totalValue += position.value
    })
  })

  const unknownStocks = Array.from(stockData.entries())
    .filter(([ticker, data]) => {
      if (data.isGerman || data.isETF || data.investors.size < 3) return false

      const estimatedMarketCap = getMarketCapEstimate(ticker, data.totalValue, data.investors.size)
      return estimatedMarketCap < MAX_MARKET_CAP_FOR_HIDDEN_GEMS
    })
    .map(([ticker, data]) => ({
      ticker,
      name: data.name,
      investorCount: data.investors.size,
      investors: Array.from(data.investors),
      totalValue: data.totalValue
    }))
    .sort((a, b) => b.investorCount - a.investorCount)
    .slice(0, 10)

  const germanStocks = Array.from(stockData.entries())
    .filter(([, data]) => data.isGerman && data.investors.size >= 1)
    .map(([ticker, data]) => ({
      ticker,
      name: data.name,
      investorCount: data.investors.size,
      investors: Array.from(data.investors),
      totalValue: data.totalValue
    }))
    .sort((a, b) => b.investorCount - a.investorCount)
    .slice(0, 10)

  const popularETFs = Array.from(stockData.entries())
    .filter(([, data]) => data.isETF && data.investors.size >= 2)
    .map(([ticker, data]) => ({
      ticker,
      name: data.name,
      investorCount: data.investors.size,
      investors: Array.from(data.investors),
      totalValue: data.totalValue,
      category: data.etfCategory
    }))
    .sort((a, b) => b.investorCount - a.investorCount)
    .slice(0, 10)

  return { unknownStocks, germanStocks, popularETFs }
}

export function calculateSectorNetFlows(targetQuarters: string[]): Map<string, number> {
  if (targetQuarters.length < 2) return new Map()

  const sectorFlows = new Map<string, number>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length < 2) return

    const relevantSnaps = snaps.filter(snap =>
      targetQuarters.includes(getPeriodFromDate(snap.data.date))
    ).slice(-2)

    if (relevantSnaps.length < 2) return

    const [older, newer] = relevantSnaps

    const olderSectors = new Map<string, number>()
    const newerSectors = new Map<string, number>()

    older.data.positions?.forEach((p: Position) => {
      const sector = translateSector(getSectorFromPosition({
        cusip: p.cusip,
        ticker: getTicker(p)
      }))
      olderSectors.set(sector, (olderSectors.get(sector) || 0) + p.value)
    })

    newer.data.positions?.forEach((p: Position) => {
      const sector = translateSector(getSectorFromPosition({
        cusip: p.cusip,
        ticker: getTicker(p)
      }))
      newerSectors.set(sector, (newerSectors.get(sector) || 0) + p.value)
    })

    const allSectors = new Set([...olderSectors.keys(), ...newerSectors.keys()])

    allSectors.forEach(sector => {
      const oldValue = olderSectors.get(sector) || 0
      const newValue = newerSectors.get(sector) || 0
      const flow = newValue - oldValue

      sectorFlows.set(sector, (sectorFlows.get(sector) || 0) + flow)
    })
  })

  return sectorFlows
}

export function calculateBuySellBalance(quarters: string[]): BuySellBalance[] {
  const balanceData: BuySellBalance[] = []

  const sortedQuarters = [...quarters].sort((a, b) => {
    const [qA, yearA] = a.split(' ')
    const [qB, yearB] = b.split(' ')

    if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA)
    return parseInt(qB.substring(1)) - parseInt(qA.substring(1))
  })

  sortedQuarters.forEach((quarter) => {
    let totalBuys = 0
    let totalSells = 0
    let buysCount = 0
    let sellsCount = 0

    preprocessedData.activeInvestors.forEach(slug => {
      const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
      if (!snaps || snaps.length < 2) return

      const currentSnap = snaps.find(snap =>
        getPeriodFromDate(snap.data.date) === quarter
      )

      const previousSnap = snaps.find(snap => {
        const snapQuarter = getPeriodFromDate(snap.data.date)
        const [currentQ, currentY] = quarter.split(' ')
        const currentQNum = parseInt(currentQ.replace('Q', ''))
        const currentYear = parseInt(currentY)

        let prevQNum = currentQNum - 1
        let prevYear = currentYear
        if (prevQNum === 0) {
          prevQNum = 4
          prevYear = currentYear - 1
        }

        return snapQuarter === `Q${prevQNum} ${prevYear}`
      })

      if (!currentSnap || !previousSnap) return

      const previousPositions = new Map<string, number>()
      const currentPositions = new Map<string, number>()

      previousSnap.data.positions?.forEach((p: Position) => {
        const ticker = getTicker(p)
        if (ticker) {
          previousPositions.set(ticker, p.value)
        }
      })

      currentSnap.data.positions?.forEach((p: Position) => {
        const ticker = getTicker(p)
        if (ticker) {
          currentPositions.set(ticker, p.value)
        }
      })

      const allTickers = new Set([...previousPositions.keys(), ...currentPositions.keys()])

      allTickers.forEach(ticker => {
        const prevValue = previousPositions.get(ticker) || 0
        const currentValue = currentPositions.get(ticker) || 0
        const change = currentValue - prevValue

        if (Math.abs(change) > 1000000) {
          if (change > 0) {
            totalBuys += change
            buysCount++
          } else {
            totalSells += Math.abs(change)
            sellsCount++
          }
        }
      })
    })

    const netFlow = totalBuys - totalSells
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'

    if (netFlow > totalBuys * 0.1) sentiment = 'bullish'
    else if (netFlow < -totalSells * 0.1) sentiment = 'bearish'

    balanceData.push({
      quarter,
      totalBuys,
      totalSells,
      netFlow,
      sentiment,
      buysCount,
      sellsCount
    })
  })

  return balanceData
}

export function calculateTopSectors(): SectorAnalysis[] {
  const cacheKey = 'topSectors'
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey)
  }

  const sectorAnalysis = new Map<string, { value: number, count: number }>()

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length === 0) return

    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return

    latest.positions.forEach((p: Position) => {
      const sector = getSectorFromPosition({
        cusip: p.cusip,
        ticker: getTicker(p)
      })

      const germanSector = translateSector(sector)

      const current = sectorAnalysis.get(germanSector)

      if (current) {
        current.value += p.value
        current.count += 1
      } else {
        sectorAnalysis.set(germanSector, { value: p.value, count: 1 })
      }
    })
  })

  const result: SectorAnalysis[] = Array.from(sectorAnalysis.entries())
    .map(([sector, { value, count }]) => ({ sector, value, count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  calculationCache.set(cacheKey, result)
  return result
}

export function calculateGeographicExposure(): {
  usValue: number
  internationalValue: number
  usPercentage: number
  intlPercentage: number
} {
  const cacheKey = 'geographicExposure'
  if (calculationCache.has(cacheKey)) {
    return calculationCache.get(cacheKey)
  }

  let usValue = 0
  let internationalValue = 0

  preprocessedData.activeInvestors.forEach(slug => {
    const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined
    if (!snaps || snaps.length === 0) return

    const latest = snaps[snaps.length - 1]?.data
    if (!latest?.positions) return

    latest.positions.forEach((p: Position) => {
      const ticker = getTicker(p)
      if (!ticker) return

      const isInternational = ticker.includes('.') ||
        ['ASML', 'TSM', 'NESN', 'BABA', 'TCEHY', 'UL', 'NVO', 'NVSEF', 'SAP'].includes(ticker)

      if (isInternational) {
        internationalValue += p.value
      } else {
        usValue += p.value
      }
    })
  })

  const totalValue = usValue + internationalValue
  const usPercentage = totalValue > 0 ? (usValue / totalValue) * 100 : 0
  const intlPercentage = totalValue > 0 ? (internationalValue / totalValue) * 100 : 0

  const result = { usValue, internationalValue, usPercentage, intlPercentage }
  calculationCache.set(cacheKey, result)
  return result
}
