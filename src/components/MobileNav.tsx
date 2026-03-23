'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  BriefcaseIcon,
  BookmarkIcon,
  SparklesIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  BriefcaseIcon as BriefcaseIconSolid,
  BookmarkIcon as BookmarkIconSolid,
  SparklesIcon as SparklesIconSolid,
  UserCircleIcon as UserCircleIconSolid,
} from '@heroicons/react/24/solid'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/analyse',
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
    match: (p: string) => p === '/analyse',
  },
  {
    label: 'Portfolio',
    href: '/analyse/portfolio/dashboard',
    icon: BriefcaseIcon,
    activeIcon: BriefcaseIconSolid,
    match: (p: string) => p.startsWith('/analyse/portfolio'),
  },
  {
    label: 'Watchlist',
    href: '/analyse/watchlist',
    icon: BookmarkIcon,
    activeIcon: BookmarkIconSolid,
    match: (p: string) => p.startsWith('/analyse/watchlist'),
  },
  {
    label: 'Investoren',
    href: '/superinvestor',
    icon: SparklesIcon,
    activeIcon: SparklesIconSolid,
    match: (p: string) => p.startsWith('/superinvestor'),
  },
  {
    label: 'Profil',
    href: '/profile',
    icon: UserCircleIcon,
    activeIcon: UserCircleIconSolid,
    match: (p: string) => p.startsWith('/profile') || p.startsWith('/settings'),
  },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="bg-[#0f0f0f] border-t border-[#1a1a1a] flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(pathname)
          const Icon = isActive ? item.activeIcon : item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-1 min-h-[56px] touch-manipulation"
            >
              <Icon
                className={`w-6 h-6 transition-colors ${
                  isActive ? 'text-green-500' : 'text-[#666]'
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? 'text-green-500' : 'text-[#666]'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
