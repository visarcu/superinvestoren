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
    console.log('🔍 URL Parameters:', {
      accessToken,
      refreshToken,
      type,
      allParams: Object.fromEntries(searchParams)
    });

    // Supabase Magic Links haben verschiedene Parameter-Namen
    // Checke alle möglichen Parameter-Kombinationen
    const token = accessToken || searchParams.get('token');
    const recoveryType = type || searchParams.get('recovery_type');
    
    console.log('🔍 Checking all possible parameters:', {
      token,
      recoveryType,
      type,
      accessToken,
      refreshToken
    });

    if (!token) {
      console.log('❌ No token found in URL');
      setErrorMsg('Kein Reset-Token in der URL gefunden. Bitte fordere einen neuen Reset-Link an.');
      setIsValidToken(false);
      return;
    }

    // Simpler approach: Prüfe ob wir bereits eine gültige Session haben oder erstelle eine neue
    async function validateToken() {
      try {
        console.log('🔄 Starting token validation...');
        
        // Schritt 1: Aktuelle Session prüfen
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session && session.user) {
          console.log('✅ Existing valid session found:', session.user.email);
          setIsValidToken(true);
          return;
        }

        console.log('⚠️ No existing session, processing reset token...');
        
        // Schritt 2: Prüfe ob der URL Hash Parameter enthält (Magic Link Format)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');
        
        console.log('🔍 Hash parameters:', {
          hashAccessToken: hashAccessToken?.substring(0, 20) + '...',
          hashRefreshToken: hashRefreshToken?.substring(0, 20) + '...',
          hashType
        });
        
        // Schritt 3: Verwende Hash-Token falls verfügbar, sonst URL-Parameter
        const finalAccessToken = hashAccessToken || token;
        const finalRefreshToken = hashRefreshToken || refreshToken;
        
        if (!finalAccessToken) {
          throw new Error('Kein Access Token gefunden');
        }
        
        // Schritt 4: Session mit verfügbaren Tokens setzen
        console.log('🔄 Setting session with tokens...');
        
        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: finalAccessToken,
          refresh_token: finalRefreshToken || ''
        });
        
        if (setSessionError) {
          console.error('❌ Session setting failed:', setSessionError);
          throw setSessionError;
        }
        
        if (sessionData?.session && sessionData.session.user) {
          console.log('✅ Session successfully set:', sessionData.session.user.email);
          setIsValidToken(true);
        } else {
          throw new Error('Session wurde gesetzt aber enthält keinen User');
        }
        
      } catch (error: any) {
        console.error('❌ Complete token validation failed:', error);
        setErrorMsg(`Reset-Link ungültig: ${error.message || 'Unbekannter Fehler'}`);
        setIsValidToken(false);
      }
    }

    validateToken();
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