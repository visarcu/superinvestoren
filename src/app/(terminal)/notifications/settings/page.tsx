// src/app/(terminal)/notifications/settings/page.tsx - VEREINFACHT
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { 
  BellIcon, 
  EnvelopeIcon, 
  ChartBarIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface NotificationSettings {
  watchlist_enabled: boolean
  watchlist_threshold_percent: number
  filings_enabled: boolean
  preferred_investors: string[]
  email_frequency: 'immediate' | 'daily' | 'weekly'
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    watchlist_enabled: true,
    watchlist_threshold_percent: 10,
    filings_enabled: false,
    preferred_investors: [],
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
    <div className="max-w-2xl mx-auto space-y-8 p-6">
      
      {/* Header */}
      <div>
        <Link
          href="/notifications"
          className="inline-flex items-center gap-2 text-theme-muted hover:text-theme-primary transition-colors mb-6 group"
        >
          <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Zurück zu Benachrichtigungen
        </Link>
        
        <div className="text-center">
          <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <BellIcon className="w-8 h-8 text-brand-light" />
          </div>
          <h2 className="text-2xl font-bold text-theme-primary mb-2">Benachrichtigungs-Einstellungen</h2>
          <p className="text-theme-muted">Verwalte deine E-Mail-Benachrichtigungen und Alerts</p>
        </div>
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
      <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-theme-primary">Watchlist-Alerts</h3>
            <p className="text-sm text-theme-muted">Benachrichtigungen bei Kursrückgängen</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-theme-primary font-medium">Watchlist-Benachrichtigungen</label>
              <p className="text-sm text-theme-muted">E-Mails bei Schnäppchen in deiner Watchlist</p>
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

          {settings.watchlist_enabled && (
            <div>
              <label className="block text-theme-primary font-medium mb-2">
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
              <div className="flex justify-between text-xs text-theme-muted mt-1">
                <span>5%</span>
                <span>15%</span>
                <span>30%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Superinvestor Filings - VEREINFACHT */}
      <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-theme-primary">Superinvestor-Filings</h3>
            <p className="text-sm text-theme-muted">Neue 13F-Berichte deiner gefolgten Investoren</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-theme-primary font-medium">Filing-Benachrichtigungen</label>
              <p className="text-sm text-theme-muted">E-Mails bei neuen Quartalsberichten</p>
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

          {/* Investor-Auswahl */}
          {settings.filings_enabled && (
            <div className="p-4 bg-theme-secondary rounded-lg">
              <p className="text-sm text-theme-muted mb-4">
                📊 Wähle Investoren aus, für die du Filing-Benachrichtigungen erhalten möchtest:
              </p>
              
              {/* Verfügbare Investoren */}
              <div className="grid grid-cols-2 gap-2 mb-4 max-h-96 overflow-y-auto">
                {[
                  { slug: 'buffett', name: 'Warren Buffett' },
                  { slug: 'ackman', name: 'Bill Ackman' },
                  { slug: 'gates', name: 'Bill Gates' },
                  { slug: 'torray', name: 'Torray Investment Partners' },
                  { slug: 'davis', name: 'Christopher Davis' },
                  { slug: 'altarockpartners', name: 'Mark Massey' },
                  { slug: 'greenhaven', name: 'Edgar Wachenheim III' },
                  { slug: 'vinall', name: 'Robert Vinall' },
                  { slug: 'meridiancontrarian', name: 'Meridian Contrarian Fund' },
                  { slug: 'hawkins', name: 'Mason Hawkins' },
                  { slug: 'olstein', name: 'Robert Olstein' },
                  { slug: 'peltz', name: 'Nelson Peltz' },
                  { slug: 'gregalexander', name: 'Greg Alexander' },
                  { slug: 'miller', name: 'Bill Miller' },
                  { slug: 'tangen', name: 'Nicolai Tangen' },
                  { slug: 'burry', name: 'Michael Burry' },
                  { slug: 'pabrai', name: 'Mohnish Pabrai' },
                  { slug: 'kantesaria', name: 'Dev Kantesaria' },
                  { slug: 'greenblatt', name: 'Joel Greenblatt' },
                  { slug: 'fisher', name: 'Ken Fisher' },
                  { slug: 'soros', name: 'George Soros' },
                  { slug: 'haley', name: 'Connor Haley' },
                  { slug: 'vandenberg', name: 'Arnold Van Den Berg' },
                  { slug: 'dodgecox', name: 'Dodge & Cox' },
                  { slug: 'pzena', name: 'Richard Pzena' },
                  { slug: 'mairspower', name: 'Mairs & Power Inc' },
                  { slug: 'weitz', name: 'Wallace Weitz' },
                  { slug: 'yacktman', name: 'Yacktman Asset Management' },
                  { slug: 'gayner', name: 'Thomas Gayner' },
                  { slug: 'armitage', name: 'John Armitage' },
                  { slug: 'burn', name: 'Harry Burn' },
                  { slug: 'cantillon', name: 'William von Mueffling' },
                  { slug: 'jensen', name: 'Eric Schoenstein' },
                  { slug: 'abrams', name: 'David Abrams' },
                  { slug: 'firsteagle', name: 'First Eagle Investment' },
                  { slug: 'polen', name: 'Polen Capital Management' },
                  { slug: 'tarasoff', name: 'Josh Tarasoff' },
                  { slug: 'rochon', name: 'Francois Rochon' },
                  { slug: 'russo', name: 'Thomas Russo' },
                  { slug: 'akre', name: 'Chuck Akre' },
                  { slug: 'triplefrond', name: 'Triple Frond Partners' },
                  { slug: 'whitman', name: 'Marty Whitman' },
                  { slug: 'patientcapital', name: 'Samantha McLemore' },
                  { slug: 'klarman', name: 'Seth Klarman' },
                  { slug: 'makaira', name: 'Tom Bancroft' },
                  { slug: 'ketterer', name: 'Sarah Ketterer' },
                  { slug: 'train', name: 'Lindsell Train' },
                  { slug: 'smith', name: 'Terry Smith' },
                  { slug: 'watsa', name: 'Prem Watsa' },
                  { slug: 'lawrence', name: 'Bryan Lawrence' },
                  { slug: 'dorsey', name: 'Pat Dorsey' },
                  { slug: 'hohn', name: 'Chris Hohn' },
                  { slug: 'hong', name: 'Dennis Hong' },
                  { slug: 'kahn', name: 'Kahn Brothers Group' },
                  { slug: 'coleman', name: 'Chase Coleman' },
                  { slug: 'dalio', name: 'Ray Dalio' },
                  { slug: 'loeb', name: 'Daniel Loeb' },
                  { slug: 'tepper', name: 'David Tepper' },
                  { slug: 'icahn', name: 'Carl Icahn' },
                  { slug: 'lilu', name: 'Li Lu' },
                  { slug: 'ainslie', name: 'Lee Ainslie' },
                  { slug: 'greenberg', name: 'Glenn Greenberg' },
                  { slug: 'mandel', name: 'Stephen Mandel' },
                  { slug: 'marks', name: 'Howard Marks' },
                  { slug: 'rogers', name: 'John Rogers' },
                  { slug: 'ariel_appreciation', name: 'Ariel Appreciation Fund' },
                  { slug: 'ariel_focus', name: 'Ariel Focus Fund' },
                  { slug: 'cunniff', name: 'Ruane, Cunniff & Goldfarb' },
                  { slug: 'spier', name: 'Guy Spier' },
                  { slug: 'chou', name: 'Francis Chou' },
                  { slug: 'sosin', name: 'Clifford Sosin' },
                  { slug: 'welling', name: 'Glenn Welling' },
                  { slug: 'lou', name: 'Norbert Lou' },
                  { slug: 'munger', name: 'Charlie Munger' },
                  { slug: 'ark_investment_management', name: 'Catherine Wood' },
                  { slug: 'cunniff_sequoia', name: 'Sequoia Fund' },
                  { slug: 'katz', name: 'David Katz' },
                  { slug: 'tweedy_browne_fund_inc', name: 'Tweedy Browne' }
                ].map(investor => {
                  const isSelected = settings.preferred_investors.includes(investor.slug)
                  return (
                    <button
                      key={investor.slug}
                      onClick={() => {
                        const newInvestors = isSelected
                          ? settings.preferred_investors.filter(i => i !== investor.slug)
                          : [...settings.preferred_investors, investor.slug]
                        updateSetting('preferred_investors', newInvestors)
                      }}
                      className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                        isSelected 
                          ? 'bg-brand/20 text-brand-light border border-green-500/30' 
                          : 'bg-theme-card border border-theme/10 text-theme-muted hover:text-theme-primary hover:border-theme/20'
                      }`}
                    >
                      {isSelected && '✓ '}{investor.name}
                    </button>
                  )
                })}
              </div>
              
              {settings.preferred_investors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-theme/10">
                  <p className="text-xs text-theme-muted mb-2">
                    Du folgst {settings.preferred_investors.length} Investor{settings.preferred_investors.length !== 1 ? 'en' : ''}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {settings.preferred_investors.map(investor => (
                      <span key={investor} className="px-2 py-1 bg-brand/20 text-brand-light rounded text-xs">
                        {investor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Email Frequency */}
      <div className="bg-theme-card border border-theme/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <EnvelopeIcon className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-theme-primary">E-Mail-Häufigkeit</h3>
            <p className="text-sm text-theme-muted">Wie oft möchtest du Benachrichtigungen erhalten?</p>
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
                  : 'bg-theme-secondary border-theme hover:bg-theme-hover'
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