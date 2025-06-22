'use client'
import { useState, useEffect } from 'react'

export default function NewsletterAdminPage() {
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [subscribers, setSubscribers] = useState([])
  const [preview, setPreview] = useState(false)
  const [message, setMessage] = useState('')

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

  // Test-Newsletter senden (Einzel)
  async function handleTestSend() {
    if (!subject.trim() || !content.trim() || !testEmail.trim()) {
      setMessage('❌ Bitte alle Felder für den Test ausfüllen')
      setTimeout(() => setMessage(''), 5000)
      return
    }

    setIsTestLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/newsletter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content, singleEmail: testEmail })
      })

      const data = await response.json()
      if (data.success) {
        setMessage(`✅ Test-Newsletter erfolgreich an ${testEmail} gesendet!`)
      } else {
        setMessage(`❌ Test-Fehler: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Fehler beim Test-Versand: ${error}`)
    } finally {
      setIsTestLoading(false)
      setTimeout(() => setMessage(''), 8000)
    }
  }

  // Multi-Email-Test für Datenschutz-Prüfung
  async function handleMultiTest() {
    if (!subject.trim() || !content.trim()) {
      setMessage('❌ Bitte Betreff und Inhalt eingeben')
      setTimeout(() => setMessage(''), 5000)
      return
    }

    // Test-E-Mails (ersetze mit deinen eigenen E-Mails oder Gmail-Aliase)
    const testEmails = [
      { email: 'visi1@hotmail.de' },
      { email: 'loeweninvest@gmail.com' },
    ]

    const confirmed = confirm(`🔒 Datenschutz-Test an ${testEmails.length} Test-E-Mails senden?\n\nDieser Test prüft, ob E-Mail-Adressen korrekt getrennt versendet werden.`)
    if (!confirmed) return

    setIsTestLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/newsletter/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject, 
          content, 
          testEmails: testEmails
        })
      })

      const data = await response.json()
      if (data.success) {
        setMessage(`✅ ${data.message}\n🔍 Prüfe jetzt deine E-Mails: Jede sollte nur EINE E-Mail-Adresse im "An"-Feld haben!`)
      } else {
        setMessage(`❌ Multi-Test-Fehler: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Fehler beim Multi-Test: ${error}`)
    } finally {
      setIsTestLoading(false)
      setTimeout(() => setMessage(''), 12000)
    }
  }

  // Newsletter an alle senden
  async function handleSend() {
    if (!subject.trim() || !content.trim()) {
      setMessage('❌ Bitte Betreff und Inhalt eingeben')
      setTimeout(() => setMessage(''), 5000)
      return
    }

    const confirmed = confirm(`Newsletter an ${subscribers.length} Abonnenten senden?`)
    if (!confirmed) return

    setIsLoading(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content })
      })

      const data = await response.json()
      if (data.success) {
        setMessage(`✅ Newsletter erfolgreich an ${data.sentCount} Abonnenten gesendet!`)
        setSubject('')
        setContent('')
      } else {
        setMessage(`❌ Fehler: ${data.error}`)
      }
    } catch (error) {
      setMessage(`❌ Fehler beim Versenden: ${error}`)
    } finally {
      setIsLoading(false)
      setTimeout(() => setMessage(''), 8000)
    }
  }

  // Markdown zu HTML für Preview
  function markdownToHtml(text: string): string {
    return text
      // Headers
      .replace(/# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
      .replace(/## (.*$)/gm, '<h2 class="text-xl font-semibold text-white mb-3">$1</h2>')
      .replace(/### (.*$)/gm, '<h3 class="text-lg font-medium text-white mb-2">$1</h3>')
      
      // Text formatting
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // Lists
      .replace(/^- (.*$)/gm, '<div class="flex items-start mb-1"><span class="text-gray-400 mr-2">•</span><span>$1</span></div>')
      
      // Emojis und spezielle Zeichen bleiben erhalten
      .replace(/\n\n/g, '<br class="mb-4">')
      .replace(/\n/g, '<br>')
      
      // Horizontal rule
      .replace(/---/g, '<hr class="border-gray-700 my-4">')
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

        {/* Status Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border whitespace-pre-line ${
            message.includes('✅') 
              ? 'bg-green-950 border-green-800 text-green-300' 
              : 'bg-red-950 border-red-800 text-red-300'
          }`}>
            {message}
          </div>
        )}

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

            {/* Test Section - ERWEITERT */}
            <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-4">
              <h3 className="text-yellow-300 font-medium mb-3 flex items-center gap-2">
                🧪 Test-Newsletter
              </h3>
              <div className="space-y-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="deine@email.com"
                  className="w-full px-3 py-2 bg-gray-900 border border-yellow-800/50 rounded text-white placeholder-gray-500 focus:outline-none focus:border-yellow-700"
                />
                
                {/* NEUE BUTTON-ANORDNUNG */}
                <div className="flex gap-2">
                  <button
                    onClick={handleTestSend}
                    disabled={isTestLoading || !subject.trim() || !content.trim() || !testEmail.trim()}
                    className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded transition-colors text-sm"
                  >
                    {isTestLoading ? 'Sende...' : '📧 Einzel-Test'}
                  </button>
                  
                  <button
                    onClick={handleMultiTest}
                    disabled={isTestLoading || !subject.trim() || !content.trim()}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded transition-colors text-sm"
                    title="Testet Datenschutz mit mehreren E-Mails"
                  >
                    {isTestLoading ? 'Teste...' : '🔒 Multi-Test'}
                  </button>
                </div>
                
                <p className="text-xs text-yellow-200/80">
                  💡 Multi-Test prüft, ob E-Mail-Adressen getrennt versendet werden (Datenschutz)
                </p>
              </div>
            </div>

            {/* Action Buttons */}
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
              <div className="max-w-none">
                <div className="bg-gray-800 p-4 rounded-lg mb-4">
                  <h4 className="text-white font-semibold text-lg">{subject || 'Newsletter Betreff'}</h4>
                  <p className="text-gray-400 text-sm mt-1">FinClue Newsletter • {new Date().toLocaleDateString('de-DE')}</p>
                </div>
                <div 
                  className="text-gray-300 leading-relaxed text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: content ? markdownToHtml(content) : '<p class="text-gray-500">Newsletter Inhalt wird hier angezeigt...</p>'
                  }}
                />
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