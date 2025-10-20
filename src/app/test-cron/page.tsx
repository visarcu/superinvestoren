// src/app/test-cron/page.tsx
'use client'

import { useState } from 'react'

export default function TestCronPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const runCronManually = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Verwende eine Test-Route die den korrekten CRON_SECRET hat
      const response = await fetch('/api/notifications/test-cron-trigger', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      setResult({ 
        success: response.ok, 
        status: response.status,
        data 
      })
    } catch (error) {
      setResult({ 
        success: false, 
        error: 'Request failed', 
        details: error 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">🕐 Cron-Job Manueller Test</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            <strong>⚠️ Achtung:</strong> Dies führt den echten Cron-Job aus und kann 
            echte E-Mails an echte User senden wenn Aktien unter dem Schwellwert sind!
          </p>
        </div>
        
        <button
          onClick={runCronManually}
          disabled={loading}
          className="bg-orange-500 text-white py-3 px-6 rounded-md hover:bg-orange-600 disabled:opacity-50 font-medium"
        >
          {loading ? '🔄 Führe Cron-Job aus...' : '⚡ Cron-Job manuell starten'}
        </button>

        {result && (
          <div className="mt-6">
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                result.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {result.success ? '✅ Cron-Job erfolgreich' : '❌ Cron-Job Fehler'}
              </h3>
              
              <div className="text-sm">
                <p className="mb-2">
                  <strong>Status:</strong> {result.status}
                </p>
                
                {result.success && result.data && (
                  <div className="space-y-2">
                    <p><strong>Users geprüft:</strong> {result.data.usersChecked || 0}</p>
                    <p><strong>E-Mails gesendet:</strong> {result.data.emailNotificationsSent || 0}</p>
                    <p><strong>In-App Notifications:</strong> {result.data.inAppNotificationsSent || 0}</p>
                  </div>
                )}
              </div>
              
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">Details anzeigen</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">💡 Debugging Tipps:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Checke die Server Console für detaillierte Logs</li>
            <li>• Überprüfe die E-Mail Logs unter <code>/admin/email-logs</code></li>
            <li>• Vercel Cron-Jobs laufen nur in Production (nicht localhost)</li>
            <li>• Environment Variables müssen in Vercel Dashboard gesetzt werden</li>
          </ul>
        </div>
      </div>
    </div>
  )
}