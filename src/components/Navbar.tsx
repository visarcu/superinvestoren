// src/components/Navbar.tsx - SEPARATED CONTAINERS LIKE FISCAL.AI
'use client'
import { Fragment, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Disclosure } from '@headlessui/react'
import { 
  Bars3Icon, 
  XMarkIcon, 
  ChevronDownIcon, 
  UserIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon, 
  EnvelopeIcon,
  MagnifyingGlassIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import { stocks } from '@/data/stocks'
import { investors } from '@/data/investors'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

// Search Result Interface
interface SearchResult {
  type: 'stock' | 'investor';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

// 🎯 MODERN Search Bar (containerized style)
function ModernSearchBar({ onNavigate }: { onNavigate?: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Filter logic
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
        href: `/investor/${investor.slug}`
      }));

    results.push(...filteredStocks, ...filteredInvestors);
    setSuggestions(results);
    setShowSuggestions(results.length > 0 && isFocused);
  }, [searchTerm, isFocused]);

  // Event handlers
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
      <div className={`relative flex items-center transition-all duration-300 ${
        isFocused ? 'ring-2 ring-green-500/40 scale-105' : ''
      }`}>
        <MagnifyingGlassIcon className="absolute left-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Suche Aktie oder Investor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl transition-all duration-300 bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-green-500/50 focus:bg-white/10 backdrop-blur-sm hover:bg-white/7"
        />
      </div>

      {/* Solid Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-gray-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
          <div className="p-2">
            {suggestions.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelectResult(result)}
                className="w-full px-4 py-3 text-left hover:bg-white/10 transition-all duration-200 rounded-xl group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm text-white group-hover:text-green-400 transition-colors">
                        {result.title}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${
                        result.type === 'stock' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {result.type === 'stock' ? 'Aktie' : 'Investor'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 truncate mt-1">
                      {result.subtitle}
                    </div>
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

// 🎯 User Dropdown with Solid Background
function ModernUserDropdown({ user, profile }: { user: any; profile: any }) {
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
      {/* Modern Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm group hover:scale-105"
      >
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-black font-bold text-sm shadow-lg">
            {getInitials()}
          </div>
          {isPremium && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-2 h-2 text-black" />
            </div>
          )}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">{getDisplayName()}</div>
          <div className="text-xs text-gray-400">{isPremium ? 'Premium' : 'Free'}</div>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-all duration-300 group-hover:text-white ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Solid User Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-4 w-80 bg-gray-900 border border-white/20 rounded-2xl shadow-2xl z-50 overflow-hidden">
          
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-green-500/5 to-blue-500/5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-black font-bold text-lg shadow-lg">
                  {getInitials()}
                </div>
                {isPremium && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                    <SparklesIcon className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-base truncate">{getDisplayName()}</h3>
                <p className="text-gray-400 text-sm truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  {isPremium ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 text-yellow-400 rounded-xl text-xs font-semibold border border-yellow-400/30">
                      <SparklesIcon className="w-3 h-3" />
                      Premium
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 bg-white/5 text-gray-300 rounded-xl text-xs font-medium border border-white/10">
                      Free
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-3">
            <button
              onClick={() => handleNavigation('/profile')}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-left hover:bg-white/10 transition-all duration-200 group"
            >
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all border border-white/10">
                <UserIcon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold group-hover:text-green-400 transition-colors">Profil bearbeiten</div>
                <div className="text-gray-400 text-xs">Persönliche Daten & Premium</div>
              </div>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                window.location.href = 'mailto:team.finclue@gmail.com';
              }}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-left hover:bg-white/10 transition-all duration-200 group"
            >
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all border border-white/10">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold group-hover:text-green-400 transition-colors">Email Support</div>
                <div className="text-gray-400 text-xs">Hilfe & Kontakt</div>
              </div>
            </button>

            <button
              onClick={() => handleNavigation('/settings')}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-left hover:bg-white/10 transition-all duration-200 group"
            >
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-all border border-white/10">
                <Cog6ToothIcon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold group-hover:text-green-400 transition-colors">Einstellungen</div>
                <div className="text-gray-400 text-xs">App-Einstellungen</div>
              </div>
            </button>

            <div className="my-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-left hover:bg-red-500/10 transition-all duration-200 group"
            >
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-red-500/20 transition-all border border-white/10 group-hover:border-red-500/30">
                <ArrowRightOnRectangleIcon className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-semibold group-hover:text-red-400 transition-colors">Abmelden</div>
                <div className="text-gray-400 text-xs">Sicher ausloggen</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 🎯 Guest Actions
function ModernGuestActions() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/auth/signin"
        className="text-gray-300 hover:text-white font-semibold text-sm transition-all duration-300 px-4 py-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10"
      >
        Anmelden
      </Link>
      <Link
        href="/auth/signup"
        className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-black font-bold rounded-xl text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 border border-green-400/20"
      >
        Registrieren
      </Link>
    </div>
  );
}

// Navigation Links
const navLinks = [
  { href: '/news', label: 'News' },
]

const productLinks = [
  { 
    href: '/analyse', 
    label: 'Aktien-Analyse',
    description: 'Tiefgehende Analyse von 10.000+ Aktien'
  },
  { 
    href: '/superinvestor', 
    label: 'Super-Investoren',
    description: 'Portfolios der besten Investoren der Welt'
  },
  { 
    href: '/analyse/watchlist', 
    label: 'Watchlist',
    description: 'Verfolge deine Lieblings-Aktien'
  },
  { 
    href: '/analyse/heatmap', 
    label: 'Markt Heatmap',
    description: 'Visualisiere Marktbewegungen'
  },
]

export default function ModernNavbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Auth logic (unverändert)
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) {
            console.warn('Session error:', error);
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
        console.error('Error loading user:', error);
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
            console.warn('Profile error:', error);
            setProfile({ user_id: userId, is_premium: false });
          } else {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.warn('Profile loading error:', error);
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
  
  const pathname = usePathname()
  const isHomePage = pathname === '/'
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 sm:p-6">
      
      {/* 🎯 SEPARATED CONTAINERS LIKE FISCAL.AI */}
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        
        {/* 📦 LEFT CONTAINER: Logo + Navigation */}
        <div className={`flex items-center gap-8 rounded-2xl border shadow-2xl px-6 py-3 transition-all duration-500 ${
          isHomePage 
            ? 'bg-gray-900/60 border-white/10 shadow-black/20' 
            : 'bg-gray-900/90 border-white/15 shadow-black/30' 
        } backdrop-blur-2xl hover:shadow-3xl hover:shadow-black/40`}>
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center gap-1">
              <div className="flex items-end gap-0.5 transition-all duration-300 group-hover:scale-110">
                <div className="w-1.5 h-3 bg-green-500 rounded-sm transition-all duration-300 group-hover:bg-green-400"></div>
                <div className="w-1.5 h-4 bg-green-500 rounded-sm transition-all duration-300 group-hover:bg-green-400"></div>
                <div className="w-1.5 h-5 bg-green-500 rounded-sm transition-all duration-300 group-hover:bg-green-400"></div>
              </div>
            </div>
            <span className="text-xl font-bold text-white tracking-tight group-hover:text-green-400 transition-colors duration-300">
              Finclue
            </span>
          </Link>

          {/* 🎯 Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-2">
            
            {/* Products Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10">
                Produkte
                <ChevronDownIcon className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
              </button>
              
              {/* Solid Products Dropdown */}
              <div className="absolute left-0 mt-3 w-[650px] bg-gray-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="p-8">
                  <div className="grid grid-cols-2 gap-8">
                    
                    <Link
                      href="/analyse"
                      className="block p-6 rounded-2xl hover:bg-white/10 transition-all duration-300 group/item border border-transparent hover:border-white/10 hover:scale-105"
                    >
                      <div className="relative mb-4 h-32 w-full rounded-xl overflow-hidden bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-white/10">
                        <Image
                          src="/previews/analyse-preview.png"
                          alt="Aktien Analyse Vorschau"
                          fill={true}
                          className="object-cover"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base group-hover/item:text-green-400 transition-colors duration-300">
                            Aktien-Analyse
                          </h3>
                          <span className="text-xs text-gray-400 group-hover/item:text-green-400 transition-colors duration-300">→</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          Tiefgehende Analyse von 10.000+ Aktien mit historischen Daten und erweiterten Kennzahlen.
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/superinvestor"
                      className="block p-6 rounded-2xl hover:bg-white/10 transition-all duration-300 group/item border border-transparent hover:border-white/10 hover:scale-105"
                    >
                      <div className="relative mb-4 h-32 w-full rounded-xl overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10">
                        <Image
                          src="/previews/superinvestor-preview.png"
                          alt="Super-Investoren Vorschau"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base group-hover/item:text-green-400 transition-colors duration-300">
                            Super-Investoren
                          </h3>
                          <span className="text-xs text-gray-400 group-hover/item:text-green-400 transition-colors duration-300">→</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          Verfolge die Portfolios der erfolgreichsten Investoren der Welt in Echtzeit.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Regular Nav Links */}
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2.5 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10"
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/pricing"
              className="px-4 py-2.5 text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10"
            >
              Preise
            </Link>
          </nav>
        </div>

        {/* 📦 RIGHT CONTAINER: Search + User Actions */}
        <div className={`flex items-center gap-4 rounded-2xl border shadow-2xl px-6 py-3 transition-all duration-500 ${
          isHomePage 
            ? 'bg-gray-900/60 border-white/10 shadow-black/20' 
            : 'bg-gray-900/90 border-white/15 shadow-black/30' 
        } backdrop-blur-2xl hover:shadow-3xl hover:shadow-black/40`}>
          
          {/* Search */}
          <div className="hidden lg:block w-72">
            <ModernSearchBar />
          </div>

          {/* User Menu */}
          <div className="hidden md:block">
            {loading ? (
              <div className="w-10 h-10 rounded-2xl bg-white/5 animate-pulse border border-white/10"></div>
            ) : user ? (
              <ModernUserDropdown user={user} profile={profile} />
            ) : (
              <ModernGuestActions />
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <Disclosure>
            {({ open, close }) => (
              <>
                <Disclosure.Button className="lg:hidden p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-white/10 hover:border-white/20">
                  {open ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                </Disclosure.Button>

                {/* Mobile Panel */}
                <Disclosure.Panel className="absolute top-full left-4 right-4 mt-4 border border-white/10 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl lg:hidden">
                  <div className="px-6 py-4 space-y-3">
                    {/* Mobile Search */}
                    <div className="mb-6">
                      <ModernSearchBar onNavigate={close} />
                    </div>

                    {/* Mobile Products Section */}
                    <div className="space-y-2">
                      <div className="px-3 py-2 text-base font-bold text-white">
                        Produkte
                      </div>
                      {productLinks.map(product => (
                        <Link
                          key={product.href}
                          href={product.href}
                          onClick={() => close()}
                          className="block px-6 py-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10"
                        >
                          {product.label}
                        </Link>
                      ))}
                    </div>

                    {/* Mobile Nav Links */}
                    {navLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => close()}
                        className="block px-3 py-3 text-base font-semibold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10"
                      >
                        {link.label}
                      </Link>
                    ))}

                    <Link
                      href="/pricing"
                      onClick={() => close()}
                      className="block px-3 py-3 text-base font-semibold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-white/10"
                    >
                      Preise
                    </Link>

                    {/* Mobile User Menu */}
                    <div className="pt-4 border-t border-white/10">
                      {loading ? (
                        <div className="w-full h-12 rounded-xl bg-white/5 animate-pulse border border-white/10"></div>
                      ) : user ? (
                        <ModernUserDropdown user={user} profile={profile} />
                      ) : (
                        <ModernGuestActions />
                      )}
                    </div>
                  </div>
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        </div>
      </div>
    </div>
  )
}