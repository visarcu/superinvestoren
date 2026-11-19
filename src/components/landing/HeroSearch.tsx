'use client'

// Große Suche im Hero der Startseite: der direkteste Weg, Finclue
// auszuprobieren — ohne Anmeldung, mit sofortigem Ergebnis.
// Leeres Feld + Fokus → "Beliebt"-Vorschläge statt einer extra Chip-Reihe.

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { getSearchSuggestions, type SearchResult } from '@/lib/searchSuggestions'

export default function HeroSearch({ quickPicks }: { quickPicks: SearchResult[] }) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const router = useRouter()

  const isEmpty = term.trim() === ''
  const items: SearchResult[] = isEmpty ? quickPicks : getSearchSuggestions(term, { stockLimit: 5, investorLimit: 3 })

  useEffect(() => {
    setActive(0)
  }, [term])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(i => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[active]) go(items[active].href)
      else if (!isEmpty) go(`/search?q=${encodeURIComponent(term.trim())}`)
    }
  }

  const showList = open && items.length > 0

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto text-left">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
      <input
        type="search"
        value={term}
        onChange={e => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Aktie, ETF oder Investor suchen …"
        aria-label="Aktie, ETF oder Investor suchen"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        className="w-full h-14 pl-12 pr-4 rounded-xl bg-neutral-900/80 border border-neutral-800 text-base text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 transition-colors"
      />

      {showList && (
        <div className="absolute z-30 top-full left-0 right-0 mt-2 p-1 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl max-h-80 overflow-y-auto">
          {isEmpty && <div className="px-3 pt-2 pb-1 text-xs text-neutral-500">Beliebt</div>}
          <ul id={listId} role="listbox">
            {items.map((s, i) => (
              <li key={`${s.type}-${s.id}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(s.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    i === active ? 'bg-neutral-800' : ''
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                      s.type === 'stock' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400'
                    }`}
                  >
                    {s.title.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white truncate">{s.title}</span>
                    <span className="block text-xs text-neutral-500 truncate">{s.subtitle}</span>
                  </span>
                  {s.type === 'investor' && <span className="text-[11px] text-neutral-600">Investor</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
