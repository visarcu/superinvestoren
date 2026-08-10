import { Tabs, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/auth';
import { theme } from '../../lib/theme';

export default function TabsLayout() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/(auth)/login'); return; }
      setChecked(true);
    });
  }, []);

  if (!checked) return null;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.bg.base,
            borderTopColor: theme.border.default,
            borderTopWidth: StyleSheet.hairlineWidth,
          },
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: theme.text.primary,
          tabBarInactiveTintColor: theme.text.muted,
          tabBarLabelStyle: { fontSize: theme.font.captionSm, fontWeight: theme.weight.medium, marginTop: 2, letterSpacing: 0.2 },
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
            title: 'Smart Money',
            tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
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

