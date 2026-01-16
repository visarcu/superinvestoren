// API Route für AI-generierte Market Summary
import { NextResponse } from 'next/server'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

interface MarketData {
  spx: { price: number; changePct: number; positive: boolean }
  ixic: { price: number; changePct: number; positive: boolean }
  dax: { price: number; changePct: number; positive: boolean }
  dji: { price: number; changePct: number; positive: boolean }
}

interface SectorData {
  sector: string
  sectorDE: string
  change: number
}

export async function POST(request: Request) {
  try {
    const { markets, sectors } = await request.json() as {
      markets: MarketData
      sectors: SectorData[]
    }

    if (!markets || !sectors) {
      return NextResponse.json(
        { error: 'Markets and sectors data required' },
        { status: 400 }
      )
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Berechne Sentiment
    const positiveIndices = Object.values(markets).filter(m => m.positive).length
    const isBullish = positiveIndices >= 2

    // Top/Bottom Sektoren
    const sortedSectors = [...sectors].sort((a, b) => b.change - a.change)
    const topSector = sortedSectors[0]
    const bottomSector = sortedSectors[sortedSectors.length - 1]

    // Prompt für OpenAI
    const prompt = `Du bist ein Finanzmarkt-Analyst. Basierend auf diesen aktuellen Marktdaten, schreibe EINEN kurzen, informativen Satz (max 25 Wörter) auf Deutsch der erklärt WARUM die Märkte heute so performen.

MARKTDATEN:
- S&P 500: ${markets.spx?.changePct >= 0 ? '+' : ''}${markets.spx?.changePct?.toFixed(2)}%
- NASDAQ: ${markets.ixic?.changePct >= 0 ? '+' : ''}${markets.ixic?.changePct?.toFixed(2)}%
- DAX: ${markets.dax?.changePct >= 0 ? '+' : ''}${markets.dax?.changePct?.toFixed(2)}%
- Dow Jones: ${markets.dji?.changePct >= 0 ? '+' : ''}${markets.dji?.changePct?.toFixed(2)}%

TOP SEKTOR: ${topSector?.sectorDE} (${topSector?.change >= 0 ? '+' : ''}${topSector?.change?.toFixed(2)}%)
SCHWÄCHSTER SEKTOR: ${bottomSector?.sectorDE} (${bottomSector?.change >= 0 ? '+' : ''}${bottomSector?.change?.toFixed(2)}%)

GESAMTSTIMMUNG: ${isBullish ? 'Bullisch' : 'Bearisch'}

WICHTIG:
- Schreibe NUR einen Satz
- Erkläre das "Warum" nicht nur das "Was"
- Nenne konkrete Gründe wenn möglich (z.B. Sektor-Stärke, Tech-Rally, etc.)
- Kein Markdown, keine Emojis
- Beispiel-Stil: "Die Indizes steigen getrieben von Tech-Werten, während der Energiesektor schwächelt."`

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 100
      })
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status)
      // Fallback auf statische Beschreibung
      return NextResponse.json({
        summary: isBullish
          ? 'Die wichtigsten Indizes zeigen positive Entwicklungen.'
          : 'Die wichtigsten Indizes zeigen negative Entwicklungen.',
        isBullish,
        generated: false
      })
    }

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content?.trim() ||
      (isBullish
        ? 'Die wichtigsten Indizes zeigen positive Entwicklungen.'
        : 'Die wichtigsten Indizes zeigen negative Entwicklungen.')

    return NextResponse.json({
      summary,
      isBullish,
      generated: true
    }, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' // 30 min cache
      }
    })

  } catch (error) {
    console.error('Market summary error:', error)
    return NextResponse.json({
      summary: 'Die wichtigsten Indizes zeigen gemischte Entwicklungen.',
      isBullish: true,
      generated: false
    })
  }
}
