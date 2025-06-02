// src/app/auth/reset-password/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect }               from 'react';
import { supabase }                          from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('access_token') ?? '';

  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg]         = useState<string|null>(null);
  const [infoMsg, setInfoMsg]           = useState<string|null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Kein gültiger Reset-Link. Der Token fehlt.');
    } else {
      // Cast auf any, damit TypeScript nicht wegen 'email' meckert
      (supabase.auth.verifyOtp as any)({
        type: 'recovery',
        token,
      })
        .then((res: { error: any }) => { 
          // oder: (res: { error: AuthError | null }) je nachdem, welche Supabase‐Typen Du hast
          const error = res.error;
          if (error) {
            setErrorMsg('Ungültiger oder abgelaufener Link.');
          }
        });
    }
  }, [token]);

  // 2) Formular‐Submit: Passwort aktualisieren
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Die Passwörter stimmen nicht überein.');
      return;
    }
    if (!token) {
      setErrorMsg('Kein Reset-Token gefunden.');
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error('[Reset-Password] supabase.auth.updateUser error:', error);
      setErrorMsg('Fehler beim Setzen des neuen Passworts: ' + error.message);
      setIsSubmitting(false);
      return;
    }

    setInfoMsg('Dein Passwort wurde geändert. Du kannst dich jetzt einloggen.');
    setTimeout(() => {
      router.push('/auth/signin');
    }, 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md bg-gray-800 p-8 rounded-lg">
        <h1 className="text-2xl font-bold text-white text-center">Passwort zurücksetzen</h1>
        {errorMsg && <div className="bg-red-700 text-red-200 px-4 py-2 rounded">{errorMsg}</div>}
        {infoMsg  && <div className="bg-green-700 text-green-200 px-4 py-2 rounded">{infoMsg}</div>}
        <div>
          <label className="block text-gray-200 mb-1">Neues Passwort</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white"
            required
          />
        </div>
        <div>
          <label className="block text-gray-200 mb-1">Passwort bestätigen</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-500 text-black py-2 rounded hover:bg-green-600 transition"
        >
          {isSubmitting ? 'Einen Moment…' : 'Passwort speichern'}
        </button>
      </form>
    </div>
  );
}