import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  ChartBarIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BuildingOfficeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import holdingsHistory from '@/data/holdings';
import { stocks } from '@/data/stocks';
import Logo from '@/components/Logo';

// Professional, gedämpfte Farben
const TrendsPage = () => {
  // Helper functions für echte Datenberechnung
  const getTicker = (position: any): string | null => {
    if (position.ticker) return position.ticker;
    const stock = stocks.find(s => s.cusip === position.cusip);
    return stock?.ticker || null;
  };

  const getStockName = (position: any): string => {
    if (position.name && position.ticker) {
      return position.name.includes(' - ') 
        ? position.name.split(' - ')[1].trim()
        : position.name;
    }
    const stock = stocks.find(s => s.cusip === position.cusip);
    return stock?.name || position.name || position.cusip;
  };

  const getPeriodFromDate = (dateStr: string) => {
    const [year, month] = dateStr.split('-').map(Number);
    const filingQ = Math.ceil(month / 3);
    let reportQ = filingQ - 1, reportY = year;
    if (reportQ === 0) {
      reportQ = 4;
      reportY = year - 1;
    }
    return `Q${reportQ} ${reportY}`;
  };

  const formatCurrencyGerman = (amount: number, showCurrency = true) => {
    const suffix = showCurrency ? ' $' : '';
    
    if (amount >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toFixed(1)} Mrd.${suffix}`;
    } else if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)} Mio.${suffix}`;
    } else if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(1)} Tsd.${suffix}`;
    }
    return `${amount.toFixed(0)}${suffix}`;
  };

  // ECHTE DATEN: Hot Stocks berechnen (letzte 90 Tage)
  const calculateHotStocks = () => {
    const buyCount = new Map<string, { count: number; name: string; totalValue: number }>();
    
    Object.values(holdingsHistory).forEach(snaps => {
      if (!snaps || snaps.length < 2) return;
      
      // Nur die letzten 2-3 Quartale für "recent activity"
      const recentSnaps = snaps.slice(-3);
      
      for (let i = 1; i < recentSnaps.length; i++) {
        const current = recentSnaps[i].data;
        const previous = recentSnaps[i - 1].data;
        
        const prevMap = new Map<string, number>();
        previous.positions?.forEach((p: any) => {
          const ticker = getTicker(p);
          if (ticker) {
            prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares);
          }
        });

        const seen = new Set<string>();
        current.positions?.forEach((p: any) => {
          const ticker = getTicker(p);
          if (!ticker || seen.has(ticker)) return;
          seen.add(ticker);

          const prevShares = prevMap.get(ticker) || 0;
          const delta = p.shares - prevShares;

          if (delta > 0) { // Gekauft
            const current = buyCount.get(ticker);
            if (current) {
              current.count += 1;
              current.totalValue += p.value;
            } else {
              buyCount.set(ticker, {
                count: 1,
                name: getStockName(p),
                totalValue: p.value
              });
            }
          }
        });
      }
    });

    return Array.from(buyCount.entries())
      .map(([ticker, data]) => ({ ticker, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  // ECHTE DATEN: Sektor Trends berechnen
  const calculateSectorTrends = () => {
    const sectorMapping: Record<string, string> = {
      'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'AMZN': 'Technology',
      'TSLA': 'Technology', 'META': 'Technology', 'NVDA': 'Technology',
      'BAC': 'Financial Services', 'JPM': 'Financial Services', 'WFC': 'Financial Services',
      'KO': 'Consumer Staples', 'PG': 'Consumer Staples',
      'JNJ': 'Healthcare', 'UNH': 'Healthcare',
      'XOM': 'Energy', 'CVX': 'Energy'
    };

    const sectorChanges = new Map<string, { current: number; previous: number; investors: Set<string> }>();

    Object.entries(holdingsHistory).forEach(([investorSlug, snaps]) => {
      if (!snaps || snaps.length < 2) return;

      const current = snaps[snaps.length - 1].data;
      const previous = snaps[snaps.length - 2].data;

      [current, previous].forEach((data, index) => {
        const sectorValues = new Map<string, number>();
        
        data.positions?.forEach((p: any) => {
          const ticker = getTicker(p);
          if (!ticker) return;
          
          const sector = sectorMapping[ticker] || 'Other';
          sectorValues.set(sector, (sectorValues.get(sector) || 0) + p.value);
        });

        sectorValues.forEach((value, sector) => {
          const key = sector;
          const existing = sectorChanges.get(key) || { current: 0, previous: 0, investors: new Set() };
          
          if (index === 0) { // current
            existing.current += value;
            existing.investors.add(investorSlug);
          } else { // previous
            existing.previous += value;
          }
          
          sectorChanges.set(key, existing);
        });
      });
    });

    return Array.from(sectorChanges.entries())
      .map(([sector, data]) => ({
        sector,
        change: data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : 0,
        investors: data.investors.size,
        status: data.current > data.previous ? 'buying' : 'selling'
      }))
      .filter(s => s.sector !== 'Other')
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 4);
  };

  // ECHTE DATEN: Neue Positionen finden
  const findNewPositions = () => {
    const newPositions: Array<{
      ticker: string;
      investor: string;
      value: number;
      isNew: boolean;
    }> = [];

    const investorNames: Record<string, string> = {
      buffett: 'Warren Buffett',
      ackman: 'Bill Ackman', 
      gates: 'Bill Gates',
      smith: 'Terry Smith',
      marks: 'Howard Marks'
    };

    Object.entries(holdingsHistory).forEach(([slug, snaps]) => {
      if (!snaps || snaps.length < 2) return;

      const current = snaps[snaps.length - 1].data;
      const previous = snaps[snaps.length - 2].data;

      const prevTickers = new Set();
      previous.positions?.forEach((p: any) => {
        const ticker = getTicker(p);
        if (ticker) prevTickers.add(ticker);
      });

      current.positions?.forEach((p: any) => {
        const ticker = getTicker(p);
        if (!ticker || prevTickers.has(ticker)) return;

        // Neue Position gefunden
        if (p.value > 50_000_000) { // Nur größere Positionen (>50M)
          newPositions.push({
            ticker,
            investor: investorNames[slug] || slug,
            value: p.value,
            isNew: true
          });
        }
      });
    });

    return newPositions
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  // Cash-Level Trend berechnen (für Buffett)
  const calculateCashTrend = () => {
    const buffettSnaps = holdingsHistory.buffett;
    if (!buffettSnaps || buffettSnaps.length < 2) return null;

    // Hier würdest du deine Cash-Daten verwenden
    // Für jetzt nehmen wir an, dass weniger Aktien = mehr Cash
    const current = buffettSnaps[buffettSnaps.length - 1].data;
    const previous = buffettSnaps[buffettSnaps.length - 2].data;

    const currentTotal = current.positions?.reduce((sum, p) => sum + p.value, 0) || 0;
    const previousTotal = previous.positions?.reduce((sum, p) => sum + p.value, 0) || 0;

    const change = ((currentTotal - previousTotal) / previousTotal) * 100;
    
    return {
      trend: change > 0 ? 'investing' : 'building_cash',
      change: Math.abs(change),
      level: change > 0 ? 'bullish' : 'cautious'
    };
  };

  // Daten berechnen
  const hotStocks = calculateHotStocks();
  const sectorTrends = calculateSectorTrends();
  const newPositions = findNewPositions();
  const cashTrend = calculateCashTrend();

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      {/* Professional Header */}
      <section className="bg-gray-950 noise-bg pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link
              href="/superinvestor"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm group"
            >
              ← Zurück zur Übersicht
            </Link>
          </div>

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm font-medium mb-6">
              <ArrowTrendingUpIcon className="w-4 h-4" />
              Live Market Trends
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Super-Investor{' '}
              <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                Trends
              </span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Echte Einblicke in die aktuellen Bewegungen und Trends 
              der erfolgreichsten Investoren basierend auf SEC 13F Filings.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Hot Stocks - Professional */}
          <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Meistgekaufte Aktien</h2>
                <p className="text-sm text-gray-400">Basierend auf den letzten 3 Quartalen</p>
              </div>
            </div>

            <div className="space-y-3">
              {hotStocks.map((stock, index) => (
                <Link
                  key={stock.ticker}
                  href={`/analyse/stocks/${stock.ticker.toLowerCase()}/super-investors`}
                  className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-bold text-gray-500 w-8">
                      #{index + 1}
                    </div>
                    <div className="w-8 h-8 relative">
                      <Logo
                        ticker={stock.ticker}
                        alt={`${stock.ticker} Logo`}
                        className="w-full h-full"
                        padding="none"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-brand-light transition-colors">
                        {stock.ticker}
                      </div>
                      <p className="text-sm text-gray-400 truncate max-w-[200px]">
                        {stock.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {stock.count}
                    </div>
                    <div className="text-sm text-gray-400">Käufer</div>
                    <div className="text-xs text-gray-500">
                      {formatCurrencyGerman(stock.totalValue, false)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {hotStocks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <ArrowTrendingUpIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Keine signifikanten Käufe in den letzten Quartalen</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Sektor Trends - Professional */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="w-5 h-5 text-gray-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sektor-Bewegungen</h3>
                  <p className="text-xs text-gray-400">Quartal-über-Quartal</p>
                </div>
              </div>

              <div className="space-y-3">
                {sectorTrends.map(sector => (
                  <div key={sector.sector} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                      <div className="font-medium text-white text-sm">{sector.sector}</div>
                      <div className="text-xs text-gray-400">{sector.investors} Investoren</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold flex items-center gap-1 ${
                        sector.change > 0 ? 'text-brand-light' : 'text-red-400'
                      }`}>
                        {sector.change > 0 ? 
                          <ArrowUpIcon className="w-3 h-3" /> : 
                          <ArrowDownIcon className="w-3 h-3" />
                        }
                        {Math.abs(sector.change).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {sectorTrends.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">Keine signifikanten Sektor-Bewegungen</p>
                </div>
              )}
            </div>

            {/* Neue Positionen */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-gray-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Neue Positionen</h3>
                  <p className="text-xs text-gray-400">Letztes Quartal</p>
                </div>
              </div>

              <div className="space-y-3">
                {newPositions.map((position, index) => (
                  <Link
                    key={`${position.ticker}-${position.investor}`}
                    href={`/analyse/stocks/${position.ticker.toLowerCase()}/super-investors`}
                    className="block p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white">{position.ticker}</span>
                      <span className="text-brand-light font-semibold">
                        {formatCurrencyGerman(position.value, false)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">{position.investor}</div>
                  </Link>
                ))}
              </div>

              {newPositions.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">Keine neuen Großpositionen</p>
                </div>
              )}
            </div>

            {/* Market Sentiment */}
            {cashTrend && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-gray-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Market Sentiment</h3>
                    <p className="text-xs text-gray-400">Basierend auf Aktivität</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className={`text-2xl font-bold mb-2 ${
                    cashTrend.level === 'bullish' ? 'text-brand-light' : 'text-yellow-400'
                  }`}>
                    {cashTrend.level === 'bullish' ? '📈 Investieren' : '💰 Vorsichtig'}
                  </div>
                  <div className="text-sm text-gray-400">
                    Portfolio-Änderung: {cashTrend.change.toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Source Info */}
        <div className="mt-16 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <InformationCircleIcon className="w-4 h-4" />
            <span>
              Alle Daten basieren auf aktuellen SEC 13F Filings. 
              Trends werden aus Portfolio-Änderungen der letzten 2-3 Quartale berechnet.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendsPage;