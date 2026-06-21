import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { supabase, checkIsPremium } from '../../lib/auth';
import { theme, tabularStyle, perfColor } from '../../lib/theme';
import StockLogo from '../StockLogo';

const BASE_URL = 'https://finclue.de';

interface Position {
  ticker: string;
  signal: 'bullish' | 'neutral' | 'bearish';
  score: number;
  reason: string;
  superInvestorActivity?: string;
  newsHighlight?: string;
}

interface AnalysisResult {
  portfolioScore: number;
  portfolioVerdict: string;
  positions: Position[];
  topInsight: string;
  timestamp: string;
}

interface HoldingInput {
  symbol: string;
  quantity: number;
  value: number;
  gain_loss_percent: number;
}

interface Props {
  holdings: HoldingInput[];
  onUpgrade: () => void;
}

const SIGNAL_LABEL: Record<string, string> = {
  bullish: 'Bullish', neutral: 'Neutral', bearish: 'Bearish',
};
const SIGNAL_ICON: Record<string, string> = {
  bullish: 'trending-up', neutral: 'remove', bearish: 'trending-down',
};
const SIGNAL_COLOR: Record<string, string> = {
  bullish: theme.accent.positive, neutral: theme.text.tertiary, bearish: theme.accent.negative,
};

function scoreColor(score: number): string {
  if (score >= 70) return theme.accent.positive;
  if (score >= 40) return theme.accent.warning;
  return theme.accent.negative;
}

// Score-Ring (SVG)
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <SvgCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={theme.bg.cardHover}
          strokeWidth={stroke}
          fill="transparent"
        />
        <SvgCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={[ringStyles.score, { color }]}>{Math.round(score)}</Text>
        <Text style={ringStyles.outOf}>/ 100</Text>
      </View>
    </View>
  );
}
const ringStyles = StyleSheet.create({
  score: { fontSize: 28, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight, ...tabularStyle },
  outOf: { color: theme.text.tertiary, fontSize: theme.font.captionSm, marginTop: -2 },
});

export default function AIAnalysisView({ holdings, onUpgrade }: Props) {
  const [premiumChecked, setPremiumChecked] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkIsPremium().then(p => { setIsPremium(p); setPremiumChecked(true); });
  }, []);

  async function runAnalysis() {
    if (!isPremium) { onUpgrade(); return; }
    if (holdings.length === 0) return;

    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/(auth)/login'); return; }

      const res = await fetch(`${BASE_URL}/api/portfolio/ai-analyse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ holdings }),
      });

      if (res.status === 429) {
        throw new Error('Du hast das Analyse-Limit erreicht (5 pro 30 Minuten). Bitte später erneut versuchen.');
      }
      if (res.status === 403) {
        setIsPremium(false);
        onUpgrade();
        return;
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error || 'Analyse fehlgeschlagen');
      }

      const data = await res.json();
      setAnalysis(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || 'Analyse fehlgeschlagen');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  if (!premiumChecked) {
    return <ActivityIndicator color={theme.accent.positive} style={{ marginTop: 32 }} />;
  }

  // Premium-Gate
  if (!isPremium) {
    return (
      <View style={s.gateCard}>
        <View style={s.gateIcon}>
          <Ionicons name="sparkles" size={32} color="#BF5AF2" />
        </View>
        <Text style={s.gateTitle}>KI-Portfolio-Analyse</Text>
        <Text style={s.gateText}>
          Hol dir Premium für die tiefgehende Analyse deines Portfolios — Risiken, Klumpen, News zu deinen Aktien und konkrete Optimierungs-Ideen.
        </Text>
        <View style={s.gateFeatures}>
          <View style={s.gateFeature}>
            <Ionicons name="shield-checkmark" size={16} color={theme.accent.positive} />
            <Text style={s.gateFeatureText}>Portfolio-Score (0–100) mit Begründung</Text>
          </View>
          <View style={s.gateFeature}>
            <Ionicons name="newspaper" size={16} color={theme.accent.info} />
            <Text style={s.gateFeatureText}>Aktuelle News zu jeder Position</Text>
          </View>
          <View style={s.gateFeature}>
            <Ionicons name="people" size={16} color={theme.accent.warning} />
            <Text style={s.gateFeatureText}>Superinvestoren-Aktivität live</Text>
          </View>
          <View style={s.gateFeature}>
            <Ionicons name="bulb" size={16} color="#BF5AF2" />
            <Text style={s.gateFeatureText}>Konkrete Optimierungs-Ideen</Text>
          </View>
        </View>
        <TouchableOpacity style={s.upgradeBtn} onPress={onUpgrade}>
          <Ionicons name="sparkles" size={16} color={theme.text.inverse} />
          <Text style={s.upgradeBtnText}>Premium starten</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty holdings
  if (holdings.length === 0) {
    return (
      <View style={s.emptyCard}>
        <Ionicons name="briefcase-outline" size={32} color={theme.text.tertiary} />
        <Text style={s.emptyTitle}>Kein Portfolio</Text>
        <Text style={s.emptyText}>Lege erst Positionen an, um eine Analyse zu starten.</Text>
      </View>
    );
  }

  // Initial state (before analysis)
  if (!analysis && !loading) {
    return (
      <View>
        <View style={s.startCard}>
          <View style={s.startIcon}>
            <Ionicons name="sparkles" size={32} color="#BF5AF2" />
          </View>
          <Text style={s.startTitle}>Bereit für deine KI-Analyse</Text>
          <Text style={s.startText}>
            Finclue AI analysiert deine {holdings.length} Positionen — Score, Risiko, News und konkrete Insights.
          </Text>
          <TouchableOpacity style={s.runBtn} onPress={runAnalysis}>
            <Ionicons name="sparkles" size={16} color={theme.text.inverse} />
            <Text style={s.runBtnText}>Analyse starten</Text>
          </TouchableOpacity>
          {error && (
            <Text style={s.errorText}>{error}</Text>
          )}
          <Text style={s.startHint}>
            Dauert ca. 30–60 Sekunden · Maximal 5 Analysen pro 30 Min.
          </Text>
        </View>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View>
        <View style={s.loadingCard}>
          <ActivityIndicator color="#BF5AF2" size="large" />
          <Text style={s.loadingTitle}>KI analysiert dein Portfolio…</Text>
          <Text style={s.loadingText}>
            Aktienkurse abrufen · News durchsuchen · Superinvestoren-Aktivität prüfen · Score berechnen
          </Text>
        </View>
        {/* Skeleton positions */}
        {[1, 2, 3].map(i => (
          <View key={i} style={s.skeletonCard}>
            <View style={s.skeletonRow}>
              <View style={s.skeletonAvatar} />
              <View style={{ flex: 1 }}>
                <View style={s.skeletonLine} />
                <View style={[s.skeletonLine, { width: '60%', marginTop: 6 }]} />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  // Result
  if (!analysis) return null;
  return (
    <View>
      {/* Score Card */}
      <View style={s.scoreCard}>
        <ScoreRing score={analysis.portfolioScore} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={s.scoreLabel}>PORTFOLIO-SCORE</Text>
          <Text style={s.scoreVerdict}>{analysis.portfolioVerdict}</Text>
        </View>
      </View>

      {/* Top Insight */}
      <View style={s.insightCard}>
        <View style={s.insightHeader}>
          <Ionicons name="bulb" size={16} color={theme.accent.warning} />
          <Text style={s.insightLabel}>WICHTIGSTE ERKENNTNIS</Text>
        </View>
        <Text style={s.insightText}>{analysis.topInsight}</Text>
      </View>

      {/* Positions */}
      <Text style={s.positionsLabel}>POSITIONS-ANALYSE</Text>
      {analysis.positions.map((p, i) => (
        <TouchableOpacity
          key={`${p.ticker}-${i}`}
          style={s.positionCard}
          onPress={() => router.push(`/stock/${p.ticker}`)}
          activeOpacity={0.7}
        >
          <View style={s.positionHeader}>
            <StockLogo ticker={p.ticker} size={36} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
              <Text style={s.positionTicker}>{p.ticker}</Text>
              <View style={s.signalRow}>
                <View style={[s.signalBadge, { backgroundColor: `${SIGNAL_COLOR[p.signal]}22` }]}>
                  <Ionicons name={SIGNAL_ICON[p.signal] as any} size={11} color={SIGNAL_COLOR[p.signal]} />
                  <Text style={[s.signalText, { color: SIGNAL_COLOR[p.signal] }]}>{SIGNAL_LABEL[p.signal]}</Text>
                </View>
                <Text style={[s.positionScore, { color: scoreColor(p.score) }]}>
                  {Math.round(p.score)}/100
                </Text>
              </View>
            </View>
          </View>
          <Text style={s.positionReason}>{p.reason}</Text>
          {p.superInvestorActivity && (
            <View style={s.positionMeta}>
              <Ionicons name="people-outline" size={13} color={theme.accent.warning} />
              <Text style={s.positionMetaText} numberOfLines={2}>{p.superInvestorActivity}</Text>
            </View>
          )}
          {p.newsHighlight && (
            <View style={s.positionMeta}>
              <Ionicons name="newspaper-outline" size={13} color={theme.accent.info} />
              <Text style={s.positionMetaText} numberOfLines={2}>{p.newsHighlight}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}

      {/* Disclaimer */}
      <View style={s.disclaimer}>
        <Ionicons name="information-circle-outline" size={14} color={theme.text.tertiary} />
        <Text style={s.disclaimerText}>
          Diese Analyse dient ausschließlich zu Informationszwecken und stellt keine Anlageberatung dar.
        </Text>
      </View>

      {/* Re-run Button */}
      <TouchableOpacity style={s.refreshBtn} onPress={runAnalysis} disabled={loading}>
        <Ionicons name="refresh" size={16} color={theme.text.primary} />
        <Text style={s.refreshBtnText}>Erneut analysieren</Text>
      </TouchableOpacity>

      <Text style={s.timestamp}>
        Generiert: {new Date(analysis.timestamp).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  // Gate (Premium)
  gateCard: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.xxl,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center',
  },
  gateIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(191,90,242,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.space.lg,
  },
  gateTitle: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold, marginBottom: theme.space.sm },
  gateText: { color: theme.text.tertiary, fontSize: theme.font.body, textAlign: 'center', lineHeight: 19, marginBottom: theme.space.lg },
  gateFeatures: { width: '100%', gap: 10, marginBottom: theme.space.lg },
  gateFeature: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gateFeatureText: { color: theme.text.secondary, fontSize: theme.font.body },
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#BF5AF2',
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.xl, paddingVertical: theme.space.md + 2,
  },
  upgradeBtnText: { color: theme.text.inverse, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  // Empty
  emptyCard: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.xxl,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', gap: 8,
  },
  emptyTitle: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold, marginTop: 8 },
  emptyText: { color: theme.text.tertiary, fontSize: theme.font.body, textAlign: 'center' },

  // Start
  startCard: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.xxl,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center',
  },
  startIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(191,90,242,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.space.lg,
  },
  startTitle: { color: theme.text.primary, fontSize: theme.font.title1, fontWeight: theme.weight.semibold, marginBottom: theme.space.sm, textAlign: 'center' },
  startText: { color: theme.text.tertiary, fontSize: theme.font.body, textAlign: 'center', lineHeight: 19, marginBottom: theme.space.lg },
  runBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.text.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.xl, paddingVertical: theme.space.md + 2,
    marginBottom: theme.space.md,
  },
  runBtnText: { color: theme.text.inverse, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },
  startHint: { color: theme.text.tertiary, fontSize: theme.font.captionSm, textAlign: 'center', marginTop: 8 },
  errorText: { color: theme.accent.negative, fontSize: theme.font.body, textAlign: 'center', marginTop: 8, lineHeight: 18 },

  // Loading
  loadingCard: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.xxl,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center',
  },
  loadingTitle: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold, marginTop: theme.space.md },
  loadingText: { color: theme.text.tertiary, fontSize: theme.font.bodySm, textAlign: 'center', lineHeight: 16, marginTop: theme.space.sm },
  skeletonCard: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
    marginTop: theme.space.sm,
  },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skeletonAvatar: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.bg.cardHover },
  skeletonLine: { height: 10, backgroundColor: theme.bg.cardHover, borderRadius: 4 },

  // Result: Score
  scoreCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
  },
  scoreLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase', marginBottom: 6,
  },
  scoreVerdict: { color: theme.text.primary, fontSize: theme.font.body, lineHeight: 18 },

  // Insight
  insightCard: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
    marginTop: theme.space.sm,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: theme.space.sm },
  insightLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
  },
  insightText: { color: theme.text.primary, fontSize: theme.font.body, lineHeight: 19 },

  // Positions
  positionsLabel: {
    color: theme.text.tertiary, fontSize: theme.font.captionSm,
    fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider,
    textTransform: 'uppercase', marginTop: theme.space.lg, marginBottom: theme.space.sm,
  },
  positionCard: {
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.lg, padding: theme.space.lg,
    borderWidth: 1, borderColor: theme.border.default,
    marginBottom: theme.space.sm,
  },
  positionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.space.sm },
  positionTicker: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  signalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.radius.sm },
  signalText: { fontSize: theme.font.captionSm, fontWeight: theme.weight.semibold },
  positionScore: { fontSize: theme.font.bodySm, fontWeight: theme.weight.semibold, ...tabularStyle },
  positionReason: { color: theme.text.secondary, fontSize: theme.font.body, lineHeight: 18 },
  positionMeta: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: theme.space.sm },
  positionMetaText: { flex: 1, color: theme.text.tertiary, fontSize: theme.font.bodySm, lineHeight: 16 },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: theme.space.lg, paddingHorizontal: theme.space.md, paddingVertical: theme.space.sm,
  },
  disclaimerText: { flex: 1, color: theme.text.tertiary, fontSize: theme.font.captionSm, lineHeight: 14 },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.bg.card,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md + 2,
    marginTop: theme.space.sm,
    borderWidth: 1, borderColor: theme.border.default,
  },
  refreshBtnText: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  timestamp: { color: theme.text.tertiary, fontSize: theme.font.captionSm, textAlign: 'center', marginTop: theme.space.md, ...tabularStyle },
});
