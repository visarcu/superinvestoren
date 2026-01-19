// API Route für AI-generierte Stock News Summary
// Nutzt Perplexity API für aktuelle Web-Suche nach Aktien-News
import { NextResponse } from 'next/server'

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

export async function POST(request: Request) {
  try {
    const { ticker, companyName, price, changePct } = await request.json()

    if (!ticker) {
      return NextResponse.json(
        { error: 'Ticker required' },
        { status: 400 }
      )
    }

    const perplexityKey = process.env.PERPLEXITY_API_KEY

    // Fallback wenn kein Perplexity Key
    if (!perplexityKey) {
      console.log('[Stock News] No Perplexity API key, using fallback')
      return NextResponse.json({
        summary: null,
        generated: false,
        reason: 'no_api_key'
      })
    }

    const direction = changePct >= 0 ? 'steigt' : 'fällt'
    const changeStr = `${changePct >= 0 ? '+' : ''}${changePct?.toFixed(2)}%`

    // Prompt für Perplexity (mit Web-Suche)
    const prompt = `Die Aktie ${ticker} (${companyName || ticker}) ${direction} heute um ${changeStr}.

Fasse in 2-3 kurzen Sätzen (max 60 Wörter) auf Deutsch zusammen, was die AKTUELLEN Nachrichten zu ${ticker} sind und warum sich die Aktie heute so bewegt.

Fokussiere auf:
- Aktuelle Unternehmensnews (Earnings, Produkte, M&A, Management)
- Analystenbewertungen oder Kurszieländerungen
- Branchentrends die ${ticker} betreffen

WICHTIG: Nenne NUR aktuelle Nachrichten von HEUTE oder den letzten 1-2 Tagen. Keine allgemeinen Unternehmensbeschreibungen. Kein Markdown, keine Emojis, keine Aufzählungszeichen.`

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${perplexityKey}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Finanzmarkt-Analyst. Antworte immer auf Deutsch, kurz und präzise. Nutze aktuelle Nachrichten um Aktienbewegungen zu erklären.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Stock News] Perplexity API error:', response.status, errorText)
      return NextResponse.json({
        summary: null,
        generated: false,
        reason: 'api_error'
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
      return NextResponse.json({
        summary: null,
        generated: false,
        reason: 'empty_response'
      })
    }

    return NextResponse.json({
      summary,
      generated: true,
      generatedAt: new Date().toISOString(),
      source: 'perplexity'
    }, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600' // 30 min cache
      }
    })

  } catch (error) {
    console.error('[Stock News] Error:', error)
    return NextResponse.json({
      summary: null,
      generated: false,
      reason: 'error'
    })
  }
}
