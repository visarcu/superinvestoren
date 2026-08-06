import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, StyleSheet, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FinclueIcon from '../../components/FinclueIcon';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/auth';

// Bewusst nur E-Mail/Passwort — kein Google-OAuth wie im Web. Ein
// Drittanbieter-Login würde "Sign in with Apple" verpflichtend machen
// (App Store Guideline 4.8).
export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    // Gleiche Regeln wie der Web-Signup
    if (!email.trim() || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Fehler', 'Passwörter stimmen nicht überein.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Fehler', 'Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Fehler', 'Bitte akzeptiere die Nutzungsbedingungen.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            newsletter_opt_in: newsletterOptIn,
          },
        },
      });
      if (error) throw error;

      Alert.alert(
        'Fast geschafft',
        'Wir haben dir eine E-Mail zur Bestätigung geschickt. Bestätige deine Adresse und melde dich anschliessend an.',
        [{ text: 'Zur Anmeldung', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (err: any) {
      Alert.alert('Registrierung fehlgeschlagen', err.message || 'Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={s.flex}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <FinclueIcon size={56} variant="dark" />
            <Text style={s.logoTitle}>Account erstellen</Text>
            <Text style={s.logoSub}>Starte kostenlos mit Finclue</Text>
          </View>

          <View style={s.form}>
            <Text style={s.label}>NAME</Text>
            <TextInput
              style={s.input}
              placeholder="Max Mustermann"
              placeholderTextColor="#475569"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              keyboardAppearance="dark"
            />

            <Text style={[s.label, { marginTop: 12 }]}>E-MAIL</Text>
            <TextInput
              style={s.input}
              placeholder="name@beispiel.de"
              placeholderTextColor="#475569"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              keyboardAppearance="dark"
            />

            <Text style={[s.label, { marginTop: 12 }]}>PASSWORT</Text>
            <TextInput
              style={s.input}
              placeholder="Mindestens 6 Zeichen"
              placeholderTextColor="#475569"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              keyboardAppearance="dark"
            />

            <Text style={[s.label, { marginTop: 12 }]}>PASSWORT BESTÄTIGEN</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              keyboardAppearance="dark"
            />

            <TouchableOpacity
              style={s.checkRow}
              onPress={() => setAcceptTerms(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[s.checkbox, acceptTerms && s.checkboxOn]}>
                {acceptTerms && <Ionicons name="checkmark" size={13} color="#000000" />}
              </View>
              <Text style={s.checkText}>
                Ich akzeptiere die{' '}
                <Text style={s.link} onPress={() => Linking.openURL('https://finclue.de/terms')}>
                  Nutzungsbedingungen
                </Text>
                {' '}und die{' '}
                <Text style={s.link} onPress={() => Linking.openURL('https://finclue.de/privacy')}>
                  Datenschutzerklärung
                </Text>
                .
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.checkRow}
              onPress={() => setNewsletterOptIn(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[s.checkbox, newsletterOptIn && s.checkboxOn]}>
                {newsletterOptIn && <Ionicons name="checkmark" size={13} color="#000000" />}
              </View>
              <Text style={s.checkText}>Schick mir den Finclue-Newsletter (optional).</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.btn}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#000000" />
                : <Text style={s.btnText}>Account erstellen</Text>
              }
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.7}
            style={s.footerBtn}
          >
            <Text style={s.footer}>
              Schon registriert? <Text style={s.footerLink}>Anmelden</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 32, gap: 10 },
  logoTitle: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  logoSub: { color: '#94A3B8', fontSize: 14 },
  form: { gap: 6 },
  label: { color: '#64748B', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  input: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1, borderColor: '#2C2C2E',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#F8FAFC', fontSize: 16,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, marginTop: 1,
    borderWidth: 1, borderColor: '#2C2C2E', backgroundColor: '#1C1C1E',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#34C759', borderColor: '#34C759' },
  checkText: { color: '#94A3B8', fontSize: 13, lineHeight: 19, flex: 1 },
  link: { color: '#34C759' },
  btn: {
    backgroundColor: '#34C759', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  btnText: { color: '#000000', fontWeight: '700', fontSize: 16 },
  footerBtn: { marginTop: 24, paddingVertical: 8 },
  footer: { color: '#475569', fontSize: 13, textAlign: 'center' },
  footerLink: { color: '#34C759' },
});
