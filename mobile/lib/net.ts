/**
 * Netzwerkfehler von Serverfehlern unterscheiden.
 *
 * React Native wirft bei fehlender Verbindung einen TypeError mit
 * "Network request failed" — dieselbe Fehlerklasse wie ein Programmierfehler.
 * Ohne diese Unterscheidung landen "kein Empfang" und "Server kaputt" im
 * gleichen leeren Screen.
 */
export function isOffline(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return /network request failed|failed to fetch|timed out|timeout|connection/i.test(msg);
}

/** Nutzertaugliche Meldung für einen fehlgeschlagenen Ladevorgang. */
export function loadErrorMessage(e: unknown): string {
  return isOffline(e)
    ? 'Keine Verbindung. Prüfe dein Netz und versuche es erneut.'
    : 'Daten konnten nicht geladen werden.';
}

/**
 * fetch mit Timeout und JSON-Parsing. Ohne Timeout hängt ein Request bei
 * schlechtem Empfang bis ins Unendliche und der Spinner dreht ewig.
 */
export async function fetchJson<T = any>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e: any) {
    // AbortController meldet sich als AbortError — für den Nutzer ist das
    // dasselbe wie keine Verbindung.
    if (e?.name === 'AbortError') throw new Error('Network request failed (timeout)');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
