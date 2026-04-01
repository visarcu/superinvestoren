// src/hooks/useWatchlist.ts (Verbesserte Version)
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

const FREE_WATCHLIST_LIMIT = 5;

export function useWatchlist(ticker: string) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        // Session abrufen
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        
        if (sessionErr) {
          console.error('[useWatchlist] Session Error:', sessionErr.message);
          setInWatchlist(false);
          setLoading(false);
          return;
        }

        if (!session?.user) {
          setUser(null);
          setInWatchlist(false);
          setLoading(false);
          return;
        }

        setUser(session.user);

        const [tickerRes, countRes, profileRes] = await Promise.all([
          supabase.from('watchlists').select('id').eq('user_id', session.user.id).eq('ticker', ticker.toUpperCase()).maybeSingle(),
          supabase.from('watchlists').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
          supabase.from('profiles').select('is_premium').eq('user_id', session.user.id).maybeSingle(),
        ]);

        setInWatchlist(!!tickerRes.data);
        setWatchlistCount(countRes.count ?? 0);
        setIsPremium(profileRes.data?.is_premium ?? false);
      } catch (error) {
        console.error('[useWatchlist] Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [ticker]);

  async function toggle() {
    if (!user) {
      router.replace('/auth/signin');
      return;
    }

    setLoading(true);

    try {
      if (inWatchlist) {
        // Entfernen
        const { error } = await supabase
          .from('watchlists')
          .delete()
          .eq('user_id', user.id)
          .eq('ticker', ticker.toUpperCase());

        if (error) {
          console.error('[useWatchlist] Remove Error:', error.message);
        } else {
          setInWatchlist(false);
        }
      } else {
        // Limit-Check für Free User
        if (!isPremium && watchlistCount >= FREE_WATCHLIST_LIMIT) {
          router.push('/pricing');
          return;
        }

        // Hinzufügen
        const { error } = await supabase
          .from('watchlists')
          .insert({
            user_id: user.id,
            ticker: ticker.toUpperCase(),
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('[useWatchlist] Add Error:', error.message);
        } else {
          setInWatchlist(true);
          setWatchlistCount(c => c + 1);
        }
      }
    } catch (error) {
      console.error('[useWatchlist] Unexpected toggle error:', error);
    } finally {
      setLoading(false);
    }
  }

  const limitReached = !isPremium && !inWatchlist && watchlistCount >= FREE_WATCHLIST_LIMIT;
  return { inWatchlist, toggle, loading, user, limitReached, watchlistCount, isPremium };
}