// scripts/ts-to-json.js
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function run() {
  const tsPath = path.join(__dirname, '../src/data/stocks.ts')
  const outPath = path.join(__dirname, '../src/data/stocks.json')
  const file = await fs.readFile(tsPath, 'utf8')

  const match = file.match(
    /export\s+const\s+stocks\s*(?:[:<\w\s,]*)=\s*(\[[\s\S]*?\]);/
  )
  if (!match) {
    console.error('❌ stocks-Array nicht gefunden. Überprüfe den export in stocks.ts')
    process.exit(1)
  }
  let arrayCode = match[1]

  let jsonText = arrayCode
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/,(\s*[\]}])/g, '$1')

  let stocks
  try {
    stocks = JSON.parse(jsonText)
  } catch (e) {
    console.error('❌ JSON-Parse-Fehler:', e.message)
    process.exit(1)
  }

  await fs.writeFile(outPath, JSON.stringify(stocks, null, 2), 'utf8')
  console.log(`✔️ ${stocks.length} Einträge in stocks.json geschrieben`)
}

run().catch(err => {
  console.error('Unerwarteter Fehler:', err)
  process.exit(1)
})