// src/app/portfolio/components/AddPositionModal.tsx
'use client'
import { useState } from 'react'

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
  onClose: () => void
  onSave: (position: Position) => void
}

export function AddPositionModal({ onClose, onSave }: Props) {
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    type: 'stock' as PositionType,
    quantity: 0,
    buyPrice: 0,
    buyDate: new Date().toISOString().split('T')[0]
  })
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  // Symbol-Suche mit deiner eigenen API
  const searchSymbol = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/search?query=${query}`)
      const results = await response.json()
      setSearchResults(results) // Deine API gibt schon nur 5 zurück
    } catch (error) {
      console.error('Suche fehlgeschlagen:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.symbol || !formData.name || formData.quantity <= 0 || formData.buyPrice <= 0) {
      alert('Bitte alle Felder ausfüllen')
      return
    }

    const position: Position = {
      id: Date.now().toString(),
      ...formData
    }

    onSave(position)
  }

  const selectStock = (stock: any) => {
    setFormData({
      ...formData,
      symbol: stock.symbol,
      name: stock.name
    })
    setSearchResults([])
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Neue Position hinzufügen</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Symbol mit Suche */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => {
                setFormData({...formData, symbol: e.target.value.toUpperCase()})
                searchSymbol(e.target.value)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. AAPL"
              required
            />
            
            {/* Suchergebnisse */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto">
                {searchResults.map((stock, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectStock(stock)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 flex justify-between"
                  >
                    <span className="font-medium">{stock.symbol}</span>
                    <span className="text-sm text-gray-600 truncate ml-2">{stock.name}</span>
                  </button>
                ))}
              </div>
            )}
            
            {searching && (
              <div className="absolute right-3 top-9 text-gray-400">
                ⟳
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Apple Inc."
              required
            />
          </div>

          {/* Typ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as PositionType})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="stock">Aktie</option>
              <option value="etf">ETF</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          {/* Anzahl und Preis */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anzahl</label>
              <input
                type="number"
                step="0.001"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kaufpreis (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.buyPrice || ''}
                onChange={(e) => setFormData({...formData, buyPrice: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Kaufdatum */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kaufdatum</label>
            <input
              type="date"
              value={formData.buyDate}
              onChange={(e) => setFormData({...formData, buyDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
            >
              Hinzufügen
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition duration-200"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}