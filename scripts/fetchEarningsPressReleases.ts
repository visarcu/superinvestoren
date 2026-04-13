/**
 * fetchEarningsPressReleases.ts
 *
 * Fetches 8-K earnings press releases from SEC EDGAR,
 * saves the cleaned text, and generates AI summaries in German.
 *
 * Uses the same EDGAR logic as fetchEdgarKPIs.ts but focuses on
 * storing the full press release + generating structured summaries.
 *
 * Usage:
 *   npx tsx scripts/fetchEarningsPressReleases.ts              # All companies
 *   npx tsx scripts/fetchEarningsPressReleases.ts NFLX         # Single ticker
 *   npx tsx scripts/fetchEarningsPressReleases.ts NFLX --limit 8  # Last 8 quarters
 *   npx tsx scripts/fetchEarningsPressReleases.ts --summarize-only  # Only generate missing summaries
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ─── Companies (same as fetchEdgarKPIs + buildEarningsCalendar) ──────────────

const COMPANIES: Record<string, { cik: string; name: string; forms?: string[] }> = {
  AAPL: { cik: '320193', name: 'Apple Inc.' },
  MSFT: { cik: '789019', name: 'Microsoft Corporation' },
  GOOGL: { cik: '1652044', name: 'Alphabet Inc.' },
  AMZN: { cik: '1018724', name: 'Amazon.com' },
  NVDA: { cik: '1045810', name: 'NVIDIA Corporation' },
  META: { cik: '1326801', name: 'Meta Platforms' },
  TSLA: { cik: '1318605', name: 'Tesla, Inc.' },
  NFLX: { cik: '1065280', name: 'Netflix Inc' },
  V: { cik: '1403161', name: 'Visa Inc.' },
  MA: { cik: '1141391', name: 'Mastercard Inc.' },
  UBER: { cik: '1543151', name: 'Uber Technologies' },
  ABNB: { cik: '1559720', name: 'Airbnb, Inc.' },
  SHOP: { cik: '1594805', name: 'Shopify Inc.' },
  SPOT: { cik: '1639920', name: 'Spotify Technology', forms: ['6-K'] },
  SNAP: { cik: '1564408', name: 'Snap Inc.' },
  PINS: { cik: '1506293', name: 'Pinterest, Inc.' },
  SAP: { cik: '1000184', name: 'SAP SE', forms: ['20-F'] },
  JPM: { cik: '19617', name: 'JPMorgan Chase' },
  BAC: { cik: '70858', name: 'Bank of America' },
  GS: { cik: '886982', name: 'Goldman Sachs' },
  JNJ: { cik: '200406', name: 'Johnson & Johnson' },
  UNH: { cik: '731766', name: 'UnitedHealth Group' },
  LLY: { cik: '59478', name: 'Eli Lilly' },
  KO: { cik: '21344', name: 'Coca-Cola' },
  PEP: { cik: '77476', name: 'PepsiCo' },
  WMT: { cik: '104169', name: 'Walmart Inc.' },
  DIS: { cik: '1744489', name: 'Walt Disney' },
  AMD: { cik: '2488', name: 'Advanced Micro Devices' },
  CRM: { cik: '1108524', name: 'Salesforce' },
  ADBE: { cik: '796343', name: 'Adobe Inc.' },
  PYPL: { cik: '1633917', name: 'PayPal Holdings' },
  NKE: { cik: '320187', name: 'Nike, Inc.' },
  SBUX: { cik: '829224', name: 'Starbucks Corp.' },
  MCD: { cik: '63908', name: "McDonald's Corp." },
  COIN: { cik: '1679788', name: 'Coinbase Global' },
}

// ─── EDGAR Helpers (reused from fetchEdgarKPIs.ts) ───────────────────────────

interface EdgarFiling {
  accessionNumber: string
  filingDate: string
  form: string
  primaryDocument: string
}

async function getEarningsFilings(cik: string, limit: number, targetForms = ['8-K']): Promise<EdgarFiling[]> {
  const paddedCik = cik.padStart(10, '0')
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`
  const res = await fetch(url, { headers: { 'User-Agent': 'Finclue research@finclue.de' } })
  if (!res.ok) throw new Error(`EDGAR submissions: ${res.status}`)

  const data = await res.json()
  const allFilings = { ...data.filings?.recent }

  // Load additional filing pages if needed
  const extraFiles: { name: string }[] = data.filings?.files || []
  if (extraFiles.length > 0 && allFilings.form?.length < 50) {
    try {
      const extraRes = await fetch(`https://data.sec.gov/submissions/${extraFiles[0].name}`, {
        headers: { 'User-Agent': 'Finclue research@finclue.de' },
      })
      if (extraRes.ok) {
        const extraData = await extraRes.json()
        for (const key of Object.keys(allFilings)) {
          if (Array.isArray(extraData[key])) {
            allFilings[key] = [...extraData[key], ...allFilings[key]]
          }
        }
      }
    } catch { /* ignore */ }
  }

  if (!allFilings.form) return []

  const results: EdgarFiling[] = []
  for (let i = 0; i < allFilings.form.length && results.length < limit; i++) {
    if (targetForms.includes(allFilings.form[i])) {
      results.push({
        accessionNumber: allFilings.accessionNumber[i],
        filingDate: allFilings.filingDate[i],
        form: allFilings.form[i],
        primaryDocument: allFilings.primaryDocument[i],
      })
    }
  }
  return results
}

async function findExhibitDoc(cik: string, accessionNumber: string, primaryDoc: string): Promise<string | null> {
  const accNoClean = accessionNumber.replace(/-/g, '')
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accNoClean}/${accessionNumber}-index.htm`
  const res = await fetch(indexUrl, { headers: { 'User-Agent': 'Finclue research@finclue.de' } })
  if (!res.ok) return null

  const html = await res.text()
  const matches = [...html.matchAll(/href="[^"]*\/([^"\/]+\.htm)"/gi)]
  const filenames = matches.map(m => m[1])

  return (
    filenames.find(n => /ex.?99.?1/i.test(n) || /ex991/i.test(n) || /exhibit.?99/i.test(n)) ||
    filenames.find(n => /pr\.htm/i.test(n) || /pressrelease/i.test(n) || /earnings/i.test(n)) ||
    filenames.find(n => !/cfo/i.test(n) && !/cover/i.test(n) && n !== primaryDoc) ||
    null
  )
}

async function fetchPressReleaseText(cik: string, accessionNumber: string, primaryDoc: string): Promise<{ text: string; url: string }> {
  const accNoClean = accessionNumber.replace(/-/g, '')
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accNoClean}`

  const exhibitDoc = await findExhibitDoc(cik, accessionNumber, primaryDoc)
  const docToFetch = exhibitDoc || (primaryDoc === 'index.htm' ? null : primaryDoc)
  if (!docToFetch) throw new Error(`No press release document found for ${accessionNumber}`)

  const url = `${baseUrl}/${docToFetch}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Finclue research@finclue.de' } })
  if (!res.ok) throw new Error(`EDGAR filing fetch failed: ${res.status}`)

  const html = await res.text()
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return { text, url }
}

// ─── Quarter Detection ───────────────────────────────────────────────────────

function detectQuarter(filingDate: string, text: string): { quarter: number; year: number; period: string; periodEndDate: string } | null {
  // Try to extract from text first
  const qMatch = text.match(/(?:Q([1-4])\s+(?:FY\s*)?(\d{4}))|(?:(?:first|second|third|fourth)\s+quarter\s+(?:of\s+)?(?:fiscal\s+year\s+)?(\d{4}))/i)

  if (qMatch) {
    if (qMatch[1] && qMatch[2]) {
      const q = parseInt(qMatch[1])
      const y = parseInt(qMatch[2])
      return { quarter: q, year: y, period: `Q${q} ${y}`, periodEndDate: getQuarterEndDate(q, y) }
    }
    if (qMatch[3]) {
      const qWord = text.match(/(first|second|third|fourth)\s+quarter/i)?.[1]?.toLowerCase()
      const qMap: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 }
      const q = qMap[qWord || ''] || 0
      const y = parseInt(qMatch[3])
      if (q > 0) return { quarter: q, year: y, period: `Q${q} ${y}`, periodEndDate: getQuarterEndDate(q, y) }
    }
  }

  // Fallback: Quarter from months ended
  const monthsMatch = text.match(/(?:three|six|nine|twelve)\s+months?\s+ended\s+(\w+\s+\d{1,2},?\s+\d{4})/i)
  if (monthsMatch) {
    const d = new Date(monthsMatch[1])
    if (!isNaN(d.getTime())) {
      const month = d.getMonth() + 1
      const q = Math.ceil(month / 3)
      const y = d.getFullYear()
      return { quarter: q, year: y, period: `Q${q} ${y}`, periodEndDate: getQuarterEndDate(q, y) }
    }
  }

  // Fallback: derive from filing date (earnings usually filed within ~1 month of quarter end)
  const fd = new Date(filingDate)
  const month = fd.getMonth() + 1 // 1-12
  // Filing in Jan/Feb → Q4 of previous year, Apr/May → Q1, Jul/Aug → Q2, Oct/Nov → Q3
  const quarterMap: Record<number, { q: number; yOffset: number }> = {
    1: { q: 4, yOffset: -1 }, 2: { q: 4, yOffset: -1 },
    3: { q: 4, yOffset: -1 }, 4: { q: 1, yOffset: 0 },
    5: { q: 1, yOffset: 0 }, 6: { q: 2, yOffset: 0 },
    7: { q: 2, yOffset: 0 }, 8: { q: 3, yOffset: 0 },
    9: { q: 3, yOffset: 0 }, 10: { q: 3, yOffset: 0 },
    11: { q: 4, yOffset: 0 }, 12: { q: 4, yOffset: 0 },
  }
  const mapping = quarterMap[month]
  if (!mapping) return null

  const q = mapping.q
  const y = fd.getFullYear() + mapping.yOffset
  return { quarter: q, year: y, period: `Q${q} ${y}`, periodEndDate: getQuarterEndDate(q, y) }
}

function getQuarterEndDate(q: number, y: number): string {
  const ends: Record<number, string> = {
    1: `${y}-03-31`,
    2: `${y}-06-30`,
    3: `${y}-09-30`,
    4: `${y}-12-31`,
  }
  return ends[q] || `${y}-12-31`
}

// ─── AI Summary Generation ──────────────────────────────────────────────────

async function generateEarningsSummary(
  ticker: string,
  companyName: string,
  period: string,
  pressReleaseText: string
): Promise<{ summary: string; highlights: Record<string, any> }> {
  // Truncate for AI processing (first 16k chars contain the key financials)
  const truncatedText = pressReleaseText.slice(0, 16000)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Du bist ein erfahrener Finanzanalyst. Erstelle eine präzise deutsche Zusammenfassung der Quartalszahlen von ${companyName} (${ticker}).

REGELN:
- Alle Zahlen und Texte auf DEUTSCH
- Verwende NUR echte Zahlen aus dem Text, KEINE Platzhalter
- Unterscheide klar zwischen Segment-Umsatz und Gesamtumsatz
- Kennzeichne Guidance/Ausblick deutlich
- Maximal 300 Wörter
- Formatiere mit Markdown

FORMAT:
## Zusammenfassung
[2-3 Sätze Kernaussage: Umsatz, Gewinn, wesentliche Entwicklung]

## Kennzahlen
- **Umsatz**: $X Mrd. (±X% YoY)
- **Gewinn je Aktie (EPS)**: $X.XX (±X% YoY)
- **Nettogewinn**: $X Mrd.
[Weitere relevante Kennzahlen]

## Highlights
- [Wichtigste positive Entwicklung]
- [Weitere Highlights]

## Ausblick
- [Guidance falls vorhanden]

Zusätzlich extrahiere strukturierte Daten als JSON-Block am Ende, eingeschlossen in \`\`\`json ... \`\`\`:
{
  "revenue_reported": <number in millions or null>,
  "eps_reported": <number or null>,
  "net_income": <number in millions or null>,
  "revenue_yoy_pct": <number or null>,
  "eps_yoy_pct": <number or null>,
  "guidance_revenue": <number in millions or null>,
  "guidance_eps": <number or null>,
  "beat_or_miss": "beat" | "miss" | "inline" | null,
  "sentiment": "positiv" | "negativ" | "neutral"
}`
      },
      {
        role: 'user',
        content: `Quartalszahlen ${period} von ${companyName} (${ticker}):\n\n${truncatedText}`
      }
    ],
    temperature: 0.1,
    max_tokens: 2000,
  })

  const fullResponse = response.choices[0]?.message?.content || ''

  // Extract JSON highlights from the response
  let highlights: Record<string, any> = {}
  const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    try {
      highlights = JSON.parse(jsonMatch[1])
    } catch { /* ignore parse errors */ }
  }

  // Remove the JSON block from the summary text
  const summary = fullResponse.replace(/```json[\s\S]*?```/, '').trim()

  return { summary, highlights }
}

// ─── Main Processing ────────────────────────────────────────────────────────

async function processCompany(ticker: string, limit: number, summarizeOnly: boolean) {
  const company = COMPANIES[ticker]
  if (!company) { console.error(`  Unknown: ${ticker}`); return }

  console.log(`\n📊 ${company.name} (${ticker})`)

  if (summarizeOnly) {
    // Only generate summaries for entries that have text but no summary
    const { data: missing } = await supabase
      .from('SecEarningsPressReleases')
      .select('id, ticker, company_name, period, press_release_text')
      .eq('ticker', ticker)
      .is('ai_summary', null)
      .not('press_release_text', 'is', null)
      .order('filing_date', { ascending: false })
      .limit(limit)

    if (!missing || missing.length === 0) {
      console.log('  Alle Summaries vorhanden')
      return
    }

    console.log(`  ${missing.length} fehlende Summaries`)
    for (const row of missing) {
      try {
        console.log(`  → Generiere Summary für ${row.period}...`)
        const { summary, highlights } = await generateEarningsSummary(
          row.ticker, row.company_name, row.period, row.press_release_text
        )

        await supabase
          .from('SecEarningsPressReleases')
          .update({
            ai_summary: summary,
            ai_summary_model: 'gpt-4o-mini',
            key_highlights: highlights,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)

        console.log(`     ✅ Summary generiert (${summary.length} chars)`)
        await new Promise(r => setTimeout(r, 500)) // Rate limit OpenAI
      } catch (err) {
        console.error(`     ❌ ${err instanceof Error ? err.message : err}`)
      }
    }
    return
  }

  // Full mode: Fetch press releases + generate summaries
  const targetForms = company.forms || ['8-K']
  const filings = await getEarningsFilings(company.cik, limit * 3, targetForms)
  console.log(`  ${filings.length} ${targetForms.join('/')} filings gefunden`)

  let processed = 0
  let saved = 0

  for (const filing of filings) {
    if (processed >= limit) break

    try {
      const { text, url: filingUrl } = await fetchPressReleaseText(
        company.cik, filing.accessionNumber, filing.primaryDocument
      )

      // Skip non-earnings filings
      const looksLikeEarnings = /revenue|quarter|earnings|results of operations|financial results/i.test(text.slice(0, 3000))
      if (!looksLikeEarnings) continue

      const qInfo = detectQuarter(filing.filingDate, text)
      if (!qInfo) {
        console.log(`  → ${filing.filingDate} | Quartal nicht erkannt, übersprungen`)
        continue
      }

      // Check if already stored
      const { data: existing } = await supabase
        .from('SecEarningsPressReleases')
        .select('id, ai_summary')
        .eq('ticker', ticker)
        .eq('period', qInfo.period)
        .single()

      if (existing?.ai_summary) {
        console.log(`  → ${qInfo.period} | Bereits vorhanden mit Summary`)
        processed++
        continue
      }

      // Save press release text
      const { error: upsertError } = await supabase
        .from('SecEarningsPressReleases')
        .upsert({
          ticker,
          company_name: company.name,
          period: qInfo.period,
          fiscal_quarter: qInfo.quarter,
          fiscal_year: qInfo.year,
          filing_date: filing.filingDate,
          period_end_date: qInfo.periodEndDate,
          accession_number: filing.accessionNumber,
          filing_url: filingUrl,
          press_release_text: text.slice(0, 50000), // Store up to 50k chars
          source: 'sec-edgar-8k',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'ticker,period' })

      if (upsertError) {
        console.error(`  → ${qInfo.period} | Speicherfehler: ${upsertError.message}`)
        processed++
        continue
      }

      saved++
      console.log(`  → ${qInfo.period} | ✅ Press Release gespeichert (${text.length} chars)`)

      // Generate AI summary
      if (!existing?.ai_summary) {
        try {
          console.log(`     Generiere Summary...`)
          const { summary, highlights } = await generateEarningsSummary(
            ticker, company.name, qInfo.period, text
          )

          await supabase
            .from('SecEarningsPressReleases')
            .update({
              ai_summary: summary,
              ai_summary_model: 'gpt-4o-mini',
              key_highlights: highlights,
              updated_at: new Date().toISOString(),
            })
            .eq('ticker', ticker)
            .eq('period', qInfo.period)

          console.log(`     ✅ Summary generiert`)
        } catch (sumErr) {
          console.log(`     ⚠️ Summary-Fehler: ${sumErr instanceof Error ? sumErr.message : sumErr}`)
          // Press release is saved, summary can be generated later
        }
      }

      processed++
      await new Promise(r => setTimeout(r, 300)) // Rate limit EDGAR
    } catch (err) {
      console.error(`  → ${filing.filingDate} | ❌ ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`  Ergebnis: ${processed} verarbeitet, ${saved} gespeichert`)
}

// ─── CLI ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const limitIdx = args.indexOf('--limit')
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 8
  const summarizeOnly = args.includes('--summarize-only')

  const tickers = args.filter(a => !a.startsWith('--') && isNaN(Number(a)))
  const targets = tickers.length > 0 ? tickers.map(t => t.toUpperCase()) : Object.keys(COMPANIES)

  console.log(`🚀 Finclue Earnings Press Release Fetcher`)
  console.log(`   Modus: ${summarizeOnly ? 'Nur Summaries generieren' : 'Fetch + Summarize'}`)
  console.log(`   Companies: ${targets.length}`)
  console.log(`   Limit: ${limit} pro Unternehmen\n`)

  for (const ticker of targets) {
    await processCompany(ticker, limit, summarizeOnly)
  }

  console.log('\n✅ Fertig!')
}

main().catch(err => { console.error(err); process.exit(1) })
