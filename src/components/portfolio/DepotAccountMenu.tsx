// src/components/portfolio/DepotAccountMenu.tsx
// Kontomenü im Depot: mit welchem Konto man angemeldet ist, Profil,
// Einstellungen und Abmelden. Auf depot.finclue.de gibt es sonst keine
// Navigation der Hauptseite, über die man das erreicht.
'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { leaveDepotHref } from '@/lib/siteHosts'

/** isPremium weglassen, wenn der Status auf der Seite nicht bekannt ist */
export default function DepotAccountMenu({ isPremium }: { isPremium?: boolean }) {
  const [email, setEmail] = useState('')
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setEmail(session?.user?.email ?? '')
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function handlePointer(event: Event) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const signOut = async () => {
    setSigningOut(true)
    setError('')
    // Nur dieser Browser. Ohne scope meldet Supabase alle Geräte ab, auch die App.
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
    if (signOutError) {
      setSigningOut(false)
      setError('Abmelden hat nicht geklappt, bitte versuch es noch einmal.')
      return
    }
    // Ohne Sitzung zeigt depot.finclue.de seine Startseite. Ersetzt die
    // Weiterleitung zur Anmeldung, die das Terminal-Layout beim Abmelden auslöst.
    window.location.assign('/')
  }

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-theme-secondary transition-colors hover:bg-theme-hover hover:text-theme-primary'

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Konto"
        title={email || 'Konto'}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-theme bg-theme-secondary text-[12px] font-semibold text-theme-primary transition-colors hover:bg-theme-hover"
      >
        {email ? email[0].toUpperCase() : <UserIcon className="h-4 w-4" />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[60] mt-2 w-64 rounded-xl border border-theme bg-theme-card p-1.5 shadow-2xl"
        >
          <div className="px-2.5 pb-2.5 pt-1.5">
            <p className="text-[11px] text-theme-muted">Angemeldet als</p>
            <p className="truncate text-[13px] font-medium text-theme-primary" title={email}>
              {email || 'Unbekannt'}
            </p>
            {isPremium !== undefined && (
              <p className="mt-0.5 text-[11px] text-theme-muted">{isPremium ? 'Premium' : 'Kostenloses Konto'}</p>
            )}
          </div>
          <div className="border-t border-theme pt-1.5">
            <Link href={leaveDepotHref('/profile')} role="menuitem" className={itemClass}>
              <UserCircleIcon className="h-4 w-4 shrink-0" />
              Profil
            </Link>
            <Link href={leaveDepotHref('/settings')} role="menuitem" className={itemClass}>
              <Cog6ToothIcon className="h-4 w-4 shrink-0" />
              Einstellungen
            </Link>
          </div>
          <div className="mt-1.5 border-t border-theme pt-1.5">
            <button type="button" role="menuitem" onClick={signOut} disabled={signingOut} className={`${itemClass} disabled:opacity-60`}>
              <ArrowRightOnRectangleIcon className="h-4 w-4 shrink-0" />
              {signingOut ? 'Wird abgemeldet …' : 'Abmelden'}
            </button>
            {error && <p className="px-2.5 pb-1.5 pt-1 text-[11px] text-red-400">{error}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
