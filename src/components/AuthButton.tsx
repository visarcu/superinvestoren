// src/components/AuthButton.tsx - Safe Version
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AuthButton() {
  const [user, setUser] = useState<null | { 
    id: string; 
    email: string; 
  }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[AuthButton] Fehler beim Laden der Session:", error.message);
          setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser({ 
            id: session.user.id, 
            email: session.user.email || "" 
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("[AuthButton] Catch Error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ 
          id: session.user.id, 
          email: session.user.email || "" 
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="ml-4 px-4 py-2 bg-gray-600 text-white rounded">
        ...
      </div>
    );
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[AuthButton] Fehler beim Abmelden:", error.message);
      return;
    }
  }

  return user ? (
    <div className="flex items-center gap-4">
      <Link
        href="/profile"
        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
      >
        Profil
      </Link>
      <button
        onClick={handleSignOut}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Abmelden
      </button>
    </div>
  ) : (
    <Link
      href="/auth/signin"
      className="ml-4 px-4 py-2 bg-accent text-black rounded hover:bg-accent/90"
    >
      Anmelden
    </Link>
  );
}