// src/app/(portfolio)/page.tsx - Mit Terminal-Integration
'use client'

import { useState, useEffect } from 'react'

interface Position {
  id: string
  symbol: string
  name: string
  type: 'stock' | 'etf' | 'cash'
  quantity: number
  buyPrice: number
  currentPrice?: number
  buyDate: string
}

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Portfolio laden
  useEffect(() => {
    const saved = localStorage.getItem('finclue_portfolio')
    if (saved) {
      try {
        setPositions(JSON.parse(saved))
      } catch (error) {
        console.error('Portfolio loading failed:', error)
      }
    }
  }, [])

  // User-Daten für Integrationen
  useEffect(() => {
    // Hier würdest du User-Status checken
    // Für Demo: Mock-User
    setUser({ hasTerminalAccess: true, isPremium: true })
  }, [])

  const savePortfolio = (newPositions: Position[]) => {
    setPositions(newPositions)
    localStorage.setItem('finclue_portfolio', JSON.stringify(newPositions))
  }

  const addTestPosition = () => {
    const newPosition: Position = {
      id: Date.now().toString(),
      symbol: 'AAPL',
      name: 'Apple Inc.',
      type: 'stock',
      quantity: 10,
      buyPrice: 150.00,
      buyDate: new Date().toISOString().split('T')[0]
    }
    savePortfolio([...positions, newPosition])
  }

  const deletePosition = (id: string) => {
    if (confirm('Position wirklich löschen?')) {
      savePortfolio(positions.filter(p => p.id !== id))
    }
  }

  // Terminal-Integration Functions
  const compareWithBuffett = () => {
    const symbols = positions.map(p => p.symbol).join(',')
    sessionStorage.setItem('portfolio_symbols', symbols)
    window.open(`/analyse/superinvestor/buffett?compare=portfolio&symbols=${symbols}`, '_blank')
  }

  const analyzeWithAI = () => {
    sessionStorage.setItem('portfolio_data', JSON.stringify(positions))
    window.open('/analyse/ai?mode=portfolio', '_blank')
  }

  const checkInsiderTrading = () => {
    const symbols = positions.map(p => p.symbol).join(',')
    window.open(`/analyse/insider?symbols=${symbols}&from=portfolio`, '_blank')
  }

  const calculateDCF = (symbol: string) => {
    window.open(`/analyse/stocks/${symbol.toLowerCase()}/dcf?from=portfolio`, '_blank')
  }

  // Stats berechnen
  const totalValue = positions.reduce((sum, pos) => 
    sum + (pos.currentPrice || pos.buyPrice) * pos.quantity, 0
  )
  const totalInvested = positions.reduce((sum, pos) => 
    sum + pos.buyPrice * pos.quantity, 0
  )
  const gainLoss = totalValue - totalInvested
  const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0

  return (
    <div className="p-6">
      
      {/* Header mit Integration-Buttons */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Dein Portfolio
          </h1>
          <p className="text-gray-400">
            {positions.length} Position{positions.length !== 1 ? 'en' : ''} • 
            Gesamtwert: €{totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={addTestPosition}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Position hinzufügen
          </button>
          
          {/* Terminal-Integration Buttons - nur für berechtigte User */}
          {user?.hasTerminalAccess && positions.length > 0 && (
            <>
              <button
                onClick={compareWithBuffett}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                🎯 Mit Buffett vergleichen
              </button>
              
              <button
                onClick={analyzeWithAI}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                🤖 AI-Analyse
              </button>
            </>
          )}
        </div>
      </div>

      {/* Portfolio Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        
        {/* Gesamtwert */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Gesamtwert</h3>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <p className="text-2xl font-bold text-white">
            €{totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {positions.length} Position{positions.length !== 1 ? 'en' : ''}
          </p>
        </div>

        {/* Investiert */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Investiert</h3>
          <p className="text-2xl font-bold text-white">
            €{totalInvested.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">Eingezahltes Kapital</p>
        </div>

        {/* Gewinn/Verlust */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Gewinn/Verlust</h3>
          <p className={`text-2xl font-bold ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {gainLoss >= 0 ? '+' : ''}€{gainLoss.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
          <p className={`text-xs ${gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
          </p>
        </div>

        {/* Terminal-Integration Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Profi-Features</h3>
          {user?.hasTerminalAccess ? (
            <div className="space-y-2">
              <button
                onClick={checkInsiderTrading}
                className="w-full text-left text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                👁️ Insider-Trading prüfen
              </button>
              <button
                onClick={compareWithBuffett}
                className="w-full text-left text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                🎯 Superinvestor-Vergleich
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-2">Terminal-Zugang für erweiterte Analysen</p>
              <a 
                href="/pricing"
                className="text-xs text-yellow-400 hover:text-yellow-300"
              >
                Jetzt upgraden →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Tabelle */}
      {positions.length > 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-xl font-semibold text-white">Deine Positionen</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Typ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Anzahl</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Kaufpreis</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Wert</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {positions.map((position) => {
                  const currentPrice = position.currentPrice || position.buyPrice
                  const totalPositionValue = currentPrice * position.quantity
                  
                  return (
                    <tr key={position.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-white">{position.symbol}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-white">{position.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          position.type === 'stock' ? 'bg-blue-500/20 text-blue-400' :
                          position.type === 'etf' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {position.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                        {position.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                        €{position.buyPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-white">
                        €{totalPositionValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          {user?.hasTerminalAccess && (
                            <button
                              onClick={() => calculateDCF(position.symbol)}
                              className="text-blue-400 hover:text-blue-300 text-xs"
                              title="DCF-Analyse"
                            >
                              🧮
                            </button>
                          )}
                          <button
                            onClick={() => deletePosition(position.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Löschen
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 max-w-md mx-auto">
            <div className="text-gray-400 mb-6">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Portfolio ist leer</h3>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Füge deine erste Aktie oder ETF hinzu.<br/>
              Deine Daten bleiben 100% privat und lokal.
            </p>
            <button 
              onClick={addTestPosition}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
            >
              Erste Position hinzufügen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}