// src/components/WatchlistButton.tsx - MODERNISIERTE VERSION
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';

type Props = { 
  ticker: string;
  variant?: 'default' | 'compact';
};

export default function WatchlistButton({ ticker, variant = 'default' }: Props) {
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // ✅ Vereinfachte User-Prüfung (Layout garantiert bereits dass User eingeloggt ist)
  useEffect(() => {
    async function initWatchlist() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          
          // Prüfen ob Ticker bereits in Watchlist
          const { data, error } = await supabase
            .from('watchlists')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('ticker', ticker.toUpperCase())
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('[WatchlistButton] Watchlist-Check Error:', error);
            return;
          }

          setExists(!!data);
        }
      } catch (error) {
        console.error('[WatchlistButton] Init error:', error);
      }
    }

    initWatchlist();
  }, [ticker]);

  async function toggleWatchlist() {
    if (!userId) {
      console.warn('[WatchlistButton] No user ID available');
      return;
    }

    setLoading(true);

    try {
      if (exists) {
        // Entfernen aus Watchlist
        const { error } = await supabase
          .from('watchlists')
          .delete()
          .eq('user_id', userId)
          .eq('ticker', ticker.toUpperCase());

        if (error) {
          console.error('[WatchlistButton] Delete Error:', error);
          alert('Fehler beim Entfernen aus der Watchlist');
        } else {
          setExists(false);
        }
      } else {
        // Hinzufügen zur Watchlist
        const { error } = await supabase
          .from('watchlists')
          .insert({
            user_id: userId,
            ticker: ticker.toUpperCase(),
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('[WatchlistButton] Insert Error:', error);
          alert('Fehler beim Hinzufügen zur Watchlist');
        } else {
          setExists(true);
        }
      }
    } catch (error) {
      console.error('[WatchlistButton] Toggle error:', error);
    } finally {
      setLoading(false);
    }
  }

  // Kompakte Variante (nur Icon)
  if (variant === 'compact') {
    return (
      <button
        onClick={toggleWatchlist}
        disabled={loading || !userId}
        className={`group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 backdrop-blur-sm ${
          exists
            ? 'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 hover:border-green-500/50' 
            : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:bg-gray-700/50 hover:border-gray-600 hover:text-white'
        } ${loading || !userId ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : exists ? (
          <HeartSolid className="w-5 h-5" />
        ) : (
          <HeartOutline className="w-5 h-5" />
        )}
        
        {/* Tooltip */}
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          {exists ? 'Aus Watchlist entfernen' : 'Zur Watchlist hinzufügen'}
        </div>
      </button>
    );
  }

  // Standard Variante (mit Text)
  return (
    <button
      onClick={toggleWatchlist}
      disabled={loading || !userId}
      className={`group flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 backdrop-blur-sm ${
        exists
          ? 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 hover:border-green-500/40' 
          : 'bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600 hover:text-white'
      } ${loading || !userId ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span>Laden...</span>
        </>
      ) : exists ? (
        <>
          <HeartSolid className="w-4 h-4" />
          <span>In Watchlist</span>
        </>
      ) : (
        <>
          <HeartOutline className="w-4 h-4" />
          <span>Zur Watchlist</span>
        </>
      )}
    </button>
  );
}