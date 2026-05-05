// IPO Calendar Sync — eigene Daten direkt aus SEC EDGAR (kein FMP/EODHD).
//
// Quelle: EDGAR Full-Text-Search-Index (efts.sec.gov)
//   - 424B4 = Pricing-Prospectus → Listing 1-2 Tage später → status='priced'
//   - S-1 / S-1/A = Initial Registration → status='pending'
//
// Antwort-Beispiel pro Hit:
//   {
//     ciks: ["0002102155"],
//     display_names: ["Quantum Leap Acquisition Corp  (QLEP)  (CIK 0002102155)"],
//     file_date: "2026-05-04",
//     form: "424B4",
//     adsh: "0001213900-26-051097",
//     sics: ["6770"],
//     biz_states: ["MA"],
//     biz_locations: ["Grand Cayman"],
//     inc_states: ["E9"]
//   }
//
// Wird genutzt von /api/cron/sync-ipos (wöchentlich) und scripts/fetchIpoFilings.ts (manuell).

import { supabaseAdmin } from './supabaseAdmin'
import { randomUUID } from 'crypto'

const EDGAR_FULLTEXT_URL = 'https://efts.sec.gov/LATEST/search-index'
const USER_AGENT = 'Finclue research@finclue.de'

interface EdgarHit {
  _id: string
  _source: {
    ciks?: string[]
    display_names?: string[]
    file_date?: string
    form?: string
    adsh?: string
    sics?: string[]
    biz_states?: string[]
    biz_locations?: string[]
    inc_states?: string[]
  }
}

interface EdgarResponse {
  hits?: {
    total?: { value: number }
    hits?: EdgarHit[]
  }
}

export interface IpoFiling {
  cik: string
  ticker: string | null
  companyName: string
  filingType: string
  filingDate: string // YYYY-MM-DD
  accessionNo: string
  filingUrl: string
  status: 'priced' | 'pending' | 'effective'
  sicCode: string | null
  bizState: string | null
  bizLocation: string | null
  incState: string | null
}

// "Quantum Leap Acquisition Corp  (QLEP)  (CIK 0002102155)" → { name, ticker, cik }
function parseDisplayName(displayName: string): { name: string; ticker: string | null; cik: string | null } {
  // Pattern: "<Name>  (<TICKER>)  (CIK <NNNNNNNNNN>)"
  // Manchmal ohne Ticker: "<Name>  (CIK <NNNNNNNNNN>)"
  const cikMatch = displayName.match(/\(CIK\s+(\d+)\)/)
  const cik = cikMatch ? cikMatch[1] : null

  // Ticker ist die Klammer VOR dem CIK-Block, in Großbuchstaben
  // Wir entfernen erst den CIK-Block, dann suchen
  const withoutCik = displayName.replace(/\s*\(CIK\s+\d+\)\s*$/, '').trim()
  const tickerMatch = withoutCik.match(/\(([A-Z][A-Z0-9.\-]{0,9})\)\s*$/)
  const ticker = tickerMatch ? tickerMatch[1] : null

  // Name = alles vor der Ticker-Klammer (oder vor dem CIK falls kein Ticker)
  const name = (tickerMatch
    ? withoutCik.slice(0, withoutCik.lastIndexOf('('))
    : withoutCik
  ).trim()

  return { name, ticker, cik }
}

function buildFilingUrl(cik: string, accessionNo: string): string {
  // CIK ohne führende Nullen, Accession ohne Bindestriche
  const cikInt = parseInt(cik, 10)
  const accClean = accessionNo.replace(/-/g, '')
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikInt}&type=&dateb=&owner=include&count=40`
    .replace(
      'browse-edgar?action=getcompany&CIK=' + cikInt,
      `Archives/edgar/data/${cikInt}/${accClean}/${accessionNo}-index.htm`,
    )
    // Fallback: direkter Index-URL
}

function buildFilingIndexUrl(cik: string, accessionNo: string): string {
  const cikInt = parseInt(cik, 10)
  const accClean = accessionNo.replace(/-/g, '')
  return `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accClean}/${accessionNo}-index.htm`
}

function statusForForm(form: string): 'priced' | 'pending' | 'effective' {
  const f = form.toUpperCase()
  if (f === '424B4' || f === '424B1' || f === '424B3' || f === '424B5') return 'priced'
  if (f === 'EFFECT') return 'effective'
  return 'pending'
}

/**
 * Holt Filings einer bestimmten Form aus EDGAR Full-Text-Search.
 *
 * @param form Form-Type, z.B. "424B4" oder "S-1"
 * @param fromDate Start-Datum YYYY-MM-DD
 * @param toDate End-Datum YYYY-MM-DD
 * @param maxHits Limit (EDGAR liefert max ~10 pro Page; wir paginieren)
 */
export async function fetchEdgarFilings(
  form: string,
  fromDate: string,
  toDate: string,
  maxHits = 100,
): Promise<IpoFiling[]> {
  const results: IpoFiling[] = []
  const pageSize = 10
  let from = 0

  while (results.length < maxHits) {
    // EDGAR's Full-Text-Index akzeptiert in `forms` keine URL-encoded Slashes
    // (`S-1%2FA` → 500), aber rohe Slashes (`S-1/A`) ohne URL-Encoding gehen.
    // Wir bauen die URL daher manuell statt mit encodeURIComponent.
    const url = `${EDGAR_FULLTEXT_URL}?q=&dateRange=custom&startdt=${fromDate}&enddt=${toDate}&forms=${form}&hits=${pageSize}&from=${from}`
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      console.error(`EDGAR fetch failed for ${form}: ${res.status}`)
      break
    }
    const data: EdgarResponse = await res.json()
    const hits = data.hits?.hits || []
    if (hits.length === 0) break

    for (const hit of hits) {
      const src = hit._source
      const displayName = src.display_names?.[0] || ''
      const { name, ticker, cik: cikFromName } = parseDisplayName(displayName)
      const cik = src.ciks?.[0] || cikFromName
      const fileDate = src.file_date
      const accessionNo = src.adsh
      const formType = src.form
      if (!cik || !fileDate || !accessionNo || !formType || !name) continue

      results.push({
        cik,
        ticker,
        companyName: name,
        filingType: formType,
        filingDate: fileDate,
        accessionNo,
        filingUrl: buildFilingIndexUrl(cik, accessionNo),
        status: statusForForm(formType),
        sicCode: src.sics?.[0] || null,
        bizState: src.biz_states?.[0] || null,
        bizLocation: src.biz_locations?.[0] || null,
        incState: src.inc_states?.[0] || null,
      })
    }

    if (hits.length < pageSize) break
    from += pageSize
    // Kleiner Delay zwischen Pagination-Requests (SEC empfiehlt max 10 req/s)
    await new Promise(r => setTimeout(r, 200))
  }

  return results.slice(0, maxHits)
}

export interface SyncResult {
  total: number
  inserted: number
  updated: number
  skipped: number
  byForm: Record<string, number>
  errors: string[]
}

/**
 * Synct die letzten N Tage Filings für Form 424B4 (Pricing) und S-1/S-1A (Pending)
 * in die IpoCalendar-Tabelle.
 */
export async function syncIpoCalendar(daysBack = 30, maxPerForm = 100): Promise<SyncResult> {
  const today = new Date()
  const past = new Date(today)
  past.setDate(past.getDate() - daysBack)
  const fromDate = past.toISOString().split('T')[0]
  const toDate = today.toISOString().split('T')[0]

  const result: SyncResult = {
    total: 0, inserted: 0, updated: 0, skipped: 0,
    byForm: {},
    errors: [],
  }

  const forms = ['424B4', 'S-1', 'S-1/A']

  for (const form of forms) {
    try {
      const filings = await fetchEdgarFilings(form, fromDate, toDate, maxPerForm)
      result.byForm[form] = filings.length
      result.total += filings.length

      for (const f of filings) {
        try {
          // Check ob existiert (über Supabase HTTP-API, nicht Prisma)
          const { data: existing } = await supabaseAdmin
            .from('IpoCalendar')
            .select('id')
            .eq('accessionNo', f.accessionNo)
            .maybeSingle()

          const filingDateIso = f.filingDate // YYYY-MM-DD String, kompatibel mit DATE-Spalte
          const nowIso = new Date().toISOString()

          if (existing) {
            const { error: updErr } = await supabaseAdmin
              .from('IpoCalendar')
              .update({
                ticker: f.ticker,
                companyName: f.companyName,
                filingDate: filingDateIso,
                status: f.status,
                sicCode: f.sicCode,
                bizState: f.bizState,
                bizLocation: f.bizLocation,
                incState: f.incState,
                updatedAt: nowIso,
              })
              .eq('accessionNo', f.accessionNo)
            if (updErr) throw new Error(updErr.message)
            result.updated += 1
          } else {
            const { error: insErr } = await supabaseAdmin
              .from('IpoCalendar')
              .insert({
                id: randomUUID(),
                cik: f.cik,
                ticker: f.ticker,
                companyName: f.companyName,
                filingType: f.filingType,
                filingDate: filingDateIso,
                accessionNo: f.accessionNo,
                filingUrl: f.filingUrl,
                status: f.status,
                sicCode: f.sicCode,
                bizState: f.bizState,
                bizLocation: f.bizLocation,
                incState: f.incState,
                source: 'sec-edgar',
                createdAt: nowIso,
                updatedAt: nowIso,
              })
            if (insErr) {
              if (insErr.message.includes('duplicate key') || insErr.code === '23505') {
                result.skipped += 1
              } else {
                throw new Error(insErr.message)
              }
            } else {
              result.inserted += 1
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          result.errors.push(`${f.accessionNo}: ${msg}`)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`Form ${form}: ${msg}`)
    }
  }

  return result
}
