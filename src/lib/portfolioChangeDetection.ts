/**
 * Portfolio Change Detection für 13F Holdings-Daten
 * Analysiert Veränderungen zwischen zwei Quartalen und generiert News
 */

export interface Position {
  name: string;
  cusip: string;
  shares: number;
  value: number;
  optionType: string;
  titleOfClass?: string;
  putCall?: string | null;
}

export interface HoldingsData {
  form: string;
  date: string;
  period: string;
  quarterKey: string;
  positions: Position[];
  totalValue: number;
  positionsCount: number;
}

export interface PortfolioChange {
  type: 'NEW_POSITION' | 'INCREASED' | 'DECREASED' | 'SOLD' | 'UNCHANGED';
  cusip: string;
  name: string;
  previousShares: number;
  currentShares: number;
  previousValue: number;
  currentValue: number;
  shareChange: number;
  valueChange: number;
  percentChange: number;
  isMajorMove: boolean; // >$1B value change
  isSignificant: boolean; // >10% change or >$100M
}

export interface PortfolioAnalysis {
  investor: string;
  previousQuarter: string;
  currentQuarter: string;
  changes: PortfolioChange[];
  summary: {
    newPositions: number;
    soldPositions: number;
    increasedPositions: number;
    decreasedPositions: number;
    majorMoves: number;
    totalValueChange: number;
    portfolioValuePrevious: number;
    portfolioValueCurrent: number;
  };
}

/**
 * Aggregiert Positionen nach CUSIP (kombiniert duplicate entries)
 */
function aggregatePositions(positions: Position[]): Map<string, Position> {
  const aggregated = new Map<string, Position>();
  
  positions.forEach(position => {
    if (aggregated.has(position.cusip)) {
      const existing = aggregated.get(position.cusip)!;
      existing.shares += position.shares;
      existing.value += position.value;
    } else {
      aggregated.set(position.cusip, { ...position });
    }
  });
  
  return aggregated;
}

/**
 * Vergleicht zwei Quartale und erkennt Portfolio-Änderungen
 */
export function detectPortfolioChanges(
  previousQuarter: HoldingsData,
  currentQuarter: HoldingsData,
  investorName: string
): PortfolioAnalysis {
  const previousPositions = aggregatePositions(previousQuarter.positions);
  const currentPositions = aggregatePositions(currentQuarter.positions);
  
  const changes: PortfolioChange[] = [];
  const allCusips = new Set([
    ...previousPositions.keys(),
    ...currentPositions.keys()
  ]);
  
  allCusips.forEach(cusip => {
    const previous = previousPositions.get(cusip);
    const current = currentPositions.get(cusip);
    
    if (!previous && current) {
      // Neue Position
      changes.push({
        type: 'NEW_POSITION',
        cusip,
        name: current.name,
        previousShares: 0,
        currentShares: current.shares,
        previousValue: 0,
        currentValue: current.value,
        shareChange: current.shares,
        valueChange: current.value,
        percentChange: 100,
        isMajorMove: current.value > 1_000_000_000,
        isSignificant: current.value > 100_000_000
      });
    } else if (previous && !current) {
      // Position verkauft
      changes.push({
        type: 'SOLD',
        cusip,
        name: previous.name,
        previousShares: previous.shares,
        currentShares: 0,
        previousValue: previous.value,
        currentValue: 0,
        shareChange: -previous.shares,
        valueChange: -previous.value,
        percentChange: -100,
        isMajorMove: Math.abs(previous.value) > 1_000_000_000,
        isSignificant: Math.abs(previous.value) > 100_000_000
      });
    } else if (previous && current) {
      // Existierende Position verändert
      const shareChange = current.shares - previous.shares;
      const valueChange = current.value - previous.value;
      const percentChange = ((current.shares - previous.shares) / previous.shares) * 100;
      
      let type: PortfolioChange['type'] = 'UNCHANGED';
      if (shareChange > 0) {
        type = 'INCREASED';
      } else if (shareChange < 0) {
        type = 'DECREASED';
      }
      
      const isMajorMove = Math.abs(valueChange) > 1_000_000_000;
      const isSignificant = Math.abs(percentChange) > 10 || Math.abs(valueChange) > 100_000_000;
      
      if (type !== 'UNCHANGED' || isMajorMove || isSignificant) {
        changes.push({
          type,
          cusip,
          name: current.name,
          previousShares: previous.shares,
          currentShares: current.shares,
          previousValue: previous.value,
          currentValue: current.value,
          shareChange,
          valueChange,
          percentChange,
          isMajorMove,
          isSignificant
        });
      }
    }
  });
  
  // Sortiere nach Wichtigkeit (Major Moves zuerst, dann nach Wert-Änderung)
  changes.sort((a, b) => {
    if (a.isMajorMove && !b.isMajorMove) return -1;
    if (!a.isMajorMove && b.isMajorMove) return 1;
    return Math.abs(b.valueChange) - Math.abs(a.valueChange);
  });
  
  const summary = {
    newPositions: changes.filter(c => c.type === 'NEW_POSITION').length,
    soldPositions: changes.filter(c => c.type === 'SOLD').length,
    increasedPositions: changes.filter(c => c.type === 'INCREASED').length,
    decreasedPositions: changes.filter(c => c.type === 'DECREASED').length,
    majorMoves: changes.filter(c => c.isMajorMove).length,
    totalValueChange: currentQuarter.totalValue - previousQuarter.totalValue,
    portfolioValuePrevious: previousQuarter.totalValue,
    portfolioValueCurrent: currentQuarter.totalValue
  };
  
  return {
    investor: investorName,
    previousQuarter: previousQuarter.quarterKey,
    currentQuarter: currentQuarter.quarterKey,
    changes,
    summary
  };
}

/**
 * Formatiert Geld-Werte für News-Generation
 */
export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(0)}M`;
    } else if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Formatiert Aktien-Anzahl
 */
export function formatShares(shares: number, compact = false): string {
  if (compact) {
    if (Math.abs(shares) >= 1_000_000) {
      return `${(shares / 1_000_000).toFixed(1)}M`;
    } else if (Math.abs(shares) >= 1_000) {
      return `${(shares / 1_000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat('en-US').format(shares);
}