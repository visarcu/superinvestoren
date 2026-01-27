// API Route für Natural Language → Filter Parsing
import { NextResponse } from 'next/server'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// Verfügbare Filter für den Screener
const AVAILABLE_FILTERS = {
  sector: ['Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical', 'Consumer Defensive', 'Industrials', 'Energy', 'Utilities', 'Real Estate', 'Basic Materials', 'Communication Services'],
  exchange: ['NASDAQ', 'NYSE', 'AMEX'],
  country: ['US', 'DE', 'GB', 'CN', 'JP', 'CA', 'FR', 'CH', 'AU', 'KR']
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
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

    const prompt = `Du bist ein Finanz-Daten-Parser. Analysiere die folgende Suchanfrage und extrahiere Filter-Kriterien für einen Aktien-Screener.

SUCHANFRAGE: "${query}"

VERFÜGBARE FILTER:
- sector: ${AVAILABLE_FILTERS.sector.join(', ')}
- exchange: ${AVAILABLE_FILTERS.exchange.join(', ')}
- country: ${AVAILABLE_FILTERS.country.join(', ')}
- marketCapMin: Zahl in USD (z.B. 1000000000 für 1B)
- marketCapMax: Zahl in USD
- priceMin: Zahl
- priceMax: Zahl
- peMin: P/E Ratio Minimum
- peMax: P/E Ratio Maximum
- epsMin: EPS Minimum
- epsMax: EPS Maximum
- dividendMin: Dividendenrendite in % (z.B. 3 für 3%)
- dividendMax: Dividendenrendite in %
- betaMin: Beta Minimum
- betaMax: Beta Maximum
- volumeMin: Handelsvolumen Minimum
- isPositive: true wenn nur positive Aktien gewünscht (grün, steigend, Gewinner)
- isNegative: true wenn nur negative Aktien gewünscht (rot, fallend, Verlierer)
- isThematic: true wenn die Suche qualitativ/thematisch ist (z.B. "Marktführer", "Zukunftstechnologie", "Moat", "KI", "Halterlose Schuhe")
- thematicTopic: Das extrahierte Thema oder die Story für die RAG-Suche (z.B. "Artificial Intelligence", "Economic Moat", "Cybersecurity Leaders")

ÜBERSETZUNGEN (DE → EN):
- Technologie/Tech = Technology
- Gesundheit/Pharma = Healthcare
- Finanzen/Banken = Financial Services
- Konsum/Einzelhandel = Consumer Cyclical
- Industrie = Industrials
- Energie/Öl = Energy
- Versorger = Utilities
- Immobilien = Real Estate
- Grundstoffe/Rohstoffe = Basic Materials
- Kommunikation/Medien = Communication Services
- Large Cap/Groß = marketCapMin: 10000000000
- Mid Cap/Mittel = marketCapMin: 2000000000, marketCapMax: 10000000000
- Small Cap/Klein = marketCapMax: 2000000000
- Mega Cap = marketCapMin: 200000000000
- KGV/P/E unter X = peMax: X
- KGV/P/E über X = peMin: X
- Dividende über X% = dividendMin: X
- günstig/unterbewertet = peMax: 15
- teuer/überbewertet = peMin: 30
- S&P 500 / SP500 = marketCapMin: 15000000000, country: US
- Nasdaq 100 = marketCapMin: 20000000000, exchange: NASDAQ
- DAX / Dax = marketCapMin: 1000000000, country: DE
- Penny Stocks = priceMax: 5, marketCapMax: 250000000

REGELN:
1. Gib NUR ein JSON-Objekt zurück, keine Erklärungen
2. Nutze nur die oben genannten Filter-Keys
3. Wenn etwas unklar ist, lass den Filter weg
4. Zahlen ohne Einheit interpretieren (1B = 1000000000, 10M = 10000000)
5. Bei "unter/weniger als" nutze Max-Filter, bei "über/mehr als" nutze Min-Filter
6. Markiere die Suche als "isThematic: true", wenn sie Begriffe enthält, die nicht durch P/E, Cap oder Sektoren abgedeckt werden können (z.B. "Moat", "Qualitätsführer", "AI Gewinner").
7. "Billig" oder "Günstig" bezieht sich IMMER auf die Bewertung (P/E), NIEMALS auf die Größe des Unternehmens (Market Cap), außer es wird explizit "Penny Stocks" gesagt.
8. Wenn ein Index (z.B. S&P 500) erwähnt wird, setze die entsprechenden numerischen Filter (Market Cap & Land) wie oben definiert.

Beispiele:
- "Tech Aktien mit KGV unter 25" → {"sector": "Technology", "peMax": 25, "isThematic": false}
- "Marktführer in Cybersicherheit" → {"isThematic": true, "thematicTopic": "Cybersecurity Leaders", "sector": "Technology"}
- "Günstige S&P 500 Aktien" → {"marketCapMin": 15000000000, "country": "US", "peMax": 15, "isThematic": false}
- "Große Firmen im S&P 500" → {"marketCapMin": 100000000000, "country": "US", "isThematic": false}
- "Penny Stocks unter 1 Dollar" → {"priceMax": 1, "marketCapMax": 250000000, "isThematic": false}

Antworte NUR mit dem JSON-Objekt:`

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
        temperature: 0.1, // Niedrig für konsistente Ergebnisse
        max_tokens: 200
      })
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status)
      return NextResponse.json(
        { error: 'Failed to parse query', filters: {} },
        { status: 500 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || '{}'

    // Parse JSON aus der Antwort
    let filters: Record<string, any> = {}
    try {
      // Entferne mögliche Markdown Code-Blöcke
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      filters = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      filters = {}
    }

    // Validiere und bereinige Filter
    const validatedFilters: Record<string, any> = {}

    if (filters.sector && AVAILABLE_FILTERS.sector.includes(filters.sector)) {
      validatedFilters.sector = filters.sector
    }
    if (filters.exchange && AVAILABLE_FILTERS.exchange.includes(filters.exchange)) {
      validatedFilters.exchange = filters.exchange
    }
    if (filters.country && AVAILABLE_FILTERS.country.includes(filters.country)) {
      validatedFilters.country = filters.country
    }

    // Numerische Filter
    const numericFilters = [
      'marketCapMin', 'marketCapMax', 'priceMin', 'priceMax',
      'peMin', 'peMax', 'epsMin', 'epsMax',
      'dividendMin', 'dividendMax', 'betaMin', 'betaMax', 'volumeMin'
    ]

    for (const key of numericFilters) {
      if (typeof filters[key] === 'number' && !isNaN(filters[key])) {
        validatedFilters[key] = filters[key]
      }
    }

    // Boolean Filter
    if (filters.isPositive === true) validatedFilters.isPositive = true
    if (filters.isNegative === true) validatedFilters.isNegative = true

    // Thematic Filter
    if (filters.isThematic === true) {
      validatedFilters.isThematic = true
      validatedFilters.thematicTopic = filters.thematicTopic || ''
    } else {
      validatedFilters.isThematic = false
    }

    return NextResponse.json({
      query,
      filters: validatedFilters,
      parsed: true
    })

  } catch (error) {
    console.error('Stock finder parse error:', error)
    return NextResponse.json({
      error: 'Failed to parse query',
      filters: {}
    }, { status: 500 })
  }
}
