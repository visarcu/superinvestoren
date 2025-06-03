'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ProfileForm from '@/components/ProfileForm';
import CancelButton from '@/components/CancelButton';
import EmailVerification from '@/components/EmailVerification';
import { FaCrown, FaUserSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import type { User } from '@supabase/supabase-js';

type ProfileRecord = {
  user_id: string;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  is_premium: boolean;
  premium_since: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function ProfilePageClient() {
  const router = useRouter();

  // State
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        router.push('/auth/signin');
        return;
      }

      setUser(session.user);

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        // If profile doesn't exist, create it
        if (profileError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: session.user.id,
              // ✅ IMMER FALSE für neue User (optionale Bestätigung)
              email_verified: false,
              first_name: null,
              last_name: null,
              is_premium: false,
              premium_since: null
            })
            .select()
            .single();

          if (createError) {
            console.error('Profile creation error:', createError);
            if (createError.message.includes('duplicate key')) {
              setError('Profil existiert bereits');
            } else if (createError.message.includes('permission denied')) {
              setError('Keine Berechtigung. Bitte neu anmelden.');
            } else {
              setError('Profil konnte nicht erstellt werden');
            }
            return;
          }
          
          setProfile(newProfile as ProfileRecord);
        } else {
          console.error('Profile fetch error:', profileError);
          if (profileError.message.includes('permission denied')) {
            setError('Keine Berechtigung zum Laden des Profils. Bitte neu anmelden.');
          } else if (profileError.message.includes('network')) {
            setError('Netzwerkfehler. Prüfen Sie Ihre Internetverbindung.');
          } else {
            setError('Profil konnte nicht geladen werden');
          }
          return;
        }
      } else {
        setProfile(profileData as ProfileRecord);
      }

    } catch (err) {
      console.error('Profile load error:', err);
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          setError('Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.');
        } else if (err.message.includes('timeout')) {
          setError('Zeitüberschreitung. Bitte versuchen Sie es erneut.');
        } else {
          setError('Ein unerwarteter Fehler ist aufgetreten');
        }
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Profil wird geladen...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <p className="text-red-400 mb-4">{error || 'Profil nicht gefunden'}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Seite neu laden
          </button>
        </div>
      </div>
    );
  }

  // Format member since date
  const memberSince = profile.premium_since
    ? format(new Date(profile.premium_since), 'dd.MM.yyyy', { locale: de })
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6 flex justify-center">
      <div className="max-w-lg w-full space-y-8">
        <h1 className="text-3xl font-orbitron text-white text-center">Mein Profil</h1>

        {/* Status Badges */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-4 flex-wrap justify-center">
            {profile.is_premium ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500 text-black rounded-full text-sm font-medium">
                <FaCrown /> Premium-User
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-sm font-medium">
                <FaUserSlash /> Kostenloser Account
              </span>
            )}
            
            {profile.email_verified ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-full text-sm font-medium">
                <FaCheckCircle /> E-Mail bestätigt
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-700 text-white rounded-full text-sm font-medium">
                <FaTimesCircle /> E-Mail nicht bestätigt
              </span>
            )}
          </div>

          {profile.is_premium && memberSince && (
            <p className="text-gray-400 text-sm">
              Premium-Mitglied seit{' '}
              <span className="font-medium text-gray-200">{memberSince}</span>
            </p>
          )}
        </div>

        {/* Profile Form */}
        <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-6 space-y-6">
          {/* Email Verification Component */}
          <EmailVerification 
            email={user.email || ''} 
            isVerified={profile.email_verified}
            onVerificationUpdate={loadProfile}
          />

          <ProfileForm
            initialEmail={user.email || ''}
            initialFirstName={profile.first_name || ''}
            initialLastName={profile.last_name || ''}
            onProfileUpdate={loadProfile}
          />

          {profile.is_premium && <CancelButton />}
        </div>
      </div>
    </div>
  );
}