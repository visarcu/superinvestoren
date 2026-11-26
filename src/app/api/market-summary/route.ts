// API Route für die Marktzusammenfassung im Dashboard
// Primär: jüngster Finclue-Tagesbericht (news_recaps, Cron 07:01 und 17:01 UTC)
// Ersatz, falls der Bericht fehlt: Claude mit Websuche, höchstens einmal je halbe Stunde
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { calculateMarketSentiment } from '@/lib/marketSentiment'
import { allowPublicCall, clientIp } from '@/lib/ai/publicGuard'
import { webSearchText } from '@/lib/ai/webSearch'

// Im Normalbetrieb ist der jüngste Bericht höchstens 14 Stunden alt (17:01 bis
// 07:01 UTC), dazu Puffer für einen verspäteten Lauf.
const RECAP_MAX_AGE_MS = 18 * 60 * 60 * 1000

// Enthält Indizes (spx, ixic, dji, dax, stoxx) UND Rohstoffe/Crypto (btc, gold, ...)
type MarketData = Record<string, { price: number; changePct: number; positive: boolean } | undefined>

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

    // Sentiment – identische Berechnung wie im Dashboard (nur Leitindizes)
    const isBullish = calculateMarketSentiment(markets)?.isBullish ?? true

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
        // Morgen- oder Abendbericht, je nachdem welcher jünger ist. Früher galt nur
        // der Bericht des laufenden Halbtags, dazwischen (nachts, 15 bis 18 Uhr)
        // blieb die Karte leer.
        const since = new Date(Date.now() - RECAP_MAX_AGE_MS).toISOString()
        const { data: recap } = await supabase
          .from('news_recaps')
          .select('content_de, generated_at')
          .gte('generated_at', since)
          .order('generated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

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
              generatedAt: recap.generated_at,
              isBullish,
              generated: true,
              source: 'finclue-news'
            }, {
              headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' }
            })
          }
        }
      } catch (e) {
        console.warn('[Market Summary] Finclue Recap not available, falling back to web search')
      }
    }

    // ── ERSATZ: Claude mit Websuche ─────────────────────────────────────
    // Öffentliche Route: zusätzlich je Adresse gebremst, der eigentliche
    // Kostenschutz ist der Cache (ein Aufruf je halbe Stunde für alle Besucher).
    if (!allowPublicCall('market-summary', clientIp(request), 10, 30 * 60 * 1000)) {
      return NextResponse.json({
        summary: generateFallbackSummary(isBullish, topSector, bottomSector),
        isBullish,
        generated: false
      })
    }

    try {
      const summary = await loadWebSummary(halfHourSlot())
      return NextResponse.json({
        summary,
        isBullish,
        generated: true,
        source: 'web'
      }, {
        headers: { 'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800' }
      })
    } catch (e) {
      console.error('[Market Summary] Websuche fehlgeschlagen:', e instanceof Error ? e.message : e)
      return NextResponse.json({
        summary: generateFallbackSummary(isBullish, topSector, bottomSector),
        isBullish,
        generated: false
      })
    }

  } catch (error) {
    console.error('[Market Summary] Error:', error)
    return NextResponse.json({
      summary: 'Die wichtigsten Indizes zeigen gemischte Entwicklungen.',
      isBullish: true,
      generated: false
    })
  }
}

// Ersatztext aus der Websuche. Bewusst ohne Werte aus der Anfrage: Der Text
// landet im Cache und damit bei allen Besuchern. Der Schlüssel wechselt jede
// halbe Stunde, so kann nie ein alter Text als „heute“ erscheinen.
const loadWebSummary = unstable_cache(
  async (slot: string): Promise<string> => {
    const today = new Date(slot).toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin'
    })
    const text = await webSearchText({
      label: 'market-summary',
      system: 'Du bist ein Finanzmarkt-Analyst. Du antwortest auf Deutsch, kurz und nur mit belegbaren Fakten aus deiner Websuche.',
      prompt: `Heute ist ${today}. Schreibe ZWEI kurze Sätze (zusammen höchstens 45 Wörter):
1. Satz: der Hauptgrund für die heutige Bewegung am US-Aktienmarkt (zum Beispiel Notenbank, Wirtschaftsdaten, Quartalszahlen oder Geopolitik von heute).
2. Satz: wie der DAX heute läuft und welcher europäische Faktor ihn bewegt.
Ist ein Markt heute geschlossen oder noch nicht offen, nimm den letzten Handelstag und sag das. Nur die zwei Sätze, keine Einleitung, kein Markdown, keine Quellenangaben, keine Gedankenstriche.`,
      maxSearches: 2,
      maxTokens: 2000,
      timeoutMs: 40_000,
    })
    // Vorbemerkungen („Ich konnte nicht …“) stehen in eigenen Absätzen davor
    const lastParagraph = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).pop() ?? ''
    const summary = lastParagraph.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
    if (summary.length < 30) throw new Error('Websuche: Zusammenfassung zu kurz')
    return summary
  },
  ['market-summary-web-v1'],
  { revalidate: 60 * 60 }
)

function halfHourSlot(): string {
  const slotMs = 30 * 60 * 1000
  return new Date(Math.floor(Date.now() / slotMs) * slotMs).toISOString()
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
