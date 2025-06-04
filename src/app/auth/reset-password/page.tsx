// src/app/auth/reset-password/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Supabase sendet verschiedene Parameter - wir checken alle
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const type = searchParams.get('type');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Debug: Log alle URL-Parameter
    console.log('URL Parameters:', {
      accessToken,
      refreshToken,
      type,
      allParams: Object.fromEntries(searchParams)
    });

    // Prüfe ob es ein Password-Reset-Link ist
    if (type === 'recovery' && accessToken && refreshToken) {
      // Session mit den Tokens setzen
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ data, error }) => {
        if (error) {
          console.error('Session Error:', error);
          setErrorMsg('Ungültiger oder abgelaufener Reset-Link.');
          setIsValidToken(false);
        } else {
          console.log('Session erfolgreich gesetzt:', data);
          setIsValidToken(true);
        }
      });
    } else {
      setErrorMsg('Kein gültiger Reset-Link. Bitte fordere einen neuen an.');
      setIsValidToken(false);
    }
  }, [accessToken, refreshToken, type, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Die Passwörter stimmen nicht überein.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    if (!isValidToken) {
      setErrorMsg('Kein gültiger Reset-Token.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) {
        console.error('Password Update Error:', error);
        setErrorMsg('Fehler beim Setzen des neuen Passworts: ' + error.message);
      } else {
        console.log('Password erfolgreich geändert:', data);
        setInfoMsg('Dein Passwort wurde erfolgreich geändert! Du wirst zur Anmeldung weitergeleitet...');
        
        // Nach 2 Sekunden zur Login-Seite weiterleiten
        setTimeout(() => {
          router.push('/auth/signin');
        }, 2000);
      }
    } catch (err) {
      console.error('Unexpected Error:', err);
      setErrorMsg('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading-State während Token-Validierung
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Validiere Reset-Link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md bg-gray-800 p-8 rounded-lg">
        <h1 className="text-2xl font-bold text-white text-center">
          Passwort zurücksetzen
        </h1>

        {errorMsg && (
          <div className="bg-red-900 text-red-200 px-4 py-2 rounded">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="bg-green-900 text-green-200 px-4 py-2 rounded">
            {infoMsg}
          </div>
        )}

        {isValidToken && (
          <>
            <div>
              <label className="block text-gray-200 mb-1">Neues Passwort</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 rounded bg-gray-700 text-white"
                required
                minLength={6}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-gray-200 mb-1">Passwort bestätigen</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded bg-gray-700 text-white"
                required
                minLength={6}
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-accent text-black py-3 rounded hover:bg-accent/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Speichere Passwort...' : 'Passwort speichern'}
            </button>
          </>
        )}

        {!isValidToken && (
          <div className="text-center">
            <a 
              href="/auth/forgot-password"
              className="text-accent hover:underline"
            >
              Neuen Reset-Link anfordern
            </a>
          </div>
        )}
      </form>
    </div>
  );
}