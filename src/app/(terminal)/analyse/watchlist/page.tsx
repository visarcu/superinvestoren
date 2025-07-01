// src/app/watchlist/page.tsx - DASHBOARD DESIGN KONSISTENZ
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { 
  TrashIcon, 
  ChartBarIcon, 
  ArrowTrendingDownIcon, 
  ArrowTrendingUpIcon,
  BookmarkIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import Logo from '@/components/Logo';

interface WatchlistItem {
  id: string;
  ticker: string;
  created_at: string;
}

interface StockData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  week52High: number;
  week52Low: number;
  dipPercent: number;
  isDip: boolean;
}

export default function WatchlistPage() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showOnlyDips, setShowOnlyDips] = useState(false);
  const [dipThreshold, setDipThreshold] = useState(10);
  const router = useRouter();

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
            await loadStockData(data.map(item => item.ticker));
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
      const promises = tickers.map(async (ticker) => {
        try {
          const res = await fetch(
            `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          );
          
          if (res.ok) {
            const [quote] = await res.json();
            if (quote) {
              const dipPercent = ((quote.price - quote.yearHigh) / quote.yearHigh) * 100;
              
              stockDataMap[ticker] = {
                ticker,
                price: quote.price,
                change: quote.change,
                changePercent: quote.changesPercentage,
                week52High: quote.yearHigh,
                week52Low: quote.yearLow,
                dipPercent: dipPercent,
                isDip: dipPercent <= -dipThreshold
              };
            }
          }
        } catch (error) {
          console.error(`Error loading data for ${ticker}:`, error);
        }
      });

      await Promise.all(promises);
      setStockData(stockDataMap);
    } catch (error) {
      console.error('Error loading stock data:', error);
    } finally {
      setDataLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-primary">
        <div className="flex min-h-screen items-center justify-center py-12 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-theme-secondary">Lade Watchlist...</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredItems = showOnlyDips 
    ? watchlistItems.filter(item => stockData[item.ticker]?.isDip)
    : watchlistItems;

  const dipCount = watchlistItems.filter(item => stockData[item.ticker]?.isDip).length;

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="w-full px-4 py-4 space-y-4">
        
        {/* Hero Header */}
        <div className="bg-theme-card rounded-lg">
          <div className="p-6">
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 mb-3">
                <BookmarkIcon className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-green-400">Deine Watchlist</span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-theme-primary mb-2">
                Verfolge deine
                <span className="block text-green-400">Favoriten-Aktien</span>
              </h1>
              
              <p className="text-theme-secondary max-w-2xl">
                Entdecke Schnäppchen und verfolge die Performance deiner bevorzugten Investments.
              </p>
            </div>
          </div>
        </div>

        {/* Schnäppchen-Radar Controls */}
        {watchlistItems.length > 0 && (
          <div className="bg-theme-card rounded-lg">
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <ArrowTrendingDownIcon className="w-6 h-6 text-red-400" />
                    <h2 className="text-lg font-semibold text-theme-primary">
                      Schnäppchen-Radar
                    </h2>
                  </div>
                  {dipCount > 0 && (
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm rounded-lg font-medium">
                      {dipCount} Schnäppchen gefunden
                    </span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  {/* Dip Threshold Slider */}
                  <div className="flex items-center gap-3">
                    <AdjustmentsHorizontalIcon className="w-4 h-4 text-theme-secondary" />
                    <label className="text-theme-secondary text-sm">Schwelle:</label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      value={dipThreshold}
                      onChange={(e) => {
                        setDipThreshold(Number(e.target.value));
                        const newStockData = { ...stockData };
                        Object.keys(newStockData).forEach(ticker => {
                          newStockData[ticker].isDip = newStockData[ticker].dipPercent <= -Number(e.target.value);
                        });
                        setStockData(newStockData);
                      }}
                      className="w-20 accent-green-500"
                    />
                    <span className="text-theme-primary text-sm w-12">-{dipThreshold}%</span>
                  </div>

                  {/* Filter Toggle */}
                  <button
                    onClick={() => setShowOnlyDips(!showOnlyDips)}
                    className={`px-4 py-2 rounded-lg transition font-medium text-sm ${
                      showOnlyDips 
                        ? 'bg-red-500 text-white' 
                        : 'bg-theme-tertiary/50 text-theme-secondary hover:bg-theme-tertiary hover:text-theme-primary'
                    }`}
                  >
                    {showOnlyDips ? 'Alle anzeigen' : 'Nur Schnäppchen'}
                  </button>

                  {/* Refresh Button */}
                  <button
                    onClick={() => loadStockData(watchlistItems.map(item => item.ticker))}
                    disabled={dataLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 disabled:bg-theme-tertiary disabled:text-theme-muted disabled:cursor-not-allowed transition font-medium text-sm"
                  >
                    <ArrowPathIcon className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                    {dataLoading ? 'Laden...' : 'Aktualisieren'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Watchlist Content */}
        {filteredItems.length === 0 ? (
          <div className="bg-theme-card rounded-lg">
            <div className="p-12 text-center">
              <div className="w-24 h-24 mx-auto bg-theme-tertiary/30 rounded-2xl flex items-center justify-center mb-6">
                {showOnlyDips ? (
                  <ArrowTrendingDownIcon className="w-12 h-12 text-theme-secondary" />
                ) : (
                  <BookmarkIcon className="w-12 h-12 text-theme-secondary" />
                )}
              </div>
              
              <div className="space-y-4 max-w-md mx-auto">
                <h2 className="text-xl font-semibold text-theme-primary">
                  {showOnlyDips 
                    ? watchlistItems.length > 0 
                      ? 'Keine Schnäppchen gefunden'
                      : 'Keine Aktien in der Watchlist'
                    : 'Keine Aktien in der Watchlist'
                  }
                </h2>
                <p className="text-theme-secondary text-sm">
                  {showOnlyDips && watchlistItems.length > 0
                    ? `Alle deine Aktien sind weniger als ${dipThreshold}% von ihrem 52-Wochen-Hoch entfernt.`
                    : 'Füge Aktien zu deiner Watchlist hinzu, um sie zu verfolgen und Schnäppchen zu entdecken.'
                  }
                </p>
              </div>
              
              {!showOnlyDips && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <Link
                    href="/superinvestor"
                    className="px-6 py-3 bg-green-500 text-black rounded-lg hover:bg-green-400 transition font-medium"
                  >
                    Super-Investoren entdecken
                  </Link>
                  <Link
                    href="/analyse/stocks"
                    className="px-6 py-3 bg-theme-tertiary/50 text-theme-secondary rounded-lg hover:bg-theme-tertiary hover:text-theme-primary transition font-medium"
                  >
                    Aktien finden
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-theme-card rounded-lg">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => {
                  const data = stockData[item.ticker];
                  const hasData = !!data;
                  
                  return (
                    <div key={item.id} className="p-6 rounded-lg hover:bg-theme-secondary/20 transition-all duration-200 border border-theme/10 hover:border-green-500/20">
                      
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Logo
                            src={`/logos/${item.ticker.toLowerCase()}.svg`}
                            alt={`${item.ticker} Logo`}
                            className="w-10 h-10"
                          />
                          <div>
                            <h3 className="text-base font-semibold text-theme-primary flex items-center gap-2">
                              {item.ticker}
                              {hasData && data.isDip && (
                                <ExclamationTriangleIcon className="w-4 h-4 text-red-400" title="Schnäppchen!" />
                              )}
                            </h3>
                            <p className="text-xs text-theme-muted">
                              {new Date(item.created_at).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromWatchlist(item.id, item.ticker)}
                          className="p-2 text-theme-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                          title="Aus Watchlist entfernen"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Stock Data */}
                      {hasData ? (
                        <div className="space-y-4">
                          {/* Price & Change */}
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-theme-primary">
                              ${data.price.toFixed(2)}
                            </span>
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                              data.change >= 0 
                                ? 'text-green-400 bg-green-500/20' 
                                : 'text-red-400 bg-red-500/20'
                            }`}>
                              {data.change >= 0 ? (
                                <ArrowTrendingUpIcon className="w-3 h-3" />
                              ) : (
                                <ArrowTrendingDownIcon className="w-3 h-3" />
                              )}
                              <span>
                                {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                              </span>
                            </div>
                          </div>

                          {/* 52W Data */}
                          <div className="space-y-2 pt-3 border-t border-theme/10">
                            <div className="flex justify-between text-xs">
                              <span className="text-theme-secondary">52W High:</span>
                              <span className="text-theme-primary">${data.week52High.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-theme-secondary">52W Low:</span>
                              <span className="text-theme-primary">${data.week52Low.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-theme-secondary">Von 52W High:</span>
                              <span className={`font-medium ${
                                data.dipPercent <= -dipThreshold ? 'text-red-400' : 'text-theme-primary'
                              }`}>
                                {data.dipPercent.toFixed(1)}%
                              </span>
                            </div>

                            {/* Dip Alert */}
                            {data.isDip && (
                              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded mt-2">
                                <p className="text-red-300 text-xs font-medium">
                                  🔥 SCHNÄPPCHEN: {Math.abs(data.dipPercent).toFixed(1)}% unter 52W High!
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          {dataLoading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                          ) : (
                            <p className="text-theme-muted text-sm">Daten werden geladen...</p>
                          )}
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="mt-6">
                        <Link
                          href={`/analyse/stocks/${item.ticker.toLowerCase()}`}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-tertiary/50 text-theme-secondary rounded-lg hover:bg-theme-tertiary hover:text-theme-primary transition font-medium text-sm"
                        >
                          <ChartBarIcon className="w-4 h-4" />
                          <span>Analyse</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        {watchlistItems.length > 0 && (
          <div className="text-center">
            <p className="text-theme-muted text-sm">
              {watchlistItems.length} {watchlistItems.length === 1 ? 'Aktie' : 'Aktien'} in deiner Watchlist
              {dipCount > 0 && (
                <span className="ml-2 text-red-400">
                  • {dipCount} Schnäppchen entdeckt
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}