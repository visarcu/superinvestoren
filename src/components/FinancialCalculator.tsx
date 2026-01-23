import React, { useState } from 'react'
import { CalculatorIcon, ChartBarIcon, ArrowTrendingUpIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

// FIXED: Type definitions for all functions
const calculatePE = (price: number, eps: number): number | null => eps > 0 ? price / eps : null
const calculatePEG = (pe: number | null, growth: number): number | null => growth > 0 && pe ? pe / growth : null
const calculateROE = (netIncome: number, equity: number): number | null => equity > 0 ? (netIncome / equity) * 100 : null
const calculateDividendYield = (dividend: number, price: number): number | null => price > 0 ? (dividend / price) * 100 : null

const formatMetric = (value: number | null, type: string): string => {
  if (value === null || value === undefined) return 'N/A'
  switch (type) {
    case 'percentage': return `${value.toFixed(1)}%`
    case 'ratio': return value.toFixed(2)
    case 'currency': return `${value.toLocaleString()}`
    default: return value.toString()
  }
}

const getValuationColor = (pe: number | null): string => {
  if (!pe) return 'text-gray-400'
  if (pe < 15) return 'text-brand-light'
  if (pe > 25) return 'text-red-400'
  return 'text-yellow-400'
}

// FIXED: Interface for inputs
interface CalculatorInputs {
  price: number
  eps: number
  bookValue: number
  revenue: number
  marketCap: number
  netIncome: number
  shareholdersEquity: number
  totalDebt: number
  dividend: number
  growthRate: number
  freeCashFlow: number
  discountRate: number
  terminalGrowth: number
  year1Growth: number
  year2Growth: number
  year3Growth: number
  year4Growth: number
  year5Growth: number
}

export default function FinancialCalculator() {
  const [activeTab, setActiveTab] = useState<string>('valuation')
  const [inputs, setInputs] = useState<CalculatorInputs>({
    // Stock inputs
    price: 150,
    eps: 6.5,
    bookValue: 4.8,
    revenue: 365000000000,
    marketCap: 2400000000000,
    netIncome: 94000000000,
    shareholdersEquity: 63000000000,
    totalDebt: 120000000000,
    dividend: 0.95,
    growthRate: 12,
    
    // DCF inputs
    freeCashFlow: 80000000000,
    discountRate: 10,
    terminalGrowth: 3,
    year1Growth: 15,
    year2Growth: 12,
    year3Growth: 10,
    year4Growth: 8,
    year5Growth: 6
  })

  const updateInput = (key: keyof CalculatorInputs, value: string): void => {
    setInputs(prev => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  // Calculate metrics
  const metrics = {
    pe: calculatePE(inputs.price, inputs.eps),
    peg: calculatePEG(calculatePE(inputs.price, inputs.eps), inputs.growthRate),
    pb: inputs.bookValue > 0 ? inputs.price / inputs.bookValue : null,
    ps: inputs.revenue > 0 ? inputs.marketCap / inputs.revenue : null,
    roe: calculateROE(inputs.netIncome, inputs.shareholdersEquity),
    debtToEquity: inputs.shareholdersEquity > 0 ? inputs.totalDebt / inputs.shareholdersEquity : null,
    dividendYield: calculateDividendYield(inputs.dividend, inputs.price)
  }

  // Simple DCF calculation
  const calculateDCF = (): number => {
    const { freeCashFlow, discountRate, terminalGrowth, year1Growth, year2Growth, year3Growth, year4Growth, year5Growth } = inputs
    const growthRates = [year1Growth, year2Growth, year3Growth, year4Growth, year5Growth]
    
    let projectedCFs: number[] = []
    let currentCF = freeCashFlow
    
    for (let i = 0; i < 5; i++) {
      currentCF = currentCF * (1 + growthRates[i] / 100)
      projectedCFs.push(currentCF)
    }
    
    const terminalCF = projectedCFs[4] * (1 + terminalGrowth / 100)
    const terminalValue = terminalCF / (discountRate / 100 - terminalGrowth / 100)
    
    let presentValue = 0
    for (let i = 0; i < projectedCFs.length; i++) {
      presentValue += projectedCFs[i] / Math.pow(1 + discountRate / 100, i + 1)
    }
    
    const pvTerminal = terminalValue / Math.pow(1 + discountRate / 100, 5)
    return presentValue + pvTerminal
  }

  const dcfValue = calculateDCF()

  // FIXED: Component Props interfaces
  interface TabButtonProps {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }

  interface InputFieldProps {
    label: string
    value: number
    onChange: (value: string) => void
    suffix?: string
    type?: string
  }

  interface MetricCardProps {
    label: string
    value: string
    color?: string
    description?: string
  }

  const TabButton: React.FC<TabButtonProps> = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        activeTab === id
          ? 'bg-brand/20 text-brand-light border border-green-500/30'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )

  const InputField: React.FC<InputFieldProps> = ({ label, value, onChange, suffix = '', type = 'number' }) => (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )

  const MetricCard: React.FC<MetricCardProps> = ({ label, value, color = 'text-white', description }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Finclue Financial Calculator</h1>
        <p className="text-gray-400">Erweiterte Kennzahlen-Analyse und DCF-Bewertung</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        <TabButton id="valuation" label="Bewertung" icon={ChartBarIcon} />
        <TabButton id="profitability" label="Profitabilität" icon={ArrowTrendingUpIcon} />
        <TabButton id="dcf" label="DCF Analyse" icon={CurrencyDollarIcon} />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CalculatorIcon className="w-5 h-5" />
              Parameter eingeben
            </h3>
            
            {activeTab === 'valuation' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Aktienkurs"
                  value={inputs.price}
                  onChange={(v) => updateInput('price', v)}
                  suffix="$"
                />
                <InputField
                  label="Gewinn je Aktie (EPS)"
                  value={inputs.eps}
                  onChange={(v) => updateInput('eps', v)}
                  suffix="$"
                />
                <InputField
                  label="Buchwert je Aktie"
                  value={inputs.bookValue}
                  onChange={(v) => updateInput('bookValue', v)}
                  suffix="$"
                />
                <InputField
                  label="Wachstumsrate"
                  value={inputs.growthRate}
                  onChange={(v) => updateInput('growthRate', v)}
                  suffix="%"
                />
                <InputField
                  label="Marktkapitalisierung"
                  value={inputs.marketCap}
                  onChange={(v) => updateInput('marketCap', v)}
                  suffix="$"
                />
                <InputField
                  label="Umsatz"
                  value={inputs.revenue}
                  onChange={(v) => updateInput('revenue', v)}
                  suffix="$"
                />
              </div>
            )}

            {activeTab === 'profitability' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Nettogewinn"
                  value={inputs.netIncome}
                  onChange={(v) => updateInput('netIncome', v)}
                  suffix="$"
                />
                <InputField
                  label="Eigenkapital"
                  value={inputs.shareholdersEquity}
                  onChange={(v) => updateInput('shareholdersEquity', v)}
                  suffix="$"
                />
                <InputField
                  label="Gesamtverschuldung"
                  value={inputs.totalDebt}
                  onChange={(v) => updateInput('totalDebt', v)}
                  suffix="$"
                />
                <InputField
                  label="Dividende je Aktie"
                  value={inputs.dividend}
                  onChange={(v) => updateInput('dividend', v)}
                  suffix="$"
                />
              </div>
            )}

            {activeTab === 'dcf' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Free Cash Flow"
                  value={inputs.freeCashFlow}
                  onChange={(v) => updateInput('freeCashFlow', v)}
                  suffix="$"
                />
                <InputField
                  label="Diskontierungssatz"
                  value={inputs.discountRate}
                  onChange={(v) => updateInput('discountRate', v)}
                  suffix="%"
                />
                <InputField
                  label="Terminal-Wachstum"
                  value={inputs.terminalGrowth}
                  onChange={(v) => updateInput('terminalGrowth', v)}
                  suffix="%"
                />
                <InputField
                  label="Jahr 1 Wachstum"
                  value={inputs.year1Growth}
                  onChange={(v) => updateInput('year1Growth', v)}
                  suffix="%"
                />
                <InputField
                  label="Jahr 2 Wachstum"
                  value={inputs.year2Growth}
                  onChange={(v) => updateInput('year2Growth', v)}
                  suffix="%"
                />
                <InputField
                  label="Jahr 3 Wachstum"
                  value={inputs.year3Growth}
                  onChange={(v) => updateInput('year3Growth', v)}
                  suffix="%"
                />
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              {activeTab === 'valuation' && 'Bewertungskennzahlen'}
              {activeTab === 'profitability' && 'Profitabilitätskennzahlen'}
              {activeTab === 'dcf' && 'DCF Bewertung'}
            </h3>
            
            {activeTab === 'valuation' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard
                  label="P/E-Verhältnis"
                  value={formatMetric(metrics.pe, 'ratio')}
                  color={getValuationColor(metrics.pe)}
                  description="Kurs-Gewinn-Verhältnis"
                />
                <MetricCard
                  label="PEG-Verhältnis"
                  value={formatMetric(metrics.peg, 'ratio')}
                  color={metrics.peg && metrics.peg < 1 ? 'text-brand-light' : 'text-yellow-400'}
                  description="P/E relativ zum Wachstum"
                />
                <MetricCard
                  label="P/B-Verhältnis"
                  value={formatMetric(metrics.pb, 'ratio')}
                  description="Kurs-Buchwert-Verhältnis"
                />
                <MetricCard
                  label="P/S-Verhältnis"
                  value={formatMetric(metrics.ps, 'ratio')}
                  description="Kurs-Umsatz-Verhältnis"
                />
              </div>
            )}

            {activeTab === 'profitability' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard
                  label="Return on Equity"
                  value={formatMetric(metrics.roe, 'percentage')}
                  color={metrics.roe && metrics.roe > 15 ? 'text-brand-light' : 'text-yellow-400'}
                  description="Eigenkapitalrendite"
                />
                <MetricCard
                  label="Debt-to-Equity"
                  value={formatMetric(metrics.debtToEquity, 'ratio')}
                  color={metrics.debtToEquity && metrics.debtToEquity < 0.3 ? 'text-brand-light' : 'text-red-400'}
                  description="Verschuldungsgrad"
                />
                <MetricCard
                  label="Dividendenrendite"
                  value={formatMetric(metrics.dividendYield, 'percentage')}
                  description="Jährliche Dividende"
                />
                <MetricCard
                  label="Bewertung"
                  value={
                    metrics.pe && metrics.pe < 15 && metrics.roe && metrics.roe > 15 
                      ? "Unterbewertet" 
                      : metrics.pe && metrics.pe > 25 
                        ? "Überbewertet" 
                        : "Fair bewertet"
                  }
                  color={
                    metrics.pe && metrics.pe < 15 && metrics.roe && metrics.roe > 15 
                      ? "text-brand-light" 
                      : metrics.pe && metrics.pe > 25 
                        ? "text-red-400" 
                        : "text-yellow-400"
                  }
                  description="Gesamtbewertung"
                />
              </div>
            )}

            {activeTab === 'dcf' && (
              <div className="space-y-4">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
                  <div className="text-sm text-gray-400 mb-2">Innerer Wert (DCF)</div>
                  <div className="text-4xl font-bold text-brand-light">
                    ${(dcfValue / inputs.marketCap * inputs.price).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">pro Aktie</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard
                    label="Aktueller Kurs"
                    value={`$${inputs.price}`}
                    description="Marktpreis"
                  />
                  <MetricCard
                    label="Upside/Downside"
                    value={formatMetric(((dcfValue / inputs.marketCap * inputs.price) / inputs.price - 1) * 100, 'percentage')}
                    color={
                      dcfValue / inputs.marketCap * inputs.price > inputs.price 
                        ? 'text-brand-light' 
                        : 'text-red-400'
                    }
                    description="Potential vs. Markt"
                  />
                </div>
                
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Annahmen</h4>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>Diskontierungssatz: {inputs.discountRate}%</div>
                    <div>Terminal-Wachstum: {inputs.terminalGrowth}%</div>
                    <div>5-Jahres Projektionszeitraum</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Integration Info */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <CalculatorIcon className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Finclue AI Integration</h3>
        </div>
        <p className="text-gray-300 text-sm">
          Diese Berechnungen werden automatisch in der Finclue AI verwendet, um dir 
          präzise und datenbasierte Aktienanalysen zu liefern. Frage die AI nach 
          Bewertungen, Risiken oder Vergleichen - sie nutzt diese erweiterten Kennzahlen 
          für fundierte Antworten.
        </p>
      </div>
    </div>
  )
}