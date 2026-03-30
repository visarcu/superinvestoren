import { Tabs } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/auth';
import PremiumModal from '../../components/PremiumModal';

const PREMIUM_MODAL_KEY = 'premium_modal_last_shown';
const SHOW_INTERVAL_DAYS = 3;

export default function TabsLayout() {
  const [checked, setChecked] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/(auth)/login'); return; }
      setChecked(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('user_id', data.session.user.id)
        .maybeSingle();

      if (profile?.is_premium) return;

      const lastShown = await AsyncStorage.getItem(PREMIUM_MODAL_KEY);
      if (lastShown) {
        const daysSince = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
        if (daysSince < SHOW_INTERVAL_DAYS) return;
      }

      timerRef.current = setTimeout(() => setShowPremium(true), 3000);
    });
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function handleClosePremium() {
    AsyncStorage.setItem(PREMIUM_MODAL_KEY, Date.now().toString());
    setShowPremium(false);
  }

  if (!checked) return null;

  return (
    <View style={{ flex: 1 }}>
      <PremiumModal visible={showPremium} onClose={handleClosePremium} />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0a0a0a',
            borderTopColor: '#1C1C1E',
            borderTopWidth: 1,
            height: 88,
            paddingBottom: 28,
            paddingTop: 10,
          },
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#48484A',
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="watchlist"
          options={{
            title: 'Watchlist',
            tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="portfolio"
          options={{
            title: 'Portfolio',
            tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="screener"
          options={{
            title: 'Screener',
            tabBarIcon: ({ color, size }) => <Ionicons name="funnel" size={size} color={color} />,
          }}
        />
        {/* Hidden tabs — accessible via Drawer menu */}
        <Tabs.Screen name="mehr" options={{ href: null }} />
        <Tabs.Screen name="investors" options={{ href: null }} />
        <Tabs.Screen name="ai" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

