// app/api/earnings-transcripts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const FMP_API_KEY = process.env.FMP_API_KEY

// Supabase Client mit Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Memory Cache für schnelle Wiederholungsabfragen (1 Stunde)
const memoryCache = new Map<string, { data: any; timestamp: number }>()
const MEMORY_CACHE_DURATION = 60 * 60 * 1000 // 1 Stunde

interface Transcript {
  symbol: string
  quarter: number
  year: number
  date: string
  content: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const ticker = searchParams.get('ticker')?.toUpperCase()
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  try {
    // 1. Lade alle Transcripts aus Supabase für diesen Ticker
    const { data: dbTranscripts, error: dbError } = await supabaseAdmin
      .from('earnings_transcripts')
      .select('ticker, year, quarter, date, content')
      .eq('ticker', ticker)
      .order('date', { ascending: false })
      .limit(limit)

    if (dbError) {
      console.error('Supabase error:', dbError)
    }

    // 2. Hole das neueste Transcript von FMP (um neue zu entdecken)
    const memoryCacheKey = `fmp-${ticker}`
    let fmpTranscripts: Transcript[] = []

    const cached = memoryCache.get(memoryCacheKey)
    if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_DURATION) {
      fmpTranscripts = cached.data
    } else {
      try {
        const fmpResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/earning_call_transcript/${ticker}?apikey=${FMP_API_KEY}`
        )

        if (fmpResponse.ok) {
          const fmpData = await fmpResponse.json()
          fmpTranscripts = Array.isArray(fmpData) ? fmpData : [fmpData]
          memoryCache.set(memoryCacheKey, { data: fmpTranscripts, timestamp: Date.now() })

          // 3. Speichere neue Transcripts in Supabase
          for (const transcript of fmpTranscripts) {
            if (transcript && transcript.content) {
              await saveTranscriptToSupabase(transcript)
            }
          }
        }
      } catch (fmpError) {
        console.error('FMP API error:', fmpError)
        // Weiter mit DB-Daten
      }
    }

    // 4. Kombiniere DB + FMP Daten (DB hat Priorität, FMP fügt neue hinzu)
    const transcriptMap = new Map<string, any>()

    // Erst DB-Transcripts (historisch)
    if (dbTranscripts) {
      for (const t of dbTranscripts) {
        const key = `${t.year}-Q${t.quarter}`
        transcriptMap.set(key, {
          symbol: t.ticker,
          quarter: t.quarter,
          year: t.year,
          date: t.date,
          content: t.content
        })
      }
    }

    // Dann FMP-Transcripts (falls neue)
    for (const t of fmpTranscripts) {
      if (t && t.content) {
        const key = `${t.year}-Q${t.quarter}`
        if (!transcriptMap.has(key)) {
          transcriptMap.set(key, t)
        }
      }
    }

    // 5. Sortiere nach Datum (neueste zuerst)
    const allTranscripts = Array.from(transcriptMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)

    if (allTranscripts.length === 0) {
      return NextResponse.json({ error: 'No transcripts found' }, { status: 404 })
    }

    return NextResponse.json(allTranscripts)

  } catch (error: any) {
    console.error('Error fetching earnings transcripts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings transcripts', details: error.message },
      { status: 500 }
    )
  }
}

// Hilfsfunktion: Transcript in Supabase speichern
async function saveTranscriptToSupabase(transcript: Transcript) {
  try {
    const { error } = await supabaseAdmin
      .from('earnings_transcripts')
      .upsert({
        ticker: transcript.symbol.toUpperCase(),
        year: transcript.year,
        quarter: transcript.quarter,
        date: transcript.date,
        content: transcript.content
      }, {
        onConflict: 'ticker,year,quarter'
      })

    if (error) {
      // Ignoriere Duplikat-Fehler
      if (!error.message.includes('duplicate') && !error.code?.includes('23505')) {
        console.error('Error saving transcript:', error)
      }
    } else {
      console.log(`✅ Saved transcript: ${transcript.symbol} Q${transcript.quarter} ${transcript.year}`)
    }
  } catch (err) {
    console.error('Error in saveTranscriptToSupabase:', err)
  }
}

// POST endpoint für manuelle Abfragen
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { ticker, type = 'earnings' } = body

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  try {
    let endpoint = ''

    switch(type) {
      case 'earnings':
        endpoint = `https://financialmodelingprep.com/api/v3/earning_call_transcript/${ticker}?apikey=${FMP_API_KEY}`
        break
      case 'press':
        endpoint = `https://financialmodelingprep.com/api/v3/press-releases/${ticker}?apikey=${FMP_API_KEY}`
        break
      case 'news':
        endpoint = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${ticker}&limit=50&apikey=${FMP_API_KEY}`
        break
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const response = await fetch(endpoint)

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error: any) {
    console.error(`Error fetching ${type}:`, error)
    return NextResponse.json(
      { error: `Failed to fetch ${type}`, details: error.message },
      { status: 500 }
    )
  }
}
