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
  action: 'buy' | 'sell' | 'hold'
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
  updatedAt: string
}

export const investors: Investor[] = [
  {
    name: 'Warren Buffett',
    slug: 'buffett',
    imageUrl: '/images/buffett-cartoon.png',
    updatedAt: '31.12.2024',    
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
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'BN', name: 'Brookfield Corp.',  weight: 15.83, marketValue: 2004607000,lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 6.59,    },
      { ticker: 'QSR', name: 'Restaurant Brands International',  weight: 11.84, marketValue: 1499200000,lastUpdated: '2025-03-31', action: 'hold',
        changePercent: 0,   },
        { ticker: 'CMG', name: 'Chipotle Mexican Grill Inc.',  weight: 11.74, marketValue: 1486608000,lastUpdated: '2025-03-31', action: 'sell',
          changePercent: 14.44,   },
          { ticker: 'HHH', name: 'Howard Hughes Holdings Inc.',  weight: 11.45, marketValue: 1450101000,lastUpdated: '2025-03-31', action: 'hold',
            changePercent: 0,   },
            { ticker: 'GOOG', name: 'Alphabet Inc. CL C',  weight: 11.35, marketValue: 1437362000,lastUpdated: '2025-03-31', action: 'hold',
              changePercent: 0,   },
              { ticker: 'NIKE', name: 'NIKE Inc.',  weight: 11.22, marketValue: 1420246000,lastUpdated: '2025-03-31', action: 'buy',
                changePercent: 15.29,   },
                { ticker: 'HLT', name: 'Hilton Worldwide Holdings',  weight: 10.62, marketValue: 1344685000,lastUpdated: '2025-03-31', action: 'sell',
                  changePercent: 26.18,   },
                  { ticker: 'CP', name: 'Canadian Pacific Kansas City',  weight: 8.50, marketValue: 1076696000,lastUpdated: '2025-03-31', action: 'hold',
                    changePercent: 0,   },
                    { ticker: 'GOOGL', name: 'Alphabet Inc.',  weight: 5.96, marketValue: 754642000,lastUpdated: '2025-03-31', action: 'hold',
                      changePercent: 0,   },
                      { ticker: 'SEG', name: 'Seaport Entertainment Group	',  weight: 1.11, marketValue: 140415000,lastUpdated: '2025-03-31', action: 'buy',
                        changePercent: 139.84,   },
                        { ticker: 'HTZ', name: 'Hertz Global Hldgs Inc.',  weight: 0.37, marketValue: 46533000,lastUpdated: '2025-03-31', action: 'buy',
                          changePercent: 100,   },
    ],
  },
  {
    name: 'Michael Burry',
    slug: 'burry',
    imageUrl: '/images/burry-cartoon.png',
    updatedAt: '31.12.2024',    
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
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'AMZN', name: 'Amazon', weight: 22.3,marketValue: 175320000000, lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A', weight: 18.7, marketValue: 175320000000,lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
    ],
  },
  {
    name: 'Monish Pabrai',
    slug: 'pabrai',
    imageUrl: '/images/pabrai-cartoon.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'AMZN', name: 'Chevron Corp.',  weight: 22.3,marketValue: 175320000000, lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A', weight: 18.7, marketValue: 175320000000,lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
    ],
  },
  {
    name: 'Terry Smith',
    slug: 'smith',
    imageUrl: '/images/smith-cartoon.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'AMZN', name: 'Chevron Corp.',  weight: 22.3, marketValue: 175320000000,lastUpdated: '2025-03-31', action: 'buy',
        changePercent: 3.5,   },
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A', weight: 18.7,marketValue: 175320000000, lastUpdated: '2025-03-31', action: 'sell',
        changePercent: 3.5,   },
    ],
  },
  {
    name: 'Li Lu',
    slug: 'lilu',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A', weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'buy',
        changePercent: 3.5,   },
      // …
    ],
  },
  {
    name: 'David Einhorn',
    slug: 'einhorn',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A', weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'buy',
        changePercent: 3.5,   },
      // …
    ],
  },
  {
    name: 'Chris Bloomstran',
    slug: 'bloomstran',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'sell' ,
        changePercent: 3.5,  },
      // …
    ],
  },
  {
    name: 'Guy Spier',
    slug: 'spier',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'sell' ,
        changePercent: 3.5,  },
      // …
    ],
  },  
  {
    name: 'David Tepper',
    slug: 'tepper',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'sell' ,
        changePercent: 3.5,  },
      // …
    ],
  },  
  {
    name: 'Bill Gates',
    slug: 'gates',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'sell' ,
        changePercent: 3.5,  },
      // …
    ],
  },  
  {
    name: 'Steven Romick',
    slug: 'romick',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'sell' ,
        changePercent: 3.5,  },
      // …
    ],
  },  
  {
    name: 'Seth Klarman',
    slug: 'klarman',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'sell' ,
        changePercent: 3.5,  },
      // …
    ],
  },  
  {
    name: 'Jeremy Grantham',
    slug: 'grantham',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'sell' ,
        changePercent: 3.5,  },
      // …
    ],
  },  
  {
    name: 'John Paulson',
    slug: 'paulson',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'sell' ,
        changePercent: 3.5,  },
      // …
    ],
  },  
  {
    name: 'Joel Greenblatt',
    slug: 'greenblatt',           // muss eindeutig sein
    // optional: path zum Cartoon
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [
      { ticker: 'GOOGL', name: 'Alphabet Inc Class A',  weight: 12.3, marketValue: 175320000000,lastUpdated: '2025-04-30', action: 'sell' ,
        changePercent: 3.5,  },
      // …
    ],
  },  
]
