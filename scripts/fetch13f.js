// scripts/fetch13f.js
import fetch from 'node-fetch'
import { parseStringPromise, processors } from 'xml2js'
import fs from 'fs/promises'
import path from 'path'
import { investorCiks } from '../src/lib/cikMapping.js'

const extraMultiplierSlugs = ['klarman', 'spier', 'triplefrond'];


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
    // Zum Testen nur einen Slug aktivieren:
     if (slug !== 'kantesaria') continue

    const invDir = path.join(baseDir, slug)
    await fs.mkdir(invDir, { recursive: true })
    console.log(`→ Bearbeite ${slug} (CIK ${cik})`)

    // 1) Metadaten holen
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

    // 2) Alle Filings (historisch + recent) vereinen
    const histFiles = Array.isArray(meta.filings?.files)
      ? meta.filings.files
      : []
    let recent = []
    if (meta.filings?.recent) {
      const { form = [], filingDate = [], accessionNumber = [], periodOfReport = [] } =
        meta.filings.recent
      recent = form.map((fm, i) => ({
        form: fm,
        filingDate: filingDate[i],
        accessionNumber: accessionNumber[i],
        periodOfReport: periodOfReport[i],
      }))
    }
    const allFilings = histFiles.concat(recent)

    // 3) Nur 13F-HR und NPORT-P
    const filings = allFilings
      .filter(f => f.form === '13F-HR' || f.form === 'NPORT-P')
      .map(f => ({
        form: f.form,
        date: f.filingDate,
        period: f.periodOfReport || f.filingDate,
        accession: f.accessionNumber.replace(/-/g, ''),
        xmlHref:
          f.form === '13F-HR'
            ? `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(
                /-/g,
                ''
              )}/${f.accessionNumber}.xml`
            : `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(
                /-/g,
                ''
              )}/primary_doc.xml`,
        txtHref:
          f.form === '13F-HR'
            ? `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(
                /-/g,
                ''
              )}/${f.accessionNumber}.txt`
            : undefined,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    console.log(
      `   • Gefundene 13F-HR: ${
        filings.filter(f => f.form === '13F-HR').length
      }, NPORT-P: ${filings.filter(f => f.form === 'NPORT-P').length}`
    )

    // 4) Pro Filing: parsen, gruppieren, JSON schreiben
    const seen = new Set()
    for (const { form, date, period, xmlHref, txtHref, accession } of filings) {
      // Quartals-Grouping (JJJJ-Qx)
      const [y, m] = (period || date).split('-')
      const quarter = `Q${Math.ceil(Number(m) / 3)}`
      const key = `${y}-${quarter}`
      const outFile = path.join(invDir, `${key}.json`)
      if (seen.has(form + ':' + key)) continue
      seen.add(form + ':' + key)

      // Rohdaten holen (XML, sonst TXT-Fallback)
      let raw = ''
      try {
        raw = await fetchUrl(xmlHref)
      } catch {
        if (txtHref) raw = await fetchUrl(txtHref).catch(() => '')
        else {
          console.warn(`  ⚠ XML & TXT fehlgeschlagen für ${slug} ${key}`)
          continue
        }
      }

      let positions = []
      if (form === '13F-HR') {
        // INFORMATION-TABLE (Namespace egal) parsen
        const infoMatch = raw.match(/<(?:\w+:)?informationTable\b[\s\S]*?<\/(?:\w+:)?informationTable>/i)
        if (!infoMatch) continue
        const parsed = await parseStringPromise(`<root>${infoMatch[0]}</root>`, {
          explicitArray: false,
          tagNameProcessors: [processors.stripPrefix],
        })
        const table = parsed.root.informationTable.infoTable
        const arr = Array.isArray(table) ? table : [table]
        positions = arr.map(pos => ({
          name: pos.nameOfIssuer,
          cusip: pos.cusip,
          shares: Number(pos.shrsOrPrnAmt.sshPrnamt.replace(/,/g, '')),
          value: Number(pos.value.replace(/,/g, '')) * 1000 *  (extraMultiplierSlugs.includes(slug) ? 1000 : 1),  // hier *1000
        }))
      } else {
        // NPORT-P–Parser
        const parsed = await parseStringPromise(raw, { explicitArray: false })
        const secs = parsed.edgarSubmission?.formData?.invstOrSecs?.invstOrSec
        const arr = Array.isArray(secs) ? secs : secs ? [secs] : []
        positions = arr.map(p => ({
          name: p.name,
          cusip: p.cusip,
          shares: Number(p.balance.replace(/,/g, '')),
          value: Number(p.valUSD.replace(/,/g, '')) * 1000,  // auch hier *1000
          pctOfPortfolio: p.pctVal ? Number(p.pctVal) * 100 : undefined,
        }))
      }

      // JSON schreiben
      const payload = { form, date, period, positions }
      await fs.writeFile(outFile, JSON.stringify(payload, null, 2), 'utf-8')
      console.log(`  • Geschrieben: ${slug}/${key}.json mit ${positions.length} Positionen`)
    }

    console.log()
  }
}

run().catch(err => {
  console.error('Unerwarteter Fehler:', err)
  process.exit(1)
})