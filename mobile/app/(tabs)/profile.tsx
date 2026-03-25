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
        <ActivityIndicator color="#22C55E" style={{ marginTop: 60 }} />
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
                <Ionicons name="star" size={10} color="#F59E0B" />
                <Text style={s.premiumBadgeText}>Premium</Text>
              </View>
            ) : (
              <View style={s.freeBadge}>
                <Text style={s.freeBadgeText}>Free</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(!editMode)}>
            <Ionicons name={editMode ? 'close' : 'pencil'} size={16} color="#22C55E" />
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
              placeholderTextColor="#475569"
              keyboardAppearance="dark"
            />
            <Text style={s.editLabel}>Nachname</Text>
            <TextInput
              style={s.editInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Mustermann"
              placeholderTextColor="#475569"
              keyboardAppearance="dark"
            />
            <TouchableOpacity style={s.saveBtn} onPress={saveProfile} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#020617" size="small" />
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
                  iconColor="#F59E0B"
                  label="Premium aktiv"
                  value={subEnd ? `bis ${subEnd}` : 'Aktiv'}
                  valueColor="#22C55E"
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
                  <Ionicons name="star" size={20} color="#F59E0B" />
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
                  <Ionicons name="star" size={14} color="#020617" />
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
              iconColor={profile?.email_verified ? '#22C55E' : '#F59E0B'}
              label="E-Mail verifiziert"
              value={profile?.email_verified ? 'Ja' : 'Ausstehend'}
              valueColor={profile?.email_verified ? '#22C55E' : '#F59E0B'}
            />
          </View>
        </View>

        {/* ── App ─────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>APP</Text>
          <View style={s.card}>
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
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
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
        {arrow ? <Ionicons name="chevron-forward" size={14} color="#475569" style={{ marginLeft: 4 }} /> : null}
      </View>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  return content;
}

function Divider() {
  return <View style={s.divider} />;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  pageTitle: { color: '#F8FAFC', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },

  // Avatar
  avatarSection: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 16,
    backgroundColor: '#0F172A', borderRadius: 16,
    borderWidth: 1, borderColor: '#1E293B',
    padding: 16, gap: 14,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#22C55E',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#020617', fontSize: 24, fontWeight: '700' },
  avatarInfo: { flex: 1, gap: 3 },
  displayName: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  emailText: { color: '#64748B', fontSize: 13 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    marginTop: 2,
  },
  premiumBadgeText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },
  freeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3, marginTop: 2,
  },
  freeBadgeText: { color: '#64748B', fontSize: 11, fontWeight: '600' },
  editBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Edit form
  editCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#0F172A', borderRadius: 16,
    borderWidth: 1, borderColor: '#1E293B',
    padding: 16, gap: 8,
  },
  editLabel: { color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  editInput: {
    backgroundColor: '#020617', borderRadius: 10,
    borderWidth: 1, borderColor: '#1E293B',
    paddingHorizontal: 14, paddingVertical: 10,
    color: '#F8FAFC', fontSize: 14, marginBottom: 4,
  },
  saveBtn: {
    backgroundColor: '#22C55E', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#020617', fontSize: 14, fontWeight: '700' },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  card: {
    backgroundColor: '#0F172A', borderRadius: 16,
    borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden',
  },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { marginRight: 12 },
  rowLabel: { color: '#F8FAFC', fontSize: 14, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowValue: { color: '#64748B', fontSize: 13, maxWidth: 160 },
  divider: { height: 1, backgroundColor: '#1E293B', marginLeft: 46 },

  // Premium upgrade
  upgradeCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, gap: 0,
  },
  upgradeTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  upgradeDesc: { color: '#64748B', fontSize: 13, lineHeight: 18 },
  upgradBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 16, marginTop: 4,
    backgroundColor: '#F59E0B', borderRadius: 12,
    paddingVertical: 12,
  },
  upgradBtnText: { color: '#020617', fontSize: 14, fontWeight: '700' },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
    paddingVertical: 14,
  },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
});
