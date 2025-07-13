// src/app/pricing/page.tsx - FIXED: Button Text + Badge Position
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { usePremiumStatus } from "@/lib/premiumUtils";
import { Check, X, Star, Sparkles } from "lucide-react";

interface SupabaseUser {
  id: string;
  email: string;
}

export default function ImprovedPricingPage() {
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
      { name: 'Super-Investor Portfolios', included: true },
      { name: 'Erweiterte Kennzahlen', included: false },
      { name: 'Interaktive Charts', included: false },
      { name: 'Historische Daten (154 Jahre)', included: false },
      { name: 'Unbegrenzte Watchlist', included: false },
      { name: 'Unbegrenzte Analysen', included: false },
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
      { name: 'Finclue AI (Rate-Limited)', included: true },
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
      
      {/* 🎯 HOMEPAGE-KONSISTENTE Hero Section */}
      <div className="bg-gray-950 noise-bg pt-32 pb-20 relative overflow-hidden">
        
        {/* 🌟 Gleiche Background Glows wie Homepage */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/3 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-0 w-[600px] h-[300px] bg-green-500/2 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center space-y-8">
            {isPremium ? (
              <>
                <div className="space-y-4">
                  <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
                    Premium aktiv!
                  </h1>
                  <h2 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                    <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                      Du bist dabei 🚀
                    </span>
                  </h2>
                </div>
                <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                  Vielen Dank für dein Vertrauen! Du hast jetzt Zugang zu allen Premium-Features und der vollen Power von FinClue.
                </p>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight">
                    Wähle deinen Plan
                  </h1>
                  <h2 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                    <span className="bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                      Starte heute
                    </span>
                  </h2>
                </div>
                <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                  Transparente Preise. Keine versteckten Kosten. 14 Tage kostenlos testen. Jederzeit kündbar.
                </p>
              </>
            )}

            {/* 🎯 CTA Buttons wie auf Homepage - FIXED BUTTON TEXT */}
            {!isPremium && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="#pricing"
                  className="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/25"
                >
                  14 Tage gratis testen
                </Link>
                <Link
                  href="/analyse"
                  className="px-6 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition border border-gray-700"
                >
                  Bei Basic bleiben
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🎯 HOMEPAGE-KONSISTENTE Platform Preview */}
      <div className="bg-gray-950 noise-bg py-20 border-t border-gray-800/50" id="pricing">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* 🌟 Stats Grid wie auf Homepage */}
          <div className="grid grid-cols-3 gap-8 text-center mb-20">
            <div className="p-4">
              <div className="text-3xl font-bold text-white numeric mb-1">14</div>
              <div className="text-xs text-gray-500">Tage kostenlos</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-white numeric mb-1">9€</div>
              <div className="text-xs text-gray-500">Pro Monat</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-white numeric mb-1">154</div>
              <div className="text-xs text-gray-500">Jahre Daten</div>
            </div>
          </div>

          {/* 🎯 VERBESSERTE Pricing Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 🌟 Free Plan - Homepage Style */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-8 backdrop-blur-sm relative">
              <div className="absolute inset-0 bg-gray-500/2 rounded-xl blur-xl -z-10"></div>
              
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <span className="text-gray-300 font-bold">💝</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Free Lunch</h3>
                    <p className="text-gray-400 text-sm">Für immer kostenlos</p>
                  </div>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {features.free.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    {feature.included ? (
                      <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-green-400" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-gray-700/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <X className="w-3 h-3 text-gray-500" />
                      </div>
                    )}
                    <span className={`text-sm ${
                      feature.included 
                        ? 'text-gray-300' 
                        : 'text-gray-500'
                    }`}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              <button 
                className="w-full py-3 px-4 bg-gray-800/50 text-gray-400 font-medium rounded-lg cursor-not-allowed text-sm border border-gray-700"
                disabled
              >
                {user ? 'Aktueller Plan' : 'Kostenlos starten'}
              </button>
            </div>

            {/* 🌟 Premium Plan - FIXED BADGE POSITION */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-8 relative overflow-hidden pt-16">
              
              {/* 🌟 Premium Glow Effects wie Homepage */}
              <div className="absolute inset-0 bg-green-500/5 rounded-xl blur-xl -z-10"></div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl"></div>
              
              {/* 🌟 Popular Badge - FIXED POSITION */}
              {!isPremium && (
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-green-500 text-black px-4 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
                    <Star className="w-3 h-3" />
                    BELIEBT
                  </div>
                </div>
              )}

              <div className="mb-8 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-400 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      Premium {isPremium && '✓'}
                    </h3>
                    <p className="text-gray-300 text-sm">Deine Investment-Zentrale</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white numeric">9</span>
                    <span className="text-xl text-gray-300">€</span>
                    <span className="text-sm text-gray-400 ml-1">/Monat</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Erste 14 Tage kostenlos • Dann 9€/Monat • Jederzeit kündbar
                  </p>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {features.premium.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-green-400" />
                    </div>
                    <span className={`text-sm ${
                      feature.highlight 
                        ? 'text-green-400 font-medium' 
                        : 'text-gray-300'
                    }`}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>

              {/* 🌟 CTA Buttons - Homepage Style */}
              {isPremium ? (
                <div className="space-y-3">
                  <div className="w-full py-3 px-4 bg-green-500 text-black font-semibold rounded-lg text-center text-sm">
                    ✓ Aktiv seit {premiumStatus.endDate ? new Date(premiumStatus.endDate).toLocaleDateString('de-DE') : 'Unbekannt'}
                  </div>
                  <Link
                    href="/profile"
                    className="block w-full py-3 px-4 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition text-center text-sm border border-gray-700"
                  >
                    Abo verwalten
                  </Link>
                </div>
              ) : user ? (
                <button
                  onClick={handleStripeCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-3 px-4 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm hover:scale-105 shadow-lg hover:shadow-green-500/25"
                >
                  {checkoutLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  ) : (
                    '14 Tage kostenlos testen'
                  )}
                </button>
              ) : (
                <Link
                  href="/auth/signin"
                  className="block w-full py-3 px-4 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-all duration-200 text-center text-sm hover:scale-105 shadow-lg hover:shadow-green-500/25"
                >
                  Anmelden & Premium upgraden
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 HOMEPAGE-KONSISTENTE FAQ Section */}
      <section className="bg-gray-950 noise-bg py-24 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <span>FAQ</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
              Häufige
              <span className="block bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                Fragen
              </span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* FAQ Cards - Homepage Style */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-white mb-3 text-lg">
                Kann ich jederzeit kündigen?
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Ja, absolut! Du kannst jederzeit ohne Kündigungsfrist kündigen. Du behältst Zugang zu allen Premium-Features bis zum Ende deiner Abrechnungsperiode.
              </p>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-white mb-3 text-lg">
                Sind meine Daten sicher?
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Ja, definitiv! Alle Zahlungen werden sicher über Stripe verarbeitet. Wir speichern keine Kreditkarten-Daten und sind DSGVO-konform.
              </p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-white mb-3 text-lg">
                Was passiert nach der Testphase?
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Nach 14 Tagen kostenlosem Testen wird automatisch das monatliche Abo für 9€ aktiviert. Du kannst jederzeit vorher kündigen - ohne Kosten.
              </p>
            </div>
            
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="font-semibold text-white mb-3 text-lg">
                Welche Zahlungsmethoden akzeptiert ihr?
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Wir akzeptieren alle gängigen Kreditkarten, SEPA-Lastschrift und weitere Zahlungsmethoden über unseren Partner Stripe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🎯 HOMEPAGE-KONSISTENTE Bottom CTA - FIXED BUTTON TEXT */}
      {!isPremium && (
        <section className="bg-gray-950 noise-bg py-24 border-t border-gray-800/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Background Glow */}
            <div className="absolute left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-500/3 rounded-full blur-3xl"></div>
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                Bereit für bessere
                <span className="block bg-gradient-to-r from-green-400 to-green-300 bg-clip-text text-transparent">
                  Investment-Entscheidungen?
                </span>
              </h2>
              
              <p className="text-xl text-gray-400 leading-relaxed mb-8 max-w-2xl mx-auto">
                Starte noch heute mit der 14-tägigen kostenlosen Testphase und entdecke alle Premium-Features.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {user ? (
                  <button
                    onClick={handleStripeCheckout}
                    disabled={checkoutLoading}
                    className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        Wird geladen...
                      </div>
                    ) : (
                      '14 Tage kostenlos testen'
                    )}
                  </button>
                ) : (
                  <Link
                    href="/auth/signin"
                    className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-green-500/25"
                  >
                    Jetzt Premium testen
                  </Link>
                )}
                
                <Link
                  href="/analyse"
                  className="px-8 py-4 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition border border-gray-700"
                >
                  Bei Basic bleiben
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Premium User Management */}
      {isPremium && (
        <section className="bg-gray-950 noise-bg py-24 border-t border-gray-800/50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-green-400" />
                <h3 className="text-xl font-semibold text-white">Premium Aktiv</h3>
              </div>
              <p className="text-gray-400 mb-6">
                Du kannst dein Abonnement jederzeit in den Profileinstellungen verwalten.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-medium rounded-lg transition-all duration-200 hover:scale-105"
              >
                Abo verwalten
              </Link>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}