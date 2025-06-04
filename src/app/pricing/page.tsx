// src/app/pricing/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PatreonConnectButton from "@/components/PatreonConnectButton";

interface SupabaseUser {
  id: string;
  email: string;
}

interface UserProfile {
  patreon_id: string | null;
  patreon_tier: string | null;
  is_premium: boolean;
}

export default function PricingPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Session laden und Auth-Listener registrieren
  useEffect(() => {
    async function loadUserData() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("[PricingPage] Fehler beim Laden der Session:", error.message);
      }

      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || "",
        };
        setUser(userData);
        
        // Lade auch das Profil für Premium-Status
        await loadUserProfile(userData.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }

      setLoading(false);
    }

    async function loadUserProfile(userId: string) {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('patreon_id, patreon_tier, is_premium')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.warn('[PricingPage] Profile error:', error);
        }

        if (profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('[PricingPage] Error loading profile:', error);
      }
    }

    loadUserData();

    // Auth State Change Listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || "",
        };
        setUser(userData);
        await loadUserProfile(userData.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Callback für Patreon Status-Änderungen
  const handleStatusChange = () => {
    // Lade Profil neu nach Status-Änderung
    if (user) {
      setTimeout(async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('patreon_id, patreon_tier, is_premium')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile) {
          setUserProfile(profile);
        }
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden p-6">
      {/* Hintergrund-Kreise */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-accent/25 rounded-full blur-2xl animate-[pulse_12s_ease-in-out_infinite]" />

      <div className="relative z-10 w-full max-w-4xl">
        
        {/* Wenn nicht eingeloggt */}
        {!user && (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-white">Premium freischalten</h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Melde dich an und unterstütze uns auf Patreon für vollen Zugang zu allen Features
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
                Melde dich zuerst an, um Premium freizuschalten.
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
          <div className="text-center space-y-8">
            
            {/* Header */}
            <div className="space-y-4">
              {userProfile?.is_premium ? (
                <>
                  <h1 className="text-4xl font-bold text-green-400">Premium aktiv! 🎉</h1>
                  <p className="text-xl text-gray-300">
                    Vielen Dank für deine Unterstützung! Du hast Zugang zu allen Premium-Features.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-4xl font-bold text-white">Premium freischalten</h1>
                  <p className="text-xl text-gray-300">
                    Unterstütze uns mit <span className="font-bold text-orange-400">9€ pro Monat</span> auf Patreon
                  </p>
                </>
              )}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              
              {/* Premium Features */}
              <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-8">
                <div className="space-y-6">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M0 .48v23.04h4.22V.48H0zm15.385 0c-4.764 0-8.641 3.88-8.641 8.65 0 4.755 3.877 8.623 8.641 8.623 4.75 0 8.615-3.868 8.615-8.623C24 4.36 20.136.48 15.385.48z"/>
                    </svg>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white">Premium Features</h2>
                  
                  <div className="space-y-4 text-left">
                    {[
                      "Interaktive Charts & Zeitraumauswahl",
                      "Erweiterte Kennzahlen (Quartal, Wachstum)",
                      "Unbegrenzte historische Daten (bis 154 Jahre)",
                      "Exklusive Premium-Filter & Alerts",
                      "Prioritätssupport"
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className={`text-lg ${
                          userProfile?.is_premium ? 'text-green-400' : 'text-orange-400'
                        }`}>
                          {userProfile?.is_premium ? '✓' : '⭐'}
                        </span>
                        <span className="text-gray-200">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Patreon Connection */}
              <div className="space-y-6">
                <PatreonConnectButton onStatusChange={handleStatusChange} />
                
                {/* Quick Links */}
                {userProfile?.is_premium && (
                  <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Schnellzugriff</h3>
                    <div className="space-y-3">
                      <Link
                        href="/analyse"
                        className="block w-full p-3 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition text-center text-blue-300"
                      >
                        📊 Zur Aktien-Analyse
                      </Link>
                      <Link
                        href="/profile"
                        className="block w-full p-3 bg-gray-700/50 hover:bg-gray-700/70 rounded-lg transition text-center text-white"
                      >
                        🏠 Zu meinem Profil
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Info */}
            {!userProfile?.is_premium && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Wie funktioniert es?</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-300">
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto mb-2 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 font-bold">1</div>
                      <p>Mit Patreon verbinden</p>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto mb-2 bg-orange-600/20 rounded-full flex items-center justify-center text-orange-400 font-bold">2</div>
                      <p>9€/Monat unterstützen</p>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto mb-2 bg-green-600/20 rounded-full flex items-center justify-center text-green-400 font-bold">3</div>
                      <p>Features werden freigeschaltet</p>
                    </div>
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto mb-2 bg-purple-600/20 rounded-full flex items-center justify-center text-purple-400 font-bold">4</div>
                      <p>Jederzeit kündbar</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}