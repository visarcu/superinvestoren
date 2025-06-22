// src/app/heatmap/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ChartBarIcon, ArrowUpIcon, ArrowDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

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
  'ADM', 'ANET', 'AJG', 'AIZ', 'ATO', 'ADSK', 'ADP', 'AZO', 'AVB', 'AVY',
  'BKR', 'BLL', 'BAC', 'BK', 'BAX', 'BDX', 'BRK-B', 'BBY', 'BIIB', 'BLK',
  'BA', 'BKNG', 'BWA', 'BXP', 'BSX', 'BMY', 'AVGO', 'BR', 'BF-B', 'CHRW',
  'COG', 'CDNS', 'CPB', 'COF', 'CPRI', 'CAH', 'KMX', 'CCL', 'CAT', 'CBOE',
  'CBRE', 'CDW', 'CE', 'CNC', 'CNP', 'CTL', 'CERN', 'CF', 'SCHW', 'CHTR',
  'CVX', 'CMG', 'CHD', 'CI', 'XEC', 'CINF', 'CTAS', 'CSCO', 'C', 'CFG',
  'CTXS', 'CLX', 'CME', 'CMS', 'KO', 'CTSH', 'CL', 'CMCSA', 'CMA', 'CAG',
  'CXO', 'COP', 'ED', 'STZ', 'COO', 'CPRT', 'GLW', 'CTVA', 'COST', 'COTY',
  'CCI', 'CSX', 'CMI', 'CVS', 'DHI', 'DHR', 'DRI', 'DVA', 'DE', 'DAL',
  'XRAY', 'DVN', 'DXCM', 'FANG', 'DLR', 'DFS', 'DISCA', 'DISCK', 'DISH', 'DG',
  'DLTR', 'D', 'DOV', 'DOW', 'DTE', 'DUK', 'DRE', 'DD', 'DXC', 'ETFC',
  'EMN', 'ETN', 'EBAY', 'ECL', 'EIX', 'EW', 'EA', 'EMR', 'ETR', 'EOG',
  'EFX', 'EQIX', 'EQR', 'ESS', 'EL', 'EVRG', 'ES', 'RE', 'EXC', 'EXPE',
  'EXPD', 'EXR', 'XOM', 'FFIV', 'FB', 'FAST', 'FRT', 'FDX', 'FIS', 'FITB',
  'FE', 'FRC', 'FISV', 'FLT', 'FLIR', 'FLS', 'FMC', 'F', 'FTNT', 'FTV',
  'FBHS', 'FOXA', 'FOX', 'BEN', 'FCX', 'GPS', 'GRMN', 'IT', 'GD', 'GE',
  'GIS', 'GM', 'GPC', 'GILD', 'GL', 'GPN', 'GS', 'GWW', 'HRB', 'HAL',
  'HBI', 'HOG', 'HIG', 'HAS', 'HCA', 'PEAK', 'HP', 'HSIC', 'HSY', 'HES',
  'HPE', 'HLT', 'HFC', 'HOLX', 'HD', 'HON', 'HRL', 'HST', 'HPQ', 'HUM',
  'HBAN', 'HII', 'IEX', 'IDXX', 'INFO', 'ITW', 'ILMN', 'IR', 'INTC', 'ICE',
  'IBM', 'INCY', 'IP', 'IPG', 'IFF', 'INTU', 'ISRG', 'IVZ', 'IPGP', 'IQV',
  'IRM', 'JKHY', 'J', 'JBHT', 'SJM', 'JNJ', 'JCI', 'JPM', 'JNPR', 'KSU',
  'K', 'KEY', 'KEYS', 'KMB', 'KIM', 'KMI', 'KLAC', 'KSS', 'KHC', 'KR',
  'LB', 'LHX', 'LH', 'LRCX', 'LW', 'LVS', 'LEG', 'LDOS', 'LEN', 'LLY',
  'LNC', 'LIN', 'LYV', 'LKQ', 'LMT', 'L', 'LOW', 'LYB', 'MTB', 'M',
  'MRO', 'MPC', 'MKTX', 'MAR', 'MMC', 'MLM', 'MAS', 'MA', 'MKC', 'MXIM',
  'MCD', 'MCK', 'MDT', 'MRK', 'MET', 'MTD', 'MGM', 'MCHP', 'MU', 'MSFT',
  'MAA', 'MHK', 'TAP', 'MDLZ', 'MNST', 'MCO', 'MS', 'MOS', 'MSI', 'MSCI',
  'MYL', 'NDAQ', 'NOV', 'NKTR', 'NTAP', 'NFLX', 'NWL', 'NEM', 'NWSA', 'NWS',
  'NEE', 'NLSN', 'NKE', 'NI', 'NBL', 'JWN', 'NSC', 'NTRS', 'NOC', 'NLOK',
  'NCLH', 'NRG', 'NUE', 'NVDA', 'NVR', 'ORLY', 'OXY', 'ODFL', 'OMC', 'OKE',
  'ORCL', 'PCAR', 'PKG', 'PH', 'PAYX', 'PAYC', 'PYPL', 'PNR', 'PBCT', 'PEP',
  'PKI', 'PRGO', 'PFE', 'PM', 'PSX', 'PNW', 'PXD', 'PNC', 'PPG', 'PPL',
  'PFG', 'PG', 'PGR', 'PLD', 'PRU', 'PEG', 'PSA', 'PHM', 'PVH', 'QRVO',
  'PWR', 'QCOM', 'DGX', 'RL', 'RJF', 'RTN', 'O', 'REG', 'REGN', 'RF',
  'RSG', 'RMD', 'RHI', 'ROK', 'ROL', 'ROP', 'ROST', 'RCL', 'SPGI', 'CRM',
  'SBAC', 'SLB', 'STX', 'SEE', 'SRE', 'NOW', 'SHW', 'SPG', 'SWKS', 'SLG',
  'SNA', 'SO', 'LUV', 'SWK', 'SBUX', 'STT', 'STE', 'SYK', 'SIVB', 'SYF',
  'SNPS', 'SYY', 'TMUS', 'TROW', 'TTWO', 'TPG', 'TJX', 'TSCO', 'TDG', 'TRV',
  'TFC', 'TWTR', 'TSN', 'UDR', 'ULTA', 'USB', 'UAA', 'UA', 'UNP', 'UAL',
  'UNH', 'UPS', 'URI', 'UTX', 'UHS', 'UNM', 'VFC', 'VLO', 'VAR', 'VTR',
  'VRSN', 'VRSK', 'VZ', 'VRTX', 'VIAB', 'V', 'VNO', 'VMC', 'WRB', 'WAB',
  'WMT', 'WBA', 'DIS', 'WM', 'WAT', 'WEC', 'WFC', 'WELL', 'WDC', 'WU',
  'WRK', 'WY', 'WHR', 'WMB', 'WLTW', 'WYNN', 'XEL', 'XRX', 'XLNX', 'XYL',
  'YUM', 'ZBRA', 'ZBH', 'ZION', 'ZTS'
];

export default function SP500Heatmap() {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [sectorData, setSectorData] = useState<SectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<'SP500' | 'DAX' | 'NASDAQ100'>('SP500');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showAll, setShowAll] = useState<boolean>(true); // Standardmäßig alle zeigen
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
          'COST', 'ASML', 'PLTR', 'TMUS', 'CSCO', 'AZN', 'LIN', 'INTU', 'AMD', 'ISRG',
          'TXN', 'PEP', 'BKNG', 'ADBE', 'QCOM', 'AMGN', 'ARM', 'PDD', 'HON', 'SHOP',
          'AMAT', 'PANW', 'GILD', 'VRTX', 'SBUX', 'ADP', 'MDLZ', 'ADI', 'LRCX', 'REGN',
          'PYPL', 'SNPS', 'KLAC', 'CDNS', 'MAR', 'CSX', 'ORLY', 'FTNT', 'DASH', 'TTD',
          'PCAR', 'NXPI', 'ROP', 'ABNB', 'ROST', 'PAYX', 'FAST', 'BKR', 'EA', 'VRSK',
          'EXC', 'TEAM', 'ODFL', 'AEP', 'XEL', 'CTSH', 'KDP', 'GEHC', 'CCEP', 'ON',
          'DDOG', 'KHC', 'IDXX', 'ZS', 'ANSS', 'TTWO', 'CSGP', 'WBD', 'GFS', 'MDB',
          'ILMN', 'BIIB', 'ZM', 'LCID', 'RIVN', 'MRNA', 'CRWD', 'COIN', 'RBLX', 'DOCU',
          'ROKU', 'PTON', 'ZG', 'OKTA', 'DXCM', 'ALGN', 'INCY', 'SIRI', 'BMRN', 'TECH'
        ];
      default: // SP500 - VOLLSTÄNDIGE LISTE
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
        'DTE.DE': 'Telecommunications', 'VNA.DE': 'Telecommunications',
        'HEI.DE': 'Industrials', 'MTX.DE': 'Industrials', 'DHER.DE': 'Industrials',
        'ZAL.DE': 'Consumer Discretionary', 'ADS.DE': 'Consumer Discretionary', 'PUM.DE': 'Consumer Discretionary',
        'HEN3.DE': 'Consumer Staples', 'FME.DE': 'Consumer Staples',
        'PAH3.DE': 'Real Estate', 'TEG.DE': 'Real Estate', 'HDD.DE': 'Real Estate'
      };
    }
    
    // Erweiterte S&P 500 Sektor-Zuordnung
    return {
      // Technology
      'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology',
      'META': 'Technology', 'NVDA': 'Technology', 'AVGO': 'Technology', 'ADBE': 'Technology',
      'CRM': 'Technology', 'ORCL': 'Technology', 'INTC': 'Technology', 'IBM': 'Technology',
      'ACN': 'Technology', 'TXN': 'Technology', 'QCOM': 'Technology', 'AMD': 'Technology',
      'NOW': 'Technology', 'INTU': 'Technology', 'AMAT': 'Technology', 'ADI': 'Technology',
      'LRCX': 'Technology', 'KLAC': 'Technology', 'SNPS': 'Technology', 'CDNS': 'Technology',
      
      // Consumer Discretionary
      'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary', 'HD': 'Consumer Discretionary',
      'NKE': 'Consumer Discretionary', 'LOW': 'Consumer Discretionary', 'TJX': 'Consumer Discretionary',
      'BKNG': 'Consumer Discretionary', 'MCD': 'Consumer Discretionary', 'SBUX': 'Consumer Discretionary',
      
      // Health Care
      'UNH': 'Health Care', 'JNJ': 'Health Care', 'LLY': 'Health Care', 'ABBV': 'Health Care',
      'PFE': 'Health Care', 'TMO': 'Health Care', 'ABT': 'Health Care', 'MRK': 'Health Care',
      'BMY': 'Health Care', 'MDT': 'Health Care', 'GILD': 'Health Care', 'ISRG': 'Health Care',
      'REGN': 'Health Care', 'VRTX': 'Health Care', 'AMGN': 'Health Care', 'ZTS': 'Health Care',
      'CI': 'Health Care', 'CVS': 'Health Care', 'BSX': 'Health Care', 'HUM': 'Health Care',
      
      // Financials
      'BRK-B': 'Financials', 'JPM': 'Financials', 'V': 'Financials', 'MA': 'Financials',
      'GS': 'Financials', 'AXP': 'Financials', 'MS': 'Financials', 'BLK': 'Financials',
      'SCHW': 'Financials', 'SPGI': 'Financials', 'CME': 'Financials', 'ICE': 'Financials',
      'MCO': 'Financials', 'USB': 'Financials', 'TFC': 'Financials', 'COF': 'Financials',
      
      // Consumer Staples
      'PG': 'Consumer Staples', 'KO': 'Consumer Staples', 'PEP': 'Consumer Staples',
      'COST': 'Consumer Staples', 'WMT': 'Consumer Staples', 'MDLZ': 'Consumer Staples',
      'CL': 'Consumer Staples', 'KMB': 'Consumer Staples', 'KR': 'Consumer Staples',
      'PM': 'Consumer Staples', 'MO': 'Consumer Staples',
      
      // Communication Services
      'DIS': 'Communication Services', 'VZ': 'Communication Services', 'NFLX': 'Communication Services',
      'CMCSA': 'Communication Services', 'T': 'Communication Services', 'TMUS': 'Communication Services',
      'CHTR': 'Communication Services',
      
      // Energy
      'CVX': 'Energy', 'XOM': 'Energy', 'COP': 'Energy', 'SLB': 'Energy', 'EOG': 'Energy',
      
      // Industrials
      'HON': 'Industrials', 'UPS': 'Industrials', 'CAT': 'Industrials', 'RTX': 'Industrials',
      'LMT': 'Industrials', 'BA': 'Industrials', 'GE': 'Industrials', 'MMM': 'Industrials',
      'DE': 'Industrials', 'UNP': 'Industrials', 'NSC': 'Industrials', 'FDX': 'Industrials',
      'EMR': 'Industrials', 'ITW': 'Industrials', 'CARR': 'Industrials', 'JCI': 'Industrials',
      
      // Utilities
      'NEE': 'Utilities', 'SO': 'Utilities', 'DUK': 'Utilities', 'EXC': 'Utilities',
      'AEP': 'Utilities', 'XEL': 'Utilities', 'WEC': 'Utilities', 'ES': 'Utilities',
      
      // Real Estate
      'PLD': 'Real Estate', 'EQIX': 'Real Estate', 'PSA': 'Real Estate', 'CCI': 'Real Estate',
      
      // Materials
      'LIN': 'Materials', 'APD': 'Materials', 'SHW': 'Materials', 'NUE': 'Materials',
      'ECL': 'Materials', 'PPG': 'Materials'
    };
  };

  useEffect(() => {
    loadIndexData();
  }, [selectedIndex, showAll]);

  const loadIndexData = async () => {
    setLoading(true);
    try {
      const stocks = getIndexStocks(selectedIndex);
      
      // Chunking für große API-Anfragen (max 100 Symbole pro Request)
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
        
        // Kleine Pause zwischen Requests
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

      // Limit nur wenn showAll = false
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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-4">
          <LoadingSpinner />
          <p className="text-gray-300">Lade {getIndexName()} Heatmap...</p>
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

  // OPTIMIERTE Container-Größen für bessere Proportionen
  const getContainerDimensions = () => {
    const numStocks = displayData.length;
    
    // Finviz-ähnliches Seitenverhältnis (breiter als hoch)
    let baseWidth, baseHeight;
    
    if (numStocks > 400) {
      // Für große Datasets (S&P 500)
      baseWidth = 1600;
      baseHeight = 800;
    } else if (numStocks > 200) {
      // Für mittlere Datasets
      baseWidth = 1400;
      baseHeight = 700;
    } else if (numStocks > 100) {
      // Für kleinere Datasets
      baseWidth = 1200;
      baseHeight = 600;
    } else {
      // Für sehr kleine Datasets
      baseWidth = 1000;
      baseHeight = 500;
    }
    
    // Dynamische Anpassung basierend auf Bildschirmgröße
    const maxWidth = Math.min(1800, window.innerWidth * 0.95);
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
    <main className="max-w-full mx-auto p-6 space-y-6 overflow-x-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
          <ChartBarIcon className="w-10 h-10 text-blue-400" />
          {getIndexName()} Heatmap
        </h1>
        <p className="text-gray-300 text-lg">
          Live Marktübersicht der größten {selectedIndex === 'DAX' ? 'deutschen' : 'US-'} Aktien
        </p>
        
        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-4">
          <div className="flex gap-2">
            {(['SP500', 'DAX', 'NASDAQ100'] as const).map((index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedIndex === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {index === 'SP500' ? 'S&P 500' : index === 'DAX' ? 'DAX 40' : 'NASDAQ 100'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAll(!showAll)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              showAll
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {showAll ? `Alle ${selectedIndex === 'SP500' ? '500' : selectedIndex === 'DAX' ? '40' : '100'} anzeigen` : 'Top 100'}
          </button>
        </div>
      </div>

      {/* Market Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <ArrowUpIcon className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-green-400 font-semibold">Steigend</span>
            </div>
            <div className="text-2xl font-bold text-white">{marketSummary.up}</div>
            <div className="text-sm text-gray-400">Aktien</div>
          </div>
        </Card>

        <Card>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <ArrowDownIcon className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-red-400 font-semibold">Fallend</span>
            </div>
            <div className="text-2xl font-bold text-white">{marketSummary.down}</div>
            <div className="text-sm text-gray-400">Aktien</div>
          </div>
        </Card>

        <Card>
          <div className="p-4 text-center">
            <div className="text-sm text-gray-400 mb-2">Durchschnitt</div>
            <div className={`text-2xl font-bold ${marketSummary.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {marketSummary.avgChange >= 0 ? '+' : ''}{marketSummary.avgChange.toFixed(2)}%
            </div>
            <div className="text-sm text-gray-400">Performance</div>
          </div>
        </Card>

        <Card>
          <div className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <button
                onClick={loadIndexData}
                className="flex items-center text-blue-400 hover:text-blue-300 transition"
              >
                <ArrowPathIcon className="w-4 h-4 mr-1" />
                <span className="text-sm">Aktualisieren</span>
              </button>
            </div>
            <div className="text-lg font-semibold text-white">
              {lastUpdate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-gray-400">Uhr</div>
          </div>
        </Card>
      </div>

      {/* Sector Filter */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Filter nach Sektor</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSector(null)}
              className={`px-3 py-1 rounded-lg text-sm transition ${
                selectedSector === null 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Alle Sektoren
            </button>
            {sectorData.map((sector: SectorData) => (
              <button
                key={sector.sector}
                onClick={() => setSelectedSector(sector.sector)}
                className={`px-3 py-1 rounded-lg text-sm transition ${
                  selectedSector === sector.sector 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {getSectorDisplayName(sector.sector)} ({sector.count})
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* VERBESSERTE FinViz-Style Treemap */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">
              {selectedSector ? `${getSectorDisplayName(selectedSector)} Sektor` : `${getIndexName()} Heatmap`}
              <span className="text-sm text-gray-400 ml-2">({displayData.length} Aktien)</span>
            </h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-gray-300">Gewinner</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-gray-300">Verlierer</span>
              </div>
            </div>
          </div>

          {/* OPTIMIERTE Container-Darstellung */}
          <div className="w-full overflow-x-auto">
            <div className="flex justify-center">
              <div className="space-y-4">
                {/* Treemap Container */}
                <div 
                  className="relative bg-gray-900 rounded-lg border border-gray-700"
                  style={{ 
                    width: `${containerWidth}px`, 
                    height: `${containerHeight}px`,
                    minWidth: '600px',
                    maxWidth: '100%'
                  }}
                >
                {treemapRects.map((rect, index) => {
                  const stock = rect.stock;
                  
                  // Verbesserte dynamische Font-Größe und Anzeige-Logik
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
                  
                  // Verbesserte Anzeige-Bedingungen
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
                      onClick={() => router.push(`/analyse/${stock.symbol.toLowerCase()}`)}
                    >
                      {/* Symbol - nur wenn genug Platz */}
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
                      
                      {/* Percentage - für größere Boxen */}
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
                      
                      {/* Market Cap - nur für große Boxen */}
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
                      
                      {/* Price - für sehr große Boxen */}
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
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full bg-gray-900 text-white text-xs p-3 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-50 border border-gray-500 pointer-events-none">
                        <div className="font-bold text-sm">{stock.symbol} - {stock.name}</div>
                        <div className="text-yellow-400 mt-1">${(stock.marketCap / 1e9).toFixed(1)}B Market Cap</div>
                        <div className="text-blue-400">{getSectorDisplayName(stock.sector)}</div>
                        <div className="text-gray-300">Preis: ${stock.price.toFixed(2)}</div>
                        <div className={`font-bold mt-1 ${stock.changesPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stock.changesPercentage >= 0 ? '+' : ''}{stock.changesPercentage.toFixed(2)}% heute
                          {stock.change !== 0 && (
                            <span className="block text-xs">
                              ({stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)})
                            </span>
                          )}
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  );
                })}
                
                {/* VERBESSERTE SEKTOR-LABELS (nur für große einzelne Bereiche) */}
                {selectedSector === null && treemapRects.map((rect, index) => {
                  const stock = rect.stock;
                  
                  // Zeige Sektor-Label nur für sehr große Einzelbereiche
                  const area = rect.width * rect.height;
                  const isLargeArea = area > 15000 && rect.width > 150 && rect.height > 80;
                  
                  if (!isLargeArea) return null;
                  
                  // Prüfe, ob dies der größte Bereich für diesen Sektor ist
                  const sectorRects = treemapRects.filter(r => r.stock.sector === stock.sector);
                  const isLargestInSector = sectorRects.every(r => 
                    (r.width * r.height) <= area
                  );
                  
                  if (!isLargestInSector) return null;
                  
                  return (
                    <div
                      key={`sector-label-${stock.sector}-${index}`}
                      className="absolute pointer-events-none z-10"
                      style={{
                        left: `${rect.x + 8}px`,
                        top: `${rect.y + 8}px`,
                        maxWidth: `${rect.width - 16}px`
                      }}
                    >
                      <div className="bg-black bg-opacity-40 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm border border-gray-500 shadow-lg">
                        {getSectorDisplayName(stock.sector).toUpperCase()}
                      </div>
                    </div>
                  );
                })}
              
                {/* Loading Overlay */}
                {treemapRects.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 rounded-lg">
                    <div className="text-white text-lg">Keine Daten verfügbar</div>
                  </div>
                )}
                </div>
                
                {/* FINVIZ-STYLE FARBSKALA */}
                <div className="flex justify-center">
                  <div className="flex items-center space-x-1 bg-gray-800 rounded-lg p-3 border border-gray-600">
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
                        <span className="text-gray-300 text-xs mt-1 font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Sector Performance Table */}
      {!selectedSector && sectorData.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Sektor Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 text-gray-300">Sektor</th>
                    <th className="text-right py-3 text-gray-300">Anzahl</th>
                    <th className="text-right py-3 text-gray-300">Ø Performance</th>
                    <th className="text-right py-3 text-gray-300">Market Cap</th>
                    <th className="text-right py-3 text-gray-300">Anteil</th>
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
                          className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition"
                          onClick={() => setSelectedSector(sector.sector)}
                        >
                          <td className="py-3 text-white font-medium">{getSectorDisplayName(sector.sector)}</td>
                          <td className="py-3 text-right text-gray-300">{sector.count}</td>
                          <td className={`py-3 text-right font-medium ${
                            sector.avgChange >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {sector.avgChange >= 0 ? '+' : ''}{sector.avgChange.toFixed(2)}%
                          </td>
                          <td className="py-3 text-right text-gray-300">
                            ${(sector.totalMarketCap / 1e12).toFixed(1)}T
                          </td>
                          <td className="py-3 text-right text-gray-300">
                            {sectorPercentage.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </main>
  );
}