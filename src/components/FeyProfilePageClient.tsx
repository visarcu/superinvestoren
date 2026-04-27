'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { usePremiumStatus } from '@/lib/premiumUtils'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface UserProfile {
  first_name: string | null
  last_name: string | null
  email_verified: boolean
  premium_since: string | null
}

export default function FeyProfilePageClient() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const { premiumStatus } = usePremiumStatus(user?.id ?? null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      if (!session?.user) {
        router.replace('/auth/signin')
        return
      }

      setUser(session.user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, email_verified, premium_since')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (mounted) {
        setProfile(profileData ?? {
          first_name: null,
          last_name: null,
          email_verified: false,
          premium_since: null,
        })
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/auth/signin')
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 pb-32">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    )
  }

  const initials = profile?.first_name
    ? profile.first_name.charAt(0).toUpperCase()
    : (user.email ?? '?').charAt(0).toUpperCase()

  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
    : (user.email ?? '').split('@')[0]

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    : '—'

  const premiumSince = profile?.premium_since
    ? new Date(profile.premium_since).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    : null

  const isPremium = premiumStatus.isPremium

  return (
    <div className="min-h-screen pt-16 pb-32 px-6 sm:px-10">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Section header */}
        <div>
          <p className="text-[10.5px] uppercase tracking-widest text-white/30 font-medium mb-2">
            Account
          </p>
          <h1 className="text-[28px] font-semibold text-white tracking-tight">Profil</h1>
        </div>

        {/* Profile card */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6">
          <div className="flex items-start gap-5">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-[24px] font-semibold flex-shrink-0 ${
                isPremium
                  ? 'bg-gradient-to-br from-amber-400/15 to-amber-600/10 text-amber-300/90 border border-amber-400/20'
                  : 'bg-white/[0.06] text-white/70 border border-white/[0.08]'
              }`}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[17px] font-semibold text-white truncate">{displayName}</h2>
              <p className="text-[13px] text-white/40 truncate mt-0.5">{user.email}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {isPremium ? (
                  <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-amber-300/90 bg-amber-400/[0.08] border border-amber-400/15 rounded-md px-2 py-0.5 uppercase tracking-wider">
                    <span className="w-1 h-1 rounded-full bg-amber-300/90" />
                    Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[10.5px] font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] rounded-md px-2 py-0.5 uppercase tracking-wider">
                    Free
                  </span>
                )}
                {!profile?.email_verified && (
                  <span
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-400/85 bg-amber-500/[0.08] border border-amber-500/15 rounded-md px-2 py-0.5 uppercase tracking-wider"
                    title="Bestätige deine Email-Adresse, um alle Funktionen freizuschalten"
                  >
                    Email nicht bestätigt
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-white/[0.04]">
            <Stat label="Mitglied seit">{memberSince}</Stat>
            {premiumSince && <Stat label="Premium seit">{premiumSince}</Stat>}
          </div>
        </section>

        {/* Plan section */}
        <section className="space-y-3">
          <SectionTitle>Plan</SectionTitle>
          {isPremium ? (
            <Row
              label="Premium aktiv"
              hint="Du nutzt alle Premium-Features. Dein Abo läuft monatlich weiter."
              action={
                <Link
                  href="/pricing"
                  className="text-[12px] text-white/55 hover:text-white/85 transition-colors"
                >
                  Verwalten →
                </Link>
              }
            />
          ) : (
            <Row
              label="Auf Premium upgraden"
              hint="Quartalsdaten, AI-Analyse, Insider-Trades und mehr."
              action={
                <Link
                  href="/pricing"
                  className="text-[12px] font-medium text-amber-300/90 hover:text-amber-300 transition-colors"
                >
                  Upgrade →
                </Link>
              }
            />
          )}
        </section>

        {/* Account section */}
        <section className="space-y-3">
          <SectionTitle>Konto</SectionTitle>
          <Row
            label="Einstellungen"
            hint="Theme, Benachrichtigungen, App-Optionen"
            action={
              <Link href="/settings" className="text-[12px] text-white/55 hover:text-white/85 transition-colors">
                Öffnen →
              </Link>
            }
          />
          <Row
            label="Email Support"
            hint="Fragen, Feedback, Hilfe — wir antworten meist am selben Tag"
            action={
              <a
                href="mailto:team@finclue.de?subject=Support-Anfrage"
                className="text-[12px] text-white/55 hover:text-white/85 transition-colors"
              >
                Schreiben →
              </a>
            }
          />
        </section>

        {/* Logout */}
        <section>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-red-500/[0.04] hover:border-red-500/20 px-5 py-3.5 text-left transition-colors group"
          >
            <span className="text-[13px] font-medium text-white/70 group-hover:text-red-400/85 transition-colors">
              Abmelden
            </span>
            <svg
              className="w-4 h-4 text-white/30 group-hover:text-red-400/70 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.6}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
              />
            </svg>
          </button>
        </section>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] uppercase tracking-widest text-white/30 font-medium px-1">
      {children}
    </p>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-white/30 font-medium mb-1">{label}</p>
      <p className="text-[13px] text-white/80">{children}</p>
    </div>
  )
}

function Row({
  label,
  hint,
  action,
}: {
  label: string
  hint: string
  action: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-white/[0.01] px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-white/85">{label}</p>
        <p className="text-[11.5px] text-white/35 mt-0.5 truncate">{hint}</p>
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  )
}
