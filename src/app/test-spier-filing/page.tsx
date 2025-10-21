'use client'

import { useState } from 'react'

export default function TestSpierFiling() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const addResult = (step: number, data: any) => {
    setResults(prev => [...prev, { step, timestamp: new Date().toLocaleTimeString(), data }])
  }

  const executeStep = async (stepNumber: number) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/test-spier-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          step: stepNumber
        })
      })
      const data = await response.json()
      addResult(stepNumber, data)
      
      if (response.ok && stepNumber < 4) {
        setStep(stepNumber + 1)
      }
    } catch (error) {
      addResult(stepNumber, { success: false, error })
    } finally {
      setIsLoading(false)
    }
  }

  const testStep1_Subscribe = () => executeStep(1)
  const testStep2_CheckSettings = () => executeStep(2)
  const testStep3_TriggerFilingCheck = () => executeStep(3)
  const testStep4_SendTestEmail = () => executeStep(4)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Guy Spier Filing Test Workflow</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <h2 className="font-semibold mb-2">Test-Szenario:</h2>
        <p className="text-sm text-blue-800">
          1. Du abonnierst Guy Spier Filing-Notifications<br/>
          2. Du lädst sein neues 13F Filing hoch<br/>
          3. Das System erkennt das neue Filing und sendet E-Mail<br/>
          4. Du testest den kompletten Workflow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Steps */}
        <div className="space-y-4">
          <div className={`p-4 border rounded-lg ${step >= 1 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className="font-semibold mb-2">Schritt 1: Guy Spier abonnieren</h3>
            <p className="text-sm text-gray-600 mb-3">
              Füge Guy Spier zu deinen preferred_investors hinzu
            </p>
            <button
              onClick={testStep1_Subscribe}
              disabled={isLoading || step > 1}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
            >
              {step > 1 ? '✅ Erledigt' : isLoading ? 'Lädt...' : 'Settings prüfen'}
            </button>
          </div>

          <div className={`p-4 border rounded-lg ${step >= 2 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className="font-semibold mb-2">Schritt 2: Subscription verifizieren</h3>
            <p className="text-sm text-gray-600 mb-3">
              Prüfe ob Guy Spier korrekt abonniert ist
            </p>
            <button
              onClick={testStep2_CheckSettings}
              disabled={isLoading || step < 2 || step > 2}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
            >
              {step > 2 ? '✅ Erledigt' : isLoading ? 'Prüft...' : 'Settings checken'}
            </button>
          </div>

          <div className={`p-4 border rounded-lg ${step >= 3 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className="font-semibold mb-2">Schritt 3: Filing-Check triggern</h3>
            <p className="text-sm text-gray-600 mb-3">
              Simuliere neue Guy Spier Filing-Daten
            </p>
            <button
              onClick={testStep3_TriggerFilingCheck}
              disabled={isLoading || step < 3 || step > 3}
              className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
            >
              {step > 3 ? '✅ Erledigt' : isLoading ? 'Triggert...' : 'Filing-Check ausführen'}
            </button>
          </div>

          <div className={`p-4 border rounded-lg ${step >= 4 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className="font-semibold mb-2">Schritt 4: Test-E-Mail senden</h3>
            <p className="text-sm text-gray-600 mb-3">
              Zusätzliche Test-E-Mail für Guy Spier
            </p>
            <button
              onClick={testStep4_SendTestEmail}
              disabled={isLoading || step < 4}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm"
            >
              {isLoading ? 'Sendet...' : 'Test-E-Mail senden'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <h3 className="font-semibold">Test-Ergebnisse:</h3>
          <div className="bg-gray-50 border rounded-lg p-4 max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500 text-sm">Noch keine Ergebnisse...</p>
            ) : (
              results.map((result, index) => (
                <div key={index} className="mb-4 p-3 bg-white rounded border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">Schritt {result.step}</span>
                    <span className="text-xs text-gray-500">{result.timestamp}</span>
                  </div>
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold mb-2">📝 Nächste Schritte für echten Workflow:</h3>
        <ol className="text-sm space-y-1 list-decimal list-inside text-yellow-800">
          <li>Guy Spier neue Holdings in <code>/src/data/holdings/spier/</code> hinzufügen</li>
          <li>Holdings Index aktualisieren: <code>npm run update-holdings</code></li>
          <li>Filing-Detection auf echte Datei-Änderungen umstellen</li>
          <li>Cron-Job für automatische Checks konfigurieren</li>
        </ol>
      </div>
    </div>
  )
}