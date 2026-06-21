import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Modal, Pressable, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/auth';
import { theme, tabularStyle, perfColor } from '../../lib/theme';
import StockLogo from '../StockLogo';
import EditTransactionModal from './EditTransactionModal';
import RealizedGainsModal from './RealizedGainsModal';

export type TxType = 'buy' | 'sell' | 'dividend' | 'cash_deposit' | 'cash_withdrawal' | 'transfer_in' | 'transfer_out';

export interface Transaction {
  id: string;
  type: TxType;
  symbol: string;
  name: string | null;
  quantity: number;
  price: number;
  total_value: number;
  fee: number | null;
  date: string;
  notes: string | null;
  portfolio_id: string;
}

interface Props {
  portfolioId: string | null;
  refreshKey?: number;
}

const TX_LABEL: Record<TxType, string> = {
  buy: 'Kauf', sell: 'Verkauf', dividend: 'Dividende',
  cash_deposit: 'Einzahlung', cash_withdrawal: 'Auszahlung',
  transfer_in: 'Einbuchung', transfer_out: 'Ausbuchung',
};

const TX_ICON: Record<TxType, string> = {
  buy: 'arrow-down', sell: 'arrow-up', dividend: 'cash',
  cash_deposit: 'add-circle', cash_withdrawal: 'remove-circle',
  transfer_in: 'log-in', transfer_out: 'log-out',
};

const TX_COLOR: Record<TxType, string> = {
  buy: theme.accent.positive, sell: theme.accent.negative, dividend: theme.accent.warning,
  cash_deposit: theme.accent.info, cash_withdrawal: theme.text.tertiary,
  transfer_in: theme.text.tertiary, transfer_out: theme.text.tertiary,
};

const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function fmtDE(v: number, d = 2) {
  return Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtCurrency(v: number) { return `${fmtDE(v)} €`; }
function fmtBig(v: number) {
  if (Math.abs(v) >= 1e6) return `${fmtDE(v / 1e6, 1)} Mio. €`;
  if (Math.abs(v) >= 1e3) return `${fmtDE(v / 1e3, 1)} Tsd. €`;
  return fmtCurrency(v);
}

export default function TransactionsView({ portfolioId, refreshKey = 0 }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionTx, setActionTx] = useState<Transaction | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showRealized, setShowRealized] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      let query = supabase
        .from('portfolio_transactions')
        .select('id, type, symbol, name, quantity, price, total_value, fee, date, notes, portfolio_id');

      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      } else {
        // Alle Depots: per IN-Filter über User-Portfolios
        const { data: portfolios } = await supabase
          .from('portfolios').select('id').eq('user_id', session.user.id);
        const ids = (portfolios || []).map((p: any) => p.id);
        if (ids.length === 0) { setTransactions([]); setLoading(false); return; }
        query = query.in('portfolio_id', ids);
      }

      const { data, error: dbErr } = await query.order('date', { ascending: false });
      if (dbErr) throw dbErr;
      setTransactions((data as Transaction[]) || []);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => { setLoading(true); load(); }, [load, refreshKey]);

  // Cashflow Summary
  const summary = useMemo(() => {
    let deposits = 0, withdrawals = 0, invested = 0, dividends = 0;
    transactions.forEach(t => {
      const total = Math.abs(t.total_value || t.quantity * t.price);
      if (t.type === 'cash_deposit') deposits += total;
      else if (t.type === 'cash_withdrawal') withdrawals += total;
      else if (t.type === 'buy') invested += total;
      else if (t.type === 'dividend') dividends += total;
    });
    return { deposits, withdrawals, invested, dividends, net: deposits - withdrawals };
  }, [transactions]);

  // Realized Gains (Average-Cost-Methode)
  const realized = useMemo(() => {
    const positions: Record<string, { totalShares: number; totalCost: number }> = {};
    let totalRealized = 0;
    const perSymbol: Record<string, { realized: number; sells: number }> = {};

    [...transactions]
      .filter(t => t.type === 'buy' || t.type === 'sell')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(t => {
        const pos = positions[t.symbol] || { totalShares: 0, totalCost: 0 };
        if (t.type === 'buy') {
          pos.totalShares += t.quantity;
          pos.totalCost += t.quantity * t.price + (t.fee || 0);
        } else if (t.type === 'sell' && pos.totalShares > 0) {
          const avgCost = pos.totalCost / pos.totalShares;
          const gain = (t.price - avgCost) * t.quantity - (t.fee || 0);
          totalRealized += gain;
          if (!perSymbol[t.symbol]) perSymbol[t.symbol] = { realized: 0, sells: 0 };
          perSymbol[t.symbol].realized += gain;
          perSymbol[t.symbol].sells += 1;
          // Average-Cost beibehalten
          pos.totalShares -= t.quantity;
          pos.totalCost -= avgCost * t.quantity;
        }
        positions[t.symbol] = pos;
      });
    return { total: totalRealized, perSymbol };
  }, [transactions]);

  // Group by Year → Month
  const grouped = useMemo(() => {
    const byYear: Record<string, Record<string, Transaction[]>> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const y = String(d.getFullYear());
      const m = String(d.getMonth());
      if (!byYear[y]) byYear[y] = {};
      if (!byYear[y][m]) byYear[y][m] = [];
      byYear[y][m].push(t);
    });
    return byYear;
  }, [transactions]);

  // Initial expand: current month
  useEffect(() => {
    if (transactions.length === 0 || expanded.size > 0) return;
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth()}`;
    setExpanded(new Set([key]));
  }, [transactions.length]);

  function toggleMonth(year: string, month: string) {
    const key = `${year}-${month}`;
    const newSet = new Set(expanded);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setExpanded(newSet);
    Haptics.selectionAsync();
  }

  async function handleDelete() {
    if (!deleteTx) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('portfolio_transactions').delete().eq('id', deleteTx.id);
      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDeleteTx(null);
      await load();
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Transaktion konnte nicht gelöscht werden');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <ActivityIndicator color={theme.accent.positive} style={{ marginTop: 32 }} />;
  }

  if (error) {
    return (
      <View style={s.emptyState}>
        <Ionicons name="alert-circle-outline" size={36} color={theme.accent.negative} />
        <Text style={s.emptyTitle}>Fehler</Text>
        <Text style={s.emptyText}>{error}</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={s.emptyState}>
        <View style={s.emptyIcon}>
          <Ionicons name="swap-horizontal" size={28} color={theme.text.tertiary} />
        </View>
        <Text style={s.emptyTitle}>Noch keine Transaktionen</Text>
        <Text style={s.emptyText}>Trage Käufe, Verkäufe und Dividenden ein, um sie hier zu sehen.</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/add-transaction')}>
          <Ionicons name="add-circle-outline" size={16} color={theme.text.inverse} />
          <Text style={s.primaryBtnText}>Transaktion hinzufügen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const yearKeys = Object.keys(grouped).sort((a, b) => +b - +a);

  return (
    <View>
      {/* Cashflow Summary */}
      <View style={s.summaryCard}>
        <View style={s.summaryRow}>
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>Eingezahlt</Text>
            <Text style={[s.summaryValue, { color: theme.accent.positive }]}>{fmtBig(summary.deposits)}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>Ausgezahlt</Text>
            <Text style={[s.summaryValue, { color: theme.accent.negative }]}>{fmtBig(summary.withdrawals)}</Text>
          </View>
        </View>
        <View style={s.summaryDividerH} />
        <View style={s.summaryRow}>
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>Investiert</Text>
            <Text style={s.summaryValue}>{fmtBig(summary.invested)}</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryCell}>
            <Text style={s.summaryLabel}>Dividenden</Text>
            <Text style={[s.summaryValue, { color: theme.accent.warning }]}>{fmtBig(summary.dividends)}</Text>
          </View>
        </View>
      </View>

      {/* Realized Gains Card (klickbar) */}
      {Object.keys(realized.perSymbol).length > 0 && (
        <TouchableOpacity style={s.realizedCard} onPress={() => setShowRealized(true)} activeOpacity={0.7}>
          <View style={{ flex: 1 }}>
            <Text style={s.realizedLabel}>REALISIERTE GEWINNE</Text>
            <Text style={[s.realizedValue, { color: perfColor(realized.total) }]}>
              {realized.total >= 0 ? '+' : ''}{fmtCurrency(realized.total)}
            </Text>
            <Text style={s.realizedHint}>
              {Object.keys(realized.perSymbol).length} {Object.keys(realized.perSymbol).length === 1 ? 'Position' : 'Positionen'} mit Verkäufen
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.text.tertiary} />
        </TouchableOpacity>
      )}

      {/* Add CTA */}
      <TouchableOpacity style={s.addCta} onPress={() => router.push('/add-transaction')}>
        <Ionicons name="add" size={16} color={theme.text.primary} />
        <Text style={s.addCtaText}>Transaktion hinzufügen</Text>
      </TouchableOpacity>

      {/* Grouped List */}
      {yearKeys.map(year => {
        const monthKeys = Object.keys(grouped[year]).sort((a, b) => +b - +a);
        return (
          <View key={year} style={{ marginTop: theme.space.xl }}>
            <Text style={s.yearLabel}>{year}</Text>
            {monthKeys.map(month => {
              const txs = grouped[year][month];
              const key = `${year}-${month}`;
              const isOpen = expanded.has(key);
              const monthTotal = txs.reduce((sum, t) => {
                if (t.type === 'buy' || t.type === 'cash_deposit') return sum - Math.abs(t.total_value || t.quantity * t.price);
                if (t.type === 'sell' || t.type === 'cash_withdrawal' || t.type === 'dividend') return sum + Math.abs(t.total_value || t.quantity * t.price);
                return sum;
              }, 0);
              return (
                <View key={key} style={s.monthBlock}>
                  <TouchableOpacity style={s.monthHeader} onPress={() => toggleMonth(year, month)} activeOpacity={0.7}>
                    <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={theme.text.tertiary} />
                    <Text style={s.monthLabel}>{MONTHS_DE[+month]}</Text>
                    <Text style={s.monthCount}>{txs.length}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={[s.monthTotal, { color: perfColor(monthTotal) }]}>
                      {monthTotal >= 0 ? '+' : ''}{fmtBig(monthTotal)}
                    </Text>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={s.txList}>
                      {txs.map((t, i) => {
                        const isLast = i === txs.length - 1;
                        const isCash = t.type === 'cash_deposit' || t.type === 'cash_withdrawal';
                        const total = Math.abs(t.total_value || t.quantity * t.price);
                        return (
                          <TouchableOpacity
                            key={t.id}
                            style={[s.txRow, !isLast && s.txRowBorder]}
                            onPress={() => setActionTx(t)}
                            activeOpacity={0.6}
                          >
                            <View style={[s.txIcon, { backgroundColor: `${TX_COLOR[t.type]}22` }]}>
                              <Ionicons name={TX_ICON[t.type] as any} size={14} color={TX_COLOR[t.type]} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={s.txType}>{TX_LABEL[t.type]}</Text>
                                {!isCash && (
                                  <Text style={s.txSymbol} numberOfLines={1}>· {t.symbol}</Text>
                                )}
                              </View>
                              <Text style={s.txMeta} numberOfLines={1}>
                                {!isCash && `${fmtDE(t.quantity, 0)} × ${fmtCurrency(t.price)} · `}
                                {new Date(t.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                              </Text>
                            </View>
                            <Text style={s.txTotal}>{fmtBig(total)}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}

      {/* Action Sheet Modal */}
      <Modal visible={!!actionTx} transparent animationType="slide" onRequestClose={() => setActionTx(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setActionTx(null)}>
          <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={s.modalHandle} />
            {actionTx && (
              <>
                <View style={s.modalHeader}>
                  <View style={[s.txIcon, { backgroundColor: `${TX_COLOR[actionTx.type]}22` }]}>
                    <Ionicons name={TX_ICON[actionTx.type] as any} size={16} color={TX_COLOR[actionTx.type]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>{TX_LABEL[actionTx.type]} · {actionTx.symbol}</Text>
                    <Text style={s.modalSub}>
                      {new Date(actionTx.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                </View>
                {actionTx.notes && (
                  <Text style={s.modalNotes}>„{actionTx.notes}"</Text>
                )}
                <TouchableOpacity
                  style={s.modalAction}
                  onPress={() => { router.push(`/stock/${actionTx.symbol}`); setActionTx(null); }}
                >
                  <Ionicons name="open-outline" size={18} color={theme.text.primary} />
                  <Text style={s.modalActionText}>Aktie öffnen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.modalAction}
                  onPress={() => { setEditTx(actionTx); setActionTx(null); }}
                >
                  <Ionicons name="create-outline" size={18} color={theme.text.primary} />
                  <Text style={s.modalActionText}>Bearbeiten</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalAction, s.modalActionDanger]}
                  onPress={() => { setDeleteTx(actionTx); setActionTx(null); }}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.accent.negative} />
                  <Text style={[s.modalActionText, { color: theme.accent.negative }]}>Löschen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.modalCancel} onPress={() => setActionTx(null)}>
                  <Text style={s.modalCancelText}>Abbrechen</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Modal */}
      <EditTransactionModal
        transaction={editTx}
        onClose={() => setEditTx(null)}
        onSaved={() => { setEditTx(null); load(); }}
      />

      {/* Realized Gains Modal */}
      <RealizedGainsModal
        visible={showRealized}
        onClose={() => setShowRealized(false)}
        total={realized.total}
        perSymbol={realized.perSymbol}
      />

      {/* Delete Confirm */}
      <Modal visible={!!deleteTx} transparent animationType="fade" onRequestClose={() => !deleting && setDeleteTx(null)}>
        <Pressable style={s.confirmOverlay} onPress={() => !deleting && setDeleteTx(null)}>
          <Pressable style={s.confirmCard} onPress={e => e.stopPropagation()}>
            <View style={s.confirmIcon}>
              <Ionicons name="warning-outline" size={28} color={theme.accent.negative} />
            </View>
            <Text style={s.confirmTitle}>Transaktion löschen?</Text>
            <Text style={s.confirmText}>
              Die Transaktion wird unwiderruflich gelöscht. Bestehende Positionen werden nicht automatisch angepasst.
            </Text>
            <View style={s.confirmActions}>
              <TouchableOpacity style={[s.confirmBtn, s.confirmCancel]} onPress={() => setDeleteTx(null)} disabled={deleting}>
                <Text style={s.confirmCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, s.confirmDelete]} onPress={handleDelete} disabled={deleting}>
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
    </View>
  );
}

const s = StyleSheet.create({
  // Summary
  summaryCard: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default,
    padding: theme.space.lg,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryCell: { flex: 1 },
  summaryLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wide,
    textTransform: 'uppercase', marginBottom: 4,
  },
  summaryValue: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold, ...tabularStyle },
  summaryDivider: { width: 1, height: 28, backgroundColor: theme.border.default },
  summaryDividerH: { height: 1, backgroundColor: theme.border.default, marginVertical: theme.space.md },

  // Realized
  realizedCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default,
    padding: theme.space.lg, marginTop: theme.space.sm,
  },
  realizedLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wide,
    textTransform: 'uppercase', marginBottom: 4,
  },
  realizedValue: { fontSize: theme.font.title1, fontWeight: theme.weight.semibold, ...tabularStyle },
  realizedHint: { color: theme.text.tertiary, fontSize: theme.font.caption, marginTop: 2 },

  // Add CTA
  addCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: theme.space.sm,
    paddingVertical: theme.space.md + 2,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.border.default,
    borderStyle: 'dashed' as any,
  },
  addCtaText: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  // Grouped
  yearLabel: {
    color: theme.text.tertiary, fontSize: theme.font.caption,
    fontWeight: theme.weight.bold, letterSpacing: theme.tracking.wider,
    marginBottom: theme.space.sm, ...tabularStyle,
  },
  monthBlock: { marginBottom: theme.space.sm },
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.md,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.border.default,
  },
  monthLabel: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  monthCount: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    backgroundColor: theme.bg.cardHover, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, fontWeight: theme.weight.semibold,
  },
  monthTotal: { fontSize: theme.font.body, fontWeight: theme.weight.semibold, ...tabularStyle },

  txList: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.border.default,
    marginTop: theme.space.xs,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    paddingHorizontal: theme.space.md, paddingVertical: theme.space.md - 1,
  },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border.default },
  txIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  txType: { color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.semibold },
  txSymbol: { color: theme.text.secondary, fontSize: theme.font.body, fontWeight: theme.weight.medium, flex: 1 },
  txMeta: { color: theme.text.tertiary, fontSize: theme.font.captionSm, marginTop: 2, ...tabularStyle },
  txTotal: { color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.semibold, ...tabularStyle },

  // Empty
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 10 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: theme.radius.lg,
    backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center', marginBottom: theme.space.sm,
  },
  emptyTitle: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold },
  emptyText: { color: theme.text.tertiary, fontSize: theme.font.body, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.text.primary,
    borderRadius: theme.radius.md, paddingHorizontal: theme.space.xl, paddingVertical: theme.space.md,
    marginTop: theme.space.md,
  },
  primaryBtnText: { color: theme.text.inverse, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  // Modal Sheet (Action)
  modalOverlay: { flex: 1, backgroundColor: theme.bg.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.bg.cardElevated,
    borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl,
    paddingBottom: 34, paddingTop: theme.space.md,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border.strong,
    alignSelf: 'center', marginBottom: theme.space.lg,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    paddingHorizontal: theme.space.lg, marginBottom: theme.space.md,
  },
  modalTitle: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
  modalSub: { color: theme.text.tertiary, fontSize: theme.font.bodySm, marginTop: 2 },
  modalNotes: { color: theme.text.secondary, fontSize: theme.font.body, paddingHorizontal: theme.space.lg, marginBottom: theme.space.md, fontStyle: 'italic' as any },
  modalAction: {
    flexDirection: 'row', alignItems: 'center', gap: theme.space.md,
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 2,
    borderTopWidth: 1, borderTopColor: theme.border.default,
  },
  modalActionDanger: {},
  modalActionText: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.medium },
  modalCancel: {
    marginHorizontal: theme.space.lg, marginTop: theme.space.md,
    paddingVertical: theme.space.md + 2, borderRadius: theme.radius.md,
    backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center',
  },
  modalCancelText: { color: theme.text.secondary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  // Confirm
  confirmOverlay: { flex: 1, backgroundColor: theme.bg.overlay, alignItems: 'center', justifyContent: 'center', padding: theme.space.xl },
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
