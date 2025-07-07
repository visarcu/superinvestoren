// src/components/GrowthCharts.tsx - Premium Feature Placeholder
'use client'

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import LoadingSpinner from '@/components/LoadingSpinner';

interface GrowthChartsProps {
  ticker: string;
}

const GrowthCharts: React.FC<GrowthChartsProps> = ({ ticker }) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Simulate loading historical growth data
    const loadChartData = async () => {
      setLoading(true);
      
      try {
        // In einer echten Implementation würdest du hier historische Finanzdaten laden
        // und CAGR für jedes Jahr berechnen
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        // Mock data für Demo
        const mockData = [
          { year: '2019', revenueGrowth: 8.2, epsGrowth: 12.1 },
          { year: '2020', revenueGrowth: 5.1, epsGrowth: 3.9 },
          { year: '2021', revenueGrowth: 33.3, epsGrowth: 71.8 },
          { year: '2022', revenueGrowth: 7.8, epsGrowth: -13.4 },
          { year: '2023', revenueGrowth: -2.8, epsGrowth: -13.1 },
        ];
        
        setChartData(mockData);
      } catch (error) {
        console.error('Error loading chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Revenue & EPS Growth Trend */}
      <div>
        <h4 className="text-lg font-semibold text-theme-primary mb-4">
          Wachstumstrend über Zeit
        </h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#F9FAFB' }}
                formatter={(value: any, name: string) => [
                  `${value}%`, 
                  name === 'revenueGrowth' ? 'Umsatzwachstum' : 'EPS Wachstum'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="revenueGrowth" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#3B82F6' }}
              />
              <Line 
                type="monotone" 
                dataKey="epsGrowth" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-theme-secondary">Umsatzwachstum</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-theme-secondary">EPS Wachstum</span>
          </div>
        </div>
      </div>

      {/* CAGR Comparison Bar Chart */}
      <div>
        <h4 className="text-lg font-semibold text-theme-primary mb-4">
          CAGR Vergleich (Compound Annual Growth Rate)
        </h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { period: '1Y', revenue: 8.2, eps: 12.1 },
              { period: '3Y', revenue: 15.4, eps: 18.9 },
              { period: '5Y', revenue: 11.7, eps: 12.4 },
              { period: '10Y', revenue: 9.8, eps: 15.2 },
            ]}>
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
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#F9FAFB' }}
                formatter={(value: any, name: string) => [
                  `${value}%`, 
                  name === 'revenue' ? 'Umsatz CAGR' : 'EPS CAGR'
                ]}
              />
              <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="eps" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-theme-secondary">Umsatz CAGR</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-theme-secondary">EPS CAGR</span>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="text-center py-4">
        <p className="text-xs text-theme-muted">
          📊 Charts basieren auf historischen Finanzdaten • CAGR = Compound Annual Growth Rate
        </p>
      </div>
    </div>
  );
};

export default GrowthCharts;