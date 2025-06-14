// src/app/watchlist/page.tsx - MODERNISIERTE VERSION
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

export default function ModernWatchlistPage() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showOnlyDips, setShowOnlyDips] = useState(false);
  const [dipThreshold, setDipThreshold] = useState(10); // Default: 10% Dip
  const router = useRouter();

  useEffect(() => {
    async function fetchWatchlist() {
      try {
        // 1) Session prüfen
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

        // 2) Watchlist laden
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
          
          // 3) Stock-Daten für alle Tickers laden
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
      // Parallel alle Ticker laden
      const promises = tickers.map(async (ticker) => {
        try {
          const res = await fetch(
            `https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
          );
          
          if (res.ok) {
            const [quote] = await res.json();
            if (quote) {
              // Dip-Percentage berechnen: Wie weit ist der aktuelle Kurs vom 52-Week High entfernt?
              const dipPercent = ((quote.price - quote.yearHigh) / quote.yearHigh) * 100;
              
              stockDataMap[ticker] = {
                ticker,
                price: quote.price,
                change: quote.change,
                changePercent: quote.changesPercentage,
                week52High: quote.yearHigh,
                week52Low: quote.yearLow,
                dipPercent: dipPercent,
                isDip: dipPercent <= -dipThreshold // Ist es ein Schnäppchen basierend auf Threshold?
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
        // Auch aus stockData entfernen
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
            <p className="text-gray-400">Lade Watchlist...</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter: Nur Schnäppchen anzeigen oder alle
  const filteredItems = showOnlyDips 
    ? watchlistItems.filter(item => stockData[item.ticker]?.isDip)
    : watchlistItems;

  const dipCount = watchlistItems.filter(item => stockData[item.ticker]?.isDip).length;

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
              <BookmarkIcon className="w-4 h-4" />
              <span>Deine Watchlist</span>
            </div>
            
            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                Verfolge deine
              </h1>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  Favoriten-Aktien
                </span>
              </h2>
            </div>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Entdecke Schnäppchen und verfolge die Performance deiner bevorzugten Investments.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative space-y-8">
        
        {/* Schnäppchen-Radar Controls */}
        {watchlistItems.length > 0 && (
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <ArrowTrendingDownIcon className="w-6 h-6 text-red-400" />
                  <h2 className="text-xl font-semibold text-white">
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
                  <AdjustmentsHorizontalIcon className="w-4 h-4 text-gray-400" />
                  <label className="text-gray-400 text-sm">Schwelle:</label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={dipThreshold}
                    onChange={(e) => {
                      setDipThreshold(Number(e.target.value));
                      // Neu berechnen welche Stocks Schnäppchen sind
                      const newStockData = { ...stockData };
                      Object.keys(newStockData).forEach(ticker => {
                        newStockData[ticker].isDip = newStockData[ticker].dipPercent <= -Number(e.target.value);
                      });
                      setStockData(newStockData);
                    }}
                    className="w-20 accent-green-500"
                  />
                  <span className="text-gray-300 text-sm w-12">-{dipThreshold}%</span>
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowOnlyDips(!showOnlyDips)}
                  className={`px-4 py-2 rounded-lg transition font-medium ${
                    showOnlyDips 
                      ? 'bg-red-500 text-white' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
                  }`}
                >
                  {showOnlyDips ? 'Alle anzeigen' : 'Nur Schnäppchen'}
                </button>

                {/* Refresh Button */}
                <button
                  onClick={() => loadStockData(watchlistItems.map(item => item.ticker))}
                  disabled={dataLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-black rounded-lg hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition font-medium"
                >
                  <ArrowPathIcon className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
                  {dataLoading ? 'Laden...' : 'Aktualisieren'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Watchlist Content */}
        {filteredItems.length === 0 ? (
          <div className="bg-gray-900/70 border border-gray-800 rounded-xl p-12 backdrop-blur-sm text-center">
            <div className="w-24 h-24 mx-auto bg-gray-800/50 rounded-2xl flex items-center justify-center mb-6">
              {showOnlyDips ? (
                <ArrowTrendingDownIcon className="w-12 h-12 text-gray-400" />
              ) : (
                <BookmarkIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold text-white">
                {showOnlyDips 
                  ? watchlistItems.length > 0 
                    ? 'Keine Schnäppchen gefunden'
                    : 'Keine Aktien in der Watchlist'
                  : 'Keine Aktien in der Watchlist'
                }
              </h2>
              <p className="text-gray-400">
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
                  href="/analyse"
                  className="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition font-medium border border-gray-700"
                >
                  Aktien finden
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => {
              const data = stockData[item.ticker];
              const hasData = !!data;
              
              return (
                <div key={item.id} className="bg-gray-900/70 border border-gray-800 rounded-xl p-6 backdrop-blur-sm hover:bg-gray-900/80 hover:border-gray-700 transition-all duration-200">
                  
                  {/* Header mit Logo und Dip-Indikator */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-800/50 rounded-xl flex items-center justify-center">
                        <Logo
                          src={`/logos/${item.ticker.toLowerCase()}.svg`}
                          alt={`${item.ticker} Logo`}
                          className="w-8 h-8"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          {item.ticker}
                          {hasData && data.isDip && (
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-400" title="Schnäppchen!" />
                          )}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Hinzugefügt: {new Date(item.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromWatchlist(item.id, item.ticker)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Aus Watchlist entfernen"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stock Data */}
                  {hasData ? (
                    <div className="space-y-4">
                      {/* Aktueller Preis und Change */}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-white">
                          ${data.price.toFixed(2)}
                        </span>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
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

                      {/* 52-Week High/Low und Dip Info */}
                      <div className="space-y-2 pt-3 border-t border-gray-800/50">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">52W High:</span>
                          <span className="text-white">${data.week52High.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">52W Low:</span>
                          <span className="text-white">${data.week52Low.toFixed(2)}</span>
                        </div>
                        
                        {/* Dip Percentage */}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Von 52W High:</span>
                          <span className={`font-medium ${
                            data.dipPercent <= -dipThreshold ? 'text-red-400' : 'text-gray-300'
                          }`}>
                            {data.dipPercent.toFixed(1)}%
                          </span>
                        </div>

                        {/* Dip Alert */}
                        {data.isDip && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mt-3">
                            <p className="text-red-300 text-sm font-medium">
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
                        <p className="text-gray-500 text-sm">Daten werden geladen...</p>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-6">
                    <Link
                      href={`/analyse/${item.ticker.toLowerCase()}`}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition font-medium border border-gray-700"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                      <span>Analyse</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Info */}
        {watchlistItems.length > 0 && (
          <div className="text-center pt-8">
            <p className="text-gray-500">
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