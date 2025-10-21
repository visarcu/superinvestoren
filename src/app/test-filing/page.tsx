'use client'

import { useState } from 'react'

export default function TestFilingNotification() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [selectedInvestor, setSelectedInvestor] = useState('buffett')

  const investors = [
    { slug: 'buffett', name: 'Warren Buffett' },
    { slug: 'ackman', name: 'Bill Ackman' },
    { slug: 'gates', name: 'Bill Gates' },
    { slug: 'burry', name: 'Michael Burry' },
    { slug: 'soros', name: 'George Soros' },
    { slug: 'icahn', name: 'Carl Icahn' },
    { slug: 'spier', name: 'Guy Spier' }
  ]

  const testFilingNotification = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/notifications/test-filing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          investorSlug: selectedInvestor
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: 'Failed to send test' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test Superinvestor Filing Notifications</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800 text-sm">
          ⚠️ <strong>Achtung:</strong> Dies sendet eine echte Test-E-Mail an deine E-Mail-Adresse.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Investor auswählen:</label>
          <select 
            value={selectedInvestor} 
            onChange={(e) => setSelectedInvestor(e.target.value)}
            className="w-full p-2 border rounded-lg"
          >
            {investors.map(investor => (
              <option key={investor.slug} value={investor.slug}>
                {investor.name} ({investor.slug})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={testFilingNotification}
          disabled={isLoading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
        >
          {isLoading ? 'Test läuft...' : 'Filing Test-E-Mail senden'}
        </button>
      </div>

      {result && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Testergebnis:</h3>
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold mb-2">Wie das Filing-System funktioniert:</h3>
        <ul className="text-sm space-y-1 text-blue-800">
          <li>• <strong>Aktuell:</strong> Kein automatischer Cron-Job (nur Watchlist hat einen)</li>
          <li>• <strong>Check-Filings API:</strong> Prüft auf neue 13F-Filings für Superinvestoren</li>
          <li>• <strong>Spam-Schutz:</strong> Max. 1 E-Mail pro Tag pro Investor</li>
          <li>• <strong>Trigger:</strong> Aktuell immer "true" (Test-Modus)</li>
          <li>• <strong>E-Mail:</strong> Professionelle Template mit Portfolio-Links</li>
          <li>• <strong>In-App:</strong> Erstellt auch In-App-Notifications</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <h3 className="font-semibold mb-2">Um automatische Filing-Checks zu aktivieren:</h3>
        <p className="text-sm text-orange-800">
          Füge in <code>vercel.json</code> einen weiteren Cron-Job hinzu:
        </p>
        <pre className="text-xs mt-2 bg-white p-2 rounded border">
{`{
  "path": "/api/notifications/check-filings",
  "schedule": "0 10,16,22 * * *"
}`}
        </pre>
      </div>
    </div>
  )
}