// mobile/components/portfolio/DepotOnboarding.tsx
// Erststart-Zustand: Der User hat noch kein Depot.
// Das Anlegen ist hier der erste sichtbare Schritt — es wird keins automatisch erzeugt.
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../lib/theme';
import { BROKER_CONFIGS, BrokerType } from '../../lib/brokerConfig';

const QUICK_BROKERS: BrokerType[] = [
  'trade_republic',
  'scalable_capital',
  'finanzen_zero',
  'flatex',
  'ing',
  'trading212',
];

const STEPS = [
  { title: 'Depot anlegen', text: 'Broker wählen, Namen vergeben — dauert 20 Sekunden.' },
  { title: 'Aktivitäten erfassen', text: 'Käufe, Verkäufe, Dividenden und Cash.' },
  { title: 'Portfolio analysieren', text: 'Rendite, Allokation, Dividenden und KI-Analyse.' },
];

function openNewDepot(broker?: BrokerType) {
  router.push(broker ? `/depots/neu?broker=${broker}` : '/depots/neu');
}

export default function DepotOnboarding() {
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.badge}>
        <Text style={s.badgeText}>SCHRITT 1 VON 3</Text>
      </View>

      <Text style={s.title}>Leg dein erstes Depot an</Text>
      <Text style={s.subtitle}>
        Ein Depot bildet ab, was bei deinem Broker liegt. Du kannst später beliebig viele anlegen
        und sie zusammen als „Alle Depots“ auswerten.
      </Text>

      <Text style={s.sectionLabel}>BEI WELCHEM BROKER?</Text>
      <View style={s.brokerList}>
        {QUICK_BROKERS.map(id => {
          const cfg = BROKER_CONFIGS.find(b => b.id === id)!;
          return (
            <TouchableOpacity
              key={id}
              style={s.brokerRow}
              activeOpacity={0.7}
              onPress={() => openNewDepot(id)}
            >
              <View style={[s.brokerDot, { backgroundColor: cfg.color }]}>
                <Ionicons name={cfg.ionIcon as any} size={15} color="#fff" />
              </View>
              <Text style={s.brokerName} numberOfLines={1}>{cfg.displayName}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.text.tertiary} />
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={s.primaryBtn} activeOpacity={0.85} onPress={() => openNewDepot()}>
        <Ionicons name="add" size={18} color={theme.text.inverse} />
        <Text style={s.primaryBtnText}>Anderen Broker wählen</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.secondaryBtn}
        activeOpacity={0.7}
        onPress={() => openNewDepot('manual')}
      >
        <Ionicons name="create-outline" size={16} color={theme.text.secondary} />
        <Text style={s.secondaryBtnText}>Ohne Broker starten</Text>
      </TouchableOpacity>

      <View style={s.steps}>
        {STEPS.map((step, index) => (
          <View key={step.title} style={s.stepRow}>
            <View style={[s.stepNumber, index === 0 && s.stepNumberActive]}>
              <Text style={[s.stepNumberText, index === 0 && s.stepNumberTextActive]}>{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.stepTitle}>{step.title}</Text>
              <Text style={s.stepText}>{step.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },
  content: { padding: theme.space.xl, paddingBottom: theme.space.xxxl },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.accent.positiveSoft,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.xs + 1,
  },
  badgeText: {
    color: theme.accent.positive,
    fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold,
    letterSpacing: theme.tracking.wider,
  },

  title: {
    color: theme.text.primary,
    fontSize: theme.font.display2,
    fontWeight: theme.weight.bold,
    letterSpacing: theme.tracking.tight,
    marginTop: theme.space.lg,
  },
  subtitle: {
    color: theme.text.secondary,
    fontSize: theme.font.title3,
    lineHeight: 20,
    marginTop: theme.space.sm,
  },

  sectionLabel: {
    color: theme.text.tertiary,
    fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold,
    letterSpacing: theme.tracking.wider,
    marginTop: theme.space.xxl,
    marginBottom: theme.space.sm,
  },
  brokerList: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border.default,
    overflow: 'hidden',
  },
  brokerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md + 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border.default,
  },
  brokerDot: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brokerName: {
    flex: 1,
    color: theme.text.primary,
    fontSize: theme.font.title3,
    fontWeight: theme.weight.medium,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.text.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.space.md + 2,
    marginTop: theme.space.lg,
  },
  primaryBtnText: {
    color: theme.text.inverse,
    fontSize: theme.font.title3,
    fontWeight: theme.weight.semibold,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border.default,
    paddingVertical: theme.space.md + 2,
    marginTop: theme.space.sm,
  },
  secondaryBtnText: {
    color: theme.text.secondary,
    fontSize: theme.font.title3,
    fontWeight: theme.weight.medium,
  },

  steps: { marginTop: theme.space.xxl, gap: theme.space.lg },
  stepRow: { flexDirection: 'row', gap: theme.space.md },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: theme.radius.full,
    backgroundColor: theme.bg.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberActive: { backgroundColor: theme.accent.positiveSoft },
  stepNumberText: {
    color: theme.text.tertiary,
    fontSize: theme.font.caption,
    fontWeight: theme.weight.semibold,
  },
  stepNumberTextActive: { color: theme.accent.positive },
  stepTitle: {
    color: theme.text.primary,
    fontSize: theme.font.title3,
    fontWeight: theme.weight.medium,
  },
  stepText: {
    color: theme.text.tertiary,
    fontSize: theme.font.body,
    lineHeight: 18,
    marginTop: 2,
  },
});
