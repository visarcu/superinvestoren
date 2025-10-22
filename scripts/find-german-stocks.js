#!/usr/bin/env node

// Script to find all German stocks in the latest quarter holdings
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deutsche Firmennamen (erweiterte Liste) - nur vollständige Namen oder eindeutige Patterns
const GERMAN_COMPANY_PATTERNS = [
  'SAP SE', 'SAP AG', 'DEUTSCHE BANK', 'SIEMENS', 'VOLKSWAGEN', 'MERCEDES', 'BMW',
  'ALLIANZ', 'BASF', 'BAYER', 'ADIDAS', 'PORSCHE', 'RHEINMETALL',
  'RWE', 'INFINEON', 'MTU AERO', 'SCOUT24', 'ZALANDO', 'VONOVIA',
  'DEUTSCHE TELEKOM', 'DEUTSCHE POST', 'DHL GROUP', 'HANNOVER RE',
  'HEIDELBERGCEMENT', 'FRESENIUS', 'BEIERSDORF', 'CONTINENTAL',
  'COMMERZBANK', 'HENKEL', 'SYMRISE', 'QIAGEN',
  'BRENNTAG', 'GEA GROUP', 'KNORR-BREMSE', 'SARTORIUS', 'DELIVERY HERO'
];

// Ausgeschlossene Firmen die fälschlicherweise erkannt werden könnten
const EXCLUDED_PATTERNS = [
  'INTERCONTINENTAL EXCHANGE', 'SITEONE', 'NORWEGIAN CRUISE', 'LEONARDO DRS',
  'NETGEAR', 'SENSEONICS', 'VISTEON', 'CHESAPEAKE', 'RAYTHEON',
  'UNITED CONTINENTAL', 'SIMILARWEB', 'SAPIENS', 'HALEON'
];

function isGermanCompany(name) {
  const upperName = name.toUpperCase();
  
  // Prüfe zuerst ob es ausgeschlossen werden soll
  if (EXCLUDED_PATTERNS.some(excluded => upperName.includes(excluded.toUpperCase()))) {
    return false;
  }
  
  // Dann prüfe deutsche Patterns
  return GERMAN_COMPANY_PATTERNS.some(pattern => 
    upperName.includes(pattern.toUpperCase())
  );
}

function findGermanStocks() {
  const holdingsDir = path.join(__dirname, '..', 'src', 'data', 'holdings');
  const germanStocks = new Map();
  
  console.log('🔍 Durchsuche Holdings nach deutschen Aktien...\n');
  
  // Alle Investoren-Ordner durchgehen
  const investors = fs.readdirSync(holdingsDir).filter(item => {
    const itemPath = path.join(holdingsDir, item);
    return fs.statSync(itemPath).isDirectory();
  });
  
  console.log(`📊 Prüfe ${investors.length} Investoren...\n`);
  
  let totalGermanPositions = 0;
  const investorResults = {};
  
  investors.forEach(investor => {
    const investorPath = path.join(holdingsDir, investor);
    const files = fs.readdirSync(investorPath);
    
    // Suche neueste Q3 2025 Datei, falls nicht vorhanden dann neueste verfügbare
    let latestFile = files.find(f => f.includes('2025-Q3.json'));
    if (!latestFile) {
      latestFile = files.filter(f => f.endsWith('.json')).sort().pop();
    }
    
    if (!latestFile) return;
    
    try {
      const filePath = path.join(investorPath, latestFile);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (!data.positions) return;
      
      const germanPositions = [];
      
      data.positions.forEach(position => {
        if (isGermanCompany(position.name)) {
          germanPositions.push({
            name: position.name,
            cusip: position.cusip,
            shares: position.shares,
            value: position.value,
            quarter: latestFile.replace('.json', '')
          });
          
          // Sammle eindeutige deutsche Aktien
          const key = `${position.name}-${position.cusip}`;
          if (!germanStocks.has(key)) {
            germanStocks.set(key, {
              name: position.name,
              cusip: position.cusip,
              investors: new Set(),
              totalValue: 0,
              quarters: new Set()
            });
          }
          
          const stock = germanStocks.get(key);
          stock.investors.add(investor);
          stock.totalValue += position.value || 0;
          stock.quarters.add(latestFile.replace('.json', ''));
        }
      });
      
      if (germanPositions.length > 0) {
        investorResults[investor] = germanPositions;
        totalGermanPositions += germanPositions.length;
        console.log(`✅ ${investor}: ${germanPositions.length} deutsche Aktien`);
      }
    } catch (error) {
      console.log(`❌ Fehler bei ${investor}: ${error.message}`);
    }
  });
  
  console.log(`\n📈 GESAMT: ${totalGermanPositions} deutsche Positionen gefunden`);
  console.log(`🏢 ${germanStocks.size} eindeutige deutsche Aktien\n`);
  
  // Sortiere nach Anzahl Investoren
  const sortedStocks = Array.from(germanStocks.entries())
    .map(([key, data]) => ({
      name: data.name,
      cusip: data.cusip,
      investorCount: data.investors.size,
      investors: Array.from(data.investors),
      totalValue: data.totalValue,
      quarters: Array.from(data.quarters)
    }))
    .sort((a, b) => b.investorCount - a.investorCount);
  
  console.log('🎯 TOP DEUTSCHE AKTIEN (nach Investor-Anzahl):\n');
  
  sortedStocks.slice(0, 20).forEach((stock, index) => {
    const valueStr = stock.totalValue > 0 ? 
      ` (${(stock.totalValue / 1000000).toFixed(0)}M$)` : '';
    console.log(`${index + 1}. ${stock.name}`);
    console.log(`   CUSIP: ${stock.cusip}`);
    console.log(`   Investoren: ${stock.investorCount} - ${stock.investors.slice(0, 3).join(', ')}${stock.investors.length > 3 ? '...' : ''}`);
    console.log(`   Value: ${valueStr}\n`);
  });
  
  // Zeige CUSIPs die noch nicht in stocks-us.ts sind
  console.log('\n🔧 CUSIPS FÜR stocks-us.ts:\n');
  
  sortedStocks.forEach(stock => {
    if (stock.cusip && stock.cusip !== '000000000') {
      // Generiere einen wahrscheinlichen Ticker
      let ticker = stock.name.toUpperCase()
        .replace(/\s+AG.*/, '')
        .replace(/\s+SE.*/, '')
        .replace(/\s+GROUP.*/, '')
        .replace(/DEUTSCHE\s+/, 'D')
        .replace(/\s+/, '')
        .substring(0, 5);
      
      if (stock.name.includes('ADR')) {
        ticker += 'Y'; // Typisches ADR-Suffix
      }
      
      console.log(`  {`);
      console.log(`    ticker: '${ticker}', // ${stock.name}`);
      console.log(`    cusip: '${stock.cusip}',`);
      console.log(`    name: '${stock.name}',`);
      console.log(`    sector: '',`);
      console.log(`    metrics: [],`);
      console.log(`  },`);
    }
  });
  
  return { sortedStocks, investorResults };
}

// Script ausführen
if (import.meta.url === `file://${process.argv[1]}`) {
  findGermanStocks();
}

export { findGermanStocks };