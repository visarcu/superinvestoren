import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
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

    // Deep link: navigate when user taps a notification
    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.screen === 'stock' && data?.ticker) {
        const tab = data?.tab ? `?tab=${data.tab}` : '';
        router.push(`/stock/${data.ticker}${tab}`);
      } else if (data?.screen === 'portfolio') {
        router.push('/(tabs)/portfolio');
      }
    });

    return () => {
      subscription.unsubscribe();
      notifSub.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" backgroundColor="#020617" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0b' } }}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="stock/[ticker]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#111113' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: '',
          }}
        />
        <Stack.Screen
          name="investor/[slug]"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#111113' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: '',
          }}
        />
        <Stack.Screen
          name="notification-settings"
          options={{
            headerShown: true,
            headerStyle: { backgroundColor: '#111113' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: '',
          }}
        />
        <Stack.Screen
          name="add-transaction"
          options={{
            headerShown: true,
            title: 'Transaktion hinzufügen',
            headerStyle: { backgroundColor: '#111113' },
            headerTintColor: '#F8FAFC',
            headerBackTitle: '',
          }}
        />
      </Stack>
    </>
  );
}
