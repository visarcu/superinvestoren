// src/components/GrowthCharts.tsx - Mit echten API-Daten
'use client'

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Area } from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useCurrency } from '@/lib/CurrencyContext';

export type GrowthTimeframe = '3Y' | '5Y' | '10Y' | 'MAX';

interface GrowthChartsProps {
  ticker: string;
  timeframe?: GrowthTimeframe;
}

interface HistoricalGrowthData {
  year: number;
  revenue: number;
  revenueGrowth: number;
  revenueGrowthRaw: number;
  eps: number;
  epsGrowth: number;
  epsGrowthRaw: number;
  ebitda?: number;
  ebitdaGrowth?: number;
  ebitdaGrowthRaw?: number;
  fcf?: number;
  fcfGrowth?: number;
  fcfGrowthRaw?: number;
  netIncome?: number;
  netIncomeGrowth?: number;
  netIncomeGrowthRaw?: number;
  operatingIncome?: number;
  operatingIncomeGrowth?: number;
}

// Cap extreme outlier growth rates so the Y-axis stays readable.
// Years with near-zero prior base can produce values in the millions of %.
const CHART_CAP_PERCENT = 300;
const clampGrowth = (value: number) => {
  if (!isFinite(value)) return 0;
  return Math.max(-CHART_CAP_PERCENT, Math.min(CHART_CAP_PERCENT, value));
};

interface CAGRData {
  period: string;
  revenue: number;
  eps: number;
  ebitda?: number;
  fcf?: number;
  netIncome?: number;
}

const GrowthCharts: React.FC<GrowthChartsProps> = ({ ticker, timeframe = 'MAX' }) => {
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<HistoricalGrowthData[]>([]);
  const [cagrData, setCAGRData] = useState<CAGRData[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { formatPercentage } = useCurrency();

  useEffect(() => {
    loadChartData();
  }, [ticker]);

  const loadChartData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Lade historische Finanzdaten für die letzten 10 Jahre
      const [incomeResponse, cashFlowResponse, growthResponse] = await Promise.all([
        fetch(`/api/financials/income-historical/${ticker}?limit=11`),
        fetch(`/api/financials/cashflow-historical/${ticker}?limit=11`),
        fetch(`/api/growth/${ticker}`)
      ]);

      if (!incomeResponse.ok) {
        console.error('Income response error:', incomeResponse.status);
        throw new Error('Fehler beim Laden der Income-Daten');
      }
      if (!cashFlowResponse.ok) {
        console.error('CashFlow response error:', cashFlowResponse.status);
        throw new Error('Fehler beim Laden der CashFlow-Daten');
      }
      if (!growthResponse.ok) {
        console.error('Growth response error:', growthResponse.status);
        throw new Error('Fehler beim Laden der Growth-Daten');
      }

      const incomeData = await incomeResponse.json();
      const cashFlowData = await cashFlowResponse.json();
      const growthData = await growthResponse.json();
      
      console.log('Income data loaded:', Array.isArray(incomeData) ? incomeData.length : 0, 'statements');
      console.log('CashFlow data loaded:', Array.isArray(cashFlowData) ? cashFlowData.length : 0, 'statements');
      console.log('Growth data loaded:', growthData);

      // Verarbeite historische Daten für Wachstumstrend-Chart
      const processedHistorical: HistoricalGrowthData[] = [];
      
      if (Array.isArray(incomeData) && incomeData.length > 0) {
        // Sortiere nach Jahr (älteste zuerst)
        const sortedStatements = [...incomeData].sort((a, b) => 
          new Date(a.date).getFullYear() - new Date(b.date).getFullYear()
        );

        for (let i = 1; i < sortedStatements.length; i++) {
          const current = sortedStatements[i];
          const previous = sortedStatements[i - 1];
          const year = new Date(current.date).getFullYear();
          
          // Finde passende Cash Flow Daten
          const cfData = Array.isArray(cashFlowData) ? cashFlowData.find((cf: any) => 
            new Date(cf.date).getFullYear() === year
          ) : null;
          const prevCfData = Array.isArray(cashFlowData) ? cashFlowData.find((cf: any) => 
            new Date(cf.date).getFullYear() === year - 1
          ) : null;

          // Berechne YoY Wachstumsraten
          const revenueGrowth = previous.revenue && previous.revenue !== 0
            ? ((current.revenue - previous.revenue) / Math.abs(previous.revenue)) * 100
            : 0;

          const epsGrowth = previous.epsdiluted && previous.epsdiluted !== 0
            ? ((current.epsdiluted - previous.epsdiluted) / Math.abs(previous.epsdiluted)) * 100
            : 0;

          const ebitdaGrowth = previous.ebitda && previous.ebitda !== 0
            ? ((current.ebitda - previous.ebitda) / Math.abs(previous.ebitda)) * 100
            : 0;

          const netIncomeGrowth = current.netIncome !== undefined && previous.netIncome && previous.netIncome !== 0
            ? ((current.netIncome - previous.netIncome) / Math.abs(previous.netIncome)) * 100
            : 0;

          const operatingIncomeGrowth = current.operatingIncome !== undefined && previous.operatingIncome && previous.operatingIncome !== 0
            ? ((current.operatingIncome - previous.operatingIncome) / Math.abs(previous.operatingIncome)) * 100
            : 0;

          let fcfGrowth = 0;
          if (cfData && prevCfData) {
            const currentFCF = cfData.freeCashFlow || (cfData.operatingCashFlow - cfData.capitalExpenditure);
            const prevFCF = prevCfData.freeCashFlow || (prevCfData.operatingCashFlow - prevCfData.capitalExpenditure);
            
            if (prevFCF && prevFCF !== 0) {
              fcfGrowth = ((currentFCF - prevFCF) / Math.abs(prevFCF)) * 100;
            }
          }

          const safe = (v: number) => (isFinite(v) ? v : 0);
          processedHistorical.push({
            year,
            revenue: current.revenue || 0,
            revenueGrowth: clampGrowth(safe(revenueGrowth)),
            revenueGrowthRaw: safe(revenueGrowth),
            eps: current.epsdiluted || 0,
            epsGrowth: clampGrowth(safe(epsGrowth)),
            epsGrowthRaw: safe(epsGrowth),
            ebitda: current.ebitda || 0,
            ebitdaGrowth: clampGrowth(safe(ebitdaGrowth)),
            ebitdaGrowthRaw: safe(ebitdaGrowth),
            fcf: cfData?.freeCashFlow || (cfData?.operatingCashFlow - cfData?.capitalExpenditure) || 0,
            fcfGrowth: clampGrowth(safe(fcfGrowth)),
            fcfGrowthRaw: safe(fcfGrowth),
            netIncome: current.netIncome || 0,
            netIncomeGrowth: clampGrowth(safe(netIncomeGrowth)),
            netIncomeGrowthRaw: safe(netIncomeGrowth),
            operatingIncome: current.operatingIncome || 0,
            operatingIncomeGrowth: clampGrowth(safe(operatingIncomeGrowth))
          });
        }
      } else {
        console.error('No valid income statements found');
      }

      // Verwende die echten CAGR-Werte aus der Growth API
      const processedCAGR: CAGRData[] = [];
      
      if (growthData?.growth) {
        const g = growthData.growth;
        
        // 1 Jahr (YoY)
        if (g.revenueGrowth1Y !== null || g.epsGrowth1Y !== null) {
          processedCAGR.push({
            period: '1Y',
            revenue: g.revenueGrowth1Y || 0,
            eps: g.epsGrowth1Y || 0,
            ebitda: g.ebitdaGrowth1Y || 0,
            fcf: g.fcfGrowth1Y || 0,
            netIncome: processedHistorical.length > 0 ? processedHistorical[processedHistorical.length - 1]?.netIncomeGrowth || 0 : 0
          });
        }
        
        // 3 Jahre CAGR
        if (g.revenueGrowth3Y !== null || g.epsGrowth3Y !== null) {
          processedCAGR.push({
            period: '3Y',
            revenue: g.revenueGrowth3Y || 0,
            eps: g.epsGrowth3Y || 0,
            ebitda: g.ebitdaGrowth3Y || 0,
            fcf: g.fcfGrowth3Y || 0,
            netIncome: calculateCAGR(incomeData?.statements || [], 'netIncome', 3)
          });
        }
        
        // 5 Jahre CAGR
        if (g.revenueGrowth5Y !== null || g.epsGrowth5Y !== null) {
          processedCAGR.push({
            period: '5Y',
            revenue: g.revenueGrowth5Y || 0,
            eps: g.epsGrowth5Y || 0,
            ebitda: calculateCAGR(incomeData || [], 'ebitda', 5),
            fcf: calculateCAGR(cashFlowData || [], 'freeCashFlow', 5),
            netIncome: calculateCAGR(incomeData || [], 'netIncome', 5)
          });
        }
        
        // 10 Jahre CAGR
        if (g.revenueGrowth10Y !== null || g.epsGrowth10Y !== null) {
          processedCAGR.push({
            period: '10Y',
            revenue: g.revenueGrowth10Y || 0,
            eps: g.epsGrowth10Y || 0,
            ebitda: calculateCAGR(incomeData || [], 'ebitda', 10),
            fcf: calculateCAGR(cashFlowData || [], 'freeCashFlow', 10),
            netIncome: calculateCAGR(incomeData || [], 'netIncome', 10)
          });
        }
      }

      setHistoricalData(processedHistorical);
      setCAGRData(processedCAGR);
      
    } catch (error) {
      console.error('Error loading chart data:', error);
      setError('Fehler beim Laden der Chart-Daten');
    } finally {
      setLoading(false);
    }
  };

  // Hilfsfunktion zur Berechnung von CAGR
  const calculateCAGR = (statements: any[], metric: string, years: number): number => {
    if (!statements || statements.length < years + 1) return 0;
    
    const sorted = [...statements].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const endValue = sorted[0][metric];
    const startValue = sorted[Math.min(years, sorted.length - 1)][metric];
    
    if (!startValue || startValue === 0 || !endValue) return 0;
    
    const cagr = (Math.pow(Math.abs(endValue / startValue), 1 / years) - 1) * 100;
    return isFinite(cagr) ? cagr : 0;
  };

  // Deutsche Label-Übersetzungen für Tooltips
  const getGermanLabel = (englishKey: string): string => {
    const translations: { [key: string]: string } = {
      // Growth rates
      'revenueGrowth': 'Umsatzwachstum',
      'epsGrowth': 'EPS-Wachstum', 
      'ebitdaGrowth': 'EBITDA-Wachstum',
      'netIncomeGrowth': 'Nettogewinn-Wachstum',
      'fcfGrowth': 'FCF-Wachstum',
      'operatingIncomeGrowth': 'Betriebsergebnis-Wachstum',
      
      // CAGR values
      'revenue': 'Umsatz',
      'eps': 'EPS',
      'ebitda': 'EBITDA', 
      'netIncome': 'Nettogewinn',
      'fcf': 'Free Cash Flow',
      
      // Indexed values
      'revenueIndexed': 'Umsatz (Index)',
      'epsIndexed': 'EPS (Index)',
      'netIncomeIndexed': 'Nettogewinn (Index)',
      
      // Fallbacks for other fields
      'operatingIncome': 'Betriebsergebnis',
      'freeCashFlow': 'Free Cash Flow',
      'totalAssets': 'Bilanzsumme',
      'workingCapital': 'Umlaufvermögen',
      'capex': 'Investitionen',
      'dividend': 'Dividende',
      'roe': 'Eigenkapitalrendite'
    };
    
    return translations[englishKey] || englishKey;
  };

  // Custom Tooltip für deutsche Formatierung - Theme-aware Styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-theme-card border border-theme-light rounded-lg p-3 shadow-lg">
          <p className="text-theme-primary font-medium mb-2 text-sm">
            {typeof label === 'number' ? `${label}` : label}
          </p>
          {payload.map((entry: any, index: number) => {
            const dataKey = entry.dataKey || entry.name;
            const rawKey = `${dataKey}Raw`;
            const rawValue = entry.payload?.[rawKey];
            const displayValue = typeof rawValue === 'number' ? rawValue : entry.value;
            const wasCapped =
              typeof rawValue === 'number' &&
              Math.abs(rawValue) > CHART_CAP_PERCENT;
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-theme-muted">
                  {getGermanLabel(dataKey)}:
                </span>
                <span className="text-theme-primary font-medium">
                  {formatPercentage(displayValue, true)}
                </span>
                {wasCapped && (
                  <span className="text-amber-400 text-[10px] ml-1">
                    (Outlier)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip für indexierte Werte - Theme-aware
  const IndexedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-theme-card border border-theme-light rounded-lg p-3 shadow-lg">
          <p className="text-theme-primary font-medium mb-2 text-sm">
            Jahr: {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-theme-muted">
                {getGermanLabel(entry.dataKey || entry.name)}:
              </span>
              <span className="text-theme-primary font-medium">
                {Number(entry.value).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={loadChartData}
            className="btn-secondary"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (historicalData.length === 0 && cagrData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-theme-secondary">Keine Chart-Daten verfügbar</p>
      </div>
    );
  }

  // Apply timeframe filter to historical data (line + indexed charts).
  // CAGR chart shows all periods regardless.
  const timeframeYears: Record<GrowthTimeframe, number | null> = {
    '3Y': 3,
    '5Y': 5,
    '10Y': 10,
    'MAX': null,
  };
  const yearsLimit = timeframeYears[timeframe];
  const filteredHistorical = yearsLimit !== null
    ? historicalData.slice(-yearsLimit)
    : historicalData;

  const axisStroke = 'var(--color-text-muted)';
  const gridStroke = 'var(--color-text-muted)';
  const gridOpacity = 0.15;

  return (
    <div className="growth-charts space-y-5">

      {/* Wachstumstrend über Zeit */}
      {filteredHistorical.length > 0 && (
        <div className="bg-theme-card rounded-xl border border-theme-light p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-theme-primary">
              Wachstumstrend über Zeit (YoY)
            </h4>
            <span className="text-[10px] font-medium text-theme-muted uppercase tracking-wider">
              {timeframe === 'MAX' ? 'Alle Jahre' : `Letzte ${yearsLimit} Jahre`}
            </span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredHistorical} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={gridOpacity} />
                <XAxis
                  dataKey="year"
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                />
                <YAxis
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-text-muted)', strokeOpacity: 0.3 }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => {
                    const labels: { [key: string]: string } = {
                      revenueGrowth: 'Umsatz',
                      epsGrowth: 'EPS',
                      ebitdaGrowth: 'EBITDA',
                      netIncomeGrowth: 'Nettogewinn'
                    };
                    return <span className="text-theme-secondary">{labels[value] || value}</span>;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenueGrowth"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#3B82F6' }}
                />
                <Line
                  type="monotone"
                  dataKey="epsGrowth"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#10B981' }}
                />
                <Line
                  type="monotone"
                  dataKey="ebitdaGrowth"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#F59E0B', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#F59E0B' }}
                />
                <Line
                  type="monotone"
                  dataKey="netIncomeGrowth"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ fill: '#8B5CF6', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: '#8B5CF6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CAGR Vergleich */}
      {cagrData.length > 0 && (
        <div className="bg-theme-card rounded-xl border border-theme-light p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-theme-primary">
              CAGR Vergleich
            </h4>
            <span className="text-[10px] font-medium text-theme-muted uppercase tracking-wider">
              Compound Annual Growth Rate
            </span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cagrData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={gridOpacity} vertical={false} />
                <XAxis
                  dataKey="period"
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                />
                <YAxis
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-text-muted)', fillOpacity: 0.05 }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => {
                    const labels: { [key: string]: string } = {
                      revenue: 'Umsatz',
                      eps: 'EPS',
                      ebitda: 'EBITDA',
                      netIncome: 'Nettogewinn'
                    };
                    return <span className="text-theme-secondary">{labels[value] || value}</span>;
                  }}
                />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="eps" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ebitda" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="netIncome" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Absolutes Wachstum über Zeit */}
      {filteredHistorical.length > 0 && (
        <div className="bg-theme-card rounded-xl border border-theme-light p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-theme-primary">
              Absolutes Wachstum
            </h4>
            <span className="text-[10px] font-medium text-theme-muted uppercase tracking-wider">
              Indexiert · Basis = 100
            </span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={filteredHistorical.map((d) => {
                  const baseYear = filteredHistorical[0];

                  const revenueIndexed = (baseYear.revenue && baseYear.revenue !== 0 && d.revenue)
                    ? (d.revenue / baseYear.revenue) * 100
                    : 100;

                  const epsIndexed = (baseYear.eps && baseYear.eps !== 0 && d.eps)
                    ? (d.eps / baseYear.eps) * 100
                    : 100;

                  const netIncomeIndexed = (baseYear.netIncome && baseYear.netIncome !== 0 && d.netIncome)
                    ? (d.netIncome / baseYear.netIncome) * 100
                    : 100;

                  return {
                    ...d,
                    revenueIndexed,
                    epsIndexed,
                    netIncomeIndexed
                  };
                })}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} opacity={gridOpacity} />
                <XAxis
                  dataKey="year"
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: gridStroke }}
                />
                <YAxis
                  stroke={axisStroke}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip content={<IndexedTooltip />} cursor={{ stroke: 'var(--color-text-muted)', strokeOpacity: 0.3 }} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => {
                    const labels: { [key: string]: string } = {
                      revenueIndexed: 'Umsatz (Index)',
                      epsIndexed: 'EPS (Index)',
                      netIncomeIndexed: 'Nettogewinn (Index)'
                    };
                    return <span className="text-theme-secondary">{labels[value] || value}</span>;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenueIndexed"
                  fill="#3B82F6"
                  stroke="#3B82F6"
                  fillOpacity={0.2}
                />
                <Line
                  type="monotone"
                  dataKey="epsIndexed"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 0, r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="netIncomeIndexed"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ fill: '#8B5CF6', strokeWidth: 0, r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrowthCharts;