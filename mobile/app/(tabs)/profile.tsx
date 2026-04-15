import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Linking, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/auth';

interface Profile {
  first_name: string | null;
  last_name: string | null;
  is_premium: boolean;
  subscription_status: string | null;
  subscription_end_date: string | null;
  email_verified: boolean;
}

export default function ProfileScreen() {
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/(auth)/login'); return; }
      setEmail(user.email || '');

      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, is_premium, subscription_status, subscription_end_date, email_verified')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').upsert({
        user_id: user.id,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      });
      setProfile(p => p ? { ...p, first_name: firstName.trim() || null, last_name: lastName.trim() || null } : p);
      setEditMode(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleSignOut() {
    Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Abmelden', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ' ' + profile.last_name : ''}`
    : email.split('@')[0];

  const avatarLetter = (profile?.first_name || email || 'F').charAt(0).toUpperCase();

  const isPremium = profile?.is_premium ?? false;
  const subEnd = profile?.subscription_end_date
    ? new Date(profile.subscription_end_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color={theme.text.tertiary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────── */}
        <View style={s.header}>
          <Text style={s.pageTitle}>Profil</Text>
        </View>

        {/* ── Avatar + Name ───────────────────── */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{avatarLetter}</Text>
          </View>
          <View style={s.avatarInfo}>
            <Text style={s.displayName}>{displayName}</Text>
            <Text style={s.emailText}>{email}</Text>
            {isPremium ? (
              <View style={s.premiumBadge}>
                <Ionicons name="star" size={10} color={theme.text.tertiary} />
                <Text style={s.premiumBadgeText}>Premium</Text>
              </View>
            ) : (
              <View style={s.freeBadge}>
                <Text style={s.freeBadgeText}>Free</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(!editMode)}>
            <Ionicons name={editMode ? 'close' : 'pencil'} size={16} color={theme.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ── Edit Name Form ──────────────────── */}
        {editMode && (
          <View style={s.editCard}>
            <Text style={s.editLabel}>Vorname</Text>
            <TextInput
              style={s.editInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Max"
              placeholderTextColor={theme.text.muted}
              keyboardAppearance="dark"
            />
            <Text style={s.editLabel}>Nachname</Text>
            <TextInput
              style={s.editInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Mustermann"
              placeholderTextColor={theme.text.muted}
              keyboardAppearance="dark"
            />
            <TouchableOpacity style={s.saveBtn} onPress={saveProfile} disabled={saving}>
              {saving
                ? <ActivityIndicator color={theme.text.inverse} size="small" />
                : <Text style={s.saveBtnText}>Speichern</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Abo & Premium ───────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>ABO & PREMIUM</Text>
          <View style={s.card}>
            {isPremium ? (
              <>
                <Row
                  icon="star"
                  iconColor="#34C759"
                  label="Premium aktiv"
                  value={subEnd ? `bis ${subEnd}` : 'Aktiv'}
                  valueColor="#34C759"
                />
                <Divider />
                <Row
                  icon="card"
                  iconColor="#64748B"
                  label="Abo verwalten"
                  onPress={() => Linking.openURL('https://finclue.de/profile')}
                  arrow
                />
              </>
            ) : (
              <>
                <View style={s.upgradeCard}>
                  <Ionicons name="star" size={20} color={theme.text.tertiary} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.upgradeTitle}>Werde Premium</Text>
                    <Text style={s.upgradeDesc}>Voller Zugang zu AI-Analysen, Earnings-Zusammenfassungen und mehr.</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.upgradBtn}
                  onPress={() => Linking.openURL('https://finclue.de/pricing')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="star" size={14} color={theme.text.inverse} />
                  <Text style={s.upgradBtnText}>Premium freischalten</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ── Konto ───────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>KONTO</Text>
          <View style={s.card}>
            <Row
              icon="mail"
              iconColor="#64748B"
              label="E-Mail"
              value={email}
            />
            <Divider />
            <Row
              icon="lock-closed"
              iconColor="#64748B"
              label="Passwort ändern"
              onPress={() => Linking.openURL('https://finclue.de/auth/reset')}
              arrow
            />
            <Divider />
            <Row
              icon="shield-checkmark"
              iconColor={profile?.email_verified ? '#34C759' : '#34C759'}
              label="E-Mail verifiziert"
              value={profile?.email_verified ? 'Ja' : 'Ausstehend'}
              valueColor={profile?.email_verified ? '#34C759' : '#34C759'}
            />
          </View>
        </View>

        {/* ── App ─────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>APP</Text>
          <View style={s.card}>
            <Row
              icon="notifications"
              iconColor="#34C759"
              label="Benachrichtigungen"
              onPress={() => router.push('/notification-settings')}
              arrow
            />
            <Divider />
            <Row
              icon="globe"
              iconColor="#64748B"
              label="finclue.de öffnen"
              onPress={() => Linking.openURL('https://finclue.de')}
              arrow
            />
            <Divider />
            <Row
              icon="document-text"
              iconColor="#64748B"
              label="Datenschutz"
              onPress={() => Linking.openURL('https://finclue.de/datenschutz')}
              arrow
            />
            <Divider />
            <Row
              icon="information-circle"
              iconColor="#64748B"
              label="Impressum"
              onPress={() => Linking.openURL('https://finclue.de/impressum')}
              arrow
            />
          </View>
        </View>

        {/* ── Abmelden ────────────────────────── */}
        <View style={[s.section, { marginBottom: 12 }]}>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color={theme.accent.negative} />
            <Text style={s.signOutText}>Abmelden</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Reusable row component ───────────────────────────────
function Row({
  icon, iconColor, label, value, valueColor, onPress, arrow,
}: {
  icon: string; iconColor: string; label: string;
  value?: string; valueColor?: string;
  onPress?: () => void; arrow?: boolean;
}) {
  const content = (
    <View style={s.row}>
      <Ionicons name={icon as any} size={18} color={iconColor} style={s.rowIcon} />
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowRight}>
        {value ? <Text style={[s.rowValue, valueColor ? { color: valueColor } : {}]} numberOfLines={1}>{value}</Text> : null}
        {arrow ? <Ionicons name="chevron-forward" size={14} color={theme.text.tertiary} style={{ marginLeft: 4 }} /> : null}
      </View>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  return content;
}

function Divider() {
  return <View style={s.divider} />;
}

import { theme, tabularStyle } from '../../lib/theme';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },

  header: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.md, paddingBottom: theme.space.sm },
  pageTitle: { color: theme.text.primary, fontSize: 22, fontWeight: theme.weight.bold, letterSpacing: theme.tracking.tight },

  avatarSection: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: theme.space.lg, marginVertical: theme.space.lg,
    backgroundColor: theme.bg.card, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default,
    padding: theme.space.lg, gap: theme.space.lg - 2,
  },
  avatar: {
    width: 52, height: 52, borderRadius: theme.radius.full,
    backgroundColor: theme.bg.cardElevated,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: theme.text.primary, fontSize: theme.font.display2, fontWeight: theme.weight.semibold },
  avatarInfo: { flex: 1, gap: 3 },
  displayName: { color: theme.text.primary, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
  emailText: { color: theme.text.tertiary, fontSize: theme.font.body },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: theme.accent.warningSoft, borderRadius: theme.radius.sm,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(255,159,10,0.3)',
    marginTop: 2,
  },
  premiumBadgeText: { color: theme.accent.warning, fontSize: theme.font.caption, fontWeight: theme.weight.semibold },
  freeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.bg.cardElevated, borderRadius: theme.radius.sm,
    paddingHorizontal: 7, paddingVertical: 3, marginTop: 2,
  },
  freeBadgeText: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold },
  editBtn: {
    width: 32, height: 32, borderRadius: theme.radius.md - 2,
    backgroundColor: theme.bg.cardElevated,
    borderWidth: 1, borderColor: theme.border.default,
    alignItems: 'center', justifyContent: 'center',
  },

  editCard: {
    marginHorizontal: theme.space.lg, marginBottom: theme.space.sm,
    backgroundColor: theme.bg.card, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default,
    padding: theme.space.lg, gap: theme.space.sm,
  },
  editLabel: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.medium, marginBottom: 2, letterSpacing: theme.tracking.wide, textTransform: 'uppercase' },
  editInput: {
    backgroundColor: theme.bg.base, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.border.default,
    paddingHorizontal: theme.space.md + 2, paddingVertical: theme.space.sm + 2,
    color: theme.text.primary, fontSize: theme.font.title3, marginBottom: theme.space.xs,
  },
  saveBtn: {
    backgroundColor: theme.text.primary, borderRadius: theme.radius.md,
    paddingVertical: theme.space.md, alignItems: 'center',
    marginTop: theme.space.xs,
  },
  saveBtnText: { color: theme.text.inverse, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  section: { paddingHorizontal: theme.space.lg, marginBottom: theme.space.sm },
  sectionTitle: { color: theme.text.tertiary, fontSize: theme.font.caption, fontWeight: theme.weight.semibold, letterSpacing: theme.tracking.wider, textTransform: 'uppercase', marginBottom: theme.space.sm },
  card: {
    backgroundColor: theme.bg.card, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default, overflow: 'hidden',
  },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.space.lg, paddingVertical: theme.space.md + 2 },
  rowIcon: { marginRight: theme.space.md },
  rowLabel: { color: theme.text.primary, fontSize: theme.font.title3, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowValue: { color: theme.text.tertiary, fontSize: theme.font.body, maxWidth: 160, ...tabularStyle },
  divider: { height: 1, backgroundColor: theme.border.default, marginLeft: 46 },

  upgradeCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: theme.space.lg, gap: 0,
  },
  upgradeTitle: { color: theme.text.primary, fontSize: theme.font.title3, fontWeight: theme.weight.semibold, marginBottom: theme.space.xs },
  upgradeDesc: { color: theme.text.tertiary, fontSize: theme.font.body, lineHeight: 18 },
  upgradBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space.sm,
    margin: theme.space.lg, marginTop: theme.space.xs,
    backgroundColor: theme.text.primary, borderRadius: theme.radius.md,
    paddingVertical: theme.space.md,
  },
  upgradBtnText: { color: theme.text.inverse, fontSize: theme.font.title3, fontWeight: theme.weight.semibold },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.space.sm,
    backgroundColor: theme.bg.card, borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.border.default,
    paddingVertical: theme.space.lg,
  },
  signOutText: { color: theme.accent.negative, fontSize: theme.font.title2, fontWeight: theme.weight.semibold },
});
