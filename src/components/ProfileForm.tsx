// src/components/ProfileForm.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  initialEmail: string;
  initialFirstName: string;
  initialLastName: string;
};

export default function ProfileForm({ initialEmail, initialFirstName, initialLastName }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    // 1) Session & User-ID aus Supabase holen
    const {
      data: { session },
      error: sessionErr
    } = await supabase.auth.getSession();
    if (sessionErr || !session?.user) {
      setError('Session ungültig. Bitte neu anmelden.');
      return;
    }

    const userId = session.user.id;

    // 2) Prüfen, ob wir die E-Mail ändern – Supabase Auth braucht extra Request
    if (email !== session.user.email) {
      const { error: emailErr } = await supabase.auth.updateUser({
        email
      });
      if (emailErr) {
        setError(`Fehler beim Ändern der E-Mail: ${emailErr.message}`);
        return;
      }
    }

    // 3) Jetzt die Tabelle `profiles` updaten
    const { data, error: profileErr } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName
      })
      .eq('user_id', userId);

    if (profileErr) {
      setError(`Fehler beim Speichern: ${profileErr.message}`);
      return;
    }

    setInfo('Profil erfolgreich aktualisiert!');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-400">{error}</p>}
      {info && <p className="text-green-400">{info}</p>}

      <div>
        <label className="block text-gray-300 text-sm">E-Mail</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded"
          required
        />
      </div>
      <div>
        <label className="block text-gray-300 text-sm">Vorname</label>
        <input
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded"
        />
      </div>
      <div>
        <label className="block text-gray-300 text-sm">Nachname</label>
        <input
          type="text"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-gray-100 rounded"
        />
      </div>
      <button
        type="submit"
        className="w-full py-2 bg-accent text-black rounded hover:bg-accent/90 transition"
      >
        Speichern
      </button>
    </form>
  );
}