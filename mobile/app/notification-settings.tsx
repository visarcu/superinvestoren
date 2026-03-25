import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Switch, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/auth';

interface NotifSettings {
  watchlist_enabled: boolean;
  watchlist_threshold_percent: number;
  earnings_enabled: boolean;
  earnings_days_before: number;
  earnings_email_enabled: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly';
}

const DEFAULTS: NotifSettings = {
  watchlist_enabled: true,
  watchlist_threshold_percent: 10,
  earnings_enabled: true,
  earnings_days_before: 3,
  earnings_email_enabled: false,
  email_frequency: 'immediate',
};

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotifSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSettings({
          watchlist_enabled: data.watchlist_enabled ?? DEFAULTS.watchlist_enabled,
          watchlist_threshold_percent: data.watchlist_threshold_percent ?? DEFAULTS.watchlist_threshold_percent,
          earnings_enabled: data.earnings_enabled ?? DEFAULTS.earnings_enabled,
          earnings_days_before: data.earnings_days_before ?? DEFAULTS.earnings_days_before,
          earnings_email_enabled: data.earnings_email_enabled ?? DEFAULTS.earnings_email_enabled,
          email_frequency: data.email_frequency ?? DEFAULTS.email_frequency,
        });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function save(updated: NotifSettings) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('notification_settings').upsert({
        user_id: user.id,
        ...updated,
      }, { onConflict: 'user_id' });
    } catch (e) {
      console.error(e);
      Alert.alert('Fehler', 'Einstellungen konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof NotifSettings>(key: K, value: NotifSettings[K]) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    save(updated);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <Stack.Screen options={{ title: 'Benachrichtigungen', headerStyle: { backgroundColor: '#0F172A' }, headerTintColor: '#F8FAFC', headerBackTitle: '' }} />
        <ActivityIndicator color="#22C55E" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <Stack.Screen options={{ title: 'Benachrichtigungen', headerStyle: { backgroundColor: '#0F172A' }, headerTintColor: '#F8FAFC', headerBackTitle: '' }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Info banner */}
        <View style={s.infoBanner}>
          <Ionicons name="notifications" size={18} color="#22C55E" />
          <Text style={s.infoText}>
            Push-Benachrichtigungen direkt aufs Handy. Einstellungen gelten auch für die Website.
          </Text>
          {saving && <ActivityIndicator size="small" color="#22C55E" style={{ marginLeft: 4 }} />}
        </View>

        {/* ── Watchlist-Dips ───────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>WATCHLIST KURSRÜCKGÄNGE</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Ionicons name="trending-down" size={18} color="#EF4444" style={s.rowIcon} />
                <View>
                  <Text style={s.rowLabel}>Kursrückgang-Alarm</Text>
                  <Text style={s.rowSub}>Noti wenn Aktie unter Schwelle fällt</Text>
                </View>
              </View>
              <Switch
                value={settings.watchlist_enabled}
                onValueChange={v => update('watchlist_enabled', v)}
                trackColor={{ false: '#1E293B', true: '#166534' }}
                thumbColor={settings.watchlist_enabled ? '#22C55E' : '#475569'}
              />
            </View>

            {settings.watchlist_enabled && (
              <>
                <View style={s.divider} />
                <View style={s.thresholdRow}>
                  <Text style={s.rowLabel}>Schwelle unter 52W-Hoch</Text>
                  <View style={s.thresholdBtns}>
                    {[5, 10, 15, 20, 25].map(pct => (
                      <TouchableOpacity
                        key={pct}
                        style={[s.thresholdBtn, settings.watchlist_threshold_percent === pct && s.thresholdBtnActive]}
                        onPress={() => update('watchlist_threshold_percent', pct)}
                      >
                        <Text style={[s.thresholdBtnText, settings.watchlist_threshold_percent === pct && s.thresholdBtnTextActive]}>
                          {pct}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Earnings ─────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>QUARTALSZAHLEN</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Ionicons name="calendar" size={18} color="#3B82F6" style={s.rowIcon} />
                <View>
                  <Text style={s.rowLabel}>Earnings-Erinnerung</Text>
                  <Text style={s.rowSub}>Vor anstehenden Quartalszahlen</Text>
                </View>
              </View>
              <Switch
                value={settings.earnings_enabled}
                onValueChange={v => update('earnings_enabled', v)}
                trackColor={{ false: '#1E293B', true: '#166534' }}
                thumbColor={settings.earnings_enabled ? '#22C55E' : '#475569'}
              />
            </View>

            {settings.earnings_enabled && (
              <>
                <View style={s.divider} />
                <View style={s.thresholdRow}>
                  <Text style={s.rowLabel}>Erinnerung</Text>
                  <View style={s.thresholdBtns}>
                    {[1, 2, 3, 5, 7].map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[s.thresholdBtn, settings.earnings_days_before === d && s.thresholdBtnActive]}
                        onPress={() => update('earnings_days_before', d)}
                      >
                        <Text style={[s.thresholdBtnText, settings.earnings_days_before === d && s.thresholdBtnTextActive]}>
                          {d}T
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── E-Mail ───────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>E-MAIL ZUSAMMENFASSUNG</Text>
          <View style={s.card}>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Ionicons name="mail" size={18} color="#F59E0B" style={s.rowIcon} />
                <View>
                  <Text style={s.rowLabel}>Earnings per E-Mail</Text>
                  <Text style={s.rowSub}>Zusammenfassung nach Quartalszahlen</Text>
                </View>
              </View>
              <Switch
                value={settings.earnings_email_enabled}
                onValueChange={v => update('earnings_email_enabled', v)}
                trackColor={{ false: '#1E293B', true: '#166534' }}
                thumbColor={settings.earnings_email_enabled ? '#22C55E' : '#475569'}
              />
            </View>

            <View style={s.divider} />

            <View style={s.freqRow}>
              <Text style={s.rowLabel}>Häufigkeit</Text>
              <View style={s.freqBtns}>
                {([
                  { val: 'immediate', label: 'Sofort' },
                  { val: 'daily', label: 'Täglich' },
                  { val: 'weekly', label: 'Wöchentlich' },
                ] as const).map(({ val, label }) => (
                  <TouchableOpacity
                    key={val}
                    style={[s.freqBtn, settings.email_frequency === val && s.freqBtnActive]}
                    onPress={() => update('email_frequency', val)}
                  >
                    <Text style={[s.freqBtnText, settings.email_frequency === val && s.freqBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, padding: 14,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  infoText: { color: '#94A3B8', fontSize: 13, flex: 1, lineHeight: 18 },

  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  card: {
    backgroundColor: '#0F172A', borderRadius: 16,
    borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: '#1E293B', marginLeft: 46 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  rowIcon: { width: 20 },
  rowLabel: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  rowSub: { color: '#475569', fontSize: 12, marginTop: 2 },

  // Threshold buttons
  thresholdRow: { padding: 16, gap: 10 },
  thresholdBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  thresholdBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
  },
  thresholdBtnActive: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22C55E' },
  thresholdBtnText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  thresholdBtnTextActive: { color: '#22C55E' },

  // Frequency buttons
  freqRow: { padding: 16, gap: 10 },
  freqBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  freqBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
  },
  freqBtnActive: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: '#22C55E' },
  freqBtnText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  freqBtnTextActive: { color: '#22C55E' },
});
