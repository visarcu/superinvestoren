// app/api/earnings-summary/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Supabase Client mit Service Role Key (für Schreibrechte)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // WICHTIG: Service Role Key für Schreibrechte
)

export async function POST(request: NextRequest) {
  try {
    const { ticker, year, quarter, content } = await request.json()
    
    // Validation
    if (!ticker || !year || !quarter || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    console.log(`📋 Summary request for ${ticker} Q${quarter} ${year}`)
    
    // 1. Check Supabase Cache
    const { data: cached, error: fetchError } = await supabaseAdmin
      .from('earnings_summaries')
      .select('summary, created_at, model')
      .eq('ticker', ticker.toUpperCase())
      .eq('year', year)
      .eq('quarter', quarter)
      .single()
    
    if (cached && !fetchError) {
      console.log('✅ Returning cached summary from Supabase')
      return NextResponse.json({ 
        summary: cached.summary,
        cached: true,
        source: 'database',
        created_at: cached.created_at,
        model: cached.model
      })
    }
    
    console.log('🤖 Generating new AI summary...')
    
    // 2. Verbesserte Content-Preprocessing
    const processedContent = preprocessTranscript(content, ticker)
    
    // 3. Generate new summary with improved prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Besseres Model für Faktentreue
      messages: [
        {
          role: "system",
          content: getImprovedSystemPrompt(ticker)
        },
        {
          role: "user",
          content: `Erstelle eine Zusammenfassung für ${ticker} Q${quarter} ${year} Earnings Call:\n\n${processedContent}`
        }
      ],
      temperature: 0.1, // Sehr niedrig für maximale Faktentreue
      max_tokens: 800,
      presence_penalty: 0,
      frequency_penalty: 0
    })
    
    const summary = completion.choices[0].message.content
    
    if (!summary) {
      throw new Error('No summary generated')
    }
    
    // 4. Post-processing: Validiere kritische Zahlen
    const validatedSummary = validateFinancialNumbers(summary, ticker)
    
    // 5. Save to Supabase
    const { data: saved, error: saveError } = await supabaseAdmin
      .from('earnings_summaries')
      .upsert({
        ticker: ticker.toUpperCase(),
        year: parseInt(year),
        quarter: parseInt(quarter),
        summary: validatedSummary,
        model: 'gpt-4o-mini'
      })
      .select()
      .single()
    
    if (saveError) {
      console.error('⚠️ Could not save to Supabase:', saveError)
      // Trotzdem die Summary zurückgeben
    } else {
      console.log('💾 Summary saved to Supabase')
    }
    
    // 6. Return the summary
    return NextResponse.json({
      summary: validatedSummary,
      cached: false,
      source: 'openai',
      model: 'gpt-4o-mini',
      created_at: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ Error in earnings-summary:', error)
    
    // Detaillierte Fehlerbehandlung
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'OpenAI API Quota exceeded. Please check your billing.' },
        { status: 429 }
      )
    }
    
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Database configuration error. Please check Supabase setup.' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate summary',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// ✅ VERBESSERTER SYSTEM PROMPT
function getImprovedSystemPrompt(ticker: string): string {
  return `Du bist ein erfahrener Finanzanalyst mit Spezialisierung auf ${ticker}. Erstelle eine präzise deutsche Zusammenfassung des Earnings Calls.

KRITISCHE REGELN FÜR ZAHLEN:
1. Unterscheide IMMER zwischen Segment-Umsatz und Gesamt-Umsatz
2. Bei Microsoft: Azure/Cloud ist EIN Segment, nicht der Gesamtumsatz
3. Bei Apple: iPhone ist EIN Segment, nicht der Gesamtumsatz  
4. Bei Amazon: AWS ist EIN Segment, nicht der Gesamtumsatz
5. Verwende NUR Zahlen, die explizit im Text als "total revenue" oder "Gesamtumsatz" genannt werden
6. Wenn unklar: Schreibe "Segment-Umsatz" oder "Cloud-Umsatz" statt "Umsatz"

WEITERE REGELN:
- Verwende NUR echte Zahlen aus dem Transcript
- KEINE Platzhalter wie $XX.X oder ±X%
- Bei Unsicherheit: Lass die Kennzahl komplett weg
- Kennzeichne Segmente deutlich (z.B. "Azure-Umsatz", "iPhone-Umsatz")
- Prüfe Kontext: Quarterly vs Annual vs Segment

Format (nutze Emojis):

📊 KENNZAHLEN
[Zeige NUR Kennzahlen mit echten Zahlen aus dem Text - keine Platzhalter!]
• Cloud-Umsatz: $168 Mrd. (+23% YoY) [Beispiel - nur wenn im Text]
• EPS: $2.95 (+10% YoY) [Beispiel - nur wenn im Text]

WICHTIG: Wenn keine Gesamtumsatz-Zahl explizit genannt wird, dann lass sie weg!

✅ POSITIVE ENTWICKLUNGEN
• [Konkrete Highlights mit korrekten Zahlen]

⚠️ HERAUSFORDERUNGEN
• [Falls erwähnt]

🎯 GUIDANCE & AUSBLICK
• [Konkrete Prognosen]

💡 FAZIT
[Prägnante Einschätzung]

WICHTIG: Lieber weniger Zahlen als falsche Zahlen!`
}

// ✅ CONTENT PREPROCESSING
function preprocessTranscript(content: string, ticker: string): string {
  // Erweitere auf 12000 Zeichen für besseren Kontext
  const maxLength = 12000
  
  // Priorisiere relevante Sections
  const sections = content.split(/(?=(?:Operator|Questions and Answers|Presentation))/i)
  
  let processedContent = ''
  let currentLength = 0
  
  // Zuerst: Management Presentation (meist wichtigste Zahlen)
  const presentationSection = sections.find(s => 
    s.toLowerCase().includes('presentation') || 
    s.toLowerCase().includes('prepared remarks')
  )
  
  if (presentationSection && currentLength < maxLength) {
    const sectionLength = Math.min(presentationSection.length, maxLength - currentLength)
    processedContent += presentationSection.substring(0, sectionLength)
    currentLength += sectionLength
  }
  
  // Dann: Restliche Sections
  for (const section of sections) {
    if (currentLength >= maxLength) break
    if (section === presentationSection) continue
    
    const remainingSpace = maxLength - currentLength
    if (remainingSpace > 500) { // Nur wenn genug Platz
      processedContent += '\n\n' + section.substring(0, remainingSpace)
      currentLength += section.length
    }
  }
  
  return processedContent
}

// ✅ POST-PROCESSING VALIDATION
function validateFinancialNumbers(summary: string, ticker: string): string {
  let validatedSummary = summary
  
  // Warnung bei potentiell problematischen Zahlen
  const segmentKeywords: { [key: string]: string[] } = {
    'MSFT': ['azure', 'cloud', 'office', 'windows'],
    'AAPL': ['iphone', 'mac', 'ipad', 'services'],
    'AMZN': ['aws', 'advertising', 'prime'],
    'GOOGL': ['search', 'youtube', 'cloud', 'other bets']
  }
  
  const keywords = segmentKeywords[ticker.toUpperCase()] || []
  
  // Füge Klarstellungen hinzu
  for (const keyword of keywords) {
    const regex = new RegExp(`(${keyword}[^:]*?):\\s*\\$([\\d,\\.]+)\\s*(Mrd\\.|billion)`, 'gi')
    validatedSummary = validatedSummary.replace(regex, (match, prefix, amount, unit) => {
      // Prüfe ob es als "Umsatz" ohne Segment-Kennzeichnung dargestellt wird
      if (match.toLowerCase().includes('umsatz') && !match.toLowerCase().includes(`${keyword}-umsatz`)) {
        return `${prefix}: $${amount} ${unit} (${keyword.charAt(0).toUpperCase() + keyword.slice(1)}-Segment)`
      }
      return match
    })
  }
  
  return validatedSummary
}

// GET Endpoint zum Testen
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const ticker = searchParams.get('ticker')
  const year = searchParams.get('year')
  const quarter = searchParams.get('quarter')
  
  if (!ticker || !year || !quarter) {
    return NextResponse.json(
      { error: 'Missing parameters. Required: ticker, year, quarter' },
      { status: 400 }
    )
  }
  
  try {
    const { data, error } = await supabaseAdmin
      .from('earnings_summaries')
      .select('*')
      .eq('ticker', ticker.toUpperCase())
      .eq('year', parseInt(year))
      .eq('quarter', parseInt(quarter))
      .single()
    
    if (error || !data) {
      return NextResponse.json(
        { error: 'No summary found', details: error?.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(data)
    
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch summary', details: error.message },
      { status: 500 }
    )
  }
}