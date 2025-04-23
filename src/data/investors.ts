// src/data/investors.ts

export interface Holding {
  /** Aktienticker */
  ticker: string
  name: string
  /** Gewichtung im Portfolio (in Prozent) */
  weight: number
  marketValue: number  
  /** Letztes Update im Format YYYY‑MM‑DD */
  lastUpdated: string
  action: 'buy' | 'sell'
  changePercent?: number 
}

export interface Investor {
  /** Name des Investors */
  name: string
  /** URL‑Segment, z. B. “buffett” */
  slug: string
  /** Optional: Pfad zu einem Bild in `public/images/` */
  imageUrl?: string
  /** Liste der gehaltenen Positionen */
  holdings: Holding[]
}

export const investors: Investor[] = [
  {
    name: 'Warren Buffett',
    slug: 'buffett',
    imageUrl: '/images/buffett-cartoon.png',
    holdings: [
      { ticker: 'AAPL', name: 'Apple Inc.', weight: 28.12, marketValue: 175320000000,lastUpdated: '2024-12-31', action: 'sell',
        changePercent: 3.5,   },
      { ticker: 'AXP', name: 'American Express',  weight: 16.84,marketValue: 175320000000, lastUpdated: '2024-12-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'BAC',name: 'Bank of America',   weight: 11.19, marketValue: 175320000000,lastUpdated: '2024-12-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'KO', name: 'Coca Cola',  weight: 9.32, marketValue: 175320000000,lastUpdated: '2024-12-31', action: 'buy' ,
        changePercent: 3.5,  },
      { ticker: 'CVX', name: 'Chevron Corp.',  weight: 6.43, marketValue: 175320000000,lastUpdated: '2024-12-31', action: 'sell',
        changePercent: 3.5,   },
      { ticker: 'OXY', name: 'Occidental Petroleum',  weight: 4.89,marketValue: 175320000000, lastUpdated: '2024-12-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'MCO', name: 'Moodys Corp',  weight: 4.37, marketValue: 175320000000,lastUpdated: '2024-12-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'KHC', name: 'Kraft Heinz Co.',  weight: 3.74,marketValue: 175320000000, lastUpdated: '2024-12-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'CB', name: 'Chubb Limited',  weight: 2.80, marketValue: 175320000000,lastUpdated: '2024-12-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'DVA', name: 'DaVita HealthCare Partner',  weight: 2.02,marketValue: 175320000000, lastUpdated: '2024-12-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'KR', name: 'Kroger Co.',  weight: 1.14, marketValue: 175320000000,lastUpdated: '2024-12-31', action: 'buy' ,
        changePercent: 3.5,  },
      // ... weitere Positionen nach Bedarf
    ],
  },
  {
    name: 'Bill Ackman',
    slug: 'ackman',
    imageUrl: '/images/ackman-cartoon.png',
    holdings: [
      { ticker: 'BRK.B', name: 'Berkshire Hathaway B',  weight: 28.5, marketValue: 175320000000,lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,    },
      { ticker: 'UBER', name: 'Uber',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-03-31', action: 'sell',
        changePercent: 3.5,   },
    ],
  },
  {
    name: 'Michael Burry',
    slug: 'burry',
    imageUrl: '/images/burry-cartoon.png',
    holdings: [
      { ticker: 'TSLA', name: 'Tesla',  weight: 15.0,marketValue: 175320000000, lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'GME', name: 'GME',  weight:  5.4,marketValue: 175320000000, lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
    ],
  },
  {
    name: 'Howard Marks',
    slug: 'marks',
    imageUrl: '/images/marks-cartoon.png',
    holdings: [
      { ticker: 'AMZN', name: 'Chevron Corp.', weight: 22.3,marketValue: 175320000000, lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'GOOGL', name: 'Chevron Corp.', weight: 18.7, marketValue: 175320000000,lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
    ],
  },
  {
    name: 'Monish Pabrai',
    slug: 'pabrai',
    imageUrl: '/images/pabrai-cartoon.png',
    holdings: [
      { ticker: 'AMZN', name: 'Chevron Corp.',  weight: 22.3,marketValue: 175320000000, lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'GOOGL', name: 'Chevron Corp.', weight: 18.7, marketValue: 175320000000,lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
    ],
  },
  {
    name: 'Terry Smith',
    slug: 'smith',
    imageUrl: '/images/smith-cartoon.png',
    holdings: [
      { ticker: 'AMZN', name: 'Chevron Corp.',  weight: 22.3, marketValue: 175320000000,lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'GOOGL', name: 'Chevron Corp.', weight: 18.7,marketValue: 175320000000, lastUpdated: '2025-03-31', action: 'sell',
        changePercent: 3.5,   },
    ],
  },
  {
    name: 'Li Lu',
    slug: 'lilu',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    holdings: [
      { ticker: 'XYZ', name: 'Chevron Corp.', weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'buy',
        changePercent: 3.5,   },
      // …
    ],
  },
  {
    name: 'David Einhorn',
    slug: 'einhorn',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    holdings: [
      { ticker: 'XYZ', name: 'Chevron Corp.', weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'buy',
        changePercent: 3.5,   },
      // …
    ],
  },
  {
    name: 'Chris Bloomstran',
    slug: 'bloomstran',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    holdings: [
      { ticker: 'XYZ', name: 'Chevron Corp.',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'sell' ,
        changePercent: 3.5,  },
      // …
    ],
  },
      
]
