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

type SubTab = 'news' | 'ratings';

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
  upgrade: '#34C759',
  downgrade: '#FF3B30',
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

const FALLBACK_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'];

// ── Helpers ───────────────────────────────────────────────

function getColor(action: string) {
  return ACTION_COLORS[action?.toLowerCase()] || '#64748B';
}

function actionDE(action: string): string {
  const a = action?.toLowerCase();
  if (a === 'upgrade') return 'Hochgestuft';
  if (a === 'downgrade') return 'Herabgestuft';
  if (a === 'initiated' || a?.includes('initiat')) return 'Neu bewertet';
  if (a === 'hold' || a === 'reiterated' || a === 'maintained') return 'Bestätigt';
  return action;
}

function buildGermanDescription(g: Grading): string {
  const label = actionDE(g.action);
  const hasChange = g.previousGrade && g.newGrade && g.previousGrade !== g.newGrade;
  const change = hasChange ? ` (${g.previousGrade} → ${g.newGrade})` : g.newGrade ? ` → ${g.newGrade}` : '';
  return `${g.gradingCompany} hat ${g.symbol} ${label.toLowerCase()}${change}`;
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
  const [subTab, setSubTab] = useState<SubTab>('news');

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

      // Use user tickers or fallback to popular stocks
      const tickersToFetch = tickers.length > 0 ? tickers.slice(0, 5) : FALLBACK_TICKERS.slice(0, 5);
      const allArticles: NewsArticle[] = [];

      {
        const results = await Promise.all(
          tickersToFetch.map(t =>
            fetch(`${BASE_URL}/api/stock-news/${t}?limit=5`)
              .then(r => r.ok ? r.json() : { articles: [] })
              .catch(() => ({ articles: [] }))
          )
        );
        for (const res of results) {
          const items = Array.isArray(res) ? res : (res.articles || []);
          allArticles.push(...items);
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
    const label = actionDE(g.action);
    const description = buildGermanDescription(g);

    return (
      <TouchableOpacity
        style={[s.ratingRow, i > 0 && s.rowBorder]}
        onPress={() => router.push(`/stock/${g.symbol}?tab=estimates`)}
        activeOpacity={0.6}
      >
        <View style={[s.actionBadge, { backgroundColor: color + '15' }]}>
          <Ionicons
            name={g.action?.toLowerCase() === 'upgrade' ? 'trending-up' :
                  g.action?.toLowerCase() === 'downgrade' ? 'trending-down' :
                  g.action?.toLowerCase()?.includes('initiat') ? 'add-circle' : 'refresh'}
            size={18}
            color={color}
          />
        </View>

        <View style={s.ratingContent}>
          <View style={s.ratingTopRow}>
            <Text style={s.ratingSymbol}>{g.symbol}</Text>
            <View style={[s.actionPill, { backgroundColor: color + '15' }]}>
              <Text style={[s.actionPillText, { color }]}>{label}</Text>
            </View>
            <Text style={s.ratingTime}>{timeAgo(g.publishedDate)}</Text>
          </View>

          <Text style={s.ratingCompany}>{g.gradingCompany}</Text>

          {hasGradeChange && (
            <View style={s.gradeRow}>
              <Text style={s.gradePrev}>{g.previousGrade}</Text>
              <Ionicons name="arrow-forward" size={10} color={theme.text.tertiary} />
              <Text style={s.gradeNew}>{g.newGrade}</Text>
            </View>
          )}

          <Text style={s.ratingDescription} numberOfLines={2}>{description}</Text>
        </View>

        <Ionicons name="chevron-forward" size={14} color={theme.text.muted} />
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
            <Ionicons name="newspaper-outline" size={20} color={theme.text.tertiary} />
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
          <Ionicons name="notifications-outline" size={22} color={theme.text.secondary} />
        </TouchableOpacity>
      </View>

      {/* Sub-Tabs */}
      <View style={s.subTabRow}>
        <TouchableOpacity
          style={[s.subTab, subTab === 'news' && s.subTabActive]}
          onPress={() => setSubTab('news')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="newspaper-outline"
            size={16}
            color={subTab === 'news' ? theme.text.primary : theme.text.tertiary}
          />
          <Text style={[s.subTabText, subTab === 'news' && s.subTabTextActive]}>
            Markt-News
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.subTab, subTab === 'ratings' && s.subTabActive]}
          onPress={() => setSubTab('ratings')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="trending-up"
            size={16}
            color={subTab === 'ratings' ? theme.text.primary : theme.text.tertiary}
          />
          <Text style={[s.subTabText, subTab === 'ratings' && s.subTabTextActive]}>
            Analyst Ratings
          </Text>
        </TouchableOpacity>
      </View>

      {/* ══════════ Analyst Ratings ══════════ */}
      {subTab === 'ratings' && (
        ratingsLoading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={theme.text.tertiary} size="large" />
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
                tintColor={theme.text.tertiary}
              />
            }
            ListHeaderComponent={
              <>
                {/* Stats */}
                <View style={s.statsRow}>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Upgrades</Text>
                    <Text style={[s.statValue, { color: '#34C759' }]}>{stats.upgrade}</Text>
                  </View>
                  <View style={s.statCard}>
                    <Text style={s.statLabel}>Downgrades</Text>
                    <Text style={[s.statValue, { color: '#FF3B30' }]}>{stats.downgrade}</Text>
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
                <Ionicons name="analytics-outline" size={32} color={theme.text.tertiary} />
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
            <ActivityIndicator color={theme.text.tertiary} size="large" />
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
                tintColor={theme.text.tertiary}
              />
            }
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Ionicons name="newspaper-outline" size={32} color={theme.text.tertiary} />
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

import { theme, tabularStyle } from '../../lib/theme';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl, paddingTop: theme.space.md, paddingBottom: theme.space.md,
  },
  headerTitle: { color: theme.text.primary, fontSize: 22, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight },

  subTabRow: {
    flexDirection: 'row', marginHorizontal: theme.space.lg, marginBottom: theme.space.md,
    backgroundColor: theme.bg.card, borderRadius: theme.radius.md, padding: 3,
    borderWidth: 1, borderColor: theme.border.default,
  },
  subTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.space.xs + 2, paddingVertical: theme.space.sm, borderRadius: theme.radius.sm,
  },
  subTabActive: { backgroundColor: theme.bg.cardElevated },
  subTabText: { color: theme.text.tertiary, fontSize: theme.font.title3, fontWeight: theme.weight.medium },
  subTabTextActive: { color: theme.text.primary, fontWeight: theme.weight.semibold },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', paddingHorizontal: theme.space.lg, paddingTop: theme.space.sm, paddingBottom: theme.space.xs, gap: theme.space.sm + 2 },
  statCard: {
    flex: 1, backgroundColor: theme.bg.card, borderRadius: theme.radius.md, padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
  },
  statLabel: { color: theme.text.tertiary, fontSize: theme.font.caption, marginBottom: theme.space.xs, fontWeight: theme.weight.medium, letterSpacing: theme.tracking.wide, textTransform: 'uppercase' },
  statValue: { color: theme.text.primary, fontSize: theme.font.display2, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.normal, ...tabularStyle },

  filterScroll: { marginTop: theme.space.sm, marginBottom: theme.space.xs },
  filterRow: { paddingHorizontal: theme.space.lg, gap: theme.space.sm, paddingBottom: theme.space.sm },
  filterPill: {
    paddingHorizontal: theme.space.md + 2, paddingVertical: theme.space.xs + 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.bg.card,
    borderWidth: 1, borderColor: theme.border.default,
  },
  filterPillActive: { backgroundColor: theme.bg.cardElevated, borderColor: theme.border.strong },
  filterText: { color: theme.text.tertiary, fontSize: theme.font.body, fontWeight: theme.weight.medium },
  filterTextActive: { color: theme.text.primary, fontWeight: theme.weight.semibold },

  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border.default },

  ratingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 2, gap: theme.space.md,
  },
  actionBadge: {
    width: 40, height: 40, borderRadius: theme.radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ratingContent: { flex: 1, minWidth: 0 },
  ratingTopRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm },
  ratingSymbol: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  actionPill: { paddingHorizontal: theme.space.sm, paddingVertical: 2, borderRadius: theme.radius.sm },
  actionPillText: { fontSize: theme.font.caption, fontWeight: theme.weight.semibold, textTransform: 'capitalize' },
  ratingTime: { color: theme.text.muted, fontSize: theme.font.caption, marginLeft: 'auto', ...tabularStyle },
  ratingCompany: { color: theme.text.secondary, fontSize: theme.font.body, marginTop: 2 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs, marginTop: theme.space.xs },
  gradePrev: { color: theme.text.tertiary, fontSize: theme.font.bodySm, textDecorationLine: 'line-through' },
  gradeNew: { color: theme.text.primary, fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold },
  ratingDescription: { color: theme.text.tertiary, fontSize: theme.font.body, lineHeight: 17, marginTop: theme.space.xs },

  newsRow: {
    flexDirection: 'row', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 2, gap: theme.space.md,
  },
  newsImage: {
    width: 72, height: 72, borderRadius: theme.radius.md,
    backgroundColor: theme.bg.card, flexShrink: 0,
  },
  newsImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  newsContent: { flex: 1, minWidth: 0, justifyContent: 'center' },
  newsTicker: {
    color: theme.accent.positive, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, marginBottom: theme.space.xs, letterSpacing: theme.tracking.wide,
  },
  newsTitle: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold, lineHeight: 19 },
  newsMetaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, marginTop: theme.space.xs + 2 },
  newsSite: { color: theme.text.tertiary, fontSize: theme.font.caption },
  newsTime: { color: theme.text.muted, fontSize: theme.font.caption, ...tabularStyle },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: theme.space.md },
  emptyTitle: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
  emptyText: { color: theme.text.tertiary, fontSize: theme.font.title3, textAlign: 'center', lineHeight: 20 },
});
