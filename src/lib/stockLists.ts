// src/lib/stockLists.ts - HYBRID APPROACH (Professional Solution)

export interface StockList {
    id: string
    title: string
    description: string
    apiEndpoint: string
    symbols?: string[]
    useManualSymbols?: boolean
    visualMode?: 'marketCap' | 'performance'
    listType: 'curated' | 'index' | 'performance'  // ✅ NEU: Liste-Typ
    updateFrequency: 'static' | 'quarterly' | 'daily'  // ✅ NEU: Update-Frequenz
  }
  
  // ✅ KURATIERTE LISTEN - Manuell (Kontrolle & Qualität)
  export const GLOBAL_TITANS = [
    // Sorgfältig ausgewählte globale Marktführer
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B',
    'UNH', 'LLY', 'JPM', 'V', 'WMT', 'XOM', 'PG', 'HD', 'MA', 'COST',
    'NFLX', 'ADBE', 'CRM', 'BAC', 'ABBV', 'KO', 'CVX', 'MRK', 'PEP',
    'TMO', 'ABT', 'CSCO', 'ACN', 'DHR', 'LIN', 'NOW', 'TXN', 'QCOM',
    
    // Internationale Champions (ADRs)
    'TSM', 'ASML', 'NVO', 'SAP', 'TM', 'BABA', 'TCEHY'
  ]
  
  export const MAGNIFICENT_SEVEN = [
    // Die "Magnificent 7" - handverlesen
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA'
  ]
  
  export const AI_LEADERS = [
    // AI/ML Marktführer - kuratiert
    'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AAPL', 'TSM', 'AMD', 'ORCL', 'CRM',
    'NOW', 'SNOW', 'PLTR', 'AI', 'PATH', 'U', 'NET', 'DDOG', 'ZS'
  ]
  
  export const GERMAN_CHAMPIONS = [
    // Deutsche Marktführer - manuell gepflegt für Qualität
    'SAP.DE', 'SIE.DE', 'ALV.DE', 'BAS.DE', 'BMW.DE', 'LIN.DE', 'DTE.DE', 
    'MUV2.DE', 'ADS.DE', 'VOW3.DE', 'AIR.DE', 'BAYN.DE', 'FRE.DE', 'RWE.DE'
  ]
  
  // ✅ INDEX-REFERENZEN - Für API-Abruf (aber mit Fallbacks)
  export const SP500_TOP_100 = [
    // Top 100 S&P 500 als Fallback, falls API fehlt
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B', 'UNH',
    'LLY', 'JPM', 'V', 'AVGO', 'XOM', 'WMT', 'MA', 'COST', 'HD', 'PG',
    'NFLX', 'BAC', 'ABBV', 'CRM', 'KO', 'CVX', 'ADBE', 'MRK', 'WFC', 'TMO',
    'PEP', 'CSCO', 'ACN', 'LIN', 'ABT', 'AMD', 'NOW', 'ORCL', 'DIS', 'TXN',
    'COP', 'DHR', 'PM', 'CAT', 'IBM', 'GE', 'QCOM', 'VZ', 'SPGI', 'RTX',
    'INTU', 'CMCSA', 'AMAT', 'T', 'HON', 'UNP', 'NKE', 'LOW', 'AXP', 'BKNG',
    'LMT', 'NEE', 'MDT', 'SCHW', 'PFE', 'BMY', 'SYK', 'C', 'UPS', 'ANTM',
    'MMM', 'DE', 'BLK', 'BA', 'ADI', 'GILD', 'CVS', 'TGT', 'MDLZ', 'AMT',
    'SO', 'ISRG', 'ZTS', 'LRCX', 'MO', 'SLB', 'CB', 'CI', 'DUK', 'TMUS',
    'PLD', 'BSX', 'ICE', 'PYPL', 'AON', 'NSC', 'EQIX', 'ITW', 'APD', 'EMR'
  ]
  
  export const NASDAQ100_TOP_50 = [
    // Top 50 NASDAQ 100 als Fallback
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'AVGO', 'COST',
    'NFLX', 'ADBE', 'PEP', 'CSCO', 'TMUS', 'CMCSA', 'TXN', 'QCOM', 'INTU', 'AMD',
    'HON', 'AMAT', 'BKNG', 'ADP', 'ISRG', 'GILD', 'SBUX', 'PYPL', 'ADI', 'REGN',
    'LRCX', 'FISV', 'CSX', 'ORLY', 'NXPI', 'KLAC', 'MRNA', 'CHTR', 'ASML', 'CDNS',
    'SNPS', 'CTAS', 'FTNT', 'MCHP', 'WDAY', 'BIIB', 'KDP', 'ILMN', 'XEL', 'PAYX'
  ]
  
  export const STOCK_LISTS_CONFIG: Record<string, StockList> = {
    // ========== KURATIERTE LISTEN (Manuell = Kontrolle) ==========
    
    'global-titans': {
      id: 'global-titans',
      title: 'Globale Marktführer',
      description: 'Handverlesene globale Champions nach Qualitätskriterien',
      apiEndpoint: 'quote',
      symbols: GLOBAL_TITANS,
      useManualSymbols: true,
      visualMode: 'marketCap',
      listType: 'curated',
      updateFrequency: 'static'
    },
    
    'magnificent-seven': {
      id: 'magnificent-seven',
      title: 'Magnificent Seven',
      description: 'Die 7 dominierenden Tech-Giganten',
      apiEndpoint: 'quote',
      symbols: MAGNIFICENT_SEVEN,
      useManualSymbols: true,
      visualMode: 'marketCap',
      listType: 'curated',
      updateFrequency: 'static'
    },
    
    'ai-leaders': {
      id: 'ai-leaders',
      title: 'KI-Marktführer',
      description: 'Führende Unternehmen im Bereich Künstliche Intelligenz',
      apiEndpoint: 'quote',
      symbols: AI_LEADERS,
      useManualSymbols: true,
      visualMode: 'marketCap',
      listType: 'curated',
      updateFrequency: 'static'
    },
    
    'german-champions': {
      id: 'german-champions',
      title: 'Deutsche Champions',
      description: 'Führende deutsche Unternehmen',
      apiEndpoint: 'quote',
      symbols: GERMAN_CHAMPIONS,
      useManualSymbols: true,
      visualMode: 'marketCap',
      listType: 'curated',
      updateFrequency: 'static'
    },
    
    // ========== INDEX-LISTEN (API mit Fallback) ==========
    
    'sp500': {
      id: 'sp500',
      title: 'S&P 500',
      description: 'Standard & Poor\'s 500 Index (Top 100 Unternehmen)',
      apiEndpoint: 'sp500_constituent_or_fallback',
      symbols: SP500_TOP_100, // Fallback falls API fehlt
      useManualSymbols: false, // Versuche API zuerst
      visualMode: 'marketCap',
      listType: 'index',
      updateFrequency: 'quarterly'
    },
    
    'nasdaq100': {
      id: 'nasdaq100',
      title: 'NASDAQ 100',
      description: 'NASDAQ 100 Index (Top 50 Unternehmen)',
      apiEndpoint: 'nasdaq_constituent_or_fallback',
      symbols: NASDAQ100_TOP_50, // Fallback
      useManualSymbols: false,
      visualMode: 'marketCap',
      listType: 'index',
      updateFrequency: 'quarterly'
    },
    
    'dax40': {
      id: 'dax40',
      title: 'DAX 40',
      description: 'Deutscher Aktienindex (alle 40 Unternehmen)',
      apiEndpoint: 'quote',
      symbols: [
        'ADS.DE', 'ALV.DE', 'BAS.DE', 'BAYN.DE', 'BEI.DE', 'BMW.DE', 'CON.DE', 'DAI.DE',
        'DB1.DE', 'DBK.DE', 'DTE.DE', 'EOAN.DE', 'FRE.DE', 'FME.DE', 'HEI.DE', 'HEN3.DE',
        'IFX.DE', 'LIN.DE', 'MRK.DE', 'MTX.DE', 'MUV2.DE', 'RWE.DE', 'SAP.DE', 'SIE.DE',
        'VNA.DE', 'VOW3.DE', 'ZAL.DE', 'AIR.DE', 'BNR.DE', 'COK.DE', 'HAN.DE', 'HFG.DE',
        'PUM.DE', 'QIA.DE', 'SHL.DE', 'SRT3.DE', 'SY1.DE', 'VBK.DE', 'WAF.DE', 'WDI.DE'
      ],
      useManualSymbols: true, // DAX ändert sich selten, manuell ist OK
      visualMode: 'marketCap',
      listType: 'index',
      updateFrequency: 'quarterly'
    },
    
    // ========== PERFORMANCE-LISTEN (Immer API) ==========
    
    'gainers-today': {
      id: 'gainers-today',
      title: 'Tagesgewinner',
      description: 'Aktien mit der besten Performance heute',
      apiEndpoint: 'gainers',
      useManualSymbols: false,
      visualMode: 'performance',
      listType: 'performance',
      updateFrequency: 'daily'
    },
    
    'losers-today': {
      id: 'losers-today',
      title: 'Tagesverlierer',
      description: 'Aktien mit der schlechtesten Performance heute',
      apiEndpoint: 'losers',
      useManualSymbols: false,
      visualMode: 'performance',
      listType: 'performance',
      updateFrequency: 'daily'
    },
    
    'most-active': {
      id: 'most-active',
      title: 'Meist gehandelt',
      description: 'Aktien mit dem höchsten Handelsvolumen heute',
      apiEndpoint: 'actives',
      useManualSymbols: false,
      visualMode: 'marketCap',
      listType: 'performance',
      updateFrequency: 'daily'
    }
  }