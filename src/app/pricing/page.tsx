// src/app/pricing/page.tsx - MODERNE STRIPE VERSION
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { usePremiumStatus } from "@/lib/premiumUtils";

interface SupabaseUser {
  id: string;
  email: string;
}

export default function PricingPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const router = useRouter();

  // Premium Status Hook
  const { premiumStatus, loading: premiumLoading, refetch } = usePremiumStatus(user?.id || null);

  // Auth & User laden
  useEffect(() => {
    async function loadUserData() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("[PricingPage] Session error:", error.message);
      }

      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || "",
        };
        setUser(userData);
      } else {
        setUser(null);
      }

      setLoading(false);
    }

    loadUserData();

    // Auth State Change Listener
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || "",
        };
        setUser(userData);
      } else {
        setUser(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Stripe Checkout starten
  async function handleStripeCheckout() {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    setCheckoutLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Keine gültige Session');
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          sessionToken: session.access_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Checkout failed');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      alert(`Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      setCheckoutLoading(false);
    }
  }

  if (loading || premiumLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
      {/* Hintergrund-Effekte */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-purple-600/25 rounded-full blur-2xl animate-[pulse_12s_ease-in-out_infinite]" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition">
              ← FinClue
            </Link>
            {user && (
              <Link href="/profile" className="text-gray-300 hover:text-white transition">
                Mein Profil
              </Link>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-6xl">
            
            {/* Wenn nicht eingeloggt */}
            {!user && (
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <h1 className="text-5xl font-bold text-white">Premium freischalten</h1>
                  <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                    Melde dich an und erhalte vollen Zugang zu allen Features für nur <span className="font-bold text-blue-400">9€ pro Monat</span>
                  </p>
                </div>
                
                <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-8 max-w-md mx-auto">
                  <div className="w-16 h-16 mx-auto mb-6 bg-blue-600/20 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-4">Anmeldung erforderlich</h2>
                  <p className="text-gray-300 mb-6">
                    Melde dich zuerst an, um Premium zu abonnieren.
                  </p>
                  <Link
                    href="/auth/signin"
                    className="block w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-center"
                  >
                    Jetzt anmelden
                  </Link>
                </div>
              </div>
            )}

            {/* Wenn eingeloggt */}
            {user && (
              <div className="space-y-12">
                
                {/* Header */}
                <div className="text-center space-y-4">
                  {premiumStatus.isPremium ? (
                    <>
                      <h1 className="text-5xl font-bold text-green-400">Premium aktiv! 🎉</h1>
                      <p className="text-xl text-gray-300">
                        Vielen Dank für dein Vertrauen! Du hast Zugang zu allen Premium-Features.
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-5xl font-bold text-white">Wähle deinen Plan</h1>
                      <p className="text-xl text-gray-300">
                        Sichere dir Premium-Features für nur <span className="font-bold text-blue-400">9€ pro Monat</span>
                      </p>
                    </>
                  )}
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                  
                  {/* Free Plan */}
                  <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-3xl p-8">
                    <div className="text-center space-y-6">
                      <div className="w-16 h-16 mx-auto bg-gray-600/20 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Free</h2>
                        <div className="text-3xl font-bold text-gray-400 mb-1">0€</div>
                        <p className="text-gray-500">pro Monat</p>
                      </div>
                      
                      <div className="space-y-3 text-left">
                        <div className="flex items-center space-x-3">
                          <span className="text-green-400">✓</span>
                          <span className="text-gray-300">Basis-Aktieninformationen</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-green-400">✓</span>
                          <span className="text-gray-300">Einfache Charts</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-red-400">✗</span>
                          <span className="text-gray-500">Erweiterte Kennzahlen</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-red-400">✗</span>
                          <span className="text-gray-500">Interaktive Charts</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-red-400">✗</span>
                          <span className="text-gray-500">Historische Daten</span>
                        </div>
                      </div>
                      
                      <button
                        disabled
                        className="w-full px-6 py-3 bg-gray-600 text-gray-400 font-semibold rounded-lg cursor-not-allowed"
                      >
                        Aktueller Plan
                      </button>
                    </div>
                  </div>

                  {/* Premium Plan */}
                  <div className={`backdrop-blur-xl border rounded-3xl p-8 relative ${
                    premiumStatus.isPremium 
                      ? 'bg-green-900/20 border-green-500/50' 
                      : 'bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/50'
                  }`}>
                    {/* "Beliebt" Badge */}
                    {!premiumStatus.isPremium && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                          Empfohlen
                        </span>
                      </div>
                    )}
                    
                    <div className="text-center space-y-6">
                      <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                        premiumStatus.isPremium 
                          ? 'bg-green-600/20' 
                          : 'bg-gradient-to-r from-blue-600/20 to-purple-600/20'
                      }`}>
                        <svg className={`w-8 h-8 ${
                          premiumStatus.isPremium ? 'text-green-400' : 'text-blue-400'
                        }`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      
                      <div>
                        <h2 className={`text-2xl font-bold mb-2 ${
                          premiumStatus.isPremium ? 'text-green-400' : 'text-white'
                        }`}>
                          Premium {premiumStatus.isPremium && '✓'}
                        </h2>
                        <div className={`text-4xl font-bold mb-1 ${
                          premiumStatus.isPremium ? 'text-green-400' : 'text-blue-400'
                        }`}>
                          9€
                        </div>
                        <p className="text-gray-400">pro Monat</p>
                      </div>
                      
                      <div className="space-y-3 text-left">
                        <div className="flex items-center space-x-3">
                          <span className="text-green-400">✓</span>
                          <span className="text-gray-200">Alle Basis-Features</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-green-400">✓</span>
                          <span className="text-gray-200">Erweiterte Kennzahlen</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-green-400">✓</span>
                          <span className="text-gray-200">Interaktive Charts</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-green-400">✓</span>
                          <span className="text-gray-200">Historische Daten (154 Jahre)</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-green-400">✓</span>
                          <span className="text-gray-200">Keine Werbung</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-green-400">✓</span>
                          <span className="text-gray-200">Priority Support</span>
                        </div>
                      </div>
                      
                      {premiumStatus.isPremium ? (
                        <div className="space-y-3">
                          <div className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg">
                            Aktiv seit {premiumStatus.endDate ? new Date(premiumStatus.endDate).toLocaleDateString('de-DE') : 'Unbekannt'}
                          </div>
                          <Link
                            href="/profile"
                            className="block w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition text-center"
                          >
                            Abo verwalten
                          </Link>
                        </div>
                      ) : (
                        <button
                          onClick={handleStripeCheckout}
                          disabled={checkoutLoading}
                          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                        >
                          {checkoutLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Jetzt upgraden
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* FAQ / Info Sektion */}
                <div className="max-w-4xl mx-auto space-y-8">
                  
                  {/* Wie funktioniert es? */}
                  <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-2xl p-8">
                    <h3 className="text-2xl font-semibold text-white mb-6 text-center">Wie funktioniert es?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 mx-auto bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-lg">1</div>
                        <h4 className="font-semibold text-white">Plan wählen</h4>
                        <p className="text-sm text-gray-300">Klicke auf "Jetzt upgraden"</p>
                      </div>
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 mx-auto bg-green-600/20 rounded-full flex items-center justify-center text-green-400 font-bold text-lg">2</div>
                        <h4 className="font-semibold text-white">Sicher bezahlen</h4>
                        <p className="text-sm text-gray-300">Über Stripe (Kreditkarte, SEPA)</p>
                      </div>
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 mx-auto bg-purple-600/20 rounded-full flex items-center justify-center text-purple-400 font-bold text-lg">3</div>
                        <h4 className="font-semibold text-white">Sofort aktiviert</h4>
                        <p className="text-sm text-gray-300">Features werden automatisch freigeschaltet</p>
                      </div>
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 mx-auto bg-orange-600/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-lg">4</div>
                        <h4 className="font-semibold text-white">Jederzeit kündbar</h4>
                        <p className="text-sm text-gray-300">Keine Mindestlaufzeit</p>
                      </div>
                    </div>
                  </div>

                  {/* Häufige Fragen */}
                  <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-2xl p-8">
                    <h3 className="text-2xl font-semibold text-white mb-6 text-center">Häufige Fragen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-white mb-2">💳 Welche Zahlungsmethoden?</h4>
                        <p className="text-sm text-gray-300">Kreditkarte, SEPA-Lastschrift, Apple Pay, Google Pay - alles über Stripe verarbeitet.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-2">🔒 Sind meine Daten sicher?</h4>
                        <p className="text-sm text-gray-300">Ja! Alle Zahlungen werden sicher über Stripe abgewickelt. Wir speichern keine Zahlungsdaten.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-2">⏰ Kann ich jederzeit kündigen?</h4>
                        <p className="text-sm text-gray-300">Ja, jederzeit ohne Kündigungsfrist. Du behältst Zugang bis zum Ende der Abrechnungsperiode.</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-2">🚀 Wann werden Features aktiviert?</h4>
                        <p className="text-sm text-gray-300">Sofort nach erfolgreicher Zahlung. Keine Wartezeit!</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Links für Premium User */}
                {premiumStatus.isPremium && (
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-green-900/20 border border-green-500/50 rounded-2xl p-6">
                      <h3 className="text-lg font-semibold text-green-400 mb-4 text-center">🎉 Premium ist aktiv!</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Link
                          href="/analyse"
                          className="block p-4 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition text-center text-blue-300"
                        >
                          📊 Zur Aktien-Analyse
                        </Link>
                        <Link
                          href="/profile"
                          className="block p-4 bg-gray-700/50 hover:bg-gray-700/70 rounded-lg transition text-center text-white"
                        >
                          ⚙️ Abo verwalten
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}