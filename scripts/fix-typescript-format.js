// scripts/fix-typescript-format.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function convertJsonToTypeScript(jsonString) {
  // Entferne Anführungszeichen um Object-Keys (aber nicht um Werte)
  return jsonString
    // Konvertiere "key": zu key:
    .replace(/"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:/g, '$1:')
    // Konvertiere doppelte zu einfache Anführungszeichen bei String-Werten (optional)
    .replace(/:\s*"([^"]*?)"/g, ": '$1'")
    // Behalte leere Strings als ''
    .replace(/:\s*''/g, ": ''")
    // Fix für Arrays
    .replace(/:\s*\[\]/g, ': []')
}

async function fixTypeScriptFormat() {
  const stocksPath = path.join(__dirname, '../src/data/stocks.ts')
  
  console.log('🔧 Repariere TypeScript Format...')
  
  if (!fs.existsSync(stocksPath)) {
    console.log('❌ stocks.ts nicht gefunden!')
    return
  }
  
  // Backup erstellen
  const backupPath = stocksPath + '.json-backup.' + Date.now()
  fs.copyFileSync(stocksPath, backupPath)
  console.log(`💾 JSON-Backup erstellt: ${backupPath}`)
  
  // Lese aktuelle Datei
  const content = fs.readFileSync(stocksPath, 'utf-8')
  
  // Extrahiere den stocks Array
  const stocksMatch = content.match(/export const stocks[^=]*=\s*(\[[\s\S]*?\]);?(?=\s*$|\s*export|\s*\/\/)/m)
  
  if (!stocksMatch) {
    console.log('❌ Konnte stocks Array nicht finden!')
    return
  }
  
  const jsonArray = stocksMatch[1]
  console.log('📄 JSON Array gefunden, konvertiere zu TypeScript...')
  
  // Konvertiere zu TypeScript Format
  const typeScriptArray = convertJsonToTypeScript(jsonArray)
  
  // Erstelle neue Datei im TypeScript Format
  const newContent = `export interface Stock {
  ticker: string
  cusip: string
  name: string
  sector: string
  metrics: any[]
}

export const stocks: Stock[] = ${typeScriptArray}
`
  
  // Schreibe Datei
  fs.writeFileSync(stocksPath, newContent)
  
  // Teste ob die Datei jetzt importierbar ist
  try {
    const testModule = await import('../src/data/stocks.ts?' + Date.now()) // Cache-bust
    console.log(`✅ Conversion erfolgreich! ${testModule.stocks?.length || 0} Aktien verfügbar`)
  } catch (error) {
    console.log('❌ Import-Test fehlgeschlagen:', error.message)
    console.log('📋 Stelle Backup wieder her...')
    fs.copyFileSync(backupPath, stocksPath)
  }
  
  console.log('🎉 TypeScript-Format wiederhergestellt!')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fixTypeScriptFormat().catch(console.error)
}