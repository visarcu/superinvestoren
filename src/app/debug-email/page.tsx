'use client'

import { useState } from 'react'

export default function DebugEmail() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const debugEmail = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/debug-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error:', error)
      setResult({ error: 'Failed to debug' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 E-Mail Debug Tool</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-800 text-sm">
          📧 Dieses Tool testet direkt die Resend API und zeigt dir, warum E-Mails möglicherweise nicht ankommen.
        </p>
      </div>

      <button
        onClick={debugEmail}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg mb-6"
      >
        {isLoading ? 'Debugge...' : 'E-Mail Debug starten'}
      </button>

      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Debug-Ergebnis:</h3>
            <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>

          {result.userEmail && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold mb-2">✅ Deine E-Mail Adresse:</h3>
              <p className="text-green-800">{result.userEmail}</p>
            </div>
          )}

          {result.directResendTest && (
            <div className={`p-4 rounded-lg border ${
              result.directResendTest.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className="font-semibold mb-2">
                {result.directResendTest.success ? '✅' : '❌'} Direct Resend Test:
              </h3>
              {result.directResendTest.success ? (
                <p className="text-green-800">
                  E-Mail erfolgreich gesendet! Prüfe deinen Posteingang und Spam-Ordner.
                </p>
              ) : (
                <p className="text-red-800">
                  Resend API Fehler: {JSON.stringify(result.directResendTest.error)}
                </p>
              )}
            </div>
          )}

          {result.recentLogs && result.recentLogs.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold mb-2">📋 Letzte Notification Logs:</h3>
              <div className="space-y-2">
                {result.recentLogs.map((log: any, index: number) => (
                  <div key={index} className="text-sm">
                    <strong>{log.notification_type}</strong> - {log.sent_at} 
                    {log.email_sent ? ' ✅' : ' ❌'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">🛠️ Häufige E-Mail Probleme:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>E-Mail landet im Spam-Ordner</li>
          <li>Falsche E-Mail Adresse im Account</li>
          <li>Resend API Rate Limits erreicht</li>
          <li>Domain-Authentifizierung bei Resend fehlt</li>
          <li>E-Mail Provider blockiert E-Mails</li>
        </ul>
      </div>
    </div>
  )
}