'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useNotificationSettings() {
  useEffect(() => {
    async function ensureSettings() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data } = await supabase
          .from('notification_settings')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!data) {
          await supabase
            .from('notification_settings')
            .insert({
              user_id: session.user.id,
              watchlist_enabled: true,
              watchlist_threshold_percent: 10,
              filings_enabled: true,
              preferred_investors: ['buffett'],
              email_frequency: 'immediate'
            });
        }
      }
    }

    ensureSettings();
  }, []);
}