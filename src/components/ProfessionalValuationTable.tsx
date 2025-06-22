import React, { useState, useEffect } from 'react';
import { LockClosedIcon, CalculatorIcon } from '@heroicons/react/24/outline';

interface ValuationData {
  // P/E Ratios (vereinfacht)
  peRatioTTM: number;
  forwardPE: number;
  pegRatioTTM: number;
  
  // Andere Ratios
  priceToBookRatioTTM: number;
  priceSalesRatioTTM: number;
  priceToCashFlowRatio: number;        // Operating Cash Flow
  priceToFreeCashFlowsRatio: number;   // Free Cash Flow
  dividendYieldTTM: number;
  
  // EV Ratios (berechnet)
  evToSales: number;
  evToEbitda: number;
  evToEbit: number;
  
  // Historical 5Y Averages
  pe5YAvg: number;
  peg5YAvg: number;
  pb5YAvg: number;
  ps5YAvg: number;
  pcf5YAvg: number;
  fcf5YAvg: number;
  evSales5YAvg: number;
  evEbitda5YAvg: number;
  divYield5YAvg: number;
}

interface Props {
  ticker: string;
  isPremium?: boolean;
}

const ProfessionalValuationTable: React.FC<Props> = ({ ticker, isPremium = false }) => {
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadValuationData();
  }, [ticker]);

  const loadValuationData = async () => {
    setLoading(true);
    setError(null);
    
    // ✅ ALLE Variablen einmal ganz am Anfang definieren
    let currentPrice = 0;
    let freeCashFlowPerShare = 0;
    let operatingCashFlowPerShare = 0;
    let forwardPE = 0;
    let evToSales = 0;
    let evToEbitda = 0;
    let evToEbit = 0;
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY;
      console.log(`🔍 Loading valuation data for ${ticker}...`);
      
      // 1. ✅ Company Outlook für aktuelle Ratios
      const outlookResponse = await fetch(
        `https://financialmodelingprep.com/api/v4/company-outlook?symbol=${ticker}&apikey=${apiKey}`
      );
      
      if (!outlookResponse.ok) {
        throw new Error(`Company Outlook API failed: ${outlookResponse.status}`);
      }
      
      const outlookData = await outlookResponse.json();
      console.log('📊 Company Outlook Data:', outlookData);
      
      const currentRatios = outlookData.ratios?.[0] || {};

      // 2. ✅ Key Metrics TTM + Profile für zusätzliche Ratios
      const [keyMetricsResponse, profileResponse] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${ticker}?apikey=${apiKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`)
      ]);
      
      let keyMetrics = {};
      let profileData = {};
      
      if (keyMetricsResponse.ok) {
        const keyMetricsData = await keyMetricsResponse.json();
        keyMetrics = Array.isArray(keyMetricsData) ? keyMetricsData[0] || {} : {};
        console.log('📈 Key Metrics TTM:', keyMetrics);
        console.log('📈 Available KeyMetrics fields:', Object.keys(keyMetrics));
      }
      
      if (profileResponse.ok) {
        const profileArray = await profileResponse.json();
        profileData = Array.isArray(profileArray) ? profileArray[0] || {} : {};
        console.log('🏢 Profile Data:', profileData);
        console.log('🏢 Available Profile fields:', Object.keys(profileData));
      }

      // 3. ✅ Aktuelle Kursdaten
      const quoteResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${apiKey}`
      );
      
      if (quoteResponse.ok) {
        const [quote] = await quoteResponse.json();
        currentPrice = quote.price;
        console.log(`💰 Current Price: $${currentPrice}`);
      }

      // 4. ✅ Cash Flow Statement
      const cashFlowResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=annual&limit=1&apikey=${apiKey}`
      );
      
      if (cashFlowResponse.ok) {
        const [cashFlow] = await cashFlowResponse.json();
        console.log('💰 Cash Flow Statement:', cashFlow);
        console.log('💰 Available Cash Flow fields:', Object.keys(cashFlow));
        
        // ✅ Mehrere Feldnamen für Cash Flows versuchen
        const freeCashFlow = cashFlow.freeCashFlow || cashFlow.netCashProvidedByOperatingActivities - (cashFlow.capitalExpenditure || 0);
        const operatingCashFlow = cashFlow.operatingCashFlow || 
                                  cashFlow.netCashProvidedByOperatingActivities || 
                                  cashFlow.cashFlowFromOperations ||
                                  cashFlow.operatingCashflow;
        
        // ✅ Mehrere Feldnamen für Shares versuchen
        const sharesOutstanding = cashFlow.weightedAverageShsOut || 
                                  cashFlow.shareIssued || 
                                  cashFlow.weightedAverageSharesOutstanding ||
                                  cashFlow.commonStockSharesOutstanding;
        
        console.log(`🔍 Cash Flow Debug:`, {
          freeCashFlow,
          operatingCashFlow,
          sharesOutstanding,
          capitalExpenditure: cashFlow.capitalExpenditure
        });
        
        if (sharesOutstanding && sharesOutstanding > 0) {
          if (freeCashFlow) {
            freeCashFlowPerShare = Math.abs(freeCashFlow) / sharesOutstanding;
            console.log(`📊 Free FCF per Share: ${freeCashFlowPerShare.toFixed(2)} (FCF: ${freeCashFlow/1e9}B)`);
          }
          
          if (operatingCashFlow) {
            operatingCashFlowPerShare = Math.abs(operatingCashFlow) / sharesOutstanding;
            console.log(`📊 Operating CF per Share: ${operatingCashFlowPerShare.toFixed(2)} (OpCF: ${operatingCashFlow/1e9}B)`);
          } else {
            console.warn('❌ No operating cash flow found in:', Object.keys(cashFlow));
          }
        } else {
          console.warn('❌ No shares outstanding found. Available fields:', Object.keys(cashFlow));
        }
      } else {
        console.warn('❌ Cash Flow API failed:', cashFlowResponse.status);
      }

      // 5. ✅ Enterprise Value + Financial Data
      const [evResponse, incomeResponse] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/enterprise-values/${ticker}?period=quarter&limit=1&apikey=${apiKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/income-statement/${ticker}?period=annual&limit=1&apikey=${apiKey}`)
      ]);

      if (evResponse.ok && incomeResponse.ok) {
        const [evData] = await evResponse.json();
        const [incomeData] = await incomeResponse.json();
        
        console.log('🏢 Enterprise Value:', evData);
        console.log('💰 Income Statement:', incomeData);
        
        if (evData && incomeData) {
          const enterpriseValue = evData.enterpriseValue;
          const revenue = incomeData.revenue;
          const ebitda = incomeData.ebitda;
          const operatingIncome = incomeData.operatingIncome;
          
          if (enterpriseValue && revenue) {
            evToSales = enterpriseValue / revenue;
            console.log(`📊 EV/Sales: ${evToSales.toFixed(2)} (EV: ${enterpriseValue/1e9}B, Revenue: ${revenue/1e9}B)`);
          }
          
          if (enterpriseValue && ebitda && ebitda > 0) {
            evToEbitda = enterpriseValue / ebitda;
            console.log(`📊 EV/EBITDA: ${evToEbitda.toFixed(2)} (EV: ${enterpriseValue/1e9}B, EBITDA: ${ebitda/1e9}B)`);
          }
          
          if (enterpriseValue && operatingIncome && operatingIncome > 0) {
            evToEbit = enterpriseValue / operatingIncome;
            console.log(`📊 EV/EBIT: ${evToEbit.toFixed(2)} (EV: ${enterpriseValue/1e9}B, OpIncome: ${operatingIncome/1e9}B)`);
          }
        }
      }

      // 6. ✅ Historical Ratios
      const historicalResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=annual&limit=5&apikey=${apiKey}`
      );
      
      const historicalRatios = historicalResponse.ok ? await historicalResponse.json() : [];
      console.log('📜 Historical Ratios (5Y):', historicalRatios);

      // 7. ✅ Hilfsfunktionen ZUERST definieren
      const calculate5YearAvg = (field: string): number => {
        if (!Array.isArray(historicalRatios) || historicalRatios.length === 0) return 0;
        
        const validValues = historicalRatios
          .map(item => item[field])
          .filter(val => val != null && !isNaN(val) && val > 0);
          
        if (validValues.length === 0) return 0;
        
        const avg = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        console.log(`📊 ${field} 5Y Avg: ${avg.toFixed(2)} (${validValues.length} values)`);
        return avg;
      };

      const getValue = (sources: any[], possibleFields: string[]): number => {
        for (const source of sources) {
          if (!source) continue;
          for (const field of possibleFields) {
            if (source[field] != null && !isNaN(source[field]) && source[field] !== 0) {
              console.log(`✅ Found ${field}: ${source[field]} in source`);
              return source[field];
            }
          }
        }
        console.warn(`❌ No value found for fields: ${possibleFields.join(', ')}`);
        return 0;
      };

      // 8. ✅ Forward P/E + PEG Berechnung (NACH getValue Definition)
      let calculatedPEG = 0;
      
      try {
        const estimatesResponse = await fetch(
          `https://financialmodelingprep.com/api/v3/analyst-estimates/${ticker}?apikey=${apiKey}`
        );
        
        if (estimatesResponse.ok) {
          const estimates = await estimatesResponse.json();
          console.log('📊 Analyst Estimates:', estimates);
          
          const currentYear = new Date().getFullYear();
          const nextYearEst = estimates.find((e: any) => 
            parseInt(e.date.slice(0, 4), 10) === currentYear + 1
          );
          const currentYearEst = estimates.find((e: any) => 
            parseInt(e.date.slice(0, 4), 10) === currentYear
          );
          
          if (nextYearEst && nextYearEst.estimatedEpsAvg > 0 && currentPrice > 0) {
            forwardPE = currentPrice / nextYearEst.estimatedEpsAvg;
            console.log(`💰 Forward P/E: ${forwardPE.toFixed(2)} (Price: ${currentPrice}, Est EPS: ${nextYearEst.estimatedEpsAvg})`);
          }
          
          // ✅ PEG manuell berechnen
          if (currentYearEst && nextYearEst && currentYearEst.estimatedEpsAvg > 0) {
            const currentEPS = currentYearEst.estimatedEpsAvg;
            const nextEPS = nextYearEst.estimatedEpsAvg;
            const growthRate = ((nextEPS - currentEPS) / currentEPS) * 100;
            
            // P/E ratio holen
            const peRatio = getValue([currentRatios, keyMetrics, profileData], [
              'priceEarningsRatio', 'peRatioTTM', 'pe'
            ]);
            
            if (peRatio > 0 && growthRate > 0) {
              calculatedPEG = peRatio / growthRate;
              console.log(`📊 PEG berechnet: ${calculatedPEG.toFixed(2)} (P/E: ${peRatio}, Growth: ${growthRate.toFixed(1)}%)`);
            }
          }
        }
      } catch (err) {
        console.warn('Forward P/E calculation failed:', err);
      }

      // 9. ✅ Price/Cash Flow Ratios berechnen (verbessert)
      let priceToCashFlow = 0;   // Operating Cash Flow
      let priceToFCF = 0;        // Free Cash Flow
      
      console.log(`🔍 Price/CF Calculation Debug:`);
      console.log(`- Current Price: ${currentPrice}`);
      console.log(`- Operating CF per Share: ${operatingCashFlowPerShare}`);
      console.log(`- Free CF per Share: ${freeCashFlowPerShare}`);
      
      // Price/Operating Cash Flow
      if (currentPrice > 0 && operatingCashFlowPerShare > 0) {
        priceToCashFlow = currentPrice / operatingCashFlowPerShare;
        console.log(`📊 Price/Cash Flow: ${priceToCashFlow.toFixed(2)} ✅`);
      } else {
        console.log(`❌ Cannot calculate Price/Cash Flow: Price=${currentPrice}, OpCF/Share=${operatingCashFlowPerShare}`);
      }
      
      // Price/Free Cash Flow
      if (currentPrice > 0 && freeCashFlowPerShare > 0) {
        priceToFCF = currentPrice / freeCashFlowPerShare;
        console.log(`📊 Price/FCF: ${priceToFCF.toFixed(2)} ✅`);
      } else {
        console.log(`❌ Cannot calculate Price/FCF: Price=${currentPrice}, FCF/Share=${freeCashFlowPerShare}`);
        
        // ✅ ERWEITERTE FALLBACKS für Free Cash Flow
        console.log('🔄 Trying FCF fallbacks...');
        
        // Fallback 1: Direkt aus FMP Ratios
        const fmpFCFRatio = getValue([currentRatios, keyMetrics], [
          'priceToFreeCashFlowsRatio', 'priceToFreeCashFlowsRatioTTM', 'pfcfRatio', 'priceToFCF'
        ]);
        
        if (fmpFCFRatio > 0) {
          priceToFCF = fmpFCFRatio;
          console.log(`📊 Price/FCF (from FMP): ${priceToFCF.toFixed(2)} ✅`);
        }
        
        // Fallback 2: Manual calculation from profile/metrics
        if (priceToFCF === 0) {
          const marketCap = getValue([profileData, keyMetrics], ['mktCap', 'marketCap', 'marketCapitalization']);
          const fcfTotal = getValue([keyMetrics], ['freeCashFlowTTM', 'freeCashFlow']);
          
          if (marketCap > 0 && fcfTotal > 0) {
            priceToFCF = marketCap / fcfTotal;
            console.log(`📊 Price/FCF (MarketCap/FCF): ${priceToFCF.toFixed(2)} ✅`);
          }
        }
      }
      
      // Operating Cash Flow Fallbacks
      if (priceToCashFlow === 0) {
        console.log('🔄 Trying Operating CF fallbacks...');
        
        const fmpCFRatio = getValue([currentRatios, keyMetrics], [
          'priceCashFlowRatio', 'priceToOperatingCashFlowsRatio', 'pcfRatio'
        ]);
        
        if (fmpCFRatio > 0) {
          priceToCashFlow = fmpCFRatio;
          console.log(`📊 Price/Cash Flow (from FMP): ${priceToCashFlow.toFixed(2)} ✅`);
        }
        
        // Noch ein Fallback: Manual aus Key Metrics
        if (priceToCashFlow === 0) {
          const operatingCashFlowTTM = getValue([keyMetrics], [
            'operatingCashFlowTTM', 'operatingCashFlow', 'cashFlowFromOperations'
          ]);
          const sharesOutstandingTTM = getValue([keyMetrics], [
            'sharesOutstandingTTM', 'sharesOutstanding', 'weightedAverageShsOut'
          ]);
          
          if (operatingCashFlowTTM > 0 && sharesOutstandingTTM > 0 && currentPrice > 0) {
            const opCFPerShare = operatingCashFlowTTM / sharesOutstandingTTM;
            priceToCashFlow = currentPrice / opCFPerShare;
            console.log(`📊 Price/CF (from Key Metrics): ${priceToCashFlow.toFixed(2)} ✅`);
          }
        }
      }

      const valuationData: ValuationData = {
        // P/E Ratios
        peRatioTTM: getValue([currentRatios, keyMetrics, profileData], [
          'priceEarningsRatio', 'peRatioTTM', 'pe'
        ]),
        
        forwardPE,
        
        pegRatioTTM: calculatedPEG > 0 ? calculatedPEG : getValue([currentRatios, keyMetrics], [
          'priceEarningsToGrowthRatio', 'pegRatioTTM', 'peg'
        ]),
        
        // Andere Ratios
        priceToBookRatioTTM: getValue([currentRatios, keyMetrics], [
          'priceToBookRatio', 'priceToBookRatioTTM', 'pb', 'pbRatio'
        ]),
        
        priceSalesRatioTTM: getValue([currentRatios, keyMetrics], [
          'priceToSalesRatio', 'priceSalesRatioTTM', 'ps', 'psRatio'
        ]),
        
        // Cash Flow Ratios
        priceToCashFlowRatio: priceToCashFlow,
        priceToFreeCashFlowsRatio: priceToFCF,
        
        dividendYieldTTM: getValue([profileData, currentRatios, keyMetrics], [
          'dividendYield', 'dividendYieldTTM', 'dividendYieldPercentage', 'lastDivYield'
        ]),
        
        // EV Ratios
        evToSales,
        evToEbitda,
        evToEbit,
        
        // 5Y Averages
        pe5YAvg: calculate5YearAvg('priceEarningsRatio'),
        peg5YAvg: calculate5YearAvg('priceEarningsToGrowthRatio'),
        pb5YAvg: calculate5YearAvg('priceToBookRatio'),
        ps5YAvg: calculate5YearAvg('priceToSalesRatio'),
        pcf5YAvg: calculate5YearAvg('priceCashFlowRatio'),
        fcf5YAvg: calculate5YearAvg('priceToFreeCashFlowsRatio'),
        evSales5YAvg: calculate5YearAvg('enterpriseValueToRevenue') || evToSales,
        evEbitda5YAvg: calculate5YearAvg('enterpriseValueOverEBITDA') || evToEbitda,
        divYield5YAvg: calculate5YearAvg('dividendYieldTTM') || calculate5YearAvg('dividendYield'),
      };

      console.log('✅ Final Valuation Data:', valuationData);
      setData(valuationData);
      
    } catch (err) {
      console.error('❌ Error loading valuation data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatRatio = (value: number): string => {
    if (value === 0 || !value || isNaN(value)) return '-';
    return value.toFixed(2);
  };

  const formatPercent = (value: number): string => {
    if (value === 0 || !value || isNaN(value)) return '-';
    
    // Wenn Wert bereits in Prozent (>1), direkt nutzen
    if (value > 1) {
      return `${value.toFixed(2)}%`;
    }
    
    // Wenn Wert als Dezimal (<1), in Prozent umwandeln
    return `${(value * 100).toFixed(2)}%`;
  };

  const calculateDifference = (current: number, comparison: number): string => {
    if (!current || !comparison || isNaN(current) || isNaN(comparison)) return '-';
    const diff = ((current - comparison) / comparison) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
  };

  const getDifferenceColor = (current: number, comparison: number): string => {
    if (!current || !comparison || isNaN(current) || isNaN(comparison)) return 'text-theme-muted';
    return current > comparison ? 'text-red-400' : 'text-green-400';
  };

  if (loading) {
    return (
      <div className="bg-theme-secondary border border-theme rounded-xl p-8">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <span className="text-theme-muted">Lade Bewertungsdaten...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-theme-secondary border border-theme rounded-xl p-8 text-center">
        <p className="text-red-400 mb-4">Fehler beim Laden der Bewertungsdaten: {error}</p>
        <button 
          onClick={loadValuationData}
          className="px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded-lg transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="bg-theme-secondary border border-theme rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-xl flex items-center justify-center">
          <LockClosedIcon className="w-8 h-8 text-yellow-400" />
        </div>
        <h3 className="text-xl font-semibold text-theme-primary mb-3">Premium Bewertungsanalyse</h3>
        <p className="text-theme-muted mb-6">Professionelle Bewertungsmetriken mit historischen Vergleichen</p>
        <button className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all">
          Premium freischalten
        </button>
      </div>
    );
  }

  if (!data) return null;

  // ✅ Deutsche Kennzahlen-Namen (vereinfacht)
  const valuationMetrics = [
    {
      label: 'KGV (TTM)',
      current: data.peRatioTTM,
      comparison: data.pe5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'KGV Erwartet (FWD)',
      current: data.forwardPE,
      comparison: data.pe5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'PEG (TTM)',
      current: data.pegRatioTTM,
      comparison: data.peg5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'EV/Umsatz (TTM)',
      current: data.evToSales,
      comparison: data.evSales5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'EV/EBITDA (TTM)',
      current: data.evToEbitda,
      comparison: data.evEbitda5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'EV/EBIT (TTM)',
      current: data.evToEbit,
      comparison: data.evEbitda5YAvg, // Approximation
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'KUV (TTM)',
      current: data.priceSalesRatioTTM,
      comparison: data.ps5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'KBV (TTM)',
      current: data.priceToBookRatioTTM,
      comparison: data.pb5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'Kurs/Cashflow (TTM)',
      current: data.priceToCashFlowRatio,
      comparison: data.pcf5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'Kurs/Free Cashflow (TTM)',
      current: data.priceToFreeCashFlowsRatio,
      comparison: data.fcf5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatRatio
    },
    {
      label: 'Dividendenrendite (TTM)',
      current: data.dividendYieldTTM,
      comparison: data.divYield5YAvg,
      comparisonLabel: `${ticker} 5J Ø`,
      formatter: formatPercent
    }
  ];

  return (
    <div className="bg-theme-secondary border border-theme rounded-xl overflow-hidden">
      {/* ✅ REDESIGNED Header */}
      <div className="p-6 border-b border-theme">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <CalculatorIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-theme-primary">Bewertung & Kennzahlen</h3>
            <p className="text-theme-muted text-sm">{ticker} Bewertungsanalyse</p>
          </div>
        </div>
      </div>

      {/* ✅ REDESIGNED Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-theme-tertiary/50">
            <tr>
              <th className="text-left py-3 px-6 text-theme-muted font-medium text-sm">Kennzahl</th>
              <th className="text-right py-3 px-6 text-theme-muted font-medium text-sm">{ticker}</th>
              <th className="text-right py-3 px-6 text-theme-muted font-medium text-sm">Vergleichswert</th>
              <th className="text-right py-3 px-6 text-theme-muted font-medium text-sm">% Differenz</th>
            </tr>
          </thead>
          <tbody>
            {valuationMetrics.map((metric, index) => (
              <tr 
                key={index}
                className={`hover:bg-theme-tertiary/30 transition-colors ${
                  index !== valuationMetrics.length - 1 ? 'border-b border-theme/50' : ''
                }`}
              >
                <td className="py-3 px-6 text-theme-primary font-medium text-sm">
                  {metric.label}
                </td>
                <td className="py-3 px-6 text-right text-theme-primary font-medium text-sm">
                  {metric.formatter(metric.current)}
                </td>
                <td className="py-3 px-6 text-right text-theme-muted text-sm">
                  {metric.formatter(metric.comparison)}
                </td>
                <td className={`py-3 px-6 text-right font-medium text-sm ${getDifferenceColor(metric.current, metric.comparison)}`}>
                  {calculateDifference(metric.current, metric.comparison)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ REDESIGNED Footer Note */}
      <div className="p-4 bg-theme-tertiary/30 text-xs text-theme-muted">
        <p>
          Alle Daten basieren auf den neuesten verfügbaren Finanzdaten von {ticker}. 
          TTM = Trailing Twelve Months, FWD = Forward (Analystenschätzungen).
          Vergleichswerte sind 5-Jahres-Durchschnitte der gleichen Kennzahl.
          KGV = Kurs-Gewinn-Verhältnis, KBV = Kurs-Buchwert-Verhältnis, KUV = Kurs-Umsatz-Verhältnis.
          Kurs/Cashflow basiert auf Operating Cash Flow, Kurs/Free Cashflow auf Free Cash Flow.
        </p>
      </div>
    </div>
  );
};

export default ProfessionalValuationTable;