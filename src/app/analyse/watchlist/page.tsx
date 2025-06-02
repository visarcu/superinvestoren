// src/app/analyse/watchlist/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function WatchlistPage() {
  // State für die Ticker‐Strings
  const [tickers, setTickers] = useState<string[]>([]);
  // State, um zu wissen, ob wir gerade laden
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Async‐Hilfsfunktion, um die Watchlist zu holen
    async function fetchWatchlist() {
      // 1) Aktuelle Session (und damit User) abrufen
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr) {
        console.error('[Watchlist] getSession Error:', sessionErr.message);
        setTickers([]);
        setLoading(false);
        return;
      }

      // 2) Falls es gar keine Session gibt (also niemand eingeloggt), leere Liste
      const user = session?.user;
      if (!user) {
        setTickers([]);
        setLoading(false);
        return;
      }

      // 3) User ist eingeloggt → watchlists‐Tabelle abfragen
      const { data, error: dbErr } = await supabase
        .from('watchlists')      // <-- Stelle sicher, dass deine Supabase-Tabelle wirklich so heißt
        .select('ticker')
        .eq('user_id', user.id); // 'user_id' ist der FK zum Supabase-Auth-User

      if (dbErr) {
        console.error('[Watchlist] Fehler beim Laden der Watchlist:', dbErr.message);
        setTickers([]);
      } else if (data) {
        // Aus jedem Objekt { ticker: string } nur den String extrahieren
        setTickers(data.map((row) => row.ticker));
      }

      setLoading(false);
    }

    fetchWatchlist();
  }, []); // leerer Dependency-Array → läuft nur einmal beim ersten Render

  // 4) Falls noch am Laden, zeige einen Ladehinweis
  if (loading) {
    return <p className="text-white">Lade Watchlist…</p>;
  }

  // 5) Falls keine Einträge gefunden, zeige passende Nachricht
  if (!tickers.length) {
    return <p className="text-white">Keine Watchlist‐Einträge. Füge welche hinzu!</p>;
  }

  // 6) Normalfall: Liste rendern
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-white mb-4">Deine Watchlist</h1>
      <ul className="space-y-2">
        {tickers.map((t) => (
          <li key={t}>
            <Link href={`/analyse/${t.toLowerCase()}`} className="text-blue-400 hover:underline">
              {t.toUpperCase()}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}