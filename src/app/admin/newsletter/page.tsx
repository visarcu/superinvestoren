'use client'
import { useState, useEffect } from 'react'

export default function NewsletterAdminPage() {
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [subscribers, setSubscribers] = useState([])
  const [preview, setPreview] = useState(false)

  // Abonnenten laden
  useEffect(() => {
    async function loadSubscribers() {
      try {
        const response = await fetch('/api/admin/newsletter/subscribers')
        const data = await response.json()
        if (data.success) {
          setSubscribers(data.subscribers)
        }
      } catch (error) {
        console.error('Failed to load subscribers:', error)
      }
    }
    loadSubscribers()
  }, [])

  // Newsletter versenden
  async function handleSend() {
    if (!subject.trim() || !content.trim()) {
      alert('Bitte Betreff und Inhalt eingeben')
      return
    }

    const confirmed = confirm(`Newsletter an ${subscribers.length} Abonnenten senden?`)
    if (!confirmed) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content })
      })

      const data = await response.json()
      if (data.success) {
        alert(`Newsletter erfolgreich an ${data.sentCount} Abonnenten gesendet!`)
        setSubject('')
        setContent('')
      } else {
        alert(`Fehler: ${data.error}`)
      }
    } catch (error) {
      alert(`Fehler beim Versenden: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Newsletter Admin</h1>
          <p className="text-gray-400">
            {subscribers.length} aktive Abonnenten • Quartalsweise Updates
          </p>
        </div>

        {/* Newsletter Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Betreff
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="z.B. Berkshire Hathaway Q3 2024 - Neue Käufe & Verkäufe"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Inhalt (Markdown unterstützt)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# FinClue Quarterly Update

Hallo liebe FinClue Community! 👋

## 📈 Markt-Highlights Q3 2024

Die wichtigsten Ereignisse des Quartals...

## 🔍 Super-Investor Updates

**Warren Buffett (Berkshire Hathaway):**
- ✅ Neue Position: XYZ Corp (+$2.1B)
- ❌ Verkauf: ABC Inc (-$1.5B)

**Bill Ackman (Pershing Square):**
- 📈 Aufgestockt: DEF Ltd (+15%)

## 🎯 Was kommt als nächstes?

Neue Features auf FinClue.de...

---
Viele Grüße,
Dein FinClue Team"
                rows={20}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 font-mono text-sm"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setPreview(!preview)}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                {preview ? 'Editor' : 'Preview'}
              </button>
              
              <button
                onClick={handleSend}
                disabled={isLoading || !subject.trim() || !content.trim()}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? 'Wird gesendet...' : `An ${subscribers.length} Abonnenten senden`}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-300">
              {preview ? 'Preview' : 'Abonnenten'}
            </h3>
            
            {preview ? (
              <div className="prose prose-invert max-w-none">
                <h4 className="text-white font-semibold">{subject || 'Newsletter Betreff'}</h4>
                <div className="mt-4 text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                  {content || 'Newsletter Inhalt wird hier angezeigt...'}
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subscribers.map((subscriber: any, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <span className="text-sm text-gray-300">{subscriber.email}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(subscriber.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Templates */}
        <div className="mt-8 p-6 bg-gray-900 border border-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">📋 Quick Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {
                setSubject('FinClue Quarterly Update - Q4 2024')
                setContent(`# FinClue Quarterly Update Q4 2024

Hallo liebe FinClue Community! 👋

## 📈 Markt-Highlights Q4 2024

## 🔍 Super-Investor Updates

**Warren Buffett (Berkshire Hathaway):**
- 

**Bill Ackman (Pershing Square):**
- 

## 🎯 Neue Features auf FinClue

---
Viele Grüße,
Dein FinClue Team`)
              }}
              className="p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-left transition-colors"
            >
              <div className="font-medium text-gray-300">Quarterly Update</div>
              <div className="text-sm text-gray-500 mt-1">Standard quartalsweise Updates</div>
            </button>

            <button
              onClick={() => {
                setSubject('🚨 Breaking: Buffett kauft neue Aktie!')
                setContent(`# Breaking News: Warren Buffett macht großen Kauf! 🚨

Hallo FinClue Community!

Berkshire Hathaway hat gerade ein neues 13F-Filing eingereicht mit einer überraschenden neuen Position:

## 🎯 Die Details:

**Unternehmen:** [NAME]
**Position:** $X.X Milliarden
**Anteil am Portfolio:** X%

## 🤔 Was bedeutet das?

[Analyse...]

---
Mehr Details auf FinClue.de

Viele Grüße,
Dein FinClue Team`)
              }}
              className="p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-left transition-colors"
            >
              <div className="font-medium text-gray-300">Breaking News</div>
              <div className="text-sm text-gray-500 mt-1">Wichtige Investor-Updates</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}