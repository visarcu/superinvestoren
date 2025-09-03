// src/app/api/all-etfs/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const url = `https://financialmodelingprep.com/api/v3/etf/list?apikey=${process.env.FMP_API_KEY}`

  try {
    const res = await fetch(url)
    
    if (!res.ok) {
      console.error(`FMP ETF List API responded with ${res.status}`)
      return NextResponse.json([], { status: res.status })
    }

    const data = await res.json()
    
    // Filter and format for global ETFs (primarily US market)
    const formattedETFs = data
      .filter((etf: any) => {
        // Filter out penny stocks and ensure we have basic data
        return etf.price && etf.price > 5 && etf.name && !etf.name.includes('WARRANT')
      })
      .map((etf: any) => ({
        symbol: etf.symbol,
        name: etf.name,
        price: etf.price,
        issuer: extractIssuer(etf.name),
        assetClass: 'Equity', // Default, could be enhanced
        category: extractCategory(etf.name),
        ter: null, // Would need additional API call for TER
        marketCap: etf.marketCap || null,
        volume: etf.avgVolume || null,
        exchange: etf.exchange || 'US'
      }))
      .sort((a: any, b: any) => (b.marketCap || 0) - (a.marketCap || 0)) // Sort by market cap
    
    return NextResponse.json(formattedETFs)
    
  } catch (err) {
    console.error('All ETFs API error:', err)
    return NextResponse.json({ error: 'Failed to fetch ETFs' }, { status: 502 })
  }
}

function extractIssuer(name: string): string {
  // Extract issuer from ETF name
  if (name.includes('SPDR')) return 'State Street'
  if (name.includes('iShares')) return 'BlackRock'
  if (name.includes('Vanguard')) return 'Vanguard'
  if (name.includes('Invesco')) return 'Invesco'
  if (name.includes('First Trust')) return 'First Trust'
  if (name.includes('ProShares')) return 'ProShares'
  if (name.includes('VanEck')) return 'VanEck'
  if (name.includes('WisdomTree')) return 'WisdomTree'
  if (name.includes('Schwab')) return 'Charles Schwab'
  if (name.includes('Fidelity')) return 'Fidelity'
  
  // Try to extract from beginning of name
  const words = name.split(' ')
  if (words.length > 0) {
    return words[0]
  }
  
  return 'Sonstige'
}

function extractCategory(name: string): string {
  // Extract category from ETF name
  const nameLower = name.toLowerCase()
  
  if (nameLower.includes('s&p 500') || nameLower.includes('sp500')) return 'Large Cap'
  if (nameLower.includes('nasdaq') || nameLower.includes('technology')) return 'Technology'
  if (nameLower.includes('emerging') || nameLower.includes('em ')) return 'Emerging Markets'
  if (nameLower.includes('international') || nameLower.includes('world')) return 'International'
  if (nameLower.includes('bond') || nameLower.includes('treasury')) return 'Fixed Income'
  if (nameLower.includes('dividend')) return 'Dividend'
  if (nameLower.includes('growth')) return 'Growth'
  if (nameLower.includes('value')) return 'Value'
  if (nameLower.includes('small cap') || nameLower.includes('smallcap')) return 'Small Cap'
  if (nameLower.includes('mid cap') || nameLower.includes('midcap')) return 'Mid Cap'
  if (nameLower.includes('real estate') || nameLower.includes('reit')) return 'Real Estate'
  if (nameLower.includes('commodity') || nameLower.includes('gold') || nameLower.includes('oil')) return 'Commodities'
  
  return 'Broad Market'
}