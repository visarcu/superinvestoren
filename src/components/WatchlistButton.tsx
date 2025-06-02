// src/components/WatchlistButton.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase }          from '@/lib/supabaseClient';
import { CheckIcon, LockClosedIcon } from '@heroicons/react/24/solid';

type Props = { ticker: string };

export default function WatchlistButton({ ticker }: Props) {
  const [exists, setExists]   = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function check() {
      // 1) Session + User asynchron holen
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[WatchlistButton] Supabase Session-Error:', sessionError);
        return;
      }
      const user = sessionData.session?.user;
      if (!user) {
        // nicht eingeloggt → gar nichts abfragen
        return;
      }

      // 2) Abfrage in Tabelle "watchlists", ob schon vorhanden
      const { data, error } = await supabase
        .from('watchlists')      // das ist die Supabase‐Tabelle, die Du manuell angelegt hast
        .select('id')
        .eq('user_id', user.id)
        .eq('ticker', ticker)
        .single();

      // PGRST116 heißt: „keine Zeile gefunden“
      if (error && error.code === 'PGRST116') {
        setExists(false);
      } else if (data) {
        setExists(true);
      }
    }

    check();
  }, [ticker]);

  async function toggleWatchlist() {
    // 1) Session + User asynchron holen
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[WatchlistButton] Supabase Session-Error:', sessionError);
      return;
    }
    const user = sessionData.session?.user;
    if (!user) {
      alert('Bitte einloggen, um Watchlist zu nutzen.');
      return;
    }

    setLoading(true);

    if (exists) {
      // 2a) Wenn Eintrag bereits existiert, löschen
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('user_id', user.id)
        .eq('ticker', ticker);

      if (error) {
        console.error('[WatchlistButton] Supabase Delete-Error:', error);
      } else {
        setExists(false);
      }
    } else {
      // 2b) Neues Watchlist‐Item einfügen
      const { error } = await supabase
        .from('watchlists')
        .insert({ user_id: user.id, ticker });

      if (error) {
        console.error('[WatchlistButton] Supabase Insert-Error:', error);
      } else {
        setExists(true);
      }
    }

    setLoading(false);
  }

  return (
    <button
      onClick={toggleWatchlist}
      disabled={loading}
      className={`flex items-center space-x-2 px-4 py-2 rounded ${
        exists ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-200'
      }`}
    >
      {exists ? (
        <>
          <CheckIcon className="w-5 h-5" />
          <span>In Watchlist</span>
        </>
      ) : (
        <>
          <LockClosedIcon className="w-5 h-5" />
          <span>Zur Watchlist hinzufügen</span>
        </>
      )}
    </button>
  );
}