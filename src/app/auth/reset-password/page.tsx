'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
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
    
    async function handlePasswordReset() {
      try {
        // 1. Prüfe aktuelle Session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('✅ Already authenticated:', session.user.email);
          setIsValidToken(true);
          return;
        }

        // 2. Check Hash-Fragment (Supabase Standard)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        let accessToken = hashParams.get('access_token');
        let refreshToken = hashParams.get('refresh_token');
        let type = hashParams.get('type');
        
        // 3. Falls nicht im Hash, check URL-Parameter
        if (!accessToken) {
          const urlParams = new URLSearchParams(window.location.search);
          accessToken = urlParams.get('access_token');
          refreshToken = urlParams.get('refresh_token');
          type = urlParams.get('type');
          
          // 4. Alternative: Check für token_hash oder code
          if (!accessToken) {
            const tokenHash = urlParams.get('token_hash') || hashParams.get('token_hash');
            const code = urlParams.get('code') || hashParams.get('code');
            
            console.log('🔍 Alternative tokens:', { tokenHash, code });
            
            // HIER IST DIE KORREKTUR:
            if (tokenHash) {
              try {
                const { data, error } = await supabase.auth.verifyOtp({
                  token_hash: tokenHash,
                  type: 'recovery'
                });
                
                if (!error && data.session) {
                  console.log('✅ OTP verified with token_hash');
                  setIsValidToken(true);
                  return;
                } else if (error) {
                  console.error('❌ Token hash verification failed:', error);
                }
              } catch (otpError: any) {
                console.error('❌ Token hash error:', otpError);
              }
            }
            
            // Separat für code probieren
            if (code) {
              try {
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                
                if (!error && data.session) {
                  console.log('✅ Code exchanged for session');
                  setIsValidToken(true);
                  return;
                } else if (error) {
                  console.error('❌ Code exchange failed:', error);
                }
              } catch (codeError: any) {
                console.error('❌ Code exchange error:', codeError);
              }
            }
          }
        }
        
        console.log('🔍 Tokens found:', {
          accessToken: accessToken ? `YES (${accessToken.length} chars)` : 'NO',
          refreshToken: refreshToken ? 'YES' : 'NO',
          type,
          source: accessToken && window.location.hash ? 'hash' : 'search'
        });

        // 5. Keine Tokens gefunden
        if (!accessToken) {
          console.log('❌ No access token found');
          setErrorMsg('Kein gültiger Reset-Link. Bitte fordere einen neuen an.');
          setIsValidToken(false);
          return;
        }

        // 6. Token-Länge prüfen
        if (accessToken.length < 20) {
          console.log('⚠️ Token too short');
          setErrorMsg(`Token zu kurz (${accessToken.length} Zeichen).`);
          setIsValidToken(false);
          return;
        }

        // 7. Session mit Tokens setzen
        console.log('🔄 Setting session with tokens...');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (error) {
          console.error('❌ Session error:', error);
          if (error.message.includes('expired')) {
            setErrorMsg('Der Reset-Link ist abgelaufen. Bitte fordere einen neuen an.');
          } else {
            setErrorMsg(`Reset-Link ungültig: ${error.message}`);
          }
          setIsValidToken(false);
          return;
        }

        if (data.session?.user) {
          console.log('✅ Session created:', data.session.user.email);
          setIsValidToken(true);
          setErrorMsg(null);
        } else {
          console.log('❌ No user in session');
          setErrorMsg('Keine gültige Session erstellt.');
          setIsValidToken(false);
        }

      } catch (error: any) {
        console.error('❌ Unexpected error:', error);
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
        console.error('❌ Password update error:', error);
        setErrorMsg(`Fehler: ${error.message}`);
      } else {
        console.log('✅ Password updated');
        setInfoMsg('Passwort erfolgreich geändert! Du wirst weitergeleitet...');
        
        await supabase.auth.signOut();
        
        setTimeout(() => {
          router.push('/auth/signin?message=password_reset_success');
        }, 2000);
      }
    } catch (err: any) {
      console.error('❌ Error:', err);
      setErrorMsg('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading
  if (isValidToken === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-white">
        <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mb-4"></div>
        <p>Validiere Reset-Link...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md bg-gray-800 p-8 rounded-xl">
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

        {isValidToken ? (
          <>
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Neues Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:border-green-500 focus:outline-none"
                required
                minLength={6}
                disabled={isSubmitting}
                placeholder="Min. 6 Zeichen"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Passwort bestätigen
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:border-green-500 focus:outline-none"
                required
                minLength={6}
                disabled={isSubmitting}
                placeholder="Passwort wiederholen"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Speichern...' : 'Neues Passwort speichern'}
            </button>
          </>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-gray-400">
              Der Reset-Link ist ungültig oder abgelaufen.
            </p>
            <a 
              href="/auth/forgot-password"
              className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Neuen Link anfordern
            </a>
          </div>
        )}
      </form>
    </div>
  );
}