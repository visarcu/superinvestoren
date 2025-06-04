// src/hooks/useWatchlist.ts (Verbesserte Version)
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export function useWatchlist(ticker: string) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
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

        // Watchlist-Status prüfen
        const { data, error } = await supabase
          .from('watchlists')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('ticker', ticker.toUpperCase())
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('[useWatchlist] DB Error:', error.message);
        }

        setInWatchlist(!!data);
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
      router.push('/auth/signin');
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
        }
      }
    } catch (error) {
      console.error('[useWatchlist] Unexpected toggle error:', error);
    } finally {
      setLoading(false);
    }
  }

  return { inWatchlist, toggle, loading, user };
}