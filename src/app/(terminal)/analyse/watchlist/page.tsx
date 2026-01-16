// src/app/watchlist/page.tsx - Fey-Style Watchlist mit Earnings Integration
'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  TrashIcon,
  ChartBarIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import Logo from '@/components/Logo';
import { fmtNum, fmtPercent, fmtVolume } from '@/utils/formatters';

interface WatchlistItem {
  id: string;
  ticker: string;
  created_at: string;
}

interface StockData {
  ticker: string;
  companyName?: string;
  price: number;
  change: number;
  changePercent: number;
  week52High: number;
  week52Low: number;
  dipPercent: number;
  isDip: boolean;
  marketCap?: number;
  volume?: number;
  peRatio?: number;
  exchange?: string;
  currency?: string;
  revenueGrowthYOY?: number;
}

interface EarningsEvent {
  symbol: string;
  companyName?: string;
  date: string;
  time: string;
  epsEstimate?: number | null;
}

type SortColumn = 'ticker' | 'price' | 'changePercent' | 'revenueGrowthYOY' | 'earnings' | 'volume';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'list' | 'grid';

export default function WatchlistPage() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [earningsEvents, setEarningsEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortColumn, setSortColumn] = useState<SortColumn>('ticker');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const router = useRouter();

  // Get current date info (German)
  const today = new Date();
  const dayName = today.toLocaleDateString('de-DE', { weekday: 'long' });
  const monthDay = today.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' });

  useEffect(() => {
    async function fetchWatchlist() {
      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

        if (sessionErr) {
          console.error('[Watchlist] Session Error:', sessionErr.message);
          router.push('/auth/signin');
          return;
        }

        if (!session?.user) {
          router.push('/auth/signin');
          return;
        }

        setUser(session.user);

        const { data, error: dbErr } = await supabase
          .from('watchlists')
          .select('id, ticker, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (dbErr) {
          console.error('[Watchlist] DB Error:', dbErr.message);
          setWatchlistItems([]);
        } else {
          setWatchlistItems(data || []);

          if (data && data.length > 0) {
            const tickers = data.map(item => item.ticker);
            await Promise.all([
              loadStockData(tickers),
              loadEarningsData(tickers, session.user.id)
            ]);
          }
        }
      } catch (error) {
        console.error('[Watchlist] Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWatchlist();
  }, [router]);

  async function loadStockData(tickers: string[]) {
    setDataLoading(true);
    const stockDataMap: Record<string, StockData> = {};

    try {
      // Load quotes and screener data in parallel
      const [quotesRes, screenerRes] = await Promise.all([
        fetch(`/api/quotes?symbols=${tickers.join(',')}`),
        fetch('/data/stocks-screener.json')
      ]);

      // Parse screener data for revenue growth
      let screenerData: Record<string, any> = {};
      if (screenerRes.ok) {
        try {
          const screenerJson = await screenerRes.json();
          if (screenerJson.stocks) {
            screenerJson.stocks.forEach((stock: any) => {
              screenerData[stock.symbol] = stock;
            });
          }
        } catch (e) {
          console.warn('Could not parse screener data:', e);
        }
      }

      if (quotesRes.ok) {
        const quotes = await quotesRes.json();

        quotes.forEach((quote: any) => {
          if (quote) {
            const dipPercent = ((quote.price - quote.yearHigh) / quote.yearHigh) * 100;
            const screenerStock = screenerData[quote.symbol];

            stockDataMap[quote.symbol] = {
              ticker: quote.symbol,
              companyName: quote.name,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changesPercentage,
              week52High: quote.yearHigh,
              week52Low: quote.yearLow,
              dipPercent: dipPercent,
              isDip: dipPercent <= -10,
              marketCap: quote.marketCap,
              volume: quote.volume,
              peRatio: quote.pe,
              exchange: quote.exchange,
              currency: 'USD',
              // Get revenue growth from screener data (revenueGrowth1Y is YOY)
              revenueGrowthYOY: screenerStock?.revenueGrowth1Y ?? null
            };
          }
        });
      }

      setStockData(stockDataMap);
    } catch (error) {
      console.error('Error loading stock data:', error);
    } finally {
      setDataLoading(false);
    }
  }

  async function loadEarningsData(tickers: string[], userId: string) {
    try {
      // Get earnings for the next 90 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);

      const res = await fetch(`/api/earnings-calendar/week?from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}`);

      if (res.ok) {
        const data = await res.json();
        // Filter to only watchlist tickers and sort by date
        const watchlistEarnings = (data.earnings || [])
          .filter((e: EarningsEvent) => tickers.includes(e.symbol))
          .sort((a: EarningsEvent, b: EarningsEvent) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .slice(0, 5); // Show max 5 upcoming

        setEarningsEvents(watchlistEarnings);
      }
    } catch (error) {
      console.error('Error loading earnings:', error);
    }
  }

  async function removeFromWatchlist(id: string, ticker: string) {
    if (!confirm(`${ticker} aus der Watchlist entfernen?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('[Watchlist] Remove Error:', error);
        alert('Fehler beim Entfernen');
      } else {
        setWatchlistItems(prev => prev.filter(item => item.id !== id));
        setStockData(prev => {
          const newData = { ...prev };
          delete newData[ticker];
          return newData;
        });
      }
    } catch (error) {
      console.error('[Watchlist] Unexpected remove error:', error);
    }
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Get next earnings date for a ticker
  const getNextEarnings = (ticker: string): EarningsEvent | undefined => {
    return earningsEvents.find(e => e.symbol === ticker);
  };

  const sortedItems = useMemo(() => {
    return [...watchlistItems].sort((a, b) => {
      const dataA = stockData[a.ticker];
      const dataB = stockData[b.ticker];

      if (!dataA && !dataB) return 0;
      if (!dataA) return 1;
      if (!dataB) return -1;

      let compareValue = 0;

      switch(sortColumn) {
        case 'ticker':
          compareValue = a.ticker.localeCompare(b.ticker);
          break;
        case 'price':
          compareValue = (dataA.price || 0) - (dataB.price || 0);
          break;
        case 'changePercent':
          compareValue = (dataA.changePercent || 0) - (dataB.changePercent || 0);
          break;
        case 'revenueGrowthYOY':
          compareValue = (dataA.revenueGrowthYOY || 0) - (dataB.revenueGrowthYOY || 0);
          break;
        case 'volume':
          compareValue = (dataA.volume || 0) - (dataB.volume || 0);
          break;
        case 'earnings':
          const earningsA = getNextEarnings(a.ticker);
          const earningsB = getNextEarnings(b.ticker);
          if (!earningsA && !earningsB) return 0;
          if (!earningsA) return 1;
          if (!earningsB) return -1;
          compareValue = new Date(earningsA.date).getTime() - new Date(earningsB.date).getTime();
          break;
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });
  }, [watchlistItems, stockData, sortColumn, sortDirection, earningsEvents]);

  const formatEarningsDate = (dateString: string, time: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const timeStr = time === 'bmo' ? '8:00' : time === 'amc' ? '17:00' : '';
      return `Heute um ${timeStr}`;
    } else if (diffDays === 1) {
      const timeStr = time === 'bmo' ? '8:00' : time === 'amc' ? '17:00' : '';
      return `Morgen um ${timeStr}`;
    } else {
      const dateFormatted = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
      const timeStr = time === 'bmo' ? '8:00' : time === 'amc' ? '17:00' : '';
      return `${dateFormatted} um ${timeStr}`;
    }
  };

  const SortHeader = ({ column, label, align = 'left' }: { column: SortColumn; label: string; align?: 'left' | 'right' }) => (
    <th
      className={`px-4 py-3 text-xs font-medium text-neutral-500 cursor-pointer hover:text-white transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {sortColumn === column && (
          sortDirection === 'asc'
            ? <ChevronUpIcon className="w-3 h-3" />
            : <ChevronDownIcon className="w-3 h-3" />
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-neutral-500 text-sm">Lade Watchlist...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="px-6 lg:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">Watchlist</h1>
            <p className="text-sm text-neutral-500">{dayName}, {monthDay}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (watchlistItems.length > 0) {
                  const tickers = watchlistItems.map(item => item.ticker);
                  loadStockData(tickers);
                  if (user?.id) loadEarningsData(tickers, user.id);
                }
              }}
              disabled={dataLoading}
              className="p-2 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-5 h-5 ${dataLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <main className="px-6 lg:px-8 pb-8 space-y-6">

        {watchlistItems.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto bg-neutral-800 rounded-2xl flex items-center justify-center mb-6">
              <ChartBarIcon className="w-8 h-8 text-neutral-600" />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Deine Watchlist ist leer</h2>
            <p className="text-neutral-500 text-sm mb-6 max-w-sm mx-auto">
              Füge Aktien hinzu, um ihre Performance und Earnings zu verfolgen.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/superinvestor"
                className="px-4 py-2 bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors text-sm font-medium"
              >
                Super-Investoren entdecken
              </Link>
              <Link
                href="/analyse/finder"
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors text-sm"
              >
                Aktien finden
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Top Cards Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Upcoming Earnings Card */}
              <div className="bg-[#111111] border border-neutral-800 rounded-xl p-5">
                <h2 className="text-sm font-medium text-white mb-4">Anstehende Earnings</h2>

                {earningsEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <CalendarDaysIcon className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                    <p className="text-neutral-500 text-sm">Keine anstehenden Earnings</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {earningsEvents.map((event, idx) => (
                      <Link
                        key={idx}
                        href={`/analyse/stocks/${event.symbol.toLowerCase()}`}
                        className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-b-0 hover:bg-neutral-800/30 -mx-2 px-2 rounded transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-8 bg-emerald-500 rounded-full" />
                          <div>
                            <span className="font-medium text-white">{event.symbol}</span>
                            {stockData[event.symbol]?.companyName && (
                              <span className="text-neutral-500 text-sm ml-2">
                                {stockData[event.symbol].companyName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-neutral-400 text-sm">
                            {formatEarningsDate(event.date, event.time)}
                          </span>
                          {event.epsEstimate && (
                            <span className="text-xs px-2 py-1 bg-neutral-800 text-neutral-400 rounded">
                              Est.
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Performance Card - Coming Soon */}
              <div className="bg-[#111111] border border-neutral-800 rounded-xl p-5 relative">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-white">Deine Performance</h2>
                  <span className="text-xs px-2 py-1 bg-neutral-800 text-neutral-500 rounded">
                    Coming Soon
                  </span>
                </div>

                {/* Placeholder Content */}
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ChartBarIcon className="w-10 h-10 text-neutral-700 mb-3" />
                  <p className="text-neutral-500 text-sm">
                    Portfolio-Performance-Tracking wird bald verfügbar sein
                  </p>
                  <p className="text-neutral-600 text-xs mt-1">
                    Verfolge deine Watchlist-Performance über Zeit
                  </p>
                </div>
              </div>
            </div>

            {/* Watched Stocks Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-white">Beobachtete Aktien</h2>

                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex bg-neutral-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-colors ${
                        viewMode === 'list'
                          ? 'bg-neutral-700 text-white'
                          : 'text-neutral-500 hover:text-white'
                      }`}
                    >
                      <TableCellsIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-neutral-700 text-white'
                          : 'text-neutral-500 hover:text-white'
                      }`}
                    >
                      <Squares2X2Icon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === 'list' ? (
                /* Table View */
                <div className="bg-[#111111] border border-neutral-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-neutral-800">
                        <tr>
                          <SortHeader column="ticker" label="Company" />
                          <th className="px-4 py-3 text-xs font-medium text-neutral-500 text-center">Ccy</th>
                          <th className="px-4 py-3 text-xs font-medium text-neutral-500">Exchange</th>
                          <SortHeader column="revenueGrowthYOY" label="Umsatzwachstum" align="right" />
                          <SortHeader column="earnings" label="Earnings" align="right" />
                          <SortHeader column="volume" label="Volume" align="right" />
                          <th className="px-4 py-3 text-xs font-medium text-neutral-500 text-center">Daily chart</th>
                          <th className="px-4 py-3 text-xs font-medium text-neutral-500 text-right">Price</th>
                          <SortHeader column="changePercent" label="Performance" align="right" />
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedItems.map((item) => {
                          const data = stockData[item.ticker];
                          const earnings = getNextEarnings(item.ticker);

                          return (
                            <tr
                              key={item.id}
                              className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
                            >
                              {/* Company */}
                              <td className="px-4 py-3">
                                <Link
                                  href={`/analyse/stocks/${item.ticker.toLowerCase()}`}
                                  className="flex items-center gap-3 group"
                                >
                                  <Logo ticker={item.ticker} alt={item.ticker} className="w-8 h-8 rounded-lg" />
                                  <div>
                                    <span className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                                      {item.ticker}
                                    </span>
                                    {data?.companyName && (
                                      <span className="text-neutral-500 text-sm ml-2 hidden lg:inline">
                                        {data.companyName}
                                      </span>
                                    )}
                                  </div>
                                </Link>
                              </td>

                              {/* Currency */}
                              <td className="px-4 py-3 text-center">
                                <span className="text-xs px-2 py-1 bg-neutral-800 text-neutral-400 rounded">
                                  {data?.currency || 'USD'}
                                </span>
                              </td>

                              {/* Exchange */}
                              <td className="px-4 py-3 text-sm text-neutral-400">
                                {data?.exchange || '-'}
                              </td>

                              {/* YOY Revenue */}
                              <td className="px-4 py-3 text-right">
                                {data?.revenueGrowthYOY != null ? (
                                  <span className={`text-sm font-medium ${
                                    data.revenueGrowthYOY >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {fmtPercent(data.revenueGrowthYOY)}
                                    {data.revenueGrowthYOY >= 0 ? ' ↗' : ' ↘'}
                                  </span>
                                ) : (
                                  <span className="text-neutral-500 text-sm">–</span>
                                )}
                              </td>

                              {/* Earnings */}
                              <td className="px-4 py-3 text-right text-sm text-neutral-400">
                                {earnings ? (
                                  <span>
                                    {new Date(earnings.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} est
                                  </span>
                                ) : (
                                  <span className="text-neutral-600">Ausstehend</span>
                                )}
                              </td>

                              {/* Volume */}
                              <td className="px-4 py-3 text-right text-sm text-neutral-400">
                                {fmtVolume(data?.volume)}
                              </td>

                              {/* Mini Chart */}
                              <td className="px-4 py-3">
                                <div className="flex items-end gap-px h-6 justify-center">
                                  {Array.from({ length: 20 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className="w-1 rounded-t bg-neutral-600"
                                      style={{ height: `${Math.random() * 80 + 20}%` }}
                                    />
                                  ))}
                                </div>
                              </td>

                              {/* Price */}
                              <td className="px-4 py-3 text-right">
                                <div className="font-medium text-white">
                                  {data?.price != null ? `$${fmtNum(data.price)}` : '–'}
                                </div>
                                {data?.change != null && (
                                  <div className={`text-xs ${data.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {data.change >= 0 ? '+' : ''}${fmtNum(data.change)}
                                  </div>
                                )}
                              </td>

                              {/* Performance */}
                              <td className="px-4 py-3 text-right">
                                {data?.changePercent != null ? (
                                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                                    data.changePercent >= 0
                                      ? 'text-emerald-400 bg-emerald-400/10'
                                      : 'text-red-400 bg-red-400/10'
                                  }`}>
                                    {fmtPercent(data.changePercent)}
                                  </span>
                                ) : (
                                  <span className="text-neutral-500">–</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => removeFromWatchlist(item.id, item.ticker)}
                                  className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors rounded hover:bg-red-400/10"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedItems.map((item) => {
                    const data = stockData[item.ticker];
                    const earnings = getNextEarnings(item.ticker);

                    return (
                      <Link
                        key={item.id}
                        href={`/analyse/stocks/${item.ticker.toLowerCase()}`}
                        className="bg-[#111111] border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors block"
                      >
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <Logo ticker={item.ticker} alt={item.ticker} className="w-10 h-10 rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-white">
                              {item.ticker}
                            </span>
                            {data?.companyName && (
                              <p className="text-neutral-500 text-sm truncate">
                                {data.companyName}
                              </p>
                            )}
                          </div>
                          {data?.changePercent != null && (
                            <span className={`text-sm font-medium px-2 py-1 rounded ${
                              data.changePercent >= 0
                                ? 'text-emerald-400 bg-emerald-400/10'
                                : 'text-red-400 bg-red-400/10'
                            }`}>
                              {fmtPercent(data.changePercent)}
                            </span>
                          )}
                        </div>

                        {/* Price & Details */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500 text-sm">Kurs</span>
                            <span className="text-lg font-bold text-white">
                              {data?.price != null ? `$${fmtNum(data.price)}` : '–'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500 text-sm">Tagesänderung</span>
                            {data?.change != null ? (
                              <span className={`text-sm ${data.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {data.change >= 0 ? '+' : ''}${fmtNum(data.change)}
                              </span>
                            ) : (
                              <span className="text-neutral-500 text-sm">–</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500 text-sm">Umsatzwachstum</span>
                            {data?.revenueGrowthYOY != null ? (
                              <span className={`text-sm ${data.revenueGrowthYOY >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {fmtPercent(data.revenueGrowthYOY)}
                              </span>
                            ) : (
                              <span className="text-neutral-500 text-sm">–</span>
                            )}
                          </div>
                          {earnings && (
                            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                              <span className="text-neutral-500 text-sm">Nächste Earnings</span>
                              <span className="text-sm text-blue-400">
                                {new Date(earnings.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
