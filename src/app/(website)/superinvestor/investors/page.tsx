// src/app/superinvestor/investors/page.tsx - MIT FILTER für Investoren/Fonds
'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import InvestorAvatar from '@/components/InvestorAvatar'
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
  // ✅ STATE für Filter + Suche
  const [filter, setFilter] = useState<'all' | 'investor' | 'fund'>('all')
  const [searchQuery, setSearchQuery] = useState('')

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      
      {/* ✅ Header Section - UNVERÄNDERT */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Alle Super-Investoren & Fonds
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Entdecke die Portfolios der erfolgreichsten Investoren und Top-Performing Fonds der Welt
          </p>
        </div>

        {/* ✅ SUCH-LEISTE */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Investor oder Fund suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-xl bg-gray-800/50 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* ✅ NEUER Filter Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1 bg-gray-800/50 border border-gray-700/50 rounded-xl p-1 backdrop-blur-sm">
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-green-500 text-black shadow-lg shadow-green-500/25'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Squares2X2Icon className="w-4 h-4" />
              Alle ({stats.total})
            </button>
            <button
              onClick={() => setFilter('investor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filter === 'investor'
                  ? 'bg-green-500 text-black shadow-lg shadow-green-500/25'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              Investoren ({stats.investors})
            </button>
            <button
              onClick={() => setFilter('fund')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filter === 'fund'
                  ? 'bg-green-500 text-black shadow-lg shadow-green-500/25'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <BuildingOffice2Icon className="w-4 h-4" />
              Fonds ({stats.funds})
            </button>
          </div>
        </div>
      </div>

      {/* ✅ GRID - verwendet gefilterte Daten */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInvestors.map((investor) => {
          const data = getLatestData(investor.slug)
          
          return (
            <Link
              key={investor.slug}
              href={`/superinvestor/${investor.slug}`}
              className="group block"
            >
              <div className="relative bg-gray-900/60 border border-gray-800 rounded-xl p-6 hover:bg-gray-900/80 hover:border-gray-700 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20">
                
                {/* ✅ TYPE Badge */}
                <div className="absolute top-4 right-4">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    investor.type === 'investor'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}>
                    {investor.type === 'investor' ? (
                      <UserIcon className="w-3 h-3" />
                    ) : (
                      <BuildingOffice2Icon className="w-3 h-3" />
                    )}
                    {investor.type === 'investor' ? 'Investor' : 'Fonds'}
                  </div>
                </div>

                {/* ✅ Header - UNVERÄNDERT */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <InvestorAvatar
                      name={investor.name}
                      imageUrl={`/images/${investor.slug}.png`}
                      size="lg"
                      className="ring-2 ring-gray-700/50 group-hover:ring-green-500/30 transition-all duration-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors duration-200 truncate">
                      {investor.name}
                    </h3>
                    <p className="text-sm text-gray-400 truncate">
                      {investor.subtitle}
                    </p>
                  </div>
                  <ArrowTopRightOnSquareIcon className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0" />
                </div>

                {/* ✅ Stats - MEHR PLATZ ohne Description */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Portfolio-Wert</p>
                    <p className="text-lg font-bold text-white">
                      {formatLargeNumber(data.totalValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Positionen</p>
                    <p className="text-lg font-bold text-white">
                      {data.positionsCount}
                    </p>
                  </div>
                </div>

                {/* ✅ Last Update - UNVERÄNDERT */}
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-500">
                    Aktualisiert: {formatDate(data.lastUpdate)}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ✅ EMPTY State für Filter/Suche */}
      {filteredInvestors.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Squares2X2Icon className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            Keine Ergebnisse gefunden
          </h3>
          <p className="text-gray-400">
            {searchQuery ? 
              `Keine Treffer für "${searchQuery}"` : 
              'Versuche einen anderen Filter'
            }
          </p>
          {(searchQuery || filter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilter('all')
              }}
              className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}
    </div>
  )
}