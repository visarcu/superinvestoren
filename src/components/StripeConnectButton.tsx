// src/components/StripeConnectButton.tsx - CLEAN DESIGN MIT THEME SUPPORT
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
  const [isTrialStart, setIsTrialStart] = useState(false);

  const { premiumStatus, loading: premiumLoading, refetch } = usePremiumStatus(user?.id);

  useEffect(() => {
    checkAuth();
  }, []);

  // Trial Success Handling
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasStripeSuccess = urlParams.get('stripe_success') === 'true';
    const isTrial = urlParams.get('trial') === 'true';
    
    if (hasStripeSuccess) {
      console.log('🎉 StripeConnectButton: Handling Stripe success', { isTrial });
      
      // URL sofort bereinigen
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      setIsTrialStart(isTrial);
      setShowSuccessMessage(true);
      
      // Warte 3 Sekunden, dann refresh
      const timeout = setTimeout(() => {
        console.log('🔄 StripeConnectButton: Refreshing status...');
        refetch();
        setShowSuccessMessage(false);
        setIsTrialStart(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, []);

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

  async function handleStripeCheckout(withTrial = true) {
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
          withTrial,
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
      console.log('🔍 Fetching portal for user_id:', user.id);
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

  // Berechne Trial-Tage
  function getTrialInfo() {
    if (!premiumStatus.endDate || premiumStatus.status !== 'trialing') return null;
    
    const now = new Date();
    const endDate = premiumStatus.endDate;
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      daysLeft: Math.max(0, daysLeft),
      isTrialing: true
    };
  }

  const trialInfo = getTrialInfo();

  // Loading State mit Theme
  if (loading || premiumLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-theme-muted"></div>
        <span className="ml-2 text-theme-muted">Lade Status...</span>
      </div>
    );
  }

  // No User State mit Theme
  if (!user) {
    return (
      <div className="text-center p-4">
        <p className="text-theme-muted">Loggen Sie sich ein, um Premium zu testen.</p>
      </div>
    );
  }

  // Success Message für Trial Start mit Theme
  if (showSuccessMessage) {
    return (
      <div className="bg-theme-tertiary/30 border border-theme rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-brand-light mr-3">🎉</div>
            <div>
              <h3 className="text-theme-primary font-semibold">
                {isTrialStart ? '14-Tage Trial gestartet!' : 'Zahlung erfolgreich!'}
              </h3>
              <p className="text-theme-muted text-sm">
                {isTrialStart ? 'Premium Features sind jetzt freigeschaltet' : 'Premium wird aktiviert...'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="text-theme-muted hover:text-theme-secondary text-xl font-bold"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // TRIAL AKTIV - Clean Flat Design
  if (trialInfo?.isTrialing) {
    const isCancelled = premiumStatus.status === 'canceled';

    return (
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isCancelled ? 'bg-orange-400' : 'bg-blue-400'} animate-pulse`}></div>
            <span className="text-sm font-medium text-theme-primary">
              {isCancelled ? 'Gekündigt' : 'Trial aktiv'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              disabled={actionLoading}
              className="text-xs text-theme-muted hover:text-theme-secondary transition-colors"
            >
              {actionLoading ? '...' : 'Aktualisieren'}
            </button>
            <button
              onClick={handleCustomerPortal}
              disabled={actionLoading}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            >
              {actionLoading ? '...' : 'Verwalten →'}
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-theme">
            <span className="text-sm text-theme-muted">Verbleibend</span>
            <span className={`text-sm font-medium ${trialInfo.daysLeft <= 3 ? 'text-orange-400' : 'text-theme-primary'}`}>
              {trialInfo.daysLeft} Tage kostenlos
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-theme">
            <span className="text-sm text-theme-muted">Danach</span>
            <span className="text-sm text-theme-primary font-medium">9€/Monat</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-theme-muted">Kündigung</span>
            <span className="text-sm text-theme-secondary">Jederzeit möglich</span>
          </div>
        </div>

        {/* Features - Inline */}
        <div className="pt-2">
          <p className="text-xs text-theme-muted mb-2">Alle Features freigeschaltet:</p>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 bg-theme-secondary rounded text-theme-secondary">Analysen</span>
            <span className="text-xs px-2 py-1 bg-theme-secondary rounded text-theme-secondary">Charts</span>
            <span className="text-xs px-2 py-1 bg-theme-secondary rounded text-theme-secondary">Historische Daten</span>
          </div>
        </div>

        {/* Trial Warning */}
        {trialInfo.daysLeft <= 3 && (
          <p className="text-xs text-orange-400">
            Trial endet bald · Abo wird automatisch verlängert
          </p>
        )}
      </div>
    );
  }

  // PREMIUM AKTIV (nach Trial) - Clean Flat Design
  if (premiumStatus.isPremium) {
    const isCanceled = premiumStatus.status === 'canceled';

    return (
      <div className="space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isCanceled ? 'bg-orange-400' : 'bg-emerald-500'}`}></div>
            <span className="text-sm font-medium text-theme-primary">
              {isCanceled ? 'Gekündigt' : 'Aktiv'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refetch}
              disabled={actionLoading}
              className="text-xs text-theme-muted hover:text-theme-secondary transition-colors"
            >
              {actionLoading ? '...' : 'Aktualisieren'}
            </button>
            <button
              onClick={handleCustomerPortal}
              disabled={actionLoading}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
            >
              {actionLoading ? '...' : 'Verwalten →'}
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-3">
          {premiumStatus.endDate && (
            <div className="flex items-center justify-between py-2 border-b border-theme">
              <span className="text-sm text-theme-muted">
                {isCanceled ? 'Läuft bis' : 'Nächste Verlängerung'}
              </span>
              <span className="text-sm text-theme-primary font-medium">
                {premiumStatus.endDate.toLocaleDateString('de-DE')}
              </span>
            </div>
          )}
          {premiumStatus.daysRemaining !== null && premiumStatus.daysRemaining > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-theme">
              <span className="text-sm text-theme-muted">Verbleibend</span>
              <span className="text-sm text-theme-primary font-medium">
                {premiumStatus.daysRemaining} Tage
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-theme-muted">Preis</span>
            <span className="text-sm text-theme-primary font-medium">9€/Monat</span>
          </div>
        </div>

        {/* Features - Inline */}
        <div className="pt-2">
          <p className="text-xs text-theme-muted mb-2">Inkludiert:</p>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 bg-theme-secondary rounded text-theme-secondary">Alle Analysen</span>
            <span className="text-xs px-2 py-1 bg-theme-secondary rounded text-theme-secondary">Charts</span>
            <span className="text-xs px-2 py-1 bg-theme-secondary rounded text-theme-secondary">Priority Support</span>
          </div>
        </div>
      </div>
    );
  }

  // KEIN PREMIUM - Clean Flat Design
  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-neutral-400"></div>
          <span className="text-sm font-medium text-theme-primary">Free</span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-theme">
          <span className="text-sm text-theme-muted">Trial verfügbar</span>
          <span className="text-sm text-theme-primary font-medium">14 Tage kostenlos</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-theme">
          <span className="text-sm text-theme-muted">Danach</span>
          <span className="text-sm text-theme-primary font-medium">9€/Monat</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-theme-muted">Kündigung</span>
          <span className="text-sm text-theme-secondary">Jederzeit möglich</span>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => handleStripeCheckout(true)}
        disabled={actionLoading}
        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {actionLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        ) : (
          'Trial starten'
        )}
      </button>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-theme-muted">
        <span>Kreditkarte erforderlich</span>
        <button
          onClick={() => handleStripeCheckout(false)}
          disabled={actionLoading}
          className="hover:text-theme-secondary transition-colors"
        >
          Direkt abonnieren →
        </button>
      </div>
    </div>
  );
}