'use client'

import React from 'react'
import ChartCard from '../ChartCard'
import { fmt } from '../../_lib/format'
import type {
  Period,
  BalancePeriod,
  CashFlowPeriod,
  KPIMetric,
  ExpandedChartState,
} from '../../_lib/types'

interface FinancialsTabProps {
  ticker: string
  income: Period[]
  balance: BalancePeriod[]
  cashflow: CashFlowPeriod[]
  kpis: Record<string, KPIMetric>
  financialPeriod: 'annual' | 'quarterly'
  setFinancialPeriod: (p: 'annual' | 'quarterly') => void
  setExpandedChart: (s: ExpandedChartState | null) => void
}

export default function FinancialsTab({
  ticker,
  income,
  balance,
  cashflow,
  kpis,
  financialPeriod,
  setFinancialPeriod,
  setExpandedChart,
}: FinancialsTabProps) {
  const guidanceRev = kpis['guidance_revenue']?.data?.slice(-1)[0]?.value
  const guidanceRevLabel = kpis['guidance_revenue']?.data?.slice(-1)[0]?.period
  const segmentKpis = Object.entries(kpis).filter(
    ([k]) => !k.startsWith('guidance_') && !k.startsWith('gaap_') && k !== 'total_revenue'
  )

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Period Toggle */}
      <div className="flex items-center gap-1 bg-white/[0.02] rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setFinancialPeriod('annual')}
          className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
            financialPeriod === 'annual' ? 'bg-white/[0.08] text-white' : 'text-white/25 hover:text-white/40'
          }`}
        >
          Jährlich
        </button>
        <button
          onClick={() => setFinancialPeriod('quarterly')}
          className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
            financialPeriod === 'quarterly' ? 'bg-white/[0.08] text-white' : 'text-white/25 hover:text-white/40'
          }`}
        >
          Quartalsweise
        </button>
      </div>

      {/* Quartalsansicht: KPI-basiert */}
      {financialPeriod === 'quarterly' && Object.keys(kpis).length > 0 ? (
        <div>
          <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">
            Quartalszahlen (aus Earnings Reports)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(kpis)
              .filter(([k]) => !k.startsWith('guidance_'))
              .map(([key, metric]) => {
                const chartData = metric.data.map((d: any) => ({
                  period: d.period,
                  [key]: metric.unit === 'millions' ? d.value * 1e6 : d.value,
                }))
                // Guidance für dieses Segment?
                const gKey = `guidance_${key.replace('total_', '')}`
                const gVal = kpis[gKey]?.data?.slice(-1)[0]
                return (
                  <ChartCard
                    key={key}
                    data={chartData}
                    dataKey={key}
                    label={metric.label}
                    color="#22c55e"
                    guidanceValue={gVal ? (metric.unit === 'millions' ? gVal.value * 1e6 : gVal.value) : null}
                    guidanceLabel={gVal?.period}
                    onExpand={() =>
                      setExpandedChart({ data: chartData, dataKey: key, label: metric.label, color: '#22c55e' })
                    }
                  />
                )
              })}
          </div>
          {guidanceRev && (
            <p className="text-[10px] text-white/15 mt-3">
              Guidance: Revenue {guidanceRevLabel} = {fmt(guidanceRev * 1e6)}
              {kpis['guidance_gross_margin'] &&
                ` · Gross Margin ${kpis['guidance_gross_margin'].data.slice(-1)[0]?.value}%`}
            </p>
          )}
        </div>
      ) : financialPeriod === 'quarterly' ? (
        <div className="text-center py-20">
          <p className="text-white/20 text-[14px]">Keine Quartalsdaten für {ticker}</p>
          <p className="text-white/10 text-[12px] mt-1">
            Quartalsdaten verfügbar für: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX
          </p>
        </div>
      ) : null}

      {/* Jahresansicht: SEC XBRL */}
      {financialPeriod === 'annual' && (
        <>
          <div>
            <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">
              Gewinn- & Verlustrechnung
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ChartCard
                data={income}
                dataKey="revenue"
                label="Umsatz"
                color="#fff"
                onExpand={() => setExpandedChart({ data: income, dataKey: 'revenue', label: 'Umsatz', color: '#fff' })}
              />
              <ChartCard
                data={income}
                dataKey="netIncome"
                label="Nettogewinn"
                color="#4ade80"
                onExpand={() =>
                  setExpandedChart({ data: income, dataKey: 'netIncome', label: 'Nettogewinn', color: '#4ade80' })
                }
              />
              <ChartCard
                data={income}
                dataKey="grossProfit"
                label="Bruttogewinn"
                color="#60a5fa"
                onExpand={() =>
                  setExpandedChart({ data: income, dataKey: 'grossProfit', label: 'Bruttogewinn', color: '#60a5fa' })
                }
              />
              <ChartCard
                data={income}
                dataKey="operatingIncome"
                label="Operatives Ergebnis"
                color="#c084fc"
                onExpand={() =>
                  setExpandedChart({
                    data: income,
                    dataKey: 'operatingIncome',
                    label: 'Operatives Ergebnis',
                    color: '#c084fc',
                  })
                }
              />
              <ChartCard
                data={income}
                dataKey="eps"
                label="Gewinn je Aktie"
                color="#fbbf24"
                format="dollar"
                onExpand={() =>
                  setExpandedChart({
                    data: income,
                    dataKey: 'eps',
                    label: 'Gewinn je Aktie',
                    color: '#fbbf24',
                    format: 'dollar',
                  })
                }
              />
              <ChartCard
                data={income}
                dataKey="researchAndDevelopment"
                label="F&E Aufwand"
                color="#f472b6"
                onExpand={() =>
                  setExpandedChart({
                    data: income,
                    dataKey: 'researchAndDevelopment',
                    label: 'F&E Aufwand',
                    color: '#f472b6',
                  })
                }
              />
            </div>
          </div>

          {/* Segment Revenue (wenn vorhanden) */}
          {segmentKpis.length > 0 && (
            <div>
              <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">
                Umsatz nach Segmenten
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {segmentKpis.map(([key, metric]) => {
                  // KPI Daten in ChartCard Format umwandeln
                  const chartData = metric.data.map((d: any) => ({
                    period: d.period.replace('Q1 ', '').replace('Q2 ', '').replace('Q3 ', '').replace('Q4 ', ''),
                    [key]: metric.unit === 'millions' ? d.value * 1e6 : d.value,
                  }))
                  return <ChartCard key={key} data={chartData} dataKey={key} label={metric.label} color="#22c55e" />
                })}
              </div>
            </div>
          )}

          {/* Cash Flow */}
          <div>
            <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Cashflow</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ChartCard data={cashflow} dataKey="operatingCashFlow" label="Operativer Cashflow" color="#22d3ee" />
              <ChartCard data={cashflow} dataKey="freeCashFlow" label="Free Cashflow" color="#f97316" />
              <ChartCard data={cashflow} dataKey="shareRepurchase" label="Aktienrückkäufe" color="#e879f9" />
            </div>
          </div>

          {/* Bilanz */}
          <div>
            <p className="text-[11px] text-white/20 uppercase tracking-widest font-medium mb-3">Bilanz</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ChartCard data={balance} dataKey="totalAssets" label="Bilanzsumme" color="#a78bfa" />
              <ChartCard data={balance} dataKey="cash" label="Barmittel" color="#34d399" />
              <ChartCard data={balance} dataKey="longTermDebt" label="Langfristige Schulden" color="#fb923c" />
              <ChartCard data={balance} dataKey="shareholdersEquity" label="Eigenkapital" color="#38bdf8" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
