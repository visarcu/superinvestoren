// scripts/fetchRealtime.js

import fetch from 'node-fetch'
import fs    from 'fs/promises'
import path  from 'path'
import { investorCiks } from '../src/lib/cikMapping.js'

async function fetchSubmissions(cik) {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Dein Name <deine.email@beispiel.de>',
      Accept:       'application/json',
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

      // 1) immer beide Quellen kombinieren: historical files + recent
      const histFiles = Array.isArray(data.filings?.files)
        ? data.filings.files
        : []

      let recentFiles = []
      if (data.filings?.recent) {
        const {
          form: forms = [],
          filingDate: dates = [],
          accessionNumber: accs = []
        } = data.filings.recent
        recentFiles = forms.map((form, i) => ({
          form,
          filingDate:     dates[i],
          accessionNumber: accs[i]
        }))
      }

      const allRaw = histFiles.concat(recentFiles)

      // 2) filter auf alles außer 13F-Formulare
      const realtime = allRaw
        .filter(f => typeof f.form === 'string' && !f.form.startsWith('13F'))
        .map(f => ({
          form:       f.form,
          date:       f.filingDate,
          accession:  f.accessionNumber,
          href:       `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g,'')}/${f.accessionNumber}.txt`
        }))

      // 3) Speichern
      const outPath = path.join(outDir, `${slug}.json`)
      await fs.writeFile(outPath, JSON.stringify(realtime, null, 2), 'utf-8')
      console.log(`  • Wrote ${realtime.length} filings to ${outPath}\n`)

    } catch (err) {
      console.error(`✗ Fehler bei ${slug}:`, err.message)
    }
  }
}

run().catch(err => {
  console.error('Unerwarteter Fehler:', err)
  process.exit(1)
})