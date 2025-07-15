// src/app/portfolio/components/PortfolioDashboard.tsx
'use client'
import { useEffect, useState } from 'react'

type PositionType = 'stock' | 'etf' | 'cash'

interface Position {
  id: string
  symbol: string
  name: string
  type: PositionType
  quantity: number
  buyPrice: number
  currentPrice?: number
  buyDate: string
}

interface Props {
  positions: Position[]
  onUpdatePositions: (positions: Position[]) => void
}

export function PortfolioDashboard({ positions, onUpdatePositions }: Props) {
  const [loading, setLoading] = useState(false)

  // Live-Kurse abrufen mit deiner quotes API
  const updatePrices = async () => {
    if (positions.length === 0) return
    
    setLoading(true)
    try {
      const symbols = positions
        .filter(p => p.type !== 'cash')
        .map(p => p.symbol)
        .join(',')
      
      if (symbols) {
        const response = await fetch(`/api/quotes?symbols=${symbols}`)
        const quotes = await response.json()
        
        const updatedPositions = positions.map(position => {
          if (position.type === 'cash') return position
          
          const quote = quotes.find((q: any) => q.symbol === position.symbol)
          return {
            ...position,
            currentPrice: quote ? quote.price : position.buyPrice
          }
        })
        
        onUpdatePositions(updatedPositions)
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der Kurse:', error)
    } finally {
      setLoading(false)
    }
  }

  // Automatisch alle 30 Sekunden aktualisieren
  useEffect(() => {
    updatePrices()
    const interval = setInterval(updatePrices, 30000)
    return () => clearInterval(interval)
  }, [positions.length])

  const totalValue = positions.reduce((sum, pos) => 
    sum + (pos.currentPrice || pos.buyPrice) * pos.quantity, 0
  )

  const totalInvested = positions.reduce((sum, pos) => 
    sum + pos.buyPrice * pos.quantity, 0
  )

  const totalGainLoss = totalValue - totalInvested
  const gainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0

  // Allokation berechnen
  const allocation = {
    stocks: positions.filter(p => p.type === 'stock').reduce((sum, p) => 
      sum + (p.currentPrice || p.buyPrice) * p.quantity, 0
    ),
    etfs: positions.filter(p => p.type === 'etf').reduce((sum, p) => 
      sum + (p.currentPrice || p.buyPrice) * p.quantity, 0
    ),
    cash: positions.filter(p => p.type === 'cash').reduce((sum, p) => 
      sum + (p.currentPrice || p.buyPrice) * p.quantity, 0
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Gesamtwert */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">Gesamtwert</h3>
          <button 
            onClick={updatePrices}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {loading ? '⟳' : '🔄'}
          </button>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          €{totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {positions.length} Position{positions.length !== 1 ? 'en' : ''}
        </p>
      </div>

      {/* Investiert */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Investiert</h3>
        <p className="text-2xl font-bold text-gray-900">
          €{totalInvested.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Gewinn/Verlust */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">Gewinn/Verlust</h3>
        <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {totalGainLoss >= 0 ? '+' : ''}€{totalGainLoss.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
        </p>
        <p className={`text-xs ${gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
        </p>
      </div>

      {/* Allokation */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Allokation</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Aktien</span>
            <span>€{allocation.stocks.toLocaleString('de-DE')}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>ETFs</span>
            <span>€{allocation.etfs.toLocaleString('de-DE')}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Cash</span>
            <span>€{allocation.cash.toLocaleString('de-DE')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}