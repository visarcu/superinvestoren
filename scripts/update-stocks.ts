// scripts/update-stocks.ts
import fs from 'fs'
import fetch from 'node-fetch'

const API_KEY = process.env.FMP_API_KEY
if (!API_KEY) {
  console.error('Bitte setze die Umgebungsvariable FMP_API_KEY')
  process.exit(1)
}

const LIST_URL    = `https://financialmodelingprep.com/api/v3/stock/list?apikey=${API_KEY}`
const PROFILE_URL = (symbol: string) =>
  `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${API_KEY}`

interface FmpStock {
  symbol: string
  name:   string
  // ... andere Felder, Cusip liefert die List-Route nicht
}
interface FmpProfile {
  symbol: string
  cusip:  string
  // … weitere Felder, die Du ggf. brauchst
}

async function main() {
  // 1) erst die Liste holen
  const listRes = await fetch(LIST_URL)
  const stocksList = (await listRes.json()) as FmpStock[]

  // nimm die ersten 9000 (oder weniger, je nach Bedarf)
  const top = stocksList
    .filter(s => s.symbol && s.name)
    .slice(0, 2000)

  // 2) jetzt für jedes Symbol das Profile abrufen und cusip extrahieren
  const entries: string[] = []
  for (const s of top) {
    // kleines Rate-Limit, damit wir FMP nicht überlasten
    await new Promise(r => setTimeout(r, 100))

    let cusip = ''
    try {
      const profRes = await fetch(PROFILE_URL(s.symbol))
      const profJson = (await profRes.json()) as FmpProfile[]
      cusip = profJson[0]?.cusip || ''
    } catch (e) {
      console.warn(`⚠️ konnte Profil für ${s.symbol} nicht holen:`, e)
    }

    const safeName = s.name.replace(/'/g,"\\'")
    entries.push(`  {
    ticker: '${s.symbol}',
    cusip:  '${cusip}',
    name:   '${safeName}',
    sector: '',            // falls Du Industry/Sektor aus dem Profil willst, hier setzen
    metrics: [],
  }`)
  }

  // 3) Datei neu schreiben
  const content = `export interface Stock {
  ticker: string
  cusip:  string
  name:   string
  sector: string
  metrics: any[]
}

export const stocks: Stock[] = [
${entries.join(',\n')}
]
`
  fs.writeFileSync('src/data/stocks.ts', content, 'utf-8')
  console.log(`✅ stocks.ts aktualisiert mit ${entries.length} Einträgen`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})