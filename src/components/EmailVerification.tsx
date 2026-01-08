// src/components/EmailVerification.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { FaEnvelope, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';

type Props = {
  email: string;
  isVerified: boolean;
  onVerificationUpdate?: () => void;
};

export default function EmailVerification({ email, isVerified, onVerificationUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sendVerificationEmail = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Sende Bestätigungs-Email für bereits registrierten User
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        setMessage(`Fehler: ${error.message}`);
      } else {
        setMessage('Bestätigungs-Email wurde gesendet! Prüfen Sie Ihr Postfach und klicken Sie den Link.');
      }
    } catch (err) {
      setMessage('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="flex items-center gap-2 text-brand-light text-sm bg-green-900/20 border border-green-500 rounded-lg p-3">
        <FaCheckCircle />
        <span>E-Mail-Adresse wurde bestätigt ✅</span>
      </div>
    );
  }

  return (
    <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
      <div className="flex items-center gap-2 text-blue-400 mb-3">
        <FaInfoCircle />
        <span className="font-medium">E-Mail-Adresse nicht bestätigt</span>
      </div>
      
      <p className="text-blue-300 text-sm mb-3">
        <strong>Optional:</strong> Bestätigen Sie Ihre E-Mail-Adresse für zusätzliche Sicherheit. 
        Die Seite funktioniert auch ohne Bestätigung.
      </p>

      {message && (
        <div className={`text-sm mb-3 p-2 rounded ${
          message.includes('Fehler') 
            ? 'text-red-400 bg-red-900/20' 
            : 'text-brand-light bg-green-900/20'
        }`}>
          {message}
        </div>
      )}

      <button
        onClick={sendVerificationEmail}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition text-sm"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Wird gesendet...
          </>
        ) : (
          <>
            <FaEnvelope />
            E-Mail-Adresse bestätigen
          </>
        )}
      </button>
    </div>
  );
}