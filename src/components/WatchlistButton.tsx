// src/components/WatchlistButton.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';

type Props = { ticker: string };

export default function WatchlistButton({ ticker }: Props) {
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

  // Da Layout bereits Auth sicherstellt, können wir immer den Button zeigen
  return (
    <button
      onClick={toggleWatchlist}
      disabled={loading || !userId}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
        exists
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
      } ${loading || !userId ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>...</span>
        </>
      ) : exists ? (
        <>
          <HeartSolid className="w-5 h-5" />
          <span>In Watchlist</span>
        </>
      ) : (
        <>
          <HeartOutline className="w-5 h-5" />
          <span>Zur Watchlist</span>
        </>
      )}
    </button>
  );
}