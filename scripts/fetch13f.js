// scripts/fetch13f.js

import fetch from 'node-fetch'
import { parseStringPromise } from 'xml2js'
import fs from 'fs/promises'
import path from 'path'
import { investorCiks } from '../src/lib/cikMapping.js'

async function fetchUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Dein Name <deine.email@beispiel.de>' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`)
  return res.text()
}

async function run() {
  const baseDir = path.resolve('src/data/holdings')
  await fs.mkdir(baseDir, { recursive: true })

  for (const [slug, cik] of Object.entries(investorCiks)) {
    if (slug !== 'lilu') continue // wieder rausnehmen nach dem Test!
    const invDir = path.join(baseDir, slug)
    await fs.mkdir(invDir, { recursive: true })

    try {
      console.log(`→ Fetching submissions for ${slug} (CIK ${cik})`)
      const secMeta = await fetch(
        `https://data.sec.gov/submissions/CIK${cik}.json`,
        {
          headers: {
            'User-Agent': 'Dein Name <deine.email@beispiel.de>',
            Accept: 'application/json',
          },
        }
      )
      if (!secMeta.ok) throw new Error(`HTTP ${secMeta.status}`)
      const data = await secMeta.json()

      // 1) both historical files + recent filings
      const histFiles = Array.isArray(data.filings?.files)
        ? data.filings.files
        : []
      let recent = []
      if (data.filings?.recent) {
        const {
          form: forms = [],
          filingDate: dates = [],
          accessionNumber: accs = [],
          periodOfReport: periods = []
        } = data.filings.recent
        recent = forms.map((form, i) => ({
          form,
          filingDate: dates[i],
          accessionNumber: accs[i],
          periodOfReport: periods[i],
        }))
      }
      const hist = histFiles.concat(recent)

      // 2) Nur echte Quarterly-Reports (13F-HR), keine Amendments (13F-HR/A)
      let filings = hist
        .filter(f => f.form === '13F-HR')
        .map(f => ({
          date: f.filingDate,
          period: f.periodOfReport,
          accession: f.accessionNumber.replace(/-/g, ''),
          xmlHref: `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g,'')}/${f.accessionNumber}.xml`,
          txtHref: `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g,'')}/${f.accessionNumber}.txt`,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))

      console.log(`   • Gefundene Quarterly-Reports: ${filings.length}`)

      // 3) Pro Quartal genau ein Snapshot
      const seen = new Set()
      for (const { date, period, xmlHref, txtHref, accession } of filings) {
        const src = period ?? date
        const [year, month] = src.split('-')
        const quarter = `Q${Math.ceil(Number(month) / 3)}`
        const key = `${year}-${quarter}`
        if (seen.has(key)) continue
        seen.add(key)

        // 4) Haupt-XML oder TXT laden
        let raw = ''
        try {
          raw = await fetchUrl(xmlHref)
        } catch {
          console.warn(`  ↪ Haupt-XML fehlgeschlagen, versuche TXT für ${slug} ${key}`)
          try {
            raw = await fetchUrl(txtHref)
          } catch {
            console.warn(`  ⚠ TXT fehlgeschlagen für ${slug} ${key}`)
          }
        }

        // 4b) Falls keine <informationTable> gefunden wurde,
        //     versuche das separate INFORMATION TABLE-Dokument
        if (!/<informationTable\b/i.test(raw)) {
          console.log(`   • Suche INFORMATION-TABLE-XML für ${slug} ${key}`)
          try {
            // Index-HTML des Einreichungs-Verzeichnisses
            const dirHtmlUrl = xmlHref.replace(/\/[^/]+\.xml$/, '/')
            const idxHtml = await fetchUrl(dirHtmlUrl)
            const m = idxHtml.match(/href="([^"]+\.xml)"[^>]*>\s*INFORMATION TABLE/i)
            if (m) {
              const infoUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}/${m[1]}`
              raw = await fetchUrl(infoUrl)
              console.log(`     → INFORMATION-TABLE geholt: ${m[1]}`)
            } else {
              console.warn(`     ⚠ Kein INFORMATION TABLE Link gefunden für ${slug} ${key}`)
            }
          } catch (err) {
            console.warn(`     ⚠ Fehler beim Holen des Index-HTML für ${slug} ${key}: ${err.message}`)
          }
        }

        // 5) <informationTable> parsen
        const infoMatch = raw.match(/<informationTable\b[\s\S]*?<\/informationTable>/i)
        let positions = []
        if (infoMatch) {
          const xml = `<root>${infoMatch[0]}</root>`
          const parsed = await parseStringPromise(xml, { explicitArray: false })
          const infoTable = parsed.root.informationTable.infoTable
          const items = Array.isArray(infoTable) ? infoTable : [infoTable]
          positions = items.map(pos => ({
            name: pos.nameOfIssuer,
            cusip: pos.cusip,
            shares: Number(pos.shrsOrPrnAmt.sshPrnamt.replace(/,/g, '')),
            value: Number(pos.value.replace(/,/g, '')) * 1000,
          }))
        } else {
          console.warn(`  ⚠ Keine <informationTable> für ${slug} ${key}`)
        }

        // 6) schreiben
        const filename = `${year}-${quarter}.json`
        const outPath = path.join(invDir, filename)
        await fs.writeFile(
          outPath,
          JSON.stringify({ date, positions }, null, 2),
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