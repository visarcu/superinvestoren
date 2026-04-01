// src/components/WatchlistButton.tsx - MODERNISIERTE VERSION
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { HeartIcon as HeartOutline, LockClosedIcon } from '@heroicons/react/24/outline';

const FREE_WATCHLIST_LIMIT = 5;

type Props = { 
  ticker: string;
  variant?: 'default' | 'compact';
};

export default function WatchlistButton({ ticker, variant = 'default' }: Props) {
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function initWatchlist() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);

          const [tickerRes, countRes, profileRes] = await Promise.all([
            supabase.from('watchlists').select('id').eq('user_id', session.user.id).eq('ticker', ticker.toUpperCase()).maybeSingle(),
            supabase.from('watchlists').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
            supabase.from('profiles').select('is_premium').eq('user_id', session.user.id).maybeSingle(),
          ]);

          setExists(!!tickerRes.data);
          setWatchlistCount(countRes.count ?? 0);
          setIsPremium(profileRes.data?.is_premium ?? false);
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
        // Limit-Check für Free User
        if (!isPremium && watchlistCount >= FREE_WATCHLIST_LIMIT) {
          router.push('/pricing');
          return;
        }

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
        } else {
          setExists(true);
          setWatchlistCount(c => c + 1);
        }
      }
    } catch (error) {
      console.error('[WatchlistButton] Toggle error:', error);
    } finally {
      setLoading(false);
    }
  }

  const limitReached = !isPremium && !exists && watchlistCount >= FREE_WATCHLIST_LIMIT;

  // Kompakte Variante (nur Icon)
  if (variant === 'compact') {
    return (
      <button
        onClick={toggleWatchlist}
        disabled={loading || !userId}
        className={`group relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 backdrop-blur-sm ${
          exists
            ? 'bg-brand/20 border border-green-500/30 text-brand-light hover:bg-brand/30 hover:border-green-500/50'
            : limitReached
            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
            : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:bg-gray-700/50 hover:border-gray-600 hover:text-white'
        } ${loading || !userId ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : exists ? (
          <HeartSolid className="w-5 h-5" />
        ) : limitReached ? (
          <LockClosedIcon className="w-4 h-4" />
        ) : (
          <HeartOutline className="w-5 h-5" />
        )}

        {/* Tooltip */}
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          {exists ? 'Aus Watchlist entfernen' : limitReached ? 'Limit erreicht – Upgrade auf Premium' : 'Zur Watchlist hinzufügen'}
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
          ? 'bg-brand/10 border border-brand/20 text-brand-light hover:bg-brand/20 hover:border-green-500/40'
          : limitReached
          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
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
      ) : limitReached ? (
        <>
          <LockClosedIcon className="w-4 h-4" />
          <span>Watchlist voll – Upgrade</span>
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