'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const BellIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
)

const InboxIcon = () => (
  <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 01.546-1.47l5.66-6.6a2.25 2.25 0 011.704-.774h6.18a2.25 2.25 0 011.704.774l5.66 6.6a2.25 2.25 0 01.546 1.47v10.281z" />
  </svg>
)

export default function FeyTopBar() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setOpen(false)
    router.replace('/auth/signin')
  }

  const initials = user?.email ? user.email.charAt(0).toUpperCase() : '?'
  const displayName = user?.email?.split('@')[0] ?? ''

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {loading ? null : !user ? (
        <Link
          href="/auth/signin"
          className="text-[12px] text-white/60 hover:text-white/90 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] backdrop-blur-md transition-colors"
        >
          Anmelden
        </Link>
      ) : (
        <>
          {/* Notifications Bell */}
          <Link
            href="/notifications"
            aria-label="Benachrichtigungen"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] backdrop-blur-md text-white/40 hover:text-white/80 transition-colors"
          >
            <BellIcon />
          </Link>

          {/* Avatar + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setOpen(o => !o)}
              aria-label="Profilmenü öffnen"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] backdrop-blur-md text-[12px] font-semibold text-white/70 hover:text-white/90 transition-colors"
            >
              {initials}
            </button>

            {open && (
              <div className="absolute top-[calc(100%+8px)] right-0 w-[260px] bg-[#141420]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header */}
                <div className="px-4 py-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.08] text-[13px] font-semibold text-white/80">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-white/85 truncate">{displayName}</p>
                      <p className="text-[11px] text-white/35 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu */}
                <div className="py-1.5">
                  {[
                    { href: '/profil', icon: <UserIcon />, label: 'Profil' },
                    { href: '/inbox', icon: <InboxIcon />, label: 'Inbox' },
                    { href: '/notifications', icon: <BellIcon />, label: 'Benachrichtigungen' },
                    { href: '/settings', icon: <SettingsIcon />, label: 'Einstellungen' },
                  ].map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-[12.5px] text-white/65 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="text-white/40 [&_svg]:w-[14px] [&_svg]:h-[14px]">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Logout */}
                <div className="border-t border-white/[0.05] py-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-[12.5px] text-white/65 hover:text-white/90 hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="text-white/40"><LogoutIcon /></span>
                    <span>Abmelden</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
