// src/data/stocks.ts
export interface StockMetrics {
  label: string
  value: string
}

export interface Stock {
  ticker: string
  cusip: string
  name: string
  metrics: StockMetrics[]
}

export const stocks: Stock[] = [
  {
    ticker: 'AAPL',
    cusip: '037833100',
    name: 'Apple Inc.',
    metrics: [
      { label: 'Marktkapitalisierung', value: '2,8 Bio. €' },
      { label: 'KGV', value: '28,5' },
      { label: 'YTD Performance', value: '+12,3 %' },
    ],
  },
  {
    ticker: 'BRK.B',
    cusip: '084670702',
    name: 'Berkshire Hathaway B',
    metrics: [
      { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
      { label: 'KGV', value: '18,2' },
      { label: 'YTD Performance', value: '+7,8 %' },
    ],
  },
  {
    ticker: 'AMZN',
    cusip: '023135106',
    name: 'Amazon.com Inc.',
    metrics: [
      { label: 'Marktkapitalisierung', value: '1,7 Bio. €' },
      { label: 'KGV', value: '65,4' },
      { label: 'YTD Performance', value: '+3,1 %' },
    ],
  },
  {
    ticker: 'GOOGL',
    cusip: '02079K305',
    name: 'Alphabet Inc.',
    metrics: [
      { label: 'Marktkapitalisierung', value: '1,6 Bio. €' },
      { label: 'KGV', value: '27,8' },
      { label: 'YTD Performance', value: '+8,2 %' },
    ],
  },
  {
    ticker: 'AXP',
    cusip: '025816109',
    name: 'American Express Co.',
    metrics: [
      { label: 'Marktkapitalisierung', value: '180 Mrd. €' },
      { label: 'KGV', value: '12,3' },
      { label: 'YTD Performance', value: '+5,0 %' },
    ],
  },
  {
    ticker: 'BAC',
    cusip: '060505104',
    name: 'Bank of America Corp.',
    metrics: [
      { label: 'Marktkapitalisierung', value: '250 Mrd. €' },
      { label: 'KGV', value: '9,1' },
      { label: 'YTD Performance', value: '+6,7 %' },
    ],
  },
  {
    ticker: 'KO',
    cusip: '191216100',
    name: 'The Coca-Cola Company',
    metrics: [
      { label: 'Marktkapitalisierung', value: '260 Mrd. €' },
      { label: 'KGV', value: '23,4' },
      { label: 'YTD Performance', value: '+2,2 %' },
    ],
  },
  {
    ticker: 'CVX',
    cusip: '166764100',
    name: 'Chevron Corp.',
    metrics: [
      { label: 'Marktkapitalisierung', value: '300 Mrd. €' },
      { label: 'KGV', value: '15,6' },
      { label: 'YTD Performance', value: '+4,5 %' },
    ],
  },
  {
    ticker: 'MCO',
    cusip: '551229401',
    name: 'Moody’s Corp.',
    metrics: [
      { label: 'Marktkapitalisierung', value: '120 Mrd. €' },
      { label: 'KGV', value: '14,0' },
      { label: 'YTD Performance', value: '+7,1 %' },
    ],
  },
  {
    ticker: 'KHC',
    cusip: '500754106',
    name: 'Kraft Heinz Co.',
    metrics: [
      { label: 'Marktkapitalisierung', value: '45 Mrd. €' },
      { label: 'KGV', value: '18,9' },
      { label: 'YTD Performance', value: '-1,2 %' },
    ],
  },
  {
    ticker: 'CB',
    cusip: 'H1467J104',
    name: 'Chubb Ltd.',
    metrics: [
      { label: 'Marktkapitalisierung', value: '95 Mrd. €' },
      { label: 'KGV', value: '10,7' },
      { label: 'YTD Performance', value: '+4,6 %' },
    ],
  },
  {
    ticker: 'DVA',
    cusip: '23918K108',
    name: 'DaVita Inc.',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €' },
      { label: 'KGV', value: '12,8' },
      { label: 'YTD Performance', value: '+3,9 %' },
    ],
  },

  {
    ticker: 'OXY',
    cusip: '674599105',
    name: 'Occidental Petroleum',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €' },
      { label: 'KGV', value: '12,8' },
      { label: 'YTD Performance', value: '+3,9 %' },
    ],
  },
  {
    ticker: 'MCO',
    cusip: '615369105',
    name: 'Moodys Corp',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €' },
      { label: 'KGV', value: '12,8' },
      { label: 'YTD Performance', value: '+3,9 %' },
    ],
  },


  // … weitere Ticker nach demselben Schema 
]