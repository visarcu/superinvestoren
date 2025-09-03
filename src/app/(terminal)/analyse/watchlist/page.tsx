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
  ArrowLeftIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  TableCellsIcon
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
  marketCap?: number;
  volume?: number;
  peRatio?: number;
  daysSinceATH?: number;
}

export default function WatchlistPage() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showOnlyDips, setShowOnlyDips] = useState(false);
  const [dipThreshold, setDipThreshold] = useState(10);
  const [viewMode, setViewMode] = useState<'cards' | 'compact' | 'table'>('table');
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
      // Use internal API endpoint for better reliability
      const res = await fetch(`/api/quotes?symbols=${tickers.join(',')}`);
      
      if (res.ok) {
        const quotes = await res.json();
        
        quotes.forEach((quote: any) => {
          if (quote) {
            const dipPercent = ((quote.price - quote.yearHigh) / quote.yearHigh) * 100;
            
            stockDataMap[quote.symbol] = {
              ticker: quote.symbol,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changesPercentage,
              week52High: quote.yearHigh,
              week52Low: quote.yearLow,
              dipPercent: dipPercent,
              isDip: dipPercent <= -dipThreshold,
              marketCap: quote.marketCap,
              volume: quote.volume,
              peRatio: quote.pe
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

  // German formatting functions
  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(1).replace('.', ',')} Bio. $`;
    if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(1).replace('.', ',')} Mrd. $`;
    if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(0)} Mio. $`;
    return `${marketCap.toLocaleString('de-DE')} $`;
  };

  const formatPrice = (price: number) => {
    return `${price.toFixed(2).replace('.', ',')} $`;
  };

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

        {/* Notification-Hinweis - NEU HINZUFÜGEN */}
        {watchlistItems.length > 0 && (
          <section>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  📧
                </div>
                <div className="flex-1">
                  <p className="text-theme-primary text-sm font-medium">
                    Du erhältst E-Mail-Benachrichtigungen bei Kursrückgängen deiner Watchlist-Aktien.
                  </p>
                </div>
                <Link
                  href="/notifications"
                  className="text-green-400 hover:text-green-300 text-sm font-medium underline transition-colors"
                >
                  Einstellungen
                </Link>
              </div>
            </div>
          </section>
        )}

        
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

                  {/* View Mode Toggles */}
                  <div className="flex bg-theme-secondary/20 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'table' 
                          ? 'bg-theme-card text-theme-primary shadow-sm' 
                          : 'text-theme-muted hover:text-theme-primary'
                      }`}
                      title="Tabelle"
                    >
                      <TableCellsIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('compact')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'compact' 
                          ? 'bg-theme-card text-theme-primary shadow-sm' 
                          : 'text-theme-muted hover:text-theme-primary'
                      }`}
                      title="Kompakt"
                    >
                      <ViewColumnsIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'cards' 
                          ? 'bg-theme-card text-theme-primary shadow-sm' 
                          : 'text-theme-muted hover:text-theme-primary'
                      }`}
                      title="Karten"
                    >
                      <Squares2X2Icon className="w-4 h-4" />
                    </button>
                  </div>
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
              
              {/* DYNAMIC VIEW MODES */}
              {viewMode === 'table' && (
                /* BLOOMBERG TERMINAL TABLE */
                <div className="bg-theme-card border border-theme/5 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-theme-secondary/20">
                        <tr className="text-left">
                          <th className="px-4 py-3 font-semibold text-theme-primary">Aktie</th>
                          <th className="px-4 py-3 font-semibold text-theme-primary text-right">Kurs</th>
                          <th className="px-4 py-3 font-semibold text-theme-primary text-right">Änderung</th>
                          <th className="px-4 py-3 font-semibold text-theme-primary text-right">52W High</th>
                          <th className="px-4 py-3 font-semibold text-theme-primary text-right">Max Drawdown</th>
                          <th className="px-4 py-3 font-semibold text-theme-primary text-right">Marktkapitalisierung</th>
                          <th className="px-4 py-3 font-semibold text-theme-primary text-right">P/E</th>
                          <th className="px-4 py-3 font-semibold text-theme-primary">Status</th>
                          <th className="px-4 py-3 font-semibold text-theme-primary"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => {
                          const data = stockData[item.ticker];
                          const hasData = !!data;
                          
                          return (
                            <tr key={item.id} className="border-t border-theme/5 hover:bg-theme-secondary/10 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <Logo ticker={item.ticker} alt={`${item.ticker} Logo`} className="w-8 h-8 rounded-lg" />
                                  <div>
                                    <div className="font-semibold text-theme-primary">{item.ticker}</div>
                                    <div className="text-xs text-theme-muted">
                                      {new Date(item.created_at).toLocaleDateString('de-DE')}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                {hasData ? (
                                  <div className="font-bold text-theme-primary">
                                    {formatPrice(data.price)}
                                  </div>
                                ) : (
                                  <div className="text-theme-muted">-</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {hasData ? (
                                  <div className={`inline-flex items-center gap-1 font-semibold ${
                                    data.change >= 0 ? 'text-green-500' : 'text-red-500'
                                  }`}>
                                    {data.change >= 0 ? '▲' : '▼'}
                                    {data.changePercent.toFixed(2)}%
                                  </div>
                                ) : (
                                  <div className="text-theme-muted">-</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-theme-secondary">
                                {hasData ? formatPrice(data.week52High) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {hasData ? (
                                  <div className={`font-semibold ${
                                    data.dipPercent <= -dipThreshold ? 'text-red-500' : 'text-theme-primary'
                                  }`}>
                                    {data.dipPercent.toFixed(1)}%
                                  </div>
                                ) : (
                                  <div className="text-theme-muted">-</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-theme-secondary">
                                {hasData && data.marketCap ? formatMarketCap(data.marketCap) : '-'}
                              </td>
                              <td className="px-4 py-3 text-right text-theme-secondary">
                                {hasData && data.peRatio ? data.peRatio.toFixed(1).replace('.', ',') : '-'}
                              </td>
                              <td className="px-4 py-3">
                                {hasData && data.isDip ? (
                                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded font-medium">
                                    Schnäppchen
                                  </span>
                                ) : hasData ? (
                                  <span className="px-2 py-1 bg-theme-secondary/20 text-theme-muted text-xs rounded">
                                    Normal
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/analyse/stocks/${item.ticker.toLowerCase()}`}
                                    className="p-1 text-theme-muted hover:text-theme-primary transition-colors"
                                    title="Analyse"
                                  >
                                    <ChartBarIcon className="w-4 h-4" />
                                  </Link>
                                  <button
                                    onClick={() => removeFromWatchlist(item.id, item.ticker)}
                                    className="p-1 text-theme-muted hover:text-red-500 transition-colors"
                                    title="Entfernen"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewMode === 'compact' && (
                /* COMPACT BLOOMBERG-STYLE GRID */
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredItems.map((item) => {
                    const data = stockData[item.ticker];
                    const hasData = !!data;
                    
                    return (
                      <div key={item.id} className={`bg-theme-card border rounded-xl p-4 hover:border-theme/10 transition-all ${
                        hasData && data.isDip ? 'bg-red-500/5 border-red-500/20' : 'border-theme/5'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Logo ticker={item.ticker} alt={`${item.ticker} Logo`} className="w-10 h-10 rounded-lg" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-theme-primary">{item.ticker}</h4>
                                {hasData && data.isDip && (
                                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                                )}
                              </div>
                              {hasData && (
                                <div className="text-lg font-bold text-theme-primary">
                                  {formatPrice(data.price)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {hasData && (
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-bold ${
                                data.change >= 0 
                                  ? 'text-green-500 bg-green-500/10' 
                                  : 'text-red-500 bg-red-500/10'
                              }`}>
                                {data.change >= 0 ? '▲' : '▼'}
                                {data.changePercent.toFixed(2)}%
                              </div>
                            )}
                            <div className="mt-1 text-xs text-theme-muted">
                              {hasData ? `Max DD: ${data.dipPercent.toFixed(1)}%` : 'Laden...'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-theme/10">
                          <div className="flex gap-4 text-xs text-theme-muted">
                            <span>52W: {hasData ? formatPrice(data.week52High) : '-'}</span>
                            {hasData && data.marketCap && (
                              <span>MCap: {formatMarketCap(data.marketCap)}</span>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Link
                              href={`/analyse/stocks/${item.ticker.toLowerCase()}`}
                              className="p-1 text-theme-muted hover:text-theme-primary transition-colors"
                            >
                              <ChartBarIcon className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => removeFromWatchlist(item.id, item.ticker)}
                              className="p-1 text-theme-muted hover:text-red-500 transition-colors"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {viewMode === 'cards' && (
                /* ORIGINAL LARGE CARDS */
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
                              {formatPrice(data.price)}
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
                              <span className="text-theme-primary font-medium">{formatPrice(data.week52High)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-theme-muted">52W Low:</span>
                              <span className="text-theme-primary font-medium">{formatPrice(data.week52Low)}</span>
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
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}