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
    
    // Auth State Listener - reagiert auf Auth-Änderungen automatisch
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔍 Auth state changed:', event, session?.user?.email);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('✅ Password recovery detected, user is authenticated');
        setIsValidToken(true);
        setErrorMsg(null);
      } else if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in, checking if this is password recovery');
        setIsValidToken(true);
        setErrorMsg(null);
      } else if (event === 'SIGNED_OUT') {
        console.log('❌ User signed out');
        setIsValidToken(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('✅ Token refreshed');
        setIsValidToken(true);
        setErrorMsg(null);
      }
    });

    // Initial session check
    async function checkInitialSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session check error:', error);
          setErrorMsg('Fehler beim Prüfen der Session.');
          setIsValidToken(false);
          return;
        }
        
        if (session && session.user) {
          console.log('✅ Valid session found:', session.user.email);
          setIsValidToken(true);
        } else {
          console.log('⚠️ No valid session, waiting for auth state change...');
          // Hier warten wir auf den Auth State Listener
          setTimeout(() => {
            if (isValidToken === null) {
              setErrorMsg('Kein gültiger Reset-Link. Bitte fordere einen neuen an.');
              setIsValidToken(false);
            }
          }, 3000); // 3 Sekunden warten
        }
      } catch (error) {
        console.error('❌ Session check failed:', error);
        setErrorMsg('Fehler beim Laden der Session.');
        setIsValidToken(false);
      }
    }

    checkInitialSession();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
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