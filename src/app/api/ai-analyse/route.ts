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

// Build the DCF analysis prompt with real financial data and pre-calculated values
function buildDCFPromptWithValues(data: FinancialData): { prompt: string; baseFairValue: number } {
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

  // Calculate key metrics
  const sharesOutstanding = quote.sharesOutstanding || latestBalance.commonStock || 0
  const totalDebt = latestBalance.totalDebt || 0
  const cash = latestBalance.cashAndCashEquivalents || 0
  const beta = profile.beta || 1.0
  const currentPrice = quote.price || 0

  // ===== PRE-CALCULATE DCF VALUES =====
  const riskFreeRate = 0.045 // 4.5%
  const equityRiskPremium = 0.05 // 5.0%
  const wacc = riskFreeRate + beta * equityRiskPremium

  // Get latest FCF and calculate historical growth
  const fcfHistory = cashFlowStatements.slice(0, 5)
    .map(cf => cf.freeCashFlow)
    .filter(fcf => fcf && fcf > 0)

  // Use latest FCF as base (must be positive for DCF to work)
  const latestFCF = cashFlowStatements[0]?.freeCashFlow || 0
  const baseFCF = Math.max(latestFCF, 1e9) // Use at least $1B if FCF is negative/zero

  // Calculate historical FCF CAGR if possible
  let historicalGrowthRate = 0.08 // Default 8% if can't calculate
  if (fcfHistory.length >= 2) {
    const oldestFCF = fcfHistory[fcfHistory.length - 1]
    const newestFCF = fcfHistory[0]
    if (oldestFCF > 0 && newestFCF > 0) {
      const years = fcfHistory.length - 1
      historicalGrowthRate = Math.pow(newestFCF / oldestFCF, 1 / years) - 1
      // Cap growth rate between 0% and 25%
      historicalGrowthRate = Math.max(0, Math.min(0.25, historicalGrowthRate))
    }
  }

  // DCF calculation function
  const calculateDCF = (fcfGrowthRate: number, terminalGrowthRate: number): number => {
    let totalPV = 0
    let projectedFCF = baseFCF

    // Project 5 years of FCF
    for (let year = 1; year <= 5; year++) {
      projectedFCF = projectedFCF * (1 + fcfGrowthRate)
      const pvFactor = Math.pow(1 + wacc, year)
      totalPV += projectedFCF / pvFactor
    }

    // Terminal Value (Gordon Growth)
    const terminalFCF = projectedFCF * (1 + terminalGrowthRate)
    const terminalValue = terminalFCF / (wacc - terminalGrowthRate)
    const pvTerminal = terminalValue / Math.pow(1 + wacc, 5)

    // Enterprise Value
    const enterpriseValue = totalPV + pvTerminal

    // Equity Value
    const equityValue = enterpriseValue - totalDebt + cash

    // Fair Value per Share
    return sharesOutstanding > 0 ? equityValue / sharesOutstanding : 0
  }

  // Calculate scenarios
  const bearGrowthRate = historicalGrowthRate * 0.5 // Half the growth
  const baseGrowthRate = historicalGrowthRate
  const bullGrowthRate = historicalGrowthRate * 1.5 // 50% higher growth

  const bearFairValue = calculateDCF(bearGrowthRate, 0.015)
  const baseFairValue = calculateDCF(baseGrowthRate, 0.025)
  const bullFairValue = calculateDCF(bullGrowthRate, 0.03)

  // Calculate upside/downside percentages
  const bearVsCurrent = currentPrice > 0 ? ((bearFairValue - currentPrice) / currentPrice * 100) : 0
  const baseVsCurrent = currentPrice > 0 ? ((baseFairValue - currentPrice) / currentPrice * 100) : 0
  const bullVsCurrent = currentPrice > 0 ? ((bullFairValue - currentPrice) / currentPrice * 100) : 0

  // Determine valuation rating
  let valuation = 'FAIR BEWERTET'
  if (baseVsCurrent > 15) valuation = 'UNTERBEWERTET'
  else if (baseVsCurrent < -15) valuation = 'ÜBERBEWERTET'

  const prompt = `Du bist ein erfahrener Aktienanalyst. Erstelle eine professionelle DCF-Bewertung.

=== UNTERNEHMENSDATEN ===
Unternehmen: ${profile.companyName}
Ticker: ${profile.symbol}
Sektor: ${profile.sector || 'N/A'}
Branche: ${profile.industry || 'N/A'}
Aktueller Kurs: ${currentPrice.toFixed(2)} USD
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

=== VORBERECHNETE DCF-WERTE ===
(WICHTIG: Nutze exakt diese Werte in der Analyse!)

DCF-Parameter:
- Risk-Free Rate: 4.5%
- Equity Risk Premium: 5.0%
- WACC: ${(wacc * 100).toFixed(2)}%
- Basis-FCF: ${(baseFCF / 1e9).toFixed(2)}B USD
- Historische FCF-Wachstumsrate: ${(historicalGrowthRate * 100).toFixed(1)}%

Berechnete faire Werte:
- Bear Case (${(bearGrowthRate * 100).toFixed(1)}% Wachstum, 1.5% Terminal): ${bearFairValue.toFixed(2)} USD (${bearVsCurrent >= 0 ? '+' : ''}${bearVsCurrent.toFixed(1)}% vs. Kurs)
- Base Case (${(baseGrowthRate * 100).toFixed(1)}% Wachstum, 2.5% Terminal): ${baseFairValue.toFixed(2)} USD (${baseVsCurrent >= 0 ? '+' : ''}${baseVsCurrent.toFixed(1)}% vs. Kurs)
- Bull Case (${(bullGrowthRate * 100).toFixed(1)}% Wachstum, 3.0% Terminal): ${bullFairValue.toFixed(2)} USD (${bullVsCurrent >= 0 ? '+' : ''}${bullVsCurrent.toFixed(1)}% vs. Kurs)

Bewertung: ${valuation}

=== AUFGABE ===

Erstelle eine strukturierte Analyse. NUTZE DIE VORBERECHNETEN WERTE OBEN - rechne NICHT selbst!

## 1. Unternehmensprofil
Kurze Beschreibung des Geschäftsmodells und der Wettbewerbsposition (2-3 Sätze).

## 2. Finanzielle Stärke
Bewerte die finanzielle Gesundheit basierend auf den Kennzahlen. Was sind Stärken, was sind Schwächen?

## 3. DCF-Bewertung

Erkläre die DCF-Methodik kurz und präsentiere die vorberechneten Ergebnisse:
- WACC: ${(wacc * 100).toFixed(2)}%
- Basis-FCF und angenommenes Wachstum
- Fairer Wert: ${baseFairValue.toFixed(2)} USD

## 4. Szenarien

| Szenario | FCF-Wachstum | Terminal Growth | Fairer Wert | vs. Aktuell |
|----------|--------------|-----------------|-------------|-------------|
| Bear Case | ${(bearGrowthRate * 100).toFixed(1)}% | 1.5% | ${bearFairValue.toFixed(2)} USD | ${bearVsCurrent >= 0 ? '+' : ''}${bearVsCurrent.toFixed(1)}% |
| Base Case | ${(baseGrowthRate * 100).toFixed(1)}% | 2.5% | ${baseFairValue.toFixed(2)} USD | ${baseVsCurrent >= 0 ? '+' : ''}${baseVsCurrent.toFixed(1)}% |
| Bull Case | ${(bullGrowthRate * 100).toFixed(1)}% | 3.0% | ${bullFairValue.toFixed(2)} USD | ${bullVsCurrent >= 0 ? '+' : ''}${bullVsCurrent.toFixed(1)}% |

## 5. Fazit

- **Aktueller Kurs:** ${currentPrice.toFixed(2)} USD
- **Fairer Wert (Base Case):** ${baseFairValue.toFixed(2)} USD
- **Upside/Downside:** ${baseVsCurrent >= 0 ? '+' : ''}${baseVsCurrent.toFixed(1)}%
- **Bewertung:** ${valuation}

Kurze Begründung (2-3 Sätze) und was der wichtigste Faktor für die Bewertung ist.

=== REGELN ===
- NUTZE EXAKT DIE VORBERECHNETEN WERTE - keine eigenen Berechnungen!
- Sei präzise und quantitativ
- Vermeide Floskeln wie "es ist wichtig zu beachten"
- Antworte auf Deutsch
- Formatiere mit Markdown`

  return { prompt, baseFairValue }
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
    const promptData = buildDCFPromptWithValues(financialData)
    console.log(`📝 Prompt built, length: ${promptData.prompt.length} chars`)

    const openAIResponse = await callOpenAI(promptData.prompt)
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
      fairValue: promptData.baseFairValue, // Include fair value for gauge
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
