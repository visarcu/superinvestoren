// src/app/api/cron/check-new-sec-filings/route.ts
// Checkt die SEC EDGAR API auf neue 13F-HR Filings und benachrichtigt den Admin
// Läuft als Vercel Cron Job - schickt E-Mail wenn neue Filings gefunden werden

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import holdingsHistory from '@/data/holdings'

const resend = new Resend(process.env.RESEND_API_KEY)

// Admin E-Mail für Benachrichtigungen
const ADMIN_EMAIL = 'visi1@hotmail.de'

// Investor CIKs - direkt hier definiert um Circular Dependencies zu vermeiden
const investorCiks: Record<string, string> = {
  buffett: '0001067983',
  ackman: '0001336528',
  akre: '0001112520',
  gregalexander: '0001773994',
  altarockpartners: '0001631014',
  miller: '0001135778',
  tepper: '0001656456',
  coleman: '0001167483',
  gayner: '0001096343',
  ainslie: '0000934639',
  einhorn: '0001489933',
  hohn: '0001647251',
  yacktman: '0000905567',
  polen: '0001034524',
  viking: '0001103804',
  cantillon: '0001279936',
  duan: '0001759760',
  bloomstran: '0001115373',
  vinall: '0001766596',
  mandel: '0001061165',
  ellenbogen: '0001798849',
  jensen: '0001106129',
  russo: '0000860643',
  armitage: '0001581811',
  druckenmiller: '0001536411',
  icahn: '0000921669',
  greenhaven: '0000846222',
  abrams: '0001358706',
  martin: '0001050442',
  kantesaria: '0001697868',
  kahn: '0001039565',
  train: '0001484150',
  brenton: '0001484148',
  burn: '0000820124',
  dorsey: '0001657335',
  chou: '0001389403',
  lawrence: '0001657335',
  greenberg: '0001553733',
  roepers: '0001063296',
  munger: '0000783412',
  lountzis: '0001821168',
  haley: '0001858353',
  lou: '0001631664',
  wyden: '0001745214',
  muhlenkamp: '0001133219',
  tarasoff: '0001766504',
  welling: '0001559771',
  rolfe: '0000859804',
  karr: '0001106500',
  hong: '0001766908',
  gates: '0001166559',
  bares: '0001340807',
  berkowitz: '0001056831',
  watsa: '0000915191',
  sosin: '0001697591',
  rochon: '0001641864',
  meritage: '0001427119',
  ketterer: '0001165797',
  vulcanvalue: '0001556785',
  torray: '0000098758',
  triplefrond: '0001454502',
  whitman: '0001099281',
  greenbrier: '0001532262',
  lilu: '0001709323',
  peltz: '0001345471',
  donaldsmith: '0000814375',
  ubben: '0001418814',
  marks: '0000949509',
  smith: '0001569205',
  thiel: '0001562087',
  spier: '0001953324',
  pabrai: '0001549575',
  burry: '0001649339',
  klarman: '0001061768',
  dodgecox: '0000200217',
  olstein: '0000947996',
  katz: '0001016287',
  davis: '0001036325',
  mairspower: '0001070134',
  tangen: '0001376879',
  loeb: '0001040273',
  hawkins: '0000807985',
  rogers: '0000936753',
  greenblatt: '0001510387',
  fisher: '0000850529',
  soros: '0001029160',
  vandenberg: '0001142062',
  weitz: '0000883965',
  pzena: '0001027796',
  firsteagle: '0001325447',
  patientcapital: '0001854794',
  makaira: '0001540866',
  dalio: '0001350694',
  cunniff: '0001720792',
  ark_investment_management: '0001697748',
  meridiancontrarian: '0000745467',
  cunniff_sequoia: '0000089043',
  ariel_appreciation: '0000798365',
  tweedy_browne_fund_inc: '0000896975',
  ariel_focus: '0000798365'
}

// Investor Namen für bessere Lesbarkeit
const investorNames: Record<string, string> = {
  buffett: 'Warren Buffett',
  ackman: 'Bill Ackman',
  burry: 'Michael Burry',
  gates: 'Bill Gates',
  soros: 'George Soros',
  icahn: 'Carl Icahn',
  spier: 'Guy Spier',
  dalio: 'Ray Dalio',
  einhorn: 'David Einhorn',
  loeb: 'Daniel Loeb',
  tepper: 'David Tepper',
  pabrai: 'Mohnish Pabrai',
  klarman: 'Seth Klarman',
  druckenmiller: 'Stanley Druckenmiller',
  greenblatt: 'Joel Greenblatt',
  // ... weitere bei Bedarf
}

interface HoldingsSnapshot {
  quarter: string
  data: {
    quarterKey: string
    date: string
    form: string
  }
}

// Hilfsfunktion: Quartal aus Datum berechnen
function getQuarterFromDate(dateStr: string): string | null {
  if (!dateStr) return null
  const [year, month] = dateStr.split('-')
  if (!year || !month) return null
  const quarterNum = Math.ceil(Number(month) / 3)
  return `${year}-Q${quarterNum}`
}

// Hole neuestes Filing aus unseren Holdings-Daten
function getLatestLocalFiling(slug: string): { quarterKey: string; date: string } | null {
  const holdings = holdingsHistory as Record<string, HoldingsSnapshot[]>
  const investorData = holdings[slug]

  if (!investorData || investorData.length === 0) {
    return null
  }

  const sorted = [...investorData].sort((a, b) => b.quarter.localeCompare(a.quarter))
  const latest = sorted[0]

  return {
    quarterKey: latest.data?.quarterKey || latest.quarter,
    date: latest.data?.date || ''
  }
}

// Hole neuestes 13F-HR Filing von der SEC
async function getLatestSECFiling(cik: string): Promise<{ quarterKey: string; filingDate: string; accession: string } | null> {
  try {
    const response = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      headers: {
        'User-Agent': 'Finclue contact@finclue.de',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error(`SEC API error for CIK ${cik}: ${response.status}`)
      return null
    }

    const data = await response.json()
    const recent = data.filings?.recent

    if (!recent?.form) {
      return null
    }

    // Finde das neueste 13F-HR Filing
    for (let i = 0; i < recent.form.length; i++) {
      if (recent.form[i] === '13F-HR') {
        const filingDate = recent.filingDate[i]
        const quarterKey = getQuarterFromDate(filingDate)
        const accession = recent.accessionNumber[i]

        if (quarterKey) {
          return { quarterKey, filingDate, accession }
        }
      }
    }

    return null
  } catch (error) {
    console.error(`Error fetching SEC data for CIK ${cik}:`, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleSECFilingCheck()
}

export async function GET(request: NextRequest) {
  // Vercel Cron Jobs use GET requests
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handleSECFilingCheck()
}

async function handleSECFilingCheck() {
  try {
    console.log('[SEC Check] Starting check for new 13F filings...')

    const newFilings: Array<{
      slug: string
      name: string
      secQuarter: string
      secDate: string
      localQuarter: string | null
      accession: string
    }> = []

    let checked = 0
    let errors = 0

    // Alle Investoren durchgehen
    for (const [slug, cik] of Object.entries(investorCiks)) {
      // Skip Fund-IDs (beginnen nicht mit 0)
      if (!cik.startsWith('0')) {
        continue
      }

      checked++

      try {
        // Neuestes Filing von SEC holen
        const secFiling = await getLatestSECFiling(cik)

        if (!secFiling) {
          continue
        }

        // Mit lokalen Daten vergleichen
        const localFiling = getLatestLocalFiling(slug)

        // Wenn SEC ein neueres Filing hat
        if (!localFiling || secFiling.quarterKey > localFiling.quarterKey) {
          console.log(`[SEC Check] NEW FILING: ${slug} - SEC: ${secFiling.quarterKey}, Local: ${localFiling?.quarterKey || 'none'}`)

          newFilings.push({
            slug,
            name: investorNames[slug] || slug,
            secQuarter: secFiling.quarterKey,
            secDate: secFiling.filingDate,
            localQuarter: localFiling?.quarterKey || null,
            accession: secFiling.accession
          })
        }

        // Rate limiting - SEC erlaubt 10 requests/sec
        await new Promise(resolve => setTimeout(resolve, 150))

      } catch (error) {
        console.error(`[SEC Check] Error checking ${slug}:`, error)
        errors++
      }
    }

    console.log(`[SEC Check] Checked ${checked} investors, found ${newFilings.length} new filings, ${errors} errors`)

    // E-Mail senden wenn neue Filings gefunden
    if (newFilings.length > 0) {
      const filingsList = newFilings.map(f =>
        `• ${f.name} (${f.slug}): ${f.secQuarter} (filed ${f.secDate})\n  SEC: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${investorCiks[f.slug]}&type=13F-HR`
      ).join('\n\n')

      const emailHtml = `
        <h2>Neue 13F-HR Filings auf der SEC</h2>
        <p>Die folgenden Investoren haben neue Filings eingereicht:</p>
        <ul>
          ${newFilings.map(f => `
            <li>
              <strong>${f.name}</strong> (${f.slug})<br>
              Quarter: ${f.secQuarter} | Filed: ${f.secDate}<br>
              Dein lokales Quarter: ${f.localQuarter || 'keins'}<br>
              <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${investorCiks[f.slug]}&type=13F-HR">SEC Filing ansehen</a>
            </li>
          `).join('')}
        </ul>
        <p><strong>Nächster Schritt:</strong> Führe <code>npm run fetch13f</code> aus um die Holdings zu aktualisieren.</p>
      `

      const emailResult = await resend.emails.send({
        from: 'Finclue <team@finclue.de>',
        to: ADMIN_EMAIL,
        subject: `${newFilings.length} neue 13F Filing(s) auf der SEC`,
        html: emailHtml,
        text: `Neue 13F-HR Filings gefunden:\n\n${filingsList}\n\nNächster Schritt: npm run fetch13f ausführen`
      })

      console.log(`[SEC Check] Email result:`, emailResult)

      console.log(`[SEC Check] Admin email sent to ${ADMIN_EMAIL}`)
    }

    return NextResponse.json({
      success: true,
      checked,
      newFilingsFound: newFilings.length,
      newFilings: newFilings.map(f => ({
        slug: f.slug,
        name: f.name,
        secQuarter: f.secQuarter,
        localQuarter: f.localQuarter
      })),
      errors
    })

  } catch (error) {
    console.error('[SEC Check] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
