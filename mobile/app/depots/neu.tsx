import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/auth';
import { theme, tabularStyle } from '../../lib/theme';
import { BROKER_CONFIGS, BrokerType, CUSTOM_COLOR_PRESETS, getBrokerColor } from '../../lib/brokerConfig';

type Step = 1 | 2 | 3;

export default function NewDepotScreen() {
  const [step, setStep] = useState<Step>(1);
  const [broker, setBroker] = useState<BrokerType | null>(null);
  const [depotName, setDepotName] = useState('');
  const [customBrokerName, setCustomBrokerName] = useState('');
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdName, setCreatedName] = useState('');

  function selectBroker(b: BrokerType) {
    Haptics.selectionAsync();
    setBroker(b);
    // Default-Name vorschlagen
    const cfg = BROKER_CONFIGS.find(x => x.id === b)!;
    if (!depotName) setDepotName(b === 'andere' || b === 'manual' ? '' : cfg.displayName);
    setStep(2);
  }

  async function handleSave() {
    if (!broker || !depotName.trim()) return;
    if (broker === 'andere' && !customBrokerName.trim()) {
      Alert.alert('Hinweis', 'Bitte gib den Namen des Brokers ein.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      // Anzahl bestehender Depots prüfen
      const { count } = await supabase
        .from('portfolios')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      const shouldBeDefault = isDefault || (count === 0);

      // Falls Default: alle anderen auf false setzen
      if (shouldBeDefault) {
        await supabase.from('portfolios')
          .update({ is_default: false }).eq('user_id', session.user.id);
      }

      const { error: insertErr } = await supabase
        .from('portfolios')
        .insert({
          user_id: session.user.id,
          name: depotName.trim(),
          currency: 'EUR',
          cash_position: 0,
          is_default: shouldBeDefault,
          broker_type: broker,
          broker_name: broker === 'andere' ? customBrokerName.trim() || null : null,
          broker_color: customColor || null,
        });
      if (insertErr) throw insertErr;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCreatedName(depotName.trim());
      setStep(3);
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Depot konnte nicht erstellt werden');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Neues Depot' }} />
      <SafeAreaView style={s.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Stepper */}
          <View style={s.stepper}>
            {[1, 2, 3].map(n => (
              <View key={n} style={s.stepperItem}>
                <View style={[
                  s.stepperDot,
                  step >= n ? s.stepperDotActive : s.stepperDotInactive,
                ]}>
                  {step > n ? (
                    <Ionicons name="checkmark" size={13} color={theme.text.inverse} />
                  ) : (
                    <Text style={[s.stepperDotText, step >= n && { color: theme.text.inverse }]}>{n}</Text>
                  )}
                </View>
                {n < 3 && <View style={[s.stepperLine, step > n && s.stepperLineActive]} />}
              </View>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {step === 1 && (
              <View style={s.section}>
                <Text style={s.h1}>Wo verwaltest du dein Depot?</Text>
                <Text style={s.subtitle}>Wähle deinen Broker — das bestimmt Farbe und Logo.</Text>

                {BROKER_CONFIGS.map(cfg => (
                  <TouchableOpacity
                    key={cfg.id}
                    style={s.brokerRow}
                    onPress={() => selectBroker(cfg.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.brokerDot, { backgroundColor: cfg.color }]}>
                      <Ionicons name={cfg.ionIcon as any} size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.brokerName}>{cfg.displayName}</Text>
                      {cfg.description && (
                        <Text style={s.brokerDesc} numberOfLines={1}>{cfg.description}</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.text.tertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 2 && broker && (
              <View style={s.section}>
                <Text style={s.h1}>Depot benennen</Text>
                <Text style={s.subtitle}>Du kannst den Namen später ändern.</Text>

                <Text style={s.inputLabel}>Depot-Name</Text>
                <TextInput
                  style={s.input}
                  value={depotName}
                  onChangeText={setDepotName}
                  placeholder="z.B. Mein Hauptdepot"
                  placeholderTextColor={theme.text.muted}
                  autoFocus
                  returnKeyType="next"
                  maxLength={60}
                />

                {broker === 'andere' && (
                  <>
                    <Text style={[s.inputLabel, { marginTop: theme.space.lg }]}>Broker-Name</Text>
                    <TextInput
                      style={s.input}
                      value={customBrokerName}
                      onChangeText={setCustomBrokerName}
                      placeholder="Wie heißt dein Broker?"
                      placeholderTextColor={theme.text.muted}
                      maxLength={50}
                    />
                  </>
                )}

                {/* Color Picker */}
                <Text style={[s.inputLabel, { marginTop: theme.space.lg }]}>Farbe (optional)</Text>
                <View style={s.colorRow}>
                  <TouchableOpacity
                    style={[
                      s.colorChip,
                      { backgroundColor: getBrokerColor(broker, null) },
                      !customColor && s.colorChipActive,
                    ]}
                    onPress={() => { setCustomColor(null); Haptics.selectionAsync(); }}
                  >
                    {!customColor && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </TouchableOpacity>
                  {CUSTOM_COLOR_PRESETS.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        s.colorChip,
                        { backgroundColor: c },
                        customColor === c && s.colorChipActive,
                      ]}
                      onPress={() => { setCustomColor(c); Haptics.selectionAsync(); }}
                    >
                      {customColor === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Default Toggle */}
                <TouchableOpacity
                  style={s.toggleRow}
                  onPress={() => { setIsDefault(v => !v); Haptics.selectionAsync(); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.toggleTitle}>Als Standard-Depot festlegen</Text>
                    <Text style={s.toggleSub}>Wird beim Öffnen der App automatisch ausgewählt.</Text>
                  </View>
                  <View style={[s.toggle, isDefault && s.toggleOn]}>
                    <View style={[s.toggleThumb, isDefault && s.toggleThumbOn]} />
                  </View>
                </TouchableOpacity>

                {/* Action Row */}
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={s.secondaryBtn}
                    onPress={() => setStep(1)}
                    disabled={saving}
                  >
                    <Ionicons name="chevron-back" size={16} color={theme.text.primary} />
                    <Text style={s.secondaryBtnText}>Zurück</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.primaryBtn, (!depotName.trim() || saving) && s.primaryBtnDisabled]}
                    onPress={handleSave}
                    disabled={!depotName.trim() || saving}
                  >
                    {saving ? (
                      <ActivityIndicator color={theme.text.inverse} size="small" />
                    ) : (
                      <>
                        <Text style={s.primaryBtnText}>Depot erstellen</Text>
                        <Ionicons name="checkmark" size={16} color={theme.text.inverse} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={s.successWrap}>
                <View style={s.successIcon}>
                  <Ionicons name="checkmark-circle" size={48} color={theme.accent.positive} />
                </View>
                <Text style={s.h1}>Depot angelegt</Text>
                <Text style={[s.subtitle, { textAlign: 'center', paddingHorizontal: 24 }]}>
                  „{createdName}" ist jetzt verfügbar. Du kannst direkt Transaktionen hinzufügen.
                </Text>

                <View style={{ width: '100%', paddingHorizontal: theme.space.lg, marginTop: theme.space.xxl }}>
                  <TouchableOpacity
                    style={s.primaryBtn}
                    onPress={() => router.replace('/(tabs)/portfolio')}
                  >
                    <Text style={s.primaryBtnText}>Zum Portfolio</Text>
                    <Ionicons name="arrow-forward" size={16} color={theme.text.inverse} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.secondaryBtn, { marginTop: theme.space.sm, justifyContent: 'center' }]}
                    onPress={() => router.replace('/depots')}
                  >
                    <Text style={s.secondaryBtnText}>Alle Depots anzeigen</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },

  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: theme.space.xxl, paddingVertical: theme.space.lg,
    borderBottomWidth: 1, borderBottomColor: theme.border.default,
  },
  stepperItem: { flexDirection: 'row', alignItems: 'center' },
  stepperDot: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperDotActive: { backgroundColor: theme.text.primary },
  stepperDotInactive: { backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default },
  stepperDotText: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, ...tabularStyle },
  stepperLine: { width: 36, height: 1.5, backgroundColor: theme.border.default, marginHorizontal: 4 },
  stepperLineActive: { backgroundColor: theme.text.primary },

  section: { paddingHorizontal: theme.space.lg, paddingTop: theme.space.xl },
  h1: { color: theme.text.primary, fontSize: 22, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight },
  subtitle: { color: theme.text.tertiary, fontSize: theme.font.title3, marginTop: 4, marginBottom: theme.space.xl, lineHeight: 19 },

  brokerRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.md, paddingVertical: theme.space.md - 2,
    marginBottom: theme.space.sm,
    borderWidth: 1, borderColor: theme.border.default,
  },
  brokerDot: {
    width: 36, height: 36, borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  brokerName: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  brokerDesc: { color: theme.text.tertiary, fontSize: theme.font.bodySm, marginTop: 2 },

  inputLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase', marginBottom: theme.space.sm,
  },
  input: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 2,
    borderWidth: 1, borderColor: theme.border.default,
    color: theme.text.primary, fontSize: theme.font.title2,
  },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorChip: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  colorChipActive: { borderColor: theme.text.primary },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 2,
    borderWidth: 1, borderColor: theme.border.default,
    marginTop: theme.space.lg,
  },
  toggleTitle: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  toggleSub: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 2 },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: theme.bg.cardHover,
    padding: 2,
  },
  toggleOn: { backgroundColor: theme.accent.positive },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.text.primary,
  },
  toggleThumbOn: { transform: [{ translateX: 18 }] },

  actionRow: { flexDirection: 'row', gap: theme.space.sm, marginTop: theme.space.xxl },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.text.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md + 4,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: theme.text.inverse, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 4,
    borderWidth: 1, borderColor: theme.border.default,
  },
  secondaryBtnText: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  successIcon: { marginBottom: theme.space.md },
});
