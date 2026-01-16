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
    const prompt = `Du bist ein Finanzmarkt-Analyst. Basierend auf diesen aktuellen Marktdaten, schreibe ZWEI kurze, informative Sätze auf Deutsch (insgesamt max 40 Wörter).

MARKTDATEN:
- S&P 500: ${markets.spx?.changePct >= 0 ? '+' : ''}${markets.spx?.changePct?.toFixed(2)}%
- NASDAQ: ${markets.ixic?.changePct >= 0 ? '+' : ''}${markets.ixic?.changePct?.toFixed(2)}%
- DAX: ${markets.dax?.changePct >= 0 ? '+' : ''}${markets.dax?.changePct?.toFixed(2)}%
- Dow Jones: ${markets.dji?.changePct >= 0 ? '+' : ''}${markets.dji?.changePct?.toFixed(2)}%

TOP SEKTOR: ${topSector?.sectorDE} (${topSector?.change >= 0 ? '+' : ''}${topSector?.change?.toFixed(2)}%)
SCHWÄCHSTER SEKTOR: ${bottomSector?.sectorDE} (${bottomSector?.change >= 0 ? '+' : ''}${bottomSector?.change?.toFixed(2)}%)

GESAMTSTIMMUNG: ${isBullish ? 'Bullisch' : 'Bearisch'}

WICHTIG:
- Schreibe GENAU zwei Sätze
- Satz 1: Beschreibe die aktuelle Marktlage und welche Sektoren führen
- Satz 2: Gib Kontext oder erkläre mögliche Gründe für die Bewegungen
- Kein Markdown, keine Emojis, keine Aufzählungen
- Beispiel: "Die US-Märkte zeigen sich freundlich, angeführt von starken Tech-Werten. Defensive Sektoren wie Versorger profitieren von der Rotation aus zyklischen Werten."`

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
        max_tokens: 150
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
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' // 15 min cache
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
