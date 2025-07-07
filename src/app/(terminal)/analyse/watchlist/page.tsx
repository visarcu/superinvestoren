// src/app/watchlist/page.tsx - KONSISTENT MIT DASHBOARD DESIGN
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
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon
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
      
      {/* Professional Header - wie Dashboard */}
      <div className="border-b border-theme/5">
        <div className="w-full px-6 lg:px-8 py-8">
          
          {/* Zurück-Link */}
          <Link
            href="/analyse"
            className="inline-flex items-center gap-2 text-theme-secondary hover:text-green-400 transition-colors duration-200 mb-6 group"
          >
            <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
            Zurück zur Analyse
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BookmarkIcon className="w-6 h-6 text-green-400" />
                <h1 className="text-3xl font-bold text-theme-primary">
                  Deine Watchlist
                </h1>
              </div>
              <div className="flex items-center gap-4 text-theme-secondary">
                <span className="text-sm">
                  {watchlistItems.length} {watchlistItems.length === 1 ? 'Aktie' : 'Aktien'}
                </span>
                {dipCount > 0 && (
                  <>
                    <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                    <span className="text-sm text-red-400">
                      {dipCount} Schnäppchen entdeckt
                    </span>
                  </>
                )}
                <div className="w-1 h-1 bg-theme-muted rounded-full"></div>
                <span className="text-sm">Live-Kurse</span>
              </div>
            </div>
            
            {/* Quick Actions */}
            {watchlistItems.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => loadStockData(watchlistItems.map(item => item.ticker))}
                  disabled={dataLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                  <span className="font-medium">{dataLoading ? 'Laden...' : 'Aktualisieren'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="w-full px-6 lg:px-8 py-8 space-y-8">
        
        {/* Schnäppchen-Radar Controls */}
        {watchlistItems.length > 0 && (
          <section>
            <div className="bg-theme-card border border-theme/5 rounded-xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <ArrowTrendingDownIcon className="w-6 h-6 text-red-400" />
                    <h2 className="text-xl font-semibold text-theme-primary">
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
                        : 'bg-theme-card border border-theme/10 text-theme-secondary hover:bg-theme-hover hover:text-theme-primary'
                    }`}
                  >
                    {showOnlyDips ? 'Alle anzeigen' : 'Nur Schnäppchen'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Watchlist Content */}
        <section>
          {filteredItems.length === 0 ? (
            <div className="bg-theme-card border border-theme/5 rounded-xl p-12 text-center">
              <div className="w-24 h-24 mx-auto bg-theme-secondary rounded-2xl flex items-center justify-center mb-6">
                {showOnlyDips ? (
                  <ArrowTrendingDownIcon className="w-12 h-12 text-theme-muted" />
                ) : (
                  <BookmarkIcon className="w-12 h-12 text-theme-muted" />
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
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
                  >
                    Super-Investoren entdecken
                  </Link>
                  <Link
                    href="/analyse"
                    className="px-6 py-3 bg-theme-card border border-theme/10 text-theme-secondary rounded-lg hover:bg-theme-hover hover:text-theme-primary transition font-medium"
                  >
                    Aktien finden
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-theme-primary mb-6">
                {showOnlyDips ? 'Schnäppchen in deiner Watchlist' : 'Deine beobachteten Aktien'}
              </h3>
              
              {/* ✅ EINZELNE CARDS FÜR JEDE AKTIE - wie Dashboard Market Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => {
                  const data = stockData[item.ticker];
                  const hasData = !!data;
                  
                  return (
                    <div key={item.id} className="bg-theme-card border border-theme/5 rounded-xl p-6 hover:border-theme/10 transition-all duration-200 group">
                      
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Logo
                            ticker={item.ticker}
                            alt={`${item.ticker} Logo`}
                            className="w-10 h-10 rounded-lg"
                          />
                          <div>
                            <h4 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                              {item.ticker}
                              {hasData && data.isDip && (
                                <ExclamationTriangleIcon className="w-4 h-4 text-red-400" title="Schnäppchen!" />
                              )}
                            </h4>
                            <p className="text-xs text-theme-muted">
                              {new Date(item.created_at).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromWatchlist(item.id, item.ticker)}
                          className="p-2 text-theme-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition opacity-0 group-hover:opacity-100"
                          title="Aus Watchlist entfernen"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Stock Data */}
                      {hasData ? (
                        <div className="space-y-4">
                          {/* Price & Change */}
                          <div className="space-y-3">
                            <div className="text-2xl font-bold text-theme-primary">
                              ${data.price.toFixed(2)}
                            </div>
                            
                            <div className={`inline-flex items-center gap-2 text-sm font-bold px-3 py-1 rounded-lg ${
                              data.change >= 0 
                                ? 'text-green-400 bg-green-500/20' 
                                : 'text-red-400 bg-red-500/20'
                            }`}>
                              {data.change >= 0 ? (
                                <ArrowTrendingUpIcon className="w-4 h-4" />
                              ) : (
                                <ArrowTrendingDownIcon className="w-4 h-4" />
                              )}
                              <span>
                                {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                              </span>
                            </div>
                          </div>

                          {/* 52W Data */}
                          <div className="space-y-2 pt-3 border-t border-theme/5">
                            <div className="flex justify-between text-xs">
                              <span className="text-theme-muted">52W High:</span>
                              <span className="text-theme-primary font-medium">${data.week52High.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-theme-muted">52W Low:</span>
                              <span className="text-theme-primary font-medium">${data.week52Low.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-theme-muted">Von 52W High:</span>
                              <span className={`font-bold ${
                                data.dipPercent <= -dipThreshold ? 'text-red-400' : 'text-theme-primary'
                              }`}>
                                {data.dipPercent.toFixed(1)}%
                              </span>
                            </div>

                            {/* Subtle Professional Alert */}
                            {data.isDip && (
                              <div className="p-3 bg-theme-secondary border border-theme/10 rounded-lg mt-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-theme-primary rounded-full"></div>
                                  <p className="text-theme-primary text-xs font-medium">
                                  Signifikante Korrektur
                                  </p>
                                </div>
                                <p className="text-theme-muted text-xs mt-1">
                                  {Math.abs(data.dipPercent).toFixed(1)}% unter 52-Wochen-Hoch
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
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-secondary hover:bg-theme-hover text-theme-primary rounded-lg transition font-medium text-sm"
                        >
                          <ChartBarIcon className="w-4 h-4" />
                          <span>Analyse</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}