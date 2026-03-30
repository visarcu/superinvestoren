import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Modal, TextInput, Pressable, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/auth';
import StockLogo from '../components/StockLogo';

const BASE_URL = 'https://finclue.de';

function fmtDE(v: number, d = 2) {
  return v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}

interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  target_price: number;
  current_price: number | null;
  triggered: boolean;
  triggered_at: string | null;
  active: boolean;
  created_at: string;
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Modal state
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('below');
  const [targetPrice, setTargetPrice] = useState('');
  const [currentPricePreview, setCurrentPricePreview] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { loadAlerts(); }, []));

  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace('/(auth)/login');
      return null;
    }
    return data.session.access_token;
  }

  async function loadAlerts() {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${BASE_URL}/api/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setAlerts([]); return; }
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrentPrice(sym: string) {
    if (!sym || sym.length < 1) { setCurrentPricePreview(null); return; }
    try {
      setPriceLoading(true);
      const res = await fetch(`${BASE_URL}/api/quotes?symbols=${sym.toUpperCase()}`);
      if (!res.ok) { setCurrentPricePreview(null); return; }
      const data = await res.json();
      const quotes = data.quotes || data;
      const q = Array.isArray(quotes) ? quotes[0] : quotes;
      setCurrentPricePreview(q?.price ?? null);
    } catch {
      setCurrentPricePreview(null);
    } finally {
      setPriceLoading(false);
    }
  }

  async function handleSave() {
    if (!symbol.trim()) { Alert.alert('Fehler', 'Bitte gib ein Tickersymbol ein.'); return; }
    if (!targetPrice.trim() || isNaN(parseFloat(targetPrice.replace(',', '.')))) {
      Alert.alert('Fehler', 'Bitte gib einen gültigen Zielkurs ein.');
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${BASE_URL}/api/alerts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: symbol.toUpperCase().trim(),
          condition,
          targetPrice: parseFloat(targetPrice.replace(',', '.')),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        Alert.alert('Fehler', err.error || 'Alarm konnte nicht erstellt werden.');
        return;
      }

      resetModal();
      await loadAlerts();
    } catch (e) {
      Alert.alert('Fehler', 'Netzwerkfehler. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, sym: string) {
    Alert.alert(
      'Alarm löschen',
      `Kursalarm für ${sym} wirklich löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;
              await fetch(`${BASE_URL}/api/alerts/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              await loadAlerts();
            } catch (e) {
              Alert.alert('Fehler', 'Alarm konnte nicht gelöscht werden.');
            }
          },
        },
      ]
    );
  }

  function resetModal() {
    setShowModal(false);
    setSymbol('');
    setCondition('below');
    setTargetPrice('');
    setCurrentPricePreview(null);
  }

  function handleSymbolBlur() {
    if (symbol.trim().length > 0) fetchCurrentPrice(symbol.trim());
  }

  return (
    <SafeAreaView style={s.safeArea}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kursalarme</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {loading ? (
          <ActivityIndicator color="#22C55E" size="large" style={{ marginTop: 60 }} />
        ) : alerts.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color="#334155" />
            <Text style={s.emptyTitle}>Kein Alarm aktiv</Text>
            <Text style={s.emptySubtitle}>
              Tippe auf + um deinen ersten Kursalarm zu setzen
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowModal(true)}>
              <Text style={s.emptyBtnText}>Kursalarm erstellen</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.list}>
            {alerts.map((alert) => (
              <View key={alert.id} style={[s.alertCard, alert.triggered && s.alertCardTriggered]}>
                {/* Logo + Symbol */}
                <View style={s.alertLeft}>
                  <StockLogo ticker={alert.symbol} size={40} borderRadius={10} />
                  <View style={s.alertInfo}>
                    <Text style={[s.alertSymbol, alert.triggered && s.textMuted]}>{alert.symbol}</Text>
                    <View style={s.badgeRow}>
                      <View style={[s.condBadge, alert.condition === 'above' ? s.condAbove : s.condBelow]}>
                        <Text style={[s.condBadgeText, alert.condition === 'above' ? s.condAboveText : s.condBelowText]}>
                          {alert.condition === 'above' ? '↑ ÜBER' : '↓ UNTER'}
                        </Text>
                      </View>
                      <Text style={[s.targetPrice, alert.triggered && s.textMuted]}>
                        {fmtDE(Number(alert.target_price))} $
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right side: triggered badge or delete */}
                <View style={s.alertRight}>
                  {alert.triggered ? (
                    <View style={s.triggeredBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                      <Text style={s.triggeredText}>Ausgelöst</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.deleteBtn}
                      onPress={() => handleDelete(alert.id, alert.symbol)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Alert Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={resetModal}
      >
        <Pressable style={s.modalBackdrop} onPress={resetModal} />
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Kursalarm erstellen</Text>

          {/* Symbol Input */}
          <Text style={s.inputLabel}>Tickersymbol</Text>
          <TextInput
            style={s.input}
            value={symbol}
            onChangeText={(t) => setSymbol(t.toUpperCase())}
            onBlur={handleSymbolBlur}
            placeholder="z.B. AAPL, MSFT, NVDA"
            placeholderTextColor="#475569"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {/* Current price preview */}
          {priceLoading && (
            <ActivityIndicator color="#22C55E" size="small" style={{ marginBottom: 8, alignSelf: 'flex-start' }} />
          )}
          {!priceLoading && currentPricePreview != null && (
            <Text style={s.currentPriceHint}>
              Aktueller Kurs: <Text style={s.currentPriceValue}>{fmtDE(currentPricePreview)} $</Text>
            </Text>
          )}

          {/* Condition Toggle */}
          <Text style={s.inputLabel}>Bedingung</Text>
          <View style={s.condToggleRow}>
            <TouchableOpacity
              style={[s.condToggleBtn, condition === 'below' && s.condToggleBtnActive]}
              onPress={() => setCondition('below')}
            >
              <Text style={[s.condToggleBtnText, condition === 'below' && s.condToggleBtnTextActive]}>
                ↓ Unter
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.condToggleBtn, condition === 'above' && s.condToggleBtnActive]}
              onPress={() => setCondition('above')}
            >
              <Text style={[s.condToggleBtnText, condition === 'above' && s.condToggleBtnTextActive]}>
                ↑ Über
              </Text>
            </TouchableOpacity>
          </View>

          {/* Target Price */}
          <Text style={s.inputLabel}>Zielkurs (USD)</Text>
          <TextInput
            style={s.input}
            value={targetPrice}
            onChangeText={setTargetPrice}
            placeholder="z.B. 180.00"
            placeholderTextColor="#475569"
            keyboardType="decimal-pad"
          />

          {/* Save Button */}
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveBtnText}>Alarm speichern</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={resetModal}>
            <Text style={s.cancelBtnText}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a0b' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e1e20',
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '700' },
  addBtn: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingVertical: 16 },

  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { color: '#475569', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: {
    marginTop: 24, backgroundColor: '#EF4444', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  list: { paddingHorizontal: 16, gap: 10 },

  alertCard: {
    backgroundColor: '#111113', borderRadius: 14, borderWidth: 1, borderColor: '#1e1e20',
    padding: 14, flexDirection: 'row', alignItems: 'center',
  },
  alertCardTriggered: { opacity: 0.6 },
  alertLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertInfo: { flex: 1 },
  alertSymbol: { color: '#F8FAFC', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  condBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  condAbove: { backgroundColor: 'rgba(34,197,94,0.12)' },
  condBelow: { backgroundColor: 'rgba(239,68,68,0.12)' },
  condBadgeText: { fontSize: 11, fontWeight: '700' },
  condAboveText: { color: '#22C55E' },
  condBelowText: { color: '#EF4444' },
  targetPrice: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  textMuted: { color: '#475569' },

  alertRight: { alignItems: 'center' },
  deleteBtn: { padding: 8 },
  triggeredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  triggeredText: { color: '#22C55E', fontSize: 12, fontWeight: '600' },

  // Modal
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#111113',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: '#1e1e20',
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#334155',
    alignSelf: 'center', marginTop: 12, marginBottom: 8,
  },
  modalTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginBottom: 20 },
  inputLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#0a0a0b', borderRadius: 10, borderWidth: 1, borderColor: '#1e1e20',
    color: '#F8FAFC', fontSize: 15, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: 14,
  },
  currentPriceHint: { color: '#475569', fontSize: 13, marginBottom: 10 },
  currentPriceValue: { color: '#22C55E', fontWeight: '700' },

  condToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  condToggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#1e1e20', alignItems: 'center',
    backgroundColor: '#0a0a0b',
  },
  condToggleBtnActive: { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.08)' },
  condToggleBtnText: { color: '#475569', fontSize: 14, fontWeight: '600' },
  condToggleBtnTextActive: { color: '#EF4444' },

  saveBtn: {
    backgroundColor: '#EF4444', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 10,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    backgroundColor: '#1e293b', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },
});
