// src/app/api/ai-analyse/route.ts - AI-powered DCF Analysis API
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const FMP_API_KEY = process.env.FMP_API_KEY!

// Rate Limiting
const rateLimiter = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10 // 10 analyses per 15 minutes
const WINDOW_MS = 15 * 60 * 1000

interface FinancialData {
  profile: any
  quote: any
  incomeStatements: any[]
  balanceSheets: any[]
  cashFlowStatements: any[]
  keyMetrics: any[]
  ratios: any[]
}

// Fetch all required financial data from FMP
async function fetchFinancialData(ticker: string): Promise<FinancialData | null> {
  try {
    console.log(`📊 Fetching financial data for ${ticker}`)

    const [
      profileRes,
      quoteRes,
      incomeRes,
      balanceRes,
      cashFlowRes,
      metricsRes,
      ratiosRes
    ] = await Promise.allSettled([
      fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(10000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(10000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=5&apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(10000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?limit=5&apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(10000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?limit=5&apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(10000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?limit=5&apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(10000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/ratios/${ticker}?limit=5&apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(10000)
      })
    ])

    const results = await Promise.allSettled([
      profileRes.status === 'fulfilled' && profileRes.value.ok ? profileRes.value.json() : null,
      quoteRes.status === 'fulfilled' && quoteRes.value.ok ? quoteRes.value.json() : null,
      incomeRes.status === 'fulfilled' && incomeRes.value.ok ? incomeRes.value.json() : null,
      balanceRes.status === 'fulfilled' && balanceRes.value.ok ? balanceRes.value.json() : null,
      cashFlowRes.status === 'fulfilled' && cashFlowRes.value.ok ? cashFlowRes.value.json() : null,
      metricsRes.status === 'fulfilled' && metricsRes.value.ok ? metricsRes.value.json() : null,
      ratiosRes.status === 'fulfilled' && ratiosRes.value.ok ? ratiosRes.value.json() : null
    ])

    const [profile, quote, income, balance, cashFlow, metrics, ratios] = results.map(r =>
      r.status === 'fulfilled' ? r.value : null
    )

    if (!profile?.[0] || !quote?.[0]) {
      console.error(`❌ Could not fetch basic data for ${ticker}`)
      return null
    }

    return {
      profile: profile[0],
      quote: quote[0],
      incomeStatements: income || [],
      balanceSheets: balance || [],
      cashFlowStatements: cashFlow || [],
      keyMetrics: metrics || [],
      ratios: ratios || []
    }
  } catch (error) {
    console.error(`❌ Error fetching financial data for ${ticker}:`, error)
    return null
  }
}

// Build the DCF analysis prompt with real financial data
function buildDCFPrompt(data: FinancialData): string {
  const { profile, quote, incomeStatements, balanceSheets, cashFlowStatements, keyMetrics, ratios } = data

  // Format financial history table
  const financialHistory = incomeStatements.slice(0, 5).map((inc, i) => {
    const cf = cashFlowStatements[i] || {}
    const year = inc.calendarYear || inc.date?.split('-')[0] || 'N/A'
    const revenue = inc.revenue ? (inc.revenue / 1e9).toFixed(2) : 'N/A'
    const netIncome = inc.netIncome ? (inc.netIncome / 1e9).toFixed(2) : 'N/A'
    const fcf = cf.freeCashFlow ? (cf.freeCashFlow / 1e9).toFixed(2) : 'N/A'
    return `${year} | $${revenue}B | $${netIncome}B | $${fcf}B`
  }).join('\n')

  // Get latest ratios
  const latestRatios = ratios[0] || {}
  const latestMetrics = keyMetrics[0] || {}
  const latestBalance = balanceSheets[0] || {}
  const latestCashFlow = cashFlowStatements[0] || {}

  // Calculate key metrics
  const sharesOutstanding = quote.sharesOutstanding || latestBalance.commonStock || 0
  const totalDebt = latestBalance.totalDebt || 0
  const cash = latestBalance.cashAndCashEquivalents || 0
  const beta = profile.beta || 1.0

  const prompt = `Du bist ein erfahrener Aktienanalyst. Erstelle eine professionelle DCF-Bewertung.

=== UNTERNEHMENSDATEN ===
Unternehmen: ${profile.companyName}
Ticker: ${profile.symbol}
Sektor: ${profile.sector || 'N/A'}
Branche: ${profile.industry || 'N/A'}
Aktueller Kurs: ${quote.price?.toFixed(2) || 'N/A'} USD
Marktkapitalisierung: ${quote.marketCap ? (quote.marketCap / 1e9).toFixed(2) + 'B USD' : 'N/A'}

=== FINANZDATEN (letzte 5 Jahre) ===
Geschäftsjahr | Umsatz | Net Income | Free Cash Flow
${financialHistory}

=== KENNZAHLEN (aktuell) ===
- KGV: ${latestRatios.priceEarningsRatio?.toFixed(2) || quote.pe?.toFixed(2) || 'N/A'}
- KUV: ${latestRatios.priceToSalesRatio?.toFixed(2) || 'N/A'}
- KBV: ${latestRatios.priceToBookRatio?.toFixed(2) || 'N/A'}
- Gross Margin: ${latestRatios.grossProfitMargin ? (latestRatios.grossProfitMargin * 100).toFixed(1) : 'N/A'}%
- Net Margin: ${latestRatios.netProfitMargin ? (latestRatios.netProfitMargin * 100).toFixed(1) : 'N/A'}%
- ROE: ${latestRatios.returnOnEquity ? (latestRatios.returnOnEquity * 100).toFixed(1) : 'N/A'}%
- ROIC: ${latestMetrics.roic ? (latestMetrics.roic * 100).toFixed(1) : 'N/A'}%
- Debt/Equity: ${latestRatios.debtEquityRatio?.toFixed(2) || 'N/A'}
- Current Ratio: ${latestRatios.currentRatio?.toFixed(2) || 'N/A'}
- Beta: ${beta.toFixed(2)}

=== AKTIEN & BILANZ ===
- Shares Outstanding: ${sharesOutstanding ? (sharesOutstanding / 1e9).toFixed(3) + 'B' : 'N/A'}
- Total Debt: ${totalDebt ? (totalDebt / 1e9).toFixed(2) + 'B USD' : 'N/A'}
- Cash & Equivalents: ${cash ? (cash / 1e9).toFixed(2) + 'B USD' : 'N/A'}

=== AUFGABE ===

Erstelle eine strukturierte Analyse mit folgenden Abschnitten:

## 1. Unternehmensprofil
Kurze Beschreibung des Geschäftsmodells und der Wettbewerbsposition (2-3 Sätze).

## 2. Finanzielle Stärke
Bewerte die finanzielle Gesundheit basierend auf den Kennzahlen. Was sind Stärken, was sind Schwächen?

## 3. DCF-Bewertung

Berechne den fairen Wert mit folgenden Annahmen:
- Risk-Free Rate: 4.5%
- Equity Risk Premium: 5.0%
- Beta: ${beta.toFixed(2)} (aus Daten)
- WACC berechnen
- FCF-Projektion: 5 Jahre basierend auf historischem Wachstum
- Terminal Growth Rate: 2.5%

Zeige die Rechnung:
- WACC = Risk-Free Rate + Beta × Equity Risk Premium
- Projizierte FCFs für Jahr 1-5
- Terminal Value
- Enterprise Value
- Equity Value (minus Debt, plus Cash)
- Fairer Wert pro Aktie

## 4. Szenarien

| Szenario | Annahme | Fairer Wert | vs. Aktuell |
|----------|---------|-------------|-------------|
| Bear Case | FCF-Wachstum halbiert, Terminal Growth 1.5% | X USD | -X% / +X% |
| Base Case | Historisches Wachstum, Terminal Growth 2.5% | X USD | -X% / +X% |
| Bull Case | FCF-Wachstum +50%, Terminal Growth 3.0% | X USD | -X% / +X% |

## 5. Fazit

- Aktueller Kurs: ${quote.price?.toFixed(2)} USD
- Fairer Wert (Base Case): X USD
- Upside/Downside: X%
- Bewertung: [UNTERBEWERTET / FAIR BEWERTET / ÜBERBEWERTET]

Kurze Begründung (2-3 Sätze) und was der wichtigste Faktor für die Bewertung ist.

=== REGELN ===
- Nutze nur die bereitgestellten Daten, keine Annahmen über andere Zahlen
- Sei präzise und quantitativ
- Vermeide Floskeln wie "es ist wichtig zu beachten"
- Antworte auf Deutsch
- Formatiere mit Markdown`

  return prompt
}

// Rate limiting check
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const userLimit = rateLimiter.get(ip)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimiter.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    return true
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false
  }

  userLimit.count++
  return true
}

// Auth verification
async function verifyUserAndPremium(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return { error: 'Nicht autorisiert', status: 401 }
    }

    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { error: 'Ungültiger Token', status: 401 }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_premium) {
      return { error: 'Premium-Abo erforderlich für AI-Analysen', status: 403 }
    }

    return { user, premium: true }
  } catch (error) {
    console.error('Auth verification failed:', error)
    return { error: 'Authentifizierung fehlgeschlagen', status: 500 }
  }
}

// Call OpenAI API
async function callOpenAI(prompt: string) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein erfahrener Finanzanalyst spezialisiert auf DCF-Bewertungen und fundamentale Aktienanalyse. Du antwortest auf Deutsch und bist präzise und quantitativ in deinen Analysen. Du gibst keine Anlageempfehlungen, sondern lieferst fundierte Analysen.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    }),
    signal: AbortSignal.timeout(60000) // 60s timeout for longer analysis
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`OpenAI API error: ${response.status} - ${errorText}`)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  return response
}

export async function POST(request: NextRequest) {
  console.log('🤖 AI-Analyse API called', new Date().toISOString())

  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: `Zu viele Anfragen. Limit: ${RATE_LIMIT} Analysen pro 15min` },
        { status: 429 }
      )
    }

    // Auth check
    const authResult = await verifyUserAndPremium(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    // Get ticker from request
    const body = await request.json()
    const { ticker } = body

    if (!ticker?.trim()) {
      return NextResponse.json(
        { error: 'Ticker ist erforderlich' },
        { status: 400 }
      )
    }

    const normalizedTicker = ticker.trim().toUpperCase()
    console.log(`📈 Starting AI-DCF analysis for ${normalizedTicker}`)

    // Fetch financial data
    const financialData = await fetchFinancialData(normalizedTicker)

    if (!financialData) {
      return NextResponse.json(
        { error: `Keine Finanzdaten für ${normalizedTicker} gefunden` },
        { status: 404 }
      )
    }

    // Build prompt and call OpenAI
    const prompt = buildDCFPrompt(financialData)
    console.log(`📝 Prompt built, length: ${prompt.length} chars`)

    const openAIResponse = await callOpenAI(prompt)
    const responseData = await openAIResponse.json()

    const analysis = responseData.choices?.[0]?.message?.content || ''
    console.log(`✅ Analysis generated, length: ${analysis.length} chars`)

    // Return analysis with metadata
    const remaining = RATE_LIMIT - (rateLimiter.get(ip)?.count || 0)

    return NextResponse.json({
      success: true,
      analysis,
      ticker: normalizedTicker,
      companyName: financialData.profile.companyName,
      currentPrice: financialData.quote.price,
      marketCap: financialData.quote.marketCap,
      usage: responseData.usage,
      remaining,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ AI-Analyse Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'

    return NextResponse.json(
      { error: 'Analyse konnte nicht erstellt werden', details: errorMessage },
      { status: 500 }
    )
  }
}
