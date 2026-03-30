import { Tabs, router } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Pressable, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/auth';
import PremiumModal from '../../components/PremiumModal';

const PREMIUM_MODAL_KEY = 'premium_modal_last_shown';
const SHOW_INTERVAL_DAYS = 3;

const MEHR_ITEMS = [
  { label: 'Superinvestoren', icon: 'people' as const, route: '/(tabs)/investors', color: '#6366F1' },
  { label: 'Finclue AI', icon: 'sparkles' as const, route: '/(tabs)/ai', color: '#F59E0B' },
  { label: 'Dividenden-Kalender', icon: 'calendar' as const, route: '/(tabs)/calendar', color: '#22C55E' },
  { label: 'Kursalarme', icon: 'notifications' as const, route: '/alerts', color: '#EF4444' },
  { label: 'Profil & Einstellungen', icon: 'person-circle' as const, route: '/(tabs)/profile', color: '#94a3b8' },
];

function MehrMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300, duration: 200, useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  function navigate(route: string) {
    onClose();
    setTimeout(() => router.push(route as any), 150);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={mehr.backdrop} onPress={onClose} />
      <Animated.View style={[mehr.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={mehr.handle} />
        <Text style={mehr.sheetTitle}>Mehr entdecken</Text>

        {MEHR_ITEMS.map((item) => (
          <TouchableOpacity key={item.route} style={mehr.item} onPress={() => navigate(item.route)}>
            <View style={[mehr.iconBox, { backgroundColor: `${item.color}20` }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={mehr.itemLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#475569" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={mehr.closeBtn} onPress={onClose}>
          <Text style={mehr.closeBtnText}>Schließen</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

export default function TabsLayout() {
  const [checked, setChecked] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showMehr, setShowMehr] = useState(false);
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
      <MehrMenu visible={showMehr} onClose={() => setShowMehr(false)} />

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
        {/* Mehr-Button: custom tabBarButton */}
        <Tabs.Screen
          name="mehr"
          options={{
            title: 'Mehr',
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
            tabBarButton: () => (
              <TouchableOpacity
                style={mehr.tabBtn}
                onPress={() => setShowMehr(true)}
              >
                <Ionicons name="grid" size={22} color="#475569" />
                <Text style={mehr.tabBtnLabel}>Mehr</Text>
              </TouchableOpacity>
            ),
          }}
        />

        {/* Hidden tabs — accessible via Mehr menu */}
        <Tabs.Screen name="investors" options={{ href: null }} />
        <Tabs.Screen name="ai" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="calendar" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const mehr = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#111113',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#1e1e20',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 8,
  },
  sheetTitle: {
    color: '#fff', fontSize: 17, fontWeight: '700',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#1a1a1c',
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  itemLabel: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600' },
  closeBtn: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: '#1e293b', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  closeBtnText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
  tabBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 10, paddingBottom: 28, minWidth: 60,
  },
  tabBtnLabel: {
    color: '#475569', fontSize: 10, fontWeight: '600', marginTop: 4,
    textAlign: 'center',
  },
});
