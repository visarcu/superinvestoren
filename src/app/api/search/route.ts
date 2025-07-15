import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  
  if (!query) return NextResponse.json([])
  
  const url = `https://financialmodelingprep.com/api/v3/search?query=${query}&apikey=${process.env.FMP_API_KEY}`
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    return NextResponse.json(data.slice(0, 5))
  } catch (error) {
    return NextResponse.json([])
  }
}