import { Tabs, router } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/auth';
import PremiumModal from '../../components/PremiumModal';

const PREMIUM_MODAL_KEY = 'premium_modal_last_shown';
const SHOW_INTERVAL_DAYS = 3;

export default function TabsLayout() {
  const [checked, setChecked] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
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

      if (profile?.is_premium) { setIsPremium(true); return; }

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

  const openPremium = useCallback(() => {
    setShowPremium(true);
  }, []);

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
          name="news"
          options={{
            title: 'News',
            tabBarIcon: ({ color, size }) => <Ionicons name="newspaper" size={size} color={color} />,
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
          name="investors"
          options={{
            title: 'Superinv.',
            tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="upgrade"
          options={{
            href: isPremium ? null : undefined,
            title: 'Upgrade',
            tabBarActiveTintColor: '#F97316',
            tabBarInactiveTintColor: '#F97316',
            tabBarIcon: ({ size }) => <Ionicons name="chevron-up" size={size} color="#F97316" />,
            tabBarLabel: ({ }) => (
              <Text style={{ color: '#F97316', fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                Upgrade
              </Text>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              openPremium();
            },
          }}
        />
        {/* Hidden tabs — accessible via Drawer menu */}
        <Tabs.Screen name="watchlist" options={{ href: null }} />
        <Tabs.Screen name="mehr" options={{ href: null }} />
        <Tabs.Screen name="screener" options={{ href: null }} />
        <Tabs.Screen name="ai" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

