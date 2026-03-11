import { xetraETFs } from '../src/data/xetraETFsComplete';

function validateXetraETFs() {
  console.log('🔍 XETRA ETF Data Validation Report');
  console.log('=====================================');

  console.log(`\n📊 Total ETFs: ${xetraETFs.length}`);

  // Issuer-Verteilung berechnen
  const byIssuer: Record<string, number> = {}
  const byAssetClass: Record<string, number> = {}
  xetraETFs.forEach(etf => {
    byIssuer[etf.issuer] = (byIssuer[etf.issuer] || 0) + 1
    byAssetClass[etf.assetClass] = (byAssetClass[etf.assetClass] || 0) + 1
  })

  console.log('\n🏢 Top 10 Issuers:');
  const sortedIssuers = Object.entries(byIssuer)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  sortedIssuers.forEach(([issuer, count], index) => {
    console.log(`${index + 1}. ${issuer}: ${count} ETFs`);
  });

  console.log('\n📈 Asset Class Distribution:');
  Object.entries(byAssetClass).forEach(([assetClass, count]) => {
    const percentage = ((count / xetraETFs.length) * 100).toFixed(1);
    console.log(`${assetClass}: ${count} (${percentage}%)`);
  });

  // Validate data quality
  console.log('\n✅ Data Quality Checks:');

  const etfsWithPrices = xetraETFs.filter(etf => etf.price !== undefined).length;
  const pricePercentage = ((etfsWithPrices / xetraETFs.length) * 100).toFixed(1);
  console.log(`ETFs with price data: ${etfsWithPrices}/${xetraETFs.length} (${pricePercentage}%)`);

  const etfsWithTER = xetraETFs.filter(etf => etf.ter !== undefined).length;
  const terPercentage = ((etfsWithTER / xetraETFs.length) * 100).toFixed(1);
  console.log(`ETFs with TER data: ${etfsWithTER}/${xetraETFs.length} (${terPercentage}%)`);

  const etfsWithISIN = xetraETFs.filter(etf => etf.isin !== undefined).length;
  const isinPercentage = ((etfsWithISIN / xetraETFs.length) * 100).toFixed(1);
  console.log(`ETFs with ISIN data: ${etfsWithISIN}/${xetraETFs.length} (${isinPercentage}%)`);

  const uniqueSymbols = new Set(xetraETFs.map(etf => etf.symbol)).size;
  console.log(`Unique symbols: ${uniqueSymbols}/${xetraETFs.length} (${uniqueSymbols === xetraETFs.length ? '✅' : '❌'})`);

  console.log('\n🌟 Top 10 Categories:');
  const categories = xetraETFs.reduce((acc, etf) => {
    acc[etf.category] = (acc[etf.category] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([category, count], index) => {
      console.log(`${index + 1}. ${category}: ${count} ETFs`);
    });

  console.log('\n🔍 Sample Popular ETFs:');
  ['VWCE.DE', 'EUNL.DE', 'EXS1.DE', 'VUSA.DE', 'XDWT.DE'].forEach(sym => {
    const etf = xetraETFs.find(e => e.symbol === sym)
    if (etf) {
      console.log(`  ${etf.symbol}: ${etf.name} (${etf.issuer}, TER: ${etf.ter ?? 'N/A'}, ISIN: ${etf.isin ?? 'N/A'})`)
    }
  })

  console.log('\n🎯 Integration Ready!');
}

// Run validation
validateXetraETFs();
