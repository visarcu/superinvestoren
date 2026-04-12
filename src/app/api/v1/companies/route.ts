// Finclue Data API v1 – Companies List
// GET /api/v1/companies?page=1&pageSize=100

import { NextRequest, NextResponse } from 'next/server'

interface CompanyListItem {
  ticker: string
  name: string
  cik: string
  exchange: string
}

let cachedList: CompanyListItem[] | null = null
let cachedAt = 0
const CACHE_TTL = 24 * 60 * 60 * 1000

async function loadCompanyList(): Promise<CompanyListItem[]> {
  if (cachedList && Date.now() - cachedAt < CACHE_TTL) return cachedList

  // SEC company_tickers_exchange.json hat: CIK, Name, Ticker, Exchange
  const res = await fetch('https://www.sec.gov/files/company_tickers_exchange.json', {
    headers: { 'User-Agent': 'Finclue research@finclue.de' },
  })

  if (!res.ok) throw new Error(`SEC company list fetch failed: ${res.status}`)

  const data = await res.json()
  const fields: string[] = data.fields || []
  const rows: any[][] = data.data || []

  const cikIdx = fields.indexOf('cik')
  const nameIdx = fields.indexOf('name')
  const tickerIdx = fields.indexOf('ticker')
  const exchangeIdx = fields.indexOf('exchange')

  cachedList = rows
    .filter(row => row[exchangeIdx] && row[tickerIdx])
    .map(row => ({
      cik: String(row[cikIdx]),
      name: row[nameIdx] || '',
      ticker: row[tickerIdx] || '',
      exchange: row[exchangeIdx] || '',
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker))

  cachedAt = Date.now()
  return cachedList
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
  const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '100'), 1), 1000)
  const search = searchParams.get('search')?.toUpperCase()
  const exchange = searchParams.get('exchange')?.toUpperCase()

  try {
    let companies = await loadCompanyList()

    // Filter
    if (search) {
      companies = companies.filter(c =>
        c.ticker.includes(search) || c.name.toUpperCase().includes(search)
      )
    }
    if (exchange) {
      companies = companies.filter(c =>
        c.exchange.toUpperCase().includes(exchange)
      )
    }

    // Pagination
    const totalCount = companies.length
    const totalPages = Math.ceil(totalCount / pageSize)
    const start = (page - 1) * pageSize
    const pageData = companies.slice(start, start + pageSize)

    return NextResponse.json({
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      data: pageData,
      source: 'sec-edgar',
    }, {
      headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
