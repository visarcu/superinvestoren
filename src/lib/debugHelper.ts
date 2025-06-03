// src/lib/debugHelper.ts
import { supabase } from './supabaseClient';

export async function debugSupabaseConnection() {
  console.log('🔍 Supabase Debug Check gestartet...');
  
  try {
    // 1. Session prüfen
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📋 Session Status:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      emailConfirmed: session?.user?.email_confirmed_at,
      error: sessionError?.message
    });

    if (!session) {
      console.log('❌ Keine Session gefunden');
      return;
    }

    // 2. Profil laden testen
    console.log('🔄 Versuche Profil zu laden...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    console.log('👤 Profil Ergebnis:', {
      hasProfile: !!profile,
      profile: profile,
      error: profileError?.message,
      errorCode: profileError?.code
    });

    // 3. RLS Policies testen
    console.log('🔒 Teste RLS Policies...');
    const { data: allProfiles, error: rlsError } = await supabase
      .from('profiles')
      .select('user_id')
      .limit(1);

    console.log('🛡️ RLS Test:', {
      canAccessTable: !rlsError,
      error: rlsError?.message,
      profilesFound: allProfiles?.length || 0
    });

    // 4. Wenn kein Profil existiert, versuche eins zu erstellen
    if (profileError?.code === 'PGRST116') {
      console.log('🔨 Versuche Profil zu erstellen...');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: session.user.id,
          email_verified: !!session.user.email_confirmed_at,
          first_name: null,
          last_name: null,
          is_premium: false
        })
        .select()
        .single();

      console.log('✨ Profil Erstellung:', {
        success: !!newProfile,
        profile: newProfile,
        error: createError?.message
      });
    }

  } catch (error) {
    console.error('💥 Debug Fehler:', error);
  }
}

// Zu verwendender Hook
export function useSupabaseDebug() {
  const runDebug = () => {
    debugSupabaseConnection();
  };

  return { runDebug };
}