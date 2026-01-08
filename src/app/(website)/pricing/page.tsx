// src/app/pricing/page.tsx - CLEAN MINIMAL DESIGN
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { usePremiumStatus } from "@/lib/premiumUtils";
import { Check, X, Sparkles } from "lucide-react";

interface SupabaseUser {
  id: string;
  email: string;
}

export default function PricingPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const router = useRouter();

  const { premiumStatus, loading: premiumLoading } = usePremiumStatus(user?.id || null);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
      </div>
    );
  }

  const isPremium = premiumStatus.isPremium;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      
      {/* Hero Section - Clean & Minimal */}
      <div className="pt-32 pb-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          
          {isPremium ? (
            <div className="space-y-4 mb-8">
              <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
                Premium aktiv
              </h1>
              <p className="text-lg text-neutral-400 max-w-xl mx-auto">
                Du hast Zugang zu allen Features. Verwalte dein Abo in den Profileinstellungen.
              </p>
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
                Einfache, transparente Preise
              </h1>
              <p className="text-lg text-neutral-400 max-w-xl mx-auto">
                14 Tage kostenlos testen. Jederzeit kündbar. Keine versteckten Kosten.
              </p>
            </div>
          )}

          {/* Stats - Subtle */}
          {!isPremium && (
            <div className="flex items-center justify-center gap-12 mb-12">
              <div className="text-center">
                <div className="text-2xl font-semibold text-white">14</div>
                <div className="text-sm text-neutral-500">Tage gratis</div>
              </div>
              <div className="w-px h-8 bg-neutral-800"></div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-white">9€</div>
                <div className="text-sm text-neutral-500">pro Monat</div>
              </div>
              <div className="w-px h-8 bg-neutral-800"></div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-white">154</div>
                <div className="text-sm text-neutral-500">Jahre Daten</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Free Plan */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white mb-1">Free</h3>
              <p className="text-sm text-neutral-500">Für immer kostenlos</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold text-white">0€</span>
                <span className="text-neutral-500">/Monat</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {features.free.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  {feature.included ? (
                    <Check className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-neutral-600 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${
                    feature.included ? 'text-neutral-300' : 'text-neutral-600'
                  }`}>
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>

            <button 
              className="w-full py-3 bg-neutral-800 text-neutral-400 font-medium rounded-xl cursor-default"
              disabled
            >
              Aktueller Plan
            </button>
          </div>

          {/* Premium Plan */}
          <div className="relative bg-neutral-900/50 border border-neutral-700 rounded-2xl p-8">
            
            {/* Recommended Badge */}
            {!isPremium && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="bg-white text-black px-4 py-1 rounded-full text-xs font-semibold">
                  Empfohlen
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-white">Premium</h3>
                {isPremium && (
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full">
                    Aktiv
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-500">Alle Features freischalten</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-semibold text-white">9€</span>
                <span className="text-neutral-500">/Monat</span>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                14 Tage kostenlos • Jederzeit kündbar
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {features.premium.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className={`w-4 h-4 flex-shrink-0 ${
                    feature.highlight ? 'text-emerald-400' : 'text-neutral-400'
                  }`} />
                  <span className={`text-sm ${
                    feature.highlight ? 'text-emerald-400' : 'text-neutral-300'
                  }`}>
                    {feature.name}
                  </span>
                </li>
              ))}
            </ul>

            {isPremium ? (
              <Link
                href="/profile"
                className="block w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors text-center"
              >
                Abo verwalten
              </Link>
            ) : user ? (
              <button
                onClick={handleStripeCheckout}
                disabled={checkoutLoading}
                className="w-full py-3 bg-white hover:bg-neutral-100 text-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Wird geladen...
                  </span>
                ) : (
                  '14 Tage kostenlos testen'
                )}
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="block w-full py-3 bg-white hover:bg-neutral-100 text-black font-semibold rounded-xl transition-colors text-center"
              >
                Kostenlos testen
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* FAQ Section - Minimal */}
      <div className="border-t border-neutral-800/50">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-semibold text-white text-center mb-12">
            Häufige Fragen
          </h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="font-medium text-white mb-2">
                Kann ich jederzeit kündigen?
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Ja, absolut. Du kannst jederzeit ohne Kündigungsfrist kündigen und behältst Zugang bis zum Ende der Abrechnungsperiode.
              </p>
            </div>
            
            <div className="border-t border-neutral-800/50 pt-8">
              <h3 className="font-medium text-white mb-2">
                Was passiert nach der Testphase?
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Nach 14 Tagen wird automatisch das Abo für 9€/Monat aktiviert. Du kannst vorher jederzeit kündigen – ohne Kosten.
              </p>
            </div>
            
            <div className="border-t border-neutral-800/50 pt-8">
              <h3 className="font-medium text-white mb-2">
                Sind meine Daten sicher?
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Ja. Alle Zahlungen werden über Stripe verarbeitet. Wir speichern keine Kreditkartendaten und sind DSGVO-konform.
              </p>
            </div>
            
            <div className="border-t border-neutral-800/50 pt-8">
              <h3 className="font-medium text-white mb-2">
                Welche Zahlungsmethoden gibt es?
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Kreditkarte, SEPA-Lastschrift und weitere Zahlungsmethoden über Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA - Only for non-premium */}
      {!isPremium && (
        <div className="border-t border-neutral-800/50">
          <div className="max-w-2xl mx-auto px-6 py-20 text-center">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Bereit für bessere Entscheidungen?
            </h2>
            <p className="text-neutral-400 mb-8">
              Starte jetzt mit der 14-tägigen kostenlosen Testphase.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <button
                  onClick={handleStripeCheckout}
                  disabled={checkoutLoading}
                  className="px-8 py-3 bg-white hover:bg-neutral-100 text-black font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {checkoutLoading ? 'Wird geladen...' : 'Kostenlos testen'}
                </button>
              ) : (
                <Link
                  href="/auth/signin"
                  className="px-8 py-3 bg-white hover:bg-neutral-100 text-black font-semibold rounded-xl transition-colors"
                >
                  Kostenlos testen
                </Link>
              )}
              <Link
                href="/analyse"
                className="px-8 py-3 text-neutral-400 hover:text-white font-medium transition-colors"
              >
                Später entscheiden
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Premium Management - Only for premium users */}
      {isPremium && (
        <div className="border-t border-neutral-800/50">
          <div className="max-w-md mx-auto px-6 py-20 text-center">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8">
              <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Premium aktiv</h3>
              <p className="text-neutral-400 text-sm mb-6">
                Verwalte dein Abonnement in den Profileinstellungen.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl transition-colors"
              >
                Abo verwalten
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}