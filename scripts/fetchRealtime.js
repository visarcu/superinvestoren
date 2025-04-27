// scripts/fetchRealtime.js
import fetch from 'node-fetch'
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

export async function run() {
  const outDir = path.resolve('src/data/realtime')
  await fs.mkdir(outDir, { recursive: true })

  for (const [slug, cik] of Object.entries(investorCiks)) {
    try {
      console.log(`→ Fetching realtime filings for ${slug} (CIK ${cik})`)
      const data = await fetchSubmissions(cik)

      // Wir nehmen hier alle recent filings (inkl. Form 3/4/5 etc.)
      const forms   = data.filings?.recent?.form         || []
      const dates   = data.filings?.recent?.filingDate   || []
      const accNums = data.filings?.recent?.accessionNumber || []

      const filings = forms.map((form, i) => ({
        form,
        date:     dates[i],
        accession: accNums[i],
        href:     `https://www.sec.gov/Archives/edgar/data/${cik}/${accNums[i].replace(/-/g,'')}/${accNums[i]}.txt`,
      }))

      // Datei schreiben
      const outPath = path.join(outDir, `${slug}.json`)
      await fs.writeFile(outPath, JSON.stringify(filings, null, 2), 'utf-8')
      console.log(`  • Wrote ${filings.length} filings to ${outPath}\n`)
    } catch (err) {
      console.error(`✗ Fehler bei ${slug}:`, err.message)
    }
  }
}

run().catch(err => {
  console.error('Unerwarteter Fehler:', err)
  process.exit(1)
})