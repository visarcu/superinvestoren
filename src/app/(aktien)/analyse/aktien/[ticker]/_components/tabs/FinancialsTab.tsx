'use client'

import React from 'react'
import ChartCard from '../ChartCard'
import FeyPremiumGate from '../FeyPremiumGate'
import { fmt } from '../../_lib/format'
import type {
  Period,
  BalancePeriod,
  CashFlowPeriod,
  KPIMetric,
  AnalystEstimate,
  ExpandedChartState,
} from '../../_lib/types'

interface FinancialsTabProps {
  ticker: string
  income: Period[]
  balance: BalancePeriod[]
  cashflow: CashFlowPeriod[]
  kpis: Record<string, KPIMetric>
  estimates: AnalystEstimate[]
  financialPeriod: 'annual' | 'quarterly'
  setFinancialPeriod: (p: 'annual' | 'quarterly') => void
  setExpandedChart: (s: ExpandedChartState | null) => void
  isPremium: boolean
  userLoading: boolean
  /** Herkunft: sec-xbrl (US/international), finclue-manual (eigene DAX-Daten), no-data (DAX, noch leer) */
  dataSource?: 'sec-xbrl' | 'finclue-manual' | 'no-data' | null
  dataNotice?: string | null
}

export default function FinancialsTab({
  ticker,
  income,
  balance,
  cashflow,
  kpis,
  estimates,
  financialPeriod,
  setFinancialPeriod,
  setExpandedChart,
  isPremium,
  userLoading,
  dataSource,
  dataNotice,
}: FinancialsTabProps) {
  // Quartalsansicht ist Premium. Free-User können den Toggle anklicken,
  // sehen aber im quarterly-Mode statt der Daten das Premium-Gate.
  const showQuarterlyGate = financialPeriod === 'quarterly' && !isPremium
  const guidanceRev = kpis['guidance_revenue']?.data?.slice(-1)[0]?.value
  const guidanceRevLabel = kpis['guidance_revenue']?.data?.slice(-1)[0]?.period
  const segmentKpis = Object.entries(kpis).filter(
    ([k]) => !k.startsWith('guidance_') && !k.startsWith('gaap_') && k !== 'total_revenue'
  )

  // Analysten-Forecasts nur für Jahre anhängen, die ÜBER dem letzten Ist-Jahr liegen —
  // verhindert Doppel-Bars für bereits berichtete Jahre.
  const lastIncomeYear = income.length > 0 ? parseInt(income[income.length - 1].period, 10) : 0
  const revenueForecasts = estimates
    .filter(e => e.year > lastIncomeYear && e.revenue.avg !== null)
    .slice(0, 4)
    .map(e => ({ period: String(e.year), value: e.revenue.avg as number }))
  const epsForecasts = estimates
    .filter(e => e.year > lastIncomeYear && e.eps.avg !== null)
    .slice(0, 4)
    .map(e => ({ period: String(e.year), value: e.eps.avg as number }))

  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* Period Toggle + Daten-Quelle Indikator (dezent, Fey-Stil) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
          className={`px-4 py-1.5 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            financialPeriod === 'quarterly' ? 'bg-white/[0.08] text-white' : 'text-white/25 hover:text-white/40'
          }`}
        >
          Quartalsweise
          {!isPremium && (
            <svg className="w-3 h-3 text-violet-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          )}
        </button>
      </div>

      {/* Daten-Quelle: dezenter inline-Indikator */}
      {dataSource === 'finclue-manual' && (
        <div
          className="group flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/50 transition-colors cursor-default select-none"
          title={dataNotice ?? 'Eigene Daten aus dem ESEF-Jahresfinanzbericht'}
        >
          <span className="w-1 h-1 rounded-full bg-emerald-400/70" />
          <span className="uppercase tracking-widest">ESEF · Finclue</span>
        </div>
      )}
      {dataSource === 'no-data' && (
        <div
          className="flex items-center gap-1.5 text-[10px] text-white/30 select-none"
          title={dataNotice ?? ''}
        >
          <span className="w-1 h-1 rounded-full bg-amber-400/60 animate-pulse" />
          <span className="uppercase tracking-widest">In Vorbereitung</span>
        </div>
      )}
      </div>

      {/* Empty-State: DAX-Firma ohne Daten → dezenter Hinweis statt leerer Charts */}
      {dataSource === 'no-data' && income.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl border border-white/[0.04] bg-white/[0.01]">
          <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-pulse" />
          </div>
          <div className="text-[13px] font-medium text-white/70 mb-1.5">
            Finanzdaten in Vorbereitung
          </div>
          <div className="text-[12px] text-white/40 max-w-md text-center leading-relaxed">
            {dataNotice ?? 'Wir pflegen die Daten dieser Firma gerade manuell aus dem offiziellen ESEF-Jahresfinanzbericht ein.'}
          </div>
        </div>
      )}

      {/* Quartalsansicht für Free-User → Premium-Gate */}
      {showQuarterlyGate && (
        <FeyPremiumGate
          isPremium={false}
          loading={userLoading}
          feature="Quartalszahlen"
          description={`Quartalsweise Umsatz-, EPS- und KPI-Daten aus Earnings Reports für ${ticker}.`}
        >
          {/* Dummy-Inhalt hinter dem Blur, damit das Overlay nicht auf weißem Grund schwebt */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-56 rounded-2xl bg-[#0c0c16] border border-white/[0.04]" />
            ))}
          </div>
        </FeyPremiumGate>
      )}

      {/* Quartalsansicht für Premium: KPI-basiert */}
      {!showQuarterlyGate && financialPeriod === 'quarterly' && Object.keys(kpis).length > 0 ? (
        <div>
          <p className="text-[11px] text-white/35 uppercase tracking-widest font-medium mb-3">
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
            <p className="text-[10px] text-white/30 mt-3">
              Guidance: Revenue {guidanceRevLabel} = {fmt(guidanceRev * 1e6)}
              {kpis['guidance_gross_margin'] &&
                ` · Gross Margin ${kpis['guidance_gross_margin'].data.slice(-1)[0]?.value}%`}
            </p>
          )}
        </div>
      ) : !showQuarterlyGate && financialPeriod === 'quarterly' ? (
        <div className="text-center py-20">
          <p className="text-white/35 text-[14px]">Keine Quartalsdaten für {ticker}</p>
          <p className="text-white/25 text-[12px] mt-1">
            Quartalsdaten verfügbar für: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX
          </p>
        </div>
      ) : null}

      {/* Jahresansicht: SEC XBRL */}
      {financialPeriod === 'annual' && (
        <>
          <div>
            <p className="text-[11px] text-white/35 uppercase tracking-widest font-medium mb-3">
              Gewinn- & Verlustrechnung
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ChartCard
                data={income}
                dataKey="revenue"
                label="Umsatz"
                color="#fff"
                forecasts={revenueForecasts}
                onExpand={() =>
                  setExpandedChart({
                    data: income,
                    dataKey: 'revenue',
                    label: 'Umsatz',
                    color: '#fff',
                    forecasts: revenueForecasts,
                  })
                }
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
                forecasts={epsForecasts}
                onExpand={() =>
                  setExpandedChart({
                    data: income,
                    dataKey: 'eps',
                    label: 'Gewinn je Aktie',
                    color: '#fbbf24',
                    format: 'dollar',
                    forecasts: epsForecasts,
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
            {(revenueForecasts.length > 0 || epsForecasts.length > 0) && (
              <p className="text-[10px] text-white/25 mt-3">
                Perioden mit Suffix <span className="text-white/40">e</span> = Analysten-Konsensus
                (Sell-Side)
              </p>
            )}
          </div>

          {/* Segment Revenue (wenn vorhanden) */}
          {segmentKpis.length > 0 && (
            <div>
              <p className="text-[11px] text-white/35 uppercase tracking-widest font-medium mb-3">
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
            <p className="text-[11px] text-white/35 uppercase tracking-widest font-medium mb-3">Cashflow</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ChartCard data={cashflow} dataKey="operatingCashFlow" label="Operativer Cashflow" color="#22d3ee" />
              <ChartCard data={cashflow} dataKey="freeCashFlow" label="Free Cashflow" color="#f97316" />
              <ChartCard data={cashflow} dataKey="shareRepurchase" label="Aktienrückkäufe" color="#e879f9" />
            </div>
          </div>

          {/* Bilanz */}
          <div>
            <p className="text-[11px] text-white/35 uppercase tracking-widest font-medium mb-3">Bilanz</p>
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
