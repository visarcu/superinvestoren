'use client'

import { useState } from 'react'

export default function TestFilingAnalysis() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const analyzeFilingSettings = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/notifications/check-filings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test'}`
        }
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: 'Failed to analyze' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Filing Notifications Analyse</h1>
      
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800 text-sm">
          🚨 <strong>Achtung:</strong> Dies führt den echten Filing-Check aus und kann E-Mails an echte User senden!
        </p>
      </div>

      <button
        onClick={analyzeFilingSettings}
        disabled={isLoading}
        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
      >
        {isLoading ? 'Analysiere...' : 'Filing-Check ausführen (VORSICHT!)'}
      </button>

      {result && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Ergebnis:</h3>
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold mb-2">Filing-System Status:</h3>
        <div className="text-sm space-y-2 text-blue-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Cron-Job:</strong><br />
              <span className="text-red-600">❌ Nicht konfiguriert</span>
            </div>
            <div>
              <strong>API Endpoint:</strong><br />
              <span className="text-green-600">✅ /api/notifications/check-filings</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <strong>Spam-Schutz:</strong><br />
              <span className="text-green-600">✅ Max 1x täglich</span>
            </div>
            <div>
              <strong>Filing-Erkennung:</strong><br />
              <span className="text-yellow-600">⚠️ Aktuell immer "true" (Test)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="font-semibold mb-2">Nächste Schritte:</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>Echte Filing-Detection implementieren (SEC API)</li>
          <li>Cron-Job in vercel.json konfigurieren</li>
          <li>Testing mit kleiner User-Gruppe</li>
          <li>Production rollout</li>
        </ol>
      </div>
    </div>
  )
}