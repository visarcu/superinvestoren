
// =====================================================================
// ProfessionalValuationTable.tsx - MIT DEUTSCHER FORMATIERUNG
// =====================================================================

import React, { useState, useEffect } from 'react';
import { LockClosedIcon, CalculatorIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useCurrency } from '@/lib/CurrencyContext'; // ✅ CURRENCY CONTEXT HINZUGEFÜGT

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
  companyName?: string;
  isPremium?: boolean;
}

const ProfessionalValuationTable: React.FC<Props> = ({ ticker, companyName, isPremium = false }) => {
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ CURRENCY CONTEXT FÜR DEUTSCHE FORMATIERUNG
  const { formatPercentage } = useCurrency();

  useEffect(() => {
    loadValuationData();
  }, [ticker]);

  const loadValuationData = async () => {
    setLoading(true);
    setError(null);
    
    // ✅ Variablen definieren
    let currentPrice = 0;
    let forwardPE = 0;
    let evToSales = 0;
    let evToEbitda = 0;
    let evToEbit = 0;
    
    try {
      console.log(`🔍 Loading valuation data for ${ticker}...`);
      
      // 1. Company Outlook für aktuelle Ratios - use secure API
      const outlookResponse = await fetch(
        `/api/company-outlook/${ticker}`
      );
      
      if (!outlookResponse.ok) {
        throw new Error(`Company Outlook API failed: ${outlookResponse.status}`);
      }
      
      const outlookData = await outlookResponse.json();
      const currentRatios = outlookData.ratios?.[0] || {};

      // 2. Key Metrics TTM + Profile für zusätzliche Ratios
      const [keyMetricsResponse, profileResponse] = await Promise.all([
        fetch(`/api/key-metrics-ttm/${ticker}`),
        fetch(`/api/company-profile/${ticker}`)
      ]);
      
      let keyMetrics = {};
      let profileData = {};
      
      if (keyMetricsResponse.ok) {
        const keyMetricsData = await keyMetricsResponse.json();
        keyMetrics = Array.isArray(keyMetricsData) ? keyMetricsData[0] || {} : {};
      }
      
      if (profileResponse.ok) {
        const profileArray = await profileResponse.json();
        profileData = Array.isArray(profileArray) ? profileArray[0] || {} : {};
      }

      // 3. Aktuelle Kursdaten
      const quoteResponse = await fetch(
        `/api/quotes?symbols=${ticker}`
      );
      
      if (quoteResponse.ok) {
        const [quote] = await quoteResponse.json();
        currentPrice = quote.price;
      }

      // 4. Enterprise Value + Financial Data
      const [evResponse, incomeResponse] = await Promise.all([
        fetch(`/api/enterprise-values/${ticker}?period=quarter&limit=1`),
        fetch(`/api/income-statement/${ticker}?period=annual&limit=1`)
      ]);

      if (evResponse.ok && incomeResponse.ok) {
        const [evData] = await evResponse.json();
        const [incomeData] = await incomeResponse.json();
        
        if (evData && incomeData) {
          const enterpriseValue = evData.enterpriseValue;
          const revenue = incomeData.revenue;
          const ebitda = incomeData.ebitda;
          const operatingIncome = incomeData.operatingIncome;
          
          if (enterpriseValue && revenue) {
            evToSales = enterpriseValue / revenue;
          }
          
          if (enterpriseValue && ebitda && ebitda > 0) {
            evToEbitda = enterpriseValue / ebitda;
          }
          
          if (enterpriseValue && operatingIncome && operatingIncome > 0) {
            evToEbit = enterpriseValue / operatingIncome;
          }
        }
      }

      // 5. Historical Ratios + Key Metrics
      const [historicalResponse, historicalKeyMetricsResponse] = await Promise.all([
        fetch(`/api/ratios/${ticker}?period=annual&limit=5`),
        fetch(`/api/key-metrics/${ticker}?period=annual&limit=5`)
      ]);
      
      const historicalRatios = historicalResponse.ok ? await historicalResponse.json() : [];
      const historicalKeyMetrics = historicalKeyMetricsResponse.ok ? await historicalKeyMetricsResponse.json() : [];

      // 6. Hilfsfunktionen
      const calculate5YearAvg = (field: string): number => {
        if (!Array.isArray(historicalRatios) || historicalRatios.length === 0) return 0;
        
        const validValues = historicalRatios
          .map(item => item[field])
          .filter(val => val != null && !isNaN(val) && val > 0);
          
        if (validValues.length === 0) return 0;
        
        return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
      };

      const calculateEVRatioFromKeyMetrics = (field: string): number => {
        if (!Array.isArray(historicalKeyMetrics) || historicalKeyMetrics.length === 0) return 0;
        
        const validValues = historicalKeyMetrics
          .map(item => item[field])
          .filter((val): val is number => val != null && !isNaN(val) && val > 0);
          
        if (validValues.length === 0) return 0;
        
        return validValues.reduce((sum: number, val: number) => sum + val, 0) / validValues.length;
      };

      const getValue = (sources: any[], possibleFields: string[]): number => {
        for (const source of sources) {
          if (!source) continue;
          for (const field of possibleFields) {
            if (source[field] != null && !isNaN(source[field]) && source[field] !== 0) {
              return source[field];
            }
          }
        }
        return 0;
      };

      // 7. Forward P/E + PEG Berechnung
      let calculatedPEG = 0;
      
      try {
        const estimatesResponse = await fetch(
          `/api/analyst-estimates/${ticker}`
        );
        
        if (estimatesResponse.ok) {
          const estimates = await estimatesResponse.json();
          
          const currentYear = new Date().getFullYear();
          const nextYearEst = estimates.find((e: any) => 
            parseInt(e.date.slice(0, 4), 10) === currentYear + 1
          );
          const currentYearEst = estimates.find((e: any) => 
            parseInt(e.date.slice(0, 4), 10) === currentYear
          );
          
          if (nextYearEst && nextYearEst.estimatedEpsAvg > 0 && currentPrice > 0) {
            forwardPE = currentPrice / nextYearEst.estimatedEpsAvg;
          }
          
          // PEG manuell berechnen
          if (currentYearEst && nextYearEst && currentYearEst.estimatedEpsAvg > 0) {
            const currentEPS = currentYearEst.estimatedEpsAvg;
            const nextEPS = nextYearEst.estimatedEpsAvg;
            const growthRate = ((nextEPS - currentEPS) / currentEPS) * 100;
            
            const peRatio = getValue([currentRatios, keyMetrics, profileData], [
              'priceEarningsRatio', 'peRatioTTM', 'pe'
            ]);
            
            if (peRatio > 0 && growthRate > 0) {
              calculatedPEG = peRatio / growthRate;
            }
          }
        }
      } catch (err) {
        console.warn('Forward P/E calculation failed:', err);
      }

      // 8. ✅ KORRIGIERTE Cash Flow Ratios Berechnung
      let priceToCashFlow = 0;   // Operating Cash Flow
      let priceToFCF = 0;        // Free Cash Flow
      
      console.log('🔄 Starting enhanced Cash Flow calculation...');
      
      // METHODE 1: Direkte Ratios aus APIs - KORRIGIERTE FELDNAMEN
      priceToCashFlow = getValue([keyMetrics, currentRatios], [
        'pocfratioTTM',              // ✅ KORREKT: Price to Operating Cash Flow TTM
        'priceCashFlowRatio',
        'priceToOperatingCashFlowsRatio', 
        'pcfRatio'
      ]);
      
      priceToFCF = getValue([keyMetrics, currentRatios], [
        'pfcfRatioTTM',              // ✅ KORREKT: Price to Free Cash Flow TTM  
        'priceToFreeCashFlowsRatio',
        'priceToFreeCashFlowsRatioTTM',
        'pfcfRatio'
      ]);
      
      console.log(`📊 Direct ratios - P/CF: ${priceToCashFlow}, P/FCF: ${priceToFCF}`);
      
      // METHODE 2: Per Share basierte Berechnung falls direkte Ratios fehlen
      if (priceToCashFlow === 0 || priceToFCF === 0) {
        console.log('🔄 Trying per share calculation...');
        
        const operatingCashFlowPerShare = getValue([keyMetrics], [
          'operatingCashFlowPerShareTTM'
        ]);
        
        const freeCashFlowPerShare = getValue([keyMetrics], [
          'freeCashFlowPerShareTTM'
        ]);
        
        console.log(`📊 Per Share values:`, {
          operatingCashFlowPerShare,
          freeCashFlowPerShare,
          currentPrice
        });
        
        // P/CF berechnen
        if (priceToCashFlow === 0 && operatingCashFlowPerShare > 0 && currentPrice > 0) {
          priceToCashFlow = currentPrice / operatingCashFlowPerShare;
          console.log(`✅ P/CF calculated: ${priceToCashFlow.toFixed(2)}`);
        }
        
        // P/FCF berechnen
        if (priceToFCF === 0 && freeCashFlowPerShare > 0 && currentPrice > 0) {
          priceToFCF = currentPrice / freeCashFlowPerShare;
          console.log(`✅ P/FCF calculated: ${priceToFCF.toFixed(2)}`);
        }
      }
      
      console.log(`🎯 Final CF Ratios - P/CF: ${priceToCashFlow.toFixed(2)}, P/FCF: ${priceToFCF.toFixed(2)}`);

      // 9. Final Valuation Data
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
          'priceToBookRatio', 'priceToBookRatioTTM', 'pb', 'pbRatio', 'ptbRatioTTM'
        ]),
        
        priceSalesRatioTTM: getValue([currentRatios, keyMetrics], [
          'priceToSalesRatio', 'priceSalesRatioTTM', 'ps', 'psRatio', 'priceToSalesRatioTTM'
        ]),
        
        // ✅ KORRIGIERTE Cash Flow Ratios
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
        evSales5YAvg: calculateEVRatioFromKeyMetrics('evToSales') || evToSales,
        evEbitda5YAvg: calculateEVRatioFromKeyMetrics('enterpriseValueOverEBITDA') || evToEbitda,
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

  // ✅ DEUTSCHE FORMATIERUNG für Ratios
  const formatRatio = (value: number): string => {
    if (value === 0 || !value || isNaN(value)) return '-';
    return value.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // ✅ DEUTSCHE FORMATIERUNG für Prozente mit Context
  const formatPercent = (value: number): string => {
    if (value === 0 || !value || isNaN(value)) return '-';
    
    // Wenn Wert bereits in Prozent (>1), direkt nutzen
    if (value > 1) {
      return formatPercentage(value, false); // Ohne Vorzeichen
    }
    
    // Wenn Wert als Dezimal (<1), in Prozent umwandeln
    return formatPercentage(value * 100, false); // Ohne Vorzeichen
  };

  // ✅ DEUTSCHE FORMATIERUNG für Differenzen
  const calculateDifference = (current: number, comparison: number): string => {
    if (!current || !comparison || isNaN(current) || isNaN(comparison)) return '-';
    const diff = ((current - comparison) / comparison) * 100;
    return formatPercentage(diff, true); // Mit Vorzeichen
  };

  const getDifferenceColor = (current: number, comparison: number, isDividend: boolean = false): string => {
    if (!current || !comparison || isNaN(current) || isNaN(comparison)) return 'text-theme-muted';
    // For dividends: higher = better (green), lower = worse (red)
    // For valuation ratios: higher = overvalued (red), lower = undervalued (green)
    if (isDividend) {
      return current > comparison ? 'text-emerald-500' : 'text-red-400';
    }
    return current > comparison ? 'text-red-400' : 'text-emerald-500';
  };

  if (loading) {
    return (
      <div className="bg-theme-card rounded-xl p-8">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <span className="text-theme-muted">Lade Bewertungsdaten...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-theme-card rounded-xl p-8 text-center">
        <InformationCircleIcon className="w-16 h-16 mx-auto mb-4 text-theme-secondary" />
        <p className="text-theme-secondary mb-4">Fehler beim Laden der Bewertungsdaten: {error}</p>
        <button 
          onClick={loadValuationData}
          className="px-4 py-2 bg-theme-primary hover:bg-theme-secondary text-white rounded-lg transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="bg-theme-card rounded-xl border border-theme-light">
        <div className="px-6 py-4 border-b border-theme-light">
          <div className="flex items-center gap-3">
            <CalculatorIcon className="w-6 h-6 text-theme-primary" />
            <h3 className="text-xl font-bold text-theme-primary">Bewertung & Kennzahlen</h3>
          </div>
        </div>
        
        <div className="text-center py-12 px-6">
          <div className="w-16 h-16 bg-theme-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <LockClosedIcon className="w-8 h-8 text-theme-primary" />
          </div>
          <h3 className="text-xl font-semibold text-theme-primary mb-3">Premium Bewertungsanalyse</h3>
          <p className="text-theme-secondary mb-6 max-w-md mx-auto leading-relaxed">
            Professionelle Bewertungsmetriken mit historischen Vergleichen, P/E, EV-Ratios und Cash Flow Analysen.
          </p>
          
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-secondary text-white rounded-lg font-semibold transition-colors">
            <LockClosedIcon className="w-5 h-5" />
            14 Tage kostenlos testen
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Deutsche Kennzahlen-Namen (vereinfacht)
  const valuationMetrics = [
    {
      section: 'PROFITABILITÄT & WACHSTUM',
      metrics: [
        {
          label: 'KGV (TTM)',
          current: data.peRatioTTM,
          comparison: data.pe5YAvg,
          formatter: formatRatio,
          important: true
        },
        {
          label: 'KGV Erwartet (FWD)',
          current: data.forwardPE,
          comparison: data.pe5YAvg,
          formatter: formatRatio
        },
        {
          label: 'PEG (TTM)',
          current: data.pegRatioTTM,
          comparison: data.peg5YAvg,
          formatter: formatRatio
        },
      ]
    },
    {
      section: 'ENTERPRISE VALUE KENNZAHLEN',
      metrics: [
        {
          label: 'EV/Umsatz (TTM)',
          current: data.evToSales,
          comparison: data.evSales5YAvg,
          formatter: formatRatio,
          important: true
        },
        {
          label: 'EV/EBITDA (TTM)',
          current: data.evToEbitda,
          comparison: data.evEbitda5YAvg,
          formatter: formatRatio,
          important: true
        },
        {
          label: 'EV/EBIT (TTM)',
          current: data.evToEbit,
          comparison: data.evEbitda5YAvg,
          formatter: formatRatio
        },
      ]
    },
    {
      section: 'BUCHWERT & UMSATZ',
      metrics: [
        {
          label: 'KUV (TTM)',
          current: data.priceSalesRatioTTM,
          comparison: data.ps5YAvg,
          formatter: formatRatio
        },
        {
          label: 'KBV (TTM)',
          current: data.priceToBookRatioTTM,
          comparison: data.pb5YAvg,
          formatter: formatRatio
        },
      ]
    },
    {
      section: 'CASH FLOW BEWERTUNG',
      metrics: [
        {
          label: 'Kurs/Cashflow (TTM)',
          current: data.priceToCashFlowRatio,
          comparison: data.pcf5YAvg,
          formatter: formatRatio,
          important: true
        },
        {
          label: 'Kurs/Free Cashflow (TTM)',
          current: data.priceToFreeCashFlowsRatio,
          comparison: data.fcf5YAvg,
          formatter: formatRatio,
          important: true
        },
      ]
    },
    {
      section: 'DIVIDENDE',
      metrics: [
        {
          label: 'Dividendenrendite (TTM)',
          current: data.dividendYieldTTM,
          comparison: data.divYield5YAvg,
          formatter: formatPercent,
          important: false,
          isDividend: true
        },
      ]
    }
  ];

  return (
    <div className="bg-theme-card rounded-xl overflow-hidden border border-theme shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="p-6 border-b border-theme">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-theme-secondary/20 rounded-lg flex items-center justify-center">
            <CalculatorIcon className="w-4 h-4 text-theme-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-theme-primary">Bewertung & Kennzahlen</h3>
            <p className="text-theme-muted text-sm">{ticker} Bewertungsanalyse</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-theme">
              <th className="text-left py-3 px-6 text-theme-secondary font-medium text-sm">Kennzahl</th>
              <th className="text-right py-3 px-6 text-theme-secondary font-medium text-sm">Aktuell</th>
              <th className="text-right py-3 px-6 text-theme-secondary font-medium text-sm">5J Ø</th>
              <th className="text-right py-3 px-6 text-theme-secondary font-medium text-sm">vs. Ø</th>
            </tr>
          </thead>
          <tbody>
            {valuationMetrics.map((section, sectionIndex) => (
              <React.Fragment key={sectionIndex}>
                {/* Section Header */}
                <tr>
                  <td colSpan={4} className="pt-6 pb-2 px-6 border-t border-theme">
                    <span className="text-[11px] font-semibold text-theme-muted uppercase tracking-widest">
                      {section.section}
                    </span>
                  </td>
                </tr>

                {/* Metrics */}
                {section.metrics.map((metric, index) => {
                  const isDividend = !!(metric as any).isDividend;
                  const diffColor = getDifferenceColor(metric.current, metric.comparison, isDividend);
                  const diffValue = calculateDifference(metric.current, metric.comparison);

                  return (
                    <tr
                      key={index}
                      className="border-b border-theme-light hover:bg-theme-hover transition-colors"
                    >
                      <td className={`py-2.5 px-6 text-theme-primary text-sm ${metric.important ? 'font-semibold' : 'font-medium'}`}>
                        {metric.label}
                      </td>
                      <td className={`py-2.5 px-6 text-right font-mono tabular-nums text-sm text-theme-primary ${metric.important ? 'font-semibold' : ''}`}>
                        {metric.formatter(metric.current)}
                      </td>
                      <td className="py-2.5 px-6 text-right text-theme-muted font-mono tabular-nums text-sm">
                        {metric.formatter(metric.comparison)}
                      </td>
                      <td className={`py-2.5 px-6 text-right text-sm font-mono tabular-nums ${diffColor}`}>
                        {diffValue}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-4 bg-theme-secondary/20 text-xs text-theme-muted border-t border-theme">
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