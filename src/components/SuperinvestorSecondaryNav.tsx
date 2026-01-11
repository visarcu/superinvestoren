'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  UsersIcon,
  ChartBarIcon,
  EyeIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: {
    text: string
    type: 'new' | 'live' | 'soon'
  }
}

const navItems: NavItem[] = [
  {
    href: '/superinvestor',
    label: 'Dashboard',
    icon: HomeIcon,
  },
  {
    href: '/superinvestor/investors',
    label: 'Alle Investoren',
    icon: UsersIcon,
  },
  {
    href: '/superinvestor/insights',
    label: 'Market Insights',
    icon: ChartBarIcon,
  },
  {
    href: '/superinvestor/momentum',
    label: 'Momentum',
    icon: ArrowTrendingUpIcon,
  },
  {
    href: '/superinvestor/sectors',
    label: 'Sektoren',
    icon: BuildingOfficeIcon,
    badge: {
      text: 'NEU',
      type: 'new'
    }
  },
  {
    href: '/superinvestor/activity',
    label: 'Aktivität',
    icon: FireIcon,
  },
  {
    href: '/superinvestor/insider',
    label: 'Insider Trading',
    icon: EyeIcon,
    badge: {
      text: 'Live',
      type: 'live'
    }
  },
]

function Badge({ badge }: { badge: NavItem['badge'] }) {
  if (!badge) return null

  const styles = {
    new: 'bg-brand/20 text-brand-light border-green-500/30',
    live: 'bg-red-500/20 text-red-400 border-red-500/30',
    soon: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }

  return (
    <span className={`ml-1.5 px-1.5 py-0.5 text-xs font-medium rounded-full border ${styles[badge.type]}`}>
      {badge.type === 'live' && (
        <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full mr-1 animate-pulse" />
      )}
      {badge.text}
    </span>
  )
}

export default function SuperinvestorSecondaryNav() {
  const pathname = usePathname()

  // Only show on superinvestor routes
  if (!pathname.startsWith('/superinvestor')) {
    return null
  }

  return (
    <div className="sticky top-[100px] z-40 px-4 sm:px-6 mb-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-theme-card backdrop-blur-xl rounded-2xl p-3">
          <nav className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || 
                            (item.href !== '/superinvestor' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all duration-300 hover:scale-105 ${
                    isActive
                      ? 'bg-brand/20 text-brand-light border border-green-500/30 shadow-lg shadow-brand/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge badge={item.badge} />
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}