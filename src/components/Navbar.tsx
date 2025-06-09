// src/components/Navbar.tsx - OPTIMIERT: Performance + Features
'use client'
import { Fragment, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Disclosure, Menu, Transition } from '@headlessui/react'
import { 
  Bars3Icon, 
  XMarkIcon, 
  ChevronDownIcon, 
  UserIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon, 
  EnvelopeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { SparklesIcon } from '@heroicons/react/24/solid'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'

// Search Result Interface
interface SearchResult {
  type: 'stock' | 'investor';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

// Clean Search Bar Component (wieder hinzugefügt!)
function CleanSearchBar({ onNavigate }: { onNavigate?: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Filter suggestions based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = searchTerm.trim().toUpperCase();
    const results: SearchResult[] = [];

    // Search in stocks
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
        href: `/analyse/${stock.ticker}`
      }));

    // Search in investors
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
        href: `/investor/${investor.slug}`
      }));

    results.push(...filteredStocks, ...filteredInvestors);
    setSuggestions(results);
    setShowSuggestions(results.length > 0 && isFocused);
  }, [searchTerm, isFocused]);

  // Handle click outside
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

  const handleFocus = () => {
    setIsFocused(true);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className={`relative flex items-center transition-all duration-200 ${
        isFocused ? 'ring-2 ring-green-500/20' : ''
      }`}>
        <MagnifyingGlassIcon className="absolute left-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Suche Aktie oder Investor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:border-green-500/50 transition-all duration-200"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 max-h-64 overflow-y-auto">
          {suggestions.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelectResult(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {result.title}
                    </div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      result.type === 'stock' 
                        ? 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400'
                        : 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400'
                    }`}>
                      {result.type === 'stock' ? 'Aktie' : 'Investor'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {result.subtitle}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const navLinks = [
  { href: '/', label: 'Startseite' },
  { href: '/superinvestor', label: 'Super-Investoren' },
  { href: '/news', label: 'News' },
]

const analyseSubLinks = [
  { href: '/analyse', label: 'Übersicht' },
  { href: '/analyse/watchlist', label: 'Watchlist' },
  { href: '/analyse/heatmap', label: 'Heatmap' },
  { href: '/analyse/earnings', label: 'Earnings' },
]

// User Profile Interface
interface UserProfile {
  user_id: string;
  patreon_tier?: string | null;
  is_premium?: boolean;
  first_name?: string | null;
  last_name?: string | null;
  email_verified?: boolean;
}

// OPTIMIERTER User Dropdown - Performance + Features
function OptimizedUserDropdown({ user, profile }: { user: any; profile: UserProfile | null }) {
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

  // Premium Status Check
  const isPremium = profile?.is_premium || 
                   (profile?.patreon_tier && ['premium', 'supporter'].includes(profile.patreon_tier));
  
  const isEmailVerified = profile?.email_verified ?? user.email_confirmed_at != null;

  const getTierDisplayName = (tier: string) => {
    switch (tier) {
      case 'premium': return 'Premium';
      case 'supporter': return 'Supporter';
      case 'free': return 'Free';
      default: return tier;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  // ALLE MENU ITEMS (inkl. Email Support & Einstellungen)
  const menuItems = [
    {
      icon: <UserIcon className="w-4 h-4" />,
      label: 'Profil bearbeiten',
      action: () => handleNavigation('/profile'),
      description: 'Persönliche Daten verwalten'
    },
    {
      icon: <EnvelopeIcon className="w-4 h-4" />,
      label: 'Email Support',
      action: () => {
        setIsOpen(false);
        window.location.href = 'mailto:team.finclue@gmail.com';
      },
      description: 'Hilfe & Kontakt'
    },
    {
      icon: <Cog6ToothIcon className="w-4 h-4" />,
      label: 'Einstellungen',
      action: () => handleNavigation('/settings'), 
      description: 'App-Einstellungen'
    },
    {
      icon: <ArrowRightOnRectangleIcon className="w-4 h-4" />,
      label: 'Abmelden',
      action: handleLogout,
      description: 'Sicher ausloggen',
      isLogout: true
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 group"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm shadow-sm">
            {getInitials()}
          </div>
          {isPremium && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">👑</span>
            </div>
          )}
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
          
          {/* Header mit User Info */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-medium shadow-sm">
                  {getInitials()}
                </div>
                {isPremium && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">👑</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-gray-900 dark:text-gray-100 font-medium text-sm truncate">{getDisplayName()}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs truncate">{user.email}</div>
                <div className="flex items-center gap-2 mt-1">
                  {isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 text-xs rounded-md font-medium">
                      <SparklesIcon className="w-2.5 h-2.5" />
                      {getTierDisplayName(profile?.patreon_tier || '')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-md">
                      Free
                    </span>
                  )}
                  {!isEmailVerified && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs rounded-md">
                      Unbestätigt
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-150 ${
                  item.isLogout 
                    ? 'hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className={`p-1.5 rounded-md ${
                  item.isLogout 
                    ? 'bg-red-100 dark:bg-red-500/20' 
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              Mitglied seit {new Date(user.created_at || '').toLocaleDateString('de-DE', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Guest Actions
function GuestActions() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/signin"
        className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
      >
        Anmelden
      </Link>
      <Link
        href="/auth/signup"
        className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200 shadow-sm"
      >
        Registrieren
      </Link>
    </div>
  );
}

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        // 1. Session laden (einfach und schnell)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) {
            console.warn('Session error:', error);
            setUser(null);
            setProfile(null);
          } else if (session?.user) {
            setUser(session.user);
            // 2. Profile laden (async, blockiert nicht die UI)
            loadProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    }

    // OPTIMIERT: Profile Loading separate (nicht blocking)
    async function loadProfile(userId: string) {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (mounted) {
          if (error) {
            console.warn('Profile error:', error);
            // Fallback profile
            setProfile({
              user_id: userId,
              is_premium: false
            });
          } else {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.warn('Profile loading error:', error);
        if (mounted) {
          setProfile({
            user_id: userId,
            is_premium: false
          });
        }
      }
    }

    loadUser();

    // Auth state listener
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

  return (
    <Disclosure as="header" className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
      {({ open, close }) => (
        <>
          <div className="max-w-7xl mx-auto">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              {/* Logo */}
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">F</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    Fin<span className="text-green-600">Clue</span>
                  </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-1">
                  {navLinks.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                    >
                      {link.label}
                    </Link>
                  ))}
                  
                  {/* Analyse Dropdown */}
                  <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                      Analyse 
                      <ChevronDownIcon className="w-4 h-4" />
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="opacity-0 scale-95"
                      enterTo="opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="opacity-100 scale-100"
                      leaveTo="opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden focus:outline-none">
                        {analyseSubLinks.map(subLink => (
                          <Menu.Item key={subLink.href}>
                            {({ active }) => (
                              <Link
                                href={subLink.href}
                                className={`block px-4 py-3 text-sm transition-colors ${
                                  active 
                                    ? 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white' 
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {subLink.label}
                              </Link>
                            )}
                          </Menu.Item>
                        ))}
                      </Menu.Items>
                    </Transition>
                  </Menu>
                </nav>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="hidden lg:block w-64">
                  <CleanSearchBar />
                </div>

                {/* User Menu */}
                <div className="hidden md:block">
                  {loading ? (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  ) : user ? (
                    <OptimizedUserDropdown user={user} profile={profile} />
                  ) : (
                    <GuestActions />
                  )}
                </div>

                {/* Mobile Menu Toggle */}
                <Disclosure.Button className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all">
                  {open ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                </Disclosure.Button>
              </div>
            </div>

            {/* Mobile Panel */}
            <Disclosure.Panel className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="px-4 py-3 space-y-1">
                {/* Mobile Search */}
                <div className="mb-4">
                  <CleanSearchBar onNavigate={close} />
                </div>

                {/* Mobile Nav Links */}
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => close()}
                    className="block px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                  >
                    {link.label}
                  </Link>
                ))}

                {/* Mobile Analyse Section */}
                <div className="space-y-1">
                  <div className="px-3 py-2 text-base font-medium text-gray-900 dark:text-white">
                    Analyse
                  </div>
                  {analyseSubLinks.map(subLink => (
                    <Link
                      key={subLink.href}
                      href={subLink.href}
                      onClick={() => close()}
                      className="block px-6 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                    >
                      {subLink.label}
                    </Link>
                  ))}
                </div>

                {/* Mobile User Menu */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {loading ? (
                    <div className="w-full h-12 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                  ) : user ? (
                    <OptimizedUserDropdown user={user} profile={profile} />
                  ) : (
                    <GuestActions />
                  )}
                </div>
              </div>
            </Disclosure.Panel>
          </div>
        </>
      )}
    </Disclosure>
  )
}