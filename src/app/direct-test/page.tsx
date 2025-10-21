'use client'

import { useState } from 'react'

export default function DirectTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testDirect = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/direct-resend-test', {
        method: 'POST'
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Request failed', details: error })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🧪 Direct Resend Test</h1>
      
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800 text-sm">
          ⚡ <strong>Direkte E-Mail</strong> ohne API-Umwege oder Komplikationen
        </p>
      </div>

      <button
        onClick={testDirect}
        disabled={isLoading}
        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg mb-6"
      >
        {isLoading ? 'Sendet...' : 'Direct E-Mail Test'}
      </button>

      {result && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Ergebnis:</h3>
          <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}