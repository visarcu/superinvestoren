import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  throw new Error('FMP_API_KEY not found in environment variables');
}

interface FMPETFResponse {
  symbol: string;
  name: string;
  price?: number;
  exchange?: string;
  exchangeShortName?: string;
  type?: string;
}

interface ETF {
  symbol: string;
  name: string;
  price?: number;
  issuer: string;
  assetClass: 'Equity' | 'Fixed Income' | 'Commodity' | 'Mixed';
  category: string;
  isin?: string;
  ter?: number;
}

// Helper function to extract issuer from ETF name
function extractIssuer(name: string): string {
  const issuers = [
    'iShares',
    'Vanguard', 
    'Xtrackers',
    'SPDR',
    'Invesco',
    'Amundi',
    'Lyxor',
    'UBS',
    'Deka',
    'ComStage',
    'Franklin',
    'HSBC',
    'JPMorgan',
    'BNP Paribas',
    'Ossiam',
    'WisdomTree',
    'VanEck',
    'First Trust',
    'Fidelity',
    'Schwab'
  ];

  for (const issuer of issuers) {
    if (name.toLowerCase().includes(issuer.toLowerCase())) {
      return issuer;
    }
  }
  
  // Extract from beginning of name if no known issuer found
  const words = name.split(' ');
  return words[0] || 'Unknown';
}

// Helper function to determine asset class from name
function determineAssetClass(name: string): ETF['assetClass'] {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('bond') || nameLower.includes('treasury') || 
      nameLower.includes('fixed income') || nameLower.includes('anleihe')) {
    return 'Fixed Income';
  }
  
  if (nameLower.includes('gold') || nameLower.includes('silver') || 
      nameLower.includes('commodity') || nameLower.includes('oil') ||
      nameLower.includes('rohstoff')) {
    return 'Commodity';
  }
  
  if (nameLower.includes('balanced') || nameLower.includes('allocation') ||
      nameLower.includes('multi') || nameLower.includes('target')) {
    return 'Mixed';
  }
  
  return 'Equity';
}

// Helper function to determine category from name
function determineCategory(name: string): string {
  const nameLower = name.toLowerCase();
  
  // Geographic categories
  if (nameLower.includes('world') || nameLower.includes('global')) return 'Global';
  if (nameLower.includes('europe') || nameLower.includes('europa')) return 'Europe';
  if (nameLower.includes('usa') || nameLower.includes('s&p') || nameLower.includes('nasdaq')) return 'US';
  if (nameLower.includes('germany') || nameLower.includes('dax') || nameLower.includes('deutschland')) return 'Germany';
  if (nameLower.includes('emerging') || nameLower.includes('em ')) return 'Emerging Markets';
  if (nameLower.includes('asia') || nameLower.includes('asien')) return 'Asia';
  if (nameLower.includes('japan') || nameLower.includes('nikkei')) return 'Japan';
  if (nameLower.includes('china')) return 'China';
  
  // Sector categories
  if (nameLower.includes('technology') || nameLower.includes('tech') || nameLower.includes('it')) return 'Technology';
  if (nameLower.includes('healthcare') || nameLower.includes('health') || nameLower.includes('pharma')) return 'Healthcare';
  if (nameLower.includes('financial') || nameLower.includes('bank')) return 'Financials';
  if (nameLower.includes('energy') || nameLower.includes('oil')) return 'Energy';
  if (nameLower.includes('real estate') || nameLower.includes('reit') || nameLower.includes('immobilien')) return 'Real Estate';
  if (nameLower.includes('consumer') || nameLower.includes('konsum')) return 'Consumer';
  if (nameLower.includes('industrial') || nameLower.includes('industrie')) return 'Industrials';
  if (nameLower.includes('utilities') || nameLower.includes('versorger')) return 'Utilities';
  if (nameLower.includes('materials') || nameLower.includes('basic')) return 'Materials';
  if (nameLower.includes('communication') || nameLower.includes('telecom')) return 'Communication';
  
  // Style categories
  if (nameLower.includes('dividend') || nameLower.includes('yield') || nameLower.includes('dividende')) return 'Dividend';
  if (nameLower.includes('growth') || nameLower.includes('wachstum')) return 'Growth';
  if (nameLower.includes('value') || nameLower.includes('wert')) return 'Value';
  if (nameLower.includes('quality') || nameLower.includes('qualität')) return 'Quality';
  if (nameLower.includes('momentum')) return 'Momentum';
  if (nameLower.includes('small cap') || nameLower.includes('smallcap')) return 'Small Cap';
  if (nameLower.includes('mid cap') || nameLower.includes('midcap')) return 'Mid Cap';
  if (nameLower.includes('large cap') || nameLower.includes('largecap')) return 'Large Cap';
  
  // ESG
  if (nameLower.includes('esg') || nameLower.includes('sustainable') || nameLower.includes('nachhaltig')) return 'ESG';
  
  // Bond types
  if (nameLower.includes('government') || nameLower.includes('treasury')) return 'Government Bonds';
  if (nameLower.includes('corporate') || nameLower.includes('unternehmens')) return 'Corporate Bonds';
  if (nameLower.includes('high yield')) return 'High Yield Bonds';
  
  // Commodity types
  if (nameLower.includes('gold')) return 'Gold';
  if (nameLower.includes('silver')) return 'Silver';
  if (nameLower.includes('oil') || nameLower.includes('crude')) return 'Oil';
  if (nameLower.includes('agricultural') || nameLower.includes('agrar')) return 'Agriculture';
  
  return 'Mixed';
}

async function fetchXetraETFs(): Promise<ETF[]> {
  console.log('Fetching ETF list from FMP API...');
  
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/etf/list?apikey=${FMP_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const etfs: FMPETFResponse[] = await response.json();
    console.log(`Total ETFs received: ${etfs.length}`);
    
    // Filter for XETRA exchange
    const xetraETFs = etfs.filter(etf => 
      etf.exchangeShortName === 'XETRA' || 
      etf.exchange === 'XETRA' ||
      etf.symbol?.endsWith('.DE')
    );
    
    console.log(`XETRA ETFs found: ${xetraETFs.length}`);
    
    // Transform to our ETF interface
    const transformedETFs: ETF[] = xetraETFs.map(etf => {
      const name = etf.name || etf.symbol;
      
      return {
        symbol: etf.symbol,
        name: name,
        price: etf.price,
        issuer: extractIssuer(name),
        assetClass: determineAssetClass(name),
        category: determineCategory(name)
      };
    });
    
    // Sort by symbol for consistent ordering
    transformedETFs.sort((a, b) => a.symbol.localeCompare(b.symbol));
    
    return transformedETFs;
    
  } catch (error) {
    console.error('Error fetching ETFs:', error);
    throw error;
  }
}

async function main() {
  try {
    const xetraETFs = await fetchXetraETFs();
    
    console.log(`\n=== XETRA ETF EXTRACTION COMPLETE ===`);
    console.log(`Total XETRA ETFs found: ${xetraETFs.length}`);
    
    // Group by issuer for statistics
    const issuerStats: { [key: string]: number } = {};
    const assetClassStats: { [key: string]: number } = {};
    
    xetraETFs.forEach(etf => {
      issuerStats[etf.issuer] = (issuerStats[etf.issuer] || 0) + 1;
      assetClassStats[etf.assetClass] = (assetClassStats[etf.assetClass] || 0) + 1;
    });
    
    console.log('\n=== STATISTICS ===');
    console.log('\nBy Issuer:');
    Object.entries(issuerStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([issuer, count]) => {
        console.log(`  ${issuer}: ${count}`);
      });
    
    console.log('\nBy Asset Class:');
    Object.entries(assetClassStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([assetClass, count]) => {
        console.log(`  ${assetClass}: ${count}`);
      });
    
    // Output TypeScript array format
    console.log('\n=== TYPESCRIPT ARRAY OUTPUT ===');
    console.log('export const xetraETFs: ETF[] = [');
    
    xetraETFs.forEach((etf, index) => {
      const isLast = index === xetraETFs.length - 1;
      console.log('  {');
      console.log(`    symbol: '${etf.symbol}',`);
      console.log(`    name: '${etf.name.replace(/'/g, "\\'")}',`);
      if (etf.price !== undefined) {
        console.log(`    price: ${etf.price},`);
      }
      console.log(`    issuer: '${etf.issuer}',`);
      console.log(`    assetClass: '${etf.assetClass}',`);
      console.log(`    category: '${etf.category}'`);
      console.log(`  }${isLast ? '' : ','}`);
    });
    
    console.log('];');
    
    // Sample of first 10 ETFs
    console.log('\n=== SAMPLE (First 10 ETFs) ===');
    xetraETFs.slice(0, 10).forEach((etf, index) => {
      console.log(`${index + 1}. ${etf.symbol} - ${etf.name} (${etf.issuer})`);
    });
    
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();