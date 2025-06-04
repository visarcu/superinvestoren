// src/components/WatchlistButton.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { HeartIcon as HeartSolid, PlusIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';

type Props = { ticker: string };

export default function WatchlistButton({ ticker }: Props) {
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function checkUserAndWatchlist() {
      try {
        // 1) Session + User holen
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('[WatchlistButton] Session-Error:', sessionError);
          return;
        }

        const currentUser = sessionData.session?.user;
        // Nach const currentUser = sessionData.session?.user;
console.log('[WatchlistButton] Full session data:', sessionData);
console.log('[WatchlistButton] User object:', currentUser);
console.log('[WatchlistButton] User ID:', currentUser?.id);
console.log('[WatchlistButton] User role:', currentUser?.role);
        if (!currentUser) {
          setUser(null);
          return;
        }

        setUser(currentUser);

        // 2) Prüfen ob Ticker bereits in Watchlist
        const { data, error } = await supabase
          .from('watchlists')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('ticker', ticker.toUpperCase())
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('[WatchlistButton] Watchlist-Check Error:', error);
          return;
        }

        setExists(!!data);
      } catch (error) {
        console.error('[WatchlistButton] Unexpected error:', error);
      }
    }

    checkUserAndWatchlist();
  }, [ticker]);

  async function toggleWatchlist() {
    if (!user) {
      alert('Bitte melde dich an, um die Watchlist zu nutzen.');
      return;
    }

    setLoading(true);

    try {
      if (exists) {
        // Entfernen aus Watchlist
        const { error } = await supabase
          .from('watchlists')
          .delete()
          .eq('user_id', user.id)
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
            user_id: user.id,
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
      console.error('[WatchlistButton] Unexpected toggle error:', error);
    } finally {
      setLoading(false);
    }
  }

  // Wenn User nicht eingeloggt
  if (!user) {
    return (
      <button
        onClick={() => alert('Bitte melde dich an, um die Watchlist zu nutzen.')}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition"
      >
        <HeartOutline className="w-5 h-5" />
        <span>Zur Watchlist</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleWatchlist}
      disabled={loading}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
        exists
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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



