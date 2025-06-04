// src/app/analyse/earnings/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import Card from '@/components/Card';
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

export default function EarningsPage() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [earningsData, setEarningsData] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
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
          
          if (data && data.length > 0) {
            await loadEarningsData(data.map(item => item.ticker));
          }
        }
      } catch (error) {
        console.error('[EarningsPage] Error:', error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  async function loadEarningsData(tickers: string[]) {
    try {
      // Lade Earnings für die nächsten 30 Tage statt nur 1 Woche
      const startDate = formatDate(new Date());
      const endDate = formatDate(addDays(new Date(), 30));
      
      console.log('[EarningsPage] Loading earnings from', startDate, 'to', endDate, 'for tickers:', tickers);

      const res = await fetch(
        `https://financialmodelingprep.com/api/v3/earning_calendar?from=${startDate}&to=${endDate}&apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
      );

      if (res.ok) {
        const allEarnings = await res.json();
        console.log('[EarningsPage] All earnings loaded:', allEarnings.length);
        
        const filteredEarnings = allEarnings
          .filter((earning: any) => tickers.includes(earning.symbol))
          .map((earning: any) => ({
            ticker: earning.symbol,
            date: earning.date,
            time: earning.time === 'bmo' ? 'bmo' : earning.time === 'amc' ? 'amc' : null,
            eps: earning.eps,
            epsEstimated: earning.epsEstimated,
            revenue: earning.revenue,
            revenueEstimated: earning.revenueEstimated
          }));

        console.log('[EarningsPage] Filtered earnings for watchlist:', filteredEarnings);
        setEarningsData(filteredEarnings);
      } else {
        console.error('[EarningsPage] API Error:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Error loading earnings data:', error);
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
      // Zeige 3 Wochen (21 Tage) für bessere Übersicht
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
    <main className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
          <CalendarIcon className="w-10 h-10 text-blue-400" />
          Earnings Kalender
        </h1>
        <p className="text-gray-300 text-lg">
          Earnings Termine für deine Watchlist-Aktien
        </p>
      </div>

      {watchlistItems.length === 0 ? (
        <Card>
          <div className="text-center py-12 space-y-6">
            <div className="w-24 h-24 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center">
              <CalendarIcon className="w-12 h-12 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Keine Watchlist-Aktien</h2>
              <p className="text-gray-400 max-w-md mx-auto">
                Füge Aktien zu deiner Watchlist hinzu, um ihre Earnings-Termine hier zu sehen.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/watchlist')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Zur Watchlist
              </button>
              <button
                onClick={() => router.push('/analyse')}
                className="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition"
              >
                Aktien suchen
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Navigation */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold text-white">
                      {viewMode === 'week' ? 'Diese Woche' : 'Nächste 3 Wochen'}
                    </h2>
                    <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm">
                      {watchlistItems.length} Aktien • {earningsData.length} Earnings
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('week')}
                        className={`px-3 py-1 text-sm rounded transition ${
                          viewMode === 'week' 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        Woche
                      </button>
                      <button
                        onClick={() => setViewMode('month')}
                        className={`px-3 py-1 text-sm rounded transition ${
                          viewMode === 'month' 
                            ? 'bg-blue-600 text-white' 
                            : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        3 Wochen
                      </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate('prev')}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                      >
                        <ChevronLeftIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1 text-sm bg-gray-700 text-gray-200 hover:bg-gray-600 rounded-lg transition"
                      >
                        Heute
                      </button>
                      <button
                        onClick={() => navigate('next')}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Upcoming Earnings */}
            {upcomingEarnings.length > 0 && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2 text-yellow-400" />
                    Nächste Earnings
                  </h3>
                  <div className="space-y-2">
                    {upcomingEarnings.map((earning, idx) => (
                      <div 
                        key={`${earning.ticker}-${idx}`}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-700/50 rounded-lg transition cursor-pointer"
                        onClick={() => router.push(`/analyse/${earning.ticker.toLowerCase()}`)}
                      >
                        <Logo
                          src={`/logos/${earning.ticker.toLowerCase()}.svg`}
                          alt={`${earning.ticker} Logo`}
                          className="w-8 h-8"
                          padding="small"
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium">{earning.ticker}</div>
                          <div className="text-sm text-gray-400">
                            {new Date(earning.date).toLocaleDateString('de-DE', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                            {earning.time && (
                              <span className={`ml-2 px-1 rounded text-xs ${
                                earning.time === 'bmo' ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                              }`}>
                                {earning.time === 'bmo' ? 'BMO' : 'AMC'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Calendar Grid */}
          <Card>
            <div className="p-6">
              <div className={`grid gap-4 ${
                viewMode === 'week' 
                  ? 'grid-cols-7' 
                  : 'grid-cols-7 lg:grid-cols-7'
              }`}>
                {displayDays.map((day, index) => {
                  const dateStr = formatDate(day);
                  const dayEarnings = groupedEarnings[dateStr] || [];
                  const isToday = formatDate(new Date()) === dateStr;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  
                  return (
                    <div 
                      key={dateStr} 
                      className={`min-h-[120px] p-3 rounded-lg border transition ${
                        isToday 
                          ? 'bg-blue-900/30 border-blue-500' 
                          : isWeekend
                            ? 'bg-gray-800/30 border-gray-700'
                            : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800/70'
                      }`}
                    >
                      {/* Day Header */}
                      <div className="text-center mb-2">
                        <div className="text-xs text-gray-400 mb-1">
                          {weekDayNames[day.getDay()]}
                        </div>
                        <div className={`text-lg font-bold ${
                          isToday ? 'text-blue-400' : 'text-white'
                        }`}>
                          {day.getDate()}
                        </div>
                        {day.getDate() === 1 && (
                          <div className="text-xs text-gray-500">
                            {monthNames[day.getMonth()]}
                          </div>
                        )}
                      </div>

                      {/* Earnings Events */}
                      <div className="space-y-1">
                        {dayEarnings.length === 0 ? (
                          !isWeekend && (
                            <div className="text-center text-gray-500 text-xs mt-4">
                              Keine Earnings
                            </div>
                          )
                        ) : (
                          dayEarnings.map((earning, idx) => (
                            <div
                              key={`${earning.ticker}-${idx}`}
                              className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded p-2 transition cursor-pointer"
                              onClick={() => router.push(`/analyse/${earning.ticker.toLowerCase()}`)}
                            >
                              <div className="flex items-center space-x-2">
                                <Logo
                                  src={`/logos/${earning.ticker.toLowerCase()}.svg`}
                                  alt={`${earning.ticker} Logo`}
                                  className="w-6 h-6"
                                  padding="none"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-medium text-sm truncate">
                                    {earning.ticker}
                                  </div>
                                  {earning.time && (
                                    <div className={`text-xs ${
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
          </Card>

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <Card>
              <div className="p-4">
                <h4 className="text-white font-medium mb-2">Debug Info:</h4>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>Watchlist Aktien: {watchlistItems.map(i => i.ticker).join(', ')}</div>
                  <div>Earnings geladen: {earningsData.length}</div>
                  <div>Earnings Tickers: {earningsData.map(e => e.ticker).join(', ')}</div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </main>
  );
}