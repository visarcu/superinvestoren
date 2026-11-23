// src/components/depot/DepotCta.tsx
// Hauptknopf der Depot-Landingpage. Abgemeldet geht es mit einem Klick zur
// Registrierung und danach ins Depot, angemeldet direkt ins Depot. Ein Link auf
// /analyse/portfolio würde Abgemeldete nur auf die fast gleiche Startseite von
// depot.finclue.de umleiten.
'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { WORKSPACE_PATH } from '@/lib/depotRoutes'
import { enterDepotHref, isOnDepotHost } from '@/lib/siteHosts'

export default function DepotCta({ signupHref, className }: { signupHref: string; className: string }) {
  // null = abgemeldet (auch beim Server-Rendering)
  const [depotLink, setDepotLink] = useState<string | null>(null)

  useEffect(() => {
    // Auf der Subdomain sehen diese Seite nur Abgemeldete (siehe Middleware)
    if (isOnDepotHost()) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setDepotLink(session ? enterDepotHref(WORKSPACE_PATH) : null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Link href={depotLink ?? signupHref} className={className}>
      {depotLink ? 'Zu deinem Depot' : 'Depot kostenlos anlegen'}
      <ArrowRightIcon className="w-4 h-4" />
    </Link>
  )
}
