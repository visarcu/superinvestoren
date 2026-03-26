import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal, ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/auth';
import StockLogo from '../components/StockLogo';

const BASE_URL = 'https://finclue.de';
const ALERTS_KEY = 'alerts_modal_shown';

export default function AddTransactionScreen() {
  const [symbol, setSymbol] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [saving, setSaving] = useState(false);

  // Manage Alerts modal
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [alertDip, setAlertDip] = useState(true);
  const [alertDigest, setAlertDigest] = useState(true);
  const [savingAlerts, setSavingAlerts] = useState(false);

  async function searchStock() {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`${BASE_URL}/api/quotes?symbols=${sym}`);
      if (!res.ok) throw new Error('Netzwerkfehler');
      const data = await res.json();
      const found = Array.isArray(data) ? data[0] : null;
      if (found?.symbol) {
        setSearchResult(found);
        if (found.price) setPurchasePrice(found.price.toFixed(2));
      } else {
        Alert.alert('Nicht gefunden', `"${sym}" konnte nicht gefunden werden.\nBitte prüfe das Ticker-Symbol.`);
      }
    } catch {
      Alert.alert('Fehler', 'Aktie konnte nicht geladen werden.');
    } finally {
      setSearching(false);
    }
  }

  async function saveTransaction() {
    if (!searchResult) return;
    const qty = parseFloat(quantity.replace(',', '.'));
    const price = parseFloat(purchasePrice.replace(',', '.'));
    if (!qty || qty <= 0) { Alert.alert('Eingabefehler', 'Anzahl muss größer als 0 sein.'); return; }
    if (!price || price <= 0) { Alert.alert('Eingabefehler', 'Kaufpreis muss größer als 0 sein.'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/login'); return; }

      // Get or create first portfolio
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);

      let portfolioId: string;
      if (!portfolios?.length) {
        const { data: newP, error: pErr } = await supabase
          .from('portfolios')
          .insert({ user_id: user.id, name: 'Mein Portfolio' })
          .select('id')
          .single();
        if (pErr) throw pErr;
        portfolioId = newP.id;
      } else {
        portfolioId = portfolios[0].id;
      }

      // Check if holding already exists → average
      const { data: existing } = await supabase
        .from('portfolio_holdings')
        .select('id, quantity, purchase_price')
        .eq('portfolio_id', portfolioId)
        .eq('symbol', searchResult.symbol)
        .maybeSingle();

      if (existing) {
        const totalShares = existing.quantity + qty;
        const avgPrice = ((existing.purchase_price * existing.quantity) + (price * qty)) / totalShares;
        const { error: uErr } = await supabase
          .from('portfolio_holdings')
          .update({ quantity: totalShares, purchase_price: avgPrice, current_price: searchResult.price })
          .eq('id', existing.id);
        if (uErr) throw uErr;
      } else {
        const { error: iErr } = await supabase
          .from('portfolio_holdings')
          .insert({
            portfolio_id: portfolioId,
            symbol: searchResult.symbol,
            name: searchResult.name || searchResult.symbol,
            quantity: qty,
            purchase_price: price,
            current_price: searchResult.price,
          });
        if (iErr) throw iErr;
      }

      // Show alerts modal once
      const shown = await AsyncStorage.getItem(ALERTS_KEY);
      if (!shown) {
        setShowAlertsModal(true);
      } else {
        router.back();
      }
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Transaktion konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAlertsDone() {
    setSavingAlerts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (alertDip || alertDigest)) {
        await supabase.from('notification_settings').upsert({
          user_id: user.id,
          watchlist_enabled: alertDip,
          earnings_email_enabled: alertDigest,
          email_frequency: alertDigest ? 'daily' : 'immediate',
        }, { onConflict: 'user_id' });
      }
      await AsyncStorage.setItem(ALERTS_KEY, '1');
    } catch (e) {
      console.error(e);
    } finally {
      setSavingAlerts(false);
      setShowAlertsModal(false);
      router.back();
    }
  }

  function handleAlertsAdvanced() {
    AsyncStorage.setItem(ALERTS_KEY, '1');
    setShowAlertsModal(false);
    router.back();
    setTimeout(() => router.push('/notification-settings'), 300);
  }

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{
        title: 'Transaktion hinzufügen',
        headerStyle: { backgroundColor: '#111113' },
        headerTintColor: '#F8FAFC',
        headerBackTitle: '',
      }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* ── Aktie suchen ── */}
          <Text style={s.sectionTitle}>AKTIE</Text>
          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              placeholder="Ticker-Symbol (z.B. AAPL)"
              placeholderTextColor="#475569"
              value={symbol}
              onChangeText={t => { setSymbol(t.toUpperCase()); setSearchResult(null); }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={searchStock}
            />
            <TouchableOpacity
              style={[s.searchBtn, (!symbol.trim() || searching) && { opacity: 0.5 }]}
              onPress={searchStock}
              disabled={searching || !symbol.trim()}
            >
              {searching
                ? <ActivityIndicator size="small" color="#F8FAFC" />
                : <Ionicons name="search" size={20} color="#F8FAFC" />}
            </TouchableOpacity>
          </View>

          {/* Result card */}
          {searchResult && (
            <View style={s.stockCard}>
              <StockLogo ticker={searchResult.symbol} size={42} borderRadius={10} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.stockSymbol}>{searchResult.symbol}</Text>
                <Text style={s.stockName} numberOfLines={1}>{searchResult.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.stockPrice}>${searchResult.price?.toFixed(2)}</Text>
                <Text style={s.stockExchange}>{searchResult.exchange}</Text>
              </View>
            </View>
          )}

          {/* ── Transaktionsdaten ── */}
          {searchResult && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 24 }]}>TRANSAKTION</Text>

              <Text style={s.label}>Anzahl Aktien</Text>
              <TextInput
                style={s.input}
                placeholder="z.B. 10"
                placeholderTextColor="#475569"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />

              <Text style={[s.label, { marginTop: 14 }]}>Kaufpreis pro Aktie ($)</Text>
              <TextInput
                style={s.input}
                placeholder="z.B. 150.00"
                placeholderTextColor="#475569"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
                keyboardType="decimal-pad"
              />

              {/* Gesamtwert preview */}
              {quantity && purchasePrice ? (() => {
                const qty = parseFloat(quantity.replace(',', '.'));
                const price = parseFloat(purchasePrice.replace(',', '.'));
                const total = qty * price;
                return isNaN(total) ? null : (
                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>Gesamtinvestition</Text>
                    <Text style={s.totalValue}>
                      ${total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                );
              })() : null}

              <TouchableOpacity
                style={[s.saveBtn, (saving || !quantity || !purchasePrice) && s.saveBtnDisabled]}
                onPress={saveTransaction}
                disabled={saving || !quantity || !purchasePrice}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#0a0a0b" />
                  : <Text style={s.saveBtnText}>Hinzufügen</Text>}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Manage Alerts Modal ── */}
      <Modal visible={showAlertsModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.bellWrap}>
              <Ionicons name="notifications" size={36} color="#F97316" />
            </View>

            <Text style={s.modalTitle}>Benachrichtigungen</Text>
            <Text style={s.modalSub}>für finclue</Text>

            <View style={s.alertOptions}>
              <TouchableOpacity style={s.alertRow} onPress={() => setAlertDip(v => !v)} activeOpacity={0.7}>
                <View style={[s.checkbox, alertDip && s.checkboxOn]}>
                  {alertDip && <Ionicons name="checkmark" size={13} color="#F8FAFC" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.alertLabel}>Kursrückgang-Alarm</Text>
                  <Text style={s.alertSub}>Wenn deine Aktien stark fallen</Text>
                </View>
              </TouchableOpacity>

              <View style={s.alertDiv} />

              <TouchableOpacity style={s.alertRow} onPress={() => setAlertDigest(v => !v)} activeOpacity={0.7}>
                <View style={[s.checkbox, alertDigest && s.checkboxOn]}>
                  {alertDigest && <Ionicons name="checkmark" size={13} color="#F8FAFC" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.alertLabel}>Portfolio Digest</Text>
                  <Text style={s.alertSub}>Tägliche Zusammenfassung deines Portfolios</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.doneBtn, savingAlerts && { opacity: 0.6 }]}
              onPress={handleAlertsDone}
              disabled={savingAlerts}
            >
              {savingAlerts
                ? <ActivityIndicator size="small" color="#0a0a0b" />
                : <Text style={s.doneBtnText}>Fertig</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleAlertsAdvanced}>
              <Text style={s.advancedLink}>
                Weitere Optionen unter{' '}
                <Text style={s.advancedHighlight}>Erweiterte Einstellungen</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  content: { padding: 16 },

  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  label: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 8 },

  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: '#111113', borderRadius: 12,
    borderWidth: 1, borderColor: '#1e1e20',
    color: '#F8FAFC', fontSize: 16, paddingHorizontal: 14, paddingVertical: 13,
  },
  searchBtn: {
    backgroundColor: '#1e1e20', borderRadius: 12, width: 50,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2c2c2e',
  },

  stockCard: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10,
    backgroundColor: '#111113', borderRadius: 14,
    borderWidth: 1, borderColor: '#1e1e20', padding: 14,
  },
  stockSymbol: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  stockName: { color: '#64748B', fontSize: 12, marginTop: 2 },
  stockPrice: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  stockExchange: { color: '#475569', fontSize: 11, marginTop: 2 },

  input: {
    backgroundColor: '#111113', borderRadius: 12,
    borderWidth: 1, borderColor: '#1e1e20',
    color: '#F8FAFC', fontSize: 16, paddingHorizontal: 14, paddingVertical: 13,
  },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingHorizontal: 4,
  },
  totalLabel: { color: '#64748B', fontSize: 13 },
  totalValue: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },

  saveBtn: {
    marginTop: 28, backgroundColor: '#F8FAFC', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: '#0a0a0b', fontSize: 16, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' },
  modalSheet: {
    backgroundColor: '#111113', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 44, alignItems: 'center',
    borderWidth: 1, borderColor: '#1e1e20',
  },
  bellWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(249,115,22,0.12)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: { color: '#F8FAFC', fontSize: 22, fontWeight: '700' },
  modalSub: { color: '#64748B', fontSize: 14, marginTop: 2, marginBottom: 24 },

  alertOptions: {
    width: '100%', backgroundColor: '#0a0a0b', borderRadius: 16,
    borderWidth: 1, borderColor: '#1e1e20', marginBottom: 20, overflow: 'hidden',
  },
  alertRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  alertDiv: { height: 1, backgroundColor: '#1e1e20' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: '#1e1e20', borderWidth: 1, borderColor: '#2c2c2e',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#374151', borderColor: '#64748B' },
  alertLabel: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  alertSub: { color: '#64748B', fontSize: 12, marginTop: 2 },

  doneBtn: {
    width: '100%', backgroundColor: '#F8FAFC', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  doneBtnText: { color: '#0a0a0b', fontSize: 16, fontWeight: '700' },
  advancedLink: { color: '#64748B', fontSize: 13, textAlign: 'center' },
  advancedHighlight: { color: '#94A3B8', textDecorationLine: 'underline' },
});
