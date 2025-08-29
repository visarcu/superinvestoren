// src/components/GrowthCharts.tsx - Mit echten API-Daten
'use client'

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Area } from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useCurrency } from '@/lib/CurrencyContext';

interface GrowthChartsProps {
  ticker: string;
}

interface HistoricalGrowthData {
  year: number;
  revenue: number;
  revenueGrowth: number;
  eps: number;
  epsGrowth: number;
  ebitda?: number;
  ebitdaGrowth?: number;
  fcf?: number;
  fcfGrowth?: number;
  netIncome?: number;
  netIncomeGrowth?: number;
  operatingIncome?: number;
  operatingIncomeGrowth?: number;
}

interface CAGRData {
  period: string;
  revenue: number;
  eps: number;
  ebitda?: number;
  fcf?: number;
  netIncome?: number;
}

const GrowthCharts: React.FC<GrowthChartsProps> = ({ ticker }) => {
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

          processedHistorical.push({
            year,
            revenue: current.revenue || 0,
            revenueGrowth: isFinite(revenueGrowth) ? revenueGrowth : 0,
            eps: current.epsdiluted || 0,
            epsGrowth: isFinite(epsGrowth) ? epsGrowth : 0,
            ebitda: current.ebitda || 0,
            ebitdaGrowth: isFinite(ebitdaGrowth) ? ebitdaGrowth : 0,
            fcf: cfData?.freeCashFlow || (cfData?.operatingCashFlow - cfData?.capitalExpenditure) || 0,
            fcfGrowth: isFinite(fcfGrowth) ? fcfGrowth : 0,
            netIncome: current.netIncome || 0,
            netIncomeGrowth: isFinite(netIncomeGrowth) ? netIncomeGrowth : 0,
            operatingIncome: current.operatingIncome || 0,
            operatingIncomeGrowth: isFinite(operatingIncomeGrowth) ? operatingIncomeGrowth : 0
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

  // Custom Tooltip für deutsche Formatierung
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-theme-card p-3 rounded-lg border border-theme/20 shadow-lg">
          <p className="text-theme-primary font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatPercentage(entry.value, true)}
            </p>
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

  return (
    <div className="space-y-8">
      
      {/* Wachstumstrend über Zeit */}
      {historicalData.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-theme-primary mb-4">
            Wachstumstrend über Zeit (YoY)
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="year" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                  domain={['dataMin - 10', 'dataMax + 10']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => {
                    const labels: { [key: string]: string } = {
                      revenueGrowth: 'Umsatz',
                      epsGrowth: 'EPS',
                      ebitdaGrowth: 'EBITDA',
                      netIncomeGrowth: 'Nettogewinn'
                    };
                    return labels[value] || value;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenueGrowth" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: '#3B82F6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="epsGrowth" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: '#10B981' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ebitdaGrowth" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: '#F59E0B' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="netIncomeGrowth" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: '#8B5CF6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* CAGR Vergleich */}
      {cagrData.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-theme-primary mb-4">
            CAGR Vergleich (Compound Annual Growth Rate)
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cagrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="period" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => {
                    const labels: { [key: string]: string } = {
                      revenue: 'Umsatz',
                      eps: 'EPS',
                      ebitda: 'EBITDA',
                      netIncome: 'Nettogewinn'
                    };
                    return labels[value] || value;
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
      {historicalData.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-theme-primary mb-4">
            Absolutes Wachstum (indexiert, Basis = 100)
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={historicalData.map((d) => {
                const baseYear = historicalData[0];
                
                // Sichere Berechnung der indexierten Werte
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
              })}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="year" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  formatter={(value: any) => `${Number(value).toFixed(1)}`}
                  labelFormatter={(label) => `Jahr: ${label}`}
                />
                <Legend 
                  formatter={(value) => {
                    const labels: { [key: string]: string } = {
                      revenueIndexed: 'Umsatz (Index)',
                      epsIndexed: 'EPS (Index)',
                      netIncomeIndexed: 'Nettogewinn (Index)'
                    };
                    return labels[value] || value;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenueIndexed" 
                  fill="#3B82F6" 
                  stroke="#3B82F6"
                  fillOpacity={0.3}
                />
                <Line 
                  type="monotone" 
                  dataKey="epsIndexed" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="netIncomeIndexed" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={{ fill: '#8B5CF6', r: 3 }}
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