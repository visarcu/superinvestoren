// src/app/analyse/earnings/page.tsx - MODERNISIERTE VERSION
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  BookmarkIcon 
} from '@heroicons/react/24/outline';
import Logo from '@/components/Logo';

interface EarningsEvent {
  ticker: string;
  date: string;
  time: 'bmo' | 'amc' | null;
  eps?: number;
  epsEstimated?: number;
  revenue?: number;
  revenueEstimated?: number;
}

interface WatchlistItem {
  ticker: string;
}

export default function ModernEarningsPage() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [apiError, setApiError] = useState<string | null>(null);
  const router = useRouter();

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const getMonthStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(1);
    return d;
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  useEffect(() => {
    async function init() {
      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        
        if (sessionErr || !session?.user) {
          router.push('/auth/signin');
          return;
        }

        setUser(session.user);

        const { data, error: dbErr } = await supabase
          .from('watchlists')
          .select('ticker')
          .eq('user_id', session.user.id);

        if (dbErr) {
          console.error('[EarningsPage] DB Error:', dbErr.message);
          setWatchlistItems([]);
        } else {
          console.log('[EarningsPage] Watchlist loaded:', data);
          setWatchlistItems(data || []);
        }
      } catch (error) {
        console.error('[EarningsPage] Error:', error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  // Separate useEffect für das Laden der Earnings-Daten
  useEffect(() => {
    if (watchlistItems.length > 0) {
      loadEarningsData(watchlistItems.map(item => item.ticker));
    } else if (!loading) {
      // Wenn keine Watchlist-Items vorhanden sind, Earnings-Daten zurücksetzen
      setEarningsData([]);
    }
  }, [watchlistItems, loading]);

  async function loadEarningsData(tickers: string[]) {
    if (tickers.length === 0) return;
    
    setLoadingEarnings(true);
    setApiError(null);
    
    try {
      // Erweitere den Zeitraum für bessere Chancen, Daten zu finden
      const startDate = formatDate(addDays(new Date(), -7)); // 7 Tage in der Vergangenheit
      const endDate = formatDate(addDays(new Date(), 60));   // 60 Tage in der Zukunft
      
      console.log('[EarningsPage] Loading earnings from', startDate, 'to', endDate, 'for tickers:', tickers);

      // Prüfe zunächst, ob API-Key verfügbar ist
      if (!process.env.NEXT_PUBLIC_FMP_API_KEY) {
        throw new Error('FMP API Key nicht konfiguriert');
      }

      const apiUrl = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${startDate}&to=${endDate}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`;
      console.log('[EarningsPage] API URL:', apiUrl.replace(process.env.NEXT_PUBLIC_FMP_API_KEY!, '[API_KEY]'));

      const res = await fetch(apiUrl);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[EarningsPage] API Error:', res.status, res.statusText, errorText);
        setApiError(`API Fehler: ${res.status} ${res.statusText}`);
        return;
      }

      const allEarnings = await res.json();
      console.log('[EarningsPage] Raw API response:', allEarnings);
      
      // Prüfe ob die Antwort ein Array ist
      if (!Array.isArray(allEarnings)) {
        console.error('[EarningsPage] API response is not an array:', allEarnings);
        setApiError('Unerwartete API-Antwort: Keine Array-Daten');
        return;
      }

      console.log('[EarningsPage] All earnings loaded:', allEarnings.length);
      
      // Debugging: Zeige erste paar Earnings-Einträge
      if (allEarnings.length > 0) {
        console.log('[EarningsPage] Sample earnings data:', allEarnings.slice(0, 3));
      }

      // Filtere nach Watchlist-Tickers (case-insensitive)
      const tickersUpper = tickers.map(t => t.toUpperCase());
      const filteredEarnings: EarningsEvent[] = allEarnings
        .filter((earning: any) => {
          const symbol = earning.symbol?.toUpperCase();
          const isMatch = tickersUpper.includes(symbol);
          if (isMatch) {
            console.log('[EarningsPage] Found earnings for:', symbol, earning);
          }
          return isMatch;
        })
        .map((earning: any): EarningsEvent => {
          // Normalisiere das time field - manchmal kommt "pre-market" statt "bmo", etc.
          let normalizedTime: 'bmo' | 'amc' | null = null;
          if (earning.time) {
            const timeStr = earning.time.toLowerCase();
            if (timeStr === 'bmo' || timeStr.includes('pre') || timeStr.includes('before')) {
              normalizedTime = 'bmo';
            } else if (timeStr === 'amc' || timeStr.includes('after') || timeStr.includes('close')) {
              normalizedTime = 'amc';
            }
          }
          
          return {
            ticker: earning.symbol || '',
            date: earning.date || '',
            time: normalizedTime,
            eps: earning.eps,
            epsEstimated: earning.epsEstimated,
            revenue: earning.revenue,
            revenueEstimated: earning.revenueEstimated
          };
        });

      console.log('[EarningsPage] Filtered earnings for watchlist:', filteredEarnings);
      setEarningsData(filteredEarnings);

      if (filteredEarnings.length === 0 && allEarnings.length > 0) {
        console.log('[EarningsPage] No earnings found for watchlist tickers. Available symbols in API:', 
          allEarnings.slice(0, 10).map((e: any) => e.symbol));
      }

    } catch (error) {
      console.error('[EarningsPage] Error loading earnings data:', error);
      setApiError(`Fehler beim Laden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setLoadingEarnings(false);
    }
  }

  const groupEarningsByDate = (earnings: EarningsEvent[]) => {
    const grouped: Record<string, EarningsEvent[]> = {};
    earnings.forEach(earning => {
      if (!grouped[earning.date]) {
        grouped[earning.date] = [];
      }
      grouped[earning.date].push(earning);
    });
    return grouped;
  };

  const getDisplayDays = () => {
    if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate);
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    } else {
      const start = getWeekStart(currentDate);
      return Array.from({ length: 21 }, (_, i) => addDays(start, i));
    }
  };

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const days = viewMode === 'week' ? 7 : 21;
    newDate.setDate(newDate.getDate() + (direction === 'next' ? days : -days));
    setCurrentDate(newDate);
  };

  // Loading State - Modernisiert
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 noise-bg">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/3 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Lade Earnings-Kalender...</p>
          </div>
        </div>
      </div>
    );
  }

  const displayDays = getDisplayDays();
  const groupedEarnings = groupEarningsByDate(earningsData);
  const upcomingEarnings = earningsData.filter(e => new Date(e.date) >= new Date()).slice(0, 5);

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const weekDayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/3 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      {/* Hero Section */}
      <div className="bg-gray-950 noise-bg pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center space-y-6">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium backdrop-blur-sm">
              <CalendarIcon className="w-4 h-4" />
              <span>Earnings Kalender</span>
            </div>
            
            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                Earnings Termine
              </h1>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  deiner Watchlist
                </span>
              </h2>
            </div>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Verpasse nie wieder wichtige Earnings-Termine deiner bevorzugten Aktien.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative space-y-8">
        
        {/* API Error Alert */}
        {apiError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-400 font-medium">API Fehler</h3>
                <p className="text-red-300 text-sm mt-1">{apiError}</p>
                <button
                  onClick={() => watchlistItems.length > 0 && loadEarningsData(watchlistItems.map(i => i.ticker))}
                  className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition font-medium"
                >
                  Erneut versuchen
                </button>
              </div>
            </div>
          </div>
        )}

        {watchlistItems.length === 0 ? (
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-12 backdrop-blur-sm text-center">
            <div className="w-24 h-24 mx-auto bg-gray-800/50 rounded-2xl flex items-center justify-center mb-6">
              <BookmarkIcon className="w-12 h-12 text-gray-400" />
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-white">Keine Watchlist-Aktien</h2>
              <p className="text-gray-400">
                Füge Aktien zu deiner Watchlist hinzu, um ihre Earnings-Termine hier zu sehen.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <button
                onClick={() => router.push('/watchlist')}
                className="px-6 py-3 bg-green-500 text-black rounded-lg hover:bg-green-400 transition font-medium"
              >
                Zur Watchlist
              </button>
              <button
                onClick={() => router.push('/analyse')}
                className="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition font-medium border border-gray-700"
              >
                Aktien suchen
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              {/* Obere Zeile: Navigation & View Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-white">
                    {viewMode === 'week' ? 'Diese Woche' : 'Nächste 3 Wochen'}
                  </h2>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
                    {watchlistItems.length} Aktien • {earningsData.length} Earnings
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('week')}
                      className={`px-4 py-2 text-sm rounded-lg transition font-medium ${
                        viewMode === 'week' 
                          ? 'bg-green-500 text-black' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Woche
                    </button>
                    <button
                      onClick={() => setViewMode('month')}
                      className={`px-4 py-2 text-sm rounded-lg transition font-medium ${
                        viewMode === 'month' 
                          ? 'bg-green-500 text-black' 
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      3 Wochen
                    </button>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('prev')}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                      title="Vorherige Periode"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-4 py-2 text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition font-medium border border-gray-700"
                    >
                      Heute
                    </button>
                    <button
                      onClick={() => navigate('next')}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                      title="Nächste Periode"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Nächste Earnings */}
              {upcomingEarnings.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center">
                    <ClockIcon className="w-4 h-4 mr-2 text-yellow-400" />
                    Nächste Earnings
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {upcomingEarnings.map((earning, idx) => (
                      <div 
                        key={`${earning.ticker}-${idx}`}
                        className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition cursor-pointer group"
                        onClick={() => router.push(`/analyse/${earning.ticker.toLowerCase()}`)}
                      >
                        <Logo
                          src={`/logos/${earning.ticker.toLowerCase()}.svg`}
                          alt={`${earning.ticker} Logo`}
                          className="w-8 h-8 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm group-hover:text-green-400 transition">
                            {earning.ticker}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-2">
                            <span>
                              {new Date(earning.date).toLocaleDateString('de-DE', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            {earning.time && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                earning.time === 'bmo' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {earning.time === 'bmo' ? 'BMO' : 'AMC'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Wenn mehr als 5 Earnings vorhanden */}
                  {earningsData.filter(e => new Date(e.date) >= new Date()).length > 5 && (
                    <div className="mt-4 pt-4 border-t border-gray-800/50">
                      <p className="text-xs text-gray-500 text-center">
                        +{earningsData.filter(e => new Date(e.date) >= new Date()).length - 5} weitere im Kalender
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Calendar Grid */}
            <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              {/* Kalender Header */}
              <div className="mb-6 text-center">
                <h3 className="text-xl font-semibold text-white">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
              </div>

              <div className={`grid gap-3 ${
                viewMode === 'week' 
                  ? 'grid-cols-7' 
                  : 'grid-cols-7 lg:grid-cols-7'
              }`}>
                {displayDays.map((day, index) => {
                  const dateStr = formatDate(day);
                  const dayEarnings = groupedEarnings[dateStr] || [];
                  const isToday = formatDate(new Date()) === dateStr;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const hasEarnings = dayEarnings.length > 0;
                  
                  return (
                    <div 
                      key={dateStr} 
                      className={`min-h-[130px] p-4 rounded-xl border transition-all duration-200 ${
                        isToday 
                          ? 'bg-green-500/20 border-green-400/50 shadow-lg shadow-green-500/20' 
                          : hasEarnings
                            ? 'bg-gray-800/80 border-gray-600 hover:bg-gray-800/90 hover:border-gray-500'
                            : isWeekend
                              ? 'bg-gray-800/30 border-gray-700/50'
                              : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800/70'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="text-center mb-3">
                        <div className="text-xs text-gray-400 mb-1 font-medium">
                          {weekDayNames[day.getDay()]}
                        </div>
                        <div className={`text-lg font-bold ${
                          isToday ? 'text-green-400' : 'text-white'
                        }`}>
                          {day.getDate()}
                        </div>
                        {day.getDate() === 1 && (
                          <div className="text-xs text-gray-500 font-medium">
                            {monthNames[day.getMonth()]}
                          </div>
                        )}
                      </div>

                      {/* Earnings Events */}
                      <div className="space-y-2">
                        {dayEarnings.length === 0 ? (
                          !isWeekend && (
                            <div className="text-center text-gray-500 text-xs mt-6 italic">
                              Keine Earnings
                            </div>
                          )
                        ) : (
                          dayEarnings.map((earning, idx) => (
                            <div
                              key={`${earning.ticker}-${idx}`}
                              className="bg-gradient-to-r from-green-500/20 to-green-400/20 hover:from-green-500/30 hover:to-green-400/30 border border-green-500/30 rounded-lg p-3 transition-all duration-200 cursor-pointer group hover:scale-105 hover:shadow-lg"
                              onClick={() => router.push(`/analyse/${earning.ticker.toLowerCase()}`)}
                            >
                              <div className="flex items-center gap-2">
                                <Logo
                                  src={`/logos/${earning.ticker.toLowerCase()}.svg`}
                                  alt={`${earning.ticker} Logo`}
                                  className="w-6 h-6 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-medium text-sm truncate group-hover:text-green-300 transition">
                                    {earning.ticker}
                                  </div>
                                  {earning.time && (
                                    <div className={`text-xs font-medium ${
                                      earning.time === 'bmo' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {earning.time === 'bmo' ? 'Before Open' : 'After Close'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}