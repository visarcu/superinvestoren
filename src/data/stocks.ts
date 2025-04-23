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
    // … und so weiter für alle anderen Ticker, die du anzeigen möchtest
  ];
  