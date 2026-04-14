// Fey-Style Portfolio Layout mit Auth-Check
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { CurrencyProvider } from '@/lib/CurrencyContext'

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth/signin?redirect=/analyse/portfolio')
      } else {
        setAuthenticated(true)
      }
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/auth/signin')
    })

    return () => { listener.subscription.unsubscribe() }
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#06060e] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
      </div>
    )
  }

  if (!authenticated) return null

  return (
    <CurrencyProvider>
      {children}
    </CurrencyProvider>
  )
}
