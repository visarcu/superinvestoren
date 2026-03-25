import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const TOP_INVESTORS = [
  { slug: 'warren-buffett', name: 'Warren Buffett', fund: 'Berkshire Hathaway', aum: '$300B+' },
  { slug: 'bill-ackman', name: 'Bill Ackman', fund: 'Pershing Square', aum: '$10B+' },
  { slug: 'michael-burry', name: 'Michael Burry', fund: 'Scion Asset Mgmt', aum: '$300M+' },
  { slug: 'david-tepper', name: 'David Tepper', fund: 'Appaloosa Mgmt', aum: '$14B+' },
  { slug: 'ray-dalio', name: 'Ray Dalio', fund: 'Bridgewater', aum: '$150B+' },
  { slug: 'george-soros', name: 'George Soros', fund: 'Soros Fund Mgmt', aum: '$25B+' },
  { slug: 'carl-icahn', name: 'Carl Icahn', fund: 'Icahn Enterprises', aum: '$5B+' },
  { slug: 'chase-coleman', name: 'Chase Coleman', fund: 'Tiger Global', aum: '$25B+' },
  { slug: 'stanley-druckenmiller', name: 'Stanley Druckenmiller', fund: 'Duquesne Family', aum: '$3B+' },
  { slug: 'ken-griffin', name: 'Ken Griffin', fund: 'Citadel Advisors', aum: '$60B+' },
];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('');
}

const COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

export default function InvestorsScreen() {
  const [search, setSearch] = useState('');
  const filtered = TOP_INVESTORS.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.fund.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-primary">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-text-primary text-2xl font-bold tracking-tight">Superinvestoren</Text>
        <Text className="text-text-secondary text-sm">Top 13F Portfolio-Tracker</Text>
      </View>

      <View className="px-4 mb-3">
        <View className="flex-row items-center bg-bg-card border border-bg-elevated rounded-xl px-3 py-2.5 gap-2">
          <Ionicons name="search" size={16} color="#475569" />
          <TextInput
            className="flex-1 text-text-primary text-sm"
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
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => router.push(`https://finclue.de/superinvestor/${item.slug}`)}
            className="bg-bg-card rounded-xl px-4 py-4 flex-row items-center gap-3"
            activeOpacity={0.7}
          >
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: COLORS[index % COLORS.length] + '20', borderWidth: 1, borderColor: COLORS[index % COLORS.length] + '40' }}
            >
              <Text style={{ color: COLORS[index % COLORS.length] }} className="font-bold text-sm">
                {getInitials(item.name)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-text-primary font-semibold">{item.name}</Text>
              <Text className="text-text-secondary text-xs mt-0.5">{item.fund}</Text>
            </View>
            <View className="items-end gap-1">
              <Text className="text-text-muted text-xs">{item.aum}</Text>
              <Ionicons name="chevron-forward" size={14} color="#475569" />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
