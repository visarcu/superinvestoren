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
    console.log('🔄 Reset Password Page mounted');
    console.log('🔍 Full URL:', window.location.href);
    console.log('🔍 Hash:', window.location.hash);
    console.log('🔍 Search:', window.location.search);
    
    // EINFACHER ANSATZ: Direkt prüfen was verfügbar ist
    async function handlePasswordReset() {
      try {
        // 1. Prüfe aktuelle Session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('✅ Already authenticated:', session.user.email);
          setIsValidToken(true);
          return;
        }

        // 2. Prüfe URL Parameter UND Hash
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
        const type = urlParams.get('type') || hashParams.get('type');
        
        console.log('🔍 Tokens found:', {
          accessToken: accessToken ? 'YES' : 'NO',
          refreshToken: refreshToken ? 'YES' : 'NO', 
          type
        });

        // 3. Wenn keine Tokens, zeige Fehler
        if (!accessToken) {
          console.log('❌ No access token found');
          setErrorMsg('Kein gültiger Reset-Link. Bitte fordere einen neuen an.');
          setIsValidToken(false);
          return;
        }

        // 4. Versuche Session mit Tokens zu setzen
        console.log('🔄 Setting session with tokens...');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (error) {
          console.error('❌ Session error:', error);
          setErrorMsg(`Reset-Link ungültig: ${error.message}`);
          setIsValidToken(false);
          return;
        }

        if (data.session?.user) {
          console.log('✅ Password reset session created:', data.session.user.email);
          setIsValidToken(true);
          setErrorMsg(null);
        } else {
          console.log('❌ No user in session');
          setErrorMsg('Session erstellt aber kein User gefunden.');
          setIsValidToken(false);
        }

      } catch (error: any) {
        console.error('❌ Password reset failed:', error);
        setErrorMsg(`Fehler: ${error.message}`);
        setIsValidToken(false);
      }
    }

    handlePasswordReset();
  }, []);

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
      <div className="text-white text-center">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Validiere Reset-Link...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md">
      <h1 className="text-2xl font-bold text-white text-center mb-6">
        Passwort zurücksetzen
      </h1>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {errorMsg}
        </div>
      )}

      {infoMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg">
          {infoMsg}
        </div>
      )}

      {isValidToken && (
        <>
          <div>
            <label className="block text-theme-secondary text-sm mb-2">Neues Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-theme-card border border-theme/10 text-white focus:border-green-500 focus:outline-none transition-colors"
              required
              minLength={6}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-theme-secondary text-sm mb-2">Passwort bestätigen</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-theme-card border border-theme/10 text-white focus:border-green-500 focus:outline-none transition-colors"
              required
              minLength={6}
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Speichere Passwort...' : 'Passwort speichern'}
          </button>
        </>
      )}

      {!isValidToken && (
        <div className="text-center">
          <a 
            href="/auth/forgot-password"
            className="text-green-500 hover:text-green-400 transition-colors hover:underline"
          >
            Neuen Reset-Link anfordern
          </a>
        </div>
      )}
    </form>
  );
}