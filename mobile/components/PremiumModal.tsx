import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  Linking, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_H } = Dimensions.get('window');

const FEATURES = [
  {
    icon: 'sparkles' as const,
    title: 'KI-Aktienanalysen',
    desc: 'Tiefgehende Analysen zu jeder Aktie auf Knopfdruck',
  },
  {
    icon: 'people' as const,
    title: 'Superinvestoren',
    desc: 'Echtzeit-Portfolios von Buffett, Ackman & Co.',
  },
  {
    icon: 'bar-chart' as const,
    title: 'Earnings im Klartext',
    desc: 'Quartalszahlen verständlich zusammengefasst',
  },
  {
    icon: 'notifications' as const,
    title: 'Premium Alerts',
    desc: 'Sofortige Benachrichtigungen bei wichtigen Ereignissen',
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PremiumModal({ visible, onClose }: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 22,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Close button */}
        <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <View style={s.badge}>
            <Ionicons name="star" size={12} color="#F8FAFC" />
            <Text style={s.badgeText}>PREMIUM</Text>
          </View>
          <Text style={s.title}>Smarter investieren{'\n'}mit finclue Premium</Text>
          <Text style={s.subtitle}>Alles was du brauchst, um bessere Entscheidungen zu treffen.</Text>
        </View>

        {/* Feature list */}
        <View style={s.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <View style={s.featureIcon}>
                <Ionicons name={f.icon} size={16} color="#F8FAFC" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
              <Ionicons name="checkmark" size={16} color="#4ade80" />
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={s.ctaBtn}
          onPress={() => { Linking.openURL('https://finclue.de/pricing'); onClose(); }}
          activeOpacity={0.85}
        >
          <Ionicons name="star" size={16} color="#0a0a0b" />
          <Text style={s.ctaBtnText}>Premium freischalten</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={{ paddingVertical: 14, alignItems: 'center' }}>
          <Text style={s.laterText}>Vielleicht später</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111113',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1e1e20',
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  header: { marginBottom: 22 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#1e1e20',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  badgeText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { color: '#F8FAFC', fontSize: 26, fontWeight: '800', lineHeight: 32, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { color: '#64748B', fontSize: 14, lineHeight: 20 },

  featureList: {
    backgroundColor: '#0a0a0b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e20',
    marginBottom: 20,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e20',
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e1e20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '600', marginBottom: 1 },
  featureDesc: { color: '#64748B', fontSize: 12 },

  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 17,
    marginBottom: 2,
  },
  ctaBtnText: { color: '#0a0a0b', fontSize: 16, fontWeight: '800' },
  laterText: { color: '#475569', fontSize: 14 },
});
