import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Alert, Modal, Pressable,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/auth';
import { theme, tabularStyle } from '../../../lib/theme';
import { getBrokerConfig, getBrokerColor, getBrokerDisplayName, CUSTOM_COLOR_PRESETS, BrokerType } from '../../../lib/brokerConfig';

interface DepotData {
  id: string;
  name: string;
  broker_type: BrokerType;
  broker_name: string | null;
  broker_color: string | null;
  is_default: boolean;
  cash_position: number;
}

function fmtDE(v: number, d = 2) {
  return Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function EditDepotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [original, setOriginal] = useState<DepotData | null>(null);
  const [name, setName] = useState('');
  const [customBrokerName, setCustomBrokerName] = useState('');
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [cashStr, setCashStr] = useState('0');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name, broker_type, broker_name, broker_color, is_default, cash_position')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      const d = data as DepotData;
      setOriginal(d);
      setName(d.name);
      setCustomBrokerName(d.broker_name || '');
      setCustomColor(d.broker_color);
      setIsDefault(d.is_default);
      setCashStr(d.cash_position ? d.cash_position.toString().replace('.', ',') : '0');
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Depot konnte nicht geladen werden', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!original || !name.trim()) return;
    if (original.broker_type === 'andere' && !customBrokerName.trim()) {
      Alert.alert('Hinweis', 'Bitte gib den Namen des Brokers ein.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Cash parsen ("1.234,56" oder "1234,56" oder "1234.56")
      const cashNum = parseFloat(cashStr.replace(/\./g, '').replace(',', '.')) || 0;

      // Falls jetzt als Default markiert wird (war es vorher nicht): andere zurücksetzen
      if (isDefault && !original.is_default) {
        await supabase.from('portfolios')
          .update({ is_default: false })
          .eq('user_id', session.user.id);
      }

      const { error } = await supabase
        .from('portfolios')
        .update({
          name: name.trim(),
          broker_name: original.broker_type === 'andere' ? customBrokerName.trim() || null : original.broker_name,
          broker_color: customColor || null,
          is_default: isDefault,
          cash_position: cashNum,
        })
        .eq('id', original.id)
        .eq('user_id', session.user.id);

      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Änderungen konnten nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!original) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from('portfolio_holdings').delete().eq('portfolio_id', original.id);
      await supabase.from('portfolio_transactions').delete().eq('portfolio_id', original.id);
      const { error } = await supabase
        .from('portfolios').delete()
        .eq('id', original.id).eq('user_id', session.user.id);
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmDelete(false);
      router.replace('/depots');
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Depot konnte nicht gelöscht werden');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Depot bearbeiten' }} />
        <SafeAreaView style={s.container}>
          <ActivityIndicator color={theme.accent.positive} style={{ marginTop: 80 }} />
        </SafeAreaView>
      </>
    );
  }

  if (!original) return null;

  const brokerCfg = getBrokerConfig(original.broker_type);
  const previewColor = getBrokerColor(original.broker_type, customColor);

  return (
    <>
      <Stack.Screen options={{ title: 'Depot bearbeiten' }} />
      <SafeAreaView style={s.container} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Broker Preview (nicht editierbar) */}
            <View style={s.previewCard}>
              <View style={[s.brokerDot, { backgroundColor: previewColor }]}>
                <Ionicons name={brokerCfg.ionIcon as any} size={20} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.previewLabel}>BROKER</Text>
                <Text style={s.previewValue} numberOfLines={1}>
                  {getBrokerDisplayName(original.broker_type, customBrokerName || original.broker_name)}
                </Text>
              </View>
            </View>
            <Text style={s.previewHint}>
              Der Broker kann nach dem Anlegen nicht mehr geändert werden.
            </Text>

            <View style={s.section}>
              <Text style={s.inputLabel}>Depot-Name</Text>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="Depot-Name"
                placeholderTextColor={theme.text.muted}
                maxLength={60}
              />

              {original.broker_type === 'andere' && (
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

              <Text style={[s.inputLabel, { marginTop: theme.space.lg }]}>Cash-Position (€)</Text>
              <TextInput
                style={s.input}
                value={cashStr}
                onChangeText={setCashStr}
                placeholder="0,00"
                placeholderTextColor={theme.text.muted}
                keyboardType="decimal-pad"
              />

              <Text style={[s.inputLabel, { marginTop: theme.space.lg }]}>Farbe</Text>
              <View style={s.colorRow}>
                <TouchableOpacity
                  style={[
                    s.colorChip,
                    { backgroundColor: getBrokerColor(original.broker_type, null) },
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

              <TouchableOpacity
                style={s.toggleRow}
                onPress={() => { setIsDefault(v => !v); Haptics.selectionAsync(); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleTitle}>Standard-Depot</Text>
                  <Text style={s.toggleSub}>Wird beim Öffnen automatisch ausgewählt.</Text>
                </View>
                <View style={[s.toggle, isDefault && s.toggleOn]}>
                  <View style={[s.toggleThumb, isDefault && s.toggleThumbOn]} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={s.section}>
              <TouchableOpacity
                style={[s.primaryBtn, (!name.trim() || saving) && s.primaryBtnDisabled]}
                onPress={handleSave}
                disabled={!name.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.text.inverse} size="small" />
                ) : (
                  <Text style={s.primaryBtnText}>Änderungen speichern</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.dangerBtn}
                onPress={() => setConfirmDelete(true)}
              >
                <Ionicons name="trash-outline" size={16} color={theme.accent.negative} />
                <Text style={s.dangerBtnText}>Depot löschen</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => !deleting && setConfirmDelete(false)}>
          <Pressable style={s.modalOverlay} onPress={() => !deleting && setConfirmDelete(false)}>
            <Pressable style={s.confirmCard} onPress={e => e.stopPropagation()}>
              <View style={s.confirmIcon}>
                <Ionicons name="warning-outline" size={28} color={theme.accent.negative} />
              </View>
              <Text style={s.confirmTitle}>Depot wirklich löschen?</Text>
              <Text style={s.confirmText}>
                „{original.name}" und alle dazugehörigen Positionen sowie Transaktionen werden unwiderruflich gelöscht.
              </Text>
              <View style={s.confirmActions}>
                <TouchableOpacity
                  style={[s.confirmBtn, s.confirmCancel]}
                  onPress={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  <Text style={s.confirmCancelText}>Abbrechen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmBtn, s.confirmDelete]}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator color={theme.text.primary} size="small" />
                  ) : (
                    <Text style={s.confirmDeleteText}>Löschen</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },

  previewCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg,
    padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
    marginHorizontal: theme.space.lg, marginTop: theme.space.lg,
  },
  previewLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase', marginBottom: 4,
  },
  previewValue: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
  previewHint: {
    color: theme.text.tertiary, fontSize: theme.font.caption,
    paddingHorizontal: theme.space.lg, marginTop: theme.space.sm,
  },
  brokerDot: {
    width: 40, height: 40, borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },

  section: { paddingHorizontal: theme.space.lg, paddingTop: theme.space.xl },
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
    ...tabularStyle,
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
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: theme.bg.cardHover, padding: 2 },
  toggleOn: { backgroundColor: theme.accent.positive },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.text.primary },
  toggleThumbOn: { transform: [{ translateX: 18 }] },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.text.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md + 4,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: theme.text.inverse, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'transparent',
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md + 2,
    marginTop: theme.space.md,
  },
  dangerBtnText: { color: theme.accent.negative, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  modalOverlay: { flex: 1, backgroundColor: theme.bg.overlay, alignItems: 'center', justifyContent: 'center', padding: theme.space.xl },
  confirmCard: {
    width: '100%', backgroundColor: theme.bg.cardElevated,
    borderRadius: theme.radius.xl, padding: theme.space.xl,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: theme.accent.negativeSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.space.md,
  },
  confirmTitle: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold, marginBottom: theme.space.sm, textAlign: 'center' },
  confirmText: { color: theme.text.tertiary, fontSize: theme.font.body, textAlign: 'center', lineHeight: 19, marginBottom: theme.space.lg },
  confirmActions: { flexDirection: 'row', gap: theme.space.sm, width: '100%' },
  confirmBtn: { flex: 1, paddingVertical: theme.space.md + 2, borderRadius: theme.radius.md, alignItems: 'center' },
  confirmCancel: { backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default },
  confirmCancelText: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  confirmDelete: { backgroundColor: theme.accent.negative },
  confirmDeleteText: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
});
