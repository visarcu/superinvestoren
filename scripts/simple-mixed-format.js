// scripts/simple-mixed-format.js - Einfachste Lösung
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function simpleMixedFormat() {
  const stocksPath = path.join(__dirname, '../src/data/stocks.ts')
  
  console.log('🔧 Einfache Mixed-Format Korrektur...')
  
  // Backup
  const backupPath = stocksPath + '.mixed-backup.' + Date.now()
  fs.copyFileSync(stocksPath, backupPath)
  console.log(`💾 Backup: ${backupPath}`)
  
  // Lese Datei
  let content = fs.readFileSync(stocksPath, 'utf-8')
  
  // STRATEGIE: Behalte doppelte Anführungszeichen für String-Werte,
  // entferne sie nur für Object-Keys
  
  console.log('🔄 Korrigiere zu Mixed Format (Keys ohne Anführungszeichen, Werte mit)...')
  
  // Entferne Anführungszeichen nur um Keys, behalte sie um Werte
  content = content.replace(/"ticker"\s*:\s*"/g, 'ticker: "')
  content = content.replace(/"cusip"\s*:\s*"/g, 'cusip: "')  
  content = content.replace(/"name"\s*:\s*"/g, 'name: "')
  content = content.replace(/"sector"\s*:\s*"/g, 'sector: "')
  content = content.replace(/"metrics"\s*:\s*\[/g, 'metrics: [')
  
  // Schreibe Datei
  fs.writeFileSync(stocksPath, content)
  
  console.log('✅ Mixed-Format angewendet!')
  console.log('📄 Beispiel Zeilen:')
  
  const newContent = fs.readFileSync(stocksPath, 'utf-8')
  const lines = newContent.split('\n')
  lines.slice(10, 20).forEach((line, i) => {
    if (line.trim()) {
      console.log(`${i + 11}: ${line.trim()}`)
    }
  })
}

simpleMixedFormat()