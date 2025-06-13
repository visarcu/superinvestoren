// src/components/StripeConnectButton.tsx - AUFGERÄUMT (keine Verwirrung mehr)
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { usePremiumStatus } from '@/lib/premiumUtils';

interface StripeConnectButtonProps {
  onStatusChange?: () => void;
}

export default function StripeConnectButton({ onStatusChange }: StripeConnectButtonProps) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { premiumStatus, loading: premiumLoading, refetch } = usePremiumStatus(user?.id);

  useEffect(() => {
    checkAuth();
  }, []);

  // Stripe Success Handling - NUR KURZ anzeigen wenn Premium NICHT aktiv ist
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasStripeSuccess = urlParams.get('stripe_success') === 'true';
    
    if (hasStripeSuccess && !premiumStatus.isPremium) {
      console.log('🎉 StripeConnectButton: Handling Stripe success');
      
      // URL sofort bereinigen
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Zeige Success Message nur KURZ
      setShowSuccessMessage(true);
      
      // Warte 2 Sekunden, dann refresh und verstecke Message
      const timeout = setTimeout(() => {
        console.log('🔄 StripeConnectButton: Refreshing status...');
        refetch();
        setShowSuccessMessage(false);
      }, 2000);
      
      return () => clearTimeout(timeout);
    } else if (hasStripeSuccess && premiumStatus.isPremium) {
      // Premium ist bereits aktiv, URL nur bereinigen
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [premiumStatus.isPremium]);

  async function checkAuth() {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession?.user) {
        setUser(currentSession.user);
        setSession(currentSession);
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStripeCheckout() {
    if (!user || !session) {
      alert('Bitte loggen Sie sich zuerst ein.');
      return;
    }

    setActionLoading(true);
    
    try {
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
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      alert(`Fehler beim Erstellen der Checkout-Session: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      setActionLoading(false);
    }
  }

  async function handleCustomerPortal() {
    if (!user) return;

    setActionLoading(true);
    
    try {
      const response = await fetch(`/api/stripe/checkout?userId=${user.id}&action=portal`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create portal session');
      }

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('❌ Portal error:', error);
      alert(`Fehler beim Öffnen der Abo-Verwaltung: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setActionLoading(false);
    }
  }

  // Loading State
  if (loading || premiumLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-300">Lade Status...</span>
      </div>
    );
  }

  // No User State
  if (!user) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-300">Loggen Sie sich ein, um Premium zu abonnieren.</p>
      </div>
    );
  }

  // Success Message - NUR anzeigen wenn Premium NICHT aktiv ist
  if (showSuccessMessage && !premiumStatus.isPremium) {
    return (
      <div className="bg-green-900/20 border border-green-500/50 backdrop-blur-md p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-green-400 mr-3">✅</div>
            <div>
              <h3 className="text-green-400 font-semibold">Zahlung erfolgreich!</h3>
              <p className="text-green-300 text-sm">Premium wird aktiviert...</p>
            </div>
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="text-green-400 hover:text-green-300 text-xl font-bold"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // PREMIUM AKTIV - Vereinfachte Darstellung
  if (premiumStatus.isPremium) {
    return (
      <div className="space-y-4">
        {/* Premium Status */}
        <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <div>
                <h3 className="text-green-400 font-semibold">Premium aktiv</h3>
                <div className="space-y-1">
                  {premiumStatus.status && (
                    <p className="text-green-300 text-sm">
                      Status: <span className="font-medium capitalize">{premiumStatus.status}</span>
                    </p>
                  )}
                  {premiumStatus.endDate && (
                    <p className="text-green-300 text-sm">
                      Verlängert bis: {premiumStatus.endDate.toLocaleDateString('de-DE')}
                    </p>
                  )}
                  {premiumStatus.daysRemaining !== null && premiumStatus.daysRemaining > 0 && (
                    <p className="text-blue-400 text-sm">
                      Noch {premiumStatus.daysRemaining} Tage
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={refetch}
                disabled={actionLoading}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 transition text-sm"
              >
                {actionLoading ? '...' : 'Aktualisieren'}
              </button>
              <button
                onClick={handleCustomerPortal}
                disabled={actionLoading}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600 transition text-sm"
              >
                {actionLoading ? '...' : 'Verwalten'}
              </button>
            </div>
          </div>
        </div>

        {/* Premium Features - Kompakt */}
        <div className="bg-gray-700/30 rounded-lg p-3">
          <h5 className="text-white font-medium mb-2 text-sm">Premium Features aktiv:</h5>
          <div className="grid grid-cols-2 gap-1 text-xs text-green-300">
            <div className="flex items-center gap-1">
              <span>✓</span> Erweiterte Analysen
            </div>
            <div className="flex items-center gap-1">
              <span>✓</span> Alle Charts
            </div>
            <div className="flex items-center gap-1">
              <span>✓</span> Keine Werbung
            </div>
            <div className="flex items-center gap-1">
              <span>✓</span> Priority Support
            </div>
          </div>
        </div>
      </div>
    );
  }

  // KEIN PREMIUM - Einfache Upgrade-Option
  return (
    <div className="space-y-4">
      {/* Upgrade Call-to-Action */}
      <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4">
        <div className="text-center space-y-3">
          <div className="text-3xl">🎯</div>
          <div>
            <h3 className="text-white font-semibold">Premium Features freischalten</h3>
            <p className="text-gray-300 text-sm">
              Erweiterte Analysen, alle Charts & mehr für nur 9€/Monat
            </p>
          </div>
          <button
            onClick={handleStripeCheckout}
            disabled={actionLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-600 transition font-semibold flex items-center justify-center gap-2"
          >
            {actionLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            Premium abonnieren
          </button>
        </div>
      </div>

      {/* Was ist enthalten - Kompakt */}
      <div className="bg-gray-700/20 rounded-lg p-3">
        <h5 className="text-white font-medium mb-2 text-sm">Was ist enthalten?</h5>
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-300">
          <div className="flex items-center gap-1">
            <span className="text-green-400">✓</span> Alle Kennzahlen
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-400">✓</span> Interaktive Charts  
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-400">✓</span> Keine Werbung
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-400">✓</span> Jederzeit kündbar
          </div>
        </div>
      </div>
    </div>
  );
}