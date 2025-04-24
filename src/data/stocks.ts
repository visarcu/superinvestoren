// src/data/stocks.ts
export interface StockMetrics {
    label: string;
    value: string;
  }
  
  export interface Stock {
    ticker: string;
    name: string;
    metrics: StockMetrics[];
  }
  
  export const stocks: Stock[] = [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      metrics: [
      
        { label: 'Marktkapitalisierung', value: '2,8 Bio. €' },
        { label: 'KGV',           value: '28,5' },
        { label: 'YTD Performance', value: '+12,3 %' },
      ],
    },
    {
      ticker: 'BRK.B',
      name: 'Berkshire Hathaway B',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'AMZN',
      name: 'Amazon',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'GOOGL',
      name: 'Alphabet',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'XYZ',
      name: 'Block',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'AXP',
      name: 'American Express',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'BAC',
      name: 'Bank of America Corp',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'KO',
      name: 'The Coca-Cola Company',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'CVX',
      name: 'Chevron Corporation',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'CVX',
      name: 'Chevron Corporation',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'MCO',
      name: 'Moody’s Corporation',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'KHV',
      name: 'The Kraft Heinz Company',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'CB',
      name: 'Chubb',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    {
      ticker: 'DVA',
      name: 'DaVita HealthCare Partners Inc',
      metrics: [
    
        { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
        { label: 'KGV',           value: '18,2' },
        { label: 'YTD Performance', value: '+7,8 %' },
      ],
    },
    // … und so weiter für alle anderen Ticker, die du anzeigen möchtest
  ];
  