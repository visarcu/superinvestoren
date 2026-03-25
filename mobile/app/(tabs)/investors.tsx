import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const TOP_INVESTORS = [
  { slug: 'buffett', name: 'Warren Buffett', fund: 'Berkshire Hathaway', aum: '$300B+' },
  { slug: 'ackman', name: 'Bill Ackman', fund: 'Pershing Square', aum: '$10B+' },
  { slug: 'burry', name: 'Michael Burry', fund: 'Scion Asset Mgmt', aum: '$300M+' },
  { slug: 'tepper', name: 'David Tepper', fund: 'Appaloosa Mgmt', aum: '$14B+' },
  { slug: 'dalio', name: 'Ray Dalio', fund: 'Bridgewater', aum: '$150B+' },
  { slug: 'soros', name: 'George Soros', fund: 'Soros Fund Mgmt', aum: '$25B+' },
  { slug: 'icahn', name: 'Carl Icahn', fund: 'Icahn Enterprises', aum: '$5B+' },
  { slug: 'coleman', name: 'Chase Coleman', fund: 'Tiger Global', aum: '$25B+' },
  { slug: 'druckenmiller', name: 'Stanley Druckenmiller', fund: 'Duquesne Family Office', aum: '$3B+' },
  { slug: 'einhorn', name: 'David Einhorn', fund: 'Greenlight Capital', aum: '$1B+' },
  { slug: 'klarman', name: 'Seth Klarman', fund: 'Baupost Group', aum: '$27B+' },
  { slug: 'marks', name: 'Howard Marks', fund: 'Oaktree Capital', aum: '$170B+' },
  { slug: 'greenblatt', name: 'Joel Greenblatt', fund: 'Gotham Asset Mgmt', aum: '$2B+' },
  { slug: 'pabrai', name: 'Mohnish Pabrai', fund: 'Pabrai Funds', aum: '$500M+' },
];

const COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('');
}

export default function InvestorsScreen() {
  const [search, setSearch] = useState('');
  const filtered = TOP_INVESTORS.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.fund.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Superinvestoren</Text>
        <Text style={styles.subtitle}>Top 13F Portfolio-Tracker</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#475569" />
          <TextInput
            style={styles.searchInput}
            placeholder="Investor suchen..."
            placeholderTextColor="#475569"
            value={search}
            onChangeText={setSearch}
            keyboardAppearance="dark"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item, index }) => {
          const color = COLORS[index % COLORS.length];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/investor/${item.slug}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: color + '20', borderColor: color + '50' }]}>
                <Text style={[styles.avatarText, { color }]}>{getInitials(item.name)}</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.investorName}>{item.name}</Text>
                <Text style={styles.investorFund}>{item.fund}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.aum}>{item.aum}</Text>
                <Ionicons name="chevron-forward" size={14} color="#475569" style={{ marginTop: 2 }} />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#64748B', fontSize: 13, marginTop: 2 },
  searchContainer: { paddingHorizontal: 16, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: '#1E293B' },
  searchInput: { flex: 1, color: '#F8FAFC', fontSize: 14 },
  card: { backgroundColor: '#0F172A', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#1E293B' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarText: { fontSize: 14, fontWeight: '700' },
  cardContent: { flex: 1 },
  investorName: { color: '#F8FAFC', fontSize: 15, fontWeight: '600' },
  investorFund: { color: '#64748B', fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  aum: { color: '#475569', fontSize: 12 },
});
