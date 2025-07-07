// src/components/DCFCalculationBreakdown.tsx - Updated with Real FCF Data
'use client'

import React from 'react'
import { 
  XMarkIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalculatorIcon 
} from '@heroicons/react/24/outline'
import { DCFResults, DCFAssumptions } from '@/lib/dcfUtils'

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
  isEstimated = false
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

  // ✅ ENHANCED FCF DATA SOURCE DISPLAY
  const getFCFSourceInfo = () => {
    switch (fcfDataSource) {
      case 'ttm-keymetrics':
        return {
          icon: <CheckCircleIcon className="w-4 h-4 text-green-400" />,
          text: 'TTM Key Metrics (aktuellste Premium-Daten)',
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          quality: 'excellent'
        }
      case 'latest-statement':
        return {
          icon: <CheckCircleIcon className="w-4 h-4 text-blue-400" />,
          text: 'Latest Cash Flow Statement (FMP Premium)',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          quality: 'very-good'
        }
      case 'calculated-ocf-capex':
        return {
          icon: <CalculatorIcon className="w-4 h-4 text-yellow-400" />,
          text: 'Berechnet: Operating CF - CapEx (FMP Premium)',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          quality: 'good'
        }
      case 'estimated-fallback':
        return {
          icon: <ExclamationTriangleIcon className="w-4 h-4 text-orange-400" />,
          text: 'Geschätzt (Fallback - unzuverlässig)',
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          quality: 'poor'
        }
      default:
        return {
          icon: <InformationCircleIcon className="w-4 h-4 text-gray-400" />,
          text: 'Standard API Daten',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/10',
          quality: 'unknown'
        }
    }
  }

  const fcfSource = getFCFSourceInfo()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-theme-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme/10">
          <div>
            <h2 className="text-xl font-bold text-theme-primary">DCF Calculation Breakdown</h2>
            <p className="text-sm text-theme-secondary">{companyName} ({ticker}) - Real FCF Data</p>
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
            
            {/* Step 1: Project Free Cash Flow mit Enhanced Data Source Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-theme-primary">Step 1: Project Free Cash Flow</h3>
              
              {/* ✅ ENHANCED FCF DATA SOURCE DISPLAY */}
              <div className={`p-4 ${fcfSource.bgColor} border border-theme/20 rounded-lg`}>
                <div className="flex items-center gap-3 mb-3">
                  {fcfSource.icon}
                  <div className="flex-1">
                    <span className={`font-medium ${fcfSource.color}`}>
                      Datenquelle: {fcfSource.text}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        fcfSource.quality === 'excellent' ? 'bg-green-500/20 text-green-400' :
                        fcfSource.quality === 'very-good' ? 'bg-blue-500/20 text-blue-400' :
                        fcfSource.quality === 'good' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {fcfSource.quality === 'excellent' ? '🟢 Excellent' :
                         fcfSource.quality === 'very-good' ? '🔵 Very Good' :
                         fcfSource.quality === 'good' ? '🟡 Good' :
                         '🔴 Poor'}
                      </span>
                      <span className="text-xs text-theme-muted">
                        FMP Premium Plan aktiv
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-theme-secondary">
                  {isEstimated ? (
                    <div className="flex items-start gap-2">
                      <ExclamationTriangleIcon className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-400 mb-1">⚠️ Diese FCF-Werte sind geschätzt</p>
                        <p>Keine ausreichenden Cash Flow Daten verfügbar. Verwende diese Bewertung mit Vorsicht.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-400 mb-1">✅ Echte FCF-Daten verwendet</p>
                        <p>Diese FCF-Werte stammen direkt aus den Financial Modeling Prep Premium APIs und sind <strong>nicht geschätzt</strong>.</p>
                        <p className="mt-1 text-xs">Quelle: {fcfSource.text}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-theme-secondary">
                <p>• Der aktuelle freie Cashflow von {companyName} beträgt {formatMillion(results.projections[0].fcf)} {isEstimated ? '(geschätzt)' : '(FMP Premium API)'}.</p>
                <p>• Wir projizieren dies für 5 Jahre mit durchschnittlichen Wachstumsraten von {formatNumber((assumptions.revenueGrowthY1 + assumptions.revenueGrowthY2 + assumptions.revenueGrowthY3 + assumptions.revenueGrowthY4 + assumptions.revenueGrowthY5) / 5)}%.</p>
                <p className="font-medium">• Nach 5 Jahren erwarten wir einen freien Cashflow von {formatMillion(projectedFCF5Y)}.</p>
              </div>
              
              {/* 5-Year FCF Table */}
              <div className="bg-theme-secondary rounded-lg p-4">
                <div className="grid grid-cols-6 gap-4 text-xs font-medium text-theme-muted mb-2">
                  <div>Jahr</div>
                  <div className="text-right">Umsatz</div>
                  <div className="text-right">Op. Marge</div>
                  <div className="text-right">NOPAT</div>
                  <div className="text-right">CapEx</div>
                  <div className="text-right">FCF</div>
                </div>
                {results.projections.map((projection) => (
                  <div key={projection.year} className="grid grid-cols-6 gap-4 text-xs text-theme-primary py-1">
                    <div>{projection.year}</div>
                    <div className="text-right">{formatMillion(projection.revenue)}</div>
                    <div className="text-right">{formatNumber(assumptions.operatingMargin)}%</div>
                    <div className="text-right">{formatMillion(projection.nopat)}</div>
                    <div className="text-right">{formatMillion(projection.capex)}</div>
                    <div className="text-right font-medium text-green-400">{formatMillion(projection.fcf)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Calculate Terminal Value */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-theme-primary">Step 2: Calculate Terminal Value</h3>
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
              <h3 className="text-lg font-semibold text-theme-primary">Step 3: Discount to Present Value</h3>
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
              <h3 className="text-lg font-semibold text-theme-primary">Step 4: Calculate Equity Value</h3>
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
                    <div className="font-medium text-green-400">{formatMillion(results.equityValue)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Per Share Value */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-theme-primary">Step 5: Calculate Per Share Value</h3>
              <div className="space-y-2 text-sm text-theme-secondary">
                <p>• Eigenkapitalwert: {formatMillion(results.equityValue)}</p>
                <p>• Aktien im Umlauf: {formatNumber(currentShares / 1000, 1)}B Aktien</p>
                <p>• Formel: Wert pro Aktie = Eigenkapitalwert ÷ Aktien im Umlauf</p>
                <p className="font-medium text-green-400">• DCF Fairer Wert: {formatCurrency(results.valuePerShare)} pro Aktie</p>
              </div>
              
              {/* Per Share Breakdown */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
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
                    <div className="font-bold text-green-400 text-lg">{formatCurrency(results.valuePerShare)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 6: Compare to Market Price */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-theme-primary">Step 6: Compare to Market Price</h3>
              <div className="space-y-2 text-sm text-theme-secondary">
                <p>• DCF Fairer Wert: {formatCurrency(results.valuePerShare)}</p>
                <p>• Aktueller Marktpreis: {formatCurrency(results.currentPrice)}</p>
                <p className="font-medium">• Upside/Downside: {results.upside > 0 ? '+' : ''}{formatNumber(results.upside)}%</p>
                <p className={`font-medium ${results.upside > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  • Bewertung: {results.upside > 0 ? 'Unterbewertet' : 'Überbewertet'} laut DCF-Analyse
                </p>
              </div>
              
              {/* Market Comparison */}
              <div className={`rounded-lg p-4 border ${results.upside > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-theme-muted mb-1">DCF Fair Value</div>
                    <div className="font-bold text-green-400">{formatCurrency(results.valuePerShare)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">Current Price</div>
                    <div className="font-bold text-theme-primary">{formatCurrency(results.currentPrice)}</div>
                  </div>
                  <div>
                    <div className="text-theme-muted mb-1">Upside/Downside</div>
                    <div className={`font-bold text-2xl ${results.upside > 0 ? 'text-green-400' : 'text-red-400'}`}>
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

            {/* ✅ ENHANCED DATA QUALITY DISCLAIMER */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-green-400 font-medium mb-1">Premium Datenqualität & Quellen</h5>
                  <ul className="text-theme-secondary text-sm space-y-1">
                    <li>• <strong>FCF-Daten:</strong> {fcfSource.text} {isEstimated ? '(geschätzt)' : '(FMP Premium API)'}</li>
                    <li>• <strong>Alle anderen Daten:</strong> Financial Modeling Prep Premium APIs</li>
                    <li>• <strong>Datenqualität:</strong> {fcfSource.quality === 'excellent' ? 'Excellent - höchste Zuverlässigkeit' : fcfSource.quality === 'very-good' ? 'Very Good - hohe Zuverlässigkeit' : fcfSource.quality === 'good' ? 'Good - mittlere Zuverlässigkeit' : 'Poor - niedrige Zuverlässigkeit'}</li>
                    <li>• <strong>Hinweis:</strong> DCF-Modelle sind zukunftsorientiert und mit Unsicherheiten behaftet</li>
                    <li>• <strong>Disclaimer:</strong> Diese Berechnung stellt keine Anlageberatung dar</li>
                    <li>• <strong>Empfehlung:</strong> Verwende mehrere Bewertungsmethoden für bessere Einschätzungen</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-theme/10">
          <div className="flex justify-between items-center">
            <p className="text-xs text-theme-muted">
              Diese Berechnung basiert auf echten FCF-Daten (FMP Premium) und professionellen Annahmen.
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