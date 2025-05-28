// scripts/fetchHoldings.js
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
    const invDir = path.join(baseDir, slug)
    await fs.mkdir(invDir, { recursive: true })

    console.log(`→ Bearbeite ${slug} (CIK ${cik})`)

    // 1) Meta-Daten holen
    const metaRes = await fetch(
      `https://data.sec.gov/submissions/CIK${cik}.json`,
      { headers: { 'User-Agent': 'Dein Name <deine.email>', Accept: 'application/json' } }
    )
    const meta = await metaRes.json()

    // 2) Alle Filings sammeln
    const hist = Array.isArray(meta.filings?.files) ? meta.filings.files : []
    const recent = meta.filings?.recent
      ? meta.filings.recent.form.map((f, i) => ({
          form: f,
          filingDate: meta.filings.recent.filingDate[i],
          accessionNumber: meta.filings.recent.accessionNumber[i],
          periodOfReport: meta.filings.recent.periodOfReport[i]
        }))
      : []
    const all = hist.concat(recent)

    // 3) Filter auf die beiden gewünschten Form-Typen
    const filings = all
      .filter(f => f.form === '13F-HR' || f.form === 'NPORT-P')
      .map(f => ({
        form: f.form,
        date: f.filingDate,
        period: f.periodOfReport || f.filingDate,
        accession: f.accessionNumber.replace(/-/g, ''),
        // unterschiedliche URL-Patterns
        xmlUrl: f.form === '13F-HR'
          ? `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g,'')}/${f.accessionNumber}.xml`
          : `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g,'')}/primary_doc.xml`
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    // 4) Pro Periode nur ein File
    const seen = new Set()
    for (const { form, date, period, xmlUrl, accession } of filings) {
      const [y, m] = (period || date).split('-')
      const key = form + ':' + y + '-' + m
      if (seen.has(key)) continue
      seen.add(key)

      let raw
      try {
        raw = await fetchUrl(xmlUrl)
      } catch {
        console.warn(`  ⚠ Laden fehlgeschlagen: ${xmlUrl}`)
        continue
      }

      // 5) Parsen & Extrahieren
      let positions = []
      if (form === '13F-HR') {
        // wie gehabt: <informationTable>
        const match = raw.match(/<informationTable\b[\s\S]*?<\/informationTable>/i)
        if (match) {
          const xml = `<root>${match[0]}</root>`
          const parsed = await parseStringPromise(xml, { explicitArray: false })
          const infos = parsed.root.informationTable.infoTable
          const items = Array.isArray(infos) ? infos : [infos]
          positions = items.map(p => ({
            name: p.nameOfIssuer,
            cusip: p.cusip,
            shares: Number(p.shrsOrPrnAmt.sshPrnamt.replace(/,/g, '')),
            value: Number(p.value.replace(/,/g, '')) * 1000
          }))
        }
      } else {
        // NPORT-P: <edgarSubmission>.formData.invstOrSecs.invstOrSec
        const parsed = await parseStringPromise(raw, { explicitArray: false })
        const secs = parsed.edgarSubmission?.formData?.invstOrSecs?.invstOrSec
        const items = Array.isArray(secs) ? secs : secs ? [secs] : []
        positions = items.map(p => ({
          name: p.name,
          cusip: p.cusip,
          shares: Number(p.balance.replace(/,/g, '')),
          value: Number(p.valUSD.replace(/,/g, '')),
          pctOfPortfolio: p.pctVal ? Number(p.pctVal) * 100 : undefined
        }))
      }

      // 6) Schreiben
      const fname = `${y}-${m}.json`
      await fs.writeFile(
        path.join(invDir, fname),
        JSON.stringify({ form, date, period, positions }, null, 2),
        'utf-8'
      )
      console.log(`  • ${slug}/${fname} (${positions.length} Positionen)`)
    }
    console.log()
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})