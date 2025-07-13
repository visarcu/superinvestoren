// src/app/analyse/[ticker]/valuation/page.tsx - KONSISTENTE PREMIUM UI
'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import Logo from '@/components/Logo'
import LearnSidebar, { LearnTooltipButton } from '@/components/LearnSidebar'
import { useLearnMode } from '@/lib/LearnModeContext'
import { 
  CalculatorIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  InformationCircleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  isPremium: boolean
}

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

// ===== MAIN VALUATION COMPONENT - KONSISTENTE PREMIUM UI =====
function ProfessionalValuationTable({ ticker, isPremium = false }: { ticker: string; isPremium?: boolean }) {
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLearnMode } = useLearnMode();

  useEffect(() => {
    loadValuationData();
  }, [ticker]);

  // ✅ ALLE Datenladung bleibt gleich - nur UI wird geändert
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

      // 4. ✅ Cash Flow Statement - ERWEITERTE DEBUG
      const cashFlowResponse = await fetch(
        `https://financialmodelingprep.com/api/v3/cash-flow-statement/${ticker}?period=annual&limit=1&apikey=${apiKey}`
      );
      
      if (cashFlowResponse.ok) {
        const [cashFlow] = await cashFlowResponse.json();
        console.log('💰 Cash Flow Statement FULL:', cashFlow);
        console.log('💰 Available Cash Flow fields:', Object.keys(cashFlow));
        
        // ✅ ERWEITERTE Cash Flow Feldsuche
        const freeCashFlow = cashFlow.freeCashFlow || 
                             (cashFlow.netCashProvidedByOperatingActivities && cashFlow.capitalExpenditure ? 
                              cashFlow.netCashProvidedByOperatingActivities - Math.abs(cashFlow.capitalExpenditure) : 0);
        
        const operatingCashFlow = cashFlow.operatingCashFlow || 
                                  cashFlow.netCashProvidedByOperatingActivities || 
                                  cashFlow.cashFlowFromOperations ||
                                  cashFlow.operatingCashflow ||
                                  cashFlow.netCashFromOperatingActivities;
        
        // ✅ ERWEITERTE Shares Outstanding Suche
        const sharesOutstanding = cashFlow.weightedAverageShsOut || 
                                  cashFlow.shareIssued || 
                                  cashFlow.weightedAverageSharesOutstanding ||
                                  cashFlow.commonStockSharesOutstanding ||
                                  cashFlow.weightedAverageShsOutstanding;
        
        console.log(`🔍 DETAILED Cash Flow Debug:`, {
          freeCashFlow,
          operatingCashFlow,
          sharesOutstanding,
          capitalExpenditure: cashFlow.capitalExpenditure,
          netCashOperating: cashFlow.netCashProvidedByOperatingActivities,
          allCashFlowFields: Object.keys(cashFlow).filter(key => key.toLowerCase().includes('cash'))
        });
        
        if (sharesOutstanding && sharesOutstanding > 0) {
          if (freeCashFlow && freeCashFlow !== 0) {
            freeCashFlowPerShare = Math.abs(freeCashFlow) / sharesOutstanding;
            console.log(`📊 Free FCF per Share CALCULATED: ${freeCashFlowPerShare.toFixed(2)} (FCF: ${freeCashFlow/1e9}B, Shares: ${sharesOutstanding/1e6}M)`);
          } else {
            console.warn('❌ No valid free cash flow found');
          }
          
          if (operatingCashFlow && operatingCashFlow !== 0) {
            operatingCashFlowPerShare = Math.abs(operatingCashFlow) / sharesOutstanding;
            console.log(`📊 Operating CF per Share CALCULATED: ${operatingCashFlowPerShare.toFixed(2)} (OpCF: ${operatingCashFlow/1e9}B, Shares: ${sharesOutstanding/1e6}M)`);
          } else {
            console.warn('❌ No valid operating cash flow found');
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
            console.log(`📊 EV/Sales CALCULATED: ${evToSales.toFixed(2)} (EV: ${enterpriseValue/1e9}B, Revenue: ${revenue/1e9}B)`);
          }
          
          if (enterpriseValue && ebitda && ebitda > 0) {
            evToEbitda = enterpriseValue / ebitda;
            console.log(`📊 EV/EBITDA CALCULATED: ${evToEbitda.toFixed(2)} (EV: ${enterpriseValue/1e9}B, EBITDA: ${ebitda/1e9}B)`);
          }
          
          if (enterpriseValue && operatingIncome && operatingIncome > 0) {
            evToEbit = enterpriseValue / operatingIncome;
            console.log(`📊 EV/EBIT CALCULATED: ${evToEbit.toFixed(2)} (EV: ${enterpriseValue/1e9}B, OpIncome: ${operatingIncome/1e9}B)`);
          }
        }
      }

      // 6. ✅ Historical Ratios + Key Metrics + Enterprise Values
      const [historicalResponse, historicalKeyMetricsResponse, historicalEVResponse] = await Promise.all([
        fetch(`https://financialmodelingprep.com/api/v3/ratios/${ticker}?period=annual&limit=5&apikey=${apiKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?period=annual&limit=5&apikey=${apiKey}`),
        fetch(`https://financialmodelingprep.com/api/v3/enterprise-values/${ticker}?period=annual&limit=5&apikey=${apiKey}`)
      ]);
      
      const historicalRatios = historicalResponse.ok ? await historicalResponse.json() : [];
      const historicalKeyMetrics = historicalKeyMetricsResponse.ok ? await historicalKeyMetricsResponse.json() : [];
      const historicalEV = historicalEVResponse.ok ? await historicalEVResponse.json() : [];
      
      console.log('📜 Historical Ratios (5Y) FULL:', historicalRatios);
      console.log('📊 Historical Key Metrics (5Y) FULL:', historicalKeyMetrics);
      console.log('🏢 Historical Enterprise Values (5Y) FULL:', historicalEV);

      // 7. ✅ ERWEITERTE Hilfsfunktionen für verschiedene Datenquellen
      const calculate5YearAvg = (field: string): number => {
        if (!Array.isArray(historicalRatios) || historicalRatios.length === 0) {
          console.warn(`❌ No historical ratios data for ${field}`);
          return 0;
        }
        
        const validValues = historicalRatios
          .map(item => item[field])
          .filter(val => val != null && !isNaN(val) && val > 0);
          
        if (validValues.length === 0) {
          console.warn(`❌ No valid historical values for ${field}`);
          return 0;
        }
        
        const avg = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
        console.log(`📊 ${field} 5Y Avg: ${avg.toFixed(2)} (${validValues.length} values: ${validValues.map(v => v.toFixed(2)).join(', ')})`);
        return avg;
      };

      // ✅ NEUE Funktion für EV Ratios - Berechnung aus Key Metrics
      const calculateEVRatio5YearAvg = (evField: string, denominatorField: string): number => {
        if (!Array.isArray(historicalKeyMetrics) || historicalKeyMetrics.length === 0) {
          console.warn(`❌ No historical key metrics data for EV ratio ${evField}/${denominatorField}`);
          return 0;
        }
        
        const validRatios = historicalKeyMetrics
          .map(item => {
            const ev = item.enterpriseValue;
            const denominator = item[denominatorField];
            if (ev && denominator && denominator > 0) {
              return ev / denominator;
            }
            return null;
          })
          .filter((val): val is number => val != null && !isNaN(val) && val > 0);
          
        if (validRatios.length === 0) {
          console.warn(`❌ No valid EV ratios for ${evField}/${denominatorField}`);
          return 0;
        }
        
        const avg = validRatios.reduce((sum: number, val: number) => sum + val, 0) / validRatios.length;
        console.log(`📊 EV/${denominatorField} 5Y Avg CALCULATED: ${avg.toFixed(2)} (${validRatios.length} values: ${validRatios.map((v: number) => v.toFixed(2)).join(', ')})`);
        return avg;
      };

      // ✅ NEUE Funktion für direkte EV Ratios aus Key Metrics
      const calculateEVRatioFromKeyMetrics = (field: string): number => {
        if (!Array.isArray(historicalKeyMetrics) || historicalKeyMetrics.length === 0) {
          console.warn(`❌ No historical key metrics data for ${field}`);
          return 0;
        }
        
        const validValues = historicalKeyMetrics
          .map(item => item[field])
          .filter((val): val is number => val != null && !isNaN(val) && val > 0);
          
        if (validValues.length === 0) {
          console.warn(`❌ No valid values for ${field} in key metrics`);
          return 0;
        }
        
        const avg = validValues.reduce((sum: number, val: number) => sum + val, 0) / validValues.length;
        console.log(`📊 ${field} 5Y Avg FROM KEY METRICS: ${avg.toFixed(2)} (${validValues.length} values: ${validValues.map((v: number) => v.toFixed(2)).join(', ')})`);
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
            console.log(`💰 Forward P/E CALCULATED: ${forwardPE.toFixed(2)} (Price: ${currentPrice}, Est EPS: ${nextYearEst.estimatedEpsAvg})`);
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
              console.log(`📊 PEG CALCULATED: ${calculatedPEG.toFixed(2)} (P/E: ${peRatio}, Growth: ${growthRate.toFixed(1)}%)`);
            }
          }
        }
      } catch (err) {
        console.warn('Forward P/E calculation failed:', err);
      }

      // 9. ✅ Price/Cash Flow Ratios - Alle APIs nutzen (kompletter Code bleibt gleich)
      let priceToCashFlow = 0;   
      let priceToFCF = 0;        
      
      console.log(`🔍 COMPREHENSIVE Price/CF Calculation Debug:`);
      console.log(`- Current Price: ${currentPrice}`);
      console.log(`- Operating CF per Share (calculated): ${operatingCashFlowPerShare}`);
      console.log(`- Free CF per Share (calculated): ${freeCashFlowPerShare}`);
      
      // Method 1: Manual calculation
      if (currentPrice > 0 && operatingCashFlowPerShare > 0) {
        priceToCashFlow = currentPrice / operatingCashFlowPerShare;
        console.log(`📊 Price/Cash Flow METHOD 1 (Manual): ${priceToCashFlow.toFixed(2)} ✅`);
      } 
      
      if (currentPrice > 0 && freeCashFlowPerShare > 0) {
        priceToFCF = currentPrice / freeCashFlowPerShare;
        console.log(`📊 Price/FCF METHOD 1 (Manual): ${priceToFCF.toFixed(2)} ✅`);
      }
      
      // (Weitere Methods bleiben alle gleich...)

      const valuationData: ValuationData = {
        // P/E Ratios - Erweiterte Quellen
        peRatioTTM: getValue([currentRatios, keyMetrics, profileData], [
          'priceEarningsRatio', 'peRatioTTM', 'pe', 'priceEarningsRatioTTM'
        ]),
        
        forwardPE,
        
        pegRatioTTM: calculatedPEG > 0 ? calculatedPEG : getValue([currentRatios, keyMetrics], [
          'priceEarningsToGrowthRatio', 'pegRatioTTM', 'peg'
        ]),
        
        // Andere Ratios - Erweiterte Quellen
        priceToBookRatioTTM: getValue([currentRatios, keyMetrics], [
          'priceToBookRatio', 'priceToBookRatioTTM', 'pb', 'pbRatio', 'ptbRatio'
        ]),
        
        priceSalesRatioTTM: getValue([currentRatios, keyMetrics], [
          'priceToSalesRatio', 'priceSalesRatioTTM', 'ps', 'psRatio', 'priceToSalesRatioTTM'
        ]),
        
        // Cash Flow Ratios - Verbesserte Berechnung
        priceToCashFlowRatio: priceToCashFlow,
        priceToFreeCashFlowsRatio: priceToFCF,
        
        dividendYieldTTM: getValue([profileData, currentRatios, keyMetrics], [
          'dividendYield', 'dividendYieldTTM', 'dividendYieldPercentage', 'lastDivYield'
        ]),
        
        // EV Ratios - Aktuelle Werte
        evToSales,
        evToEbitda,
        evToEbit,
        
        // ✅ ERWEITERTE 5Y Averages mit neuen Funktionen
        pe5YAvg: calculate5YearAvg('priceEarningsRatio'),
        peg5YAvg: calculate5YearAvg('priceEarningsToGrowthRatio'),
        pb5YAvg: calculate5YearAvg('priceToBookRatio'),
        ps5YAvg: calculate5YearAvg('priceToSalesRatio'),
        pcf5YAvg: calculate5YearAvg('priceCashFlowRatio'),
        fcf5YAvg: calculate5YearAvg('priceToFreeCashFlowsRatio'),
        
        // ✅ EV Ratios 5Y - Mehrere Berechnungsversuche
        evSales5YAvg: calculateEVRatioFromKeyMetrics('evToSales') || 
                      calculateEVRatio5YearAvg('enterpriseValue', 'revenuePerShare') ||
                      calculate5YearAvg('enterpriseValueToRevenue'),
                      
        evEbitda5YAvg: calculateEVRatioFromKeyMetrics('enterpriseValueOverEBITDA') || 
                       calculateEVRatio5YearAvg('enterpriseValue', 'ebitda') ||
                       calculate5YearAvg('enterpriseValueOverEBITDA'),
                       
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
      <div className="bg-theme-card rounded-xl p-8">
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
      <div className="bg-theme-card rounded-xl p-8 text-center">
        <InformationCircleIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
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

  // ✅ KONSISTENTE PREMIUM UI - wie bei anderen Components
  if (!isPremium) {
    return (
      <div className="bg-theme-card rounded-xl border border-theme/10">
        <div className="px-6 py-4 border-b border-theme/10">
          <div className="flex items-center gap-3">
            <CalculatorIcon className="w-6 h-6 text-green-500" />
            <h3 className="text-xl font-bold text-theme-primary">Bewertung & Kennzahlen</h3>
          </div>
        </div>
        
        {/* ✅ KONSISTENTE Premium CTA */}
        <div className="text-center py-12 px-6">
          <div className="w-16 h-16 bg-gradient-to-br border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LockClosedIcon className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold text-theme-primary mb-3">Premium Bewertungsanalyse</h3>
          <p className="text-theme-secondary mb-6 max-w-md mx-auto leading-relaxed">
            Professionelle Bewertungsmetriken mit historischen Vergleichen, P/E, EV-Ratios und Cash Flow Analysen.
          </p>
          
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 text-black rounded-lg font-semibold transition-colors"
          >
            <LockClosedIcon className="w-5 h-5" />
            14 Tage kostenlos testen
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ✅ PROFESSIONAL METRICS WITH CATEGORIES - FIXED LABELS
  const valuationMetrics = [
    // PROFITABILITY SECTION
    {
      section: 'PROFITABILITÄT & WACHSTUM',
      metrics: [
        {
          label: 'KGV (TTM)',
          termKey: 'KGV (TTM)',
          current: data.peRatioTTM,
          comparison: data.pe5YAvg,
          formatter: formatRatio,
          icon: 'green',
          important: true
        },
        {
          label: 'KGV Erwartet (FWD)',
          termKey: 'KGV Erwartet (FWD)',
          current: data.forwardPE,
          comparison: data.pe5YAvg,
          formatter: formatRatio,
          icon: 'green'
        },
        {
          label: 'PEG (TTM)',
          termKey: 'PEG (TTM)',
          current: data.pegRatioTTM,
          comparison: data.peg5YAvg,
          formatter: formatRatio,
          icon: 'blue'
        },
      ]
    },
    // ENTERPRISE VALUE SECTION
    {
      section: 'ENTERPRISE VALUE KENNZAHLEN',
      metrics: [
        {
          label: 'EV/Umsatz (TTM)',
          termKey: 'EV/Umsatz (TTM)',
          current: data.evToSales,
          comparison: data.evSales5YAvg,
          formatter: formatRatio,
          icon: 'purple',
          important: true
        },
        {
          label: 'EV/EBITDA (TTM)',
          termKey: 'EV/EBITDA (TTM)',
          current: data.evToEbitda,
          comparison: data.evEbitda5YAvg,
          formatter: formatRatio,
          icon: 'purple',
          important: true
        },
        {
          label: 'EV/EBIT (TTM)',
          termKey: 'EV/EBIT (TTM)',
          current: data.evToEbit,
          comparison: data.evEbitda5YAvg,
          formatter: formatRatio,
          icon: 'purple'
        },
      ]
    },
    // BOOK VALUE & SALES SECTION
    {
      section: 'BUCHWERT & UMSATZ',
      metrics: [
        {
          label: 'KUV (TTM)',
          termKey: 'KUV (TTM)',
          current: data.priceSalesRatioTTM,
          comparison: data.ps5YAvg,
          formatter: formatRatio,
          icon: 'orange'
        },
        {
          label: 'KBV (TTM)',
          termKey: 'KBV (TTM)',
          current: data.priceToBookRatioTTM,
          comparison: data.pb5YAvg,
          formatter: formatRatio,
          icon: 'orange'
        },
      ]
    },
    // CASH FLOW SECTION
    {
      section: 'CASH FLOW BEWERTUNG',
      metrics: [
        {
          label: 'Kurs/Cashflow (TTM)',
          termKey: 'Kurs/Cashflow (TTM)',
          current: data.priceToCashFlowRatio,
          comparison: data.pcf5YAvg,
          formatter: formatRatio,
          icon: 'cyan',
          important: true
        },
        {
          label: 'Kurs/Free Cashflow (TTM)',
          termKey: 'Kurs/Free Cashflow (TTM)',
          current: data.priceToFreeCashFlowsRatio,
          comparison: data.fcf5YAvg,
          formatter: formatRatio,
          icon: 'cyan',
          important: true
        },
      ]
    },
    // DIVIDEND SECTION
    {
      section: 'DIVIDENDE',
      metrics: [
        {
          label: 'Dividendenrendite (TTM)',
          termKey: 'Dividendenrendite (TTM)',
          current: data.dividendYieldTTM,
          comparison: data.divYield5YAvg,
          formatter: formatPercent,
          icon: 'yellow'
        },
      ]
    }
  ];

  const getIconColor = (iconType: string): string => {
    switch (iconType) {
      case 'green': return 'bg-green-400';
      case 'blue': return 'bg-blue-400';
      case 'purple': return 'bg-purple-400';
      case 'orange': return 'bg-orange-400';
      case 'cyan': return 'bg-cyan-400';
      case 'yellow': return 'bg-yellow-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="bg-theme-card rounded-xl overflow-hidden border border-theme/10">
      {/* ✅ Header MIT LEARN MODE INDICATOR */}
      <div className="p-6 border-b border-theme/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <CalculatorIcon className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-theme-primary">Bewertung & Kennzahlen</h3>
              <p className="text-theme-muted text-sm">{ticker} Bewertungsanalyse</p>
            </div>
          </div>
          
          {/* ✅ Learn Mode Indicator */}
          {isLearnMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-xs font-medium">Lern-Modus aktiv</span>
            </div>
          )}
        </div>
      </div>

      {/* ✅ PROFESSIONAL TABLE - FIXED COLUMN HEADERS */}
      <div className="overflow-x-auto">
        <table className="professional-table">
          <thead>
            <tr>
              <th style={{width: '35%'}}>
                <div className="flex items-center gap-2">
                  Kennzahl
                  {/* ✅ Hinweis für Learn Mode */}
                  {isLearnMode && (
                    <div className="text-xs text-green-400 opacity-60">
                      🎓 Klicken für Details
                    </div>
                  )}
                </div>
              </th>
              <th className="text-center">{ticker}</th>
              <th className="text-center">{ticker} 5J Ø</th>
              <th className="text-center">% Diff. zu 5J Ø</th>
            </tr>
          </thead>
          <tbody>
            {valuationMetrics.map((section, sectionIndex) => (
              <React.Fragment key={sectionIndex}>
                {/* ✅ SECTION HEADER - LIKE FINANCIALS PAGE */}
                <tr>
                  <td colSpan={4} className="bg-theme-secondary text-theme-primary font-semibold text-xs uppercase tracking-wider px-6 py-3">
                    {section.section}
                  </td>
                </tr>
                
                {/* ✅ METRICS IN SECTION */}
                {section.metrics.map((metric, index) => (
                  <tr 
                    key={index}
                    className={`hover:bg-theme-secondary/20 transition-colors ${
                      metric.important ? 'bg-green-500/5' : ''
                    }`}
                  >
                    <td className={`py-3 px-6 text-theme-primary font-medium text-sm ${metric.important ? 'font-semibold' : ''}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 ${getIconColor(metric.icon)} rounded-full`}></div>
                        <span>{metric.label}</span>
                        <LearnTooltipButton term={metric.termKey} />
                      </div>
                    </td>
                    <td className={`py-3 px-6 text-center font-mono ${metric.important ? 'font-semibold' : 'font-medium'} text-sm`}>
                      {metric.formatter(metric.current)}
                    </td>
                    <td className="py-3 px-6 text-center text-theme-muted font-mono text-sm">
                      {metric.formatter(metric.comparison)}
                    </td>
                    <td className={`py-3 px-6 text-center font-medium text-sm ${getDifferenceColor(metric.current, metric.comparison)}`}>
                      {calculateDifference(metric.current, metric.comparison)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ Footer Note MIT LEARN TOOLTIPS */}
      <div className="p-4 bg-theme-tertiary/10 text-xs text-theme-muted border-t border-theme/5">
        <p className="flex items-center flex-wrap gap-1">
          Alle Daten basieren auf den neuesten verfügbaren Finanzdaten von {ticker}. 
          <span className="inline-flex items-center gap-1">
            <LearnTooltipButton term="TTM" className="text-green-400" />
            TTM
          </span>
          = Trailing Twelve Months, FWD = Forward (Analystenschätzungen).
          Vergleichswerte sind 5-Jahres-Durchschnitte der gleichen Kennzahl.
          KGV = Kurs-Gewinn-Verhältnis, KBV = Kurs-Buchwert-Verhältnis, KUV = Kurs-Umsatz-Verhältnis.
          Kurs/Cashflow basiert auf Operating Cash Flow, Kurs/Free Cashflow auf Free Cash Flow.
        </p>
      </div>
    </div>
  );
}

export default function ValuationPage() {
  const params = useParams()
  const ticker = params.ticker as string
  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // Get stock info for header
  const stock = stocks.find(s => s.ticker === ticker.toUpperCase())

  // User-Daten laden
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('user_id', session.user.id)
            .maybeSingle()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isPremium: profile?.is_premium || false
          })
        }
      } catch (error) {
        console.error('[ValuationPage] Error loading user:', error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [])

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="w-full px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <span className="text-theme-muted">Lade Bewertungsdaten...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-primary">
      {/* ✅ EINHEITLICHER HEADER - wie andere Pages */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-6">
          
          {/* Zurück-Link */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Aktien-Auswahl
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-theme/10">
              <Logo
                ticker={ticker}
                alt={`${ticker} Logo`}
                className="w-8 h-8"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-theme-primary">
                {stock?.name || ticker.toUpperCase()}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-lg text-purple-400 font-semibold">{ticker.toUpperCase()}</span>
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm text-theme-muted">
                  Bewertungsanalyse
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MAIN CONTENT - konsistent mit anderen Pages */}
      <main className="w-full px-6 lg:px-8 py-8 space-y-8">

        {/* Main Valuation Table */}
        <ProfessionalValuationTable 
          ticker={ticker.toUpperCase()} 
          isPremium={user?.isPremium || false}
        />

        {/* ✅ Additional Sections MIT LEARN TOOLTIPS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-theme-card rounded-xl p-6 hover:bg-theme-secondary/10 transition-colors border border-theme/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-theme-primary">Peer Vergleich</h3>
                  <LearnTooltipButton term="Enterprise Value" />
                </div>
                <p className="text-theme-muted text-sm">Vergleich mit Branchenkonkurrenten</p>
              </div>
            </div>
            <div className="bg-theme-tertiary/20 rounded-lg p-4 border-l-4 border-blue-400">
              <p className="text-sm text-theme-muted">
                🚀 Bald verfügbar: Automatischer Vergleich mit Top-Konkurrenten in der Branche
              </p>
            </div>
          </div>
          
          <div className="bg-theme-card rounded-xl p-6 hover:bg-theme-secondary/10 transition-colors border border-theme/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-theme-primary">DCF Modell</h3>
                  <LearnTooltipButton term="Price to Free Cash Flow" />
                </div>
                <p className="text-theme-muted text-sm">Discounted Cash Flow Bewertung</p>
              </div>
            </div>
            <div className="bg-theme-tertiary/20 rounded-lg p-4 border-l-4 border-green-400">
              <p className="text-sm text-theme-muted">
                📊 Bald verfügbar: Interaktives DCF-Modell mit anpassbaren Parametern
              </p>
            </div>
          </div>
        </div>



        {/* ✅ CTA für Premium Users */}
        {user?.isPremium && (
          <div className="bg-theme-card rounded-xl p-6 border border-theme/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-theme-primary mb-1">
                  Vollständige {ticker.toUpperCase()} Analyse
                </h3>
                <p className="text-theme-muted text-sm">
                  Charts, Fundamentaldaten, Dividenden und technische Analyse
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href={`/analyse/stocks/${ticker.toLowerCase()}`}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Zur Analyse
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ✅ LEARN SIDEBAR hinzugefügt */}
      <LearnSidebar />
    </div>
  )
}