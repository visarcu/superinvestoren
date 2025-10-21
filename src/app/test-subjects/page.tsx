'use client'

import { useState } from 'react'

export default function TestSubjects() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testSubjects = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-email-subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: 'Failed to send test emails' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📧 Subject Line A/B Test</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800 text-sm">
          🔬 <strong>Hypothese:</strong> Filing E-Mails werden durch Subject Line oder Keywords gefiltert.<br/>
          📊 <strong>Test:</strong> 5 verschiedene Subject Lines - welche kommen an?
        </p>
      </div>

      <button
        onClick={testSubjects}
        disabled={isLoading}
        className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg mb-6"
      >
        {isLoading ? 'Sendet 5 Test-E-Mails...' : 'Subject Line Test starten'}
      </button>

      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Test-Ergebnis:</h3>
            <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>

          {result.results && (
            <div className="grid grid-cols-1 gap-3">
              <h3 className="font-semibold">Gesendete Subject Lines:</h3>
              {result.results.map((test: any, index: number) => (
                <div key={index} className={`p-3 rounded border ${
                  test.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">#{index + 1}: {test.subject}</span>
                    <span className={test.success ? 'text-green-600' : 'text-red-600'}>
                      {test.success ? '✅ Gesendet' : '❌ Fehler'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-2">📋 Nach dem Test:</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside text-yellow-800">
          <li>Prüfe deinen <strong>Posteingang</strong> (Primary Tab bei Gmail)</li>
          <li>Prüfe den <strong>Spam-Ordner</strong></li>
          <li>Prüfe <strong>Promotions Tab</strong> bei Gmail</li>
          <li>Suche nach "FinClue" oder "Subject Line"</li>
          <li>Sag mir welche E-Mails ankommen!</li>
        </ol>
      </div>

      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <h3 className="font-semibold mb-2">🕵️ Was wir herausfinden:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside text-orange-800">
          <li>Blockiert Gmail "13F-Filing" Keywords?</li>
          <li>Sind "[TEST]" E-Mails problematisch?</li>
          <li>Funktionieren Emoji-freie Subjects besser?</li>
          <li>Werden "Investment"-ähnliche Inhalte gefiltert?</li>
        </ul>
      </div>
    </div>
  )
}