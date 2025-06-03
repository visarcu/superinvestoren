'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  initialEmail: string;
  initialFirstName: string;
  initialLastName: string;
  onProfileUpdate?: () => void; // Callback um Parent zu informieren
};

export default function ProfileForm({ 
  initialEmail, 
  initialFirstName, 
  initialLastName,
  onProfileUpdate 
}: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Session prüfen
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        setError('Session ungültig. Bitte neu anmelden.');
        return;
      }

      const userId = session.user.id;
      const currentEmail = session.user.email;

      // Email Update (nur wenn geändert)
      if (email !== currentEmail) {
        const { error: emailError } = await supabase.auth.updateUser({ 
          email: email 
        });
        
        if (emailError) {
          if (emailError.message.includes('rate_limit')) {
            setError('Zu viele E-Mail-Änderungen. Bitte warten Sie einen Moment.');
          } else if (emailError.message.includes('invalid_email')) {
            setError('Ungültige E-Mail-Adresse. Bitte prüfen Sie die Eingabe.');
          } else if (emailError.message.includes('email_taken')) {
            setError('Diese E-Mail-Adresse wird bereits verwendet.');
          } else {
            setError(`Fehler beim Ändern der E-Mail: ${emailError.message}`);
          }
          return;
        }
        
        // Hinweis dass Bestätigung nötig ist
        setSuccess('E-Mail wurde geändert. Bitte bestätigen Sie die neue E-Mail-Adresse.');
      }

      // Profil Update in eigener Tabelle
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName || null, 
          last_name: lastName || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (profileError) {
        if (profileError.message.includes('permission denied')) {
          setError('Keine Berechtigung. Bitte melden Sie sich neu an.');
        } else if (profileError.message.includes('network')) {
          setError('Netzwerkfehler. Prüfen Sie Ihre Internetverbindung.');
        } else if (profileError.message.includes('timeout')) {
          setError('Zeitüberschreitung. Bitte versuchen Sie es erneut.');
        } else {
          setError(`Fehler beim Speichern: ${profileError.message}`);
        }
        return;
      }

      if (!success) { // Nur setzen wenn nicht schon Email-Success message da ist
        setSuccess('Profil erfolgreich aktualisiert!');
      }

      // Parent informieren
      if (onProfileUpdate) {
        onProfileUpdate();
      }

    } catch (err) {
      console.error('Form submission error:', err);
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError('Verbindungsfehler. Prüfen Sie Ihre Internetverbindung.');
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

  // Form Reset
  const handleReset = () => {
    setEmail(initialEmail);
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setError(null);
    setSuccess(null);
  };

  const hasChanges = 
    email !== initialEmail || 
    firstName !== initialFirstName || 
    lastName !== initialLastName;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-3">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* Email Field */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-1">
          E-Mail-Adresse
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          required
          disabled={loading}
        />
        {email !== initialEmail && (
          <p className="text-yellow-400 text-xs mt-1">
            ⚠️ E-Mail-Änderung erfordert Bestätigung
          </p>
        )}
      </div>

      {/* First Name Field */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-1">
          Vorname
        </label>
        <input
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          disabled={loading}
          placeholder="Ihr Vorname"
        />
      </div>

      {/* Last Name Field */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-1">
          Nachname
        </label>
        <input
          type="text"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          disabled={loading}
          placeholder="Ihr Nachname"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !hasChanges}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition font-medium"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              Speichern...
            </>
          ) : (
            'Änderungen speichern'
          )}
        </button>

        {hasChanges && (
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition"
          >
            Zurücksetzen
          </button>
        )}
      </div>

      {!hasChanges && (
        <p className="text-gray-500 text-sm text-center">
          Keine Änderungen vorhanden
        </p>
      )}
    </form>
  );
}