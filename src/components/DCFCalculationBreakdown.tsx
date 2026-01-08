// src/components/DCFCalculationBreakdown.tsx - COMPLETE FIXED VERSION
'use client'

import React from 'react'
import { 
  XMarkIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalculatorIcon 
} from '@heroicons/react/24/outline'

// ✅ FIXED: Define interfaces locally to avoid dependency issues
interface DCFResults {
  projections: Array<{
    year: number
    revenue: number
    operatingIncome: number
    nopat: number
    capex: number
    workingCapChange: number
    fcf: number
    presentValue: number
  }>
  terminalValue: number
  terminalPV: number
  pvOfProjections: number
  enterpriseValue: number
  equityValue: number
  valuePerShare: number
  currentPrice: number
  upside: number
}

interface DCFAssumptions {
  revenueGrowthY1: number
  revenueGrowthY2: number
  revenueGrowthY3: number
  revenueGrowthY4: number
  revenueGrowthY5: number
  terminalGrowthRate: number
  discountRate: number
  operatingMargin: number
  taxRate: number
  capexAsRevenuePercent: number
  workingCapitalChange: number
  netCash: number
}

interface DCFCalculationBreakdownProps {
  isOpen: boolean
  onClose: () => void
  results: DCFResults
  assumptions: DCFAssumptions
  currentRevenue: number
  currentShares: number
  companyName: string
  ticker: string
  fcfDataSource?: string
  isEstimated?: boolean
  // ✅ ADDED: Real current FCF data
  currentFreeCashFlow?: number
  fcfDataType?: string
  fcfDate?: string
}

export const DCFCalculationBreakdown: React.FC<DCFCalculationBreakdownProps> = ({
  isOpen,
  onClose,
  results,
  assumptions,
  currentRevenue,
  currentShares,
  companyName,
  ticker,
  fcfDataSource = 'api',
  isEstimated = false,
  currentFreeCashFlow, // ✅ ADDED
  fcfDataType,         // ✅ ADDED
  fcfDate              // ✅ ADDED
}) => {
  if (!isOpen) return null

  const formatCurrency = (value: number) => 
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatNumber = (value: number, decimals = 1) => 
    value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

  const formatMillion = (value: number) => 
    `$${(value / 1000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`

  // Calculate step-by-step values
  const projectedRevenue5Y = results.projections[4].revenue
  const projectedFCF5Y = results.projections[4].fcf
  const terminalFCF = projectedFCF5Y * (1 + assumptions.terminalGrowthRate / 100)

  // ✅ PROFESSIONAL: Simplified FCF source display
  const getFCFSourceText = () => {
    switch (fcfDataSource) {
      case 'annual-cashflow-statement':
        return 'Annual Cash Flow Statement'
      case 'ttm-keymetrics':
        return 'TTM Key Metrics'
      case 'latest-statement':
        return 'Latest Cash Flow Statement'
      case 'calculated-ocf-capex':
        return 'Berechnet: Operating CF - CapEx'
      case 'estimated-fallback':
        return 'Geschätzt (Fallback - unzuverlässig)'
      default:
        return 'Standard API Daten'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-theme-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme/10">
          <div>
            <h2 className="text-xl font-bold text-theme-primary">DCF Berechnung im Detail</h2>
            <p className="text-sm text-theme-secondary">{companyName} ({ticker})</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-theme-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-8">
            
            {/* Step 1: Project Free Cash Flow */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-theme-primary">Schritt 1: Freie Cashflow Projektion</h3>
              
              {/* ✅ PROFESSIONAL: Simplified FCF Data Source Info */}
              <div className="p-4 bg-theme-secondary border border-theme/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-theme-primary font-medium">
                      FCF-Datenquelle: {getFCFSourceText()}
                    </p>
                    <p className="text-theme-muted text-sm mt-1">
                      {fcfDate ? `Daten vom ${fcfDate}` : 'Aktuelle Finanzdaten'} • 
                      {isEstimated ? ' Geschätzte Werte' : ' Echte Finanzdaten'}
                    </p>
                  </div>
                </div>
              </div>

              {/* ✅ FIXED: Show REAL current FCF, not projected FCF */}
              <div className="space-y-2 text-sm text-theme-secondary">
                <p>• <strong>Der aktuelle freie Cashflow von {companyName} beträgt {
                  currentFreeCashFlow ? formatMillion(currentFreeCashFlow) : formatMillion(results.projections[0].fcf)
                } {isEstimated ? '(geschätzt)' : '(FMP Premium API)'}</strong></p>
                <p>• Wir projizieren dies für 5 Jahre mit durchschnittlichen Wachstumsraten von {formatNumber((assumptions.revenueGrowthY1 + assumptions.revenueGrowthY2 + assumptions.revenueGrowthY3 + assumptions.revenueGrowthY4 + assumptions.revenueGrowthY5) / 5)}%.</p>
                <p className="font-medium">• Nach 5 Jahren erwarten wir einen freien Cashflow von {formatMillion(projectedFCF5Y)}.</p>
              </div>
              
              {/* ✅ ENHANCED: Show Starting Point vs Projections */}
              <div className="bg-theme-secondary rounded-lg p-4">
                <div className="mb-3">
                  <h4 className="text-sm font-semibold text-theme-primary mb-2">Ausgangspunkt & 5-Jahres-Projektionen</h4>
                  
                  {/* Headers */}
                  <div className="grid grid-cols-6 gap-4 text-xs font-medium text-theme-muted mb-2 pb-2 border-b border-theme/10">
                    <div>Jahr</div>
                    <div className="text-right">Umsatz</div>
                    <div className="text-right">Op. Marge</div>
                    <div className="text-right">NOPAT</div>
                    <div className="text-right">CapEx</div>
                    <div className="text-right">FCF</div>
                  </div>
                  
                  {/* ✅ CURRENT YEAR (Year 0) - Shows REAL FCF */}
                  <div className="grid grid-cols-6 gap-4 text-xs text-theme-primary py-2 bg-blue-500/10 rounded mb-2">
                    <div className="font-bold">Aktuell</div>
                    <div className="text-right">{formatMillion(currentRevenue)}</div>
                    <div className="text-right text-theme-muted">-</div>
                    <div className="text-right text-theme-muted">-</div>
                    <div className="text-right text-theme-muted">-</div>
                    <div className="text-right font-bold text-blue-400">
                      {currentFreeCashFlow ? formatMillion(currentFreeCashFlow) : 'N/A'}
                    </div>
                  </div>
                  
                  {/* Projected Years */}
                  {results.projections.map((projection) => (
                    <div key={projection.year} className="grid grid-cols-6 gap-4 text-xs text-theme-primary py-1">
                      <div>Jahr {projection.year}</div>
                      <div className="text-right">{formatMillion(projection.revenue)}</div>
                      <div className="text-right">{formatNumber(assumptions.operatingMargin)}%</div>
                      <div className="text-right">{formatMillion(projection.nopat)}</div>
                      <div className="text-right">{formatMillion(projection.capex)}</div>
                      <div className="text-right font-medium text-brand-light">{formatMillion(projection.fcf)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Calculate Terminal Value */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-theme-primary">Schritt 2: Terminal Value berechnen</h3>
              <div className="space-y-2 text-sm text-theme-secondary">
                <p>• Nach Jahr 5 nehmen wir an, dass {companyName} mit einer nachhaltigen Rate von {formatNumber(assumptions.terminalGrowthRate)}% wächst.</p>
                <p>• Terminal FCF (Jahr 6): {formatMillion(projectedFCF5Y)} × (1 + {formatNumber(assumptions.terminalGrowthRate)}%) = {formatMillion(terminalFCF)}</p>
                <p>• Formel: Terminal Value = Terminal FCF ÷ (WACC - Terminal Growth)</p>
                <p className="font-medium">• Terminal Value = {formatMillion(terminalFCF)} ÷ ({formatNumber(assumptions.discountRate)}% - {formatNumber(assumptions.terminalGrowthRate)}%) = {formatMillion(results.terminalValue)}</p>
              </div>
              
              {/* Terminal Value Breakdown */}
              <div className="bg-theme-secondary rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-theme-muted mb-1">Terminal FCF (Jahr 6)</div>
                    <div className="font-medium text-theme-primary">{formatMillion(terminalFCF)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">Terminal Value</div>
                    <div className="font-medium text-purple-400">{formatMillion(results.terminalValue)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Discount to Present Value */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-theme-primary">Schritt 3: Barwert-Diskontierung</h3>
              <div className="space-y-2 text-sm text-theme-secondary">
                <p>• Alle zukünftigen Cashflows werden mit dem WACC von {formatNumber(assumptions.discountRate)}% auf heute diskontiert.</p>
                <p>• Barwert der 5-Jahres-Projektionen: {formatMillion(results.pvOfProjections)}</p>
                <p>• Barwert des Terminal Values: {formatMillion(results.terminalPV)}</p>
                <p className="font-medium">• Gesamter Unternehmenswert: {formatMillion(results.enterpriseValue)}</p>
              </div>
              
              {/* Present Value Breakdown */}
              <div className="bg-theme-secondary rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-theme-muted mb-1">PV der 5-Jahre FCFs</div>
                    <div className="font-medium text-theme-primary">{formatMillion(results.pvOfProjections)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">PV des Terminal Values</div>
                    <div className="font-medium text-theme-primary">{formatMillion(results.terminalPV)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">Enterprise Value</div>
                    <div className="font-medium text-blue-400">{formatMillion(results.enterpriseValue)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Calculate Equity Value */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-theme-primary">Schritt 4: Eigenkapitalwert berechnen</h3>
              <div className="space-y-2 text-sm text-theme-secondary">
                <p>• Unternehmenswert: {formatMillion(results.enterpriseValue)}</p>
                <p>• Plus: Netto-Cash Position: {formatMillion(assumptions.netCash / 1000)}</p>
                <p className="font-medium">• Eigenkapitalwert: {formatMillion(results.equityValue)}</p>
              </div>
              
              {/* Equity Value Breakdown */}
              <div className="bg-theme-secondary rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-theme-muted mb-1">Enterprise Value</div>
                    <div className="font-medium text-theme-primary">{formatMillion(results.enterpriseValue)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">Net Cash</div>
                    <div className="font-medium text-theme-primary">{formatMillion(assumptions.netCash / 1000)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">Equity Value</div>
                    <div className="font-medium text-brand-light">{formatMillion(results.equityValue)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Per Share Value */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-theme-primary">Schritt 5: Wert pro Aktie berechnen</h3>
              <div className="space-y-2 text-sm text-theme-secondary">
                <p>• Eigenkapitalwert: {formatMillion(results.equityValue)}</p>
                <p>• Aktien im Umlauf: {formatNumber(currentShares / 1000, 1)}B Aktien</p>
                <p>• Formel: Wert pro Aktie = Eigenkapitalwert ÷ Aktien im Umlauf</p>
                <p className="font-medium text-brand-light">• DCF Fairer Wert: {formatCurrency(results.valuePerShare)} pro Aktie</p>
              </div>
              
              {/* ✅ PROFESSIONAL: Neutral Per Share Breakdown */}
              <div className="bg-theme-secondary border border-theme/20 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-theme-muted mb-1">Equity Value</div>
                    <div className="font-medium text-theme-primary">{formatMillion(results.equityValue)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">Shares Outstanding</div>
                    <div className="font-medium text-theme-primary">{formatNumber(currentShares / 1000, 1)}B</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">Value per Share</div>
                    <div className="font-bold text-blue-400 text-lg">{formatCurrency(results.valuePerShare)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 6: Compare to Market Price */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-theme-primary">Schritt 6: Vergleich mit Marktpreis</h3>
              <div className="space-y-2 text-sm text-theme-secondary">
                <p>• DCF Fairer Wert: {formatCurrency(results.valuePerShare)}</p>
                <p>• Aktueller Marktpreis: {formatCurrency(results.currentPrice)}</p>
                <p className="font-medium">• Upside/Downside: {results.upside > 0 ? '+' : ''}{formatNumber(results.upside)}%</p>
                <p className={`font-medium ${results.upside > 0 ? 'text-brand-light' : 'text-red-400'}`}>
                  • Bewertung: {results.upside > 0 ? 'Unterbewertet' : 'Überbewertet'} laut DCF-Analyse
                </p>
              </div>
              
              {/* ✅ PROFESSIONAL: Neutral Market Comparison */}
              <div className="rounded-lg p-4 border border-theme/20 bg-theme-secondary">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-theme-muted mb-1">DCF Fair Value</div>
                    <div className="font-bold text-blue-400">{formatCurrency(results.valuePerShare)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">Current Price</div>
                    <div className="font-bold text-theme-primary">{formatCurrency(results.currentPrice)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">Upside/Downside</div>
                    <div className={`font-bold text-xl ${results.upside > 0 ? 'text-brand-light' : 'text-red-400'}`}>
                      {results.upside > 0 ? '+' : ''}{formatNumber(results.upside)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Assumptions Summary */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-blue-400 font-medium mb-2">Wichtige Annahmen im Überblick</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs text-theme-muted">
                    <div>
                      <p>• WACC: {formatNumber(assumptions.discountRate)}%</p>
                      <p>• Terminal Growth: {formatNumber(assumptions.terminalGrowthRate)}%</p>
                      <p>• Operative Marge: {formatNumber(assumptions.operatingMargin)}%</p>
                    </div>
                    <div>
                      <p>• Steuersatz: {formatNumber(assumptions.taxRate)}%</p>
                      <p>• CapEx: {formatNumber(assumptions.capexAsRevenuePercent)}% vom Umsatz</p>
                      <p>• Working Capital: {formatNumber(assumptions.workingCapitalChange)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ PROFESSIONAL: Simplified Summary Box */}
            <div className="bg-theme-secondary border border-theme/10 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-blue-400 font-medium mb-1">DCF-Zusammenfassung</h5>
                  <div className="text-theme-muted text-sm space-y-1">
                    <p>• <strong>Datenquelle:</strong> Financial Modeling Prep Premium APIs</p>
                    <p>• <strong>Methodik:</strong> 5-Jahres-Projektionen + Terminal Value</p>
                    <p>• <strong>Hinweis:</strong> DCF-Modelle sind zukunftsorientiert und mit Unsicherheiten behaftet</p>
                    <p>• <strong>Empfehlung:</strong> Verwende mehrere Bewertungsmethoden für bessere Einschätzungen</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-theme/10">
          <div className="flex justify-between items-center">
            <p className="text-xs text-theme-muted">
              Diese Berechnung basiert auf professionellen Finanzdaten und bewährten DCF-Methoden.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-theme-primary text-theme-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}