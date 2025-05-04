// scripts/fetchNportP.js
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
    // Teste nur einen Investor, bis alles klappt:
    if (slug !== 'dodgecox') continue

    const invDir = path.join(baseDir, slug)
    await fs.mkdir(invDir, { recursive: true })

    try {
      console.log(`→ Fetching submissions for ${slug} (CIK ${cik})`)
      const secMetaRes = await fetch(
        `https://data.sec.gov/submissions/CIK${cik}.json`,
        {
          headers: {
            'User-Agent': 'Dein Name <deine.email@beispiel.de>',
            Accept: 'application/json',
          },
        }
      )
      if (!secMetaRes.ok) throw new Error(`HTTP ${secMetaRes.status}`)
      const meta = await secMetaRes.json()

      // kombiniere historische und jüngste Einreichungen
      const histFiles = Array.isArray(meta.filings?.files)
        ? meta.filings.files
        : []
      let recent = []
      if (meta.filings?.recent) {
        const { form = [], filingDate = [], accessionNumber = [], periodOfReport = [] } =
          meta.filings.recent
        recent = form.map((formType, i) => ({
          form: formType,
          filingDate: filingDate[i],
          accessionNumber: accessionNumber[i],
          periodOfReport: periodOfReport[i],
        }))
      }
      const allFilings = histFiles.concat(recent)

      // filter nur echte 13F-HR Reports (kein Amendment)
      const filings = allFilings
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

      // pro Quartal nur ein Snapshot
      const seen = new Set()
      for (const { date, period, xmlHref, txtHref, accession } of filings) {
        const src = period || date
        const [year, month] = src.split('-')
        const quarter = `Q${Math.ceil(Number(month) / 3)}`
        const key = `${year}-${quarter}`
        if (seen.has(key)) continue
        seen.add(key)

        // lade XML, sonst TXT
        let raw = ''
        try {
          raw = await fetchUrl(xmlHref)
        } catch {
          console.warn(`  ↪ Haupt-XML fehlgeschlagen, versuche TXT für ${slug} ${key}`)
          raw = await fetchUrl(txtHref).catch(() => {
            console.warn(`  ⚠ TXT fehlgeschlagen für ${slug} ${key}`)
            return ''
          })
        }

        // falls kein <informationTable> direkt, suche es im Index
        if (!/<informationTable\b/i.test(raw)) {
          console.log(`   • Suche INFORMATION-TABLE-XML für ${slug} ${key}`)
          try {
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

        // <informationTable> extrahieren und parsen
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

        // schreibe JSON-Datei
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