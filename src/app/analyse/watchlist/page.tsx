// src/app/watchlist/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { TrashIcon, ChartBarIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import Card from '@/components/Card';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter: Nur Schnäppchen anzeigen oder alle
  const filteredItems = showOnlyDips 
    ? watchlistItems.filter(item => stockData[item.ticker]?.isDip)
    : watchlistItems;

  const dipCount = watchlistItems.filter(item => stockData[item.ticker]?.isDip).length;

  return (
    <main className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white">Deine Watchlist</h1>
        <p className="text-gray-300 text-lg">
          Verfolge deine favorisierten Aktien und entdecke Schnäppchen
        </p>
      </div>

      {/* Schnäppchen-Radar Controls */}
      {watchlistItems.length > 0 && (
        <Card>
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <ArrowTrendingDownIcon className="w-6 h-6 mr-2 text-red-400" />
                  Schnäppchen-Radar
                </h2>
                {dipCount > 0 && (
                  <span className="px-3 py-1 bg-red-600 text-white text-sm rounded-full">
                    {dipCount} Schnäppchen gefunden
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Dip Threshold Slider */}
                <div className="flex items-center space-x-2">
                  <label className="text-gray-300 text-sm">Schwelle:</label>
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
                    className="w-20"
                  />
                  <span className="text-gray-300 text-sm w-8">-{dipThreshold}%</span>
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowOnlyDips(!showOnlyDips)}
                  className={`px-4 py-2 rounded-lg transition ${
                    showOnlyDips 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  {showOnlyDips ? 'Alle anzeigen' : 'Nur Schnäppchen'}
                </button>

                {/* Refresh Button */}
                <button
                  onClick={() => loadStockData(watchlistItems.map(item => item.ticker))}
                  disabled={dataLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
                >
                  {dataLoading ? 'Laden...' : 'Aktualisieren'}
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Watchlist Content */}
      {filteredItems.length === 0 ? (
        <Card>
          <div className="text-center py-12 space-y-6">
            <div className="w-24 h-24 mx-auto bg-gray-700/50 rounded-full flex items-center justify-center">
              {showOnlyDips ? (
                <ArrowTrendingDownIcon className="w-12 h-12 text-gray-400" />
              ) : (
                <ChartBarIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                {showOnlyDips 
                  ? watchlistItems.length > 0 
                    ? 'Keine Schnäppchen gefunden'
                    : 'Keine Aktien in der Watchlist'
                  : 'Keine Aktien in der Watchlist'
                }
              </h2>
              <p className="text-gray-400 max-w-md mx-auto">
                {showOnlyDips && watchlistItems.length > 0
                  ? `Alle deine Aktien sind weniger als ${dipThreshold}% von ihrem 52-Wochen-Hoch entfernt.`
                  : 'Füge Aktien zu deiner Watchlist hinzu, um sie zu verfolgen und Schnäppchen zu entdecken.'
                }
              </p>
            </div>
            {!showOnlyDips && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/superinvestor"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Super-Investoren entdecken
                </Link>
                <Link
                  href="/analyse"
                  className="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition"
                >
                  Aktien finden
                </Link>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const data = stockData[item.ticker];
            const hasData = !!data;
            
            return (
              <Card key={item.id}>
                <div className="p-6 space-y-4">
                  {/* Header mit Logo und Dip-Indikator */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Logo
                        src={`/logos/${item.ticker.toLowerCase()}.svg`}
                        alt={`${item.ticker} Logo`}
                        className="w-12 h-12"
                      />
                      <div>
                        <h3 className="text-xl font-semibold text-white flex items-center">
                          {item.ticker}
                          {hasData && data.isDip && (
                            <ExclamationTriangleIcon className="w-5 h-5 ml-2 text-red-400" title="Schnäppchen!" />
                          )}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Hinzugefügt: {new Date(item.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromWatchlist(item.id, item.ticker)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition"
                      title="Aus Watchlist entfernen"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Stock Data */}
                  {hasData ? (
                    <div className="space-y-3">
                      {/* Aktueller Preis und Change */}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-white">
                          ${data.price.toFixed(2)}
                        </span>
                        <div className={`flex items-center space-x-1 ${
                          data.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {data.change >= 0 ? (
                            <ArrowTrendingUpIcon className="w-4 h-4" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-4 h-4" />
                          )}
                          <span className="font-medium">
                            {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* 52-Week High/Low und Dip Info */}
                      <div className="space-y-2">
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
                          <div className="p-2 bg-red-900/30 border border-red-500/50 rounded-lg">
                            <p className="text-red-300 text-sm font-medium">
                              🔥 SCHNÄPPCHEN ALERT: {Math.abs(data.dipPercent).toFixed(1)}% unter 52W High!
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      {dataLoading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      ) : (
                        <p className="text-gray-400 text-sm">Daten werden geladen...</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col space-y-2">
                    
                    <Link
                      href={`/analyse/${item.ticker.toLowerCase()}`}
                      className="w-full px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition text-center flex items-center justify-center space-x-2"
                    >
                      <ChartBarIcon className="w-4 h-4" />
                      <span>Analyse</span>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      {watchlistItems.length > 0 && (
        <div className="text-center">
          <p className="text-gray-400">
            {watchlistItems.length} {watchlistItems.length === 1 ? 'Aktie' : 'Aktien'} in deiner Watchlist
            {dipCount > 0 && (
              <span className="ml-2 text-red-400">
                • {dipCount} Schnäppchen entdeckt
              </span>
            )}
          </p>
        </div>
      )}
    </main>
  );
}