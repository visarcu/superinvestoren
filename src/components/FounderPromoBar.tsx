'use client'

// Schmale Leiste unter der Navigation während der Black-Friday-Aktion (27.–30.11.2026).
// Rendert erst nach dem Mounten mit der Uhrzeit des Browsers, damit zwischengespeichertes
// Server-HTML (ISR) die Leiste nie zu früh oder zu spät zeigt. Der abgerechnete Preis
// wird unabhängig davon serverseitig im Checkout bestimmt.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatEur, getPricing } from '@/lib/pricing'

export default function FounderPromoBar() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  if (!now) return null

  const pricing = getPricing(now)
  if (!pricing.founderPromoActive) return null

  return (
    <Link
      href="/pricing"
      className="block w-full border-b border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center text-sm text-white transition-colors hover:bg-emerald-500/15"
    >
      🔥 Black Friday: Premium-Jahresabo zum Gründerpreis von{' '}
      <span className="font-semibold">{formatEur(pricing.yearly)} €</span> – dauerhaft. Nur bis 30. November.{' '}
      <span className="font-medium text-emerald-400">Jetzt sichern →</span>
    </Link>
  )
}
