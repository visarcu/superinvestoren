import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, StyleSheet, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn } from '../../lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Fehler', 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login fehlgeschlagen', err.message || 'Ungültige Zugangsdaten.');
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
          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoBadge}>
              <Text style={s.logoLetter}>f</Text>
            </View>
            <Text style={s.logoTitle}>finclue</Text>
            <Text style={s.logoSub}>Professionelle Aktienanalyse</Text>
          </View>

          {/* Form */}
          <View style={s.form}>
            <Text style={s.label}>E-MAIL</Text>
            <TextInput
              style={s.input}
              placeholder="name@beispiel.de"
              placeholderTextColor="#475569"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              keyboardAppearance="dark"
            />

            <Text style={[s.label, { marginTop: 12 }]}>PASSWORT</Text>
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              keyboardAppearance="dark"
            />

            <TouchableOpacity
              style={s.btn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#020617" />
                : <Text style={s.btnText}>Anmelden</Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={s.footer}>
            Noch kein Account?{' '}
            <Text style={s.footerLink}>Auf finclue.de registrieren</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logoBadge: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoLetter: { color: '#22C55E', fontSize: 32, fontWeight: '700' },
  logoTitle: { color: '#F8FAFC', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  logoSub: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  form: { gap: 6 },
  label: { color: '#64748B', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1, borderColor: '#1E293B',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#F8FAFC', fontSize: 16,
  },
  btn: {
    backgroundColor: '#22C55E', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  btnText: { color: '#020617', fontWeight: '700', fontSize: 16 },
  footer: { color: '#475569', fontSize: 13, textAlign: 'center', marginTop: 32 },
  footerLink: { color: '#22C55E' },
});
