// src/app/pricing/page.tsx - OPTIMIERTE VERSION
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { usePremiumStatus } from "@/lib/premiumUtils";
import { Check, X, Star } from "lucide-react";

interface SupabaseUser {
  id: string;
  email: string;
}

export default function OptimizedPricingPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const router = useRouter();

  // Premium Status Hook
  const { premiumStatus, loading: premiumLoading } = usePremiumStatus(user?.id || null);

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

  const features = {
    free: [
      { name: 'Basis-Aktieninformationen', included: true },
      { name: 'Einfache Charts (1 Jahr)', included: true },
      { name: 'Bis zu 5 Watchlist-Einträge', included: true },
      { name: '5 kostenlose Analysen pro Monat', included: true },
      { name: 'Community Support', included: true },
      { name: 'Erweiterte Kennzahlen', included: false },
      { name: 'Interaktive Charts', included: false },
      { name: 'Historische Daten (154 Jahre)', included: false },
      { name: 'Super-Investor Portfolios', included: false },
      { name: 'Unbegrenzte Watchlist', included: false },
      { name: 'Unbegrenzte Analysen', included: false },
      { name: 'API-Zugang', included: false },
      { name: 'Priority Support', included: false }
    ],
    premium: [
      { name: 'Alle Free Features', included: true },
      { name: 'Erweiterte Kennzahlen & Ratios', included: true },
      { name: 'Interaktive & anpassbare Charts', included: true },
      { name: 'Historische Daten (154 Jahre)', included: true },
      { name: 'Super-Investor Portfolios & Trades', included: true, highlight: true },
      { name: 'Unbegrenzte Watchlist-Einträge', included: true },
      { name: 'Unbegrenzte Analysen', included: true },
      { name: 'API-Zugang (Rate-Limited)', included: true },
      { name: 'Priority Email Support', included: true }
    ]
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 noise-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const isPremium = premiumStatus.isPremium;

  return (
    <div className="min-h-screen bg-gray-950 noise-bg">
      {/* Hero Section */}
      <div className="bg-gray-950 noise-bg pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            {isPremium ? (
              <>
                <h1 className="text-6xl font-bold text-white tracking-tight">Premium aktiv! 🎉</h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                  Vielen Dank für dein Vertrauen! Du hast Zugang zu allen Premium-Features.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                  Wähle den richtigen Plan
                </h1>
                <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                  Transparente Preise. Keine versteckten Kosten. Jederzeit kündbar.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        
        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Free Plan */}
          <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-8 backdrop-blur-sm">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-white mb-2">
                Free Lunch
              </h3>
              <p className="text-gray-500 text-sm mb-6">Depots der Superinvestoren und mehr</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-white numeric">0</span>
                <span className="text-xl text-gray-400">€</span>
              </div>
              <p className="text-gray-500 text-sm">
                Für immer kostenlos
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {features.free.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  {feature.included ? (
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-gray-700 flex-shrink-0 mt-0.5" />
                  )}
                  <span className={`text-sm ${
                    feature.included 
                      ? 'text-gray-300' 
                      : 'text-gray-700'
                  }`}>
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>

            <button 
              className="w-full py-3 px-4 bg-gray-800 text-gray-500 font-medium rounded-lg cursor-not-allowed text-sm border border-gray-800"
              disabled
            >
              {user ? 'Aktueller Plan' : 'Kostenlos starten'}
            </button>
          </div>

          {/* Premium Plan */}
          <div className="premium-gradient border-2 border-green-500/30 rounded-lg p-8 relative green-glow">
            {/* Popular Badge */}
            {!isPremium && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-green-500 text-black px-4 py-1 rounded-md text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  BELIEBT
                </div>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-white mb-2">
                Premium {isPremium && '✓'}
              </h3>
              <p className="text-gray-400 text-sm mb-6">Deine Investment-Zentrale</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold text-white numeric">9</span>
                <span className="text-xl text-gray-400">€</span>
                <span className="text-sm text-gray-500 ml-1">/Monat</span>
              </div>
              <p className="text-gray-500 text-sm">
                Jederzeit kündbar
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {features.premium.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className={`text-sm ${
                    feature.highlight 
                      ? 'text-green-300 font-medium' 
                      : 'text-gray-300'
                  }`}>
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <div className="space-y-3">
                <div className="w-full py-3 px-4 bg-green-500 text-black font-medium rounded-lg text-center text-sm">
                  Aktiv seit {premiumStatus.endDate ? new Date(premiumStatus.endDate).toLocaleDateString('de-DE') : 'Unbekannt'}
                </div>
                <Link
                  href="/profile"
                  className="block w-full py-3 px-4 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition text-center text-sm border border-gray-700"
                >
                  Abo verwalten
                </Link>
              </div>
            ) : user ? (
              <button
                onClick={handleStripeCheckout}
                disabled={checkoutLoading}
                className="w-full py-3 px-4 bg-green-500 text-black font-medium rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-sm"
              >
                {checkoutLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                ) : (
                  'Premium upgraden'
                )}
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="block w-full py-3 px-4 bg-green-500 text-black font-medium rounded-lg hover:bg-green-400 transition text-center text-sm"
              >
                Anmelden & Premium upgraden
              </Link>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-32 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-center text-white mb-12">
            Häufige Fragen
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="font-medium text-white mb-2 text-base">
                Kann ich jederzeit kündigen?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Ja, jederzeit ohne Kündigungsfrist. Du behältst Zugang bis zum Ende der Abrechnungsperiode.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-white mb-2 text-base">
                Sind meine Daten sicher?
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Ja, alle Zahlungen werden sicher über Stripe verarbeitet. Wir speichern keine Zahlungsdaten.
              </p>
            </div>
          </div>
        </div>

        {/* Premium User Quick Link */}
        {isPremium && (
          <div className="mt-20 text-center">
            <Link
              href="/profile"
              className="inline-flex items-center px-5 py-2 bg-green-500 text-black font-medium rounded-lg hover:bg-green-400 transition text-sm"
            >
              Abo verwalten
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}