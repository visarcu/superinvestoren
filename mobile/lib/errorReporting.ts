import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Ohne DSN bleibt Sentry aus — lokal und in Dev-Builds soll nichts rausgehen.
// Gesetzt wird der Wert über EXPO_PUBLIC_SENTRY_DSN (eas.json / .env.local).
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isErrorReportingEnabled = Boolean(DSN) && !__DEV__;

export function initErrorReporting() {
  if (!isErrorReportingEnabled) return;

  Sentry.init({
    dsn: DSN,
    // Kein PII: die App verarbeitet Depotdaten, die nichts im Crash-Report
    // verloren haben.
    sendDefaultPii: false,
    release: Constants.expoConfig?.version,
    tracesSampleRate: 0.2,
  });
}

/** Setzt bzw. entfernt den User-Kontext (nur die ID, keine E-Mail). */
export function setErrorUser(userId: string | null) {
  if (!isErrorReportingEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export function captureException(error: unknown, extra?: Record<string, unknown>) {
  if (!isErrorReportingEnabled) {
    if (__DEV__) console.error('[error]', error, extra ?? '');
    return;
  }
  Sentry.captureException(error, extra ? { extra } : undefined);
}
