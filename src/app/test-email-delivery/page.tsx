'use client'

import { useState } from 'react'

export default function TestEmailDelivery() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [testEmail, setTestEmail] = useState('visarcurraj95@gmail.com')

  const testDelivery = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-different-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testEmail
        })
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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔬 E-Mail Delivery Deep Test</h1>
      
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800 text-sm">
          🚨 <strong>Problem:</strong> E-Mails werden gesendet (Resend bestätigt), kommen aber nicht an.<br/>
          🔍 <strong>Test:</strong> Verschiedene FROM-Adressen, Inhalte und E-Mail Adressen
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Test E-Mail Adresse:</label>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          className="w-full p-2 border rounded-lg"
          placeholder="deine@email.com"
        />
        <p className="text-xs text-gray-500 mt-1">
          Probiere auch eine andere E-Mail Adresse (Gmail, Outlook, etc.)
        </p>
      </div>

      <button
        onClick={testDelivery}
        disabled={isLoading || !testEmail}
        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg mb-6"
      >
        {isLoading ? 'Sendet 4 Test-E-Mails...' : 'Deep Delivery Test starten'}
      </button>

      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Test-Ergebnis für: {result.testEmail}</h3>
            <p className="text-sm text-gray-600 mb-3">{result.message}</p>
          </div>

          {result.results && (
            <div className="grid grid-cols-1 gap-4">
              {result.results.map((test: any, index: number) => (
                <div key={index} className={`p-4 rounded border ${
                  test.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">#{index + 1}: {test.name}</h4>
                      <p className="text-sm text-gray-600">FROM: {test.from}</p>
                      <p className="text-sm text-gray-600">SUBJECT: {test.subject}</p>
                    </div>
                    <span className={test.success ? 'text-brand' : 'text-red-600'}>
                      {test.success ? '✅ Gesendet' : '❌ Fehler'}
                    </span>
                  </div>
                  {test.result && (
                    <p className="text-xs text-gray-500">Email ID: {test.result.id}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold mb-2">🔍 Was wir testen:</h3>
          <ul className="text-sm space-y-1 list-disc list-inside text-blue-800">
            <li>Standard FinClue FROM (team@finclue.de)</li>
            <li>Alternative FROM (noreply@finclue.de)</li>
            <li>Einfacher Text ohne HTML</li>
            <li>Watchlist-ähnlicher Inhalt</li>
          </ul>
        </div>

        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h3 className="font-semibold mb-2">💡 Mögliche Ursachen:</h3>
          <ul className="text-sm space-y-1 list-disc list-inside text-orange-800">
            <li>Gmail DMARC/SPF Policy blockiert team@finclue.de</li>
            <li>Resend Domain nicht verifiziert</li>
            <li>Gmail Rate Limiting</li>
            <li>Spezielle Keywords werden gefiltert</li>
            <li>IP Reputation Problem</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-2">🚀 Alternative Test-Ideen:</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside text-yellow-800">
          <li>Teste mit einer <strong>anderen E-Mail Adresse</strong> (nicht Gmail)</li>
          <li>Teste <strong>Outlook/Yahoo/Protonmail</strong></li>
          <li>Prüfe <strong>Resend Dashboard</strong> auf Delivery Status</li>
          <li>Prüfe <strong>DNS/SPF Records</strong> für finclue.de</li>
        </ol>
      </div>
    </div>
  )
}