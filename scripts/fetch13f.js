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
    const outPath  = path.join(outDir, `${slug}.json`)
    const prevPath = path.join(outDir, `${slug}-previous.json`)

    // 0) Alte Datei sichern als "-previous"
    try {
      await fs.stat(outPath)
      await fs.copyFile(outPath, prevPath)
      console.log(`  • Vorperiode gesichert: ${slug}-previous.json`)
    } catch {
      // nichts da → kein Previous
    }

    try {
      console.log(`→ Fetching submissions for ${slug} (CIK ${cik})`)
      const data = await fetchSubmissions(cik)

      // 1) Sammle alle 13F-HR, Amendments 13F-HR/A und 13F-NT aus recent
      let forms   = data.filings?.recent?.form           || []
      let dates   = data.filings?.recent?.filingDate     || []
      let accNums = data.filings?.recent?.accessionNumber|| []

      let filings = forms
        .map((f, i) => ({
          form:      f,
          date:      dates[i],
          accession: accNums[i],
          href:      `https://www.sec.gov/Archives/edgar/data/${cik}/${accNums[i].replace(/-/g,'')}/${accNums[i]}.txt`
        }))
        // jetzt alle Quartals-Filings mitnehmen
        .filter(f => f.form === '13F-NT' || f.form.startsWith('13F-HR'))

      // 2) Fallback: wenn in recent nichts, verwende historisches filings.files
      if (!filings.length && Array.isArray(data.filings?.files)) {
        filings = data.filings.files
          .filter(f => f.form === '13F-NT' || f.form.startsWith('13F-HR'))
          .map(f => ({
            form:      f.form,
            date:      f.filingDate,
            accession: f.accessionNumber,
            href:      `https://www.sec.gov/Archives/edgar/data/${cik}/${f.accessionNumber.replace(/-/g,'')}/${f.accessionNumber}.txt`
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date))
      }

      // 3) Wenn immer noch keine gefunden → leere Datei schreiben
      if (!filings.length) {
        console.warn(` ⚠ Keine 13F-Filings für ${slug}`)
        const empty = { date: null, positions: [] }
        await fs.writeFile(outPath, JSON.stringify(empty, null, 2), 'utf-8')
        console.log(`  → Leere Datei geschrieben: ${outPath}\n`)
        continue
      }

      // 4) Wähle das neueste Filing
      const latest = filings[0]
      console.log(`  • Latest ${latest.form} vom ${latest.date}`)
      console.log(`  • URL: ${latest.href}`)

      // 5) TXT laden & <informationTable> extrahieren
      const raw = await fetchTxt(latest.href)
      const infoMatch = raw.match(/<informationTable\b[\s\S]*?<\/informationTable>/i)
      if (!infoMatch) {
        console.warn(` ⚠ Keine <informationTable> im TXT für ${slug}`)
        const empty = { date: latest.date, positions: [] }
        await fs.writeFile(outPath, JSON.stringify(empty, null, 2), 'utf-8')
        continue
      }

      const xmlSnippet = `<root>${infoMatch[0]}</root>`
      const parsed     = await parseStringPromise(xmlSnippet, { explicitArray: false })

      // 6) Positionen parsen
      const info  = parsed.root.informationTable.infoTable
      const items = Array.isArray(info) ? info : [info]
      const clean = items.map(pos => ({
        name:   pos.nameOfIssuer,
        cusip:  pos.cusip,
        shares: Number(pos.shrsOrPrnAmt.sshPrnamt.replace(/,/g, '')),
        value:  Number(pos.value.replace(/,/g, '')) * 1000,
      }))

      // 7) JSON schreiben
      const out = { date: latest.date, positions: clean }
      await fs.writeFile(outPath, JSON.stringify(out, null, 2), 'utf-8')
      console.log(`  → Written ${clean.length} positions to ${outPath}\n`)

    } catch (err) {
      console.error(`✗ Fehler bei ${slug}:`, err.message)
    }
  }
}

run().catch(err => {
  console.error('Unerwarteter Fehler:', err)
  process.exit(1)
})