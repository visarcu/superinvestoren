'use client'

import { useEffect, useState } from 'react'

interface SideNavItem {
  id: string
  label: string
}

interface FeaturesSideNavProps {
  items: SideNavItem[]
}

export default function FeaturesSideNav({ items }: FeaturesSideNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '')

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        rootMargin: '-30% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [items])

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: 'smooth' })
    setActiveId(id)
  }

  return (
    <nav aria-label="Features-Navigation" className="sticky top-24">
      <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-4 pl-3">
        Features
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = activeId === item.id
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className={`block text-sm py-2 pl-3 border-l-2 transition-colors ${
                  isActive
                    ? 'text-white border-brand-light font-medium'
                    : 'text-neutral-500 hover:text-neutral-300 border-transparent'
                }`}
              >
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
