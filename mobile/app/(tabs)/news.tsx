import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/auth';

const BASE_URL = 'https://finclue.de';

type SubTab = 'ratings' | 'news';

// ── Analyst Ratings Types ─────────────────────────────────

interface Grading {
  symbol: string;
  publishedDate: string;
  newsURL: string;
  newsTitle: string;
  newsPublisher: string;
  newGrade: string;
  previousGrade: string;
  gradingCompany: string;
  action: string;
  priceWhenPosted: number;
}

type FilterAction = 'all' | 'upgrade' | 'downgrade' | 'initiated';

const ACTION_COLORS: Record<string, string> = {
  upgrade: '#22C55E',
  downgrade: '#EF4444',
  initiated: '#3B82F6',
  reiterated: '#F59E0B',
  maintained: '#64748B',
};

const FILTERS: { key: FilterAction; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'upgrade', label: 'Upgrades' },
  { key: 'downgrade', label: 'Downgrades' },
  { key: 'initiated', label: 'Initiated' },
];

// ── News Types ────────────────────────────────────────────

interface NewsArticle {
  title: string;
  url: string;
  publishedDate: string;
  image: string;
  site: string;
  text: string;
  symbol?: string;
}

// ── Helpers ───────────────────────────────────────────────

function getColor(action: string) {
  return ACTION_COLORS[action?.toLowerCase()] || '#64748B';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Gestern';
  if (d < 7) return `vor ${d} Tagen`;
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export default function NewsScreen() {
  const [subTab, setSubTab] = useState<SubTab>('ratings');

  // ── Analyst Ratings State ──
  const [gradings, setGradings] = useState<Grading[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [ratingsRefreshing, setRatingsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterAction>('all');

  // ── Market News State ──
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsRefreshing, setNewsRefreshing] = useState(false);

  // ── Load Functions ──────────────────────────────────────

  const loadRatings = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/analyst-gradings/recent?limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setGradings(data);
    } finally {
      setRatingsLoading(false);
      setRatingsRefreshing(false);
    }
  }, []);

  const loadNews = useCallback(async () => {
    try {
      // Load watchlist + portfolio tickers for personalized news
      const { data: { session } } = await supabase.auth.getSession();
      let tickers: string[] = [];

      if (session) {
        const [wlRes, pfRes] = await Promise.all([
          supabase.from('watchlists').select('ticker').eq('user_id', session.user.id),
          supabase.from('portfolios').select('id').eq('user_id', session.user.id),
        ]);

        const wlTickers = (wlRes.data || []).map((w: any) => w.ticker);

        let pfTickers: string[] = [];
        if (pfRes.data && pfRes.data.length > 0) {
          const portfolioIds = pfRes.data.map((p: any) => p.id);
          const { data: holdings } = await supabase
            .from('portfolio_holdings')
            .select('symbol')
            .in('portfolio_id', portfolioIds);
          pfTickers = (holdings || []).map((h: any) => h.symbol);
        }

        tickers = [...new Set([...wlTickers, ...pfTickers])];
      }

      // Fetch news for user's tickers (max 5 for performance)
      const tickersToFetch = tickers.slice(0, 5);
      const allArticles: NewsArticle[] = [];

      if (tickersToFetch.length > 0) {
        const results = await Promise.all(
          tickersToFetch.map(t =>
            fetch(`${BASE_URL}/api/stock-news/${t}?limit=5`)
              .then(r => r.ok ? r.json() : [])
              .catch(() => [])
          )
        );
        for (const articles of results) {
          if (Array.isArray(articles)) allArticles.push(...articles);
        }
      }

      // Deduplicate by URL and sort by date
      const seen = new Set<string>();
      const unique = allArticles.filter(a => {
        if (seen.has(a.url)) return false;
        seen.add(a.url);
        return true;
      });
      unique.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
      setArticles(unique.slice(0, 30));
    } finally {
      setNewsLoading(false);
      setNewsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadRatings(); }, [loadRatings]);
  useEffect(() => { loadNews(); }, [loadNews]);

  // ── Filtered Ratings ────────────────────────────────────

  const filtered = gradings.filter(g => {
    if (filter === 'all') return true;
    return g.action?.toLowerCase() === filter;
  });

  const stats = {
    upgrade: gradings.filter(g => g.action?.toLowerCase() === 'upgrade').length,
    downgrade: gradings.filter(g => g.action?.toLowerCase() === 'downgrade').length,
  };

  // ── Render Helpers ──────────────────────────────────────

  function renderRatingItem({ item: g, index: i }: { item: Grading; index: number }) {
    const color = getColor(g.action);
    const hasGradeChange = g.previousGrade && g.newGrade && g.previousGrade !== g.newGrade;
    const hasNews = !!g.newsURL;

    return (
      <TouchableOpacity
        style={[s.ratingRow, i > 0 && s.rowBorder]}
        onPress={() => {
          if (hasNews) {
            router.push(`/news-article?url=${encodeURIComponent(g.newsURL)}&title=${encodeURIComponent(g.newsTitle || g.gradingCompany)}`);
          } else {
            router.push(`/stock/${g.symbol}?tab=estimates`);
          }
        }}
        activeOpacity={0.6}
      >
        <View style={[s.actionBadge, { backgroundColor: color + '15' }]}>
          <Ionicons
            name={g.action?.toLowerCase() === 'upgrade' ? 'trending-up' :
                  g.action?.toLowerCase() === 'downgrade' ? 'trending-down' :
                  g.action?.toLowerCase() === 'initiated' ? 'add-circle' : 'refresh'}
            size={18}
            color={color}
          />
        </View>

        <View style={s.ratingContent}>
          <View style={s.ratingTopRow}>
            <Text style={s.ratingSymbol}>{g.symbol}</Text>
            <View style={[s.actionPill, { backgroundColor: color + '15' }]}>
              <Text style={[s.actionPillText, { color }]}>{g.action}</Text>
            </View>
            <Text style={s.ratingTime}>{timeAgo(g.publishedDate)}</Text>
          </View>

          <Text style={s.ratingCompany}>{g.gradingCompany}</Text>

          {hasGradeChange && (
            <View style={s.gradeRow}>
              <Text style={s.gradePrev}>{g.previousGrade}</Text>
              <Ionicons name="arrow-forward" size={10} color="#475569" />
              <Text style={s.gradeNew}>{g.newGrade}</Text>
            </View>
          )}

          {g.newsTitle ? (
            <Text style={s.ratingNewsTitle} numberOfLines={2}>{g.newsTitle}</Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={14} color="#334155" />
      </TouchableOpacity>
    );
  }

  function renderNewsItem({ item: article, index: i }: { item: NewsArticle; index: number }) {
    return (
      <TouchableOpacity
        style={[s.newsRow, i > 0 && s.rowBorder]}
        onPress={() => router.push(
          `/news-article?url=${encodeURIComponent(article.url)}&title=${encodeURIComponent(article.title)}`
        )}
        activeOpacity={0.6}
      >
        {article.image ? (
          <Image source={{ uri: article.image }} style={s.newsImage} />
        ) : (
          <View style={[s.newsImage, s.newsImagePlaceholder]}>
            <Ionicons name="newspaper-outline" size={20} color="#475569" />
          </View>
        )}

        <View style={s.newsContent}>
          {article.symbol && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                router.push(`/stock/${article.symbol}`);
              }}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={s.newsTicker}>{article.symbol}</Text>
            </TouchableOpacity>
          )}
          <Text style={s.newsTitle} numberOfLines={3}>{article.title}</Text>
          <View style={s.newsMetaRow}>
            <Text style={s.newsSite}>{article.site}</Text>
            <Text style={s.newsTime}>{timeAgo(article.publishedDate)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Main Render ─────────────────────────────────────────

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>News</Text>
        <TouchableOpacity
          onPress={() => router.push('/notifications-center')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Sub-Tabs */}
      <View style={s.subTabRow}>
        <TouchableOpacity
          style={[s.subTab, subTab === 'ratings' && s.subTabActive]}
          onPress={() => setSubTab('ratings')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="trending-up"
            size={16}
            color={subTab === 'ratings' ? '#22C55E' : '#64748B'}
          />
          <Text style={[s.subTabText, subTab === 'ratings' && s.subTabTextActive]}>
            Analyst Ratings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.subTab, subTab === 'news' && s.subTabActive]}
          onPress={() => setSubTab('news')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="newspaper-outline"
            size={16}
            color={subTab === 'news' ? '#22C55E' : '#64748B'}
          />
          <Text style={[s.subTabText, subTab === 'news' && s.subTabTextActive]}>
            Markt-News
          </Text>
        </TouchableOpacity>
      </View>

      {/* ══════════ Analyst Ratings ══════════ */}
      {subTab === 'ratings' && (
        ratingsLoading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color="#22C55E" size="large" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(g, i) => `${g.symbol}-${g.publishedDate}-${i}`}
            renderItem={renderRatingItem}
            refreshControl={
              <RefreshControl
                refreshing={ratingsRefreshing}
                onRefresh={() => { setRatingsRefreshing(true); loadRatings(); }}
                tintColor="#22C55E"
              />
            }
            ListHeaderComponent={
              <>
                {/* Stats */}
                <View style={s.statsRow}>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Upgrades</Text>
                    <Text style={[s.statValue, { color: '#22C55E' }]}>{stats.upgrade}</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Downgrades</Text>
                    <Text style={[s.statValue, { color: '#EF4444' }]}>{stats.downgrade}</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Gesamt</Text>
                    <Text style={s.statValue}>{gradings.length}</Text>
                  </View>
                </View>

                {/* Filters */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.filterScroll}
                  contentContainerStyle={s.filterRow}
                >
                  {FILTERS.map(f => (
                    <TouchableOpacity
                      key={f.key}
                      style={[s.filterPill, filter === f.key && s.filterPillActive]}
                      onPress={() => setFilter(f.key)}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            }
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Ionicons name="analytics-outline" size={32} color="#475569" />
                <Text style={s.emptyText}>Keine Ratings gefunden</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )
      )}

      {/* ══════════ Markt-News ══════════ */}
      {subTab === 'news' && (
        newsLoading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color="#22C55E" size="large" />
          </View>
        ) : (
          <FlatList
            data={articles}
            keyExtractor={(a, i) => `${a.url}-${i}`}
            renderItem={renderNewsItem}
            refreshControl={
              <RefreshControl
                refreshing={newsRefreshing}
                onRefresh={() => { setNewsRefreshing(true); loadNews(); }}
                tintColor="#22C55E"
              />
            }
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Ionicons name="newspaper-outline" size={32} color="#475569" />
                <Text style={s.emptyTitle}>Keine News</Text>
                <Text style={s.emptyText}>
                  Füge Aktien zu deiner Watchlist oder deinem Portfolio hinzu, um personalisierte News zu erhalten.
                </Text>
              </View>
            }
            contentContainerStyle={articles.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
          />
        )
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  headerTitle: { color: '#F8FAFC', fontSize: 28, fontWeight: '800' },

  // ── Sub-Tabs ──
  subTabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#111113', borderRadius: 12, padding: 4,
  },
  subTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  subTabActive: { backgroundColor: '#1E293B' },
  subTabText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  subTabTextActive: { color: '#F8FAFC' },

  // ── Loading ──
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Stats ──
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#111113', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1e1e20',
  },
  statLabel: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  statValue: { color: '#F8FAFC', fontSize: 20, fontWeight: '700' },

  // ── Filters ──
  filterScroll: { marginTop: 8, marginBottom: 4 },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#111113', borderWidth: 1, borderColor: '#1e1e20',
  },
  filterPillActive: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: '#22C55E' },
  filterText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#22C55E' },

  // ── Shared ──
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1E293B' },

  // ── Rating Row ──
  ratingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  actionBadge: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ratingContent: { flex: 1, minWidth: 0 },
  ratingTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingSymbol: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  actionPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  actionPillText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  ratingTime: { color: '#475569', fontSize: 11, marginLeft: 'auto' },
  ratingCompany: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  gradePrev: { color: '#64748B', fontSize: 12, textDecorationLine: 'line-through' },
  gradeNew: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },
  ratingNewsTitle: { color: '#475569', fontSize: 12, lineHeight: 16, marginTop: 4 },

  // ── News Row ──
  newsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  newsImage: {
    width: 80, height: 80, borderRadius: 10, backgroundColor: '#111113', flexShrink: 0,
  },
  newsImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  newsContent: { flex: 1, minWidth: 0, justifyContent: 'center' },
  newsTicker: {
    color: '#22C55E', fontSize: 12, fontWeight: '700', marginBottom: 4,
  },
  newsTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  newsMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  newsSite: { color: '#64748B', fontSize: 12 },
  newsTime: { color: '#475569', fontSize: 11 },

  // ── Empty ──
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { color: '#F8FAFC', fontSize: 17, fontWeight: '600' },
  emptyText: { color: '#475569', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
