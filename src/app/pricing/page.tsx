// src/app/pricing/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface SupabaseUser {
  id: string;
  email: string;
  // ggf. weitere Felder, die du benötigst
}

export default function PricingPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 1) Supabase‐Session laden und Auth‐Listener registrieren
  useEffect(() => {
    // Hilfsfunktion, um beim Initial‐Render die aktuelle Session zu laden
    async function loadSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("[PricingPage] Fehler beim Laden der Session:", error.message);
      }

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
      } else {
        setUser(null);
      }

      setLoading(false);
    }

    loadSession();

    // Listener, um Auth‐State‐Changes (SIGNED_IN, SIGNED_OUT) mitzubekommen
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 2) Funktion, um beim Klick auf „Jetzt Premium freischalten“ zum Stripe‐Checkout zu navigieren
  async function handleUpgrade() {
    if (!user) {
      // Falls aus irgendeinem Grund kein User vorhanden ist, zurück auf Login
      router.push("/auth/signin");
      return;
    }

    // POST‐Request an deine eigene /api/stripe/checkout‐Route
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email }),
    });

    if (!res.ok) {
      console.error("[PricingPage] Fehler beim Anfordern der Checkout‐URL:", await res.text());
      return;
    }

    const { url } = await res.json();
    if (url) {
      window.location.href = url;
    } else {
      console.error("[PricingPage] Checkout‐URL ist leer");
    }
  }

  // 3) Solange wir laden, geben wir null oder einen Ladeindikator zurück
  if (loading) {
    return null; // oder z.B. <p>…lädt…</p>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden p-6">
      {/* Hintergrund-Kreise */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-accent/25 rounded-full blur-2xl animate-[pulse_12s_ease-in-out_infinite]" />

      <div className="relative z-10 w-full max-w-3xl grid grid-cols-1 gap-12">
        {/* 4) Falls kein eingeloggter User, zeige Login‐Aufforderung */}
        {!user && (
          <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-8 text-center space-y-6">
            <p className="text-gray-100 text-lg">
              Bitte melde dich zuerst an, um Premium freizuschalten.
            </p>
            <Link
              href="/auth/signin"
              className="inline-block px-6 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent/90 transition"
            >
              Anmelden
            </Link>
          </div>
        )}

        {/* 5) Falls eingeloggt, zeige Pricing‐Details + Button */}
        {user && (
          <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-10 space-y-6 text-center">
            <h1 className="text-3xl font-bold text-white">Upgrade auf Premium</h1>
            <p className="text-gray-300">
              Sichere dir vollen Zugriff auf alle Funktionen für nur{" "}
              <span className="font-semibold text-white">9 € / Monat</span>.
            </p>

            <ul className="text-left max-w-md mx-auto space-y-4 text-gray-200">
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-green-400">✓</span>
                Interaktive Charts & Zeitraumauswahl
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-green-400">✓</span>
                Erweiterte Kennzahlen (Quartal, Wachstum, Segmente)
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-green-400">✓</span>
                Unbegrenzte historische Daten (bis 154 Jahre)
              </li>
              <li className="flex items-start">
                <span className="inline-block mt-1 mr-3 text-green-400">✓</span>
                Exklusive Premium-Filter & Alerts
              </li>
            </ul>

            <button
              onClick={handleUpgrade}
              className="w-full mt-4 px-6 py-3 bg-accent text-black font-semibold rounded-lg hover:bg-accent/90 transition"
            >
              Jetzt Premium freischalten
            </button>

            <p className="text-sm text-gray-400">
              Bereits Premium?{" "}
              <button
                onClick={() => router.push("/profile")}
                className="text-accent hover:underline"
              >
                Zu meinem Profil
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}