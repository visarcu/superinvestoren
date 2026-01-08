// src/app/heatmap/page.tsx - MODERN TREEMAP OPTIMIZED
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChartBarIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ArrowPathIcon,
  FunnelIcon,
  MapIcon,
  ArrowLeftIcon
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

// VOLLSTÄNDIGE S&P 500 LISTE - nach Market Cap sortiert (alphabetisch aus dem bereitgestellten Bild)
const SP500_STOCKS = [
  // Alphabetische S&P 500 Liste - Komplett (500 Aktien)
  'A', 'AAL', 'AAPL', 'ABBV', 'ABNB', 'ABT', 'ACGL', 'ACN', 'ADBE', 'ADI',
  'ADM', 'ADP', 'ADSK', 'AEE', 'AEP', 'AES', 'AFL', 'AIG', 'AIZ', 'AJG',
  'AKAM', 'ALB', 'ALGN', 'ALL', 'ALLE', 'AMAT', 'AMCR', 'AMD', 'AME', 'AMGN',
  'AMP', 'AMT', 'AMZN', 'ANET', 'ANSS', 'AON', 'AOS', 'APA', 'APD', 'APH',
  'APTV', 'ARE', 'ATO', 'ATVI', 'AVB', 'AVGO', 'AVY', 'AWK', 'AXON', 'AXP',
  'AZO', 'BA', 'BAC', 'BALL', 'BAX', 'BBWI', 'BBY', 'BDX', 'BEN', 'BF-B',
  'BIIB', 'BIO', 'BK', 'BKNG', 'BKR', 'BLDR', 'BLK', 'BMY', 'BR', 'BRK-B',
  'BRO', 'BSX', 'BWA', 'BX', 'BXP', 'C', 'CAG', 'CAH', 'CARR', 'CAT',
  'CB', 'CBOE', 'CBRE', 'CCI', 'CCL', 'CDAY', 'CDNS', 'CDW', 'CE', 'CEG',
  'CF', 'CFG', 'CHD', 'CHRW', 'CHTR', 'CI', 'CINF', 'CL', 'CLX', 'CMA',
  'CMCSA', 'CME', 'CMG', 'CMI', 'CMS', 'CNC', 'CNP', 'COF', 'COO', 'COP',
  'COR', 'COST', 'COTY', 'CPB', 'CPRT', 'CPT', 'CRL', 'CRM', 'CSCO', 'CSGP',
  'CSX', 'CTAS', 'CTLT', 'CTRA', 'CTSH', 'CTVA', 'CVS', 'CVX', 'CZR', 'D',
  'DAL', 'DAY', 'DD', 'DE', 'DFS', 'DG', 'DGX', 'DHI', 'DHR', 'DIS',
  'DLR', 'DLTR', 'DOV', 'DOW', 'DPZ', 'DRI', 'DTE', 'DUK', 'DVA', 'DVN',
  'DXCM', 'EA', 'EBAY', 'ECL', 'ED', 'EFX', 'EG', 'EIX', 'EL', 'ELV',
  'EMN', 'EMR', 'ENPH', 'EOG', 'EPAM', 'EQIX', 'EQR', 'EQT', 'ES', 'ESS',
  'ETN', 'ETR', 'ETSY', 'EVRG', 'EW', 'EXC', 'EXPD', 'EXPE', 'EXR', 'F',
  'FANG', 'FAST', 'FCX', 'FDS', 'FDX', 'FE', 'FFIV', 'FIS', 'FISV', 'FITB',
  'FMC', 'FOX', 'FOXA', 'FRT', 'FSLR', 'FTNT', 'FTV', 'FUBO', 'GD', 'GE',
  'GEHC', 'GEN', 'GFS', 'GILD', 'GIS', 'GL', 'GLW', 'GM', 'GNRC', 'GOOG',
  'GOOGL', 'GPC', 'GPN', 'GRMN', 'GS', 'GWW', 'HAL', 'HAS', 'HBAN', 'HCA',
  'HD', 'HES', 'HIG', 'HII', 'HLT', 'HOLX', 'HON', 'HPE', 'HPQ', 'HRL',
  'HSIC', 'HST', 'HSY', 'HUBB', 'HUM', 'HWM', 'IBM', 'ICE', 'IDXX', 'IEX',
  'IFF', 'INCY', 'INTC', 'INTU', 'INVH', 'IP', 'IPG', 'IQV', 'IR', 'IRM',
  'ISRG', 'IT', 'ITW', 'IVZ', 'J', 'JBHT', 'JCI', 'JKHY', 'JNJ', 'JNPR',
  'JPM', 'K', 'KDP', 'KEX', 'KEY', 'KEYS', 'KHC', 'KIM', 'KLAC', 'KMB',
  'KMI', 'KMX', 'KO', 'KR', 'KVUE', 'L', 'LDOS', 'LEG', 'LEN', 'LH',
  'LHX', 'LIN', 'LKQ', 'LLY', 'LMT', 'LNC', 'LNT', 'LOW', 'LRCX', 'LULU',
  'LUV', 'LVS', 'LW', 'LYB', 'LYV', 'MA', 'MAA', 'MAR', 'MAS', 'MCD',
  'MCHP', 'MCK', 'MCO', 'MDLZ', 'MDT', 'MET', 'META', 'MGM', 'MHK', 'MKC',
  'MKTX', 'MLM', 'MMC', 'MMM', 'MNST', 'MO', 'MOH', 'MOS', 'MPC', 'MPWR',
  'MRK', 'MRNA', 'MRO', 'MS', 'MSCI', 'MSFT', 'MSI', 'MTB', 'MTCH', 'MTD',
  'MU', 'NCLH', 'NDAQ', 'NDSN', 'NEE', 'NEM', 'NFLX', 'NI', 'NKE', 'NOC',
  'NOW', 'NRG', 'NSC', 'NTAP', 'NTRS', 'NUE', 'NVDA', 'NVR', 'NWS', 'NWSA',
  'NXPI', 'O', 'ODFL', 'OKE', 'OMC', 'ON', 'ORCL', 'ORLY', 'OTIS', 'OXY',
  'PANW', 'PARA', 'PAYC', 'PAYX', 'PCAR', 'PCG', 'PEAK', 'PEG', 'PEP', 'PFE',
  'PFG', 'PG', 'PGR', 'PH', 'PHM', 'PKG', 'PLD', 'PM', 'PNC', 'PNR',
  'PNW', 'POOL', 'PPG', 'PPL', 'PRU', 'PSA', 'PSX', 'PTC', 'PWR', 'PXD',
  'PYPL', 'QCOM', 'QRVO', 'RCL', 'RE', 'REG', 'REGN', 'RF', 'RHI', 'RJF',
  'RL', 'RMD', 'ROK', 'ROL', 'ROP', 'ROST', 'RSG', 'RTX', 'RVTY', 'SBAC',
  'SBUX', 'SCHW', 'SHW', 'SJM', 'SLB', 'SNA', 'SNPS', 'SO', 'SOLV', 'SPG',
  'SPGI', 'SRE', 'STE', 'STLD', 'STT', 'STX', 'STZ', 'SWK', 'SWKS', 'SYF',
  'SYK', 'SYY', 'T', 'TAP', 'TDG', 'TDY', 'TECH', 'TEL', 'TER', 'TFC',
  'TFX', 'TGT', 'TJX', 'TMO', 'TMUS', 'TPG', 'TPR', 'TRGP', 'TRMB', 'TROW',
  'TRV', 'TSCO', 'TSLA', 'TSN', 'TT', 'TTWO', 'TXN', 'TXT', 'TYL', 'UAL',
  'UDR', 'UHS', 'ULTA', 'UNH', 'UNP', 'UPS', 'URI', 'USB', 'V', 'VICI',
  'VLO', 'VLTO', 'VMC', 'VRSK', 'VRSN', 'VRTX', 'VST', 'VTR', 'VTRS', 'VZ',
  'WAB', 'WAT', 'WBA', 'WBD', 'WDC', 'WEC', 'WELL', 'WFC', 'WHR', 'WM',
  'WMB', 'WMT', 'WRB', 'WRK', 'WST', 'WTW', 'WY', 'WYNN', 'XEL', 'XOM',
  'XRAY', 'XYL', 'YUM', 'ZBH', 'ZBRA', 'ZION', 'ZTS'
];

export default function HeatmapPage() {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [stockCount, setStockCount] = useState<100 | 200 | 500>(200); // Sweet Spot Default
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
    if (change > 3) return 'bg-emerald-600'; 
    if (change > 1.5) return 'bg-emerald-500'; 
    if (change > 0.5) return 'bg-brand';
    if (change > 0) return 'bg-green-400/80';
    if (change > -0.5) return 'bg-gray-500';
    if (change > -1.5) return 'bg-red-400/80';
    if (change > -3) return 'bg-red-500';
    return 'bg-red-600';
  };

  // Deutsche Formatierung
  const formatMarketCap = (marketCap: number): string => {
    if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(1).replace('.', ',')} Bio.`;
    if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(1).replace('.', ',')} Mrd.`;
    if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(0)} Mio.`;
    return `${marketCap.toLocaleString('de-DE')}`;
  };

  const formatPrice = (price: number): string => {
    return `${price.toFixed(2).replace('.', ',')} $`;
  };

  // Moderne Sektor-Zuordnung vereinfacht
  const getSectorFromSymbol = (symbol: string): string => {
    const sectorMap: Record<string, string> = {
      'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'NVDA': 'Technology',
      'META': 'Technology', 'AVGO': 'Technology', 'ADBE': 'Technology', 'CRM': 'Technology',
      'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary', 'HD': 'Consumer Discretionary',
      'UNH': 'Health Care', 'JNJ': 'Health Care', 'LLY': 'Health Care', 'ABBV': 'Health Care',
      'BRK-B': 'Financials', 'JPM': 'Financials', 'V': 'Financials', 'MA': 'Financials',
      'PG': 'Consumer Staples', 'KO': 'Consumer Staples', 'PEP': 'Consumer Staples', 'WMT': 'Consumer Staples',
      'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'EOG': 'Energy'
    };
    return sectorMap[symbol] || 'Technology';
  };

  useEffect(() => {
    loadHeatmapData();
  }, [stockCount]);

  // Intelligente Aktienauswahl
  const getStocksToLoad = () => {
    return SP500_STOCKS.slice(0, stockCount);
  };

  const loadHeatmapData = async () => {
    setLoading(true);
    try {
      // Intelligente Aktienauswahl basierend auf User-Preference
      const stocksToLoad = getStocksToLoad();
      
      // Nutze internen API endpoint für bessere Performance
      const res = await fetch(`/api/quotes?symbols=${stocksToLoad.join(',')}`);
      
      if (res.ok) {
        const quotes = await res.json();
        
        const processedData: StockData[] = quotes
          .filter((quote: any) => quote.marketCap && quote.marketCap > 0)
          .map((quote: any): StockData => ({
            symbol: quote.symbol || '',
            name: quote.name || quote.symbol || '',
            price: quote.price || 0,
            change: quote.change || 0,
            changesPercentage: quote.changesPercentage || 0,
            marketCap: quote.marketCap || 0,
            sector: getSectorFromSymbol(quote.symbol)
          }))
          .sort((a: StockData, b: StockData) => b.marketCap - a.marketCap);

        setStockData(processedData);

        // Sektor-Aggregation
        const sectorMap: Record<string, SectorData> = {};
        processedData.forEach((stock: StockData) => {
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
      }
    } catch (error) {
      console.error('[Heatmap] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-theme-secondary">Lade Market Heatmap...</p>
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

  // Optimierter Squarified Treemap für bessere Rechteck-Proportionen
  const createSquarifiedTreemap = (stocks: StockData[]) => {
    if (stocks.length === 0) return [];
    
    const totalMarketCap = stocks.reduce((sum, stock) => sum + stock.marketCap, 0);
    const sortedStocks = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
    
    // Feste Container-Dimensionen wie bei Finviz
    const containerWidth = 1200;
    const containerHeight = 600;
    const totalArea = containerWidth * containerHeight;
    
    const rectangles: any[] = [];
    
    // Berechne normalisierte Größen
    const normalizedStocks = sortedStocks.map(stock => ({
      ...stock,
      area: (stock.marketCap / totalMarketCap) * totalArea
    }));
    
    const squarify = (items: any[], x: number, y: number, w: number, h: number) => {
      if (items.length === 0) return;
      
      if (items.length === 1) {
        rectangles.push({
          ...items[0],
          x: x + 1,
          y: y + 1, 
          width: w - 2,
          height: h - 2
        });
        return;
      }
      
      // Verbesserte Aufteilung für bessere Rechteck-Proportionen
      if (items.length <= 4) {
        // Kleine Gruppen: 2x2 Grid oder horizontale/vertikale Aufteilung
        if (items.length === 2) {
          if (w > h) {
            // Horizontale Aufteilung
            const totalItemArea = items.reduce((sum, item) => sum + item.area, 0);
            const ratio1 = items[0].area / totalItemArea;
            const w1 = w * ratio1;
            squarify([items[0]], x, y, w1, h);
            squarify([items[1]], x + w1, y, w - w1, h);
          } else {
            // Vertikale Aufteilung
            const totalItemArea = items.reduce((sum, item) => sum + item.area, 0);
            const ratio1 = items[0].area / totalItemArea;
            const h1 = h * ratio1;
            squarify([items[0]], x, y, w, h1);
            squarify([items[1]], x, y + h1, w, h - h1);
          }
        } else {
          // 3-4 Items: bessere Gruppierung
          const mid = Math.ceil(items.length / 2);
          const group1 = items.slice(0, mid);
          const group2 = items.slice(mid);
          
          const area1 = group1.reduce((sum, item) => sum + item.area, 0);
          const area2 = group2.reduce((sum, item) => sum + item.area, 0);
          const totalItemArea = area1 + area2;
          
          if (w > h) {
            const w1 = w * (area1 / totalItemArea);
            squarify(group1, x, y, w1, h);
            squarify(group2, x + w1, y, w - w1, h);
          } else {
            const h1 = h * (area1 / totalItemArea);
            squarify(group1, x, y, w, h1);
            squarify(group2, x, y + h1, w, h - h1);
          }
        }
        return;
      }
      
      // Große Gruppen: Optimierte Aufteilung
      let bestSplit = Math.floor(items.length / 2);
      let bestRatio = Infinity;
      
      // Finde beste Aufteilung für quadratischste Formen
      for (let i = Math.floor(items.length * 0.3); i <= Math.floor(items.length * 0.7); i++) {
        const group1 = items.slice(0, i);
        const group2 = items.slice(i);
        
        const area1 = group1.reduce((sum, item) => sum + item.area, 0);
        const area2 = group2.reduce((sum, item) => sum + item.area, 0);
        const totalItemArea = area1 + area2;
        
        if (w > h) {
          const w1 = w * (area1 / totalItemArea);
          const w2 = w - w1;
          const ratio = Math.max(w1/h, h/w1) + Math.max(w2/h, h/w2);
          if (ratio < bestRatio) {
            bestRatio = ratio;
            bestSplit = i;
          }
        } else {
          const h1 = h * (area1 / totalItemArea);
          const h2 = h - h1;
          const ratio = Math.max(w/h1, h1/w) + Math.max(w/h2, h2/w);
          if (ratio < bestRatio) {
            bestRatio = ratio;
            bestSplit = i;
          }
        }
      }
      
      const group1 = items.slice(0, bestSplit);
      const group2 = items.slice(bestSplit);
      
      const area1 = group1.reduce((sum, item) => sum + item.area, 0);
      const area2 = group2.reduce((sum, item) => sum + item.area, 0);
      const totalItemArea = area1 + area2;
      
      if (w > h) {
        const w1 = w * (area1 / totalItemArea);
        squarify(group1, x, y, w1, h);
        squarify(group2, x + w1, y, w - w1, h);
      } else {
        const h1 = h * (area1 / totalItemArea);
        squarify(group1, x, y, w, h1);
        squarify(group2, x, y + h1, w, h - h1);
      }
    };

    squarify(normalizedStocks, 0, 0, containerWidth, containerHeight);
    return rectangles;
  };

  const treemapRects = createSquarifiedTreemap(displayData);

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* Professional Header */}
        <div className="border-b border-theme/5">
          <div className="pb-8">
            <Link
              href="/analyse"
              className="inline-flex items-center gap-2 text-theme-secondary hover:text-brand-light transition-colors duration-200 mb-6 group"
            >
              <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Zurück zur Analyse
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <MapIcon className="w-6 h-6 text-brand-light" />
                  <h1 className="text-3xl font-bold text-theme-primary">Market Heatmap</h1>
                </div>
                <div className="flex items-center gap-4 text-theme-secondary">
                  <span className="text-sm">Top {stockCount} US-Aktien</span>
                  <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                  <span className="text-sm">
                    {stockCount === 100 && '~70% Market Cap'}
                    {stockCount === 200 && '~85% Market Cap'}  
                    {stockCount === 500 && '~95% Market Cap'}
                  </span>
                  <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                  <span className="text-sm">Live-Kurse</span>
                </div>
              </div>
              
              <button
                onClick={loadHeatmapData}
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-green-700 text-white rounded-lg transition-colors duration-200"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span className="font-medium">Aktualisieren</span>
              </button>
            </div>
          </div>
        </div>

        {/* Intelligent Controls */}
        <div className="bg-theme-card rounded-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            
            {/* Stock Count Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-brand-light" />
                <span className="text-theme-primary font-medium">Aktienanzahl:</span>
              </div>
              
              <div className="flex bg-theme-secondary/20 rounded-lg p-1">
                {[100, 200, SP500_STOCKS.length].map((count) => (
                  <button
                    key={count}
                    onClick={() => setStockCount(count as 100 | 200 | 500)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      stockCount === count 
                        ? 'bg-brand text-white shadow-sm' 
                        : 'text-theme-muted hover:text-theme-primary'
                    }`}
                  >
                    Top {count}
                    <span className="block text-xs opacity-75">
                      {count === 100 && '~70%'}
                      {count === 200 && '~85%'}
                      {count === SP500_STOCKS.length && '~95%'}
                    </span>
                  </button>
                ))}
              </div>
              
              {stockCount === 500 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-sm">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                  <span>Kann Ladezeit beeinflussen</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Market Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <ArrowUpIcon className="w-5 h-5 text-brand-light" />
              <span className="text-theme-muted text-sm">Steigend</span>
            </div>
            <div className="text-2xl font-bold text-brand-light">{marketSummary.up}</div>
            <div className="text-theme-muted text-xs">Aktien im Plus</div>
          </div>

          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <ArrowDownIcon className="w-5 h-5 text-red-400" />
              <span className="text-theme-muted text-sm">Fallend</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{marketSummary.down}</div>
            <div className="text-theme-muted text-xs">Aktien im Minus</div>
          </div>

          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <ChartBarIcon className="w-5 h-5 text-blue-400" />
              <span className="text-theme-muted text-sm">Durchschnitt</span>
            </div>
            <div className={`text-2xl font-bold ${marketSummary.avgChange >= 0 ? 'text-brand-light' : 'text-red-400'}`}>
              {marketSummary.avgChange >= 0 ? '+' : ''}{marketSummary.avgChange.toFixed(2)}%
            </div>
            <div className="text-theme-muted text-xs">Market Performance</div>
          </div>

          <div className="bg-theme-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-theme-muted text-sm">Aktualisiert</span>
            </div>
            <div className="text-lg font-semibold text-theme-primary">
              {lastUpdate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-theme-muted text-xs">Live Data</div>
          </div>
        </div>

        {/* Sector Filter */}
        <div className="bg-theme-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FunnelIcon className="w-5 h-5 text-brand-light" />
            <h3 className="text-lg font-semibold text-theme-primary">Filter nach Sektor</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSector(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSector === null 
                  ? 'bg-brand text-white' 
                  : 'bg-theme-secondary/20 text-theme-secondary hover:bg-theme-secondary/30 hover:text-theme-primary'
              }`}
            >
              Alle Sektoren
            </button>
            {sectorData.map((sector: SectorData) => (
              <button
                key={sector.sector}
                onClick={() => setSelectedSector(sector.sector)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSector === sector.sector 
                    ? 'bg-brand text-white' 
                    : 'bg-theme-secondary/20 text-theme-secondary hover:bg-theme-secondary/30 hover:text-theme-primary'
                }`}
              >
                {getSectorDisplayName(sector.sector)} ({sector.count})
              </button>
            ))}
          </div>
        </div>

        {/* Modern CSS Grid Heatmap */}
        <div className="bg-theme-card rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-theme-primary">
              {selectedSector ? `${getSectorDisplayName(selectedSector)} Sektor` : 'Market Heatmap'}
              <span className="text-sm text-theme-muted ml-2">({displayData.length} Aktien)</span>
            </h3>
            
            {/* Color Legend */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className="text-theme-muted">+3%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <span className="text-theme-muted">0%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-theme-muted">-3%</span>
              </div>
            </div>
          </div>

          {/* FINVIZ-STYLE TREEMAP - Nur Treemap, kein Grid */}
          <div className="w-full overflow-x-auto">
            <div className="flex justify-center">
              <div 
                className="relative bg-gray-900 rounded-lg overflow-hidden"
                style={{ 
                  width: '1200px',
                  height: '600px',
                  minWidth: '1000px'
                }}
              >
              {treemapRects.length > 0 ? (
                <div className="relative w-full h-full">
                  {treemapRects.map((rect) => {
                    const area = rect.width * rect.height;
                    const fontSize = Math.max(8, Math.min(14, Math.sqrt(area) / 8));
                    const showPercentage = area > 800;
                    const showPrice = area > 1500;
                    
                    return (
                      <div
                        key={rect.symbol}
                        className={`
                          absolute cursor-pointer transition-all duration-150
                          ${getColor(rect.changesPercentage)}
                          border border-gray-800/50 hover:border-white/50
                          flex flex-col justify-center items-center
                          text-white font-medium
                          group hover:z-10 hover:shadow-xl
                        `}
                        style={{
                          left: `${rect.x}px`,
                          top: `${rect.y}px`,
                          width: `${rect.width}px`,
                          height: `${rect.height}px`,
                          fontSize: `${fontSize}px`
                        }}
                        onClick={() => router.push(`/analyse/stocks/${rect.symbol.toLowerCase()}`)}
                      >
                        <div className="font-bold leading-tight text-center px-1 truncate w-full">
                          {rect.symbol}
                        </div>
                        
                        {showPercentage && (
                          <div className="text-xs font-bold text-center mt-1">
                            {rect.changesPercentage >= 0 ? '+' : ''}{rect.changesPercentage.toFixed(1)}%
                          </div>
                        )}
                        
                        {showPrice && (
                          <div className="text-xs opacity-90 text-center">
                            {formatPrice(rect.price)}
                          </div>
                        )}

                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-full bg-gray-800 text-white text-xs p-3 rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 border border-gray-600 pointer-events-none">
                          <div className="font-bold">{rect.symbol} - {rect.name}</div>
                          <div className="text-yellow-400 mt-1">MCap: {formatMarketCap(rect.marketCap)}</div>
                          <div className="text-blue-300">Sektor: {getSectorDisplayName(rect.sector)}</div>
                          <div className="text-gray-300">Kurs: {formatPrice(rect.price)}</div>
                          <div className={`font-bold mt-1 ${rect.changesPercentage >= 0 ? 'text-brand-light' : 'text-red-400'}`}>
                            {rect.changesPercentage >= 0 ? '+' : ''}{rect.changesPercentage.toFixed(2)}% heute
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <MapIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <div className="text-lg">Keine Daten verfügbar</div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Sector Performance Table */}
        {!selectedSector && sectorData.length > 0 && (
          <div className="bg-theme-card rounded-xl p-6">
            <h3 className="text-xl font-semibold text-theme-primary mb-6">Sektor Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-theme-secondary/20">
                  <tr>
                    <th className="text-left px-4 py-3 text-theme-primary font-semibold">Sektor</th>
                    <th className="text-right px-4 py-3 text-theme-primary font-semibold">Anzahl</th>
                    <th className="text-right px-4 py-3 text-theme-primary font-semibold">Ø Performance</th>
                    <th className="text-right px-4 py-3 text-theme-primary font-semibold">Marktkapitalisierung</th>
                    <th className="text-right px-4 py-3 text-theme-primary font-semibold">Anteil</th>
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
                          className="border-t border-theme/5 hover:bg-theme-secondary/10 cursor-pointer transition-colors"
                          onClick={() => setSelectedSector(sector.sector)}
                        >
                          <td className="px-4 py-3 text-theme-primary font-medium">
                            {getSectorDisplayName(sector.sector)}
                          </td>
                          <td className="px-4 py-3 text-right text-theme-secondary">{sector.count}</td>
                          <td className={`px-4 py-3 text-right font-bold ${
                            sector.avgChange >= 0 ? 'text-brand-light' : 'text-red-400'
                          }`}>
                            {sector.avgChange >= 0 ? '+' : ''}{sector.avgChange.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-right text-theme-secondary">
                            {formatMarketCap(sector.totalMarketCap)}
                          </td>
                          <td className="px-4 py-3 text-right text-theme-secondary">
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