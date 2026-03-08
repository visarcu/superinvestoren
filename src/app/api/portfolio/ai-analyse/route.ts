// src/app/api/portfolio/ai-analyse/route.ts
// Portfolio-wide AI analysis combining FMP data + Superinvestor activity + Perplexity news
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import holdingsHistory from '@/data/holdings'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const FMP_API_KEY = process.env.FMP_API_KEY!
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

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
    .select('is_premium')
    .eq('user_id', user.id)
    .single()

  if (!profile?.is_premium) return { error: 'Premium erforderlich', status: 403 }
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

// --- Superinvestor Overlap (inline, no API call needed) ---
function getSuperInvestorActivity(tickers: string[]): Record<string, { count: number; investors: { name: string; trend: string }[] }> {
  const tickerSet = new Set(tickers.map(t => t.toUpperCase()))
  const result: Record<string, { count: number; investors: { name: string; trend: string }[] }> = {}
  for (const t of tickerSet) result[t] = { count: 0, investors: [] }

  // CUSIP + Name indexes for ticker resolution
  const cusipIdx = new Map<string, string>()
  const nameIdx = new Map<string, string>()
  const NOISE = new Set(['INC', 'INCORPORATED', 'CORP', 'CORPORATION', 'CO', 'COMPANY', 'LTD', 'LIMITED', 'PLC', 'LP', 'LLC', 'NV', 'SA', 'AG', 'SE', 'THE', 'OF', 'AND', '&', 'A', 'AN', 'CLASS', 'CL', 'SHS', 'NEW', 'DEL', 'COM', 'ORD', 'SER', 'SERIES'])
  const ABBREVS: Record<string, string> = { 'HLDGS': 'HOLDINGS', 'CORP': 'CORPORATION', 'INC': 'INCORPORATED', 'INTL': 'INTERNATIONAL', 'TECH': 'TECHNOLOGY', 'TECHS': 'TECHNOLOGIES', 'GRP': 'GROUP', 'SVCS': 'SERVICES', 'FINL': 'FINANCIAL', 'MGMT': 'MANAGEMENT' }

  const nameKey = (name: string) => {
    const w = name.toUpperCase().replace(/[.,\-\/\\()&'"!]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ')
    return w.filter(x => !NOISE.has(x)).map(x => ABBREVS[x] || x).filter(x => !NOISE.has(x)).join('|')
  }
  for (const s of stocks) {
    if (s.cusip) cusipIdx.set(s.cusip, s.ticker)
    const k = nameKey(s.name)
    if (k) nameIdx.set(k, s.ticker)
  }
  const resolveTicker = (pos: any): string | null => {
    if (pos.ticker) return pos.ticker
    if (pos.cusip) { const t = cusipIdx.get(pos.cusip); if (t) return t }
    if (pos.name) { const k = nameKey(pos.name); if (k) { const t = nameIdx.get(k); if (t) return t } }
    return null
  }

  Object.entries(holdingsHistory).forEach(([slug, snapshots]) => {
    const inv = investors.find(i => i.slug === slug)
    if (!inv || !snapshots || snapshots.length === 0) return

    const latest = snapshots[snapshots.length - 1]?.data
    if (!latest?.positions) return

    const prev = snapshots.length >= 2 ? snapshots[snapshots.length - 2]?.data : null

    const holdsTickers = new Set<string>()
    for (const pos of latest.positions) {
      const t = resolveTicker(pos)
      if (!t || !tickerSet.has(t)) continue
      if ((pos.shares || 0) <= 0 || (pos.value || 0) < 100000) continue
      holdsTickers.add(t)
    }

    for (const ticker of holdsTickers) {
      let trend = 'hält'
      if (prev?.positions) {
        const curShares = latest.positions.filter((p: any) => resolveTicker(p) === ticker).reduce((s: number, p: any) => s + (p.shares || 0), 0)
        const prevShares = prev.positions.filter((p: any) => resolveTicker(p) === ticker).reduce((s: number, p: any) => s + (p.shares || 0), 0)
        if (prevShares === 0 && curShares > 0) trend = 'neu gekauft'
        else if (prevShares > 0) {
          const pct = ((curShares - prevShares) / prevShares) * 100
          if (pct > 5) trend = 'aufgestockt'
          else if (pct < -5) trend = 'reduziert'
        }
      }
      result[ticker].count++
      result[ticker].investors.push({ name: inv.name, trend })
    }
  })

  return result
}

// --- Perplexity News ---
async function fetchNewsForTickers(tickers: string[]): Promise<Record<string, string>> {
  if (!PERPLEXITY_API_KEY || tickers.length === 0) return {}

  const result: Record<string, string> = {}
  // Batch all tickers in one request for efficiency
  const tickerList = tickers.slice(0, 8).join(', ')

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Du bist ein Finanzmarkt-Analyst. Antworte auf Deutsch, präzise und faktenbasiert.' },
          {
            role: 'user',
            content: `Fasse für jede dieser Aktien die wichtigste aktuelle Nachricht der letzten Woche in EINEM Satz zusammen: ${tickerList}\n\nFormat: TICKER: Nachricht\n\nWenn es keine relevante Nachricht gibt, schreibe "Keine besonderen Nachrichten".`
          }
        ],
        temperature: 0.1,
        max_tokens: 800
      }),
      signal: AbortSignal.timeout(15000)
    })

    if (res.ok) {
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content || ''
      // Parse "TICKER: News" format
      const lines = content.replace(/\[\d+\]/g, '').split('\n').filter((l: string) => l.trim())
      for (const line of lines) {
        const match = line.match(/^[*-]?\s*\**([A-Z]{1,5})\**\s*:\s*(.+)/i)
        if (match) {
          const t = match[1].toUpperCase()
          result[t] = match[2].trim()
        }
      }
    }
  } catch (error) {
    console.error('Perplexity news error:', error)
  }

  return result
}

// --- GPT-4o Portfolio Analysis ---
async function generateAnalysis(
  holdings: PortfolioHolding[],
  quotes: Record<string, any>,
  profiles: Record<string, any>,
  siActivity: Record<string, { count: number; investors: { name: string; trend: string }[] }>,
  news: Record<string, string>
): Promise<any> {
  // Build context for GPT
  const positionsContext = holdings
    .sort((a, b) => b.value - a.value)
    .slice(0, 15) // Max 15 positions for context
    .map(h => {
      const q = quotes[h.symbol] || {}
      const p = profiles[h.symbol] || {}
      const si = siActivity[h.symbol] || { count: 0, investors: [] }
      const n = news[h.symbol] || 'Keine aktuellen News'

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

  const prompt = `Du bist ein erfahrener Portfolio-Analyst. Analysiere dieses Portfolio und bewerte jede Position.

PORTFOLIO-ÜBERBLICK:
- Gesamtwert: ${totalValue.toFixed(0)}€
- Positionen: ${holdings.length}
- Ø G/V: ${avgGainLoss >= 0 ? '+' : ''}${avgGainLoss.toFixed(1)}%

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

    // Fetch all data in parallel
    const [quotes, profiles, news] = await Promise.all([
      fetchQuotes(tickers),
      fetchProfiles(tickers),
      fetchNewsForTickers(tickers)
    ])

    // SI activity (sync, uses local data)
    const siActivity = getSuperInvestorActivity(tickers)

    // Generate GPT analysis
    const analysis = await generateAnalysis(holdings, quotes, profiles, siActivity, news)

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
