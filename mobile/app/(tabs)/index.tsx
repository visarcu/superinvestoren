import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { searchStocks } from '../../lib/api';
import { supabase } from '../../lib/auth';
import StockRow from '../../components/StockRow';

const SYMBOLS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META'];

export default function DashboardScreen() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserName(data.user?.email?.split('@')[0] || 'Investor');
    });
    loadQuotes();
  }, []);

  async function loadQuotes() {
    try {
      const res = await fetch(`https://finclue.de/api/quotes?symbols=${SYMBOLS.join(',')}`);
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const data = await searchStocks(q);
      setSearchResults(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch { setSearchResults([]); }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadQuotes(); }} tintColor="#22C55E" />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.greeting}>{greeting}</Text>
          <Text style={s.name}>{userName}</Text>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color="#475569" style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Aktie suchen z.B. AAPL..."
              placeholderTextColor="#475569"
              value={searchQuery}
              onChangeText={handleSearch}
              keyboardAppearance="dark"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={18} color="#475569" />
              </TouchableOpacity>
            )}
          </View>

          {searchResults.length > 0 && (
            <View style={s.searchDropdown}>
              {searchResults.map((item, i) => (
                <TouchableOpacity
                  key={item.symbol}
                  style={[s.searchItem, i > 0 && s.searchItemBorder]}
                  onPress={() => { setSearchQuery(''); setSearchResults([]); router.push(`/stock/${item.symbol}`); }}
                  activeOpacity={0.7}
                >
                  <Text style={s.searchSymbol}>{item.symbol}</Text>
                  <Text style={s.searchName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.searchEx}>{item.exchangeShortName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Market */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>MÄRKTE</Text>
          {loading
            ? <ActivityIndicator color="#22C55E" style={{ marginTop: 16 }} />
            : quotes.map(q => <StockRow key={q.symbol} quote={q} onPress={() => router.push(`/stock/${q.symbol}`)} />)
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  greeting: { color: '#64748B', fontSize: 13 },
  name: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 14 },
  searchDropdown: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B', borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  searchItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  searchItemBorder: { borderTopWidth: 1, borderTopColor: '#1E293B' },
  searchSymbol: { color: '#F8FAFC', fontWeight: '700', fontSize: 13, width: 60 },
  searchName: { color: '#94A3B8', fontSize: 13, flex: 1 },
  searchEx: { color: '#475569', fontSize: 11 },
  section: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { color: '#64748B', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 10 },
});
