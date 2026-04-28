'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

// ── Icons (inline SVGs, Heroicons style) ──────────────────────────

const HomeIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
)

const ToolsIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
)

const FinderIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h16.5m-13.5 7.5h10.5m-7.5 7.5h4.5" />
  </svg>
)

const CompareIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)

const DcfIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const PortfolioIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
)

// Stern-Icon für Watchlist
const WatchlistIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
    />
  </svg>
)

// ── Nav Items ──────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  match: (path: string) => boolean
}

const navItems: NavItem[] = [
  {
    href: '/analyse/home',
    label: 'Home',
    icon: <HomeIcon />,
    match: (p) => p === '/analyse/home',
  },
  {
    href: '/analyse/kalendar',
    label: 'Earnings',
    icon: <CalendarIcon />,
    match: (p) => p.startsWith('/analyse/kalendar'),
  },
  {
    href: '/analyse/maerkte',
    label: 'Märkte',
    icon: <ChartIcon />,
    match: (p) => p.startsWith('/analyse/maerkte'),
  },
  {
    href: '/analyse/meine-watchlist',
    label: 'Watchlist',
    icon: <WatchlistIcon />,
    match: (p) => p.startsWith('/analyse/meine-watchlist'),
  },
  {
    href: '/analyse/mein-portfolio',
    label: 'Portfolio',
    icon: <PortfolioIcon />,
    match: (p) => p.startsWith('/analyse/mein-portfolio'),
  },
]

// ── Component ─────────────────────────────────────────────────────

export default function FeyBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<{ ticker: string; name: string; exchange: string }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const [toolsOpen, setToolsOpen] = useState(false)

  // Cmd+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setSearch('')
        setSearchResults([])
        setSelectedIdx(0)
        setTimeout(() => searchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setToolsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Live search
  useEffect(() => {
    if (!search || search.length < 1) { setSearchResults([]); return }
    const timeout = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/v1/companies?search=${encodeURIComponent(search)}&pageSize=8`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data.data || [])
          setSelectedIdx(0)
        }
      } catch { /* ignore */ }
      setSearchLoading(false)
    }, 150)
    return () => clearTimeout(timeout)
  }, [search])

  const openSearch = () => {
    setSearchOpen(true)
    setSearch('')
    setSearchResults([])
    setSelectedIdx(0)
    setTimeout(() => searchRef.current?.focus(), 50)
  }

  return (
    <>
      {/* ── TOOLS SHEET ──────────────────────────────────── */}
      {toolsOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          onClick={() => setToolsOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div
            className="relative w-full sm:max-w-2xl mx-0 sm:mx-4 mb-0 sm:mb-0 animate-in fade-in slide-in-from-bottom-4 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[#111119] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                <div>
                  <p className="text-[10.5px] uppercase tracking-widest text-white/30 font-medium">
                    Tools
                  </p>
                  <h3 className="text-[15px] font-semibold text-white/90 mt-0.5">
                    Premium-Werkzeuge
                  </h3>
                </div>
                <button
                  onClick={() => setToolsOpen(false)}
                  className="text-white/30 hover:text-white/60"
                  aria-label="Schließen"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Cards */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <ToolCard
                  icon={<FinderIcon />}
                  title="Aktien-Screener"
                  subtitle="Filtern nach Marktkap, Sektor, Beta"
                  href="/analyse/aktien-screener"
                  onNavigate={() => setToolsOpen(false)}
                />
                <ToolCard
                  icon={<CompareIcon />}
                  title="Vergleich"
                  subtitle="Mehrere Aktien gegenüberstellen"
                  href="/analyse/vergleich"
                  onNavigate={() => setToolsOpen(false)}
                />
                <ToolCard
                  icon={<DcfIcon />}
                  title="DCF-Rechner"
                  subtitle="Fair-Value berechnen"
                  href="/analyse/dcf-rechner"
                  onNavigate={() => setToolsOpen(false)}
                />
              </div>

              {/* Footer hint */}
              <div className="px-5 py-3 border-t border-white/[0.04] flex items-center gap-3 text-[10.5px] text-white/25">
                <span className="flex items-center gap-1.5">
                  <kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">ESC</kbd>
                  Schließen
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SEARCH MODAL (Cmd+K) ─────────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative w-full max-w-xl mx-4 animate-in fade-in slide-in-from-top-4 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-[#111119] border border-white/[0.1] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 py-4">
                <svg className="w-5 h-5 text-white/25 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, (searchResults.length || 6) - 1)) }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
                    if (e.key === 'Enter') {
                      const target = searchResults.length > 0 ? searchResults[selectedIdx]?.ticker : search.trim().toUpperCase()
                      if (target) { router.push(`/analyse/aktien/${target}`); setSearch(''); setSearchOpen(false) }
                    }
                    if (e.key === 'Escape') setSearchOpen(false)
                  }}
                  placeholder="Aktie suchen..."
                  className="flex-1 bg-transparent text-[17px] text-white placeholder:text-white/25 focus:outline-none"
                  autoFocus
                />
                {searchLoading && <div className="w-4 h-4 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />}
                <kbd className="text-[10px] text-white/15 bg-white/[0.05] px-2 py-1 rounded-lg border border-white/[0.06]">ESC</kbd>
              </div>

              <div className="border-t border-white/[0.05]" />

              {/* Results */}
              <div className="py-2 max-h-[50vh] overflow-y-auto">
                {searchResults.length > 0 ? (
                  <>
                    <p className="text-[10px] text-white/15 uppercase tracking-widest font-medium px-5 py-1.5">Ergebnisse</p>
                    {searchResults.map((r, i) => (
                      <button
                        key={r.ticker}
                        onClick={() => { router.push(`/analyse/aktien/${r.ticker}`); setSearch(''); setSearchOpen(false) }}
                        onMouseEnter={() => setSelectedIdx(i)}
                        className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors ${
                          i === selectedIdx ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-white/40">{r.ticker.slice(0, 2)}</span>
                          </div>
                          <div className="text-left">
                            <p className="text-[13px] font-medium text-white/80">{r.ticker}</p>
                            <p className="text-[11px] text-white/25 truncate max-w-[280px]">{r.name}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-white/15">{r.exchange}</span>
                      </button>
                    ))}
                  </>
                ) : search.length > 0 && !searchLoading ? (
                  <div className="px-5 py-8 text-center">
                    <p className="text-[13px] text-white/20">Keine Ergebnisse für &quot;{search}&quot;</p>
                    <p className="text-[11px] text-white/10 mt-1">Drücke Enter um direkt zu {search.toUpperCase()} zu gehen</p>
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] text-white/15 uppercase tracking-widest font-medium px-5 py-1.5">Beliebt</p>
                    {[
                      { t: 'AAPL', n: 'Apple Inc.' }, { t: 'MSFT', n: 'Microsoft Corp.' },
                      { t: 'NVDA', n: 'NVIDIA Corp.' }, { t: 'TSLA', n: 'Tesla, Inc.' },
                      { t: 'GOOGL', n: 'Alphabet Inc.' }, { t: 'AMZN', n: 'Amazon.com' },
                    ].map((item, i) => (
                      <button
                        key={item.t}
                        onClick={() => { router.push(`/analyse/aktien/${item.t}`); setSearch(''); setSearchOpen(false) }}
                        onMouseEnter={() => setSelectedIdx(i)}
                        className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors ${
                          i === selectedIdx ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-bold text-white/40">{item.t.slice(0, 2)}</span>
                          </div>
                          <div className="text-left">
                            <p className="text-[13px] font-medium text-white/80">{item.t}</p>
                            <p className="text-[11px] text-white/25">{item.n}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center gap-5 text-[10px] text-white/15">
                <span className="flex items-center gap-1.5"><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">↑↓</kbd> Navigieren</span>
                <span className="flex items-center gap-1.5"><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">↵</kbd> Öffnen</span>
                <span className="flex items-center gap-1.5 ml-auto"><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]">⌘K</kbd> Suche</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING BOTTOM NAV (Fey-Style Pill) ───────────── */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <nav className="flex items-center gap-1 bg-[#141420]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          {navItems.map((item) => {
            const active = item.match(pathname)
            return active ? (
              <div key={item.href} className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl bg-white/[0.06]">
                <span className="text-white/70">{item.icon}</span>
                <span className="text-[9px] text-white/50">{item.label}</span>
              </div>
            ) : (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
                <span className="text-white/35 group-hover:text-white/70 transition-colors">{item.icon}</span>
                <span className="text-[9px] text-white/25 group-hover:text-white/50">{item.label}</span>
              </Link>
            )
          })}
          <button onClick={openSearch} className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl hover:bg-white/[0.06] transition-all group">
            <span className="text-white/35 group-hover:text-white/70 transition-colors"><SearchIcon /></span>
            <span className="text-[9px] text-white/25 group-hover:text-white/50">Suche</span>
          </button>
          <button
            onClick={() => setToolsOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all group ${
              toolsOpen ? 'bg-white/[0.06]' : 'hover:bg-white/[0.06]'
            }`}
            aria-label="Tools öffnen"
          >
            <span className={`transition-colors ${toolsOpen ? 'text-white/70' : 'text-white/35 group-hover:text-white/70'}`}>
              <ToolsIcon />
            </span>
            <span className={`text-[9px] ${toolsOpen ? 'text-white/50' : 'text-white/25 group-hover:text-white/50'}`}>
              Tools
            </span>
          </button>
        </nav>
      </div>
    </>
  )
}

// ── ToolCard ─────────────────────────────────────────────────────────

function ToolCard({
  icon,
  title,
  subtitle,
  href,
  comingSoon,
  onNavigate,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  href: string
  comingSoon?: boolean
  onNavigate: () => void
}) {
  const baseClasses =
    'group relative flex flex-col items-start gap-3 rounded-xl border bg-white/[0.015] p-4 text-left transition-all'

  if (comingSoon) {
    return (
      <div
        className={`${baseClasses} border-white/[0.04] cursor-not-allowed select-none`}
        aria-disabled
      >
        <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.05] flex items-center justify-center text-white/40">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-white/55">{title}</p>
            <span className="text-[9px] uppercase tracking-widest text-amber-300/70 bg-amber-400/[0.06] border border-amber-400/15 rounded px-1.5 py-0.5 font-medium">
              Bald
            </span>
          </div>
          <p className="text-[11px] text-white/30 mt-1 leading-snug">{subtitle}</p>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`${baseClasses} border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04]`}
    >
      <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/65 group-hover:text-white/85 transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white/85 group-hover:text-white">{title}</p>
        <p className="text-[11px] text-white/35 mt-1 leading-snug">{subtitle}</p>
      </div>
      <span className="absolute right-3 top-3 text-[10px] text-white/20 group-hover:text-white/50 transition-colors">→</span>
    </Link>
  )
}
