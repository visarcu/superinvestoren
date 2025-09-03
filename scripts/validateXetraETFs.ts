import { xetraETFs, xetraETFStats } from '../src/data/xetraETFsComplete';

function validateXetraETFs() {
  console.log('🔍 XETRA ETF Data Validation Report');
  console.log('=====================================');
  
  console.log(`\n📊 Total ETFs: ${xetraETFs.length}`);
  console.log(`📅 Extraction Date: ${xetraETFStats.extractionDate}`);
  
  console.log('\n🏢 Top 10 Issuers:');
  const sortedIssuers = Object.entries(xetraETFStats.byIssuer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedIssuers.forEach(([issuer, count], index) => {
    console.log(`${index + 1}. ${issuer}: ${count} ETFs`);
  });
  
  console.log('\n📈 Asset Class Distribution:');
  Object.entries(xetraETFStats.byAssetClass).forEach(([assetClass, count]) => {
    const percentage = ((count / xetraETFs.length) * 100).toFixed(1);
    console.log(`${assetClass}: ${count} (${percentage}%)`);
  });
  
  // Validate data quality
  console.log('\n✅ Data Quality Checks:');
  
  const etfsWithPrices = xetraETFs.filter(etf => etf.price !== undefined).length;
  const pricePercentage = ((etfsWithPrices / xetraETFs.length) * 100).toFixed(1);
  console.log(`ETFs with price data: ${etfsWithPrices}/${xetraETFs.length} (${pricePercentage}%)`);
  
  const uniqueSymbols = new Set(xetraETFs.map(etf => etf.symbol)).size;
  console.log(`Unique symbols: ${uniqueSymbols}/${xetraETFs.length} (${uniqueSymbols === xetraETFs.length ? '✅' : '❌'})`);
  
  const validAssetClasses = xetraETFs.filter(etf => 
    ['Equity', 'Fixed Income', 'Commodity', 'Mixed'].includes(etf.assetClass)
  ).length;
  console.log(`Valid asset classes: ${validAssetClasses}/${xetraETFs.length} (${validAssetClasses === xetraETFs.length ? '✅' : '❌'})`);
  
  console.log('\n🔍 Sample ETFs:');
  console.log('\nPopular German ETFs:');
  const popularDE = xetraETFs.filter(etf => 
    ['VWCE.DE', 'EUNL.DE', 'EXS1.DE', 'VUSA.DE', 'XEON.DE', 'EQQQ.DE'].includes(etf.symbol)
  );
  
  popularDE.forEach(etf => {
    console.log(`${etf.symbol}: ${etf.name} (${etf.issuer})`);
  });
  
  console.log('\n🌟 Most Common Categories:');
  const categories = xetraETFs.reduce((acc, etf) => {
    acc[etf.category] = (acc[etf.category] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });
  
  const sortedCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  sortedCategories.forEach(([category, count], index) => {
    console.log(`${index + 1}. ${category}: ${count} ETFs`);
  });
  
  console.log('\n🎯 Integration Ready!');
  console.log('The extracted XETRA ETF data is ready to be integrated into your ETF screener.');
  console.log('You can import it using: import { xetraETFs } from "./src/data/xetraETFsComplete";');
  
  return {
    totalETFs: xetraETFs.length,
    withPrices: etfsWithPrices,
    uniqueSymbols: uniqueSymbols === xetraETFs.length,
    topIssuers: sortedIssuers,
    assetClassDistribution: xetraETFStats.byAssetClass
  };
}

// Run validation
validateXetraETFs();