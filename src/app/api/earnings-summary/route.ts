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

// Eine Generierung über ein vollständiges Transcript dauert ~35s (gemessen: META Q2 2026,
// 60k Zeichen). Ohne diese Angabe greift der Vercel-Default von 15s und die Generierung
// läuft in den Timeout, bevor OpenAI antwortet.
export const maxDuration = 120

const MODEL = 'gpt-5-mini'

// Version-Tag für Prompt/Preprocessing. Wird zusammen mit dem Modell in der
// `model`-Spalte gespeichert. Cached Summaries mit einem anderen Tag gelten als
// veraltet und werden neu generiert (v2: vollständiges Transcript statt der
// ersten 10.000 Zeichen — davor fehlten die CFO-Zahlen komplett).
const SUMMARY_VERSION = 'v2'
const MODEL_TAG = `${MODEL}@${SUMMARY_VERSION}`

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

    if (cached && !fetchError && cached.model === MODEL_TAG) {
      console.log('✅ Returning cached summary from Supabase')
      return NextResponse.json({
        summary: cached.summary,
        cached: true,
        source: 'database',
        created_at: cached.created_at,
        model: cached.model
      })
    }

    if (cached && !fetchError) {
      console.log(`♻️ Cached summary is stale (${cached.model} ≠ ${MODEL_TAG}) — regenerating`)
    }

    console.log('🤖 Generating new AI summary...')
    
    // 2. Verbesserte Content-Preprocessing
    const processedContent = preprocessTranscript(content, ticker)
    
    console.log(`📄 Transcript: ${content.length} Zeichen → ${processedContent.length} Zeichen an das Modell`)

    // 3. Generate new summary with improved prompt
    const completion = await openai.chat.completions.create({
      model: MODEL,
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
      max_completion_tokens: 6000  // GPT-5 braucht mehr Tokens (Reasoning + Output)
    })

    const summary = completion.choices[0]?.message?.content

    if (!summary) {
      console.error('❌ No summary in response:', completion)
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
        model: MODEL_TAG,
        created_at: new Date().toISOString()
      }, {
        // Ohne onConflict läuft der Upsert auf den Primary Key (id) und
        // kollidiert beim Neugenerieren mit UNIQUE(ticker, year, quarter)
        onConflict: 'ticker,year,quarter'
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
      model: MODEL_TAG,
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

ARBEITSWEISE:
Die Kennzahlen stehen fast nie in den Eröffnungsworten des CEO, sondern im Finanzteil des CFO
(oft in der Mitte des Transcripts, erkennbar an "Let's begin with our segment results",
"total revenue was ...", "Turning to the P&L", "Moving to our consolidated results").
Lies das gesamte Transcript durch und suche diesen Abschnitt gezielt, bevor du zusammenfasst.

KRITISCHE REGELN FÜR ZAHLEN:
1. Unterscheide IMMER zwischen Segment-Umsatz und Gesamt-Umsatz
2. Der Gesamtumsatz steht meist als "total revenue was $X billion" — genau diese Zahl gehört
   als "Gesamtumsatz" in die Kennzahlen
3. Segment-Zahlen ("Family of Apps revenue", "Azure", "iPhone", "AWS") IMMER mit Segmentnamen
   beschriften, niemals als Gesamtumsatz ausgeben
4. Verwende NUR echte Zahlen aus dem Transcript — KEINE Platzhalter wie $XX.X oder ±X%
5. Rechne nichts hoch oder um; übernimm die genannten Werte 1:1 (nur $ → Mrd./Mio.)
6. Prüfe Kontext: Quarterly vs Annual vs Segment
7. Eine Kennzahl weglassen ist nur dann richtig, wenn sie im Transcript wirklich nicht
   vorkommt — nicht, weil du sie überlesen hast

Format (nutze Emojis):

📊 KENNZAHLEN
[Nenne — sofern im Transcript vorhanden — Gesamtumsatz, Segment-Umsätze, EPS, Margen,
Gesamtkosten/OpEx und CapEx, jeweils mit YoY-Veränderung]
• Gesamtumsatz: $60,8 Mrd. (+28% YoY) [Beispiel — nur wenn im Text]
• EPS: $2.95 (+10% YoY) [Beispiel — nur wenn im Text]

✅ POSITIVE ENTWICKLUNGEN
• [Konkrete Highlights mit korrekten Zahlen]

⚠️ HERAUSFORDERUNGEN
• [Falls erwähnt]

🎯 GUIDANCE & AUSBLICK
• [Konkrete Prognosen]

💡 FAZIT
[Prägnante Einschätzung]

WICHTIG: Lieber weniger Zahlen als falsche Zahlen — aber jede Zahl, die klar im Transcript
steht, gehört auch in die Zusammenfassung.`
}

// ✅ CONTENT PREPROCESSING
// Das Transcript geht praktisch vollständig ans Modell. Ein reiner Head-Cut ist hier fatal:
// die CFO-Zahlen stehen typischerweise erst ab ~12.000 Zeichen. Nur bei extrem langen Calls
// wird die Mitte des Q&A gekürzt, Anfang (Prepared Remarks inkl. Finanzteil) und Ende
// (Guidance/Abschluss) bleiben erhalten.
const MAX_TRANSCRIPT_CHARS = 120_000

function preprocessTranscript(content: string, ticker: string): string {
  const text = content.trim()

  if (text.length <= MAX_TRANSCRIPT_CHARS) return text

  const headSize = Math.floor(MAX_TRANSCRIPT_CHARS * 0.7)
  const tailSize = MAX_TRANSCRIPT_CHARS - headSize

  return [
    text.substring(0, headSize),
    '\n\n[... Teil der Q&A-Session gekürzt ...]\n\n',
    text.substring(text.length - tailSize)
  ].join('')
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