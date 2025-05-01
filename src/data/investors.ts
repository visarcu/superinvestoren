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


      // ... weitere Positionen nach Bedarf
    ],
  },
  {
    name: 'Bill Ackman',
    slug: 'ackman',
    imageUrl: '/images/ackman-cartoon.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },
  {
    name: 'Michael Burry',
    slug: 'burry',
    imageUrl: '/images/burry-cartoon.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },
  {
    name: 'Howard Marks',
    slug: 'marks',
    imageUrl: '/images/marks-cartoon.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },
  {
    name: 'Monish Pabrai',
    slug: 'pabrai',
    imageUrl: '/images/pabrai-cartoon.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },
  {
    name: 'Terry Smith',
    slug: 'smith',
    imageUrl: '/images/smith-cartoon.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },
  {
    name: 'Li Lu – Himalaya Capital',
    slug: 'lilu', 
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },
  {
    name: 'David Einhorn',
    slug: 'einhorn',       
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },
  {
    name: 'Chris Bloomstran',
    slug: 'bloomstran', 
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },
  {
    name: 'Guy Spier',
    slug: 'spier',    
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'David Tepper',
    slug: 'tepper', 
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Bill & Melinda Gates Foundation',
    slug: 'gates',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Steven Romick',
    slug: 'romick',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Seth Klarman',
    slug: 'klarman',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Jeremy Grantham',
    slug: 'grantham',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'John Paulson',
    slug: 'paulson', 
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Joel Greenblatt',
    slug: 'greenblatt', 
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Mairs & Power Growth Fund',
    slug: 'mairs-power', 
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Robert Vinall – RV Capital GmbH',
    slug: 'robert-vinall',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Olstein Capital Management',
    slug: 'olstein', 
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Dodge & Cox',
    slug: 'dogecox',  
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Greenhaven Associates',
    slug: 'greenhaven',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Mason Hawkins – Longleaf Partners',
    slug: 'mason-hawkins',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Ruane Cunniff – Sequoia Fund',
    slug: 'ruane-cuniff',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Tom Bancroft – Makaira Partners',
    slug: 'tom-bancroft',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Greg Alexander – Conifer Management',
    slug: 'gregalexander',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'AltaRock Partners',
    slug: 'altarockpartners',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Chase Coleman (Tiger Global Management)',
    slug: 'coleman',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Chuck Akre (Akre Capital Management)',
    slug: 'akre',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Glenn Greenberg (Brave Warrior Advisors)',
    slug: 'greenberg',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Thomas Gayner (Markel Group)',
    slug: 'gayner',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Bill Miller',
    slug: 'miller',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Lee Ainslie (Maverick Capital)',
    slug: 'ainslie',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
]
