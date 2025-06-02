// src/hooks/useWatchlist.ts
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export function useWatchlist(ticker: string) {
  const [inWatchlist, setInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1) Wir brauchen eine async‐Hilfsfunktion, weil wir `await` nutzen wollen:
  async function checkIfInWatchlist(userId: string) {
    // Anfrage an Supabase: existiert schon ein Eintrag in "watchlists", der zu userId gehört?
    const { data, error } = await supabase
      .from("watchlists")
      .select("id") // Wir brauchen nur einen Nachweis, dass es existiert
      .eq("user_id", userId)
      .eq("ticker", ticker)
      .limit(1)
      .maybeSingle(); // .maybeSingle() statt .single(), damit `data` undefined wird anstatt Fehler

    if (error) {
      console.error("[useWatchlist] DB-Fehler beim Prüfen:", error.message);
      setInWatchlist(false);
      return;
    }
    setInWatchlist(!!data);
  }

  useEffect(() => {
    // 2) Nun definieren wir, was passieren soll, wenn der Hook gemountet/aufgerufen wird:
    async function init() {
      // a) Session/Benutzer abrufen
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr) {
        console.error("[useWatchlist] Fehler bei getSession:", sessionErr.message);
        setInWatchlist(false);
        setLoading(false);
        return;
      }

      const user = session?.user;
      if (!user) {
        // Wenn kein User eingeloggt, direkt abbrechen
        setInWatchlist(false);
        setLoading(false);
        return;
      }

      // b) Falls eingeloggt, prüfen, ob der Ticker in der Watchlist sitzt
      await checkIfInWatchlist(user.id);
      setLoading(false);
    }

    // c) init() aufrufen
    init();
    // Hinweis: wir übergeben [ticker] nur, falls du bei Ticker‐Änderungen neu prüfen willst
  }, [ticker]);

  // 3) Für das Hinzufügen/Entfernen definieren wir eine eigene async‐Funktion:
  async function toggle() {
    setLoading(true);

    // a) Session abrufen, wie oben
    const {
      data: { session },
      error: sessionErr,
    } = await supabase.auth.getSession();

    if (sessionErr) {
      console.error("[useWatchlist] Fehler bei getSession (toggle):", sessionErr.message);
      setLoading(false);
      return;
    }
    const user = session?.user;
    if (!user) {
      // Wenn keiner eingeloggt, leiten wir direkt zur Loginseite um
      router.push("/auth/signin");
      return;
    }

    if (inWatchlist) {
      // b1) Falls der Ticker bereits in der Watchlist ist → DELETE
      const { error: delErr } = await supabase
        .from("watchlists")
        .delete()
        .eq("user_id", user.id)
        .eq("ticker", ticker);

      if (delErr) {
        console.error("[useWatchlist] Fehler beim Entfernen:", delErr.message);
      } else {
        setInWatchlist(false);
      }
    } else {
      // b2) Falls noch nicht in Watchlist → INSERT
      const { error: insErr } = await supabase.from("watchlists").insert({
        user_id: user.id,
        ticker,
      });

      if (insErr) {
        console.error("[useWatchlist] Fehler beim Einfügen:", insErr.message);
      } else {
        setInWatchlist(true);
      }
    }

    setLoading(false);
  }

  // 4) Hook‐Ergebnis: Boolean + toggle‐Funktion + Loading‐State
  return { inWatchlist, toggle, loading };
}