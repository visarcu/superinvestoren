// src/app/superinvestor/investors/page.tsx - MIT FILTER für Investoren/Fonds
'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import InvestorAvatar from '@/components/InvestorAvatar'
import InvestorCard from '@/components/InvestorCard'
import { ArrowTopRightOnSquareIcon, UserIcon, BuildingOffice2Icon, Squares2X2Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import holdingsHistory from '@/data/holdings'

// ✅ METADATA für bekannte Investoren/Fonds (clean, ohne descriptions)
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


  //

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
    name: 'Franchis Chou',
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

  // - 

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


// - 

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
    subtitle: 'CAS Investment Parners',
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

// ✅ AUTOMATISCHE Generierung + SORTIERUNG nach Portfolio-Größe
const investorData = Object.keys(holdingsHistory)
  .map(slug => {
    const metadata = investorMetadata[slug] || { type: 'investor' as const }
    const data = getLatestData(slug)
    
    return {
      slug,
      name: metadata.name || slug.charAt(0).toUpperCase() + slug.slice(1),
      subtitle: metadata.subtitle || '',
      type: metadata.type,
      totalValue: data.totalValue
    }
  })
  .sort((a, b) => b.totalValue - a.totalValue) // ✅ Sortiert nach Portfolio-Größe

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

function formatLargeNumber(value: number): string {
  if (value === 0) return '–'
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(1)} Mrd. $`
  } else if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(0)} Mio. $`
  } else if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(0)}K $`
  }
  return `${Math.round(value)} $`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–'
  try {
    const [year, month, day] = dateStr.split('-')
    return `${day}.${month}.${year}`
  } catch {
    return dateStr
  }
}

export default function InvestorsPage() {
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  // ✅ STATE für Filter + Suche
  const [filter, setFilter] = useState<'all' | 'investor' | 'fund'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid')

  // ✅ GEFILTERTE und GESUCHTE Daten
  const filteredInvestors = useMemo(() => {
    return investorData.filter(investor => {
      // Filter by type
      const matchesFilter = filter === 'all' || investor.type === filter
      
      // Filter by search query
      const matchesSearch = searchQuery === '' || 
        investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        investor.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesFilter && matchesSearch
    })
  }, [filter, searchQuery])

  // ✅ STATISTIKEN für Filter Buttons
  const stats = useMemo(() => {
    const investors = investorData.filter(i => i.type === 'investor').length
    const funds = investorData.filter(i => i.type === 'fund').length
    return { total: investorData.length, investors, funds }
  }, [])

    // FÜGE DIESEN useEffect HINZU:
    useEffect(() => {
      const timer = setTimeout(() => {
        setIsInitialLoad(false)
      }, 300)
      return () => clearTimeout(timer)
    }, [])

// Loading state with modern skeleton
if (isInitialLoad) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-24">
      {/* Header */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium backdrop-blur-sm mb-4">
            <UserIcon className="w-3 h-3" />
            Super-Investoren
          </div>
          
          <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4">
            Alle Investoren & Fonds
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Lade Investoren-Daten...
          </p>
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="bg-[#161618] rounded-2xl p-5 border border-white/[0.06] animate-pulse flex flex-col" style={{ width: '360px', height: '280px' }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full flex-shrink-0"></div>
                <div>
                  <div className="h-3 bg-gray-700 rounded w-24 mb-2"></div>
                  <div className="h-2 bg-gray-700 rounded w-16"></div>
                </div>
              </div>
              <div className="w-4 h-4 bg-gray-700 rounded flex-shrink-0"></div>
            </div>
            
            {/* Chart area */}
            <div className="h-16 mb-3 bg-gray-700/20 rounded"></div>
            
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <div className="h-2 bg-gray-700 rounded w-12 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-8"></div>
              </div>
              <div>
                <div className="h-2 bg-gray-700 rounded w-8 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-10"></div>
              </div>
              <div>
                <div className="h-2 bg-gray-700 rounded w-12 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-8"></div>
              </div>
            </div>
            
            {/* Holdings */}
            <div className="flex-1 min-h-0">
              <div className="h-2 bg-gray-700 rounded w-16 mb-2"></div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-2 bg-gray-700 rounded w-12"></div>
                  <div className="h-2 bg-gray-700 rounded w-8"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-2 bg-gray-700 rounded w-10"></div>
                  <div className="h-2 bg-gray-700 rounded w-6"></div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="pt-3 mt-auto border-t border-white/10 flex items-center justify-between">
              <div className="h-4 bg-gray-700 rounded w-16"></div>
              <div className="h-2 bg-gray-700 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-24">
      
       {/* Header */}
       <div className="mb-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-sm font-medium backdrop-blur-sm mb-4">
            <UserIcon className="w-3 h-3" />
            Super-Investoren
          </div>
          
          <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4">
            Alle Investoren & Fonds
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Entdecke die Portfolios der erfolgreichsten Investoren und Top-Performing Fonds der Welt
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-8">
          {/* Filter Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-green-500 text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4 inline mr-2" />
              Alle ({stats.total})
            </button>
            <button
              onClick={() => setFilter('investor')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === 'investor'
                  ? 'bg-green-500 text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4 inline mr-2" />
              Investoren ({stats.investors})
            </button>
            <button
              onClick={() => setFilter('fund')}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === 'fund'
                  ? 'bg-green-500 text-black'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <BuildingOffice2Icon className="w-4 h-4 inline mr-2" />
              Fonds ({stats.funds})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 justify-items-center">
        {filteredInvestors.map((investor) => (
          <InvestorCard
            key={investor.slug}
            investor={investor}
          />
        ))}
      </div>


      {/* No Results */}
      {filteredInvestors.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <MagnifyingGlassIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Keine Ergebnisse gefunden</h3>
            <p className="text-sm">
              {searchQuery ? 
                `Keine Investoren gefunden für "${searchQuery}"` : 
                'Keine Investoren für die aktuelle Filterauswahl'
              }
            </p>
          </div>
          {(searchQuery || filter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilter('all')
              }}
              className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded-xl font-medium transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>

)
}