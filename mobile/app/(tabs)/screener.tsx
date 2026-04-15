// mobile/app/(tabs)/screener.tsx — Aktien Screener
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, TextInput
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StockLogo from '../../components/StockLogo';

const BASE_URL = 'https://finclue.de';

function fmtDE(v: number, d = 1) {
  return v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtBig(v: number) {
  if (!v) return '—';
  if (v >= 1e12) return `${fmtDE(v / 1e12, 1)} Bio. $`;
  if (v >= 1e9) return `${fmtDE(v / 1e9, 1)} Mrd. $`;
  if (v >= 1e6) return `${fmtDE(v / 1e6, 0)} Mio. $`;
  return `${fmtDE(v, 0)} $`;
}

const SECTORS = [
  'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
  'Industrials', 'Communication Services', 'Energy', 'Consumer Defensive',
  'Utilities', 'Real Estate', 'Basic Materials',
];

const SECTOR_DE: Record<string, string> = {
  'Technology': 'Technologie',
  'Healthcare': 'Gesundheit',
  'Financial Services': 'Finanzen',
  'Consumer Cyclical': 'Konsum (zyklisch)',
  'Industrials': 'Industrie',
  'Communication Services': 'Kommunikation',
  'Energy': 'Energie',
  'Consumer Defensive': 'Konsum (defensiv)',
  'Utilities': 'Versorger',
  'Real Estate': 'Immobilien',
  'Basic Materials': 'Rohstoffe',
};

// Preset-Filter
const PRESETS = [
  { label: '📈 Wachstum', desc: 'Hohe Marktkapitalisierung, Technologie', params: { sector: 'Technology', marketCapMoreThan: '10000000000', limit: '30' } },
  { label: '💰 Dividenden', desc: 'Mindest-Dividende 3%', params: { dividendMoreThan: '3', limit: '30' } },
  { label: '🔥 Momentum', desc: 'Stark steigende Aktien', params: { marketCapMoreThan: '1000000000', limit: '50' } },
  { label: '🏦 Finanzen', desc: 'Finanzsektor-Aktien', params: { sector: 'Financial Services', limit: '30' } },
  { label: '🏥 Gesundheit', desc: 'Healthcare-Aktien', params: { sector: 'Healthcare', limit: '30' } },
  { label: '⚡ Energie', desc: 'Energiesektor', params: { sector: 'Energy', limit: '30' } },
];

type SortKey = 'marketCap' | 'changesPercentage' | 'pe' | 'dividendYield';

export default function ScreenerScreen() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortAsc, setSortAsc] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Filter state
  const [sector, setSector] = useState('');
  const [minMarketCap, setMinMarketCap] = useState('');
  const [maxPE, setMaxPE] = useState('');
  const [minDiv, setMinDiv] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  async function runScreener(overrideParams?: Record<string, string>) {
    setLoading(true);
    setHasSearched(true);
    setShowFilters(false);
    try {
      const params = overrideParams || {
        ...(sector ? { sector } : {}),
        ...(minMarketCap ? { marketCapMoreThan: (parseFloat(minMarketCap) * 1e9).toString() } : {}),
        ...(maxPE ? { peRatioLowerThan: maxPE } : {}),
        ...(minDiv ? { dividendMoreThan: minDiv } : {}),
        ...(minPrice ? { priceMoreThan: minPrice } : {}),
        ...(maxPrice ? { priceLowerThan: maxPrice } : {}),
        limit: '50',
      };
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${BASE_URL}/api/screener?${qs}`);
      if (res.ok) setResults(await res.json());
      else setResults([]);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setSector(preset.params.sector || '');
    setMinMarketCap('');
    setMaxPE('');
    setMinDiv(preset.params.dividendMoreThan || '');
    runScreener(preset.params as Record<string, string>);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sorted = [...results].sort((a, b) => {
    const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
    return sortAsc ? av - bv : bv - av;
  });

  function resetFilters() {
    setSector(''); setMinMarketCap(''); setMaxPE('');
    setMinDiv(''); setMinPrice(''); setMaxPrice('');
    setResults([]); setHasSearched(false); setShowFilters(true);
  }

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <TouchableOpacity style={[s.sortBtn, sortKey === k && s.sortBtnActive]} onPress={() => toggleSort(k)}>
      <Text style={[s.sortBtnText, sortKey === k && s.sortBtnTextActive]}>{label}</Text>
      {sortKey === k && <Ionicons name={sortAsc ? 'chevron-up' : 'chevron-down'} size={10} color={theme.text.primary} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Screener</Text>
            <Text style={s.subtitle}>Aktien filtern & entdecken</Text>
          </View>
          <TouchableOpacity style={s.filterToggle} onPress={() => setShowFilters(f => !f)}>
            <Ionicons name="options" size={18} color={showFilters ? theme.text.primary : theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Presets */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.presetsRow}>
          {PRESETS.map(p => (
            <TouchableOpacity key={p.label} style={s.presetBtn} onPress={() => applyPreset(p)}>
              <Text style={s.presetLabel}>{p.label}</Text>
              <Text style={s.presetDesc}>{p.desc}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filters */}
        {showFilters && (
          <View style={s.filterBox}>
            <Text style={s.filterTitle}>FILTER</Text>

            {/* Sektor */}
            <Text style={s.filterLabel}>Sektor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={s.sectorRow}>
                <TouchableOpacity style={[s.sectorBtn, sector === '' && s.sectorBtnActive]} onPress={() => setSector('')}>
                  <Text style={[s.sectorBtnText, sector === '' && s.sectorBtnTextActive]}>Alle</Text>
                </TouchableOpacity>
                {SECTORS.map(sec => (
                  <TouchableOpacity key={sec} style={[s.sectorBtn, sector === sec && s.sectorBtnActive]}
                    onPress={() => setSector(sector === sec ? '' : sec)}>
                    <Text style={[s.sectorBtnText, sector === sec && s.sectorBtnTextActive]}>
                      {SECTOR_DE[sec] || sec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Numeric filters */}
            <View style={s.inputGrid}>
              <View style={s.inputItem}>
                <Text style={s.filterLabel}>Min. Marktkapital. (Mrd. $)</Text>
                <TextInput style={s.input} placeholder="z.B. 10" placeholderTextColor="#475569"
                  value={minMarketCap} onChangeText={setMinMarketCap} keyboardType="numeric" />
              </View>
              <View style={s.inputItem}>
                <Text style={s.filterLabel}>Max. KGV</Text>
                <TextInput style={s.input} placeholder="z.B. 25" placeholderTextColor="#475569"
                  value={maxPE} onChangeText={setMaxPE} keyboardType="numeric" />
              </View>
              <View style={s.inputItem}>
                <Text style={s.filterLabel}>Min. Dividende (%)</Text>
                <TextInput style={s.input} placeholder="z.B. 2" placeholderTextColor="#475569"
                  value={minDiv} onChangeText={setMinDiv} keyboardType="numeric" />
              </View>
              <View style={s.inputItem}>
                <Text style={s.filterLabel}>Kurs-Bereich ($)</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="Min" placeholderTextColor="#475569"
                    value={minPrice} onChangeText={setMinPrice} keyboardType="numeric" />
                  <TextInput style={[s.input, { flex: 1 }]} placeholder="Max" placeholderTextColor="#475569"
                    value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" />
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={s.filterBtns}>
              <TouchableOpacity style={s.resetBtn} onPress={resetFilters}>
                <Text style={s.resetBtnText}>Zurücksetzen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.searchBtn} onPress={() => runScreener()}>
                <Ionicons name="search" size={16} color={theme.text.inverse} />
                <Text style={s.searchBtnText}>Suchen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Results */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={theme.text.primary} size="large" />
            <Text style={s.loadingText}>Screener läuft...</Text>
          </View>
        ) : hasSearched && results.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="search-outline" size={40} color={theme.text.tertiary} />
            <Text style={s.emptyTitle}>Keine Ergebnisse</Text>
            <Text style={s.emptyText}>Passe die Filter an</Text>
          </View>
        ) : sorted.length > 0 ? (
          <View style={s.resultsBox}>
            {/* Sort Bar */}
            <View style={s.sortBar}>
              <Text style={s.resultCount}>{sorted.length} Aktien</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <SortBtn k="marketCap" label="Marktkapital." />
                  <SortBtn k="changesPercentage" label="Performance" />
                  <SortBtn k="pe" label="KGV" />
                  <SortBtn k="dividendYield" label="Dividende" />
                </View>
              </ScrollView>
            </View>

            {/* Table Header */}
            <View style={s.tableHeader}>
              <Text style={[s.thCell, { flex: 2 }]}>Aktie</Text>
              <Text style={[s.thCell, { flex: 1.2, textAlign: 'right' }]}>Kurs</Text>
              <Text style={[s.thCell, { flex: 1.2, textAlign: 'right' }]}>Heute</Text>
              <Text style={[s.thCell, { flex: 1.5, textAlign: 'right' }]}>Marktkapital.</Text>
            </View>

            {sorted.map((stock, i) => {
              const chg = stock.changesPercentage ?? 0;
              const pos = chg >= 0;
              return (
                <TouchableOpacity key={stock.symbol}
                  style={[s.resultRow, i > 0 && s.resultBorder]}
                  onPress={() => router.push(`/stock/${stock.symbol}`)}
                  activeOpacity={0.7}>
                  <View style={[s.resultCell, { flex: 2 }]}>
                    <StockLogo ticker={stock.symbol} size={32} borderRadius={8} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={s.stockSymbol}>{stock.symbol}</Text>
                      <Text style={s.stockName} numberOfLines={1}>
                        {(stock.companyName || '').replace(/\b(Inc\.?|Corp\.?|Ltd\.?)$/i, '').trim()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[s.resultCell, { flex: 1.2, textAlign: 'right', color: theme.text.primary, fontWeight: theme.weight.semibold }, tabularStyle]}>
                    {fmtDE(stock.price ?? 0)}
                  </Text>
                  <Text style={[s.resultCell, { flex: 1.2, textAlign: 'right', color: pos ? theme.accent.positive : theme.accent.negative, fontWeight: theme.weight.semibold }, tabularStyle]}>
                    {pos ? '+' : ''}{fmtDE(chg)} %
                  </Text>
                  <Text style={[s.resultCell, { flex: 1.5, textAlign: 'right', color: theme.text.secondary }, tabularStyle]}>
                    {fmtBig(stock.marketCap)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : !hasSearched ? (
          <View style={s.center}>
            <Ionicons name="funnel-outline" size={48} color={theme.text.muted} />
            <Text style={s.emptyTitle}>Filter setzen & suchen</Text>
            <Text style={s.emptyText}>Oder wähle einen Preset oben</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

import { theme, tabularStyle } from '../../lib/theme';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingTop: theme.space.md, paddingBottom: theme.space.sm },
  title: { color: theme.text.primary, fontSize: 22, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight },
  subtitle: { color: theme.text.tertiary, fontSize: theme.font.body, marginTop: 2 },
  filterToggle: { width: 36, height: 36, borderRadius: theme.radius.full, backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center' },

  presetsRow: { paddingHorizontal: theme.space.lg, gap: theme.space.sm, paddingBottom: theme.space.md },
  presetBtn: { backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default, borderRadius: theme.radius.md, paddingHorizontal: theme.space.md + 2, paddingVertical: theme.space.sm + 2, minWidth: 120 },
  presetLabel: { color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.semibold, marginBottom: 2 },
  presetDesc: { color: theme.text.tertiary, fontSize: theme.font.captionSm },

  filterBox: { marginHorizontal: theme.space.lg, backgroundColor: theme.bg.card, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.border.default, padding: theme.space.lg, marginBottom: theme.space.md },
  filterTitle: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider, textTransform: 'uppercase', marginBottom: theme.space.md },
  filterLabel: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.medium, marginBottom: theme.space.xs + 2, letterSpacing: theme.tracking.wide, textTransform: 'uppercase' },
  sectorRow: { flexDirection: 'row', gap: theme.space.xs + 2 },
  sectorBtn: { paddingHorizontal: theme.space.md, paddingVertical: theme.space.xs + 3, borderRadius: theme.radius.full, backgroundColor: theme.bg.cardElevated, borderWidth: 1, borderColor: theme.border.default },
  sectorBtnActive: { borderColor: theme.border.strong, backgroundColor: theme.bg.cardHover },
  sectorBtnText: { color: theme.text.tertiary, fontSize: theme.font.bodySm, fontWeight: theme.weight.medium },
  sectorBtnTextActive: { color: theme.text.primary, fontWeight: theme.weight.semibold },
  inputGrid: { gap: theme.space.sm + 2 },
  inputItem: {},
  input: { backgroundColor: theme.bg.cardElevated, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border.default, color: theme.text.primary, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm + 2, fontSize: theme.font.title3, ...tabularStyle },
  filterBtns: { flexDirection: 'row', gap: theme.space.sm + 2, marginTop: theme.space.lg },
  resetBtn: { flex: 1, paddingVertical: theme.space.md + 1, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center' },
  resetBtnText: { color: theme.text.tertiary, fontWeight: theme.weight.semibold, fontSize: theme.font.title3 },
  searchBtn: { flex: 2, backgroundColor: theme.text.primary, paddingVertical: theme.space.md + 1, borderRadius: theme.radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space.xs + 2 },
  searchBtnText: { color: theme.text.inverse, fontWeight: theme.weight.semibold, fontSize: theme.font.title2 },

  center: { alignItems: 'center', paddingVertical: 48, gap: theme.space.sm + 2 },
  loadingText: { color: theme.text.tertiary, marginTop: theme.space.sm },
  emptyTitle: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
  emptyText: { color: theme.text.tertiary, fontSize: theme.font.body },

  resultsBox: { marginHorizontal: theme.space.lg, marginBottom: theme.space.xxxl },
  sortBar: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, marginBottom: theme.space.sm + 2 },
  resultCount: { color: theme.text.tertiary, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold, marginRight: theme.space.xs, ...tabularStyle },
  sortBtn: { paddingHorizontal: theme.space.sm + 2, paddingVertical: theme.space.xs + 2, borderRadius: theme.radius.sm, backgroundColor: theme.bg.card, borderWidth: 1, borderColor: theme.border.default, flexDirection: 'row', alignItems: 'center', gap: 3 },
  sortBtnActive: { borderColor: theme.border.strong, backgroundColor: theme.bg.cardElevated },
  sortBtnText: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.medium },
  sortBtnTextActive: { color: theme.text.primary, fontWeight: theme.weight.semibold },
  tableHeader: { flexDirection: 'row', paddingHorizontal: theme.space.md + 2, paddingVertical: theme.space.sm, borderBottomWidth: 1, borderBottomColor: theme.border.default, backgroundColor: theme.bg.card, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg, borderWidth: 1, borderBottomWidth: 1, borderColor: theme.border.default },
  thCell: { color: theme.text.tertiary, fontSize: theme.font.captionSm, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wide, textTransform: 'uppercase' },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.md + 2, paddingVertical: theme.space.md, backgroundColor: theme.bg.card, borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.border.default },
  resultBorder: { borderTopWidth: 1, borderTopColor: theme.border.default },
  resultCell: { flexDirection: 'row', alignItems: 'center' } as any,
  stockSymbol: { color: theme.text.primary, fontSize: theme.font.body, fontWeight: theme.weight.semibold },
  stockName: { color: theme.text.tertiary, fontSize: theme.font.captionSm, marginTop: 1 },
});
