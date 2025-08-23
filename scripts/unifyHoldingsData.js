// scripts/unifyHoldingsData.js - CORRECTED VERSION
import fs from 'fs/promises'
import path from 'path'

// 1. UNIFIED HELPER FUNCTIONS - Robuster für beide Formate

function normalizeHoldingsData(data) {
  // Neues 13F-HR Format
  if ('form' in data && data.form === '13F-HR') {
    return {
      date: data.date,
      quarterKey: data.quarterKey,
      positions: data.positions.map(pos => ({
        cusip: pos.cusip,
        name: pos.name,
        shares: pos.shares,
        value: pos.value,
        ticker: pos.ticker || null // Falls noch nicht vorhanden
      }))
    }
  }
  
  // Neues NPORT-P Format  
  if ('form' in data && data.form === 'NPORT-P') {
    return {
      date: data.date,
      quarterKey: data.quarterKey,
      positions: data.positions.map(pos => ({
        cusip: pos.cusip,
        name: pos.name,
        shares: pos.shares,
        value: pos.value,
        ticker: pos.ticker || null
      }))
    }
  }
  
  // Fallback
  console.warn('Unbekanntes Datenformat:', Object.keys(data))
  return {
    date: data.date || '',
    quarterKey: null,
    positions: data.positions || []
  }
}

function getTicker(position, stocksDatabase) {
  // 1. Direkt im Position-Objekt
  if (position.ticker) return position.ticker
  
  // 2. Über CUSIP in stocks database suchen
  const stock = stocksDatabase.find(s => s.cusip === position.cusip)
  if (stock?.ticker) return stock.ticker
  
  // 3. Fallback: Aus CUSIP ableiten (entferne trailing zeros)
  if (position.cusip) {
    return position.cusip.replace(/0+$/, '')
  }
  
  return null
}

// 2. HAUPTFUNKTION - Format-Vereinheitlichung

async function unifyAllHoldingsData() {
  const holdingsDir = path.resolve('src/data/holdings')
  const stocksPath = path.resolve('src/data/stocks.ts')
  
  // Stocks-Datenbank laden (für CUSIP->Ticker Mapping)
  let stocksData = []
  try {
    const stocksContent = await fs.readFile(stocksPath, 'utf-8')
    // Einfacher Parser für die stocks.ts Datei
    const stocksMatch = stocksContent.match(/export const stocks = (\[[\s\S]*?\])/m)
    if (stocksMatch) {
      stocksData = eval(stocksMatch[1]) // ACHTUNG: Nur für interne Skripte!
    }
  } catch (err) {
    console.warn('Konnte stocks.ts nicht laden:', err.message)
  }
  
  const subdirs = await fs.readdir(holdingsDir)
  
  for (const subdir of subdirs) {
    const subdirPath = path.join(holdingsDir, subdir)
    const stat = await fs.stat(subdirPath)
    
    if (!stat.isDirectory()) continue
    
    console.log(`\n📁 Verarbeite Investor: ${subdir}`)
    
    const files = await fs.readdir(subdirPath)
    const jsonFiles = files.filter(f => f.endsWith('.json'))
    
    let processedCount = 0
    let unifiedCount = 0
    
    for (const file of jsonFiles) {
      const filePath = path.join(subdirPath, file)
      
      try {
        const rawData = JSON.parse(await fs.readFile(filePath, 'utf-8'))
        const normalized = normalizeHoldingsData(rawData)
        
        // Ticker-Enrichment für Positionen ohne Ticker
        let tickerEnriched = 0
        normalized.positions.forEach(pos => {
          if (!pos.ticker) {
            const ticker = getTicker(pos, stocksData)
            if (ticker) {
              pos.ticker = ticker
              tickerEnriched++
            }
          }
        })
        
        // Unified Format erstellen
        const unifiedData = {
          form: rawData.form || 'Legacy', // Kennzeichnung des ursprünglichen Formats
          date: normalized.date,
          quarterKey: normalized.quarterKey,
          positions: normalized.positions,
          totalValue: normalized.positions.reduce((sum, pos) => sum + pos.value, 0),
          positionsCount: normalized.positions.length,
          // Metadaten für Debugging
          originalFormat: rawData.form ? `${rawData.form}` : 'Legacy',
          processedAt: new Date().toISOString()
        }
        
        // Backup des ursprünglichen Files
        const backupPath = filePath.replace('.json', '.backup.json')
        try {
          await fs.access(backupPath)
          // Backup existiert bereits
        } catch {
          // Backup erstellen
          await fs.writeFile(backupPath, JSON.stringify(rawData, null, 2))
        }
        
        // Unified File schreiben
        await fs.writeFile(filePath, JSON.stringify(unifiedData, null, 2))
        
        console.log(`  ✅ ${file}: ${normalized.positions.length} Positionen, ${tickerEnriched} Ticker ergänzt`)
        
        processedCount++
        if (rawData.form !== unifiedData.form) unifiedCount++
        
      } catch (err) {
        console.error(`  ❌ Fehler bei ${file}:`, err.message)
      }
    }
    
    console.log(`  📊 ${subdir}: ${processedCount} Dateien verarbeitet, ${unifiedCount} vereinheitlicht`)
  }
}

// 3. INSIGHTS-PAGE HELPER FUNCTIONS - Verbessert

function createImprovedHelpers() {
  return `// src/lib/unifiedHoldingsHelpers.ts - NEUE HELPER FUNCTIONS

export function normalizeHoldingsData(data: any): { date: string; quarterKey: string; positions: any[] } {
  // Bereits unified format
  if (data.quarterKey && data.positions) {
    return {
      date: data.date,
      quarterKey: data.quarterKey,
      positions: data.positions
    }
  }
  
  // Legacy format - sollte nach Unified Script nicht mehr vorkommen
  const quarterKey = extractQuarterFromDate(data.date)
  return {
    date: data.date,
    quarterKey: quarterKey || '',
    positions: data.positions || []
  }
}

export function extractQuarterFromDate(dateStr: string): string | null {
  if (!dateStr) return null
  
  const [year, month] = dateStr.split('-')
  if (!year || !month) return null
  
  const quarter = Math.ceil(Number(month) / 3)
  return \`\${year}-Q\${quarter}\`
}

export function getTicker(position: any): string | null {
  // Ticker sollte nach Unified Script immer vorhanden sein
  return position.ticker || null
}

export function getStockName(position: any): string {
  // Bereinigter Name
  if (position.name && position.ticker) {
    return position.name.includes(' - ') 
      ? position.name.split(' - ')[1].trim()
      : position.name
  }
  return position.name || position.cusip
}

// DEBUGGING Funktionen für bessere Nachvollziehbarkeit
export function debugBuyDetection(investorSlug: string, snaps: any[], targetQuarters: string[]) {
  console.group(\`🔍 Debug: \${investorSlug}\`)
  
  const buys = new Map<string, number>()
  
  snaps.forEach((snap, idx) => {
    const normalized = normalizeHoldingsData(snap.data)
    const quarter = normalized.quarterKey
    
    console.log(\`  Quartal \${quarter}: \${normalized.positions.length} Positionen\`)
    
    if (!targetQuarters.includes(quarter)) {
      console.log(\`    ⏭ Übersprungen (nicht im Zielzeitraum)\`)
      return
    }
    
    if (idx > 0) {
      const prevNormalized = normalizeHoldingsData(snaps[idx - 1].data)
      
      // Käufe detectieren
      const prevMap = new Map<string, number>()
      prevNormalized.positions.forEach(p => {
        const ticker = getTicker(p)
        if (ticker) {
          prevMap.set(ticker, (prevMap.get(ticker) || 0) + p.shares)
        }
      })
      
      normalized.positions.forEach(p => {
        const ticker = getTicker(p)
        if (!ticker) return
        
        const currentShares = p.shares
        const prevShares = prevMap.get(ticker) || 0
        const delta = currentShares - prevShares
        
        if (delta > 1000) {
          buys.set(ticker, (buys.get(ticker) || 0) + 1)
          console.log(\`    📈 \${ticker}: +\${delta.toLocaleString()} Aktien (Kauf erkannt)\`)
        }
      })
    }
  })
  
  console.log('  📈 Erkannte Käufe:', Array.from(buys.entries()))
  console.groupEnd()
  
  return buys
}
`
}

// 4. RUN SCRIPT

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starte Holdings Data Unification...')
  
  await unifyAllHoldingsData()
  
  console.log('\n📝 Erstelle verbesserte Helper Functions...')
  await fs.writeFile('src/lib/unifiedHoldingsHelpers.ts', createImprovedHelpers())
  
  console.log('\n✅ Fertig! Nächste Schritte:')
  console.log('1. Ersetze die Helper Functions in insights/page.tsx')
  console.log('2. Teste die Käufe-Berechnung')
  console.log('3. Führe das neue 13F Script über alle fehlenden Investoren aus')
}