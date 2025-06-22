// src/app/heatmap/page.tsx - THEME-OPTIMIERTE VERSION
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { 
  ChartBarIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ArrowPathIcon,
  FunnelIcon,
  MapIcon
} from '@heroicons/react/24/outline';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  marketCap: number;
  sector: string;
}

interface SectorData {
  sector: string;
  avgChange: number;
  totalMarketCap: number;
  count: number;
  stocks: StockData[];
}

interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
  stock: StockData;
}

// VOLLSTÄNDIGE S&P 500 LISTE
const SP500_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'BRK-B', 'UNH',
  'JNJ', 'JPM', 'V', 'PG', 'MA', 'HD', 'CVX', 'LLY', 'ABBV', 'PFE',
  'KO', 'AVGO', 'PEP', 'TMO', 'COST', 'DIS', 'ABT', 'ACN', 'MRK', 'VZ',
  'NFLX', 'ADBE', 'CRM', 'WMT', 'DHR', 'TXN', 'NKE', 'MDT', 'QCOM', 'NEE',
  'ORCL', 'CMCSA', 'XOM', 'BMY', 'HON', 'SCHW', 'UPS', 'PM', 'LOW', 'COP',
  'IBM', 'SPGI', 'UNP', 'CAT', 'RTX', 'GS', 'AXP', 'T', 'INTC', 'MS',
  'BA', 'BLK', 'AMD', 'LMT', 'NOW', 'INTU', 'DE', 'PLD', 'MMM', 'GE',
  'SYK', 'TJX', 'ELV', 'BKNG', 'MU', 'GILD', 'ADI', 'CVS', 'MDLZ', 'C',
  'ISRG', 'REGN', 'VRTX', 'AMGN', 'ZTS', 'CI', 'PYPL', 'TMUS', 'CHTR', 'CME',
  'SO', 'AMAT', 'TGT', 'BSX', 'MO', 'EQIX', 'DUK', 'NSC', 'AON', 'SHW',
  'CL', 'ITW', 'APD', 'KLAC', 'HUM', 'MMC', 'PGR', 'ICE', 'MCO', 'FDX',
  'WM', 'USB', 'GD', 'TFC', 'NOC', 'NUE', 'EMR', 'CARR', 'CCI', 'PSA',
  'ECL', 'EL', 'TRV', 'MCK', 'SLB', 'COF', 'EOG', 'AJG', 'BDX', 'WELL',
  'WEC', 'PCAR', 'ROP', 'ROST', 'JCI', 'KMB', 'AEE', 'MNST', 'CTAS', 'KR',
  
  // Erweiterte Liste für vollständige S&P 500
  'ALL', 'AIG', 'AMT', 'AMP', 'AME', 'AMCR', 'AEE', 'AFL', 'A', 'APD',
  'AKAM', 'ALK', 'ALB', 'ARE', 'ALXN', 'ALGN', 'ALLE', 'AGN', 'ADS', 'LNT',
  'ALL', 'GOOGL', 'GOOG', 'MO', 'AMZN', 'AMCR', 'AMD', 'AEE', 'AAL', 'AEP',
  'AXP', 'AIG', 'AMT', 'AWK', 'AMP', 'ABC', 'AME', 'AMGN', 'APH', 'APC',
  'ADI', 'ANSS', 'ANTM', 'AON', 'AOS', 'APA', 'AIV', 'AAPL', 'AMAT', 'APTV',
  'ADM', 'ANET', 'AJG', 'AIZ', 'ATO', 'ADSK', 'ADP', 'AZO', 'AVB', 'AVY'
];

export default function SP500Heatmap() {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<'SP500' | 'DAX' | 'NASDAQ100'>('SP500');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showAll, setShowAll] = useState<boolean>(true);
  const router = useRouter();

  // Deutsche Sektor-Übersetzung
  const getSectorDisplayName = (sector: string): string => {
    const translations: Record<string, string> = {
      'Technology': 'Technologie',
      'Consumer Discretionary': 'Nicht-Basiskonsumgüter',
      'Health Care': 'Gesundheitswesen', 
      'Financials': 'Finanzdienstleistungen',
      'Consumer Staples': 'Basiskonsumgüter',
      'Communication Services': 'Kommunikationsdienste',
      'Energy': 'Energie',
      'Industrials': 'Industrie',
      'Utilities': 'Versorgungsunternehmen',
      'Real Estate': 'Immobilien',
      'Materials': 'Rohstoffe',
      'Automotive': 'Automobilindustrie',
      'Chemicals': 'Chemie',
      'Telecommunications': 'Telekommunikation'
    };
    
    return translations[sector] || sector;
  };

  const getColor = (change: number): string => {
    if (change > 5) return 'bg-green-800';
    if (change > 3) return 'bg-green-700'; 
    if (change > 1) return 'bg-green-600'; 
    if (change > 0.5) return 'bg-green-500';
    if (change > 0) return 'bg-green-400';
    if (change > -0.5) return 'bg-red-400';
    if (change > -1) return 'bg-red-500';
    if (change > -3) return 'bg-red-600';
    if (change > -5) return 'bg-red-700';
    return 'bg-red-800';
  };

  // EINFACHER aber ZUVERLÄSSIGER Binary Space Partitioning Treemap
  const createTreemap = (stocks: StockData[], containerWidth: number, containerHeight: number): TreemapRect[] => {
    if (stocks.length === 0) return [];
    
    const totalMarketCap = stocks.reduce((sum, stock) => sum + stock.marketCap, 0);
    const sortedStocks = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
    
    // Rekursive Binäre Raumaufteilung
    const subdivide = (
      stocksToPlace: StockData[],
      x: number,
      y: number,
      width: number,
      height: number
    ): TreemapRect[] => {
      if (stocksToPlace.length === 0) return [];
      
      if (stocksToPlace.length === 1) {
        const padding = 1;
        return [{
          x: x + padding,
          y: y + padding,
          width: Math.max(10, width - 2 * padding),
          height: Math.max(10, height - 2 * padding),
          stock: stocksToPlace[0]
        }];
      }
      
      // Berechne Gesamtmarktkapitalisierung der aktuellen Gruppe
      const currentTotalCap = stocksToPlace.reduce((sum, stock) => sum + stock.marketCap, 0);
      
      // Finde optimale Aufteilung
      let bestSplit = 1;
      let bestRatio = Infinity;
      
      // Teste verschiedene Aufteilungen (maximal 20% der Aktien pro Gruppe)
      const maxSplit = Math.min(Math.ceil(stocksToPlace.length * 0.6), stocksToPlace.length - 1);
      
      for (let i = 1; i <= maxSplit; i++) {
        const leftGroup = stocksToPlace.slice(0, i);
        const leftCap = leftGroup.reduce((sum, stock) => sum + stock.marketCap, 0);
        const leftRatio = leftCap / currentTotalCap;
        
        // Bestimme Teilungsrichtung basierend auf Seitenverhältnis
        const isHorizontalSplit = width >= height;
        
        let leftWidth, leftHeight, rightWidth, rightHeight;
        
        if (isHorizontalSplit) {
          // Horizontale Teilung (nebeneinander)
          leftWidth = width * leftRatio;
          leftHeight = height;
          rightWidth = width - leftWidth;
          rightHeight = height;
        } else {
          // Vertikale Teilung (übereinander)
          leftWidth = width;
          leftHeight = height * leftRatio;
          rightWidth = width;
          rightHeight = height - leftHeight;
        }
        
        // Berechne Aspect Ratios
        const leftAspect = Math.max(leftWidth / leftHeight, leftHeight / leftWidth);
        const rightAspect = Math.max(rightWidth / rightHeight, rightHeight / rightWidth);
        const maxAspect = Math.max(leftAspect, rightAspect);
        
        if (maxAspect < bestRatio) {
          bestRatio = maxAspect;
          bestSplit = i;
        }
      }
      
      // Führe die beste Teilung durch
      const leftGroup = stocksToPlace.slice(0, bestSplit);
      const rightGroup = stocksToPlace.slice(bestSplit);
      
      const leftCap = leftGroup.reduce((sum, stock) => sum + stock.marketCap, 0);
      const leftRatio = leftCap / currentTotalCap;
      
      const isHorizontalSplit = width >= height;
      
      let leftRect, rightRect;
      
      if (isHorizontalSplit) {
        const leftWidth = width * leftRatio;
        leftRect = { x, y, width: leftWidth, height };
        rightRect = { x: x + leftWidth, y, width: width - leftWidth, height };
      } else {
        const leftHeight = height * leftRatio;
        leftRect = { x, y, width, height: leftHeight };
        rightRect = { x, y: y + leftHeight, width, height: height - leftHeight };
      }
      
      // Rekursive Aufrufe
      const leftResults = subdivide(leftGroup, leftRect.x, leftRect.y, leftRect.width, leftRect.height);
      const rightResults = subdivide(rightGroup, rightRect.x, rightRect.y, rightRect.width, rightRect.height);
      
      return [...leftResults, ...rightResults];
    };
    
    return subdivide(sortedStocks, 0, 0, containerWidth, containerHeight);
  };

  // Index-Aktien (erweitert)
  const getIndexStocks = (index: string) => {
    switch (index) {
      case 'DAX':
        return [
          'SAP.DE', 'SIE.DE', 'ALV.DE', 'BAS.DE', 'BMW.DE', 'DAI.DE', 'DBK.DE', 
          'DTE.DE', 'EON.DE', 'FRE.DE', 'HEI.DE', 'HEN3.DE', 'IFX.DE',
          'LIN.DE', 'MRK.DE', 'MTX.DE', 'MUV2.DE', 'RWE.DE', 'VNA.DE',
          'VOW3.DE', 'ZAL.DE', 'ADS.DE', 'CON.DE', 'EOAN.DE', 'FME.DE',
          'PAH3.DE', 'SHL.DE', 'SY1.DE', 'QIA.DE', 'HNR1.DE', 'BNR.DE',
          'EVK.DE', 'SZG.DE', 'TEG.DE', 'HDD.DE', 'SRT.DE', 'WCH.DE',
          'BEI.DE', 'DHER.DE', 'PUM.DE'
        ];
      case 'NASDAQ100':
        return [
          'NVDA', 'MSFT', 'AAPL', 'AMZN', 'GOOG', 'GOOGL', 'META', 'AVGO', 'TSLA', 'NFLX',
          'COST', 'ASML', 'PLTR', 'TMUS', 'CSCO', 'AZN', 'LIN', 'INTU', 'AMD', 'ISRG'
        ];
      default:
        return SP500_SYMBOLS;
    }
  };

  const getIndexName = () => {
    switch (selectedIndex) {
      case 'DAX': return 'DAX 40';
      case 'NASDAQ100': return 'NASDAQ 100';
      default: return 'S&P 500';
    }
  };

  // Erweiterte Sektor-Zuordnung
  const getSectorMapping = (): Record<string, string> => {
    if (selectedIndex === 'DAX') {
      return {
        'SAP.DE': 'Technology', 'SIE.DE': 'Technology', 'IFX.DE': 'Technology',
        'BMW.DE': 'Automotive', 'DAI.DE': 'Automotive', 'VOW3.DE': 'Automotive', 'CON.DE': 'Automotive',
        'ALV.DE': 'Financials', 'DBK.DE': 'Financials', 'MUV2.DE': 'Financials',
        'BAS.DE': 'Chemicals', 'LIN.DE': 'Chemicals', 'WCH.DE': 'Chemicals',
        'FRE.DE': 'Health Care', 'MRK.DE': 'Health Care', 'BEI.DE': 'Health Care',
        'EON.DE': 'Utilities', 'RWE.DE': 'Utilities', 'EOAN.DE': 'Utilities',
        'DTE.DE': 'Telecommunications', 'VNA.DE': 'Telecommunications'
      };
    }
    
    return {
      'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology',
      'META': 'Technology', 'NVDA': 'Technology', 'AVGO': 'Technology', 'ADBE': 'Technology',
      'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary', 'HD': 'Consumer Discretionary',
      'UNH': 'Health Care', 'JNJ': 'Health Care', 'LLY': 'Health Care', 'ABBV': 'Health Care',
      'BRK-B': 'Financials', 'JPM': 'Financials', 'V': 'Financials', 'MA': 'Financials',
      'PG': 'Consumer Staples', 'KO': 'Consumer Staples', 'PEP': 'Consumer Staples',
      'CVX': 'Energy', 'XOM': 'Energy', 'COP': 'Energy'
    };
  };

  useEffect(() => {
    loadIndexData();
  }, [selectedIndex, showAll]);

  const loadIndexData = async () => {
    setLoading(true);
    try {
      const stocks = getIndexStocks(selectedIndex);
      
      // Chunking für große API-Anfragen
      const chunks = [];
      for (let i = 0; i < stocks.length; i += 100) {
        chunks.push(stocks.slice(i, i + 100));
      }
      
      let allQuotes: any[] = [];
      
      for (const chunk of chunks) {
        const symbols = chunk.join(',');
        
        try {
          const quotesResponse = await fetch(
            `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          );

          if (quotesResponse.ok) {
            const quotes = await quotesResponse.json();
            allQuotes = [...allQuotes, ...quotes];
          }
        } catch (error) {
          console.warn(`Error fetching chunk: ${symbols}`, error);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const sectorMapping = getSectorMapping();

      const processedData: StockData[] = allQuotes
        .filter((quote: any) => quote.marketCap && quote.marketCap > 0)
        .map((quote: any): StockData => ({
          symbol: quote.symbol || '',
          name: quote.name || quote.symbol || '',
          price: quote.price || 0,
          change: quote.change || 0,
          changesPercentage: quote.changesPercentage || 0,
          marketCap: quote.marketCap || 0,
          sector: sectorMapping[quote.symbol as string] || 'Technology'
        }))
        .filter((stock: StockData, index: number, self: StockData[]) => 
          index === self.findIndex((s: StockData) => s.symbol === stock.symbol)
        )
        .sort((a: StockData, b: StockData) => b.marketCap - a.marketCap);

      const finalData = showAll ? processedData : processedData.slice(0, 100);
      setStockData(finalData);

      // Sektor-Aggregation
      const sectorMap: Record<string, SectorData> = {};
      finalData.forEach((stock: StockData) => {
        const sector = stock.sector;
        if (!sectorMap[sector]) {
          sectorMap[sector] = {
            sector,
            avgChange: 0,
            totalMarketCap: 0,
            count: 0,
            stocks: []
          };
        }
        
        sectorMap[sector].avgChange += stock.changesPercentage;
        sectorMap[sector].totalMarketCap += stock.marketCap;
        sectorMap[sector].count += 1;
        sectorMap[sector].stocks.push(stock);
      });

      Object.values(sectorMap).forEach((sector: SectorData) => {
        sector.avgChange = sector.avgChange / sector.count;
      });

      setSectorData(Object.values(sectorMap).sort((a, b) => b.totalMarketCap - a.totalMarketCap));
      setLastUpdate(new Date());

    } catch (error) {
      console.error('[Heatmap] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-theme-muted">Lade {getIndexName()} Heatmap...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayData = selectedSector 
    ? sectorData.find((s: SectorData) => s.sector === selectedSector)?.stocks || []
    : stockData;

  const marketSummary = {
    up: stockData.filter((s: StockData) => s.changesPercentage > 0).length,
    down: stockData.filter((s: StockData) => s.changesPercentage < 0).length,
    avgChange: stockData.reduce((sum: number, s: StockData) => sum + s.changesPercentage, 0) / stockData.length
  };

  const getContainerDimensions = () => {
    const numStocks = displayData.length;
    
    let baseWidth, baseHeight;
    
    if (numStocks > 400) {
      baseWidth = 1600;
      baseHeight = 800;
    } else if (numStocks > 200) {
      baseWidth = 1400;
      baseHeight = 700;
    } else if (numStocks > 100) {
      baseWidth = 1200;
      baseHeight = 600;
    } else {
      baseWidth = 1000;
      baseHeight = 500;
    }
    
    const maxWidth = Math.min(1800, window?.innerWidth * 0.95 || 1400);
    const aspectRatio = baseWidth / baseHeight;
    
    const finalWidth = Math.min(baseWidth, maxWidth);
    const finalHeight = finalWidth / aspectRatio;
    
    return {
      width: finalWidth,
      height: Math.max(400, finalHeight)
    };
  };

  const { width: containerWidth, height: containerHeight } = getContainerDimensions();
  const treemapRects = createTreemap(displayData, containerWidth, containerHeight);

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ✅ REDESIGNED Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <MapIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-theme-primary">{getIndexName()} Heatmap</h1>
              <p className="text-theme-muted">Live Marktübersicht der größten {selectedIndex === 'DAX' ? 'deutschen' : 'US-'} Aktien</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Live Kurse</span>
          </div>
        </div>

        {/* ✅ REDESIGNED Controls */}
        <div className="bg-theme-secondary border border-theme rounded-xl p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3">
              {(['SP500', 'DAX', 'NASDAQ100'] as const).map((index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIndex(index)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedIndex === index
                      ? 'bg-blue-500 text-white'
                      : 'bg-theme-tertiary text-theme-primary hover:bg-theme-tertiary/70'
                  }`}
                >
                  {index === 'SP500' ? 'S&P 500' : index === 'DAX' ? 'DAX 40' : 'NASDAQ 100'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAll(!showAll)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showAll
                  ? 'bg-green-500 text-black'
                  : 'bg-theme-tertiary text-theme-primary hover:bg-theme-tertiary/70'
              }`}
            >
              {showAll ? `Alle ${selectedIndex === 'SP500' ? '500' : selectedIndex === 'DAX' ? '40' : '100'} anzeigen` : 'Top 100'}
            </button>
          </div>
        </div>

        {/* ✅ REDESIGNED Market Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-theme-secondary border border-theme rounded-xl p-4 hover:bg-theme-tertiary/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <ArrowUpIcon className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <span className="text-sm text-theme-muted">Steigend</span>
                <div className="text-xl font-bold text-green-400">{marketSummary.up}</div>
              </div>
            </div>
            <div className="text-xs text-theme-muted">Aktien im Plus</div>
          </div>

          <div className="bg-theme-secondary border border-theme rounded-xl p-4 hover:bg-theme-tertiary/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                <ArrowDownIcon className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <span className="text-sm text-theme-muted">Fallend</span>
                <div className="text-xl font-bold text-red-400">{marketSummary.down}</div>
              </div>
            </div>
            <div className="text-xs text-theme-muted">Aktien im Minus</div>
          </div>

          <div className="bg-theme-secondary border border-theme rounded-xl p-4 hover:bg-theme-tertiary/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <span className="text-sm text-theme-muted">Durchschnitt</span>
                <div className={`text-xl font-bold ${marketSummary.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {marketSummary.avgChange >= 0 ? '+' : ''}{marketSummary.avgChange.toFixed(2)}%
                </div>
              </div>
            </div>
            <div className="text-xs text-theme-muted">Performance</div>
          </div>

          <div className="bg-theme-secondary border border-theme rounded-xl p-4 hover:bg-theme-tertiary/50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={loadIndexData}
                className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center hover:bg-blue-500/30 transition-colors group"
              >
                <ArrowPathIcon className="w-4 h-4 text-blue-400 group-hover:rotate-180 transition-transform" />
              </button>
              <div>
                <span className="text-sm text-theme-muted">Aktualisiert</span>
                <div className="text-lg font-semibold text-theme-primary">
                  {lastUpdate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            <div className="text-xs text-theme-muted">Uhr</div>
          </div>
        </div>

        {/* ✅ REDESIGNED Sector Filter */}
        <div className="bg-theme-secondary border border-theme rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <FunnelIcon className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-theme-primary">Filter nach Sektor</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSector(null)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedSector === null 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-theme-tertiary text-theme-primary hover:bg-theme-tertiary/70'
              }`}
            >
              Alle Sektoren
            </button>
            {sectorData.map((sector: SectorData) => (
              <button
                key={sector.sector}
                onClick={() => setSelectedSector(sector.sector)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedSector === sector.sector 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-theme-tertiary text-theme-primary hover:bg-theme-tertiary/70'
                }`}
              >
                {getSectorDisplayName(sector.sector)} ({sector.count})
              </button>
            ))}
          </div>
        </div>

        {/* ✅ REDESIGNED Treemap */}
        <div className="bg-theme-secondary border border-theme rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-theme-primary">
              {selectedSector ? `${getSectorDisplayName(selectedSector)} Sektor` : `${getIndexName()} Heatmap`}
              <span className="text-sm text-theme-muted ml-2">({displayData.length} Aktien)</span>
            </h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-theme-muted">Gewinner</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-theme-muted">Verlierer</span>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="flex justify-center">
              <div className="space-y-4">
                {/* Treemap Container */}
                <div 
                  className="relative bg-theme-tertiary/50 rounded-lg border border-theme"
                  style={{ 
                    width: `${containerWidth}px`, 
                    height: `${containerHeight}px`,
                    minWidth: '600px',
                    maxWidth: '100%'
                  }}
                >
                {treemapRects.map((rect, index) => {
                  const stock = rect.stock;
                  
                  const getFontSize = (width: number, height: number) => {
                    const area = width * height;
                    const minDimension = Math.min(width, height);
                    
                    if (minDimension < 20) return '7px';
                    if (area > 10000) return '16px';
                    if (area > 6000) return '14px';
                    if (area > 3000) return '12px';
                    if (area > 1500) return '11px';
                    if (area > 800) return '10px';
                    if (area > 400) return '9px';
                    return '8px';
                  };

                  const fontSize = getFontSize(rect.width, rect.height);
                  const minDimension = Math.min(rect.width, rect.height);
                  
                  const showSymbol = minDimension >= 25;
                  const showPercentage = minDimension >= 35 && rect.width >= 40;
                  const showMarketCap = minDimension >= 50 && rect.width >= 70 && rect.height >= 45;
                  const showPrice = minDimension >= 60 && rect.width >= 80 && rect.height >= 60;

                  return (
                    <div
                      key={`${stock.symbol}-${index}`}
                      className={`
                        absolute cursor-pointer transition-all duration-200
                        ${getColor(stock.changesPercentage)}
                        border border-gray-600 hover:border-white hover:border-2
                        flex flex-col items-center justify-center
                        group hover:shadow-2xl hover:z-10
                        text-white
                      `}
                      style={{
                        left: `${Math.max(0, rect.x)}px`,
                        top: `${Math.max(0, rect.y)}px`,
                        width: `${Math.max(10, rect.width)}px`,
                        height: `${Math.max(10, rect.height)}px`,
                        fontSize
                      }}
                      onClick={() => router.push(`/analyse/stocks/${stock.symbol.toLowerCase()}`)}
                    >
                      {showSymbol && (
                        <div 
                          className="font-bold text-center leading-tight drop-shadow-lg px-1 truncate w-full"
                          style={{ 
                            fontSize: fontSize,
                            lineHeight: rect.height > 40 ? '1.2' : '1'
                          }}
                        >
                          {stock.symbol}
                        </div>
                      )}
                      
                      {showPercentage && (
                        <div 
                          className="font-bold mt-1 drop-shadow-lg text-center"
                          style={{ 
                            fontSize: `${parseInt(fontSize) - 1}px`,
                            lineHeight: '1'
                          }}
                        >
                          {stock.changesPercentage >= 0 ? '+' : ''}{stock.changesPercentage.toFixed(1)}%
                        </div>
                      )}
                      
                      {showMarketCap && (
                        <div 
                          className="text-gray-200 mt-1 drop-shadow-lg text-center"
                          style={{ 
                            fontSize: `${parseInt(fontSize) - 2}px`,
                            lineHeight: '1'
                          }}
                        >
                          ${(stock.marketCap / 1e9).toFixed(0)}B
                        </div>
                      )}
                      
                      {showPrice && (
                        <div 
                          className="text-gray-300 mt-1 drop-shadow-lg text-center"
                          style={{ 
                            fontSize: `${parseInt(fontSize) - 3}px`,
                            lineHeight: '1'
                          }}
                        >
                          ${stock.price.toFixed(2)}
                        </div>
                      )}
                      
                      {/* Enhanced Tooltip */}
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full bg-theme-secondary text-theme-primary text-xs p-3 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 border border-theme pointer-events-none">
                        <div className="font-bold text-sm">{stock.symbol} - {stock.name}</div>
                        <div className="text-yellow-400 mt-1">${(stock.marketCap / 1e9).toFixed(1)}B Market Cap</div>
                        <div className="text-blue-400">{getSectorDisplayName(stock.sector)}</div>
                        <div className="text-theme-muted">Preis: ${stock.price.toFixed(2)}</div>
                        <div className={`font-bold mt-1 ${stock.changesPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stock.changesPercentage >= 0 ? '+' : ''}{stock.changesPercentage.toFixed(2)}% heute
                          {stock.change !== 0 && (
                            <span className="block text-xs">
                              ({stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {treemapRects.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-theme-tertiary/50 rounded-lg">
                    <div className="text-theme-muted text-lg">Keine Daten verfügbar</div>
                  </div>
                )}
                </div>
                
                {/* Color Scale */}
                <div className="flex justify-center">
                  <div className="flex items-center space-x-1 bg-theme-tertiary/50 rounded-lg p-3 border border-theme">
                    {[
                      { value: -3, color: 'bg-red-800', label: '-3%' },
                      { value: -2, color: 'bg-red-700', label: '-2%' },
                      { value: -1, color: 'bg-red-600', label: '-1%' },
                      { value: 0, color: 'bg-gray-600', label: '0%' },
                      { value: 1, color: 'bg-green-600', label: '+1%' },
                      { value: 2, color: 'bg-green-700', label: '+2%' },
                      { value: 3, color: 'bg-green-800', label: '+3%' }
                    ].map((item, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className={`w-8 h-4 ${item.color} border border-gray-500`}></div>
                        <span className="text-theme-muted text-xs mt-1 font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ REDESIGNED Sector Performance Table */}
        {!selectedSector && sectorData.length > 0 && (
          <div className="bg-theme-secondary border border-theme rounded-xl p-6">
            <h3 className="text-xl font-semibold text-theme-primary mb-4">Sektor Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme">
                    <th className="text-left py-3 text-theme-muted font-medium">Sektor</th>
                    <th className="text-right py-3 text-theme-muted font-medium">Anzahl</th>
                    <th className="text-right py-3 text-theme-muted font-medium">Ø Performance</th>
                    <th className="text-right py-3 text-theme-muted font-medium">Market Cap</th>
                    <th className="text-right py-3 text-theme-muted font-medium">Anteil</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorData
                    .sort((a, b) => b.avgChange - a.avgChange)
                    .map((sector: SectorData) => {
                      const totalMarketCap = stockData.reduce((sum, s) => sum + s.marketCap, 0);
                      const sectorPercentage = (sector.totalMarketCap / totalMarketCap) * 100;
                      
                      return (
                        <tr 
                          key={sector.sector} 
                          className="border-b border-theme/50 hover:bg-theme-tertiary/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedSector(sector.sector)}
                        >
                          <td className="py-3 text-theme-primary font-medium">{getSectorDisplayName(sector.sector)}</td>
                          <td className="py-3 text-right text-theme-muted">{sector.count}</td>
                          <td className={`py-3 text-right font-medium ${
                            sector.avgChange >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {sector.avgChange >= 0 ? '+' : ''}{sector.avgChange.toFixed(2)}%
                          </td>
                          <td className="py-3 text-right text-theme-muted">
                            ${(sector.totalMarketCap / 1e12).toFixed(1)}T
                          </td>
                          <td className="py-3 text-right text-theme-muted">
                            {sectorPercentage.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}