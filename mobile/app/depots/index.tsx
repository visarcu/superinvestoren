import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, StyleSheet, Modal, Pressable, Alert,
} from 'react-native';
import { router, useFocusEffect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/auth';
import { theme, tabularStyle, perfColor } from '../../lib/theme';
import { getBrokerConfig, getBrokerDisplayName, getBrokerColor, BrokerType } from '../../lib/brokerConfig';

const BASE_URL = 'https://finclue.de';

interface Depot {
  id: string;
  name: string;
  broker_type: BrokerType;
  broker_name: string | null;
  broker_color: string | null;
  cash_position: number;
  is_default: boolean;
  currency: string;
}

interface DepotStats {
  value: number;
  cost: number;
  gain: number;
  gainPct: number;
  count: number;
}

function fmtDE(v: number, d = 2) {
  return Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtCurrency(v: number) { return `${fmtDE(v)} €`; }
function fmtPct(v: number) {
  return `${v >= 0 ? '+' : '-'}${fmtDE(Math.abs(v))} %`;
}
function fmtBig(v: number) {
  if (Math.abs(v) >= 1e9) return `${fmtDE(v / 1e9, 1)} Mrd. €`;
  if (Math.abs(v) >= 1e6) return `${fmtDE(v / 1e6, 1)} Mio. €`;
  return fmtCurrency(v);
}

export default function DepotsScreen() {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [stats, setStats] = useState<Record<string, DepotStats>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Depot | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(useCallback(() => { loadDepots(); }, []));

  async function loadDepots() {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      const { data, error: dbError } = await supabase
        .from('portfolios')
        .select('id, name, broker_type, broker_name, broker_color, cash_position, is_default, currency')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;
      const list = (data as Depot[]) || [];
      setDepots(list);

      // Stats pro Depot vom Server (gleicher Endpoint wie Portfolio-Tab)
      const statsResults = await Promise.allSettled(
        list.map(d =>
          fetch(`${BASE_URL}/api/portfolio/summary?portfolioId=${d.id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).then(r => r.ok ? r.json() : null)
        )
      );

      const statsMap: Record<string, DepotStats> = {};
      statsResults.forEach((r, i) => {
        if (r.status !== 'fulfilled' || !r.value) return;
        const d = r.value;
        const cost = d.totalCost || 0;
        const value = d.totalValue || 0;
        const gain = value - cost;
        statsMap[list[i].id] = {
          value, cost, gain,
          gainPct: cost > 0 ? (gain / cost) * 100 : 0,
          count: d.holdings?.length || 0,
        };
      });
      setStats(statsMap);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  async function setAsDefault(depot: Depot) {
    if (depot.is_default) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Alle anderen auf false, dann dieses auf true
      await supabase.from('portfolios')
        .update({ is_default: false }).eq('user_id', session.user.id);
      await supabase.from('portfolios')
        .update({ is_default: true }).eq('id', depot.id);

      setDepots(prev => prev.map(d => ({ ...d, is_default: d.id === depot.id })));
    } catch {/* silent */}
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const id = confirmDelete.id;

      // 1. Holdings 2. Transactions 3. Portfolio (Reihenfolge wichtig – kein DB-Cascade)
      await supabase.from('portfolio_holdings').delete().eq('portfolio_id', id);
      await supabase.from('portfolio_transactions').delete().eq('portfolio_id', id);
      const { error: delErr } = await supabase
        .from('portfolios').delete()
        .eq('id', id).eq('user_id', session.user.id);
      if (delErr) throw delErr;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmDelete(null);
      await loadDepots();
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Depot konnte nicht gelöscht werden');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Meine Depots' }} />
      <SafeAreaView style={s.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDepots(); }} tintColor={theme.accent.positive} />}
        >
          {loading ? (
            <ActivityIndicator color={theme.accent.positive} style={{ marginTop: 80 }} />
          ) : error ? (
            <View style={s.emptyState}>
              <Ionicons name="alert-circle-outline" size={40} color={theme.accent.negative} />
              <Text style={s.emptyTitle}>Fehler</Text>
              <Text style={s.emptyText}>{error}</Text>
            </View>
          ) : depots.length === 0 ? (
            <View style={s.emptyState}>
              <View style={s.emptyIcon}>
                <Ionicons name="briefcase-outline" size={28} color={theme.text.tertiary} />
              </View>
              <Text style={s.emptyTitle}>Noch keine Depots</Text>
              <Text style={s.emptyText}>Lege dein erstes Depot an, um Positionen zu tracken.</Text>
              <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/depots/neu')}>
                <Ionicons name="add-circle-outline" size={18} color={theme.text.inverse} />
                <Text style={s.primaryBtnText}>Erstes Depot anlegen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ paddingHorizontal: theme.space.lg, paddingTop: theme.space.lg }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.space.lg }}>
                <View>
                  <Text style={s.h1}>Meine Depots</Text>
                  <Text style={s.subtitle}>{depots.length} {depots.length === 1 ? 'Depot' : 'Depots'}</Text>
                </View>
                <TouchableOpacity style={s.addBtn} onPress={() => router.push('/depots/neu')}>
                  <Ionicons name="add" size={22} color={theme.text.primary} />
                </TouchableOpacity>
              </View>

              {/* Depot Cards */}
              {depots.map((depot) => {
                const stat = stats[depot.id];
                const broker = getBrokerConfig(depot.broker_type);
                const brokerColor = getBrokerColor(depot.broker_type, depot.broker_color);
                const brokerLabel = getBrokerDisplayName(depot.broker_type, depot.broker_name);
                return (
                  <View key={depot.id} style={s.card}>
                    {/* Header Row */}
                    <View style={s.cardHeader}>
                      <View style={[s.brokerDot, { backgroundColor: brokerColor }]}>
                        <Ionicons name={broker.ionIcon as any} size={16} color="#fff" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={s.depotName} numberOfLines={1}>{depot.name}</Text>
                          {depot.is_default && <Ionicons name="star" size={12} color={theme.accent.warning} />}
                        </View>
                        <Text style={s.depotBroker} numberOfLines={1}>{brokerLabel}</Text>
                      </View>
                    </View>

                    {/* Stats Row */}
                    {stat && (
                      <View style={s.statsRow}>
                        <View style={s.statCell}>
                          <Text style={s.statLabel}>Wert</Text>
                          <Text style={s.statValue}>{fmtBig(stat.value)}</Text>
                        </View>
                        <View style={s.statCell}>
                          <Text style={s.statLabel}>G/V</Text>
                          <Text style={[s.statValue, { color: perfColor(stat.gain) }]}>
                            {fmtPct(stat.gainPct)}
                          </Text>
                        </View>
                        <View style={s.statCell}>
                          <Text style={s.statLabel}>Positionen</Text>
                          <Text style={s.statValue}>{stat.count}</Text>
                        </View>
                      </View>
                    )}

                    {depot.cash_position > 0 && (
                      <View style={s.cashRow}>
                        <Ionicons name="cash-outline" size={12} color={theme.text.tertiary} />
                        <Text style={s.cashText}>Cash: {fmtCurrency(depot.cash_position)}</Text>
                      </View>
                    )}

                    {/* Action Row */}
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={s.actionBtn}
                        onPress={() => setAsDefault(depot)}
                        disabled={depot.is_default}
                      >
                        <Ionicons
                          name={depot.is_default ? 'star' : 'star-outline'}
                          size={15}
                          color={depot.is_default ? theme.accent.warning : theme.text.secondary}
                        />
                        <Text style={[s.actionText, depot.is_default && { color: theme.accent.warning }]}>
                          {depot.is_default ? 'Standard' : 'Als Standard'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.actionBtn} onPress={() => router.push(`/depots/${depot.id}/edit`)}>
                        <Ionicons name="create-outline" size={15} color={theme.text.secondary} />
                        <Text style={s.actionText}>Bearbeiten</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.actionBtn} onPress={() => setConfirmDelete(depot)}>
                        <Ionicons name="trash-outline" size={15} color={theme.accent.negative} />
                        <Text style={[s.actionText, { color: theme.accent.negative }]}>Löschen</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* New Depot CTA */}
              <TouchableOpacity style={s.newDepotCta} onPress={() => router.push('/depots/neu')}>
                <Ionicons name="add-circle-outline" size={18} color={theme.text.primary} />
                <Text style={s.newDepotCtaText}>Neues Depot anlegen</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Delete Confirmation Modal */}
        <Modal visible={!!confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(null)}>
          <Pressable style={s.modalOverlay} onPress={() => !deleting && setConfirmDelete(null)}>
            <Pressable style={s.confirmCard} onPress={e => e.stopPropagation()}>
              <View style={s.confirmIcon}>
                <Ionicons name="warning-outline" size={28} color={theme.accent.negative} />
              </View>
              <Text style={s.confirmTitle}>Depot wirklich löschen?</Text>
              <Text style={s.confirmText}>
                „{confirmDelete?.name}" und alle dazugehörigen Positionen sowie Transaktionen werden unwiderruflich gelöscht.
              </Text>
              <View style={s.confirmActions}>
                <TouchableOpacity
                  style={[s.confirmBtn, s.confirmCancel]}
                  onPress={() => setConfirmDelete(null)}
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

  h1: { color: theme.text.primary, fontSize: 22, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight },
  subtitle: { color: theme.text.tertiary, fontSize: theme.font.body, marginTop: 2 },
  addBtn: {
    width: 34, height: 34, borderRadius: theme.radius.full,
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center',
  },

  card: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
    marginBottom: theme.space.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.space.md, marginBottom: theme.space.lg },
  brokerDot: {
    width: 36, height: 36, borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  depotName: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal },
  depotBroker: { color: theme.text.tertiary, fontSize: theme.font.body, marginTop: 2 },

  statsRow: {
    flexDirection: 'row', gap: theme.space.md,
    paddingTop: theme.space.md,
    borderTopWidth: 1, borderTopColor: theme.border.default,
  },
  statCell: { flex: 1 },
  statLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.medium, letterSpacing: theme.tracking.wide,
    textTransform: 'uppercase', marginBottom: 4,
  },
  statValue: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold, ...tabularStyle },

  cashRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: theme.space.md, paddingTop: theme.space.md - 2,
    borderTopWidth: 1, borderTopColor: theme.border.default,
  },
  cashText: { color: theme.text.tertiary, fontSize: theme.font.caption, ...tabularStyle },

  actionRow: {
    flexDirection: 'row', gap: theme.space.xs,
    marginTop: theme.space.md, paddingTop: theme.space.md - 2,
    borderTopWidth: 1, borderTopColor: theme.border.default,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: theme.space.sm + 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.bg.cardHover,
  },
  actionText: { color: theme.text.secondary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold },

  newDepotCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.space.sm, marginTop: theme.space.sm,
    paddingVertical: theme.space.lg,
    backgroundColor: theme.bg.card, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default, borderStyle: 'dashed' as any,
  },
  newDepotCtaText: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32, gap: 10 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: theme.radius.lg,
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center', marginBottom: theme.space.md,
  },
  emptyTitle: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold },
  emptyText: { color: theme.text.tertiary, fontSize: theme.font.title3, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.text.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.xl, paddingVertical: theme.space.md + 2,
    marginTop: theme.space.lg,
  },
  primaryBtnText: { color: theme.text.inverse, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

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
