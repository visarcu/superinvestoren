// src/app/api/portfolio/ai-analyse/route.ts
// Portfolio-wide AI analysis combining FMP data + Superinvestor activity + News (Claude-Websuche)
import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { computeLookthrough, type LookthroughResult } from '@/lib/portfolio/lookthrough'
import { getSuperinvestorActivity } from '@/lib/superinvestorMatch'
import { hasPremiumAccess, PREMIUM_PROFILE_SELECT } from '@/lib/premiumAccess'
import { webSearchText } from '@/lib/ai/webSearch'

// Websuche für die News plus Analyse brauchen zusammen länger als eine Minute
export const maxDuration = 120

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const FMP_API_KEY = process.env.FMP_API_KEY!

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rate Limiting
const rateLimiter = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 5
const WINDOW_MS = 30 * 60 * 1000 // 30 min

interface PortfolioHolding {
  symbol: string
  quantity: number
  value: number
  gain_loss_percent: number
  // Für die Look-Through-Zerlegung (ältere Clients senden das noch nicht)
  name?: string
  isin?: string | null
}

// --- Auth ---
async function verifyPremium(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return { error: 'Nicht autorisiert', status: 401 }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { error: 'Ungültiger Token', status: 401 }

  const { data: profile } = await supabase
    .from('profiles')
    .select(PREMIUM_PROFILE_SELECT)
    .eq('user_id', user.id)
    .single()

  if (!hasPremiumAccess(profile)) return { error: 'Premium erforderlich', status: 403 }
  return { user }
}

// --- FMP Quotes (batch) ---
async function fetchQuotes(tickers: string[]): Promise<Record<string, any>> {
  try {
    const encoded = tickers.map(t => encodeURIComponent(t)).join(',')
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${encoded}?apikey=${FMP_API_KEY}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return {}
    const data = await res.json()
    const map: Record<string, any> = {}
    for (const q of data) {
      map[q.symbol] = q
    }
    return map
  } catch {
    return {}
  }
}

// --- FMP Profiles (batch) ---
async function fetchProfiles(tickers: string[]): Promise<Record<string, any>> {
  try {
    const encoded = tickers.map(t => encodeURIComponent(t)).join(',')
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${encoded}?apikey=${FMP_API_KEY}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (!res.ok) return {}
    const data = await res.json()
    const map: Record<string, any> = {}
    for (const p of data) {
      map[p.symbol] = p
    }
    return map
  } catch {
    return {}
  }
}

// Superinvestor-Overlap: gemeinsame Logik in lib/superinvestorMatch.ts
const getSuperInvestorActivity = getSuperinvestorActivity

// --- News per Claude-Websuche ---
// Eine Suche für die acht größten Positionen. Dieselben Positionen kosten innerhalb
// eines Sechs-Stunden-Fensters keinen zweiten Aufruf (Vercel-Datencache, über alle
// Instanzen). Das Fenster steckt im Schlüssel, damit nie Tage alte News erscheinen.
// Fehler und leere Antworten werfen, damit nichts Leeres gespeichert wird.
const NEWS_POSITIONS = 8
const NEWS_WINDOW_MS = 6 * 60 * 60 * 1000

const loadNews = unstable_cache(
  async (positions: { symbol: string; name: string }[], _window: number): Promise<Record<string, string>> => {
    const list = positions
      .map(p => (p.name && p.name !== p.symbol ? `${p.symbol} (${p.name})` : p.symbol))
      .join('\n')
    const text = await webSearchText({
      label: 'depot-news',
      system: 'Du bist ein Finanzmarkt-Analyst. Du antwortest auf Deutsch, knapp und nur mit belegbaren Fakten aus deiner Websuche.',
      prompt: `Suche für jedes dieser Wertpapiere die wichtigste Nachricht der letzten sieben Tage und fasse sie in EINEM Satz zusammen:
${list}

Antworte ausschließlich mit einer Zeile je Wertpapier im Format
SYMBOL: Satz
mit genau dem Symbol aus der Liste. Bei ETFs oder wenn es keine relevante Nachricht gibt, schreibe "SYMBOL: Keine besonderen Nachrichten". Keine Einleitung, kein Markdown, keine Quellenangaben im Text, keine Gedankenstriche.`,
      maxSearches: 5,
      maxTokens: 4000,
      timeoutMs: 45_000,
    })
    const news = parseNewsLines(text, positions.map(p => p.symbol))
    if (Object.keys(news).length === 0) throw new Error('Websuche: keine News-Zeile erkannt')
    return news
  },
  ['portfolio-ai-news-v1'],
  { revalidate: NEWS_WINDOW_MS / 1000 }
)

/** „SYMBOL: Satz“-Zeilen, nur für Symbole aus der Anfrage */
function parseNewsLines(text: string, symbols: string[]): Record<string, string> {
  const known = new Map(symbols.map(s => [s.toUpperCase(), s]))
  const result: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const match = line.trim().match(/^[-*•\s]*\**([A-Za-z0-9.^\-]{1,15})\**\s*:\s*(.+)$/)
    if (!match) continue
    const symbol = known.get(match[1].toUpperCase())
    const sentence = match[2].replace(/\*\*/g, '').trim()
    if (!symbol || !sentence || /^keine (besonderen|relevanten|aktuellen)/i.test(sentence)) continue
    result[symbol] = sentence
  }
  return result
}

async function fetchNewsForHoldings(holdings: PortfolioHolding[]): Promise<Record<string, string>> {
  const positions = [...holdings]
    .sort((a, b) => b.value - a.value)
    .slice(0, NEWS_POSITIONS)
    .map(h => ({
      symbol: h.symbol.toUpperCase().slice(0, 15),
      // Name kommt aus der Anfrage: kurz und einzeilig in den Prompt
      name: (h.name || h.symbol).replace(/\s+/g, ' ').trim().slice(0, 60),
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
  if (positions.length === 0) return {}
  try {
    return await loadNews(positions, Math.floor(Date.now() / NEWS_WINDOW_MS))
  } catch (error) {
    console.error('Portfolio AI-Analyse: News nicht verfügbar:', error instanceof Error ? error.message : error)
    return {}
  }
}

// --- Look-Through-Kontext für den Prompt ---
// Das effektive Portfolio (ETFs zerlegt) macht die Analyse substanziell besser:
// das Modell sieht Klumpenrisiken und Doppelungen, die die Positionsliste versteckt.
function buildLookthroughContext(lt: LookthroughResult): string {
  if (lt.etfCoverage.length === 0) return ''

  const topEff = lt.topExposures
    .slice(0, 8)
    .map(e => {
      const via = e.etfCount > 0
        ? e.directValue > 0
          ? `direkt + in ${e.etfCount} ETFs`
          : `in ${e.etfCount} ETFs`
        : 'direkt'
      return `  - ${e.name}: effektiv ${e.percent.toFixed(1)}% (${via})`
    })
    .join('\n')

  const regions = lt.regions.slice(0, 5).map(r => `${r.label} ${r.percent.toFixed(0)}%`).join(', ')
  const sectors = lt.sectors.slice(0, 5).map(s => `${s.label} ${s.percent.toFixed(0)}%`).join(', ')
  const sizes = lt.sizeExposure
    ? lt.sizeExposure.slices.map(s => `${s.label.split(' (')[0]} ${s.percent.toFixed(0)}%`).join(', ') +
      (lt.sizeExposure.weightedPE ? ` · gewichtetes KGV ${lt.sizeExposure.weightedPE.toFixed(1)}` : '')
    : ''
  const overlaps = lt.overlaps
    .filter(o => o.overlapPercent >= 25)
    .slice(0, 3)
    .map(o => `  - ${o.nameA} × ${o.nameB}: ${o.overlapPercent.toFixed(0)}% Überschneidung`)
    .join('\n')

  return `
EFFEKTIVES PORTFOLIO (Look-Through — ETFs in Einzelaktien zerlegt, deckt ${lt.coveragePercent.toFixed(0)}% des Depotwerts ab):
Effektive Top-Positionen (Direktbestand + ETF-Anteile zusammengerechnet):
${topEff}
Regionen: ${regions}
Sektoren: ${sectors}${sizes ? `\nGrößenklassen: ${sizes}` : ''}${overlaps ? `\nETF-Überschneidungen:\n${overlaps}` : ''}`
}

// --- GPT-4o Portfolio Analysis ---
async function generateAnalysis(
  holdings: PortfolioHolding[],
  quotes: Record<string, any>,
  profiles: Record<string, any>,
  siActivity: Record<string, { count: number; investors: { name: string; trend: string }[] }>,
  news: Record<string, string>,
  lookthrough: LookthroughResult | null
): Promise<any> {
  // Build context for GPT
  const positionsContext = holdings
    .sort((a, b) => b.value - a.value)
    .slice(0, 15) // Max 15 positions for context
    .map(h => {
      const q = quotes[h.symbol] || {}
      const p = profiles[h.symbol] || {}
      const si = siActivity[h.symbol] || { count: 0, investors: [] }
      const n = news[h.symbol.toUpperCase()] || 'Keine aktuellen News'

      const siSummary = si.count > 0
        ? `${si.count} Superinvestoren (${si.investors.slice(0, 3).map(i => `${i.name}: ${i.trend}`).join(', ')})`
        : 'Keine Superinvestoren'

      return `- ${h.symbol} (${p.companyName || h.symbol}):
  Wert: ${h.value.toFixed(0)}€, G/V: ${h.gain_loss_percent >= 0 ? '+' : ''}${h.gain_loss_percent.toFixed(1)}%
  KGV: ${q.pe?.toFixed(1) || 'N/A'}, MarketCap: ${q.marketCap ? (q.marketCap / 1e9).toFixed(1) + 'B' : 'N/A'}
  52W-Hoch: ${q.yearHigh?.toFixed(2) || 'N/A'}, 52W-Tief: ${q.yearLow?.toFixed(2) || 'N/A'}
  Kursänderung 1J: ${q.priceAvg200 ? ((q.price / q.priceAvg200 - 1) * 100).toFixed(1) + '%' : 'N/A'}
  Sektor: ${p.sector || 'N/A'}
  SI: ${siSummary}
  News: ${n}`
    }).join('\n\n')

  const totalValue = holdings.reduce((s, h) => s + h.value, 0)
  const avgGainLoss = holdings.length > 0
    ? holdings.reduce((s, h) => s + h.gain_loss_percent, 0) / holdings.length
    : 0

  const lookthroughContext = lookthrough ? buildLookthroughContext(lookthrough) : ''

  const prompt = `Du bist ein erfahrener Portfolio-Analyst. Analysiere dieses Portfolio und bewerte jede Position.

PORTFOLIO-ÜBERBLICK:
- Gesamtwert: ${totalValue.toFixed(0)}€
- Positionen: ${holdings.length}
- Ø G/V: ${avgGainLoss >= 0 ? '+' : ''}${avgGainLoss.toFixed(1)}%
${lookthroughContext}

POSITIONEN:
${positionsContext}

AUFGABE:
Analysiere das Portfolio und gib eine strukturierte JSON-Antwort mit diesen Feldern:

{
  "portfolioScore": <1-100, Gesamtbewertung>,
  "portfolioVerdict": "<2-3 Sätze Gesamteinschätzung>",
  "positions": [
    {
      "ticker": "<Symbol>",
      "signal": "bullish" | "neutral" | "bearish",
      "score": <1-100>,
      "reason": "<2-3 Sätze Begründung>",
      "superInvestorActivity": "<Kurze SI-Zusammenfassung>",
      "newsHighlight": "<Wichtigste News in einem Satz>"
    }
  ],
  "topInsight": "<Wichtigste Beobachtung zum Portfolio, 1-2 Sätze>"
}

REGELN:
- Bewerte JEDE Position einzeln
- Berücksichtige KGV, Sektor-Diversifikation, SI-Aktivität und News
- Wenn ein EFFEKTIVES PORTFOLIO (Look-Through) angegeben ist: Nutze es für portfolioVerdict und topInsight. Effektive Klumpenrisiken (eine Aktie direkt UND über ETFs), hohe ETF-Überschneidungen und Regionen-/Sektor-Konzentration sind wichtiger als die nominale Positionsliste
- Wenn viele SI kaufen → eher bullish, wenn viele verkaufen → eher bearish
- Sei direkt und konkret, keine Floskeln
- Antworte NUR mit dem JSON-Objekt, kein anderer Text
- Antworte auf Deutsch
- WICHTIG: Gib KEINE konkreten Kauf-, Verkaufs- oder Handlungsempfehlungen. Keine Formulierungen wie "Erwägen Sie zu kaufen/verkaufen", "Position erhöhen/reduzieren", "sollten Sie..." oder ähnliches. Stattdessen NUR neutrale Beobachtungen und Einordnungen liefern (z.B. "Die Bewertung liegt über dem Branchendurchschnitt", "Mehrere Superinvestoren haben ihre Position verändert"). Dies ist eine rein informative Analyse, keine Anlageberatung.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Du bist ein erfahrener deutscher Portfolio-Analyst. Antworte ausschließlich mit validem JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    }),
    signal: AbortSignal.timeout(60000)
  })

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || '{}'
  return JSON.parse(content)
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const now = Date.now()
    const userLimit = rateLimiter.get(ip)
    if (userLimit && now < userLimit.resetTime && userLimit.count >= RATE_LIMIT) {
      return NextResponse.json({ error: `Max ${RATE_LIMIT} Analysen pro 30 Min.` }, { status: 429 })
    }
    if (!userLimit || now > (userLimit?.resetTime || 0)) {
      rateLimiter.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    } else {
      userLimit.count++
    }

    // Auth
    const auth = await verifyPremium(request)
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Parse holdings
    const { holdings } = await request.json() as { holdings: PortfolioHolding[] }
    if (!holdings || holdings.length === 0) {
      return NextResponse.json({ error: 'Keine Positionen' }, { status: 400 })
    }

    const tickers = holdings.map(h => h.symbol.toUpperCase())
    console.log(`🤖 Portfolio AI-Analyse: ${tickers.length} Positionen`)

    // Fetch all data in parallel — Look-Through darf die Analyse nie blockieren
    const [quotes, profiles, news, lookthrough] = await Promise.all([
      fetchQuotes(tickers),
      fetchProfiles(tickers),
      fetchNewsForHoldings(holdings),
      computeLookthrough(
        holdings.map(h => ({
          symbol: h.symbol,
          name: h.name || h.symbol,
          isin: h.isin || null,
          value: h.value,
        }))
      ).catch(err => {
        console.error('Lookthrough für AI-Analyse fehlgeschlagen:', err)
        return null
      }),
    ])

    // SI activity (sync, uses local data)
    const siActivity = getSuperInvestorActivity(tickers)

    // Generate GPT analysis
    const analysis = await generateAnalysis(holdings, quotes, profiles, siActivity, news, lookthrough)

    console.log(`✅ Portfolio AI-Analyse fertig: Score ${analysis.portfolioScore}/100`)

    return NextResponse.json({
      success: true,
      ...analysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Portfolio AI-Analyse Error:', error)
    return NextResponse.json(
      { error: 'Analyse konnte nicht erstellt werden' },
      { status: 500 }
    )
  }
}
