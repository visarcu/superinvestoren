
// src/app/portfolio/components/PositionTable.tsx
'use client'

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
  onDeletePosition: (id: string) => void
}

export function PositionTable({ positions, onDeletePosition }: Props) {
  if (positions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-900 mb-1">Noch keine Positionen</h3>
        <p className="text-sm text-gray-500">Füge deine erste Aktie oder ETF hinzu</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Anzahl</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kaufpreis</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktuell</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Wert</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">+/-</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {positions.map((position) => {
              const currentPrice = position.currentPrice || position.buyPrice
              const totalValue = currentPrice * position.quantity
              const totalCost = position.buyPrice * position.quantity
              const gainLoss = totalValue - totalCost
              const gainLossPercent = ((currentPrice - position.buyPrice) / position.buyPrice) * 100

              return (
                <tr key={position.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-semibold">{position.symbol}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{position.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      position.type === 'stock' ? 'bg-blue-100 text-blue-800' :
                      position.type === 'etf' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {position.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {position.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    €{position.buyPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    €{currentPrice.toFixed(2)}
                    {position.currentPrice && (
                      <span className="text-xs text-gray-500 block">Live</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                    €{totalValue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {gainLoss >= 0 ? '+' : ''}€{gainLoss.toFixed(2)}
                      <div className="text-xs">
                        {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onDeletePosition(position.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}