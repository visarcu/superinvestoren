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
      {sortKey === k && <Ionicons name={sortAsc ? 'chevron-up' : 'chevron-down'} size={10} color="#22C55E" />}
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
            <Ionicons name="options" size={18} color={showFilters ? '#22C55E' : '#64748B'} />
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
                <Ionicons name="search" size={16} color="#0a0a0b" />
                <Text style={s.searchBtnText}>Suchen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Results */}
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color="#22C55E" size="large" />
            <Text style={s.loadingText}>Screener läuft...</Text>
          </View>
        ) : hasSearched && results.length === 0 ? (
          <View style={s.center}>
            <Ionicons name="search-outline" size={40} color="#475569" />
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
                  <Text style={[s.resultCell, { flex: 1.2, textAlign: 'right', color: '#F8FAFC', fontWeight: '600' }]}>
                    {fmtDE(stock.price ?? 0)}
                  </Text>
                  <Text style={[s.resultCell, { flex: 1.2, textAlign: 'right', color: pos ? '#22C55E' : '#EF4444', fontWeight: '600' }]}>
                    {pos ? '+' : ''}{fmtDE(chg)} %
                  </Text>
                  <Text style={[s.resultCell, { flex: 1.5, textAlign: 'right', color: '#94A3B8' }]}>
                    {fmtBig(stock.marketCap)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : !hasSearched ? (
          <View style={s.center}>
            <Ionicons name="funnel-outline" size={48} color="#1e1e20" />
            <Text style={s.emptyTitle}>Filter setzen & suchen</Text>
            <Text style={s.emptyText}>Oder wähle einen Preset oben</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  filterToggle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#111113', borderWidth: 1, borderColor: '#1e1e20', alignItems: 'center', justifyContent: 'center' },

  presetsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  presetBtn: { backgroundColor: '#111113', borderWidth: 1, borderColor: '#1e1e20', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minWidth: 120 },
  presetLabel: { color: '#F8FAFC', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  presetDesc: { color: '#64748B', fontSize: 10 },

  filterBox: { marginHorizontal: 16, backgroundColor: '#111113', borderRadius: 16, borderWidth: 1, borderColor: '#1e1e20', padding: 16, marginBottom: 12 },
  filterTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  filterLabel: { color: '#64748B', fontSize: 11, fontWeight: '600', marginBottom: 6 },
  sectorRow: { flexDirection: 'row', gap: 6 },
  sectorBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1e1e20', borderWidth: 1, borderColor: '#2c2c2e' },
  sectorBtnActive: { borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.1)' },
  sectorBtnText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  sectorBtnTextActive: { color: '#22C55E' },
  inputGrid: { gap: 10 },
  inputItem: {},
  input: { backgroundColor: '#1e1e20', borderRadius: 10, borderWidth: 1, borderColor: '#2c2c2e', color: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  filterBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  resetBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#1e1e20', alignItems: 'center' },
  resetBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  searchBtn: { flex: 2, backgroundColor: '#22C55E', paddingVertical: 13, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  searchBtnText: { color: '#0a0a0b', fontWeight: '700', fontSize: 15 },

  center: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  loadingText: { color: '#64748B', marginTop: 8 },
  emptyTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '600' },
  emptyText: { color: '#64748B', fontSize: 13 },

  resultsBox: { marginHorizontal: 16, marginBottom: 32 },
  sortBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  resultCount: { color: '#64748B', fontSize: 12, fontWeight: '600', marginRight: 4 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#111113', borderWidth: 1, borderColor: '#1e1e20', flexDirection: 'row', alignItems: 'center', gap: 3 },
  sortBtnActive: { borderColor: 'rgba(34,197,94,0.4)', backgroundColor: 'rgba(34,197,94,0.08)' },
  sortBtnText: { color: '#475569', fontSize: 11, fontWeight: '600' },
  sortBtnTextActive: { color: '#22C55E' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e1e20' },
  thCell: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#111113' },
  resultBorder: { borderTopWidth: 1, borderTopColor: '#1e1e20' },
  resultCell: { flexDirection: 'row', alignItems: 'center' } as any,
  stockSymbol: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },
  stockName: { color: '#64748B', fontSize: 10, marginTop: 1 },
});
