import { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/auth';
import StockLogo from '../../components/StockLogo';

const BASE_URL = 'https://finclue.de';

export default function PortfolioScreen() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [portfolioName, setPortfolioName] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { loadPortfolio(); }, []));

  async function loadPortfolio() {
    try {
      setError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { router.replace('/(auth)/login'); return; }
      const userId = sessionData.session.user.id;

      // Erstes Portfolio holen
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id, name')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!portfolios?.length) { setLoading(false); setRefreshing(false); return; }
      const portfolio = portfolios[0];
      setPortfolioName(portfolio.name);

      // Holdings holen
      const { data: rawHoldings, error: hErr } = await supabase
        .from('portfolio_holdings')
        .select('symbol, name, quantity, purchase_price, current_price')
        .eq('portfolio_id', portfolio.id);

      if (hErr) throw hErr;
      if (!rawHoldings?.length) { setHoldings([]); setLoading(false); setRefreshing(false); return; }

      // Live Quotes holen
      const symbols = rawHoldings.map((h: any) => h.symbol).join(',');
      const qRes = await fetch(`${BASE_URL}/api/quotes?symbols=${symbols}`);
      const quotes: any[] = qRes.ok ? await qRes.json() : [];
      const quoteMap: Record<string, any> = {};
      quotes.forEach((q: any) => { quoteMap[q.symbol] = q; });

      // Holdings zusammenführen
      let tv = 0, tc = 0;
      const enriched = rawHoldings.map((h: any) => {
        const q = quoteMap[h.symbol] || {};
        const currentPrice = q.price || h.current_price || 0;
        const currentValue = currentPrice * (h.quantity || 0);
        const cost = (h.purchase_price || 0) * (h.quantity || 0);
        const gain = currentValue - cost;
        const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
        tv += currentValue;
        tc += cost;
        return { ...h, currentPrice, currentValue, cost, gain, gainPct, displayName: q.name || h.name || h.symbol };
      });

      setHoldings(enriched);
      setTotalValue(tv);
      setTotalCost(tc);
    } catch (e: any) {
      setError(e.message || 'Fehler');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const fmtCurrency = (v: number) => `$${Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtPct = (v: number) => `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}%`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPortfolio(); }} tintColor="#22C55E" />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio</Text>
          {portfolioName ? <Text style={styles.subtitle}>{portfolioName}</Text> : null}
        </View>

        {/* Summary Card */}
        <LinearGradient colors={['#0F172A', '#1a2744']} style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Gesamtwert</Text>
          <Text style={styles.summaryValue}>{fmtCurrency(totalValue)}</Text>
          <View style={styles.gainRow}>
            <Text style={[styles.gainText, { color: totalGain >= 0 ? '#22C55E' : '#EF4444' }]}>
              {totalGain >= 0 ? '+' : '-'}{fmtCurrency(totalGain)}
            </Text>
            <Text style={[styles.gainPct, { color: totalGain >= 0 ? '#22C55E' : '#EF4444' }]}>
              {fmtPct(totalGainPct)}
            </Text>
          </View>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color="#22C55E" style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.emptyTitle}>Fehler beim Laden</Text>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : holdings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="briefcase-outline" size={28} color="#475569" />
            </View>
            <Text style={styles.emptyTitle}>Portfolio ist leer</Text>
            <Text style={styles.emptyText}>Importiere dein Portfolio auf finclue.de</Text>
            <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/stock/AAPL')}>
              <Text style={styles.linkBtnText}>Aktien entdecken</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.holdingsList}>
            <Text style={styles.sectionLabel}>POSITIONEN</Text>
            {holdings.map((h: any) => (
              <TouchableOpacity
                key={h.symbol}
                style={styles.holdingRow}
                onPress={() => router.push(`/stock/${h.symbol}`)}
                activeOpacity={0.7}
              >
                <View style={{ marginRight: 12 }}>
                  <StockLogo ticker={h.symbol} size={42} borderRadius={10} />
                </View>
                <View style={styles.holdingLeft}>
                  <Text style={styles.holdingSymbol}>{h.symbol}</Text>
                  <Text style={styles.holdingShares}>{h.quantity} Aktien · ⌀ {fmtCurrency(h.purchase_price || 0)}</Text>
                </View>
                <View style={styles.holdingRight}>
                  <Text style={styles.holdingValue}>{fmtCurrency(h.currentValue)}</Text>
                  <Text style={[styles.holdingGain, { color: h.gain >= 0 ? '#22C55E' : '#EF4444' }]}>
                    {fmtPct(h.gainPct)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  summaryCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  summaryLabel: { color: '#64748B', fontSize: 13, marginBottom: 4 },
  summaryValue: { color: '#F8FAFC', fontSize: 32, fontWeight: '700', letterSpacing: -1 },
  gainRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  gainText: { fontSize: 15, fontWeight: '600' },
  gainPct: { fontSize: 14, fontWeight: '500' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '600' },
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  linkBtn: { backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  linkBtnText: { color: '#22C55E', fontWeight: '600' },
  holdingsList: { paddingHorizontal: 16, paddingBottom: 20 },
  sectionLabel: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  holdingRow: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  holdingLeft: { flex: 1 },
  holdingSymbol: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  holdingShares: { color: '#64748B', fontSize: 12, marginTop: 2 },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  holdingGain: { fontSize: 13, marginTop: 2 },
});
