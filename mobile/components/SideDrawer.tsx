import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Pressable, Animated, Dimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/auth';
import { theme } from '../lib/theme';

const SCREEN_W = Dimensions.get('window').width;
const DRAWER_W = Math.min(SCREEN_W * 0.78, 320);

// Diese Ziele haben keinen eigenen Tab und sind sonst nirgends erreichbar.
const ITEMS = [
  { label: 'Watchlist', icon: 'bookmark-outline' as const, route: '/(tabs)/watchlist' },
  { label: 'Screener', icon: 'funnel-outline' as const, route: '/(tabs)/screener' },
  { label: 'Finclue AI', icon: 'sparkles-outline' as const, route: '/(tabs)/ai' },
  { label: 'Analystenratings', icon: 'trending-up-outline' as const, route: '/analyst-ratings' },
  { label: 'Dividenden-Kalender', icon: 'calendar-outline' as const, route: '/(tabs)/calendar' },
  { label: 'Profil & Einstellungen', icon: 'person-outline' as const, route: '/(tabs)/profile' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Seitenmenü mit allen Zielen ohne eigenen Tab. Lag früher nur im Dashboard,
 * wodurch Watchlist, Screener, AI, Kalender und Profil aus den übrigen Tabs
 * unerreichbar waren.
 */
export default function SideDrawer({ visible, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;
  const [userName, setUserName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserName(data.user?.email?.split('@')[0] || 'Investor');
    });
  }, []);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -DRAWER_W,
      useNativeDriver: true,
      damping: 22,
      stiffness: 220,
    }).start();
  }, [visible]);

  function navigate(route: string) {
    onClose();
    setTimeout(() => router.push(route as any), 180);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={d.backdrop} onPress={onClose} />
      <Animated.View style={[d.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* User Header — manual top padding for status bar */}
        <View style={d.userRow}>
          <View style={d.avatar}>
            <Text style={d.avatarText}>{(userName || 'F').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={d.userName}>{userName}</Text>
            <Text style={d.userSub}>Finclue</Text>
          </View>
        </View>

        <View style={d.divider} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {ITEMS.map((item) => (
            <TouchableOpacity key={item.route} style={d.item} onPress={() => navigate(item.route)} activeOpacity={0.7}>
              <View style={d.iconBox}>
                <Ionicons name={item.icon} size={20} color={theme.text.tertiary} />
              </View>
              <Text style={d.itemLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={15} color={theme.text.muted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/** Menü-Button für die Screen-Header, damit alle Tabs gleich aussehen. */
export function DrawerButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={d.menuBtn} onPress={onPress} activeOpacity={0.8} hitSlop={8}>
      <Ionicons name="menu" size={20} color={theme.text.secondary} />
    </TouchableOpacity>
  );
}

const d = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.bg.overlay },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    width: DRAWER_W, backgroundColor: theme.bg.base,
    borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: theme.border.default,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg - 2, paddingHorizontal: theme.space.xl, paddingTop: 64, paddingBottom: theme.space.xl },
  avatar: { width: 44, height: 44, borderRadius: theme.radius.full, backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold },
  userName: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
  userSub: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border.default },
  item: { flexDirection: 'row', alignItems: 'center', gap: theme.space.lg - 2, paddingHorizontal: theme.space.xl, paddingVertical: theme.space.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border.subtle },
  iconBox: { width: 34, height: 34, borderRadius: theme.radius.md - 1, backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { flex: 1, color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.medium },
  menuBtn: {
    width: 38, height: 38, borderRadius: theme.radius.full,
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
