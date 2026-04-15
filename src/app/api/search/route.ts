import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')

  if (!query || query.length < 2) return NextResponse.json([])

  const apikey = process.env.FMP_API_KEY
  const encoded = encodeURIComponent(query)

  try {
    console.log(`🔍 Stock search for: "${query}"`)

    // Run both searches in parallel: general name search + ticker-specific search
    const [nameRes, tickerRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/search?query=${encoded}&limit=50&apikey=${apikey}`),
      fetch(`https://financialmodelingprep.com/api/v3/search-ticker?query=${encoded}&limit=10&apikey=${apikey}`),
    ])

    const [nameData, tickerData] = await Promise.all([
      nameRes.ok ? nameRes.json() : [],
      tickerRes.ok ? tickerRes.json() : [],
    ])

    const combined: Record<string, { symbol: string; name: string; exchangeShortName: string; stockExchange?: string }> = {}

    for (const item of [...(Array.isArray(nameData) ? nameData : []), ...(Array.isArray(tickerData) ? tickerData : [])]) {
      if (!item.symbol || !item.name) continue
      if (
        item.exchangeShortName === 'NASDAQ' ||
        item.exchangeShortName === 'NYSE' ||
        item.exchangeShortName === 'AMEX'
      ) {
        combined[item.symbol] = combined[item.symbol] ?? {
          symbol: item.symbol,
          name: item.name,
          stockExchange: item.stockExchange || item.exchange,
          exchangeShortName: item.exchangeShortName,
        }
      }
    }

    const q = query.toUpperCase()
    const results = Object.values(combined)

    results.sort((a, b) => {
      const score = (x: { symbol: string; name: string }) =>
        x.symbol.toUpperCase() === q ? 0
        : x.symbol.toUpperCase().startsWith(q) ? 1
        : x.name.toUpperCase().startsWith(q) ? 2
        : x.name.toUpperCase().includes(q) ? 3
        : 4
      return score(a) - score(b)
    })

    const out = results.slice(0, 10)
    console.log(`✅ Returning ${out.length} results, top: ${out[0]?.symbol}`)
    return NextResponse.json(out)

  } catch (error) {
    console.error('Stock search error:', error)
    return NextResponse.json([])
  }
}
