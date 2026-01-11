'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  Squares2X2Icon,
  FireIcon,
  EyeIcon,
  Cog6ToothIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Übersicht',
    items: [
      { href: '/superinvestor', label: 'Dashboard', icon: HomeIcon },
      { href: '/superinvestor/investors', label: 'Alle Investoren', icon: UsersIcon },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { href: '/superinvestor/insights', label: 'Market Insights', icon: ChartBarIcon },
      { href: '/superinvestor/momentum', label: 'Momentum', icon: ArrowTrendingUpIcon },
      { href: '/superinvestor/sectors', label: 'Sektoren', icon: Squares2X2Icon },
    ],
  },
  {
    label: 'Aktivität',
    items: [
      { href: '/superinvestor/activity', label: 'Aktivität', icon: FireIcon },
      { href: '/superinvestor/insider', label: 'Insider Trading', icon: EyeIcon },
    ],
  },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/superinvestor') {
      return pathname === path
    }
    return pathname.startsWith(path)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo Header - aligned with top navbar h-14 */}
      <div className="h-14 -mx-4 -mt-4 px-4 flex items-center border-b border-neutral-800/50 mb-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-neutral-300 hover:text-white transition-colors"
        >
          {/* Finclue Logo */}
          <div className="flex items-end gap-0.5">
            <div className="w-1.5 h-3 bg-emerald-500 rounded-sm"></div>
            <div className="w-1.5 h-4 bg-emerald-500 rounded-sm"></div>
            <div className="w-1.5 h-5 bg-emerald-500 rounded-sm"></div>
          </div>
          <span className="text-sm font-semibold tracking-tight">Finclue</span>
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-6">
        {navSections.map((section, sectionIndex) => (
          <div key={section.label}>
            <div
              className={`text-[11px] font-medium text-neutral-500 uppercase tracking-wider px-3 mb-2 ${
                sectionIndex === 0 ? '' : 'mt-6'
              }`}
            >
              {section.label}
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:translate-x-0.5 ${
                        active
                          ? 'bg-neutral-800 text-white'
                          : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          active ? 'text-neutral-300' : 'text-neutral-500'
                        }`}
                      />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Settings Link (Bottom) */}
      <div className="pt-4 border-t border-neutral-800/50">
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-all duration-150 hover:translate-x-0.5"
        >
          <Cog6ToothIcon className="w-4 h-4 text-neutral-500" />
          Einstellungen
        </Link>
      </div>
    </div>
  )
}

export default function SuperinvestorSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
        aria-label="Open menu"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-60 bg-[#0F0F11] border-r border-neutral-800/50 p-4 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen w-60 bg-[#0F0F11] border-r border-neutral-800/50 p-4 z-50 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
          aria-label="Close menu"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>
    </>
  )
}
