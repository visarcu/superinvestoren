// src/app/api/ai/route.ts - COMPLETE ENHANCED mit RAG Integration + HYBRID SUPPORT
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { preparePortfolioDataForAI } from '@/lib/superinvestorDataService'
import { FinancialRAGSystem, RAGPromptBuilder } from '@/lib/ragSystem'
import { formatFinancialMetric } from '@/lib/financialCalculator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const FMP_API_KEY = process.env.FMP_API_KEY!

// RAG System Instance (singleton)
let ragSystem: FinancialRAGSystem | null = null
let ragPromptBuilder: RAGPromptBuilder | null = null

// Initialize RAG System
async function initializeRAGSystem(): Promise<void> {
  if (!ragSystem) {
    try {
      if (process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY) {
        ragSystem = new FinancialRAGSystem()
        await ragSystem.initialize('finclue-financial-docs')
        ragPromptBuilder = new RAGPromptBuilder(ragSystem)
        console.log('✅ RAG System initialized successfully')
      } else {
        console.warn('⚠️ RAG System disabled - missing PINECONE_API_KEY or OPENAI_API_KEY')
      }
    } catch (error) {
      console.error('❌ RAG System initialization failed:', error)
      ragSystem = null
      ragPromptBuilder = null
    }
  }
}

// Rate Limiting
const rateLimiter = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 20
const WINDOW_MS = 15 * 60 * 1000

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ✅ ENHANCED REQUEST BODY INTERFACE mit Hybrid Support
interface RequestBody {
  message: string
  context: ChatMessage[]
  analysisType: 'stock' | 'superinvestor' | 'general' | 'hybrid'  // ✅ ADDED: hybrid
  primaryContext?: 'stock' | 'superinvestor' | 'general'         // ✅ NEW: primary context
  ticker?: string
  compareWith?: string[]
  investor?: string
  portfolioData?: any
  contextHints?: {                                                // ✅ NEW: context hints
    isHybridQuery: boolean
    hasExplicitTicker: boolean
    hasExplicitInvestor: boolean
    messageContainsPortfolioTerms: boolean
    messageContainsStockTerms?: boolean
  }
}

interface EnhancedAIResponse {
  content: string
  charts?: ChartData[]
  actions?: QuickAction[]
  metadata?: {
    tickers: string[]
    dataFreshness: string
    analysisType: string
    ragSources?: string[]
    isHybrid?: boolean
    primaryContext?: string
    ticker?: string
    investor?: string
  }
}

interface ChartData {
  type: 'line' | 'bar' | 'comparison' | 'volume' | 'portfolio_allocation'
  title: string
  ticker?: string
  investor?: string
  period: string
  data: any[]
}

interface QuickAction {
  label: string
  action: string
  ticker?: string
  investor?: string
  prompt: string
}

// Hole Chart-Daten von FMP
async function fetchChartData(ticker: string, period: string = '6M'): Promise<any[]> {
  try {
    if (!ticker || !FMP_API_KEY) {
      console.warn('Missing ticker or FMP API key for chart data')
      return []
    }

    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '1M':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case '3M':
        startDate.setMonth(endDate.getMonth() - 3)
        break
      case '6M':
        startDate.setMonth(endDate.getMonth() - 6)
        break
      case '1Y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case '5Y':
        startDate.setFullYear(endDate.getFullYear() - 5)
        break
      default:
        startDate.setMonth(endDate.getMonth() - 6)
    }

    const fromDate = startDate.toISOString().split('T')[0]
    const toDate = endDate.toISOString().split('T')[0]

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/historical-price-full/${ticker}?from=${fromDate}&to=${toDate}&apikey=${FMP_API_KEY}`,
      { 
        headers: { 'User-Agent': 'FinClue-App/1.0' },
        signal: AbortSignal.timeout(10000)
      }
    )
    
    if (!response.ok) {
      console.error(`FMP API error for ${ticker}: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    return data.historical?.reverse() || []
  } catch (error) {
    console.error(`Error fetching chart data for ${ticker}:`, error)
    return []
  }
}

// Interface für Financial Data
interface FinancialData {
  currentDate: string
  quote: any
  profile: any
  latestIncome: any
  latestRatios: any
  recentNews: any[]
  chartData?: any[]
  quarterlyEarnings?: any[]
}

// Hole aktuelle Finanzdaten
async function fetchCurrentFinancialData(ticker: string, includeCharts: boolean = false): Promise<FinancialData | null> {
  try {
    if (!ticker || !FMP_API_KEY) {
      console.warn('Missing ticker or FMP API key')
      return null
    }

    console.log(`🔍 DEBUG: Fetching financial data for ${ticker}`)

    const [
      quoteResponse,
      profileResponse,
      incomeResponse,
      ratiosResponse,
      newsResponse,
      earningsResponse
    ] = await Promise.allSettled([
      fetch(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(8000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(8000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?limit=1&apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(8000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/ratios/${ticker}?limit=1&apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(8000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/stock_news?tickers=${ticker}&limit=5&apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(8000)
      }),
      fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=quarter&limit=4&apikey=${FMP_API_KEY}`, {
        signal: AbortSignal.timeout(8000)
      })
    ])

    const results = await Promise.allSettled([
      quoteResponse.status === 'fulfilled' && quoteResponse.value.ok ? quoteResponse.value.json() : null,
      profileResponse.status === 'fulfilled' && profileResponse.value.ok ? profileResponse.value.json() : null,
      incomeResponse.status === 'fulfilled' && incomeResponse.value.ok ? incomeResponse.value.json() : null,
      ratiosResponse.status === 'fulfilled' && ratiosResponse.value.ok ? ratiosResponse.value.json() : null,
      newsResponse.status === 'fulfilled' && newsResponse.value.ok ? newsResponse.value.json() : null,
      earningsResponse.status === 'fulfilled' && earningsResponse.value.ok ? earningsResponse.value.json() : null
    ])

    const [quote, profile, income, ratios, news, earnings] = results.map(r => 
      r.status === 'fulfilled' ? r.value : null
    )

    const currentDate = new Date().toLocaleDateString('de-DE')
    
    const result: FinancialData = {
      currentDate,
      quote: quote?.[0] || null,
      profile: profile?.[0] || null,
      latestIncome: income?.[0] || null,
      latestRatios: ratios?.[0] || null,
      recentNews: news?.slice(0, 3) || [],
      quarterlyEarnings: earnings || []
    }

    if (includeCharts) {
      const chartData = await fetchChartData(ticker, '6M')
      result.chartData = chartData
    }

    return result
  } catch (error) {
    console.error(`❌ DEBUG: Error fetching financial data for ${ticker}:`, error)
    return null
  }
}

// RAG-Enhanced Context Builder
async function getRagContext(message: string, ticker?: string): Promise<{ context: string, sources: string[] }> {
  try {
    if (!ragSystem || !ragPromptBuilder) {
      console.log('⚠️ DEBUG: RAG system not available')
      return { context: '', sources: [] }
    }

    console.log(`🔍 DEBUG: Getting RAG context for query: "${message}" ticker: ${ticker}`)

    const ragResults = await ragSystem.search({
      query: message,
      ticker: ticker,
      limit: 5,
      document_types: ['earnings_call', 'news', 'sec_filing']
    })

    console.log(`📚 DEBUG: RAG search results: ${ragResults.length} documents found`)

    if (ragResults.length === 0) {
      return { context: '', sources: [] }
    }

    let context = "\n=== RELEVANTE FINANZDOKUMENTE ===\n\n"
    const sources: string[] = []
    
    ragResults.forEach((result, index) => {
      context += `${index + 1}. Quelle: ${result.source}\n`
      context += `   Relevanz: ${(result.relevance_score * 100).toFixed(1)}%\n`
      context += `   Inhalt: ${result.content.substring(0, 500)}...\n\n`
      sources.push(result.source)
    })

    context += "=== ENDE DOKUMENTE ===\n\n"
    context += "WICHTIG: Nutze diese Dokumente für akkurate, quellenbasierte Antworten. Erwähne die Quellen wenn du Informationen daraus verwendest.\n\n"

    return { context, sources }
  } catch (error) {
    console.error('❌ DEBUG: RAG context error:', error)
    return { context: '', sources: [] }
  }
}

// System Prompt Builder
function buildSystemPrompt(analysisType: string): string {
  const basePrompt = `Du bist "FinClue AI", ein spezialisierter Finanzanalyst-Assistent.

WICHTIGE RICHTLINIEN:
• Antworte IMMER auf Deutsch in natürlicher, conversationaler Sprache
• FOKUSSIERE auf die spezifische Frage - nicht alle verfügbaren Daten ausgeben!
• Schreibe wie ein erfahrener Finanzexperte im persönlichen Gespräch
• VERMEIDE übermäßiges Markdown (maximal wenig **bold** für Zahlen)
• Verwende fließende Absätze statt Listen mit Bullet Points
• Erkläre Kennzahlen verständlich und setze sie in den richtigen Kontext
• Gib NIEMALS konkrete Kauf-/Verkaufsempfehlungen
• Weise darauf hin, dass dies keine Anlageberatung ist
• Erwähne Quellen wenn du Informationen aus Dokumenten verwendest`

  switch (analysisType) {
    case 'stock':
      return basePrompt + `

AKTIEN-ANALYSE FOKUS:
• **Beantworte die spezifische Frage direkt und fokussiert**
• Bei KUV-Fragen: Nenne den FMP-Wert, erkläre die Bedeutung, vergleiche mit der Branche
• Bei P/E-Fragen: Fokussiere nur auf P/E und dessen Bewertungsimplikationen  
• Bei ROE-Fragen: Erkläre die Profitabilität und was der Wert bedeutet
• Bei allgemeinen Fragen: Gib eine ausgewogene Übersicht der wichtigsten Kennzahlen
• **Verwende FMP-Daten als Hauptquelle** - diese sind Industriestandard
• Integriere RAG-Dokumente nur wenn sie relevant für die spezifische Frage sind
• **Schreibe in natürlichen, fließenden Absätzen**, nicht als Datenliste
• **Keine ###-Headers** außer bei sehr umfassenden Analysen
• Halte Antworten prägnant aber informativ`

    case 'superinvestor':
      return basePrompt + `

SUPERINVESTOR-FOKUS:
• **WICHTIG: Beantworte die spezifische Frage des Nutzers direkt!**
• **Schreibstil:** Wie ein Finanzexperte im Gespräch - natürlich und lesbar
• Bei spezifischen Holdings-Fragen: Fokussiere nur auf die relevanten Aktien
• Bei Strategiefragen: Erkläre die Investmentlogik in verständlichen Absätzen
• Bei Vergleichsfragen: Nenne konkret andere Investoren mit ähnlichen Ansätzen
• **KEIN ÜBERMÄSSIGES MARKDOWN:** Schreibe fließend und professionell
• Strukturiere mit Absätzen statt Listen wenn möglich
• Verwende Portfolio-Daten UND verfügbare Dokumente contextual`

    case 'hybrid':
      return basePrompt + `

HYBRID-ANALYSE FOKUS:
• **INTELLIGENTE KONTEXTVERBINDUNG:** Verbinde Aktien- und Investor-Daten geschickt
• **PRIMÄRER FOKUS:** Orientiere dich am Hauptkontext, aber integriere beide Perspektiven
• **PORTFOLIO-PERSPEKTIVE:** Wenn Investor die Aktie hält, analysiere die Position im Portfolio-Kontext
• **AKTUELLE BEWEGUNGEN:** Nutze aktuelle Portfolio-Änderungen und Quartalsdaten
• **NATÜRLICHER STIL:** Schreibe wie ein Experte, der beide Bereiche beherrscht
• **QUELLENBASIERT:** Nutze FMP-Daten UND Portfolio-Filings UND RAG-Dokumente
• **AUSGEWOGEN:** Gib nicht nur Daten aus, sondern erkläre die Zusammenhänge`

    default:
      return basePrompt + `

ALLGEMEINE FINANZBERATUNG:
• Beantworte die spezifische Frage fokussiert und verständlich
• Nutze verfügbare Dokumente zur Unterstützung deiner Antworten
• Schreibe conversational und in natürlicher deutscher Sprache
• Erkläre Finanzkonzepte auf eine zugängliche Art`
  }
}

// ✅ NEW: HYBRID PROMPT BUILDER
function buildHybridPrompt(
  ticker: string,
  investor: string,
  financialData: any,
  portfolioData: any,
  message: string,
  currentDate: string,
  ragContext: string,
  primaryContext: string,
  contextHints?: any
): string {
  console.log(`🔀 Building hybrid prompt for ${ticker} + ${investor}, primary: ${primaryContext}`)

  let prompt = `${ragContext}**HYBRID ANALYSE: ${ticker.toUpperCase()} + ${investor}** (Stand: ${currentDate}):

`

  // ✅ Add stock data if available
  if (financialData) {
    const { quote, profile, latestRatios, quarterlyEarnings, recentNews } = financialData
    
    prompt += `## AKTUELLE ${ticker.toUpperCase()} DATEN:
**Aktienkurs:** ${quote?.price || 'N/A'} USD (${quote?.changesPercentage >= 0 ? '+' : ''}${quote?.changesPercentage || 'N/A'}%)
**Marktkapitalisierung:** ${quote?.marketCap ? (quote.marketCap / 1000000000).toFixed(1) + 'B USD' : 'N/A'}
**Unternehmen:** ${profile?.companyName || ticker} | ${profile?.sector || 'N/A'} Sektor

`

    if (latestRatios) {
      prompt += `**Bewertungskennzahlen (FMP Professional):**
P/E: ${latestRatios.priceEarningsRatio?.toFixed(2) || 'N/A'} | P/B: ${latestRatios.priceToBookRatio?.toFixed(2) || 'N/A'} | **KUV: ${latestRatios.priceToSalesRatio?.toFixed(2) || 'N/A'}** | ROE: ${latestRatios.returnOnEquity ? (latestRatios.returnOnEquity * 100).toFixed(1) + '%' : 'N/A'}

`
    }

    if (quarterlyEarnings && quarterlyEarnings.length > 0) {
      const latest = quarterlyEarnings[0]
      const quarterDate = new Date(latest.date)
      const quarterName = `Q${Math.ceil((quarterDate.getMonth() + 1) / 3)} ${quarterDate.getFullYear()}`
      
      prompt += `**Letztes Quartal (${quarterName}):**
Umsatz: $${(latest.revenue / 1e9).toFixed(2)}B | EPS: $${latest.eps} | Nettogewinn: $${(latest.netIncome / 1e9).toFixed(2)}B

`

      if (quarterlyEarnings.length > 1) {
        const growthRate = ((latest.revenue - quarterlyEarnings[1].revenue) / quarterlyEarnings[1].revenue * 100).toFixed(1)
        prompt += `**Wachstum:** ${growthRate}% YoY

`
      }
    }

    if (recentNews && recentNews.length > 0) {
      prompt += `**Aktuelle News:**
${recentNews.slice(0, 2).map((news: any, i: number) => `${i+1}. ${news.title} (${new Date(news.publishedDate).toLocaleDateString('de-DE')})`).join('\n')}

`
    }
  }

  // ✅ Add portfolio data if available
  if (portfolioData) {
    const { latestQuarter, totalValue, positionsCount, topHoldings, portfolioChanges } = portfolioData
    
    prompt += `## ${investor.toUpperCase().replace(/-/g, ' ')} PORTFOLIO-DATEN:
**Portfolio-Wert:** ${(totalValue / 1000000000).toFixed(1)}B USD
**Anzahl Positionen:** ${positionsCount}
**Letzte Aktualisierung:** ${latestQuarter?.date || 'Unbekannt'}

`

    // Check if investor holds the ticker
    const holding = topHoldings?.find((h: any) => 
      h.ticker?.toUpperCase() === ticker.toUpperCase() || 
      h.name?.toLowerCase().includes(ticker.toLowerCase().replace('inc', '').replace('corp', '').replace('co', '').trim())
    )

    if (holding) {
      prompt += `**${ticker.toUpperCase()} POSITION IM ${investor.toUpperCase().replace(/-/g, ' ')} PORTFOLIO:**
• Anteil: ${holding.portfolioPercentage?.toFixed(2)}% des Portfolios
• Wert: ${(holding.value / 1000000).toFixed(1)}M USD
• Aktien: ${holding.shares?.toLocaleString() || 'N/A'}

`
      
      if (holding.quarterlyChange) {
        const change = holding.quarterlyChange
        let changeText = 'Unverändert'
        
        switch (change.type) {
          case 'new':
            changeText = '🆕 NEUE POSITION'
            break
          case 'increased':
            changeText = `📈 ERHÖHT um ${change.percentChange?.toFixed(1)}%`
            break
          case 'decreased':
            changeText = `📉 REDUZIERT um ${Math.abs(change.percentChange || 0).toFixed(1)}%`
            break
        }
        
        prompt += `**Quartalsänderung:** ${changeText}

`
      }
    } else {
      prompt += `**${ticker.toUpperCase()} POSITION:** Nicht im aktuellen ${investor.replace(/-/g, ' ')} Portfolio gefunden.

`
    }

    // Recent portfolio activity context
    if (portfolioChanges) {
      prompt += `**Jüngste Portfolio-Aktivitäten (Q1 2025):**
• 🆕 Neue Positionen: ${portfolioChanges.newPositions?.length || 0}
• 📈 Erhöhte Positionen: ${portfolioChanges.increasedPositions?.length || 0}
• 📉 Reduzierte Positionen: ${portfolioChanges.decreasedPositions?.length || 0}
• ❌ Geschlossene Positionen: ${portfolioChanges.closedPositions?.length || 0}

`
    }
  }

  // ✅ ENHANCED: Current Buffett Activity (based on latest data)
  if (investor === 'warren-buffett' || investor.includes('buffett')) {
    prompt += `## AKTUELLE WARREN BUFFETT AKTIVITÄTEN (Q1 2025):

**NEUE/STARK ERHÖHTE POSITIONEN:**
• **Constellation Brands (STZ)** - 12M Aktien (~$2.3B, 6.7% Anteil)
• **Domino's Pizza (DPZ)** - +86% auf 2.4M Aktien (~$1.3B)
• **Occidental Petroleum (OXY)** - Erhöht auf 27% Anteil (~$11.4B)
• **Sirius XM (SIRI)** - Auf 35.4% erhöht (119M Aktien)
• **VeriSign (VRSN)** - Leicht erhöht auf 13.2M Aktien

**VOLLSTÄNDIGE EXITS:**
• **Citigroup** - Komplett verkauft
• **Nu Holdings** (brasilianisches Fintech) - Komplett verkauft

**REDUZIERTE POSITIONEN:**
• **Bank of America** - Position verkleinert
• **Capital One** - Position verkleinert

**CASH-POSITION:** Rekord-hoch bei **$347 Milliarden** (Q1 2025)

**BUFFETT'S GEHEIMES PORTFOLIO (New England Asset Management):**
Separate $616M Portfolio mit 122 Wertpapieren - kaufte kürzlich Aktien mit $775B Aktienrückkäufen

`
  }

  prompt += `**NUTZER-FRAGE:** ${message}

**ANWEISUNGEN FÜR HYBRID-ANALYSE:**
• **PRIMÄRER FOKUS:** ${primaryContext} - gewichte diesen Aspekt stärker
• **INTELLIGENTE INTEGRATION:** Verbinde Aktienanalyse mit Investor-Perspektive geschickt
• **PORTFOLIO-KONTEXT:** Wenn ${investor.replace(/-/g, ' ')} ${ticker} hält, analysiere die Position im Portfolio-Kontext
• **AKTUELLE BEWEGUNGEN:** Nutze die Q1 2025 Portfolio-Bewegungen für relevante Insights
• **DATENBASIS:** FMP-Kennzahlen + Portfolio-Filings + RAG-Dokumente intelligent kombinieren
• **SCHREIBSTIL:** Conversational und natürlich, wie ein Finanzexperte der beide Bereiche beherrscht
• **QUELLENHINWEISE:** Erwähne "laut FMP" für Kennzahlen und Datenquellen bei Portfolio-Infos
• **BEISPIEL-ANTWORTEN:**
  - Bei "Was kauft Buffett?" → Fokus auf Portfolio-Bewegungen MIT Bezug zu ${ticker} falls relevant
  - Bei "${ticker} Quartalszahlen" → Zahlen analysieren UND erwähnen ob/wie ${investor} involviert ist
  - Bei "Buffett ${ticker}" → Beide Aspekte gleichwertig behandeln mit Portfolio + Fundamentaldaten

**Gib eine fundierte, datenbasierte Antwort die beide Kontexte intelligent verknüpft. Keine Anlageberatung!**`

  return prompt
}

// ✅ ENHANCED CONTEXTUAL PROMPT BUILDER mit Hybrid Support
async function buildContextualPrompt(
  analysisType: string,
  primaryContext: string,
  message: string,
  ticker?: string,
  investor?: string,
  financialData?: any,
  portfolioData?: any,
  contextHints?: any
): Promise<{ prompt: string, ragSources: string[] }> {
  const currentDate = new Date().toLocaleDateString('de-DE')
  
  console.log(`🎯 DEBUG: Building ${analysisType} prompt with primary context: ${primaryContext}`)
  
  // Enhanced RAG query for hybrid contexts
  const ragQuery = ticker && investor 
    ? `${message} ${ticker} ${investor}` 
    : message
  const { context: ragContext, sources } = await getRagContext(ragQuery, ticker)

  // ✅ NEW: HYBRID CONTEXT HANDLING
  if (analysisType === 'hybrid') {
    const hybridPrompt = buildHybridPrompt(
      ticker!, 
      investor!, 
      financialData, 
      portfolioData, 
      message, 
      currentDate, 
      ragContext, 
      primaryContext,
      contextHints
    )
    console.log(`📝 DEBUG: Hybrid prompt built, length: ${hybridPrompt.length}`)
    return { prompt: hybridPrompt, ragSources: sources }
  }

  // Existing single-context handling
  switch (analysisType) {
    case 'stock':
      const stockPrompt = buildStockAnalysisPrompt(ticker!, financialData, message, ragContext)
      console.log(`📝 DEBUG: Stock prompt built, length: ${stockPrompt.length}`)
      return { prompt: stockPrompt, ragSources: sources }
      
    case 'superinvestor':
      const superinvestorPrompt = buildSuperinvestorPrompt(investor!, portfolioData, message, currentDate, ragContext)
      console.log(`📝 DEBUG: Superinvestor prompt built, length: ${superinvestorPrompt.length}`)
      return { prompt: superinvestorPrompt, ragSources: sources }
      
    case 'general':
    default:
      const generalPrompt = buildGeneralPrompt(message, currentDate, ragContext)
      console.log(`📝 DEBUG: General prompt built, length: ${generalPrompt.length}`)
      return { prompt: generalPrompt, ragSources: sources }
  }
}

// STOCK ANALYSIS PROMPT BUILDER
function buildStockAnalysisPrompt(ticker: string, financialData: any, message: string, ragContext: string): string {
  if (!financialData) {
    console.log(`⚠️ DEBUG: No financial data for ${ticker}, using RAG only`)
    return `${ragContext}Der Nutzer fragt nach ${ticker}: ${message}

Leider sind keine aktuellen Finanzdaten verfügbar. Nutze die verfügbaren Dokumente oben, um trotzdem hilfreiche Informationen zu geben.`
  }

  const { currentDate, quote, profile, latestIncome, latestRatios, recentNews, quarterlyEarnings } = financialData

  const userQuestion = message.toLowerCase()
  const isSpecificMetricQuestion = userQuestion.includes('kuv') || userQuestion.includes('p/e') || 
                                   userQuestion.includes('pe') || userQuestion.includes('roe') || 
                                   userQuestion.includes('verschuldung') || userQuestion.includes('dividende') ||
                                   userQuestion.includes('pb') || userQuestion.includes('peg') ||
                                   userQuestion.includes('marge') || userQuestion.includes('debt')

  let prompt = `${ragContext}**Aktuelle Daten für ${ticker}** (Stand: ${currentDate}):

**Aktienkurs:** ${quote?.price || 'N/A'} USD (${quote?.changesPercentage >= 0 ? '+' : ''}${quote?.changesPercentage || 'N/A'}%)
**Marktkapitalisierung:** ${quote?.marketCap ? (quote.marketCap / 1000000000).toFixed(1) + 'B USD' : 'N/A'}
**Unternehmen:** ${profile?.companyName || ticker} | ${profile?.sector || 'N/A'} Sektor | CEO: ${profile?.ceo || 'N/A'}`

  if (latestRatios && (!isSpecificMetricQuestion || userQuestion.includes('kuv') || userQuestion.includes('bewertung') || userQuestion.includes('pe') || userQuestion.includes('pb') || userQuestion.includes('peg'))) {
    prompt += `

**Bewertungskennzahlen (FMP Professional):**
P/E: ${latestRatios.priceEarningsRatio?.toFixed(2) || 'N/A'} | P/B: ${latestRatios.priceToBookRatio?.toFixed(2) || 'N/A'} | **KUV: ${latestRatios.priceToSalesRatio?.toFixed(2) || 'N/A'}** | PEG: ${latestRatios.pegRatio?.toFixed(2) || 'N/A'} | EV/EBITDA: ${latestRatios.evToEbitda?.toFixed(2) || 'N/A'}`
  }

  if (latestRatios && (!isSpecificMetricQuestion || userQuestion.includes('roe') || userQuestion.includes('profitabil') || userQuestion.includes('marge') || userQuestion.includes('rendite'))) {
    prompt += `

**Profitabilität (FMP):**
ROE: ${latestRatios.returnOnEquity ? (latestRatios.returnOnEquity * 100).toFixed(1) + '%' : 'N/A'} | ROA: ${latestRatios.returnOnAssets ? (latestRatios.returnOnAssets * 100).toFixed(1) + '%' : 'N/A'} | Nettomarge: ${latestRatios.netProfitMargin ? (latestRatios.netProfitMargin * 100).toFixed(1) + '%' : 'N/A'} | Bruttomarge: ${latestRatios.grossProfitMargin ? (latestRatios.grossProfitMargin * 100).toFixed(1) + '%' : 'N/A'}`
  }

  if (latestRatios && (!isSpecificMetricQuestion || userQuestion.includes('verschuldung') || userQuestion.includes('debt') || userQuestion.includes('stabilität') || userQuestion.includes('risiko'))) {
    prompt += `

**Finanzstabilität (FMP):**
Verschuldungsgrad (D/E): ${latestRatios.debtToEquity?.toFixed(2) || 'N/A'} | Current Ratio: ${latestRatios.currentRatio?.toFixed(2) || 'N/A'} | Quick Ratio: ${latestRatios.quickRatio?.toFixed(2) || 'N/A'} | Zinsdeckung: ${latestRatios.interestCoverage?.toFixed(1) || 'N/A'}x`
  }

  if (quarterlyEarnings && quarterlyEarnings.length > 0 && 
      (!isSpecificMetricQuestion || userQuestion.includes('quartal') || userQuestion.includes('wachstum') || 
       userQuestion.includes('entwicklung') || userQuestion.includes('umsatz') || userQuestion.includes('earnings'))) {
    const latestQuarter = quarterlyEarnings[0]
    const quarterDate = new Date(latestQuarter.date)
    const quarterName = `Q${Math.ceil((quarterDate.getMonth() + 1) / 3)} ${quarterDate.getFullYear()}`
    
    prompt += `

**Letztes Quartal (${quarterName}):**
Umsatz: $${(latestQuarter.revenue / 1e9).toFixed(2)}B | EPS: $${latestQuarter.eps} | Nettogewinn: $${(latestQuarter.netIncome / 1e9).toFixed(2)}B`
    
    if (quarterlyEarnings.length > 1) {
      const growthRate = ((latestQuarter.revenue - quarterlyEarnings[1].revenue) / quarterlyEarnings[1].revenue * 100).toFixed(1)
      prompt += ` | Wachstum: ${growthRate}% YoY`
    }
  }

  if (recentNews && recentNews.length > 0 && 
      (!isSpecificMetricQuestion || userQuestion.includes('news') || userQuestion.includes('nachrichten') || userQuestion.includes('aktuell'))) {
    prompt += `

**Aktuelle Nachrichten:**
${recentNews.slice(0, 2).map((news: any, i: number) => `${i+1}. ${news.title} (${new Date(news.publishedDate).toLocaleDateString('de-DE')})`).join('\n')}`
  }

  prompt += `

**NUTZER-FRAGE:** ${message}

**ANWEISUNGEN FÜR FOKUSSIERTE ANTWORT:**
• **Beantworte die spezifische Frage direkt und konzentriert**
• **Verwende FMP-Kennzahlen als Hauptquelle** - diese sind Industriestandard
• **Bei KUV-Fragen:** Der aktuelle KUV von ${ticker} ist ${latestRatios?.priceToSalesRatio?.toFixed(2)} (laut FMP). Erkläre was das bedeutet und bewerte es im Branchenkontext.
• **Bei P/E-Fragen:** Fokussiere auf P/E (${latestRatios?.priceEarningsRatio?.toFixed(2)}) und dessen Bedeutung für die Bewertung
• **Bei allgemeinen Fragen:** Gib eine ausgewogene Übersicht mit den wichtigsten Kennzahlen
• **Schreibstil:** Conversational und natürlich, wie ein Finanzexperte im persönlichen Gespräch
• **Formatierung:** Fließende Absätze statt Listen, minimales Markdown
• **RAG-Integration:** Nutze verfügbare Dokumente wenn sie zur Frage passen
• **Quellenangabe:** Erwähne "laut FMP" für Glaubwürdigkeit bei Kennzahlen
• **Transparenz:** Weise darauf hin, dass dies keine Anlageberatung ist

**Antworte professionell aber persönlich, fokussiert auf die Frage, in natürlicher deutscher Sprache.**`

  return prompt
}

// SUPERINVESTOR PROMPT BUILDER
function buildSuperinvestorPrompt(
  investor: string, 
  portfolioData: any, 
  message: string, 
  currentDate: string,
  ragContext: string
): string {
  if (!portfolioData) {
    console.log(`⚠️ DEBUG: No portfolio data for ${investor}`)
    return `${ragContext}Der Nutzer fragt nach Investor ${investor}: ${message}

Leider sind keine aktuellen Portfolio-Daten verfügbar. Nutze verfügbare Dokumente und gib allgemeine Informationen über Value-Investing Strategien.`
  }

  const { 
    latestQuarter, 
    totalValue, 
    positionsCount,
    topHoldings,
    portfolioChanges,
    sectorAllocation,
    performanceMetrics
  } = portfolioData

  let prompt = `${ragContext}SUPERINVESTOR ANALYSE für ${investor} (Stand: ${currentDate}):

## INVESTOR PROFIL:
• Name: ${investor}
• Portfolio-Wert: ${(totalValue / 1000000000).toFixed(1)}B
• Anzahl Positionen: ${positionsCount}
• Letzte Aktualisierung: ${latestQuarter?.date || 'Unbekannt'}
• Datenquelle: ${latestQuarter?.form || 'N/A'} Filing

## AKTUELLE TOP-HOLDINGS (Top 10):`

  if (topHoldings && topHoldings.length > 0) {
    topHoldings.slice(0, 10).forEach((holding: any, i: number) => {
      const change = holding.quarterlyChange
      let changeText = 'Unverändert'
      
      if (change) {
        switch (change.type) {
          case 'new':
            changeText = '🆕 NEU'
            break
          case 'increased':
            changeText = `📈 +${change.percentChange.toFixed(1)}%`
            break
          case 'decreased':
            changeText = `📉 ${change.percentChange.toFixed(1)}%`
            break
        }
      }

      prompt += `
${i + 1}. ${holding.ticker || 'N/A'} - ${holding.name}
   • Anteil: ${holding.portfolioPercentage.toFixed(2)}%
   • Wert: ${(holding.value / 1000000).toFixed(1)}M
   • Aktien: ${holding.shares?.toLocaleString()}
   • Quartalsänderung: ${changeText}`
    })
  }

  if (portfolioChanges) {
    prompt += `

## PORTFOLIO AKTIVITÄTEN (letztes Quartal):
• 🆕 Neue Positionen: ${portfolioChanges.newPositions?.length || 0}
• 📈 Erhöhte Positionen: ${portfolioChanges.increasedPositions?.length || 0}
• 📉 Reduzierte Positionen: ${portfolioChanges.decreasedPositions?.length || 0}
• ❌ Geschlossene Positionen: ${portfolioChanges.closedPositions?.length || 0}`
  }

  if (sectorAllocation && Object.keys(sectorAllocation).length > 0) {
    prompt += `

## SEKTOR-VERTEILUNG:`
    Object.entries(sectorAllocation)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .forEach(([sector, percentage]) => {
        prompt += `\n• ${sector}: ${(percentage as number).toFixed(1)}%`
      })
  }

  prompt += `

NUTZER-FRAGE: ${message}

WICHTIGE ANWEISUNGEN:
• INTEGRIERE verfügbare Dokumente in deine Analyse
• ANTWORTE DIREKT auf die Nutzerfrage - nicht einfach Portfolio-Daten auflisten!
• VERWENDE WENIG MARKDOWN: Keine ###, minimale **bold**, keine Listen mit •
• SCHREIBE CONVERSATIONAL: Als würdest du persönlich mit dem Nutzer sprechen
• Bei Vergleichsfragen: Erkläre welche anderen Investoren ähnliche Holdings haben
• Bei umgangssprachlichen Fragen: Verstehe den Kontext (z.B. "BaFöG im Depot" = ähnliche Aktien)
• Bei Strategiefragen: Analysiere die Investmentlogik und nutze verfügbare Dokumentation
• Bei Performance-Fragen: Nutze Quartalsänderungen UND verfügbare Earnings/News-Daten
• Erwähne Quellen wenn du Informationen aus Dokumenten verwendest

Antworte auf Deutsch und beantworte die spezifische Frage basierend auf Portfolio-Daten UND verfügbaren Dokumenten.`

  return prompt
}

// GENERAL PROMPT BUILDER
function buildGeneralPrompt(message: string, currentDate: string, ragContext: string): string {
  return `${ragContext}Du bist FinClue AI, ein spezialisierter Finanzanalyst-Assistent.

Aktuelles Datum: ${currentDate}

NUTZER-FRAGE: ${message}

ANWEISUNGEN:
• Nutze verfügbare Dokumente zur Unterstützung deiner Antworten
• Antworte auf Deutsch und biete hilfreiche Finanzanalysen
• Erwähne Quellen wenn du Informationen aus bereitgestellten Dokumenten verwendest

Antworte auf Deutsch und biete hilfreiche Finanzanalysen.`
}

// Rate Limiting
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

// Auth Verification
async function verifyUserAndPremium(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return { error: 'No authorization header', status: 401 }
    }

    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      console.error('Auth error:', error)
      return { error: 'Invalid token', status: 401 }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_premium) {
      return { error: 'Premium subscription required', status: 403 }
    }

    return { user, premium: true }
  } catch (error) {
    console.error('Auth verification failed:', error)
    return { error: 'Authentication failed', status: 500 }
  }
}

// OpenAI Call
async function callOpenAI(messages: ChatMessage[], analysisType: string) {
  const requestBody = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: buildSystemPrompt(analysisType) },
      ...messages
    ],
    stream: false,
    temperature: analysisType === 'superinvestor' ? 0.3 : analysisType === 'hybrid' ? 0.25 : 0.2,
    max_tokens: 3000
  }

  console.log(`📤 DEBUG: Sending to OpenAI:`, {
    model: requestBody.model,
    systemPromptLength: requestBody.messages[0].content.length,
    userPromptLength: requestBody.messages[requestBody.messages.length - 1].content.length,
    temperature: requestBody.temperature,
    analysisType
  })

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30000)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`OpenAI API error: ${response.status} - ${errorText}`)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  return response
}

// Parse AI Response
function parseAIResponse(content: string, analysisType: string): EnhancedAIResponse {
  const charts: ChartData[] = []
  const actions: QuickAction[] = []
  
  const chartRegex = /\[CHART:(\w+):([^:]+):?([^\]]*)\]/g
  let match
  while ((match = chartRegex.exec(content)) !== null) {
    const [, type, identifier, period] = match
    charts.push({
      type: type as any,
      title: `${identifier} ${type.charAt(0).toUpperCase() + type.slice(1)} Chart`,
      ticker: analysisType === 'stock' || analysisType === 'hybrid' ? identifier : undefined,
      investor: analysisType === 'superinvestor' || analysisType === 'hybrid' ? identifier : undefined,
      period: period || '6M',
      data: []
    })
  }
  
  const actionRegex = /\[ACTION:([^:]+):([^:]+):([^\]]+)\]/g
  while ((match = actionRegex.exec(content)) !== null) {
    const [, label, identifier, prompt] = match
    actions.push({
      label: label.replace(/-/g, ' '),
      action: label.toLowerCase(),
      ticker: analysisType === 'stock' || analysisType === 'hybrid' ? identifier : undefined,
      investor: analysisType === 'superinvestor' || analysisType === 'hybrid' ? identifier : undefined,
      prompt
    })
  }
  
  const cleanContent = content
    .replace(/\[CHART:[^\]]+\]/g, '')
    .replace(/\[ACTION:[^\]]+\]/g, '')
    .trim()
  
  return { 
    content: cleanContent, 
    charts, 
    actions,
    metadata: {
      tickers: charts.map(c => c.ticker).filter(Boolean) as string[],
      dataFreshness: new Date().toISOString(),
      analysisType
    }
  }
}

// ✅ ENHANCED MAIN API ENDPOINT
export async function POST(request: NextRequest) {
  console.log('🚨 ENHANCED AI ROUTE CALLED!', new Date().toISOString())
  try {
    await initializeRAGSystem()

    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { 
          error: `Zu viele Anfragen. Limit: ${RATE_LIMIT} pro 15min`,
          remaining: 0
        },
        { status: 429 }
      )
    }

    const authResult = await verifyUserAndPremium(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body: RequestBody = await request.json()
    const { 
      message, 
      context, 
      analysisType = 'general',
      primaryContext = 'general',
      ticker,
      investor,
      portfolioData: fallbackPortfolioData,
      contextHints
    } = body

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    console.log(`🚀 DEBUG: [Enhanced FinClue AI] ${analysisType} analysis request`, { 
      message: message.substring(0, 100) + '...',
      ticker, 
      investor,
      analysisType,
      primaryContext,
      ragEnabled: !!ragSystem,
      isHybrid: analysisType === 'hybrid',
      contextHints
    })

    let enhancedStockData: any = null
    let enhancedPortfolioData: any = null

    // ✅ ENHANCED: Load both types of data for hybrid queries
    if ((analysisType === 'stock' || analysisType === 'hybrid') && ticker) {
      console.log('🔍 DEBUG: Fetching financial data for:', ticker)
      enhancedStockData = await fetchCurrentFinancialData(ticker, true)
    }

    if ((analysisType === 'superinvestor' || analysisType === 'hybrid') && investor) {
      try {
        console.log('👑 DEBUG: Loading portfolio data for:', investor)
        enhancedPortfolioData = preparePortfolioDataForAI(investor)
        
        if (!enhancedPortfolioData && fallbackPortfolioData) {
          console.log(`🔄 DEBUG: Using fallback portfolio data for ${investor}`)
          enhancedPortfolioData = fallbackPortfolioData
        }
      } catch (importError) {
        console.error(`❌ DEBUG: Error loading portfolio data for ${investor}:`, importError)
        if (fallbackPortfolioData) {
          enhancedPortfolioData = fallbackPortfolioData
        }
      }
    }

    // ✅ ENHANCED: Build hybrid/contextual prompt
    const { prompt: enhancedMessage, ragSources } = await buildContextualPrompt(
      analysisType,
      primaryContext,
      message,
      ticker,
      investor,
      enhancedStockData,
      enhancedPortfolioData,
      contextHints
    )

    console.log('🎯 DEBUG: Enhanced prompt created:', {
      promptLength: enhancedMessage.length,
      analysisType,
      primaryContext,
      hasStockData: !!enhancedStockData,
      hasPortfolioData: !!enhancedPortfolioData,
      ragSourcesCount: ragSources.length,
      isHybrid: analysisType === 'hybrid'
    })

    const messages: ChatMessage[] = [
      ...context.slice(-6),
      { role: 'user', content: enhancedMessage }
    ]

    console.log(`📡 DEBUG: Calling OpenAI for ${analysisType} analysis...`)
    
    const openAIResponse = await callOpenAI(messages, analysisType)
    const responseData = await openAIResponse.json()
    
    const aiContent = responseData.choices?.[0]?.message?.content || ''
    console.log('📥 DEBUG: AI Response received:', {
      responseLength: aiContent.length,
      analysisType,
      isHybrid: analysisType === 'hybrid',
      preview: aiContent.substring(0, 200) + '...'
    })
    
    const parsedResponse = parseAIResponse(aiContent, analysisType)
    
    // ✅ ENHANCED: Add hybrid metadata
    if (parsedResponse.metadata) {
      parsedResponse.metadata.ragSources = ragSources
      parsedResponse.metadata.isHybrid = analysisType === 'hybrid'
      parsedResponse.metadata.primaryContext = primaryContext
      parsedResponse.metadata.ticker = ticker
      parsedResponse.metadata.investor = investor
    }
    
    // Load chart data if needed
    if (ticker && (analysisType === 'stock' || analysisType === 'hybrid')) {
      for (const chart of parsedResponse.charts || []) {
        if (chart.ticker) {
          console.log(`📈 DEBUG: Loading chart data for ${chart.ticker}`)
          chart.data = await fetchChartData(chart.ticker, chart.period)
        }
      }
    }

    const remaining = RATE_LIMIT - (rateLimiter.get(ip)?.count || 0)
    
    console.log(`✅ DEBUG: Enhanced AI response generated successfully for ${analysisType} with ${ragSources.length} RAG sources`)
    
    return NextResponse.json({
      success: true,
      response: parsedResponse,
      usage: responseData.usage,
      remaining,
      ragEnabled: !!ragSystem,
      ragSourcesCount: ragSources.length,
      analysisType,
      isHybrid: analysisType === 'hybrid',
      primaryContext
    })

  } catch (error) {
    console.error('❌ DEBUG: [Enhanced FinClue AI] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    try {
      const body: RequestBody = await request.json()
      const { message, context, analysisType = 'general' } = body
      
      const messages: ChatMessage[] = [
        ...context.slice(-6),
        { role: 'user', content: message }
      ]

      console.log('🔄 DEBUG: Falling back to basic OpenAI call...')
      const openAIResponse = await callOpenAI(messages, analysisType)
      const responseData = await openAIResponse.json()
      
      const aiContent = responseData.choices?.[0]?.message?.content || ''
      const parsedResponse = parseAIResponse(aiContent, analysisType)
      
      parsedResponse.content += "\n\n⚠️ Hinweis: Erweiterte Finanzdaten temporär nicht verfügbar."
      
      const ip = request.headers.get('x-forwarded-for') || 'unknown'
      const remaining = RATE_LIMIT - (rateLimiter.get(ip)?.count || 0)
      
      console.log('✅ DEBUG: Fallback response generated')
      
      return NextResponse.json({
        success: true,
        response: parsedResponse,
        usage: responseData.usage,
        remaining,
        fallback: true
      })
      
    } catch (fallbackError) {
      console.error('❌ DEBUG: Fallback also failed:', fallbackError)
      return NextResponse.json(
        { error: 'Service temporär nicht verfügbar', details: errorMessage },
        { status: 500 }
      )
    }
  }
}