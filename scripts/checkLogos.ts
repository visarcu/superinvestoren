/**
 * checkLogos.ts
 *
 * Zeigt welche Logos vorhanden sind und welche fehlen.
 * Hilft beim manuellen Sammeln von Logos.
 *
 * Usage:
 *   npx tsx scripts/checkLogos.ts
 *
 * Logo hochladen:
 *   Einfach die Datei in /public/logos/ ablegen:
 *   - AAPL.png (oder .svg, .jpg, .webp)
 *   - MSFT.svg
 *   - SAP.png
 *
 * Empfohlenes Format:
 *   - PNG oder SVG
 *   - Quadratisch (z.B. 512x512)
 *   - Transparenter Hintergrund wenn möglich
 *   - Dateiname = Ticker in UPPERCASE
 */

import * as fs from 'fs'
import * as path from 'path'

const LOGOS_DIR = path.join(process.cwd(), 'public', 'logos')

// Top Tickers die Logos haben sollten
const PRIORITY_TICKERS = {
  'US Mega Caps': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B'],
  'US Tech': ['NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC', 'AMD', 'AVGO', 'CSCO', 'IBM', 'UBER', 'ABNB', 'SHOP', 'SPOT', 'SNAP', 'PINS', 'COIN', 'PLTR', 'SNOW', 'CRWD', 'NET'],
  'US Finance': ['V', 'MA', 'PYPL', 'JPM', 'BAC', 'GS', 'MS', 'WFC', 'BLK'],
  'US Consumer': ['WMT', 'KO', 'PEP', 'PG', 'COST', 'NKE', 'SBUX', 'MCD', 'DIS'],
  'US Healthcare': ['JNJ', 'UNH', 'PFE', 'LLY', 'ABBV', 'MRK'],
  'US Industrial': ['BA', 'CAT', 'HON', 'UPS', 'DE', 'LMT'],
  'DAX': ['SAP', 'SIE.DE', 'ALV.DE', 'DTE.DE', 'BAS.DE', 'BMW.DE', 'MBG.DE', 'ADS.DE', 'MUV2.DE', 'DB1.DE'],
}

function checkLogo(ticker: string): { exists: boolean; format: string | null; size: number | null } {
  for (const ext of ['svg', 'png', 'jpg', 'webp']) {
    const filePath = path.join(LOGOS_DIR, `${ticker}.${ext}`)
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      return { exists: true, format: ext, size: stats.size }
    }
  }
  return { exists: false, format: null, size: null }
}

function formatSize(bytes: number): string {
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('🖼️  Finclue Logo Check')
console.log(`   Verzeichnis: ${LOGOS_DIR}`)
console.log('')

if (!fs.existsSync(LOGOS_DIR)) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true })
  console.log('   Verzeichnis erstellt!')
}

// Vorhandene Logos zählen
const existingFiles = fs.readdirSync(LOGOS_DIR).filter(f => /\.(svg|png|jpg|webp)$/i.test(f))
console.log(`   ${existingFiles.length} Logos vorhanden`)
console.log('')

let totalNeeded = 0
let totalHave = 0

for (const [category, tickers] of Object.entries(PRIORITY_TICKERS)) {
  console.log(`── ${category} ──`)
  for (const ticker of tickers) {
    const { exists, format, size } = checkLogo(ticker)
    totalNeeded++
    if (exists) {
      totalHave++
      console.log(`  ✅ ${ticker.padEnd(10)} ${format?.toUpperCase().padEnd(4)} ${formatSize(size!)}`)
    } else {
      console.log(`  ❌ ${ticker.padEnd(10)} FEHLT`)
    }
  }
  console.log('')
}

console.log(`════════════════════════════`)
console.log(`  ${totalHave}/${totalNeeded} Logos vorhanden (${Math.round(totalHave / totalNeeded * 100)}%)`)
console.log(`  ${totalNeeded - totalHave} fehlen noch`)
console.log('')
console.log(`Tipp: Logos als {TICKER}.png in public/logos/ ablegen.`)
console.log(`      Ideal: PNG, 512x512, transparenter Hintergrund.`)
console.log(`      Quellen: Company IR/Press Kit Seiten.`)
