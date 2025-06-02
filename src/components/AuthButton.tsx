// src/components/AuthButton.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AuthButton() {
  const [user, setUser] = useState<null | { id: string; email: string }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Beim ersten Render: Supabase-Session holen
    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("[AuthButton] Fehler beim Laden der Session:", error.message);
        setUser(null);
        setLoading(false);
        return;
      }
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" });
      } else {
        setUser(null);
      }
      setLoading(false);
    }

    loadSession();

    // 2) Auth-State-Listener
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" });
      } else {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 3) Wenn noch laden, nichts anzeigen
  if (loading) {
    return null;
  }

  // 4) Wenn eingeloggt → Abmelden-Button, sonst Link zu /auth/signin
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[AuthButton] Fehler beim Abmelden:", error.message);
      return;
    }
    // Session‐Listener setzt user automatisch auf null, wir müssen nicht explizit setUser(null)
  }

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