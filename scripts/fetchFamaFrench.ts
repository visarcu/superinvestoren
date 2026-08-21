// scripts/fetchFamaFrench.ts
// Lädt die täglichen Fama-French-Faktoren (Developed Markets, 5 Faktoren) aus
// der Ken-French-Data-Library und legt sie als JSON unter src/data/factors ab.
// Die Faktoranalyse im Portfolio (Quant-Sektion) regressiert die Depotrenditen
// gegen diese Serien. Aufruf: npm run update-factors
//
// Quelle: https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html
// Die Daten sind USD-denominiert — die Portfolio-Renditen werden vor der
// Regression entsprechend in USD umgerechnet (siehe portfolio-history Route).

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SOURCE_URL =
  'https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/Developed_5_Factors_Daily_CSV.zip'
// Vor 2010 hilft uns keine Historie: die Portfolio-Fenster reichen max. 15 Jahre
// zurück und jede Zeile kostet Bundle-Größe in der API-Route.
const MIN_DATE = '2010-01-01'
const OUT_DIR = path.join(__dirname, '..', 'src', 'data', 'factors')
const OUT_FILE = path.join(OUT_DIR, 'developed5FactorsDaily.json')

async function main() {
  console.log(`⬇️  Lade ${SOURCE_URL} ...`)
  const tmpZip = path.join(os.tmpdir(), `ff5-daily-${Date.now()}.zip`)

  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`Download fehlgeschlagen: HTTP ${res.status}`)
  fs.writeFileSync(tmpZip, Buffer.from(await res.arrayBuffer()))

  // Das Zip enthält genau eine CSV — `unzip -p` streamt sie nach stdout.
  const csv = execSync(`unzip -p "${tmpZip}"`, { maxBuffer: 64 * 1024 * 1024 }).toString('utf-8')
  fs.unlinkSync(tmpZip)

  // Format: Header-Zeilen, dann "YYYYMMDD,Mkt-RF,SMB,HML,RMW,CMA,RF" in Prozent.
  // -99.99 markiert fehlende Werte.
  const rows: Array<[string, number, number, number, number, number, number]> = []
  for (const line of csv.split(/\r?\n/)) {
    const match = line.match(/^\s*(\d{8})\s*,(.+)$/)
    if (!match) continue
    const raw = match[1]
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
    if (date < MIN_DATE) continue

    const values = match[2].split(',').map(v => parseFloat(v.trim()))
    if (values.length < 6 || values.some(v => !Number.isFinite(v) || v <= -99)) continue

    // Prozent → Dezimalrendite, auf 6 Stellen gerundet (Basispunkt-Genauigkeit
    // reicht — kleinere Reste sind Quantisierungsrauschen der Quelle).
    const [mktRf, smb, hml, rmw, cma, rf] = values.map(v => Math.round(v * 10000) / 1000000)
    rows.push([date, mktRf, smb, hml, rmw, cma, rf])
  }

  if (rows.length < 1000) {
    throw new Error(`Nur ${rows.length} Zeilen geparst — Format der Quelle prüfen, nichts geschrieben.`)
  }
  rows.sort((a, b) => a[0].localeCompare(b[0]))

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify({
      source: 'Ken French Data Library — Developed 5 Factors (Daily)',
      url: SOURCE_URL,
      updatedAt: new Date().toISOString().slice(0, 10),
      unit: 'decimal daily return',
      fields: ['date', 'mktRf', 'smb', 'hml', 'rmw', 'cma', 'rf'],
      rows,
    }),
  )

  console.log(`✅ ${rows.length} Handelstage (${rows[0][0]} – ${rows[rows.length - 1][0]}) → ${path.relative(process.cwd(), OUT_FILE)}`)
}

main().catch(err => {
  console.error('❌', err.message || err)
  process.exit(1)
})
