// scripts/updateHoldingsIndex.js - Automatisches Update der holdings/index.ts
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Mapping von Dataroma-Slugs zu deinen bestehenden Slugs
const SLUG_MAPPING = {
  // Dataroma → Deine Website
  'torray': 'torray',
  'akre': 'akre', 
  'pabrai': 'pabrai',
  'spier': 'spier',
  'chou': 'chou',
  'tarasoff': 'tarasoff',
  'vinall': 'vinall',
  'welling': 'welling',
  'burry':'burry',
  'klarman':'klarman',
  'dodgecox':'dodgecox',
  'olstein':'olstein',
  'nygren':'nygren',
  'katz':'katz',
  'davis':'davis',
  'mairspower':'mairspower',
  'tangen':'tangen',
  'loeb':'loeb'
  // Weitere nach Bedarf...
}

async function scanHoldingsDirectory() {
  const holdingsDir = path.resolve('src/data/holdings')
  const investors = {}
  
  try {
    const entries = await fs.readdir(holdingsDir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        const investorSlug = entry.name
        const investorPath = path.join(holdingsDir, investorSlug)
        
        try {
          const files = await fs.readdir(investorPath)
          const jsonFiles = files
            .filter(f => f.endsWith('.json'))
            .sort() // Chronologische Sortierung
          
          if (jsonFiles.length > 0) {
            investors[investorSlug] = jsonFiles
            console.log(`✅ ${investorSlug}: ${jsonFiles.length} Dateien gefunden`)
          }
        } catch (error) {
          console.log(`⚠️  Überspringe ${investorSlug}: ${error.message}`)
        }
      }
    }
  } catch (error) {
    console.error('❌ Fehler beim Scannen der Holdings-Ordner:', error)
    return {}
  }
  
  return investors
}

function generateImports(investors) {
  let imports = []
  
  for (const [investorSlug, files] of Object.entries(investors)) {
    // Bestehende Investoren (13F-Daten)
    if (!SLUG_MAPPING[investorSlug]) {
      imports.push(`// ${investorSlug} (13F-Daten)`)
      for (const file of files) {
        const quarter = file.replace('.json', '')
        const varName = `${investorSlug}_${quarter.replace(/-/g, '_')}`
        imports.push(`import ${varName} from './${investorSlug}/${file}'`)
      }
      imports.push('')
    }
  }
  
  // Dataroma-Investoren
  for (const [investorSlug, files] of Object.entries(investors)) {
    if (SLUG_MAPPING[investorSlug]) {
      imports.push(`// ${investorSlug} (Dataroma)`)
      for (const file of files) {
        const quarter = file.replace('.json', '')
        const varName = `${investorSlug}_${quarter.replace(/-/g, '_')}`
        imports.push(`import ${varName} from './${investorSlug}/${file}'`)
      }
      imports.push('')
    }
  }
  
  return imports.join('\n')
}

function generateHistoryObject(investors) {
  let lines = []
  
  for (const [investorSlug, files] of Object.entries(investors)) {
    const mappedSlug = SLUG_MAPPING[investorSlug] || investorSlug
    
    lines.push(`  ${mappedSlug}: [`)
    
    for (const file of files) {
      const quarter = file.replace('.json', '')
      const varName = `${investorSlug}_${quarter.replace(/-/g, '_')}`
      lines.push(`    { quarter: '${quarter}', data: ${varName} },`)
    }
    
    lines.push(`  ],`)
    lines.push('')
  }
  
  return lines.join('\n')
}

async function updateHoldingsIndex() {
  console.log('🔄 Aktualisiere holdings/index.ts...')
  
  // 1. Scanne alle Holdings-Ordner
  const investors = await scanHoldingsDirectory()
  
  if (Object.keys(investors).length === 0) {
    console.log('❌ Keine Holdings-Daten gefunden!')
    return
  }
  
  // 2. Generiere neuen Inhalt
  const importsSection = generateImports(investors)
  const historySection = generateHistoryObject(investors)
  
  const newContent = `// src/data/holdings/index.ts - Auto-generiert
// Letzte Aktualisierung: ${new Date().toLocaleString('de-DE')}

${importsSection}

// 2) Typen
export interface HoldingsFile {
  date: string
  positions: Array<{
    cusip: string
    name: string
    shares: number
    value: number
    ticker?: string // Optional für neue Datenquellen wie Dataroma
  }>
}

export interface Snapshot {
  quarter: string
  data: HoldingsFile
}

// 3) Historie pro Investor
const holdingsHistory: Record<string, Snapshot[]> = {
${historySection}}

export default holdingsHistory`
  
  // 3. Schreibe die neue Datei
  const indexPath = path.resolve('src/data/holdings/index.ts')
  await fs.writeFile(indexPath, newContent, 'utf-8')
  
  console.log('✅ holdings/index.ts erfolgreich aktualisiert!')
  console.log(`📊 ${Object.keys(investors).length} Investoren eingebunden:`)
  
  for (const [slug, files] of Object.entries(investors)) {
    const mappedSlug = SLUG_MAPPING[slug] || slug
    const source = SLUG_MAPPING[slug] ? 'Dataroma' : '13F'
    console.log(`   • ${mappedSlug}: ${files.length} Quartale (${source})`)
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  updateHoldingsIndex()
}

export { updateHoldingsIndex }