// src/components/AuthButton.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AuthButton() {
  // State, um Session‐Daten zwischenzuspeichern
  const [user, setUser] = useState<null | { id: string; email: string }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Beim ersten Render: Supabase‐Session holen
    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("[AuthButton] Fehler beim Laden der Session:", error.message);
      } 
      
      // Falls session existiert, speichern wir nur Benutzer‐ID und E-Mail zur Anzeige
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" });
      } else {
        setUser(null);
      }

      setLoading(false);
    }

    loadSession();

    // 2) Supabase Auth‐Listener registrieren, damit sich der Button sofort aktualisiert,
    //    wenn sich der Nutzer ein- oder ausloggt (z. B. in einem anderen Tab).
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" });
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 3) Funktion, um den Nutzer abzumelden
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[AuthButton] Fehler beim Abmelden:", error.message);
    }
    // Die onAuthStateChange‐Listener in useEffect() setzen `user` bereits automatisch auf null
    // – wir müssen hier also nicht explizit setUser(null) aufrufen.
  }

  // 4) Während wir noch auf Supabase warten, nichts anzeigen
  if (loading) {
    return null;
  }

  // 5) Wenn ein User eingeloggt ist, zeigen wir „Abmelden“-Button, sonst Link zu /auth/signin
  return user ? (
    <button
      onClick={handleSignOut}
      className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Abmelden
    </button>
  ) : (
    <Link
      href="/auth/signin"
      className="ml-4 px-4 py-2 bg-accent text-black rounded hover:bg-accent/90"
    >
      Anmelden
    </Link>
  );
}