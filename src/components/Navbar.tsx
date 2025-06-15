// src/components/Navbar.tsx - KOMPLETT MODERNISIERTE DUNKLE VERSION
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

// Dark Theme Search Bar Component
function DarkSearchBar({ onNavigate }: { onNavigate?: () => void }) {
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
        <MagnifyingGlassIcon className="absolute left-3 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Suche Aktie oder Investor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-2 text-sm bg-gray-800/50 border border-gray-700/50 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-gray-800 focus:border-green-500/50 transition-all duration-200"
        />
      </div>

      {/* Suggestions Dropdown - Dark Theme */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 max-h-64 overflow-y-auto">
          {suggestions.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelectResult(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors duration-150 border-b border-gray-800 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm text-gray-100">
                      {result.title}
                    </div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      result.type === 'stock' 
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {result.type === 'stock' ? 'Aktie' : 'Investor'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 truncate">
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

// Navigation Links (ohne Startseite)
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

// User Profile Interface
interface UserProfile {
  user_id: string;
  is_premium?: boolean;
  subscription_status?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_end_date?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email_verified?: boolean;
}

// Modern User Dropdown - NUR DIESE VERSION
function DarkUserDropdown({ user, profile }: { user: any; profile: UserProfile | null }) {
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
  const subscriptionStatus = profile?.subscription_status;
  const isEmailVerified = profile?.email_verified ?? user.email_confirmed_at != null;

  const getPremiumDisplayName = (isPremium: boolean, status?: string | null): string => {
    if (!isPremium) return 'Free';
    
    switch (status) {
      case 'active':
        return 'Premium';
      case 'trialing':
        return 'Premium (Trial)';
      case 'past_due':
        return 'Premium (Überfällig)';
      case 'canceled':
        return 'Premium (Gekündigt)';
      default:
        return 'Premium';
    }
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const getJoinDate = () => {
    try {
      return new Date(user.created_at || '').toLocaleDateString('de-DE', { 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return 'Unbekannt';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button - Modernisiert */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-200 backdrop-blur-sm"
      >
        <div className="relative">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-black font-semibold text-sm shadow-lg">
            {getInitials()}
          </div>
          {isPremium && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
              <SparklesIcon className="w-2 h-2 text-black" />
            </div>
          )}
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu - Modernes Design */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900/95 border border-gray-800/50 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden">
          
          {/* User Info Header - Verbessertes Design */}
          <div className="p-6 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-900/30">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-black font-bold text-lg shadow-lg">
                  {getInitials()}
                </div>
                {isPremium && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
                    <SparklesIcon className="w-2.5 h-2.5 text-black" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-base truncate">{getDisplayName()}</h3>
                <p className="text-gray-400 text-sm truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  {isPremium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-md text-xs font-medium">
                      <SparklesIcon className="w-3 h-3" />
                      {getPremiumDisplayName(isPremium, subscriptionStatus)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-gray-700/50 text-gray-400 rounded-md text-xs">
                      Free
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    Seit {getJoinDate()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items - Moderneres Design */}
          <div className="p-2">
            
            {/* Profile */}
            <button
              onClick={() => handleNavigation('/profile')}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-left hover:bg-gray-800/50 transition-colors group"
            >
              <div className="w-8 h-8 bg-gray-800/50 rounded-lg flex items-center justify-center group-hover:bg-gray-700/50 transition-colors">
                <UserIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">Profil bearbeiten</div>
                <div className="text-gray-500 text-xs">Persönliche Daten & Premium verwalten</div>
              </div>
            </button>

            {/* Email Support */}
            <button
              onClick={() => {
                setIsOpen(false);
                window.location.href = 'mailto:team.finclue@gmail.com';
              }}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-left hover:bg-gray-800/50 transition-colors group"
            >
              <div className="w-8 h-8 bg-gray-800/50 rounded-lg flex items-center justify-center group-hover:bg-gray-700/50 transition-colors">
                <EnvelopeIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">Email Support</div>
                <div className="text-gray-500 text-xs">Hilfe & Kontakt</div>
              </div>
            </button>

            {/* Settings */}
            <button
              onClick={() => handleNavigation('/settings')}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-left hover:bg-gray-800/50 transition-colors group"
            >
              <div className="w-8 h-8 bg-gray-800/50 rounded-lg flex items-center justify-center group-hover:bg-gray-700/50 transition-colors">
                <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">Einstellungen</div>
                <div className="text-gray-500 text-xs">App-Einstellungen</div>
              </div>
            </button>

            {/* Divider */}
            <div className="my-2 h-px bg-gray-800/50"></div>

            {/* Sign Out */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-left hover:bg-red-500/10 transition-colors group"
            >
              <div className="w-8 h-8 bg-gray-800/50 rounded-lg flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                <ArrowRightOnRectangleIcon className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium group-hover:text-red-400 transition-colors">Abmelden</div>
                <div className="text-gray-500 text-xs">Sicher ausloggen</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Guest Actions - Dark Theme
// Ersetze die DarkGuestActions Funktion in deiner Navbar mit dieser Version:

// Modern Guest Actions - Eleganter Dropdown Approach
function DarkGuestActions() {
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Account Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:bg-gray-900/70 hover:border-gray-700 transition-all duration-200 backdrop-blur-sm text-gray-300 hover:text-white"
      >
        <UserIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Account</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-900/95 border border-gray-800/50 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden">
          
          {/* Header */}
          <div className="p-4 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-900/30">
            <h3 className="text-white font-semibold text-sm">Willkommen bei FinClue</h3>
            <p className="text-gray-400 text-xs mt-1">Melde dich an oder erstelle einen Account</p>
          </div>

          {/* Actions */}
          <div className="p-2">
            
            {/* Sign In */}
            <Link
              href="/auth/signin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-left hover:bg-gray-800/50 transition-colors group"
            >
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                <ArrowRightOnRectangleIcon className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">Anmelden</div>
                <div className="text-gray-500 text-xs">Bereits registriert? Hier einloggen</div>
              </div>
            </Link>

            {/* Sign Up */}
            <Link
              href="/auth/signup"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-left hover:bg-gray-800/50 transition-colors group"
            >
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <UserIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">Registrieren</div>
                <div className="text-gray-500 text-xs">Kostenlosen Account erstellen</div>
              </div>
            </Link>

            {/* Divider */}
            <div className="my-2 h-px bg-gray-800/50"></div>

            {/* Quick Benefits */}
            <div className="p-3 bg-gray-800/30 rounded-lg">
              <div className="text-xs text-gray-400 mb-2">Mit Account erhältst du:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                  <span>Persönliche Watchlist</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                  <span>Erweiterte Analysen</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                  <span>Super-Investor Portfolios</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModernDarkNavbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
          .select('user_id, is_premium, subscription_status, stripe_customer_id, stripe_subscription_id, subscription_end_date, first_name, last_name, email_verified')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (mounted) {
          if (error) {
            console.warn('Profile error:', error);
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
    <Disclosure as="header" className={`sticky top-0 z-50 backdrop-blur-md border-b border-gray-800/50 ${
      isHomePage 
        ? 'bg-transparent' // <- Transparent für Homepage
        : 'bg-gray-950/90 noise-bg' // <- Normal für andere Pages
    }`}>
      {({ open, close }) => (
        <>
          <div className="max-w-7xl mx-auto">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              {/* Logo */}
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="flex items-end gap-0.5">
                      <div className="w-1.5 h-3 bg-green-500 rounded-sm"></div>
                      <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
                      <div className="w-1.5 h-5 bg-green-500 rounded-sm"></div>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-white">
                    Finclue
                  </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center space-x-1">
             
                  {/* Products Dropdown - Dark Theme */}
                  <div className="relative group">
                    <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all">
                      Produkte
                      <ChevronDownIcon className="w-4 h-4 transition-transform group-hover:rotate-180" />
                    </button>
                    
                    {/* Hover Dropdown - Dark Theme */}
                    <div className="absolute left-0 mt-2 w-[600px] bg-gray-900/95 border border-gray-700/50 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                          
                          {/* Aktien-Analyse Tool */}
<Link
  href="/analyse"
  className="block p-4 rounded-xl hover:bg-gray-800/50 transition-all group/item"
>
  {/* Vorschau-Bild */}
  <div className="relative mb-4 h-32 w-full rounded-lg overflow-hidden bg-gray-800">
    <Image
      src="/previews/analyse-preview.png"
      alt="Aktien Analyse Vorschau"
      fill={true}
      className="object-cover"
    />
  </div>

  {/* Text-Bereich */}
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <h3 className="font-semibold text-white text-base group-hover/item:text-green-400 transition-colors">
        Aktien-Analyse
      </h3>
      <span className="text-xs text-gray-500 group-hover/item:text-green-400 transition-colors">→</span>
    </div>
    <p className="text-sm text-gray-400 leading-relaxed">
      Tiefgehende Analyse von 10.000+ Aktien mit historischen Daten und erweiterten Kennzahlen.
    </p>
  </div>
</Link>

                          {/* Super-Investor Portfolios */}
                        {/* Super-Investor Portfolios */}
<Link
  href="/superinvestor"
  className="block p-4 rounded-xl hover:bg-gray-800/50 transition-all group/item"
>
  {/* Bild-Vorschau */}
  <div className="relative mb-4 h-32 w-full rounded-lg overflow-hidden bg-gray-800">
    <Image
      src="/previews/superinvestor-preview.png"
      alt="Super-Investoren Vorschau"
      fill
      className="object-cover"
    />
  </div>

  {/* Text-Bereich */}
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <h3 className="font-semibold text-white text-base group-hover/item:text-green-400 transition-colors">
        Super-Investoren
      </h3>
      <span className="text-xs text-gray-500 group-hover/item:text-green-400 transition-colors">→</span>
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

                  {/* Normale Nav Links */}
                  {navLinks.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
                    >
                      {link.label}
                    </Link>
                  ))}

                  {/* 👇 HIER HINZUFÜGEN - Terminal Link 
<Link
  href="/terminal"
  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
>
  Terminal
</Link>

*/}

                  {/* Pricing Link */}
                  <Link
                    href="/pricing"
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
                  >
                    Preise
                  </Link>
                </nav>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="hidden lg:block w-64">
                  <DarkSearchBar />
                </div>

                {/* User Menu */}
                <div className="hidden md:block">
                  {loading ? (
                    <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse"></div>
                  ) : user ? (
                    <DarkUserDropdown user={user} profile={profile} />
                  ) : (
                    <DarkGuestActions />
                  )}
                </div>

                {/* Mobile Menu Toggle */}
                <Disclosure.Button className="lg:hidden p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-all">
                  {open ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
                </Disclosure.Button>
              </div>
            </div>

            {/* Mobile Panel - Dark Theme */}
            <Disclosure.Panel className="lg:hidden border-t border-gray-800/50 bg-gray-950/95 backdrop-blur-md">
              <div className="px-4 py-3 space-y-1">
                {/* Mobile Search */}
                <div className="mb-4">
                  <DarkSearchBar onNavigate={close} />
                </div>

                {/* Mobile Products Section */}
                <div className="space-y-1">
                  <div className="px-3 py-2 text-base font-medium text-white">
                    Produkte
                  </div>
                  {productLinks.map(product => (
                    <Link
                      key={product.href}
                      href={product.href}
                      onClick={() => close()}
                      className="block px-6 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
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
                    className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
                  >
                    {link.label}
                  </Link>
                ))}

{/* 👇 HIER AUCH HINZUFÜGEN - Mobile Terminal Link 
<Link
  href="/terminal"
  onClick={() => close()}
  className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
>
  Terminal
</Link> */}


                {/* Mobile Pricing Link */}
                <Link
                  href="/pricing"
                  onClick={() => close()}
                  className="block px-3 py-2 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
                >
                  Preise
                </Link>

                {/* Mobile User Menu */}
                <div className="pt-4 border-t border-gray-800/50">
                  {loading ? (
                    <div className="w-full h-12 rounded-lg bg-gray-800 animate-pulse"></div>
                  ) : user ? (
                    <DarkUserDropdown user={user} profile={profile} />
                  ) : (
                    <DarkGuestActions />
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