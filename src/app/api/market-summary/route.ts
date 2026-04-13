// API Route für AI-generierte Market Summary
// Primary: Finclue News Recap (RSS-basiert)
// Fallback: Perplexity API
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

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

    // Berechne Sentiment
    const positiveIndices = Object.values(markets).filter(m => m.positive).length
    const isBullish = positiveIndices >= 2

    // Top/Bottom Sektoren
    const sortedSectors = [...sectors].sort((a, b) => b.change - a.change)
    const topSector = sortedSectors[0]
    const bottomSector = sortedSectors[sortedSectors.length - 1]

    // ── PRIMARY: Finclue News Recap aus Supabase ──────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const today = new Date().toISOString().slice(0, 10)
        const hour = new Date().getHours()
        const type = hour < 14 ? 'morning' : 'evening'

        const { data: recap } = await supabase
          .from('news_recaps')
          .select('content_de, generated_at')
          .eq('type', type)
          .gte('generated_at', `${today}T00:00:00`)
          .order('generated_at', { ascending: false })
          .limit(1)
          .single()

        if (recap?.content_de) {
          // Extrahiere die ersten 2 Sätze des Marktüberblicks für den Dashboard-Summary
          const content = recap.content_de
          const overviewMatch = content.match(/\*\*Marktüberblick\*\*\s*\n([\s\S]*?)(?=\n\*\*|$)/)
          const overview = overviewMatch
            ? overviewMatch[1].trim()
            : content.split('\n').filter((l: string) => l.trim() && !l.startsWith('**') && !l.startsWith('#')).slice(0, 2).join(' ')

          if (overview && overview.length > 30) {
            // Extrahiere Quellen aus dem Recap (z.B. "[Handelsblatt]", "[Der Aktionär]")
            const sourceMatches = content.match(/\[([^\]]+)\]/g) || []
            const sources = [...new Set(sourceMatches.map((s: string) => s.replace(/[\[\]]/g, '')).filter((s: string) =>
              !['DAX', 'SPX', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'SAP', 'BTC', 'ETH', 'SPOT', 'COIN', 'KO', 'GS', 'DIS', 'NKE', 'LLY', 'CAT', 'V', 'MA'].includes(s)
            ))].slice(0, 4)

            console.log('[Market Summary] Using Finclue News Recap')
            return NextResponse.json({
              summary: overview,
              fullRecap: content,
              sources,
              isBullish,
              generated: true,
              source: 'finclue-news'
            }, {
              headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' }
            })
          }
        }
      } catch (e) {
        console.warn('[Market Summary] Finclue Recap not available, falling back to Perplexity')
      }
    }

    // ── FALLBACK: Perplexity API ────────────────────────────────────────
    const perplexityKey = process.env.PERPLEXITY_API_KEY

    if (!perplexityKey) {
      console.log('[Market Summary] No Perplexity API key, using fallback')
      return NextResponse.json({
        summary: generateFallbackSummary(isBullish, topSector, bottomSector),
        isBullish,
        generated: false
      })
    }

    // Prompt für Perplexity (mit Web-Suche)
    const prompt = `Die Märkte sind heute ${isBullish ? 'im Plus' : 'im Minus'}:
- S&P 500: ${markets.spx?.changePct >= 0 ? '+' : ''}${markets.spx?.changePct?.toFixed(2)}%
- NASDAQ: ${markets.ixic?.changePct >= 0 ? '+' : ''}${markets.ixic?.changePct?.toFixed(2)}%
- Dow Jones: ${markets.dji?.changePct >= 0 ? '+' : ''}${markets.dji?.changePct?.toFixed(2)}%
- DAX: ${markets.dax?.changePct >= 0 ? '+' : ''}${markets.dax?.changePct?.toFixed(2)}%

Stärkster Sektor: ${topSector?.sectorDE} (${topSector?.change >= 0 ? '+' : ''}${topSector?.change?.toFixed(2)}%)
Schwächster Sektor: ${bottomSector?.sectorDE} (${bottomSector?.change >= 0 ? '+' : ''}${bottomSector?.change?.toFixed(2)}%)

Schreibe ZWEI kurze Sätze (insgesamt max 45 Wörter) auf Deutsch:
1. Satz: Der HAUPTGRUND für die heutige US-Marktbewegung (z.B. Fed-Aussagen, Wirtschaftsdaten von HEUTE, Earnings, geopolitische News von HEUTE).
2. Satz: Wie reagiert der DAX darauf, oder welcher aktuelle europäische Faktor beeinflusst ihn HEUTE?

WICHTIG: Nenne NUR Ereignisse die HEUTE passiert sind und die Märkte DIREKT bewegen. Keine allgemeinen Hintergrundinformationen. Kein Markdown, keine Emojis, keine Aufzählungszeichen.`

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${perplexityKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',  // Hat Web-Zugriff für aktuelle Infos
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Finanzmarkt-Analyst. Antworte immer auf Deutsch, kurz und präzise. Nutze aktuelle Nachrichten um Marktbewegungen zu erklären.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 180
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Market Summary] Perplexity API error:', response.status, errorText)
      // Fallback auf statische Beschreibung
      return NextResponse.json({
        summary: generateFallbackSummary(isBullish, topSector, bottomSector),
        isBullish,
        generated: false
      })
    }

    const data = await response.json()
    let summary = data.choices?.[0]?.message?.content?.trim()

    // Cleanup: Entferne eventuelle Zitate/Quellen am Ende
    if (summary) {
      // Entferne [1], [2] etc. Quellenverweise
      summary = summary.replace(/\[\d+\]/g, '').trim()
      // Entferne trailing Punkte wenn mehrere
      summary = summary.replace(/\.{2,}$/, '.').trim()
    }

    if (!summary) {
      summary = generateFallbackSummary(isBullish, topSector, bottomSector)
    }

    return NextResponse.json({
      summary,
      isBullish,
      generated: true,
      source: 'perplexity'
    }, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' // 30 min cache
      }
    })

  } catch (error) {
    console.error('[Market Summary] Error:', error)
    return NextResponse.json({
      summary: 'Die wichtigsten Indizes zeigen gemischte Entwicklungen.',
      isBullish: true,
      generated: false
    })
  }
}

// Fallback-Summary basierend auf Sektor-Daten
function generateFallbackSummary(
  isBullish: boolean,
  topSector: SectorData | undefined,
  bottomSector: SectorData | undefined
): string {
  if (isBullish && topSector) {
    return `Die Märkte steigen, angeführt vom ${topSector.sectorDE}-Sektor mit ${topSector.change >= 0 ? '+' : ''}${topSector.change?.toFixed(1)}% Zuwachs.`
  } else if (!isBullish && bottomSector) {
    return `Die Märkte fallen aufgrund schwacher Performance im ${bottomSector.sectorDE}-Sektor mit ${bottomSector.change?.toFixed(1)}% Rückgang.`
  }
  return isBullish
    ? 'Die wichtigsten Indizes zeigen positive Entwicklungen.'
    : 'Die wichtigsten Indizes zeigen negative Entwicklungen.'
}
