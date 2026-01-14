// src/app/auth/reset-password/page.tsx - QUARTR STYLE CENTERED DESIGN
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    async function handlePasswordReset() {
      try {
        // 1. Check current session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsValidToken(true);
          return;
        }

        // 2. Check hash fragment (Supabase standard)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        let accessToken = hashParams.get('access_token');
        let refreshToken = hashParams.get('refresh_token');
        let type = hashParams.get('type');

        // 3. Check URL parameters if not in hash
        if (!accessToken) {
          const urlParams = new URLSearchParams(window.location.search);
          accessToken = urlParams.get('access_token');
          refreshToken = urlParams.get('refresh_token');
          type = urlParams.get('type');

          // 4. Check for token_hash or code
          if (!accessToken) {
            const tokenHash = urlParams.get('token_hash') || hashParams.get('token_hash');
            const code = urlParams.get('code') || hashParams.get('code');

            if (tokenHash) {
              try {
                const { data, error } = await supabase.auth.verifyOtp({
                  token_hash: tokenHash,
                  type: 'recovery'
                });

                if (!error && data.session) {
                  setIsValidToken(true);
                  return;
                }
              } catch (otpError) {
                console.error('Token hash error:', otpError);
              }
            }

            if (code) {
              try {
                const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                if (!error && data.session) {
                  setIsValidToken(true);
                  return;
                }
              } catch (codeError) {
                console.error('Code exchange error:', codeError);
              }
            }
          }
        }

        // 5. No tokens found
        if (!accessToken) {
          setErrorMsg('Kein gültiger Reset-Link. Bitte fordere einen neuen an.');
          setIsValidToken(false);
          return;
        }

        // 6. Check token length
        if (accessToken.length < 20) {
          setErrorMsg('Token ungültig.');
          setIsValidToken(false);
          return;
        }

        // 7. Set session with tokens
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (error) {
          if (error.message.includes('expired')) {
            setErrorMsg('Der Reset-Link ist abgelaufen. Bitte fordere einen neuen an.');
          } else {
            setErrorMsg('Reset-Link ungültig.');
          }
          setIsValidToken(false);
          return;
        }

        if (data.session?.user) {
          setIsValidToken(true);
          setErrorMsg(null);
        } else {
          setErrorMsg('Keine gültige Session erstellt.');
          setIsValidToken(false);
        }

      } catch (error: any) {
        setErrorMsg('Ein Fehler ist aufgetreten.');
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
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setErrorMsg(`Fehler: ${error.message}`);
      } else {
        setInfoMsg('Passwort erfolgreich geändert!');

        await supabase.auth.signOut();

        setTimeout(() => {
          router.push('/auth/signin?message=password_reset_success');
        }, 2000);
      }
    } catch (err) {
      setErrorMsg('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading state
  if (isValidToken === null) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-neutral-500 text-sm">Validiere Reset-Link...</p>
      </div>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <>
        {/* Title */}
        <h1 className="text-xl font-semibold text-white text-center mb-6">
          Neues Passwort
        </h1>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-4 py-2.5 px-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm text-center">{errorMsg}</p>
          </div>
        )}

        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-neutral-400 text-sm">
            Der Reset-Link ist ungültig oder abgelaufen.
          </p>
          <Link
            href="/auth/forgot-password"
            className="inline-block text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
          >
            Neuen Link anfordern
          </Link>
        </div>
      </>
    );
  }

  // Valid token - show form
  return (
    <>
      {/* Title */}
      <h1 className="text-xl font-semibold text-white text-center mb-6">
        Neues Passwort
      </h1>

      {/* Success Message */}
      {infoMsg && (
        <div className="mb-4 py-2.5 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-emerald-400 text-sm text-center">{infoMsg}</p>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="mb-4 py-2.5 px-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm text-center">{errorMsg}</p>
        </div>
      )}

      {/* Reset Form */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* New Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm text-neutral-400">
            Neues Passwort
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-10 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors text-sm"
              required
              minLength={6}
              disabled={isSubmitting}
              placeholder="Min. 6 Zeichen"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm text-neutral-400">
            Passwort bestätigen
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-10 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors text-sm"
              required
              minLength={6}
              disabled={isSubmitting}
              placeholder="Passwort wiederholen"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-white transition-colors"
            >
              {showConfirmPassword ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center text-white text-sm"
          style={{ backgroundColor: isSubmitting ? 'rgba(16, 185, 129, 0.5)' : '#10b981' }}
          onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#34d399')}
          onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#10b981')}
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            'Passwort speichern'
          )}
        </button>
      </form>
    </>
  );
}
