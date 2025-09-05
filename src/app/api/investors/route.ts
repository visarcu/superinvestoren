// API route for investors list data
import { NextResponse } from 'next/server'
import holdingsHistory from '@/data/holdings'

interface InvestorListItem {
  slug: string
  name: string
  subtitle: string
  type: 'investor' | 'fund'
  totalValue: number
  positionsCount: number
  lastUpdate: string | null
}

// Metadata for known investors/funds
const investorMetadata: Record<string, { 
  name?: string, 
  subtitle?: string, 
  type: 'investor' | 'fund'
}> = {
  buffett: {
    name: 'Warren Buffett',
    subtitle: 'Berkshire Hathaway',
    type: 'investor'
  },
  fisher: {
    name: 'Ken Fisher',
    subtitle: 'Fisher Asset Management',
    type: 'investor'
  },
  firsteagle: {
    name: 'First Eagle Investment',
    subtitle: '',
    type: 'investor'
  },
  hohn: {
    name: 'Chris Hohn',
    subtitle: 'TCI Fund Management',
    type: 'investor'
  },
  tepper: {
    name: 'David Tepper',
    subtitle: 'Appaloosa Management',
    type: 'investor'
  },
  yacktman: {
    name: 'Donald Yacktman',
    subtitle: 'Yacktman Asset Management',
    type: 'investor'
  },
  ainslie: {
    name: 'Lee Ainslie',
    subtitle: 'Maverick Capital',
    type: 'investor'
  },
  martin: {
    name: 'Fred Martin',
    subtitle: 'Disciplined Growth Investors',
    type: 'investor'
  },
  marks: {
    name: 'Howard Marks',
    subtitle: 'Oaktree Capital Management',
    type: 'investor'
  },
  ketterer: {
    name: 'Sarah Ketterer',
    subtitle: 'Causeway Capital Management',
    type: 'investor'
  },
  abrams: {
    name: 'David Abrams',
    subtitle: 'Abrams Capital Management',
    type: 'investor'
  },
  kahn: {
    name: 'Kahn Brothers Group',
    subtitle: '',
    type: 'investor'
  },
  ubben: {
    name: 'Jeffrey Ubben',
    subtitle: 'ValueAct Holdings',
    type: 'investor'
  },
  ellenbogen: {
    name: 'Henry Ellenbogen',
    subtitle: 'Durable Capital Partners',
    type: 'investor'
  },
  armitage: {
    name: 'John Armitage',
    subtitle: 'Egerton Capital',
    type: 'investor'
  },
  mairspower: {
    name: 'Mairs & Power Inc',
    subtitle: '',
    type: 'investor'
  },
  greenblatt: {
    name: 'Joel Greenblatt',
    subtitle: 'Gotham Asset Management',
    type: 'investor'
  },
  ackman: {
    name: 'Bill Ackman',
    subtitle: 'Pershing Square Capital',
    type: 'investor'
  },
  gates: {
    name: 'Bill & Melinda Gates Foundation',
    subtitle: 'Gates Foundation Trust',
    type: 'investor'
  },
  polen: {
    name: 'Polen Capital Management',
    subtitle: '',
    type: 'investor'
  },
  kantesaria: {
    name: 'Dev Kantesaria',
    subtitle: 'Valley Forge Capital Management',
    type: 'investor'
  },
  brenton: {
    name: 'Andrew Brenton',
    subtitle: 'Turtle Creek Asset Management',
    type: 'investor'
  },
  peltz: {
    name: 'Nelson Peltz',
    subtitle: 'Turtle Creek Asset Management',
    type: 'investor'
  },
  donaldsmith: {
    name: 'Donald Smith & Co.',
    subtitle: '',
    type: 'investor'
  },
  meritage: {
    name: 'Nathaniel Simons',
    subtitle: 'Meritage Group',
    type: 'investor'
  },
  greenberg: {
    name: 'Glenn Greenberg',
    subtitle: 'Brave Warrior Advisors',
    type: 'investor'
  },
  pzena: {
    name: 'Richard Pzena',
    subtitle: 'Hancook Classic Value',
    type: 'investor'
  },
  coleman: {
    name: 'Chase Coleman',
    subtitle: 'Tiger Global Management',
    type: 'investor'
  },
  viking: {
    name: 'Viking Global Investors',
    subtitle: '',
    type: 'investor'
  },
  hawkins: {
    name: 'Mason Hawkins',
    subtitle: 'Southeastern Asset Management',
    type: 'investor'
  },
  dalio: {
    name: 'Ray Dalio',
    subtitle: 'Bridgewater Associates',
    type: 'investor'
  },
  cantillon: {
    name: 'William Von Mueffling',
    subtitle: 'Cantillon Capital Management',
    type: 'investor'
  },
  chou: {
    name: 'Francis Chou',
    subtitle: 'Chou Associates',
    type: 'investor'
  },
  duan: {
    name: 'Duan Yongping',
    subtitle: 'H&H International Investment',
    type: 'investor'
  },
  mandel: {
    name: 'Stephen Mandel',
    subtitle: 'Lone Pine Capital',
    type: 'investor'
  },
  gayner: {
    name: 'Thomas Gayner',
    subtitle: 'Markel Group',
    type: 'investor'
  },
  hong: {
    name: 'Dennis Hong',
    subtitle: 'ShawSpring Partners',
    type: 'investor'
  },
  burry: {
    name: 'Michael Burry',
    subtitle: 'Scion Asset Management',
    type: 'investor'
  },
  akre: {
    name: 'Chuck Akre',
    subtitle: 'Akre Capital Management',
    type: 'investor'
  },
  icahn: {
    name: 'Carl Icahn',
    subtitle: 'Icahn Capital Management',
    type: 'investor'
  },
  russo: {
    name: 'Thomas Russo',
    subtitle: 'Gardner Russo & Quinn',
    type: 'investor'
  },
  tangen: {
    name: 'Nicolai Tangen',
    subtitle: 'Ako Capital',
    type: 'investor'
  },
  loeb: {
    name: 'Daniel Loeb',
    subtitle: 'Third Point',
    type: 'investor'
  },
  soros: {
    name: 'George Soros',
    subtitle: 'Soros Fund Management',
    type: 'investor'
  },
  spier: {
    name: 'Guy Spier',
    subtitle: 'Aquamarine Capital',
    type: 'investor'
  },
  vulcanvalue: {
    name: 'C.T. Fitzpatrick',
    subtitle: 'Vulcan Value Partners',
    type: 'investor'
  },
  jensen: {
    name: 'Jensen Investment Management',
    subtitle: '',
    type: 'investor'
  },
  smith: {
    name: 'Terry Smith',
    subtitle: 'Fundsmith',
    type: 'investor'
  },
  cunniff_sequoia: {
    name: 'Sequoia Fund',
    subtitle: 'Ruane Cunniff',
    type: 'fund'
  },
  cunniff: {
    name: 'Ruane, Cunniff & Goldfarb L.P.',
    subtitle: '',
    type: 'investor'
  },
  meridiancontrarian: {
    name: 'Meridian Contrarian Fund',
    subtitle: 'James England',
    type: 'fund'
  },
  bobrinskoy: {
    name: 'Charles Bobrinskoy',
    subtitle: '',
    type: 'investor'
  },
  lou: {
    name: 'Norbert Lou',
    subtitle: 'Punch Card Management',
    type: 'investor'
  },
  munger: {
    name: 'Charlie Munger',
    subtitle: '',
    type: 'investor'
  },
  greenhaven: {
    name: 'Edgar Wachenheim III',
    subtitle: 'Greenhaven Associates',
    type: 'investor'
  },
  altarockpartners: {
    name: 'Mark Massey',
    subtitle: 'Altarock Partners',
    type: 'investor'
  },
  davis: {
    name: 'Christopher Davis',
    subtitle: 'Davis Selected Advisers',
    type: 'investor'
  },
  torray: {
    name: 'Robert Torray',
    subtitle: 'Torray Investment Partners',
    type: 'investor'
  },
  vinall: {
    name: 'Nick Sleep & Qais Zakaria',
    subtitle: 'Marathon Asset Management',
    type: 'investor'
  },
  karr: {
    name: 'Robert Karr',
    subtitle: 'Joho Capital',
    type: 'investor'
  },
  rolfe: {
    name: 'David Rolfe',
    subtitle: 'Wedgewood Partners',
    type: 'investor'
  },
  whitman: {
    name: 'Marty Whitman',
    subtitle: 'Third Avenue Management',
    type: 'investor'
  },
  train: {
    name: 'Michael Lindsell & Nick Train',
    subtitle: 'Lindsell Train Ltd',
    type: 'investor'
  },
  gregalexander: {
    name: 'Greg Alexander',
    subtitle: 'Conifer Management',
    type: 'investor'
  },
  bloomstran: {
    name: 'Chris Bloomstran',
    subtitle: 'Semper Augustus Investments Group',
    type: 'investor'
  },
  olstein: {
    name: 'Robert Olstein',
    subtitle: 'Olstein Capital Management',
    type: 'investor'
  },
  klarman: {
    name: 'Seth Klarman',
    subtitle: 'Baupost Group',
    type: 'investor'
  },


  ark_investment_management: {
    name: 'Catherine Wood',
    subtitle: 'ARK Investment Management',
    type: 'investor'
  },

  burn: {
    name: 'Harry Burn',
    subtitle: 'Sound Shore Management Inc',
    type: 'investor'
  },
  rochon: {
    name: 'Francois Rochon',
    subtitle: 'Giverny Capital',
    type: 'investor'
  },
  lilu: {
    name: 'Li Lu',
    subtitle: 'Himalaya Capital Management',
    type: 'investor'
  },
  einhorn: {
    name: 'David Einhorn',
    subtitle: 'Greenlight Capital',
    type: 'investor'
  },
  patientcapital: {
    name: 'Samantha McLemore',
    subtitle: 'Patient Capital Management',
    type: 'investor'
  },
  weitz: {
    name: 'Wallace Weitz',
    subtitle: 'Weitz Investment Management',
    type: 'investor'
  },
  watsa: {
    name: 'Prem Watsa',
    subtitle: 'Fairfax Financial Holdings',
    type: 'investor'
  },
  welling: {
    name: 'Glenn Welling',
    subtitle: 'Engaged Capital',
    type: 'investor'
  },
  sosin: {
    name: 'Clifford Sosin',
    subtitle: 'CAS Investment Partners',
    type: 'investor'
  },
  greenbrier: {
    name: 'Greenbrier Partners Capital Management',
    subtitle: '',
    type: 'investor'
  },
  berkowitz: {
    name: 'Bruce Berkowitz',
    subtitle: 'Fairholme Capital Management',
    type: 'investor'
  },
  bares: {
    name: 'Brian Bares',
    subtitle: 'Bares Capital Management',
    type: 'investor'
  },
  tarasoff: {
    name: 'Josh Tarasoff',
    subtitle: 'Greenlea Lane Capital',
    type: 'investor'
  },
  dorsey: {
    name: 'Pat Dorsey',
    subtitle: 'Dorsey Asset Management',
    type: 'investor'
  },
  rogers: {
    name: 'John Rogers',
    subtitle: 'Ariel Investments',
    type: 'investor'
  },
  ariel_appreciation: {
    name: 'Ariel Appreciation Fund',
    subtitle: 'John Rogers',
    type: 'fund'
  },
  ariel_focus: {
    name: 'Ariel Focus Fund',
    subtitle: 'Charles Bobrinskoy',
    type: 'fund'
  },
  tweedy_browne_fund_inc: {
    name: 'Tweedy, Browne International Value Fund II',
    subtitle: 'Currency Unhedged',
    type: 'fund'
  }
}

function getLatestData(slug: string) {
  const snapshots = holdingsHistory[slug]
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return { totalValue: 0, positionsCount: 0, lastUpdate: null }
  }
  
  const latest = snapshots[snapshots.length - 1]
  return {
    totalValue: latest.data.totalValue || latest.data.positions?.reduce((sum, p) => sum + p.value, 0) || 0,
    positionsCount: latest.data.positions?.length || 0,
    lastUpdate: latest.data.date
  }
}

export async function GET() {
  try {
    console.log('🚀 Calculating investors list data...')
    
    // Generate investor data with portfolio values
    const investorData = Object.keys(holdingsHistory)
      .map(slug => {
        const metadata = investorMetadata[slug] || { type: 'investor' as const }
        const data = getLatestData(slug)
        
        return {
          slug,
          name: metadata.name || slug.charAt(0).toUpperCase() + slug.slice(1),
          subtitle: metadata.subtitle || '',
          type: metadata.type,
          totalValue: data.totalValue,
          positionsCount: data.positionsCount,
          lastUpdate: data.lastUpdate
        }
      })
      .sort((a, b) => b.totalValue - a.totalValue) // Sort by portfolio size

    // Calculate statistics
    const stats = {
      total: investorData.length,
      investors: investorData.filter(i => i.type === 'investor').length,
      funds: investorData.filter(i => i.type === 'fund').length
    }

    const response = {
      investors: investorData,
      stats,
      lastUpdated: new Date().toISOString()
    }

    console.log(`✅ Investors list calculated: ${investorData.length} investors`)

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', // 1 hour cache, 1 day stale
      }
    })
    
  } catch (error) {
    console.error('❌ Error calculating investors list:', error)
    return NextResponse.json(
      { error: 'Failed to load investors list' },
      { status: 500 }
    )
  }
}