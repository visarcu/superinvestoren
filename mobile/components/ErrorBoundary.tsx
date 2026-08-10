import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import { captureException } from '../lib/errorReporting';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Fängt Render-Fehler ab, damit die App statt eines weissen Screens einen
 * lesbaren Zustand mit Reset zeigt. Deckt bewusst keine Fehler in
 * Event-Handlern oder async-Code ab — React Error Boundaries können das nicht.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureException(error, { componentStack: info.componentStack });
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.iconWrap}>
            <Ionicons name="warning-outline" size={30} color={theme.accent.warning} />
          </View>
          <Text style={s.title}>Da ist etwas schiefgelaufen</Text>
          <Text style={s.desc}>
            Der Fehler wurde automatisch gemeldet. Du kannst es direkt noch einmal versuchen.
          </Text>

          {__DEV__ && (
            <View style={s.devBox}>
              <Text style={s.devText}>{error.message}</Text>
            </View>
          )}

          <TouchableOpacity style={s.btn} onPress={this.reset} activeOpacity={0.85}>
            <Text style={s.btnText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg.base },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: { alignSelf: 'center', marginBottom: 18 },
  title: {
    color: theme.text.primary, fontSize: 20, fontWeight: theme.weight.bold,
    textAlign: 'center', marginBottom: 8,
  },
  desc: {
    color: theme.text.tertiary, fontSize: 14, lineHeight: 20,
    textAlign: 'center', marginBottom: 24,
  },
  devBox: {
    backgroundColor: theme.bg.card, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.border.default,
    padding: 14, marginBottom: 24,
  },
  devText: { color: theme.accent.negative, fontSize: 12, fontFamily: 'Courier' },
  btn: {
    backgroundColor: theme.text.primary, borderRadius: theme.radius.md,
    paddingVertical: 15, alignItems: 'center',
  },
  btnText: { color: theme.text.inverse, fontSize: 15, fontWeight: theme.weight.semibold },
});
