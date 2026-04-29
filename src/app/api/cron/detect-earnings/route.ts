// Finclue Cron – Live Earnings Detection
// Pollt SEC EDGAR alle paar Minuten auf neue 8-K Filings
// und verarbeitet automatisch neue Earnings Press Releases.
//
// Vercel Cron: "*/5 * * * *" (alle 5 Minuten) — oder manuell via GET
//
// Flow:
// 1. Für jedes tracked Unternehmen: neuestes 8-K Filing von SEC
// 2. Prüfe ob Filing schon in unserer DB ist
// 3. Wenn neu: Exhibit 99.1 holen → AI Summary → in DB speichern
//
// Kein API Key nötig — SEC EDGAR ist komplett öffentlich.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { prepareForLLM, MAX_STORE_CHARS } from '@/lib/earningsExtraction'
import { generateInsightFromEarnings } from '@/lib/insightGenerator'

const EDGAR_UA = 'Finclue research@finclue.de'

// ─── Tracked Companies ──────────────────────────────────────────────────────

const TRACKED: Record<string, { cik: string; name: string; forms?: string[] }> = {
  AAPL:  { cik: '320193',  name: 'Apple Inc.' },
  MSFT:  { cik: '789019',  name: 'Microsoft Corporation' },
  GOOGL: { cik: '1652044', name: 'Alphabet Inc.' },
  AMZN:  { cik: '1018724', name: 'Amazon.com' },
  NVDA:  { cik: '1045810', name: 'NVIDIA Corporation' },
  META:  { cik: '1326801', name: 'Meta Platforms' },
  TSLA:  { cik: '1318605', name: 'Tesla, Inc.' },
  NFLX:  { cik: '1065280', name: 'Netflix Inc' },
  V:     { cik: '1403161', name: 'Visa Inc.' },
  MA:    { cik: '1141391', name: 'Mastercard Inc.' },
  UBER:  { cik: '1543151', name: 'Uber Technologies' },
  ABNB:  { cik: '1559720', name: 'Airbnb, Inc.' },
  SHOP:  { cik: '1594805', name: 'Shopify Inc.' },
  SPOT:  { cik: '1639920', name: 'Spotify Technology', forms: ['6-K'] },
  SNAP:  { cik: '1564408', name: 'Snap Inc.' },
  PINS:  { cik: '1506293', name: 'Pinterest, Inc.' },
  JPM:   { cik: '19617',   name: 'JPMorgan Chase' },
  GS:    { cik: '886982',  name: 'Goldman Sachs' },
  AMD:   { cik: '2488',    name: 'Advanced Micro Devices' },
  CRM:   { cik: '1108524', name: 'Salesforce' },
  ADBE:  { cik: '796343',  name: 'Adobe Inc.' },
  DIS:   { cik: '1744489', name: 'Walt Disney' },
  COIN:  { cik: '1679788', name: 'Coinbase Global' },
  NKE:   { cik: '320187',  name: 'Nike, Inc.' },
  SBUX:  { cik: '829224',  name: 'Starbucks Corp.' },
  SAP:   { cik: '1000184', name: 'SAP SE', forms: ['20-F'] },
  SPGI:  { cik: '64040',   name: 'S&P Global Inc.' },
}

// ─── SEC EDGAR Helpers ──────────────────────────────────────────────────────

async function getLatestEarningsFiling(cik: string, targetForms = ['8-K']): Promise<{
  accession: string; date: string; primaryDoc: string
} | null> {
  const paddedCik = cik.padStart(10, '0')
  const res = await fetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, {
    headers: { 'User-Agent': EDGAR_UA },
  })
  if (!res.ok) return null

  const data = await res.json()
  const recent = data.filings?.recent
  if (!recent?.form) return null

  // Find most recent matching filing
  for (let i = 0; i < recent.form.length; i++) {
    if (targetForms.includes(recent.form[i])) {
      return {
        accession: recent.accessionNumber[i],
        date: recent.filingDate[i],
        primaryDoc: recent.primaryDocument[i],
      }
    }
  }
  return null
}

async function findExhibitDoc(cik: string, accession: string, primaryDoc: string): Promise<string | null> {
  const accClean = accession.replace(/-/g, '')
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accClean}/${accession}-index.htm`
  const res = await fetch(indexUrl, { headers: { 'User-Agent': EDGAR_UA } })
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

async function fetchPressReleaseText(cik: string, accession: string, primaryDoc: string): Promise<{ text: string; url: string } | null> {
  const accClean = accession.replace(/-/g, '')
  const baseUrl = `https://www.sec.gov/Archives/edgar/data/${parseInt(cik)}/${accClean}`

  const exhibit = await findExhibitDoc(cik, accession, primaryDoc)
  const doc = exhibit || (primaryDoc === 'index.htm' ? null : primaryDoc)
  if (!doc) return null

  const url = `${baseUrl}/${doc}`
  const res = await fetch(url, { headers: { 'User-Agent': EDGAR_UA } })
  if (!res.ok) return null

  const html = await res.text()
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return { text, url }
}

function detectQuarter(filingDate: string, text: string): { quarter: number; year: number; period: string; endDate: string } | null {
  const qMatch = text.match(/Q([1-4])\s+(?:FY\s*)?(\d{4})/i)
  if (qMatch) {
    const q = parseInt(qMatch[1]), y = parseInt(qMatch[2])
    const ends: Record<number, string> = { 1: `${y}-03-31`, 2: `${y}-06-30`, 3: `${y}-09-30`, 4: `${y}-12-31` }
    return { quarter: q, year: y, period: `Q${q} ${y}`, endDate: ends[q] }
  }

  // Fallback from filing date
  const fd = new Date(filingDate)
  const month = fd.getMonth() + 1
  const qMap: Record<number, { q: number; yOff: number }> = {
    1: { q: 4, yOff: -1 }, 2: { q: 4, yOff: -1 }, 3: { q: 4, yOff: -1 },
    4: { q: 1, yOff: 0 }, 5: { q: 1, yOff: 0 }, 6: { q: 2, yOff: 0 },
    7: { q: 2, yOff: 0 }, 8: { q: 3, yOff: 0 }, 9: { q: 3, yOff: 0 },
    10: { q: 3, yOff: 0 }, 11: { q: 4, yOff: 0 }, 12: { q: 4, yOff: 0 },
  }
  const m = qMap[month]
  if (!m) return null
  const q = m.q, y = fd.getFullYear() + m.yOff
  const ends: Record<number, string> = { 1: `${y}-03-31`, 2: `${y}-06-30`, 3: `${y}-09-30`, 4: `${y}-12-31` }
  return { quarter: q, year: y, period: `Q${q} ${y}`, endDate: ends[q] }
}

// ─── AI Summary ─────────────────────────────────────────────────────────────

async function generateSummary(
  ticker: string, name: string, period: string, text: string
): Promise<{ summary: string; highlights: Record<string, any> }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Du bist ein Finanzanalyst. Erstelle eine präzise deutsche Zusammenfassung der Quartalszahlen von ${name} (${ticker}).

REGELN:
- Alle Zahlen auf DEUTSCH, NUR echte Zahlen aus dem Text
- Maximal 250 Wörter, Markdown
- Unterscheide Segment-Umsatz vs. Gesamtumsatz

FORMAT:
## Zusammenfassung
[2-3 Sätze]

## Kennzahlen
- **Umsatz**: $X Mrd. (±X% YoY)
- **EPS**: $X.XX
[Weitere]

## Highlights
- [Positiv/Negativ]

## Ausblick
- [Guidance falls vorhanden]

Extrahiere am Ende JSON in \`\`\`json ... \`\`\`:
{
  "revenue_reported": <number in millions or null>,
  "eps_reported": <number or null>,
  "net_income": <number in millions or null>,
  "revenue_yoy_pct": <number or null>,
  "eps_yoy_pct": <number or null>,
  "guidance_revenue": <number in millions or [low, high] or null>,
  "guidance_eps": <number or null>,
  "sentiment": "positiv" | "negativ" | "neutral"
}`
      },
      { role: 'user', content: `${period} von ${name} (${ticker}):\n\n${prepareForLLM(text).text}` }
    ],
    temperature: 0.1,
    max_tokens: 2000,
  })

  const full = response.choices[0]?.message?.content || ''
  let highlights: Record<string, any> = {}
  const jsonMatch = full.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    try { highlights = JSON.parse(jsonMatch[1]) } catch { /* */ }
  }
  const summary = full.replace(/```json[\s\S]*?```/, '').trim()
  return { summary, highlights }
}

// ─── Main Cron Handler ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth check für Cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // In dev erlauben wir auch ohne Secret
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const results: { ticker: string; status: string; period?: string }[] = []
  let newEarnings = 0

  // Nur Earnings-Season Monate checken (oder immer in dev)
  const month = new Date().getMonth() + 1
  const isEarningsSeason = [1, 2, 4, 5, 7, 8, 10, 11].includes(month)
  if (!isEarningsSeason && process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      message: 'Keine Earnings-Season',
      month,
      nextCheck: 'Nächste Earnings-Season prüfen',
    })
  }

  console.log(`🔍 [Earnings Cron] Prüfe ${Object.keys(TRACKED).length} Unternehmen...`)

  for (const [ticker, company] of Object.entries(TRACKED)) {
    try {
      // 1. Neuestes 8-K von SEC holen
      const filing = await getLatestEarningsFiling(company.cik, company.forms || ['8-K'])
      if (!filing) {
        results.push({ ticker, status: 'kein Filing gefunden' })
        continue
      }

      // 2. Ist das Filing neu? (letzte 7 Tage)
      const filingAge = Date.now() - new Date(filing.date).getTime()
      const sevenDays = 7 * 24 * 60 * 60 * 1000
      if (filingAge > sevenDays) {
        results.push({ ticker, status: 'kein neues Filing' })
        continue
      }

      // 3. Haben wir dieses Filing schon?
      const { data: existing } = await supabase
        .from('SecEarningsPressReleases')
        .select('id')
        .eq('ticker', ticker)
        .eq('accession_number', filing.accession)
        .single()

      if (existing) {
        results.push({ ticker, status: 'bereits verarbeitet' })
        continue
      }

      // 4. Press Release Text holen
      const pr = await fetchPressReleaseText(company.cik, filing.accession, filing.primaryDoc)
      if (!pr) {
        results.push({ ticker, status: 'kein Press Release Dokument' })
        continue
      }

      // 5. Ist es ein Earnings Press Release?
      const isEarnings = /revenue|quarter|earnings|results of operations|financial results/i.test(pr.text.slice(0, 3000))
      if (!isEarnings) {
        results.push({ ticker, status: '8-K ist kein Earnings Release' })
        continue
      }

      // 6. Quartal erkennen
      const qInfo = detectQuarter(filing.date, pr.text)
      if (!qInfo) {
        results.push({ ticker, status: 'Quartal nicht erkannt' })
        continue
      }

      // 7. Duplikat-Check nach Periode (falls anderes Accession)
      const { data: existingPeriod } = await supabase
        .from('SecEarningsPressReleases')
        .select('id')
        .eq('ticker', ticker)
        .eq('period', qInfo.period)
        .single()

      if (existingPeriod) {
        results.push({ ticker, status: `${qInfo.period} bereits vorhanden` })
        continue
      }

      // 8. Speichern
      await supabase
        .from('SecEarningsPressReleases')
        .upsert({
          ticker,
          company_name: company.name,
          period: qInfo.period,
          fiscal_quarter: qInfo.quarter,
          fiscal_year: qInfo.year,
          filing_date: filing.date,
          period_end_date: qInfo.endDate,
          accession_number: filing.accession,
          filing_url: pr.url,
          press_release_text: pr.text.slice(0, MAX_STORE_CHARS),
          source: 'sec-edgar-8k',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'ticker,period' })

      // 9. AI Summary generieren
      let summaryStatus = ''
      let earningsRowId: string | null = null
      if (process.env.OPENAI_API_KEY) {
        try {
          const { summary, highlights } = await generateSummary(
            ticker, company.name, qInfo.period, pr.text
          )
          const { data: updated } = await supabase
            .from('SecEarningsPressReleases')
            .update({
              ai_summary: summary,
              ai_summary_model: 'gpt-4o-mini',
              key_highlights: highlights,
              updated_at: new Date().toISOString(),
            })
            .eq('ticker', ticker)
            .eq('period', qInfo.period)
            .select('id')
            .single()

          earningsRowId = updated?.id ?? null
          summaryStatus = ' + Summary'
        } catch (e) {
          summaryStatus = ' (Summary-Fehler)'
        }
      }

      // 10. Market Insight generieren (Premium-Analyse für UI-Card).
      // Inline statt fire-and-forget — Cron hat 5min Budget, ein Insight ~5s.
      // Bei Fehler nur loggen, Earnings sind dann trotzdem gespeichert.
      let insightStatus = ''
      if (earningsRowId && process.env.OPENAI_API_KEY) {
        try {
          await generateInsightFromEarnings(earningsRowId)
          insightStatus = ' + Insight'
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'unknown'
          console.warn(`  ⚠️  Insight-Generation für ${ticker} ${qInfo.period} fehlgeschlagen: ${msg}`)
          insightStatus = ' (Insight-Fehler)'
        }
      }

      newEarnings++
      results.push({ ticker, status: `NEU: ${qInfo.period}${summaryStatus}${insightStatus}`, period: qInfo.period })
      console.log(`  🆕 ${ticker}: ${qInfo.period} — neues Earnings Release erkannt!`)

      // Rate limit: SEC erlaubt max 10 req/sec
      await new Promise(r => setTimeout(r, 300))

    } catch (err) {
      results.push({ ticker, status: `Fehler: ${err instanceof Error ? err.message.slice(0, 50) : 'Unknown'}` })
    }
  }

  console.log(`✅ [Earnings Cron] Fertig: ${newEarnings} neue Earnings`)

  return NextResponse.json({
    checked: Object.keys(TRACKED).length,
    newEarnings,
    results,
    timestamp: new Date().toISOString(),
  })
}
