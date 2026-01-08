// src/app/test-real-watchlist/page.tsx
'use client'

import { useState } from 'react'

export default function TestRealWatchlistPage() {
  const [userId, setUserId] = useState('')
  const [testMode, setTestMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runRealTest = async () => {
    if (!userId) {
      alert('Bitte User ID eingeben')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/notifications/test-real-watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          testMode
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Request failed', details: error })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">🧪 Echte Watchlist Test</h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>⚠️ Sicher:</strong> Dieser Test sendet KEINE E-Mails an User. 
            Er analysiert nur echte Watchlist-Daten und zeigt dir was passieren würde.
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID (aus deiner Database)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="c820478e-27a6-4909-8084-e32c5521b788"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Du findest User IDs in der Supabase Database unter "profiles" oder "watchlists"
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="testMode"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="testMode" className="ml-2 text-sm text-gray-700">
              Test Mode (alle Aktien als "triggering" behandeln)
            </label>
          </div>

          <button
            onClick={runRealTest}
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '🔍 Analysiere echte Watchlist...' : '📊 Echte Watchlist testen'}
          </button>
        </div>

        {result && (
          <div className="mt-6">
            {result.success ? (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900">📊 Watchlist Items</h3>
                    <p className="text-2xl font-bold text-blue-600">{result.summary.totalWatchlistItems}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-orange-900">🚨 Würde Triggern</h3>
                    <p className="text-2xl font-bold text-orange-600">{result.summary.triggeringStocks}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900">📧 E-Mail senden?</h3>
                    <p className="text-lg font-bold text-brand">
                      {result.summary.wouldSendEmail ? 'JA ✅' : 'NEIN ❌'}
                    </p>
                  </div>
                </div>

                {/* Settings Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">⚙️ User Settings</h3>
                  <p>Notifications: <span className="font-mono">{result.summary.notificationsEnabled ? 'enabled' : 'disabled'}</span></p>
                  <p>Threshold: <span className="font-mono">{result.summary.threshold}%</span></p>
                </div>

                {/* Stock Analysis */}
                {result.stockAnalysis.length > 0 && (
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">📈 Aktien Analyse (erste 5)</h3>
                    <div className="space-y-3">
                      {result.stockAnalysis.map((stock: any, index: number) => (
                        <div key={index} className={`p-3 rounded border ${
                          stock.wouldTrigger ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold">{stock.ticker}</span>
                            {stock.wouldTrigger && <span className="text-red-600 font-bold">🚨 TRIGGER</span>}
                          </div>
                          {stock.error ? (
                            <p className="text-red-600 text-sm">❌ {stock.error}</p>
                          ) : (
                            <div className="text-sm text-gray-600">
                              <p>Aktuell: ${stock.currentPrice} | 52W-Hoch: ${stock.yearHigh}</p>
                              <p>Dip: <span className={`font-medium ${parseFloat(stock.dipPercent) <= -stock.threshold ? 'text-red-600' : 'text-brand'}`}>
                                {stock.dipPercent}%
                              </span> (Schwelle: -{stock.threshold}%)</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">{result.message}</p>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">❌ Test Fehler</h3>
                <pre className="text-sm text-red-700 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}