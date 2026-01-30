
import { getEnhancedPortfolioData } from '../src/lib/superinvestorDataService';
import { stocks } from '../src/data/stocks';

// Mocking holdingsHistory for the script context if needed, 
// OR simpler: just import the service if it reads from JSON files directly.
// The service imports 'holdingsHistory' likely from a generated JSON file.
// We need to ensure we can run this typescript file with tsx.

async function debugBuffett() {
    console.log("Analyzing Buffett (berkshire-hathaway) data...");

    // Note: getEnhancedPortfolioData expects just the slug
    const data = getEnhancedPortfolioData('warren-buffett');
    // Wait, the slug might be 'berkshire-hathaway' or 'buffett'. 
    // In route.ts it was 'buffett'. Let's check what 'buffett' maps to.

    if (!data) {
        console.error("No data found for slug 'warren-buffett'. Trying 'buffett'...");
        const data2 = getEnhancedPortfolioData('buffett');
        if (!data2) {
            console.error("No data found for 'buffett' either.");
            return;
        }
        analyze(data2);
    } else {
        analyze(data);
    }
}

function analyze(data: any) {
    console.log(`Latest Quarter: ${data.latestQuarter?.quarter || 'Unknown'}`);
    console.log(`Previous Quarter: ${data.previousQuarter?.quarter || 'Unknown'}`);

    // Find BAC
    const bac = data.topHoldings.find((h: any) => h.ticker === 'BAC' || h.symbol === 'BAC');

    if (bac) {
        console.log("\nFound Bank of America (BAC):");
        console.log(JSON.stringify(bac, null, 2));
    } else {
        console.log("\nBAC not found in top holdings.");
    }
}

// We need to make sure the environment is set up for file reading if the service relies on it.
// Assuming getEnhancedPortfolioData reads from specific imported JSONs.
debugBuffett();
