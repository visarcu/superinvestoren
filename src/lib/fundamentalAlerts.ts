// src/lib/fundamentalAlerts.ts
// Gemeinsame Basis für Fundamental-Alerts: Metrik-Registry, FMP-Abruf der
// aktuellen Werte und die Zustandslogik (Hysterese). Genutzt vom täglichen
// Cron, den CRUD-Routen und der UI (Labels/Formatierung).

export type FundamentalMetric =
  | 'pe'
  | 'dividend_yield'
  | 'gross_margin'
  | 'operating_margin'
  | 'net_margin'
  | 'revenue_growth'
  | 'superinvestor_action'
  | 'insider_cluster_buy'

export type AlertCondition = 'below' | 'above'

export interface FundamentalAlertRow {
  id: string
  user_id: string
  symbol: string
  metric: FundamentalMetric
  condition: AlertCondition | null
  threshold: number | null
  active: boolean
  last_value: number | null
  last_state: 'ok' | 'breached' | null
  last_event_marker: string | null
  triggered_at: string | null
  created_at: string
  updated_at: string
}

export const VALUE_METRICS: FundamentalMetric[] = [
  'pe', 'dividend_yield', 'gross_margin', 'operating_margin', 'net_margin', 'revenue_growth',
]

export const EVENT_METRICS: FundamentalMetric[] = [
  'superinvestor_action', 'insider_cluster_buy',
]

export const METRIC_INFO: Record<FundamentalMetric, { label: string; unit: '' | '%'; kind: 'value' | 'event'; hint?: string }> = {
  pe: { label: 'KGV (TTM)', unit: '', kind: 'value' },
  dividend_yield: { label: 'Dividendenrendite', unit: '%', kind: 'value' },
  gross_margin: { label: 'Bruttomarge', unit: '%', kind: 'value' },
  operating_margin: { label: 'Operative Marge', unit: '%', kind: 'value' },
  net_margin: { label: 'Nettomarge', unit: '%', kind: 'value' },
  revenue_growth: { label: 'Umsatzwachstum (1J)', unit: '%', kind: 'value' },
  superinvestor_action: {
    label: 'Superinvestor-Aktivität', unit: '', kind: 'event',
    hint: 'Benachrichtigt, sobald ein neues 13F-Quartal Käufe oder Verkäufe zeigt',
  },
  insider_cluster_buy: {
    label: 'Insider-Cluster-Buy', unit: '', kind: 'event',
    hint: 'Benachrichtigt, wenn ≥3 Insider binnen 30 Tagen kaufen',
  },
}

export function isValueMetric(metric: FundamentalMetric): boolean {
  return METRIC_INFO[metric]?.kind === 'value'
}

export function formatMetricValue(metric: FundamentalMetric, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '–'
  const info = METRIC_INFO[metric]
  const formatted = value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
  return info?.unit === '%' ? `${formatted} %` : formatted
}

/**
 * Aktuelle Werte aller Wert-Metriken für ein Symbol (FMP TTM-Ratios +
 * Financial Growth). Margen/Rendite/Wachstum in Prozent, KGV roh.
 */
export async function fetchMetricValues(
  symbol: string
): Promise<Partial<Record<FundamentalMetric, number | null>>> {
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) return {}

  const upper = symbol.toUpperCase()
  const [ratiosRes, growthRes] = await Promise.all([
    fetch(`https://financialmodelingprep.com/api/v3/ratios-ttm/${upper}?apikey=${apiKey}`, {
      signal: AbortSignal.timeout(10000),
    }).then(r => (r.ok ? r.json() : null)).catch(() => null),
    fetch(`https://financialmodelingprep.com/api/v3/financial-growth/${upper}?limit=1&apikey=${apiKey}`, {
      signal: AbortSignal.timeout(10000),
    }).then(r => (r.ok ? r.json() : null)).catch(() => null),
  ])

  const ratios = Array.isArray(ratiosRes) ? ratiosRes[0] : null
  const growth = Array.isArray(growthRes) ? growthRes[0] : null

  const pct = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v * 100 : null
  const raw = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null

  return {
    pe: raw(ratios?.peRatioTTM),
    // FMP-Feld heißt wirklich "dividendYielTTM" (Typo in deren API)
    dividend_yield: pct(ratios?.dividendYielTTM ?? ratios?.dividendYieldTTM),
    gross_margin: pct(ratios?.grossProfitMarginTTM),
    operating_margin: pct(ratios?.operatingProfitMarginTTM),
    net_margin: pct(ratios?.netProfitMarginTTM),
    revenue_growth: pct(growth?.revenueGrowth),
  }
}

/** Zustand einer Wert-Metrik relativ zur Schwelle */
export function evaluateState(
  condition: AlertCondition,
  threshold: number,
  current: number
): 'ok' | 'breached' {
  if (condition === 'below') return current <= threshold ? 'breached' : 'ok'
  return current >= threshold ? 'breached' : 'ok'
}
