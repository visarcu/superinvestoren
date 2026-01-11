// src/components/Navbar.tsx - QUARTR/LINEAR STYLE
'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Disclosure } from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ChartBarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'
import { usePathname } from 'next/navigation'

// Search Result Interface
interface SearchResult {
  type: 'stock' | 'investor';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

// Search Bar Component
function SearchBar({ onNavigate }: { onNavigate?: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = searchTerm.trim().toUpperCase();
    const results: SearchResult[] = [];

    const filteredStocks = stocks
      .filter(
        (stock) =>
          stock.ticker.startsWith(query) ||
          stock.name.toUpperCase().includes(query)
      )
      .slice(0, 6)
      .map((stock): SearchResult => ({
        type: 'stock',
        id: stock.ticker,
        title: stock.ticker,
        subtitle: stock.name,
        href: `/analyse/stocks/${stock.ticker}`
      }));

    const filteredInvestors = investors
      .filter(
        (investor) =>
          investor.name.toUpperCase().includes(query) ||
          investor.slug.toUpperCase().includes(query)
      )
      .slice(0, 4)
      .map((investor): SearchResult => ({
        type: 'investor',
        id: investor.slug,
        title: investor.name.split('–')[0].trim(),
        subtitle: `Investor Portfolio`,
        href: `/superinvestor/${investor.slug}`
      }));

    results.push(...filteredStocks, ...filteredInvestors);
    setSuggestions(results);
    setShowSuggestions(results.length > 0 && isFocused);
  }, [searchTerm, isFocused]);

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    setIsFocused(false);
    onNavigate?.();
    router.push(result.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleSelectResult(suggestions[0]);
      } else if (searchTerm.trim()) {
        onNavigate?.();
        router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      }
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative flex items-center">
        <MagnifyingGlassIcon className="absolute left-3 h-4 w-4 text-neutral-500 z-10" />
        <input
          type="text"
          placeholder="Suche..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          <div className="p-1">
            {suggestions.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelectResult(result)}
                className="w-full px-3 py-2.5 text-left hover:bg-neutral-800 transition-colors rounded-lg group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    result.type === 'stock' ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                  }`}>
                    <span className={`text-xs font-semibold ${
                      result.type === 'stock' ? 'text-emerald-400' : 'text-blue-400'
                    }`}>
                      {result.title.slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{result.title}</div>
                    <div className="text-xs text-neutral-500 truncate">{result.subtitle}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// User Dropdown Component
function UserDropdown({ user, profile }: { user: any; profile: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = () => {
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    return (user.email || '').charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name + (profile.last_name ? ` ${profile.last_name}` : '');
    }
    return (user.email || '').split('@')[0];
  };

  const isPremium = profile?.is_premium || false;

  const handleLogout = async () => {
    setIsOpen(false);
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
      >
        {getInitials()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* User Info */}
          <div className="p-4 border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-black font-semibold">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium text-sm truncate">{getDisplayName()}</div>
                <div className="text-neutral-500 text-xs truncate">{user.email}</div>
              </div>
              {isPremium && (
                <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-xs font-medium">
                  Premium
                </span>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button
              onClick={() => handleNavigation('/profile')}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-neutral-800 transition-colors group"
            >
              <UserIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />
              <span className="text-sm text-neutral-300 group-hover:text-white">Profil</span>
            </button>

            <button
              onClick={() => handleNavigation('/settings')}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-neutral-800 transition-colors group"
            >
              <Cog6ToothIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />
              <span className="text-sm text-neutral-300 group-hover:text-white">Einstellungen</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                window.location.href = 'mailto:team@finclue.de';
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-neutral-800 transition-colors group"
            >
              <EnvelopeIcon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300" />
              <span className="text-sm text-neutral-300 group-hover:text-white">Support</span>
            </button>

            <div className="my-2 h-px bg-neutral-800"></div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-red-500/10 transition-colors group"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 text-neutral-500 group-hover:text-red-400" />
              <span className="text-sm text-neutral-300 group-hover:text-red-400">Abmelden</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Guest Actions Component
function GuestActions() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/signin"
        className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
      >
        Anmelden
      </Link>
      <Link
        href="/auth/signup"
        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg text-sm transition-colors"
      >
        Registrieren
      </Link>
    </div>
  );
}

// Nav Link Component
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
      }`}
    >
      {children}
    </Link>
  )
}

// Dropdown Links Data
const produkteLinks = [
  { href: '/analyse', label: 'Aktien-Analyse', description: '10.000+ Aktien', icon: ChartBarIcon },
  { href: '/superinvestor', label: 'Super-Investoren', description: 'Portfolio Tracking', icon: UsersIcon },
]

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname()

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (mounted) {
          if (error) {
            setUser(null);
            setProfile(null);
          } else if (session?.user) {
            setUser(session.user);
            loadProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    }

    async function loadProfile(userId: string) {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('user_id, is_premium, subscription_status, first_name, last_name, email_verified')
          .eq('user_id', userId)
          .maybeSingle();

        if (mounted) {
          if (error) {
            setProfile({ user_id: userId, is_premium: false });
          } else {
            setProfile(profileData);
          }
        }
      } catch (error) {
        if (mounted) {
          setProfile({ user_id: userId, is_premium: false });
        }
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        if (session?.user) {
          setUser(session.user);
          loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Hide main navbar in superinvestor section (has its own contextual navbar)
  if (pathname.startsWith('/superinvestor')) {
    return null
  }

  const isFixed = !pathname.startsWith('/analyse')

  return (
    <nav className={`${isFixed ? 'fixed top-0 left-0 right-0' : 'relative'} z-50 bg-[#0F0F11]/80 backdrop-blur-xl border-b border-neutral-800/50`}>
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex items-end gap-0.5">
            <div className="w-1.5 h-3 bg-emerald-500 rounded-sm"></div>
            <div className="w-1.5 h-4 bg-emerald-500 rounded-sm"></div>
            <div className="w-1.5 h-5 bg-emerald-500 rounded-sm"></div>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Finclue</span>
        </Link>

        {/* Center: Navigation Links (Desktop) */}
        <div className="hidden lg:flex items-center gap-1">
          {/* Produkte Dropdown */}
          <div className="relative group">
            <button className="group/btn flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors">
              Produkte
              <PlusIcon className="w-3 h-3 text-neutral-500 group-hover/btn:text-neutral-300 transition-colors" />
            </button>
            <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
                <div className="p-2">
                  {produkteLinks.map((link) => {
                    const Icon = link.icon
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-neutral-800/50 transition-colors group/item"
                      >
                        <div className="mt-0.5">
                          <Icon className="w-5 h-5 text-neutral-500 group-hover/item:text-neutral-300 transition-colors" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{link.label}</div>
                          <div className="text-xs text-neutral-500 mt-0.5">{link.description}</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <NavLink href="/lexikon">Lexikon</NavLink>
          <NavLink href="/pricing">Preise</NavLink>
        </div>

        {/* Right: Search + User */}
        <div className="flex items-center gap-4">
          {/* Search (Desktop) */}
          <div className="hidden md:block w-48">
            <SearchBar />
          </div>

          {/* User Menu */}
          <div className="hidden md:block">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-neutral-800 animate-pulse"></div>
            ) : user ? (
              <UserDropdown user={user} profile={profile} />
            ) : (
              <GuestActions />
            )}
          </div>

          {/* Mobile Menu Button */}
          <Disclosure>
            {({ open, close }) => (
              <>
                <Disclosure.Button className="lg:hidden p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors">
                  {open ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                </Disclosure.Button>

                {/* Mobile Panel */}
                <Disclosure.Panel className="absolute top-full left-0 right-0 bg-[#0F0F11] border-b border-neutral-800 lg:hidden">
                  <div className="px-6 py-4 space-y-4">
                    {/* Mobile Search */}
                    <SearchBar onNavigate={close} />

                    {/* Mobile Navigation */}
                    <div className="space-y-1">
                      <div className="px-2 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Produkte
                      </div>
                      {produkteLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => close()}
                          className="block px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <Link
                        href="/lexikon"
                        onClick={() => close()}
                        className="block px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        Lexikon
                      </Link>
                      <Link
                        href="/pricing"
                        onClick={() => close()}
                        className="block px-3 py-2.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        Preise
                      </Link>
                    </div>

                    {/* Mobile User */}
                    <div className="pt-4 border-t border-neutral-800">
                      {loading ? (
                        <div className="w-full h-10 rounded-lg bg-neutral-800 animate-pulse"></div>
                      ) : user ? (
                        <UserDropdown user={user} profile={profile} />
                      ) : (
                        <GuestActions />
                      )}
                    </div>
                  </div>
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        </div>
      </div>
    </nav>
  )
}
