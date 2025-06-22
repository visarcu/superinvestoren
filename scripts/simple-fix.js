// scripts/simple-fix.js - Vereinfachte Format-Korrektur
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function simpleFixFormat() {
  const stocksPath = path.join(__dirname, '../src/data/stocks.ts')
  
  console.log('🔧 Einfache Format-Korrektur...')
  
  if (!fs.existsSync(stocksPath)) {
    console.log('❌ stocks.ts nicht gefunden!')
    return
  }
  
  // Lese Datei
  let content = fs.readFileSync(stocksPath, 'utf-8')
  
  console.log('📄 Aktuelle ersten Zeilen:')
  console.log(content.substring(0, 500))
  
  // Backup erstellen (falls noch nicht vorhanden)
  const backupPath = stocksPath + '.simple-backup.' + Date.now()
  fs.copyFileSync(stocksPath, backupPath)
  console.log(`💾 Backup: ${backupPath}`)
  
  // Einfache String-Ersetzungen um JSON zu TypeScript zu konvertieren
  console.log('🔄 Konvertiere JSON-Keys zu TypeScript...')
  
  // Ersetze "ticker": mit ticker:
  content = content.replace(/"ticker"\s*:/g, 'ticker:')
  
  // Ersetze "cusip": mit cusip:
  content = content.replace(/"cusip"\s*:/g, 'cusip:')
  
  // Ersetze "name": mit name:
  content = content.replace(/"name"\s*:/g, 'name:')
  
  // Ersetze "sector": mit sector:
  content = content.replace(/"sector"\s*:/g, 'sector:')
  
  // Ersetze "metrics": mit metrics:
  content = content.replace(/"metrics"\s*:/g, 'metrics:')
  
  // Konvertiere doppelte zu einfache Anführungszeichen bei String-Werten
  content = content.replace(/:\s*"([^"]*?)"/g, ": '$1'")
  
  // Fix für leere Strings
  content = content.replace(/:\s*''/g, ": ''")
  
  // Schreibe korrigierte Datei
  fs.writeFileSync(stocksPath, content)
  
  console.log('✅ Format-Korrektur abgeschlossen!')
  console.log('📄 Neue ersten Zeilen:')
  const newContent = fs.readFileSync(stocksPath, 'utf-8')
  console.log(newContent.substring(0, 500))
}

simpleFixFormat()