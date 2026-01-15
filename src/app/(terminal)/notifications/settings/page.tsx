// src/app/(terminal)/notifications/settings/page.tsx - FEY STYLE REDESIGN
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
  ArrowLeftIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface NotificationSettings {
  watchlist_enabled: boolean
  watchlist_threshold_percent: number
  filings_enabled: boolean
  preferred_investors: string[]
  email_frequency: 'immediate' | 'daily' | 'weekly'
  earnings_enabled: boolean
  earnings_email_enabled: boolean
  earnings_days_before: number
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    watchlist_enabled: true,
    watchlist_threshold_percent: 10,
    filings_enabled: false,
    preferred_investors: [],
    email_frequency: 'immediate',
    earnings_enabled: true,
    earnings_email_enabled: false,
    earnings_days_before: 3
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
          email_frequency: data.email_frequency,
          earnings_enabled: data.earnings_enabled ?? true,
          earnings_email_enabled: data.earnings_email_enabled ?? false,
          earnings_days_before: data.earnings_days_before ?? 3
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
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-theme-secondary text-sm">Lade Einstellungen...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-theme-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-theme-muted">Bitte melde dich an, um Einstellungen zu verwalten.</p>
        </div>
      </div>
    )
  }

  const investors = [
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
  ]

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-6 lg:px-8 py-8">

        {/* Header - Flat Style */}
        <div className="border-b border-theme pb-8 mb-8">
          <Link
            href="/inbox"
            className="inline-flex items-center gap-2 text-theme-muted hover:text-theme-primary transition-colors mb-6 group text-sm"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Zurück zur Inbox
          </Link>

          <div className="flex items-center gap-2 mb-3">
            <BellIcon className="w-4 h-4 text-theme-muted" />
            <span className="text-sm text-theme-muted">Einstellungen</span>
          </div>

          <h1 className="text-2xl font-semibold text-theme-primary mb-2">
            Benachrichtigungs-Einstellungen
          </h1>

          <p className="text-theme-secondary text-sm max-w-2xl">
            Verwalte deine E-Mail-Benachrichtigungen und Alerts. Wähle aus, welche Updates du erhalten möchtest.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckIcon className="w-5 h-5" />
              ) : (
                <XMarkIcon className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Watchlist Alerts Section */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-theme-secondary rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-medium text-theme-primary">Watchlist-Alerts</h2>
              <p className="text-theme-muted text-sm">Benachrichtigungen bei Kursrückgängen</p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-theme-primary">Watchlist-Benachrichtigungen</p>
                <p className="text-xs text-theme-muted">E-Mails bei Schnäppchen in deiner Watchlist</p>
              </div>
              <button
                onClick={() => updateSetting('watchlist_enabled', !settings.watchlist_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.watchlist_enabled
                    ? 'bg-emerald-500'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${
                  settings.watchlist_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {settings.watchlist_enabled && (
              <div className="py-3 border-t border-theme">
                <p className="text-sm font-medium text-theme-primary mb-3">
                  Benachrichtigung ab Rückgang von: {settings.watchlist_threshold_percent}%
                </p>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="5"
                  value={settings.watchlist_threshold_percent}
                  onChange={(e) => updateSetting('watchlist_threshold_percent', Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-theme-muted mt-2">
                  <span>5%</span>
                  <span>15%</span>
                  <span>30%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Superinvestor Filings Section */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-theme-secondary rounded-lg flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-medium text-theme-primary">Superinvestor-Filings</h2>
              <p className="text-theme-muted text-sm">Neue 13F-Berichte deiner gefolgten Investoren</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 max-w-md">
              <div>
                <p className="text-sm font-medium text-theme-primary">Filing-Benachrichtigungen</p>
                <p className="text-xs text-theme-muted">E-Mails bei neuen Quartalsberichten</p>
              </div>
              <button
                onClick={() => updateSetting('filings_enabled', !settings.filings_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.filings_enabled
                    ? 'bg-emerald-500'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${
                  settings.filings_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {settings.filings_enabled && (
              <div className="py-4 border-t border-theme">
                <p className="text-sm text-theme-muted mb-4">
                  Wähle Investoren aus, für die du Filing-Benachrichtigungen erhalten möchtest:
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                  {investors.map(investor => {
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
                        className={`p-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                          isSelected
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-theme-secondary text-theme-secondary hover:text-theme-primary border border-transparent hover:border-theme'
                        }`}
                      >
                        {isSelected && <span className="mr-1">✓</span>}
                        {investor.name}
                      </button>
                    )
                  })}
                </div>

                {settings.preferred_investors.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-theme">
                    <p className="text-xs text-theme-muted mb-2">
                      Du folgst {settings.preferred_investors.length} Investor{settings.preferred_investors.length !== 1 ? 'en' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {settings.preferred_investors.slice(0, 10).map(investor => (
                        <span key={investor} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-xs">
                          {investor}
                        </span>
                      ))}
                      {settings.preferred_investors.length > 10 && (
                        <span className="px-2 py-1 bg-theme-secondary text-theme-muted rounded text-xs">
                          +{settings.preferred_investors.length - 10} weitere
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Earnings Alerts Section */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-theme-secondary rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-medium text-theme-primary">Earnings-Alerts</h2>
              <p className="text-theme-muted text-sm">Erinnerungen für anstehende Quartalszahlen</p>
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-theme-primary">Earnings-Benachrichtigungen</p>
                <p className="text-xs text-theme-muted">In-App Alerts für Aktien in deiner Watchlist</p>
              </div>
              <button
                onClick={() => updateSetting('earnings_enabled', !settings.earnings_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.earnings_enabled
                    ? 'bg-emerald-500'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${
                  settings.earnings_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {settings.earnings_enabled && (
              <>
                <div className="flex items-center justify-between py-3 border-t border-theme">
                  <div>
                    <p className="text-sm font-medium text-theme-primary">E-Mail-Benachrichtigung</p>
                    <p className="text-xs text-theme-muted">Zusätzlich per E-Mail erinnern</p>
                  </div>
                  <button
                    onClick={() => updateSetting('earnings_email_enabled', !settings.earnings_email_enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.earnings_email_enabled
                        ? 'bg-emerald-500'
                        : 'bg-neutral-300 dark:bg-neutral-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${
                      settings.earnings_email_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="py-3 border-t border-theme">
                  <p className="text-sm font-medium text-theme-primary mb-3">
                    Erinnere mich {settings.earnings_days_before} Tag{settings.earnings_days_before !== 1 ? 'e' : ''} vorher
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 5, 7].map(days => (
                      <button
                        key={days}
                        onClick={() => updateSetting('earnings_days_before', days)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          settings.earnings_days_before === days
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-theme-secondary text-theme-secondary hover:text-theme-primary border border-transparent'
                        }`}
                      >
                        {days} {days === 1 ? 'Tag' : 'Tage'}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Email Frequency Section */}
        <div className="border-b border-theme pb-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-theme-secondary rounded-lg flex items-center justify-center">
              <EnvelopeIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-base font-medium text-theme-primary">E-Mail-Häufigkeit</h2>
              <p className="text-theme-muted text-sm">Wie oft möchtest du Benachrichtigungen erhalten?</p>
            </div>
          </div>

          <div className="space-y-2 max-w-md">
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
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-theme-secondary border-transparent hover:border-theme'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      settings.email_frequency === option.value ? 'text-emerald-400' : 'text-theme-primary'
                    }`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-theme-muted">{option.desc}</p>
                  </div>
                  {settings.email_frequency === option.value && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Spacer for sticky footer */}
        <div className="h-24"></div>
      </div>

      {/* Sticky Save Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a0a0b] border-t border-neutral-200 dark:border-white/[0.08] py-4 px-6 lg:px-8 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <p className="text-sm text-theme-muted hidden sm:block">
            Vergiss nicht deine Änderungen zu speichern
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <Link
              href="/inbox"
              className="px-5 py-2.5 text-theme-secondary hover:text-theme-primary font-medium transition-colors border border-neutral-200 dark:border-white/[0.08] rounded-lg hover:border-neutral-300 dark:hover:border-white/[0.15]"
            >
              Abbrechen
            </Link>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/25"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Speichern...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Speichern
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
