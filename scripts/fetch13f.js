// scripts/fetch13f.js
import fetch from 'node-fetch'
import { parseStringPromise } from 'xml2js'
import fs from 'fs/promises'
import path from 'path'
import { investorCiks } from '../src/lib/cikMapping.js'

async function fetchSubmissions(cik) {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Dein Name <deine.email@beispiel.de>',
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
  return res.json()
}

async function fetchTxt(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Dein Name <deine.email@beispiel.de>' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching TXT ${url}`)
  return res.text()
}

async function run() {
  const outDir = path.resolve('src/data/holdings')
  await fs.mkdir(outDir, { recursive: true })

  for (const [slug, cik] of Object.entries(investorCiks)) {
    try {
      console.log(`→ Fetching submissions for ${slug} (CIK ${cik})`)
      const data = await fetchSubmissions(cik)

      // 1) Filings sammeln (recent, ansonsten historisch)
      const forms   = data.filings?.recent?.form         || []
      const dates   = data.filings?.recent?.filingDate   || []
      const accNums = data.filings?.recent?.accessionNumber || []

      let filings = forms
        .map((f, i) => ({
          form: f,
          date: dates[i],
          accession: accNums[i],
          href: `https://www.sec.gov/Archives/edgar/data/${cik}/${accNums[i].replace(/-/g,'')}/${accNums[i]}.txt`
        }))
        .filter(f => f.form === '13F-HR' || f.form === '13F-NT')

      if (filings.length === 0 && Array.isArray(data.filings?.files)) {
        filings = data.filings.files
          .filter(f => f.form === '13F-HR' || f.form === '13F-NT')
          .map(f => ({
            form: f.form,
            date: f.filingDate,
            accession: f.accessionNumber,
            href: `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g,'')}/${f.accessionNumber}.txt`
          }))
          // nach Datum absteigend
          .sort((a, b) => new Date(b.date) - new Date(a.date))
      }

      if (filings.length === 0) {
        console.warn(` ⚠ Keine 13F-HR/NT filings für ${slug}`)
        continue
      }

      // 2) Aktuellstes Filing
      const latest = filings[0]
      console.log(`  • Latest ${latest.form} vom ${latest.date}`)
      console.log(`  • URL: ${latest.href}`)

      // 3) TXT holen und <informationTable> extrahieren
      const raw = await fetchTxt(latest.href)
      const infoMatch = raw.match(/<informationTable\b[\s\S]*?<\/informationTable>/i)
      if (!infoMatch) {
        console.warn(` ⚠ Keine <informationTable> im TXT für ${slug}`)
        continue
      }
      const xml = `<root>${infoMatch[0]}</root>`
      const parsed = await parseStringPromise(xml, { explicitArray: false })

      // 4) infoTable-Einträge holen
      const info = parsed.root.informationTable.infoTable
      const items = Array.isArray(info) ? info : [info]

      // 5) Einfaches Mapping (ohne *1000!)
      const clean = items.map(pos => ({
        name:   pos.nameOfIssuer,
        cusip:  pos.cusip,
        shares: Number(pos.shrsOrPrnAmt.sshPrnamt.replace(/,/g, '')),
        value:  Number(pos.value.replace(/,/g, '')),
      }))

      // 6) Deduplizieren & aufsummieren je CUSIP
      const grouped = Object.values(
        clean.reduce((acc, p) => {
          if (acc[p.cusip]) {
            acc[p.cusip].shares += p.shares
            acc[p.cusip].value  += p.value
          } else {
            acc[p.cusip] = { ...p }
          }
          return acc
        }, /** @type {Record<string, typeof clean[0]>} */ ({}))
      )

      // 7) Ergebnis schreiben
      const out = { date: latest.date, positions: grouped }
      const outPath = path.join(outDir, `${slug}.json`)
      await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf-8')
      console.log(`  → Written ${grouped.length} unique Positions to ${outPath}\n`)
    } catch (err) {
      console.error(`✗ Fehler bei ${slug}:`, err.message)
    }
  }
}

run().catch(err => {
  console.error('Unerwarteter Fehler:', err)
  process.exit(1)
})