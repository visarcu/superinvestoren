// src/components/NotificationSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BellIcon, 
  EnvelopeIcon, 
  ChartBarIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface NotificationSettings {
  watchlist_enabled: boolean
  watchlist_threshold_percent: number
  filings_enabled: boolean
  preferred_investors: string[]
  email_frequency: 'immediate' | 'daily' | 'weekly'
}

const INVESTOR_OPTIONS = [
  { slug: 'buffett', name: 'Warren Buffett' },
  { slug: 'ackman', name: 'Bill Ackman' },
  { slug: 'gates', name: 'Bill Gates' },
  { slug: 'burry', name: 'Michael Burry' },
  { slug: 'soros', name: 'George Soros' },
  { slug: 'icahn', name: 'Carl Icahn' },
]

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    watchlist_enabled: true,
    watchlist_threshold_percent: 10,
    filings_enabled: false,
    preferred_investors: [''],
    email_frequency: 'immediate'
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
  
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setLoading(false)
        return
      }
      
      setUser(session.user)

      // Bestehende Settings laden
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('Settings load error:', error)
        setMessage({ type: 'error', text: 'Fehler beim Laden der Einstellungen' })
      }

      if (data) {
        setSettings({
          watchlist_enabled: data.watchlist_enabled,
          watchlist_threshold_percent: data.watchlist_threshold_percent,
          filings_enabled: data.filings_enabled,
          preferred_investors: data.preferred_investors || [],
          email_frequency: data.email_frequency
        })
      }
    } catch (error) {
      console.error('Unexpected error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Settings save error:', error)
        setMessage({ type: 'error', text: 'Fehler beim Speichern' })
      } else {
        setMessage({ type: 'success', text: 'Einstellungen gespeichert!' })
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      console.error('Unexpected save error:', error)
      setMessage({ type: 'error', text: 'Unerwarteter Fehler' })
    } finally {
      setSaving(false)
    }
  }

  function updateSetting<K extends keyof NotificationSettings>(
    key: K, 
    value: NotificationSettings[K]
  ) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function toggleInvestor(slug: string) {
    const current = settings.preferred_investors
    const updated = current.includes(slug)
      ? current.filter(s => s !== slug)
      : [...current, slug]
    
    updateSetting('preferred_investors', updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Bitte melde dich an, um Notification-Einstellungen zu verwalten.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <BellIcon className="w-8 h-8 text-brand-light" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Benachrichtigungen</h2>
        <p className="text-gray-400">Verwalte deine E-Mail-Benachrichtigungen und Alerts</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-brand/10 border-brand/20 text-brand-light' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckIcon className="w-5 h-5" />
            ) : (
              <XMarkIcon className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Watchlist Notifications */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Watchlist-Alerts</h3>
            <p className="text-sm text-gray-400">Benachrichtigungen bei Kursrückgängen</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Watchlist-Benachrichtigungen</label>
              <p className="text-sm text-gray-400">E-Mails bei Schnäppchen in deiner Watchlist</p>
            </div>
            <button
              onClick={() => updateSetting('watchlist_enabled', !settings.watchlist_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.watchlist_enabled ? 'bg-brand' : 'bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.watchlist_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Threshold */}
          {settings.watchlist_enabled && (
            <div>
              <label className="block text-white font-medium mb-2">
                Benachrichtigung ab Rückgang von: {settings.watchlist_threshold_percent}%
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={settings.watchlist_threshold_percent}
                onChange={(e) => updateSetting('watchlist_threshold_percent', Number(e.target.value))}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5%</span>
                <span>15%</span>
                <span>30%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Superinvestor Filings */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Superinvestor-Filings</h3>
            <p className="text-sm text-gray-400">Neue 13F-Berichte deiner Lieblings-Investoren</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Filing-Benachrichtigungen</label>
              <p className="text-sm text-gray-400">E-Mails bei neuen Quartalsberichten</p>
            </div>
            <button
              onClick={() => updateSetting('filings_enabled', !settings.filings_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.filings_enabled ? 'bg-brand' : 'bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.filings_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Investor Selection */}
          {settings.filings_enabled && (
            <div>
              <label className="block text-white font-medium mb-3">
                Investoren auswählen:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {INVESTOR_OPTIONS.map(investor => (
                  <button
                    key={investor.slug}
                    onClick={() => toggleInvestor(investor.slug)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                      settings.preferred_investors.includes(investor.slug)
                        ? 'bg-brand/20 border-green-500/30 text-brand-light'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {investor.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Frequency */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <EnvelopeIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">E-Mail-Häufigkeit</h3>
            <p className="text-sm text-gray-400">Wie oft möchtest du Benachrichtigungen erhalten?</p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { value: 'immediate', label: 'Sofort', desc: 'Direkt wenn ein Alert ausgelöst wird' },
            { value: 'daily', label: 'Täglich', desc: 'Zusammenfassung einmal täglich' },
            { value: 'weekly', label: 'Wöchentlich', desc: 'Wöchentliche Zusammenfassung' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => updateSetting('email_frequency', option.value as any)}
              className={`w-full p-4 rounded-lg border text-left transition-all ${
                settings.email_frequency === option.value
                  ? 'bg-brand/20 border-green-500/30 text-brand-light'
                  : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-sm opacity-80">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="text-center">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-8 py-3 bg-brand hover:bg-green-400 text-black font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              Speichern...
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4" />
              Einstellungen speichern
            </>
          )}
        </button>
      </div>
    </div>
  )
}