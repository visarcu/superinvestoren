'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ProfileForm from '@/components/ProfileForm';
import CancelButton from '@/components/CancelButton';
import { FaCrown, FaUserSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

//
// Typdefinition für einen einzelnen Eintrag aus der Tabelle "profiles".
// Wir erwarten exakt diese Spalten in der Datenbank:
//
//   user_id       String
//   email_verified Boolean
//   first_name    String|null
//   last_name     String|null
//   is_premium    Boolean
//   premium_since String|null (ISO-DateString)
//
//
type ProfileRecord = {
  user_id: string;
  email_verified: boolean;
  first_name: string | null;
  last_name: string | null;
  is_premium: boolean;
  premium_since: string | null; // Supabase liefert diesen Wert als ISO-String
};

export default function ProfilePageClient() {
  const router = useRouter();

  // ─── 1) Status der Supabase-Session ─────────────────────────────────────
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // ─── 2) State für das aktuell geladene Profil ────────────────────────────
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // ─── 1) Beim Mount: Supabase-Session prüfen und danach Profil holen ───────
  useEffect(() => {
    async function checkSession() {
      // Wir rufen supabase.auth.getSession() auf, um die aktuelle Session zu bekommen
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('[ProfilePageClient] getSession error:', error.message);
        setSessionError('Fehler beim Abrufen der Session.');
        router.push('/auth/signin');
        return;
      }

      if (!session || !session.user) {
        // Kein eingeloggter User → auf Login/Signup umleiten
        router.push('/auth/signin');
        return;
      }

      // Session ist vorhanden → Profil aus eigener Tabelle laden
      await loadProfile(session.user.id);
      setLoadingSession(false);
    }

    checkSession();
  }, [router]);

  // ─── 2) Funktion: Profil aus der Supabase-Tabelle "profiles" holen ───────
  async function loadProfile(userId: string) {
    setLoadingProfile(true);
    setProfileError(null);

    // Wichtig: Wir verwenden hier _nur_ ein Generic oder gar kein Generic,
    // um den TypeScript-Overhead in Grenzen zu halten. Der Rückgabetyp
    // sollte automatisch auf etwas in der Art „{ data: ProfileRecord, error: unknown }“ inferiert werden.
    const result = await supabase
      .from('profiles')
      .select('user_id, email_verified, first_name, last_name, is_premium, premium_since')
      .eq('user_id', userId)
      .single();

    // result.data könnte null sein oder den gefundenen Datensatz
    if (result.error) {
      console.error('[ProfilePageClient] Fehler beim Laden des Profils:', result.error.message);
      setProfileError('Profil konnte nicht geladen werden.');
      setLoadingProfile(false);
      return;
    }

    if (!result.data) {
      // Falls kein Datensatz zurückkam
      setProfileError('Profil nicht gefunden.');
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    // Setze das geladene Profil (TypeScript weiß dank unserer `type ProfileRecord`-Definition, dass data diese Form hat)
    setProfile(result.data as ProfileRecord);
    setLoadingProfile(false);
  }

  // ─── 3) Rendering, solange Session oder Profile noch laden ───────────────
  if (loadingSession || loadingProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-gray-100">
        <p>Lädt…</p>
      </div>
    );
  }

  // Wenn nach dem Laden kein Profil da ist, zeige Fehlermeldung
  if (!profile) {
    return (
      <div className="p-4 text-center text-red-400">
        {profileError || 'Profil nicht gefunden.'}
      </div>
    );
  }

  // ─── Hilfsfunktion, um "premium_since" als deutsches Datum zu formatieren ──
  const memberSince = profile.premium_since
    ? format(new Date(profile.premium_since), 'dd.MM.yyyy', { locale: de })
    : null;

  // ─── 4) Vollständiges Profil-Layout ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6 flex justify-center">
      <div className="max-w-lg w-full space-y-8">
        <h1 className="text-3xl font-orbitron text-white text-center">Mein Profil</h1>

        {/* ── Status-Badges oben: Premium / Free, E-Mail verifiziert? ─────────── */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-4">
            {profile.is_premium ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500 text-black rounded-full">
                <FaCrown /> Premium-User
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full">
                <FaUserSlash /> Kostenloser Account
              </span>
            )}
            {profile.email_verified ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-black rounded-full">
                <FaCheckCircle /> E-Mail bestätigt
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-700 text-white rounded-full">
                <FaTimesCircle /> E-Mail nicht bestätigt
              </span>
            )}
          </div>

          {profile.is_premium && memberSince && (
            <p className="text-gray-400 text-sm">
              Mitglied seit{' '}
              <span className="font-medium text-gray-200">{memberSince}</span>
            </p>
          )}
        </div>

        {/* ── Formular und Abbrechen-Button ───────────────────────────────────── */}
        <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-6 space-y-6">
          {/* ProfileForm zeigt die Felder E-Mail, Vorname, Nachname */}
          <ProfileForm
            initialEmail={profile.user_id /* Hier könntest du alternativ supabase.auth.getUser().user.email holen */}
            initialFirstName={profile.first_name || ''}
            initialLastName={profile.last_name || ''}
          />

          {/* Wenn Premium, soll der Kündigen-Button erscheinen */}
          {profile.is_premium && <CancelButton />}
        </div>
      </div>
    </div>
  );
}