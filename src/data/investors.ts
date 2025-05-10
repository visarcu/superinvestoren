// src/data/investors.ts

export interface Holding {
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
    name: 'Howard Marks – Oaktree Capital Management',
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
    imageUrl: '/images/lilu.png',
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
    imageUrl: '/images/bloomstran.png',
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
    name: 'David Tepper - Appaloosa Management',
    slug: 'tepper', 
    imageUrl: '/images/tepper.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Bill & Melinda Gates Foundation',
    slug: 'gates',
    imageUrl: '/images/gates.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  //{
    //name: 'Steven Romick',
    //slug: 'romick',
    //imageUrl: '/images/neuer-investor.png',
    //updatedAt: '31.12.2024',    
    //holdings: [],
  //},  
  {
    name: 'Seth Klarman - Baupost Group',
    slug: 'klarman',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
 
  {
    name: 'Mairs & Power Growth Fund',
    slug: 'mairspower', 
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Robert Vinall – RV Capital GmbH',
    slug: 'vinall',
    imageUrl: '/images/vinall.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Robert Olstein - Olstein Capital Management',
    slug: 'olstein', 
    imageUrl: '/images/olstein.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Dodge & Cox',
    slug: 'dodgecox',  
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Edgar Wachenheim - Greenhaven Associates',
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
    slug: 'cuniff',
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
    imageUrl: '/images/gregalexander.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  
  {
    name: 'Mark Massey - Altarock Partners',
    slug: 'altarockpartners',
    imageUrl: '/images/altarockpartners.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Chase Coleman (Tiger Global Management)',
    slug: 'coleman',
    imageUrl: '/images/coleman.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Chuck Akre (Akre Capital Management)',
    slug: 'akre',
    imageUrl: '/images/akre.png',
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
    name: 'Lee Ainslie - Maverick Capital',
    slug: 'ainslie',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Chris Hohn - TCI Fund Management',
    slug: 'hohn',
    imageUrl: '/images/hohn.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Donald Yacktman - Yacktman Asset Management',
    slug: 'yacktman',
    imageUrl: '/images/yacktman.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Polen Capital Management',
    slug: 'polen',
    imageUrl: '/images/polen.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Ole Andreas Halvorsen - Viking Global',
    slug: 'viking',
    imageUrl: '/images/viking.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'William Von Mueffling - Cantillon Capital Management',
    slug: 'cantillon',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Duan Yongping - H&H International Investment',
    slug: 'duan',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Stephen Mandel - Lone Pine Capital',
    slug: 'mandel',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Jensen Investment Management',
    slug: 'jensen',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Henry Ellenbogen - Durable Capital Partners',
    slug: 'ellenbogen',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Thomas Russo - Gardner Russe & Quinn',
    slug: 'russo',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'John Armitage - Egerton Capital',
    slug: 'armitage',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Carl Icahn - Icahn Capital Management',
    slug: 'icahn',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'David Abrams - Abrams Capital Management',
    slug: 'abrams',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  },  

  {
    name: 'Fred Martin - Disciplined Growth Investors',
    slug: 'martin',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 
  
  {
    name: 'Lindsell Train ',
    slug: 'train',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 

  {
    name: 'Andrew Brenton - Turtle Creek Asset Management',
    slug: 'brenton',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 

  {
    name: 'Harry Burn - Sound Shore Management',
    slug: 'burn',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 

  {
    name: 'Pat Dorsey - Dorsey Asset Management',
    slug: 'dorsey',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 


  {
    name: 'Francis Chou - Chou Associates Management',
    slug: 'chou',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 

  {
    name: 'Bryan R. Lawrence',
    slug: 'lawrence',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 

  {
    name: 'Alex Roepers - Atlantic Investment Management',
    slug: 'roepers',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 


  {
    name: 'Charlie Munger',
    slug: 'munger',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 



  {
    name: 'Norbert Lou - Punch Card Management',
    slug: 'lou',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 

  {
    name: 'Adam Wyden - ADW Capital Management',
    slug: 'wyden',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 

  {
    name: 'Ronald Muhlenkamp - Muhlenkamp & Co',
    slug: 'muhlenkamp',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 
 
  {
    name: 'Josh Tarasoff - Greenlea Lane Capital Management',
    slug: 'tarasoff',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 
 
  {
    name: 'Glenn Welling - Engaged Capital',
    slug: 'welling',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 
 
  {
    name: 'David Rolfe - Wedgewood Partners',
    slug: 'rolfe',
    imageUrl: '/images/neuer-investor.png',
    updatedAt: '31.12.2024',    
    holdings: [],
  }, 
 


]
