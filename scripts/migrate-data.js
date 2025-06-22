// scripts/migrate-data.js - Konvertiert neue JSON Formate

const fs = require('fs');
const path = require('path');

// Konvertiere SEC 13F-HR Format zu Legacy Format
function convertSECtoLegacy(secData) {
  return {
    date: secData.date,
    positions: secData.positions.map(pos => ({
      cusip: pos.cusip,
      name: pos.name,
      shares: pos.shares,
      value: pos.value,
      ticker: pos.ticker
    }))
  };
}

// Extrahiere Quarter aus SEC quarterKey  
function extractQuarterFromSEC(quarterKey) {
  // "2025-Q2" -> "2025-Q2"
  return quarterKey;
}

// Haupt-Migration Funktion
function migrateInvestorData(investorSlug) {
  const dataDir = path.join(__dirname, '../src/data/holdings');
  const pattern = new RegExp(`${investorSlug}_\\d{4}_Q\\d\\.json$`);
  
  const files = fs.readdirSync(dataDir).filter(file => pattern.test(file));
  
  const snapshots = [];
  
  files.forEach(filename => {
    const filepath = path.join(dataDir, filename);
    const rawData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    let convertedData;
    let quarter;
    
    // Erkenne Format und konvertiere
    if (rawData.form === '13F-HR') {
      // SEC 13F-HR Format
      convertedData = convertSECtoLegacy(rawData);
      quarter = extractQuarterFromSEC(rawData.quarterKey);
      
      console.log(`✅ Konvertiert SEC 13F-HR: ${filename} -> ${quarter}`);
    } else if (rawData.date && rawData.positions && !rawData.form) {
      // Dataroma oder Legacy Format
      convertedData = rawData;
      
      // Quarter aus Dateiname extrahieren: buffett_2025_Q2.json
      const quarterMatch = filename.match(/_(\d{4})_Q(\d)\.json$/);
      if (quarterMatch) {
        quarter = `${quarterMatch[1]}-Q${quarterMatch[2]}`;
      } else {
        // Fallback: Berechne aus Datum
        const date = new Date(rawData.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const q = Math.ceil(month / 3);
        quarter = `${year}-Q${q}`;
      }
      
      console.log(`✅ Legacy/Dataroma Format: ${filename} -> ${quarter}`);
    } else {
      console.log(`❌ Unbekanntes Format: ${filename}`);
      return;
    }
    
    snapshots.push({
      quarter,
      data: convertedData,
      sourceFile: filename,
      originalFormat: rawData.form || 'legacy'
    });
  });
  
  // Sortiere nach Quarter
  snapshots.sort((a, b) => a.quarter.localeCompare(b.quarter));
  
  // Generiere Holdings Index Code
  const indexCode = generateHoldingsIndex(investorSlug, snapshots);
  
  console.log(`\n📋 Generierter Code für ${investorSlug}:`);
  console.log(indexCode);
  
  return snapshots;
}

function generateHoldingsIndex(investorSlug, snapshots) {
  const imports = snapshots.map(snap => 
    `import ${investorSlug}_${snap.quarter.replace('-', '_')} from './${snap.sourceFile.replace('.json', '')}'`
  ).join('\n');
  
  const entries = snapshots.map(snap => 
    `    { quarter: '${snap.quarter}', data: ${investorSlug}_${snap.quarter.replace('-', '_')} }`
  ).join(',\n');
  
  return `// Auto-generated for ${investorSlug}
${imports}

const ${investorSlug}History = [
${entries}
];

export default ${investorSlug}History;`;
}

// Validierung: Prüfe auf doppelte oder fehlende Quarter
function validateData(snapshots) {
  const quarters = snapshots.map(s => s.quarter);
  const duplicates = quarters.filter((q, i) => quarters.indexOf(q) !== i);
  
  if (duplicates.length > 0) {
    console.log(`⚠️  Doppelte Quarter gefunden: ${duplicates.join(', ')}`);
  }
  
  // Prüfe auf Lücken
  snapshots.forEach((snap, i) => {
    if (snap.data.positions.length === 0) {
      console.log(`⚠️  Leere Positionen in ${snap.quarter}`);
    }
    
    // Prüfe auf fehlende Ticker
    const missingTickers = snap.data.positions.filter(pos => !pos.ticker);
    if (missingTickers.length > 0) {
      console.log(`⚠️  ${missingTickers.length} Positionen ohne Ticker in ${snap.quarter}`);
    }
  });
}

// Debugging: Zeige Microsoft Positionen
function debugMicrosoftPositions(investorSlug, snapshots) {
  console.log(`\n🔍 Microsoft (MSFT) Positionen für ${investorSlug}:`);
  
  snapshots.forEach(snap => {
    const msftPositions = snap.data.positions.filter(pos => 
      pos.ticker === 'MSFT' || 
      pos.cusip === '594918104' || // Microsoft CUSIP
      pos.name.toLowerCase().includes('microsoft')
    );
    
    if (msftPositions.length > 0) {
      console.log(`  ${snap.quarter}: ${msftPositions.length} Position(en)`);
      msftPositions.forEach(pos => {
        console.log(`    - ${pos.shares.toLocaleString()} Aktien, $${(pos.value/1000000).toFixed(1)}M`);
      });
    }
  });
}

// Hauptfunktion
function main() {
  const investors = ['buffett', 'ackman', 'gates']; // Erweitere nach Bedarf
  
  investors.forEach(investor => {
    console.log(`\n🚀 Migriere Daten für ${investor}...`);
    
    try {
      const snapshots = migrateInvestorData(investor);
      validateData(snapshots);
      debugMicrosoftPositions(investor, snapshots);
      
      console.log(`✅ ${investor}: ${snapshots.length} Snapshots verarbeitet`);
    } catch (error) {
      console.log(`❌ Fehler bei ${investor}: ${error.message}`);
    }
  });
}

// Wenn direkt ausgeführt
if (require.main === module) {
  main();
}

module.exports = {
  migrateInvestorData,
  convertSECtoLegacy,
  validateData,
  debugMicrosoftPositions
};