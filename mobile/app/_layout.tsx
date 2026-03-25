import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/auth';
import { registerForPushNotifications } from '../lib/pushNotifications';
import '../global.css';

export default function RootLayout() {
  useEffect(() => {
    // Register for push notifications once user is authenticated
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        registerForPushNotifications();
      }
    });

    // Re-register after login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        registerForPushNotifications();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#020617" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#020617' } }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="stock/[ticker]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: '',
          }}
        />
        <Stack.Screen
          name="investor/[slug]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: '',
          }}
        />
        <Stack.Screen
          name="notification-settings"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: '',
          }}
        />
      </Stack>
    </>
  );
}
