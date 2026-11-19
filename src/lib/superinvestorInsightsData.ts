// src/lib/superinvestorInsightsData.ts
// Server-only: Vorberechnete Daten für /superinvestor/momentum, /sectors und
// /insights. Die Rechenfunktionen in utils/insightsCalculations brauchen das
// komplette Holdings-Paket – das soll nicht mehr im Browser landen. Deshalb
// rechnet der Server alle wählbaren Zeiträume vor, der Client wählt nur aus.

import holdingsHistory from '@/data/holdings'
import type {
  ActivityData as InsightsActivityData,
  BigBetData,
  BigMove,
  ConcentrationData,
  ContrarianData,
  GeographicExposure,
  HoldingSnapshot,
  Position,
  QuarterOption,
  SectorAnalysis,
} from '@/types/insights'
import {
  preprocessedData,
  investorNames,
  getTicker,
  calculationCache,
  getSmartLatestQuarter,
  calculateMomentumShifts,
  calculateExitTracker,
  calculateNewDiscoveries,
  calculateBuySellBalance,
  calculateSectorNetFlows,
  calculateTopBuys,
  calculateTopOwned,
  calculateBiggestInvestments,
  calculateDataSourceStats,
  calculateResearchGems,
  getStockName,
} from '@/utils/insightsCalculations'
import { getSectorFromPosition, translateSector } from '@/utils/sectorUtils'

/** Zeiträume wie bisher im Client: neuestes Quartal, 2/3 Quartale, Einzelquartale, alles */
export function getPeriodOptions(): QuarterOption[] {
  const latest = getSmartLatestQuarter()
  const all = preprocessedData.allQuarters
  return [
    { id: 'latest', label: latest, quarters: [latest], description: 'Neuestes Quartal (≥50% Investoren)' },
    { id: 'last2', label: 'Letzte 2 Quartale', quarters: all.slice(0, 2), description: all.slice(0, 2).join(' + ') },
    { id: 'last3', label: 'Letzte 3 Quartale', quarters: all.slice(0, 3), description: all.slice(0, 3).join(', ') },
    ...all.slice(0, 6).map(quarter => ({ id: quarter, label: quarter, quarters: [quarter], description: 'Einzelnes Quartal' })),
    { id: 'all', label: 'Alle Zeit', quarters: all, description: 'Alle verfügbaren Quartale' },
  ]
}

// — Momentum —

export interface MomentumPeriodData {
  momentumShifts: ReturnType<typeof calculateMomentumShifts>
  exitTracker: ReturnType<typeof calculateExitTracker>
  newDiscoveries: ReturnType<typeof calculateNewDiscoveries>
  buySellBalance: ReturnType<typeof calculateBuySellBalance>
}

export interface MomentumData {
  latestQuarter: string
  options: QuarterOption[]
  byPeriod: Record<string, MomentumPeriodData>
}

let momentumCache: MomentumData | null = null

export function buildMomentumData(): MomentumData {
  if (momentumCache) return momentumCache
  const options = getPeriodOptions()
  const allQuarters = preprocessedData.allQuarters
  const byPeriod: Record<string, MomentumPeriodData> = {}

  for (const option of options) {
    // Buy/Sell-Balance zeigt ab dem gewählten Quartal 4 Quartale Verlauf
    const startIndex = allQuarters.indexOf(option.quarters[0])
    const balanceQuarters = startIndex >= 0 ? allQuarters.slice(startIndex, startIndex + 4) : allQuarters.slice(0, 4)
    byPeriod[option.id] = {
      momentumShifts: calculateMomentumShifts(option.quarters),
      exitTracker: calculateExitTracker(option.quarters),
      newDiscoveries: calculateNewDiscoveries(option.quarters),
      buySellBalance: calculateBuySellBalance(balanceQuarters),
    }
  }

  momentumCache = { latestQuarter: getSmartLatestQuarter(), options, byPeriod }
  return momentumCache
}


// — Sektoren —

function sectorPeriodOptions(): QuarterOption[] {
  return [
    {
      id: 'last2',
      label: 'Letzte 2 Quartale',
      quarters: preprocessedData.allQuarters.slice(0, 2),
      description: `${preprocessedData.allQuarters.slice(0, 2).join(' + ')}`
    },
    {
      id: 'last3',
      label: 'Letzte 3 Quartale',
      quarters: preprocessedData.allQuarters.slice(0, 3),
      description: `${preprocessedData.allQuarters.slice(0, 3).join(', ')}`
    },
    {
      id: 'last4',
      label: 'Letzte 4 Quartale',
      quarters: preprocessedData.allQuarters.slice(0, 4),
      description: `${preprocessedData.allQuarters.slice(0, 4).join(', ')}`
    },
    {
      id: 'all',
      label: 'Alle Zeit',
      quarters: preprocessedData.allQuarters,
      description: 'Alle verfügbaren Quartale'
    }
  ]
}

function computeTopSectors(): SectorAnalysis[] {
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

function computeConcentration(): ConcentrationData[] {
    const data: ConcentrationData[] = [];

    ['buffett', 'ackman', 'smith', 'gates', 'marks', 'icahn', 'einhorn', 'loeb', 'tepper'].forEach(slug => {
      const snaps = holdingsHistory[slug] as HoldingSnapshot[] | undefined;
      if (!snaps || snaps.length === 0) return;

      const latest = snaps[snaps.length - 1]?.data;
      if (!latest?.positions) return;

      const mergedMap = new Map<string, number>();
      latest.positions.forEach((p: Position) => {
        const ticker = getTicker(p) || p.cusip;
        mergedMap.set(ticker, (mergedMap.get(ticker) || 0) + p.value);
      });

      const sortedPositions = Array.from(mergedMap.values()).sort((a, b) => b - a);
      const totalValue = sortedPositions.reduce((sum, val) => sum + val, 0);

      if (totalValue === 0) return;

      const herfindahl = sortedPositions.reduce((sum, value) => {
        const percentage = value / totalValue;
        return sum + (percentage * percentage);
      }, 0);

      const top3Value = sortedPositions.slice(0, 3).reduce((sum, val) => sum + val, 0);
      const top3Percentage = (top3Value / totalValue) * 100;

      let type: 'high' | 'medium' | 'low';
      if (herfindahl > 0.2) type = 'high';
      else if (herfindahl > 0.1) type = 'medium';
      else type = 'low';

      data.push({
        investor: investorNames[slug] || slug,
        concentration: herfindahl,
        top3Percentage,
        totalPositions: sortedPositions.length,
        type
      });
    });

    data.sort((a, b) => b.concentration - a.concentration);
    return data;
  }

export interface SectorsData {
  options: QuarterOption[]
  topSectors: SectorAnalysis[]
  /** Netto-Zuflüsse je Sektor pro Zeitraum (als Einträge – Maps sind keine gültigen Props) */
  netFlowsByPeriod: Record<string, Array<[string, number]>>
  concentrationData: ConcentrationData[]
}

let sectorsCache: SectorsData | null = null

export function buildSectorsData(): SectorsData {
  if (sectorsCache) return sectorsCache
  const options = sectorPeriodOptions()
  const netFlowsByPeriod: Record<string, Array<[string, number]>> = {}
  for (const option of options) {
    netFlowsByPeriod[option.id] = Array.from(calculateSectorNetFlows(option.quarters).entries())
  }
  sectorsCache = { options, topSectors: computeTopSectors(), netFlowsByPeriod, concentrationData: computeConcentration() }
  return sectorsCache
}

// — Insights —

function computeBigBets(): BigBetData[] {
  const bigBetsData: BigBetData[] = [];

  const stockData = new Map<string, {
    investors: Array<{ slug: string; name: string; percent: number; value: number }>;
    totalValue: number;
    maxPercent: number;
    name: string;
  }>();

  Object.entries(holdingsHistory).forEach(([investorSlug, snaps]) => {
    if (!snaps || snaps.length === 0) return;

    const latest = snaps[snaps.length - 1]?.data;
    if (!latest?.positions) return;

    const totalPortfolioValue = latest.positions.reduce((sum, p) => sum + p.value, 0);

    const mergedPositions = new Map<string, { value: number; name: string }>();
    latest.positions.forEach((p: Position) => {
      const ticker = getTicker(p);
      if (!ticker) return;

      const current = mergedPositions.get(ticker);
      if (current) {
        current.value += p.value;
      } else {
        mergedPositions.set(ticker, { 
          value: p.value, 
          name: getStockName(p) 
        });
      }
    });

    mergedPositions.forEach(({ value, name }, ticker) => {
      const percent = (value / totalPortfolioValue) * 100;

      if (percent >= 3) {
        const current = stockData.get(ticker);

        if (current) {
          current.investors.push({
            slug: investorSlug,
            name: investorNames[investorSlug] || investorSlug,
            percent,
            value
          });
          current.totalValue += value;
          current.maxPercent = Math.max(current.maxPercent, percent);
        } else {
          stockData.set(ticker, {
            investors: [{
              slug: investorSlug,
              name: investorNames[investorSlug] || investorSlug,
              percent,
              value
            }],
            totalValue: value,
            maxPercent: percent,
            name
          });
        }
      }
    });
  });

  stockData.forEach((data, ticker) => {
    if (data.investors.length >= 2) {
      const topInvestor = data.investors.sort((a, b) => b.percent - a.percent)[0];

      bigBetsData.push({
        ticker,
        name: data.name,
        maxPortfolioPercent: data.maxPercent,
        ownershipCount: data.investors.length,
        totalValue: data.totalValue,
        topInvestor: topInvestor.name
      });
    }
  });

  bigBetsData.sort((a, b) => b.maxPortfolioPercent - a.maxPortfolioPercent);
  return bigBetsData
}

function computeContrarian(): ContrarianData[] {
  const contrarianData: ContrarianData[] = [];

  const ownershipCount = new Map<string, number>();
  Object.values(holdingsHistory).forEach(snaps => {
    if (!snaps || snaps.length === 0) return;

    const latest = snaps[snaps.length - 1]?.data;
    if (!latest?.positions) return;

    const seen = new Set<string>();
    latest.positions.forEach((p: Position) => {
      const ticker = getTicker(p);
      if (ticker && !seen.has(ticker)) {
        seen.add(ticker);
        ownershipCount.set(ticker, (ownershipCount.get(ticker) || 0) + 1);
      }
    });
  });

  Object.entries(holdingsHistory).forEach(([investorSlug, snaps]) => {
    if (!snaps || snaps.length === 0) return;

    const latest = snaps[snaps.length - 1]?.data;
    if (!latest?.positions) return;

    const totalPortfolioValue = latest.positions.reduce((sum, p) => sum + p.value, 0);

    const mergedPositions = new Map<string, { value: number; name: string }>();
    latest.positions.forEach((p: Position) => {
      const ticker = getTicker(p);
      if (!ticker) return;

      const current = mergedPositions.get(ticker);
      if (current) {
        current.value += p.value;
      } else {
        mergedPositions.set(ticker, { 
          value: p.value, 
          name: getStockName(p) 
        });
      }
    });

    mergedPositions.forEach(({ value, name }, ticker) => {
      const percent = (value / totalPortfolioValue) * 100;
      const totalOwners = ownershipCount.get(ticker) || 0;

      if (percent >= 4 && totalOwners <= 2) {
        contrarianData.push({
          ticker,
          name,
          portfolioPercent: percent,
          investor: investorNames[investorSlug] || investorSlug,
          value,
          ownershipCount: totalOwners
        });
      }
    });
  });

  contrarianData.sort((a, b) => b.portfolioPercent - a.portfolioPercent);
  return contrarianData
}

function computeInvestorActivity(): InsightsActivityData[] {
  const activityData: InsightsActivityData[] = [];

  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    if (!snaps || snaps.length < 2) return;

    let totalChanges = 0;
    let buys = 0;
    let sells = 0;
    let lastActivity = '';

    const recentSnaps = snaps.slice(-3);

    for (let i = 1; i < recentSnaps.length; i++) {
      const current = recentSnaps[i].data;
      const previous = recentSnaps[i - 1].data;
      lastActivity = current.date;

      const prevMap = new Map<string, number>();
      previous.positions?.forEach((p: Position) => {
        const ticker = getTicker(p);
        if (ticker) {
          prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares);
        }
      });

      const seen = new Set<string>();
      current.positions?.forEach((p: Position) => {
        const ticker = getTicker(p);
        if (!ticker || seen.has(ticker)) return;
        seen.add(ticker);

        const prevShares = prevMap.get(ticker) || 0;
        const delta = p.shares - prevShares;

        if (Math.abs(delta) > 100) {
          totalChanges++;
          if (delta > 0) buys++;
          else sells++;
        }
      });

      prevMap.forEach((prevShares, ticker) => {
        if (!seen.has(ticker) && prevShares > 100) {
          totalChanges++;
          sells++;
        }
      });
    }

    if (totalChanges > 0) {
      activityData.push({
        investor: investorNames[slug] || slug,
        changes: totalChanges,
        buys,
        sells,
        lastActivity
      });
    }
  });

  activityData.sort((a, b) => b.changes - a.changes);
  return activityData
}

function computeBigMoves(): BigMove[] {
  const bigMoves: BigMove[] = [];
  const minValueChange = 250_000_000;
  const minPortfolioPointChange = 0.75;
  const aggregatePositionsByTicker = (positions: Position[] | undefined) => {
    const map = new Map<string, { value: number }>();
    positions?.forEach((position: Position) => {
      const ticker = getTicker(position);
      if (!ticker) return;
      const current = map.get(ticker) || { value: 0 };
      current.value += position.value || 0;
      map.set(ticker, current);
    });
    return map;
  };

  Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
    if (!snaps || snaps.length < 2) return;

    const recent = snaps.slice(-3);
    if (recent.length < 2) return;

    const previous = recent[0].data;
    const current = recent[recent.length - 1].data;

    const prevTotalValue = previous.positions?.reduce((sum, p) => sum + p.value, 0) || 0;
    const currTotalValue = current.positions?.reduce((sum, p) => sum + p.value, 0) || 0;

    if (prevTotalValue === 0 || currTotalValue === 0) return;

    const prevMap = aggregatePositionsByTicker(previous.positions);
    const currMap = aggregatePositionsByTicker(current.positions);

    const tickers = new Set([...prevMap.keys(), ...currMap.keys()]);

    tickers.forEach(ticker => {
      const currentPosition = currMap.get(ticker);
      const previousPosition = prevMap.get(ticker);
      const currentValue = currentPosition?.value || 0;
      const previousValue = previousPosition?.value || 0;
      const valueChange = currentValue - previousValue;
      const absValueChange = Math.abs(valueChange);
      const currentPercent = (currentValue / currTotalValue) * 100;
      const previousPercent = (previousValue / prevTotalValue) * 100;
      const portfolioPointChange = currentPercent - previousPercent;
      const absPortfolioPointChange = Math.abs(portfolioPointChange);

      if (
        absValueChange >= minValueChange &&
        absPortfolioPointChange >= minPortfolioPointChange
      ) {
        bigMoves.push({
          investor: investorNames[slug] || slug,
          ticker,
          type: valueChange > 0 ? 'buy' : 'sell',
          percentChange: absPortfolioPointChange,
          portfolioPointChange: absPortfolioPointChange,
          value: currentValue,
          valueChange,
          date: current.date
        });
      }
    });
  });

  bigMoves.sort((a, b) => {
    const valueDiff = Math.abs(b.valueChange) - Math.abs(a.valueChange);
    if (valueDiff !== 0) return valueDiff;
    return b.portfolioPointChange - a.portfolioPointChange;
  });
  return bigMoves
}

function computeGeographicExposure(): GeographicExposure {
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

    const result: GeographicExposure = { usValue, internationalValue, usPercentage, intlPercentage }
    calculationCache.set(cacheKey, result)
    return result
}

export interface InsightsPeriodData {
  dataSourceStats: ReturnType<typeof calculateDataSourceStats>
  topBuys: ReturnType<typeof calculateTopBuys>
  /** Arrays verlieren Zusatzfelder bei der Übergabe an den Client – daher separat */
  topBuysTotalUnique: number | null
}

export interface InsightsData {
  latestQuarter: string
  options: QuarterOption[]
  byPeriod: Record<string, InsightsPeriodData>
  topOwned: ReturnType<typeof calculateTopOwned>
  topOwnedTotalUnique: number | null
  biggestInvestments: ReturnType<typeof calculateBiggestInvestments>
  topSectors: SectorAnalysis[]
  geographicExposure: GeographicExposure
  researchGems: ReturnType<typeof calculateResearchGems>
  bigBets: BigBetData[]
  contrarian: ContrarianData[]
  investorActivity: InsightsActivityData[]
  bigMoves: BigMove[]
  /** Anzeigenamen für Ticker in den Top-Listen */
  stockNames: Record<string, string>
}

let insightsCache: InsightsData | null = null

export function buildInsightsData(): InsightsData {
  if (insightsCache) return insightsCache
  const options = getPeriodOptions()

  const byPeriod: Record<string, InsightsPeriodData> = {}
  for (const option of options) {
    const topBuys = calculateTopBuys(option.quarters)
    byPeriod[option.id] = {
      dataSourceStats: calculateDataSourceStats(option.quarters),
      topBuys: [...topBuys],
      topBuysTotalUnique: topBuys.totalUniqueStocks ?? null,
    }
  }

  const topOwned = calculateTopOwned()
  const stockNames: Record<string, string> = {}
  const tickers = [...Object.values(byPeriod).flatMap(p => p.topBuys.map(b => b.ticker)), ...topOwned.map(o => o.ticker)]
  for (const ticker of tickers) {
    const name = preprocessedData.nameMap.get(ticker)
    if (name) stockNames[ticker] = name
  }

  insightsCache = {
    latestQuarter: getSmartLatestQuarter(),
    options,
    byPeriod,
    topOwned: [...topOwned],
    topOwnedTotalUnique: topOwned.totalUniqueStocks ?? null,
    biggestInvestments: calculateBiggestInvestments(),
    topSectors: computeTopSectors(),
    geographicExposure: computeGeographicExposure(),
    researchGems: calculateResearchGems(),
    // Die Seite zeigt je Liste nur die ersten Einträge – mehr nicht mitschicken
    bigBets: computeBigBets().slice(0, 8),
    contrarian: computeContrarian().slice(0, 8),
    investorActivity: computeInvestorActivity().slice(0, 6),
    bigMoves: computeBigMoves().slice(0, 6),
    stockNames,
  }
  return insightsCache
}
