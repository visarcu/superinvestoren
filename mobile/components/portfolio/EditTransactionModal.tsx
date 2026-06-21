import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet,
  Modal, Pressable, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/auth';
import { theme, tabularStyle } from '../../lib/theme';
import { Transaction } from './TransactionsView';

interface Props {
  transaction: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

function parseDE(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}
function fmtDEInput(v: number): string {
  if (!v) return '';
  return v.toString().replace('.', ',');
}

export default function EditTransactionModal({ transaction, onClose, onSaved }: Props) {
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [fee, setFee] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setQuantity(fmtDEInput(transaction.quantity));
      setPrice(fmtDEInput(transaction.price));
      setDate(transaction.date.split('T')[0]); // YYYY-MM-DD
      setFee(transaction.fee ? fmtDEInput(transaction.fee) : '');
      setNotes(transaction.notes || '');
    }
  }, [transaction]);

  const isCash = transaction?.type === 'cash_deposit' || transaction?.type === 'cash_withdrawal';

  async function handleSave() {
    if (!transaction) return;
    const qNum = isCash ? 1 : parseDE(quantity);
    const pNum = parseDE(price);
    const fNum = fee ? parseDE(fee) : 0;

    if (!isCash && qNum <= 0) {
      Alert.alert('Hinweis', 'Stückzahl muss > 0 sein');
      return;
    }
    if (pNum < 0) {
      Alert.alert('Hinweis', 'Preis muss ≥ 0 sein');
      return;
    }
    if (!date) {
      Alert.alert('Hinweis', 'Datum erforderlich');
      return;
    }
    // Datum nicht in der Zukunft
    if (new Date(date) > new Date()) {
      Alert.alert('Hinweis', 'Datum darf nicht in der Zukunft liegen');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('portfolio_transactions')
        .update({
          quantity: qNum,
          price: pNum,
          total_value: qNum * pNum,
          fee: fNum > 0 ? fNum : null,
          date,
          notes: notes.trim() || null,
        })
        .eq('id', transaction.id);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Änderungen konnten nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={!!transaction} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={s.overlay} onPress={() => !saving && onClose()}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 30 }}>
              <View style={s.header}>
                <Text style={s.title}>Transaktion bearbeiten</Text>
                <TouchableOpacity onPress={onClose} disabled={saving}>
                  <Ionicons name="close" size={22} color={theme.text.tertiary} />
                </TouchableOpacity>
              </View>

              {transaction && (
                <View style={s.metaCard}>
                  <Text style={s.metaLabel}>SYMBOL</Text>
                  <Text style={s.metaValue}>{transaction.symbol}</Text>
                </View>
              )}

              <View style={s.content}>
                {!isCash && (
                  <>
                    <Text style={s.inputLabel}>Stückzahl</Text>
                    <TextInput
                      style={s.input}
                      value={quantity}
                      onChangeText={setQuantity}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={theme.text.muted}
                    />
                  </>
                )}

                <Text style={[s.inputLabel, !isCash && { marginTop: theme.space.lg }]}>
                  {isCash ? 'Betrag (€)' : 'Preis je Stück (€)'}
                </Text>
                <TextInput
                  style={s.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={theme.text.muted}
                />

                <Text style={[s.inputLabel, { marginTop: theme.space.lg }]}>Datum (JJJJ-MM-TT)</Text>
                <TextInput
                  style={s.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2026-01-15"
                  placeholderTextColor={theme.text.muted}
                  maxLength={10}
                />

                {!isCash && (
                  <>
                    <Text style={[s.inputLabel, { marginTop: theme.space.lg }]}>Gebühren (€, optional)</Text>
                    <TextInput
                      style={s.input}
                      value={fee}
                      onChangeText={setFee}
                      keyboardType="decimal-pad"
                      placeholder="0,00"
                      placeholderTextColor={theme.text.muted}
                    />
                  </>
                )}

                <Text style={[s.inputLabel, { marginTop: theme.space.lg }]}>Notizen (optional)</Text>
                <TextInput
                  style={[s.input, { minHeight: 80, textAlignVertical: 'top' as any }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Notizen…"
                  placeholderTextColor={theme.text.muted}
                  multiline
                  maxLength={200}
                />

                <View style={s.hint}>
                  <Ionicons name="information-circle-outline" size={14} color={theme.text.tertiary} />
                  <Text style={s.hintText}>
                    Änderungen an Transaktionen aktualisieren bestehende Positionen nicht automatisch.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[s.saveBtn, saving && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={theme.text.inverse} size="small" />
                  ) : (
                    <Text style={s.saveBtnText}>Speichern</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.bg.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.bg.cardElevated,
    borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl,
    maxHeight: '90%', paddingTop: theme.space.md,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border.strong,
    alignSelf: 'center', marginBottom: theme.space.lg,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.lg, marginBottom: theme.space.md,
  },
  title: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold },
  metaCard: {
    marginHorizontal: theme.space.lg,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md, padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
    marginBottom: theme.space.md,
  },
  metaLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase', marginBottom: 4,
  },
  metaValue: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },

  content: { paddingHorizontal: theme.space.lg },
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

  hint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: theme.space.lg, padding: theme.space.md,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.sm,
  },
  hintText: { flex: 1, color: theme.text.tertiary, fontSize: theme.font.caption, lineHeight: 16 },

  saveBtn: {
    backgroundColor: theme.text.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md + 4,
    alignItems: 'center', marginTop: theme.space.lg,
  },
  saveBtnText: { color: theme.text.inverse, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
});
