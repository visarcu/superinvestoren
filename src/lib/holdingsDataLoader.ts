/**
 * Holdings Data Loader - lädt und verwaltet 13F Holdings-Daten
 */

import { promises as fs } from 'fs';
import path from 'path';
import { HoldingsData } from './portfolioChangeDetection';

const HOLDINGS_DATA_PATH = path.join(process.cwd(), 'src', 'data', 'holdings');

export interface AvailableData {
  investor: string;
  quarters: string[];
  latestQuarter: string;
  previousQuarter?: string;
}

/**
 * Lädt verfügbare Investoren und deren Quartale
 */
export async function getAvailableInvestors(): Promise<AvailableData[]> {
  try {
    const investors = await fs.readdir(HOLDINGS_DATA_PATH);
    const investorData: AvailableData[] = [];
    
    for (const investor of investors) {
      const investorPath = path.join(HOLDINGS_DATA_PATH, investor);
      const stat = await fs.stat(investorPath);
      
      if (stat.isDirectory()) {
        const files = await fs.readdir(investorPath);
        const quarters = files
          .filter(file => file.endsWith('.json'))
          .map(file => file.replace('.json', ''))
          .sort((a, b) => {
            // Sortiere Quartale chronologisch (neueste zuerst)
            const [yearA, quarterA] = a.split('-Q');
            const [yearB, quarterB] = b.split('-Q');
            if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
            return parseInt(quarterB) - parseInt(quarterA);
          });
        
        if (quarters.length > 0) {
          investorData.push({
            investor,
            quarters,
            latestQuarter: quarters[0],
            previousQuarter: quarters.length > 1 ? quarters[1] : undefined
          });
        }
      }
    }
    
    return investorData;
  } catch (error) {
    console.error('Error loading available investors:', error);
    return [];
  }
}

/**
 * Lädt Holdings-Daten für einen spezifischen Investor und Quartal
 */
export async function loadHoldingsData(investor: string, quarter: string): Promise<HoldingsData | null> {
  try {
    const filePath = path.join(HOLDINGS_DATA_PATH, investor, `${quarter}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent) as HoldingsData;
  } catch (error) {
    console.error(`Error loading holdings data for ${investor} ${quarter}:`, error);
    return null;
  }
}

/**
 * Lädt die letzten beiden Quartale für einen Investor
 */
export async function loadLatestTwoQuarters(investor: string): Promise<{
  current: HoldingsData | null;
  previous: HoldingsData | null;
}> {
  const available = await getAvailableInvestors();
  const investorData = available.find(inv => inv.investor === investor);
  
  if (!investorData || !investorData.previousQuarter) {
    return { current: null, previous: null };
  }
  
  const [current, previous] = await Promise.all([
    loadHoldingsData(investor, investorData.latestQuarter),
    loadHoldingsData(investor, investorData.previousQuarter)
  ]);
  
  return { current, previous };
}

/**
 * Lädt alle verfügbaren Quartale für einen Investor
 */
export async function loadAllQuarters(investor: string): Promise<HoldingsData[]> {
  const available = await getAvailableInvestors();
  const investorData = available.find(inv => inv.investor === investor);
  
  if (!investorData) {
    return [];
  }
  
  const quarters: HoldingsData[] = [];
  
  for (const quarter of investorData.quarters) {
    const data = await loadHoldingsData(investor, quarter);
    if (data) {
      quarters.push(data);
    }
  }
  
  return quarters;
}

/**
 * Lädt Holdings-Daten für alle Investoren für ein spezifisches Quartal
 */
export async function loadAllInvestorsForQuarter(quarter: string): Promise<Map<string, HoldingsData>> {
  const available = await getAvailableInvestors();
  const results = new Map<string, HoldingsData>();
  
  for (const investorData of available) {
    if (investorData.quarters.includes(quarter)) {
      const data = await loadHoldingsData(investorData.investor, quarter);
      if (data) {
        results.set(investorData.investor, data);
      }
    }
  }
  
  return results;
}

/**
 * Hilfsfunktion: Quartale chronologisch sortieren
 */
export function sortQuartersChronologically(quarters: string[], descending = true): string[] {
  return [...quarters].sort((a, b) => {
    const [yearA, quarterA] = a.split('-Q');
    const [yearB, quarterB] = b.split('-Q');
    
    const yearDiff = parseInt(yearB) - parseInt(yearA);
    if (yearDiff !== 0) {
      return descending ? yearDiff : -yearDiff;
    }
    
    const quarterDiff = parseInt(quarterB) - parseInt(quarterA);
    return descending ? quarterDiff : -quarterDiff;
  });
}

/**
 * Hilfsfunktion: Prüft ob ein Quartal nach einem anderen liegt
 */
export function isQuarterAfter(quarter1: string, quarter2: string): boolean {
  const [year1, q1] = quarter1.split('-Q').map(Number);
  const [year2, q2] = quarter2.split('-Q').map(Number);
  
  if (year1 !== year2) {
    return year1 > year2;
  }
  
  return q1 > q2;
}

/**
 * Cache für Holdings-Daten (in-memory)
 */
const holdingsCache = new Map<string, { data: HoldingsData; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 Minuten

/**
 * Lädt Holdings-Daten mit Caching
 */
export async function loadHoldingsDataCached(investor: string, quarter: string): Promise<HoldingsData | null> {
  const cacheKey = `${investor}-${quarter}`;
  const cached = holdingsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await loadHoldingsData(investor, quarter);
  if (data) {
    holdingsCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }
  
  return data;
}