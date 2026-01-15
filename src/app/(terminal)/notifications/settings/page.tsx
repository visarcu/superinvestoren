// src/app/(terminal)/notifications/settings/page.tsx - CLEAN FEY STYLE
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  EnvelopeIcon,
  ChartBarIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  CalendarIcon,
  LockClosedIcon
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
  const [isPremium, setIsPremium] = useState(false)

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

      // Load Premium status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', session.user.id)
        .single()

      setIsPremium(profile?.is_premium || false)

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
          <div className="w-6 h-6 border-2 border-theme-muted border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
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

  // Reusable checkbox component
  const SettingToggle = ({
    enabled,
    onToggle,
    disabled = false
  }: {
    enabled: boolean
    onToggle: () => void
    disabled?: boolean
  }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`flex items-center justify-center w-5 h-5 rounded border transition-all ${
          enabled
            ? 'bg-theme-primary border-theme-primary text-white dark:bg-white dark:border-white dark:text-black'
            : 'bg-transparent border-neutral-300 dark:border-neutral-600'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        {enabled && <CheckIcon className="w-3 h-3" />}
      </button>
      <span className={`text-xs ${enabled ? 'text-theme-primary' : 'text-theme-muted'}`}>
        {enabled ? 'Aktiv' : 'Inaktiv'}
      </span>
    </div>
  )

  // Premium lock inline hint
  const PremiumHint = ({ text }: { text: string }) => (
    <div className="flex items-center gap-2 mt-1">
      <LockClosedIcon className="w-3 h-3 text-theme-muted" />
      <span className="text-xs text-theme-muted">{text}</span>
      <Link href="/pricing" className="text-xs text-theme-primary hover:underline">
        Upgrade
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-2xl px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-10">
          <Link
            href="/inbox"
            className="inline-flex items-center gap-2 text-theme-muted hover:text-theme-primary transition-colors mb-6 group text-sm"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Zurück zur Inbox
          </Link>

          <h1 className="text-xl font-semibold text-theme-primary mb-1">
            Benachrichtigungen
          </h1>
          <p className="text-theme-muted text-sm">
            Verwalte deine Alerts und E-Mail-Einstellungen
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckIcon className="w-4 h-4" /> : <XMarkIcon className="w-4 h-4" />}
              {message.text}
            </div>
          </div>
        )}

        {/* Settings Sections */}
        <div className="space-y-8">

          {/* Watchlist Alerts */}
          <section className="pb-8 border-b border-neutral-200 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 mb-6">
              <ChartBarIcon className="w-5 h-5 text-theme-muted" />
              <div>
                <h2 className="text-sm font-medium text-theme-primary">Watchlist-Alerts</h2>
                <p className="text-xs text-theme-muted">Benachrichtigungen bei Kursrückgängen</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-theme-primary">In-App Benachrichtigungen</p>
                  <p className="text-xs text-theme-muted">Alerts in der App</p>
                </div>
                <SettingToggle
                  enabled={settings.watchlist_enabled}
                  onToggle={() => updateSetting('watchlist_enabled', !settings.watchlist_enabled)}
                />
              </div>

              {settings.watchlist_enabled && (
                <div className="pl-0 pt-4 border-t border-neutral-100 dark:border-white/[0.04]">
                  <p className="text-sm text-theme-primary mb-3">
                    Schwelle: <span className="font-medium">{settings.watchlist_threshold_percent}%</span> unter 52W-Hoch
                  </p>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={settings.watchlist_threshold_percent}
                    onChange={(e) => updateSetting('watchlist_threshold_percent', Number(e.target.value))}
                    className="w-full accent-neutral-900 dark:accent-white"
                  />
                  <div className="flex justify-between text-xs text-theme-muted mt-1">
                    <span>5%</span>
                    <span>15%</span>
                    <span>30%</span>
                  </div>
                </div>
              )}

              {!isPremium && (
                <PremiumHint text="E-Mail-Benachrichtigungen sind ein Premium-Feature" />
              )}
            </div>
          </section>

          {/* Superinvestor Filings */}
          <section className="pb-8 border-b border-neutral-200 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 mb-6">
              <UserIcon className="w-5 h-5 text-theme-muted" />
              <div>
                <h2 className="text-sm font-medium text-theme-primary">
                  Superinvestor-Filings
                  {!isPremium && <span className="ml-2 text-[10px] text-theme-muted font-normal">Premium</span>}
                </h2>
                <p className="text-xs text-theme-muted">Neue 13F-Berichte deiner gefolgten Investoren</p>
              </div>
            </div>

            {!isPremium ? (
              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/[0.06]">
                <div className="flex items-start gap-3">
                  <LockClosedIcon className="w-4 h-4 text-theme-muted mt-0.5" />
                  <div>
                    <p className="text-sm text-theme-primary mb-1">Premium-Feature</p>
                    <p className="text-xs text-theme-muted mb-3">
                      Folge Superinvestoren und erhalte Benachrichtigungen bei neuen 13F-Filings.
                    </p>
                    <Link
                      href="/pricing"
                      className="text-xs text-theme-primary hover:underline"
                    >
                      Upgrade zu Premium →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-theme-primary">Filing-Benachrichtigungen</p>
                    <p className="text-xs text-theme-muted">E-Mails bei neuen Quartalsberichten</p>
                  </div>
                  <SettingToggle
                    enabled={settings.filings_enabled}
                    onToggle={() => updateSetting('filings_enabled', !settings.filings_enabled)}
                  />
                </div>

                {settings.filings_enabled && (
                  <div className="pt-4 border-t border-neutral-100 dark:border-white/[0.04]">
                    <p className="text-xs text-theme-muted mb-3">
                      Investoren auswählen:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-60 overflow-y-auto">
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
                            className={`p-2 rounded text-xs text-left transition-colors ${
                              isSelected
                                ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                                : 'bg-neutral-100 dark:bg-white/[0.04] text-theme-secondary hover:bg-neutral-200 dark:hover:bg-white/[0.08]'
                            }`}
                          >
                            {investor.name}
                          </button>
                        )
                      })}
                    </div>
                    {settings.preferred_investors.length > 0 && (
                      <p className="text-xs text-theme-muted mt-3">
                        {settings.preferred_investors.length} ausgewählt
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Earnings Alerts */}
          <section className="pb-8 border-b border-neutral-200 dark:border-white/[0.06]">
            <div className="flex items-center gap-3 mb-6">
              <CalendarIcon className="w-5 h-5 text-theme-muted" />
              <div>
                <h2 className="text-sm font-medium text-theme-primary">Earnings-Alerts</h2>
                <p className="text-xs text-theme-muted">Erinnerungen für anstehende Quartalszahlen</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-theme-primary">In-App Benachrichtigungen</p>
                  <p className="text-xs text-theme-muted">Alerts für Aktien in deiner Watchlist</p>
                </div>
                <SettingToggle
                  enabled={settings.earnings_enabled}
                  onToggle={() => updateSetting('earnings_enabled', !settings.earnings_enabled)}
                />
              </div>

              {settings.earnings_enabled && (
                <>
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-white/[0.04]">
                    <div>
                      <p className="text-sm text-theme-primary">Wöchentliche E-Mail-Übersicht</p>
                      <p className="text-xs text-theme-muted">Jeden Montag per E-Mail</p>
                      {!isPremium && <PremiumHint text="Premium-Feature" />}
                    </div>
                    <SettingToggle
                      enabled={settings.earnings_email_enabled}
                      onToggle={() => updateSetting('earnings_email_enabled', !settings.earnings_email_enabled)}
                      disabled={!isPremium}
                    />
                  </div>

                  <div className="pt-4 border-t border-neutral-100 dark:border-white/[0.04]">
                    <p className="text-sm text-theme-primary mb-3">
                      Erinnerung: <span className="font-medium">{settings.earnings_days_before} {settings.earnings_days_before === 1 ? 'Tag' : 'Tage'}</span> vorher
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 5, 7].map(days => (
                        <button
                          key={days}
                          onClick={() => updateSetting('earnings_days_before', days)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                            settings.earnings_days_before === days
                              ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                              : 'bg-neutral-100 dark:bg-white/[0.04] text-theme-secondary hover:bg-neutral-200 dark:hover:bg-white/[0.08]'
                          }`}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Email Frequency */}
          <section className="pb-8">
            <div className="flex items-center gap-3 mb-6">
              <EnvelopeIcon className="w-5 h-5 text-theme-muted" />
              <div>
                <h2 className="text-sm font-medium text-theme-primary">
                  E-Mail-Häufigkeit
                  {!isPremium && <span className="ml-2 text-[10px] text-theme-muted font-normal">Premium</span>}
                </h2>
                <p className="text-xs text-theme-muted">Wie oft möchtest du E-Mails erhalten?</p>
              </div>
            </div>

            {!isPremium ? (
              <PremiumHint text="E-Mail-Einstellungen sind ein Premium-Feature" />
            ) : (
              <div className="space-y-2">
                {[
                  { value: 'immediate', label: 'Sofort', desc: 'Direkt wenn ein Alert ausgelöst wird' },
                  { value: 'daily', label: 'Täglich', desc: 'Zusammenfassung einmal täglich' },
                  { value: 'weekly', label: 'Wöchentlich', desc: 'Wöchentliche Zusammenfassung' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateSetting('email_frequency', option.value as any)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      settings.email_frequency === option.value
                        ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-white/[0.04]'
                        : 'border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/[0.1]'
                    }`}
                  >
                    <p className="text-sm text-theme-primary">{option.label}</p>
                    <p className="text-xs text-theme-muted">{option.desc}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Spacer for sticky footer */}
        <div className="h-20"></div>
      </div>

      {/* Sticky Save Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0a0a0b] border-t border-neutral-200 dark:border-white/[0.06] py-3 px-6 lg:px-8 z-50">
        <div className="max-w-2xl flex items-center justify-end gap-3">
          <Link
            href="/inbox"
            className="px-4 py-2 text-sm text-theme-secondary hover:text-theme-primary transition-colors"
          >
            Abbrechen
          </Link>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Speichern...
              </>
            ) : (
              'Speichern'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
