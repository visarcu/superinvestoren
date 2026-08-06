// src/lib/supabaseAdmin.ts - mit Lazy Initialization für Build-Kompatibilität
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization - wird erst bei erster Nutzung initialisiert
// Dies verhindert Build-Fehler wenn Umgebungsvariablen nicht gesetzt sind
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    // Debug: nur boolean Checks — niemals Key-Werte oder -Prefixe loggen.
    console.log('🔧 Supabase Admin Debug:', {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    // Prüfe ob Service Role Key gesetzt ist
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set!');
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    }

    // Prüfe ob es wirklich ein Service Role Key ist (sollte sehr lang sein)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY.length < 100) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY seems too short - might be wrong key');
    }

    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  return _supabaseAdmin;
}

// Für Server-Side Operations (bypassed RLS) - Proxy für Abwärtskompatibilität
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient];
  }
});

// Test-Funktion um Verbindung zu prüfen
export async function testAdminConnection() {
  try {
    console.log('🧪 Testing Admin Connection...');
    
    // Einfacher Test: Versuche Tabellen-Schema zu lesen
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .limit(1);
    
    console.log('🧪 Admin Connection Test Result:', { 
      success: !error, 
      error: error?.message,
      hasData: !!data 
    });
    
    return !error;
  } catch (error) {
    console.error('🧪 Admin Connection Test Failed:', error);
    return false;
  }
}

// Original Client bleibt für Client-Side
export { supabase } from './supabaseClient';