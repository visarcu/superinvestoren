import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, StyleSheet, ScrollView, Linking,
} from 'react-native';
import FinclueIcon from '../../components/FinclueIcon';
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
            <FinclueIcon size={72} variant="dark" />
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

            <TouchableOpacity
              onPress={() => Linking.openURL('https://finclue.de/auth/forgot-password')}
              style={s.forgotBtn}
              activeOpacity={0.7}
            >
              <Text style={s.forgotText}>Passwort vergessen?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/signup')}
            activeOpacity={0.7}
            style={s.footerBtn}
          >
            <Text style={s.footer}>
              Noch kein Account? <Text style={s.footerLink}>Jetzt registrieren</Text>
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
  logoWrap: { alignItems: 'center', marginBottom: 48, gap: 14 },
  logoTitle: { color: '#F8FAFC', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  logoSub: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  form: { gap: 6 },
  label: { color: '#64748B', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  input: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1, borderColor: '#2C2C2E',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: '#F8FAFC', fontSize: 16,
  },
  btn: {
    backgroundColor: '#34C759', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 16,
  },
  btnText: { color: '#000000', fontWeight: '700', fontSize: 16 },
  forgotBtn: { alignSelf: 'center', paddingVertical: 12, marginTop: 4 },
  forgotText: { color: '#94A3B8', fontSize: 13 },
  footerBtn: { marginTop: 20, paddingVertical: 8 },
  footer: { color: '#475569', fontSize: 13, textAlign: 'center' },
  footerLink: { color: '#34C759' },
});
