// src/app/(terminal)/analyse/earnings/page.tsx - THEME-AWARE DESIGN
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
  BookmarkIcon,
  ArrowTrendingUpIcon,
  SparklesIcon
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
      setEarningsData([]);
    }
  }, [watchlistItems, loading]);

  async function loadEarningsData(tickers: string[]) {
    if (tickers.length === 0) return;
    
    setLoadingEarnings(true);
    setApiError(null);
    
    try {
      const startDate = formatDate(addDays(new Date(), -7));
      const endDate = formatDate(addDays(new Date(), 60));
      
      console.log('[EarningsPage] Loading earnings from', startDate, 'to', endDate, 'for tickers:', tickers);

      if (!process.env.NEXT_PUBLIC_FMP_API_KEY) {
        throw new Error('FMP API Key nicht konfiguriert');
      }

      const apiUrl = `https://financialmodelingprep.com/api/v3/earning_calendar?from=${startDate}&to=${endDate}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`;
      const res = await fetch(apiUrl);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[EarningsPage] API Error:', res.status, res.statusText, errorText);
        setApiError(`API Fehler: ${res.status} ${res.statusText}`);
        return;
      }

      const allEarnings = await res.json();
      
      if (!Array.isArray(allEarnings)) {
        console.error('[EarningsPage] API response is not an array:', allEarnings);
        setApiError('Unerwartete API-Antwort: Keine Array-Daten');
        return;
      }

      const tickersUpper = tickers.map(t => t.toUpperCase());
      const filteredEarnings: EarningsEvent[] = allEarnings
        .filter((earning: any) => {
          const symbol = earning.symbol?.toUpperCase();
          return tickersUpper.includes(symbol);
        })
        .map((earning: any): EarningsEvent => {
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

      setEarningsData(filteredEarnings);

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

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-theme-secondary">Lade Earnings-Kalender...</p>
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
    <div className="min-h-screen bg-theme-primary">
      {/* Professional Header */}
      <div className="bg-theme-primary border-b border-theme py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-theme-primary">Earnings Kalender</h1>
                <p className="text-theme-secondary text-sm">
                  Termine deiner Watchlist • Live-Daten
                </p>
              </div>
            </div>
            
            {loadingEarnings && (
              <div className="flex items-center gap-2 text-xs text-theme-muted">
                <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
                Lade von API...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* API Error Alert */}
        {apiError && (
          <div className="bg-theme-secondary border border-theme rounded-lg p-4">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-red-400 font-medium text-sm">API Fehler</h3>
                <p className="text-theme-secondary text-sm mt-1">{apiError}</p>
                <button
                  onClick={() => watchlistItems.length > 0 && loadEarningsData(watchlistItems.map(i => i.ticker))}
                  className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 transition font-medium text-sm"
                >
                  Erneut versuchen
                </button>
              </div>
            </div>
          </div>
        )}

        {watchlistItems.length === 0 ? (
          <div className="bg-theme-secondary border border-theme rounded-lg p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-theme-tertiary rounded-lg flex items-center justify-center mb-4">
              <BookmarkIcon className="w-8 h-8 text-theme-muted" />
            </div>
            
            <div className="space-y-3 max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-theme-primary">Keine Watchlist-Aktien</h2>
              <p className="text-theme-secondary text-sm">
                Füge Aktien zu deiner Watchlist hinzu, um ihre Earnings-Termine hier zu sehen.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button
                onClick={() => router.push('/analyse/watchlist')}
                className="px-6 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 transition font-medium text-sm"
              >
                Zur Watchlist
              </button>
              <button
                onClick={() => router.push('/analyse')}
                className="px-6 py-2 bg-theme-tertiary text-theme-secondary rounded-lg hover:bg-theme-tertiary/70 hover:text-theme-primary transition font-medium text-sm border border-theme"
              >
                Aktien suchen
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="bg-theme-secondary border border-theme rounded-lg p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-theme-primary">
                    {viewMode === 'week' ? 'Diese Woche' : 'Nächste 3 Wochen'}
                  </h2>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
                    {watchlistItems.length} Aktien • {earningsData.length} Earnings
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-theme-tertiary rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('week')}
                      className={`px-3 py-1.5 text-sm rounded transition font-medium ${
                        viewMode === 'week' 
                          ? 'bg-green-500 text-black' 
                          : 'text-theme-secondary hover:text-theme-primary'
                      }`}
                    >
                      Woche
                    </button>
                    <button
                      onClick={() => setViewMode('month')}
                      className={`px-3 py-1.5 text-sm rounded transition font-medium ${
                        viewMode === 'month' 
                          ? 'bg-green-500 text-black' 
                          : 'text-theme-secondary hover:text-theme-primary'
                      }`}
                    >
                      3 Wochen
                    </button>
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('prev')}
                      className="p-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-4 py-2 text-sm bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary/70 hover:text-theme-primary rounded-lg transition font-medium"
                    >
                      Heute
                    </button>
                    <button
                      onClick={() => navigate('next')}
                      className="p-2 text-theme-secondary hover:text-theme-primary hover:bg-theme-tertiary rounded-lg transition"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Nächste Earnings */}
              {upcomingEarnings.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                      <ClockIcon className="w-3 h-3 text-yellow-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-theme-primary">Nächste Earnings</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {upcomingEarnings.map((earning, idx) => (
                      <button 
                        key={`${earning.ticker}-${idx}`}
                        className="flex items-center gap-3 p-3 bg-theme-tertiary/50 hover:bg-theme-tertiary rounded-lg transition group text-left"
                        onClick={() => router.push(`/analyse/stocks/${earning.ticker.toLowerCase()}`)}
                      >
                        <Logo
                          src={`/logos/${earning.ticker.toLowerCase()}.svg`}
                          alt={`${earning.ticker} Logo`}
                          className="w-8 h-8 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-theme-primary font-medium text-sm group-hover:text-green-400 transition">
                            {earning.ticker}
                          </div>
                          <div className="text-xs text-theme-muted flex items-center gap-2">
                            <span>
                              {new Date(earning.date).toLocaleDateString('de-DE', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            {earning.time && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                earning.time === 'bmo' 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {earning.time === 'bmo' ? 'BMO' : 'AMC'}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {earningsData.filter(e => new Date(e.date) >= new Date()).length > 5 && (
                    <div className="mt-4 pt-4 border-t border-theme/50">
                      <p className="text-xs text-theme-muted text-center">
                        +{earningsData.filter(e => new Date(e.date) >= new Date()).length - 5} weitere im Kalender
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Calendar Grid */}
            <div className="bg-theme-secondary border border-theme rounded-lg p-6">
              <div className="mb-6 text-center">
                <h3 className="text-lg font-semibold text-theme-primary">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
              </div>

              <div className={`grid gap-3 ${
                viewMode === 'week' 
                  ? 'grid-cols-7' 
                  : 'grid-cols-7'
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
                      className={`min-h-[120px] p-3 rounded-lg border transition-all duration-200 ${
                        isToday 
                          ? 'bg-green-500/20 border-green-500/30' 
                          : hasEarnings
                            ? 'bg-theme-tertiary/70 border-theme hover:bg-theme-tertiary'
                            : isWeekend
                              ? 'bg-theme-tertiary/30 border-theme/50'
                              : 'bg-theme-tertiary/50 border-theme hover:bg-theme-tertiary/70'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="text-center mb-2">
                        <div className="text-xs text-theme-muted mb-1 font-medium">
                          {weekDayNames[day.getDay()]}
                        </div>
                        <div className={`text-sm font-bold ${
                          isToday ? 'text-green-400' : 'text-theme-primary'
                        }`}>
                          {day.getDate()}
                        </div>
                        {day.getDate() === 1 && (
                          <div className="text-xs text-theme-muted font-medium">
                            {monthNames[day.getMonth()]}
                          </div>
                        )}
                      </div>

                      {/* Earnings Events */}
                      <div className="space-y-1.5">
                        {dayEarnings.length === 0 ? (
                          !isWeekend && (
                            <div className="text-center text-theme-muted text-xs mt-4 italic">
                              Keine Earnings
                            </div>
                          )
                        ) : (
                          dayEarnings.map((earning, idx) => (
                            <button
                              key={`${earning.ticker}-${idx}`}
                              className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded p-2 transition-all duration-200 cursor-pointer group"
                              onClick={() => router.push(`/analyse/stocks/${earning.ticker.toLowerCase()}`)}
                            >
                              <div className="flex items-center gap-2">
                                <Logo
                                  src={`/logos/${earning.ticker.toLowerCase()}.svg`}
                                  alt={`${earning.ticker} Logo`}
                                  className="w-5 h-5 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0 text-left">
                                  <div className="text-theme-primary font-medium text-xs truncate group-hover:text-green-300 transition">
                                    {earning.ticker}
                                  </div>
                                  {earning.time && (
                                    <div className={`text-xs font-medium ${
                                      earning.time === 'bmo' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                      {earning.time === 'bmo' ? 'BMO' : 'AMC'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
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