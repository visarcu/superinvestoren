// scripts/fetchNportP.js
import fetch from 'node-fetch'
import { parseStringPromise } from 'xml2js'
import fs from 'fs/promises'
import path from 'path'
// Deine CIK-Zuordnung, wie beim 13F-Script
import { investorCiks } from '../src/lib/cikMapping.js'

async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Dein Name <deine.email@beispiel.de>' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`)
  return res.text()
}

async function run() {
  const baseDir = path.resolve('src/data/holdings-nportp')
  await fs.mkdir(baseDir, { recursive: true })

  for (const [slug, cik] of Object.entries(investorCiks)) {
    // Hier z.B. nur Christopher Davis bis zum Testen
    if (slug !== 'davis') continue

    const invDir = path.join(baseDir, slug)
    await fs.mkdir(invDir, { recursive: true })

    try {
      console.log(`→ Fetching NPORT-P submissions for ${slug} (CIK ${cik})`)
      const metaRes = await fetch(
        `https://data.sec.gov/submissions/CIK${cik}.json`,
        {
          headers: {
            'User-Agent': 'Dein Name <deine.email@beispiel.de>',
            Accept: 'application/json',
          },
        }
      )
      if (!metaRes.ok) throw new Error(`HTTP ${metaRes.status}`)
      const meta = await metaRes.json()

      // Kombiniere historisch + recent wie gehabt
      const hist = Array.isArray(meta.filings?.files) ? meta.filings.files : []
      let recent = []
      if (meta.filings?.recent) {
        const { form = [], filingDate = [], accessionNumber = [], periodOfReport = [] } =
          meta.filings.recent
        recent = form.map((f, i) => ({
          form: f,
          filingDate: filingDate[i],
          accessionNumber: accessionNumber[i],
          periodOfReport: periodOfReport[i],
        }))
      }
      const all = hist.concat(recent)

      // Filter nur NPORT-P
      const filings = all
        .filter(f => f.form === 'NPORT-P')
        .map(f => ({
          date: f.filingDate,
          period: f.periodOfReport || f.filingDate,
          accession: f.accessionNumber.replace(/-/g, ''),
          xmlHref: `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g, '')}/primary_doc.xml`,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))

      console.log(`   • Gefundene NPORT-P Reports: ${filings.length}`)

      // Pro Monat nur einen Snapshot
      const seen = new Set()
      for (const { date, period, xmlHref, accession } of filings) {
        const [year, month] = (period || date).split('-')
        const key = `${year}-${month}`
        if (seen.has(key)) continue
        seen.add(key)

        // XML laden
        let raw = ''
        try {
          raw = await fetchUrl(xmlHref)
        } catch (err) {
          console.warn(`  ⚠ XML fehlgeschlagen für ${slug} ${key}: ${err.message}`)
          continue
        }

        // Parsen
        const parsed = await parseStringPromise(raw, { explicitArray: false })
        // Pfad: edgarSubmission.formData.invstOrSecs.invstOrSec
        const sec = parsed.edgarSubmission
          ?.formData
          ?.invstOrSecs
          ?.invstOrSec

        let positions = []
        if (sec) {
          const items = Array.isArray(sec) ? sec : [sec]
          positions = items.map(p => ({
            name: p.name,
            cusip: p.cusip,
            balance: Number(p.balance.replace(/,/g, '')),
            valueUSD: Number(p.valUSD.replace(/,/g, '')),
            pctOfFund: p.pctVal ? Number(p.pctVal) : undefined,
          }))
        } else {
          console.warn(`  ⚠ Keine <invstOrSec> gefunden für ${slug} ${key}`)
        }

        // JSON schreiben
        const filename = `${year}-${month}.json`
        const outPath = path.join(invDir, filename)
        await fs.writeFile(
          outPath,
          JSON.stringify({ date, period, positions }, null, 2),
          'utf-8'
        )
        console.log(`  • Geschrieben: ${slug}/${filename} (${positions.length} Positionen)`)
      }

      console.log()
    } catch (err) {
      console.warn(`⚠ Überspringe ${slug} wegen Fehler: ${err.message}\n`)
    }
  }
}

run().catch(err => {
  console.error('Unerwarteter Fehler im Skript:', err)
  process.exit(1)
})