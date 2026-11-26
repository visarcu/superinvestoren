// src/lib/depotRoutes.ts
//
// Lesbare Adressen für den Depot-Workspace statt ?depot=<uuid>&view=…:
//
//   /analyse/portfolio                           alle Depots, Übersicht
//   /analyse/portfolio/analyse                   alle Depots, Analyse
//   /analyse/portfolio/trade-republic            ein Depot, Übersicht
//   /analyse/portfolio/trade-republic/analyse    ein Depot, Analyse
//
// Auf depot.finclue.de entfällt "/analyse/portfolio" (siehe siteHosts).
// Der Kurzname kommt aus dem Depotnamen und wird nicht gespeichert, sondern
// bei Bedarf aus der Depotliste berechnet. Eine Depot-ID an seiner Stelle
// wird ebenfalls verstanden (Links aus Mails, ältere Adressen); der Workspace
// schreibt sie dann auf den Kurznamen um.
//
// Ohne Abhängigkeiten, damit Middleware (Edge) und Client es nutzen können.

export const WORKSPACE_PATH = '/analyse/portfolio'

/** Frühere Adresse mit ?depot=…&view=…, wird per Middleware umgeleitet */
export const LEGACY_WORKSPACE_PATH = '/analyse/portfolio/workspace'

/**
 * Älterer, zweiter Depot-Bereich (eigene Oberfläche und eigener Import, der
 * Cash bei jedem erneuten Upload doppelt buchte). Die Middleware leitet ihn
 * dauerhaft auf den Workspace um; die Unterseiten landen auf ihrem Gegenstück.
 */
export const LEGACY_DEPOT_PATH = '/analyse/mein-portfolio'

const LEGACY_DEPOT_SUBPATHS: Record<string, string> = {
  depots: '/depots',
  performance: '/analyse',
  dividenden: '/dividenden',
  einstellungen: '/einstellungen',
}

export function isLegacyDepotPath(pathname: string): boolean {
  return pathname === LEGACY_DEPOT_PATH || pathname.startsWith(`${LEGACY_DEPOT_PATH}/`)
}

/** Ziel im Workspace für eine Adresse unter /analyse/mein-portfolio */
export function legacyDepotTarget(pathname: string): string {
  const rest = pathname.slice(LEGACY_DEPOT_PATH.length).split('/').filter(Boolean)
  if (rest.length === 0) return WORKSPACE_PATH
  if (rest[0] === 'aktien' && rest[1]) return `${WORKSPACE_PATH}/stocks/${rest[1]}`
  const mapped = LEGACY_DEPOT_SUBPATHS[rest[0]]
  return mapped ? `${WORKSPACE_PATH}${mapped}` : WORKSPACE_PATH
}

export type WorkspaceView =
  | 'overview'
  | 'assets'
  | 'accounts'
  | 'cashflow'
  | 'positions'
  | 'analysis'
  | 'fundamental'
  | 'dividends'
  | 'realized'
  | 'transactions'
  | 'ai'

const VIEW_SEGMENTS: Record<WorkspaceView, string> = {
  overview: '',
  assets: 'vermoegen',
  accounts: 'konten',
  cashflow: 'cashflow',
  positions: 'positionen',
  analysis: 'analyse',
  fundamental: 'fundamental',
  dividends: 'dividenden',
  realized: 'realisiert',
  transactions: 'transaktionen',
  ai: 'ki-analyse',
}

const SEGMENT_TO_VIEW = new Map<string, WorkspaceView>(
  (Object.entries(VIEW_SEGMENTS) as [WorkspaceView, string][])
    .filter(([, segment]) => segment !== '')
    .map(([view, segment]) => [segment, view]),
)

/** "analyse", "dividenden" … (Ansicht als Pfadsegment) */
export function isViewSegment(segment: string): boolean {
  return SEGMENT_TO_VIEW.has(segment.toLowerCase())
}

/** Unterordner von /analyse/portfolio mit eigenen Seiten (kein Workspace) */
export const PORTFOLIO_SUBROUTES = new Set(['depots', 'stocks', 'workspace', 'neu', 'dashboard', 'einstellungen'])

/**
 * Erste Pfadsegmente der Hauptseite (src/app). Auf dem Depot-Host leitet die
 * Middleware sie zur Hauptseite weiter, deshalb dürfen Depots so nicht heißen.
 */
export const MAIN_SITE_SEGMENTS = new Set([
  'admin', 'ai', 'aktie', 'analyse', 'api', 'api-docs', 'article', 'auth', 'blog', 'datenschutz',
  'depot', 'developers', 'earnings-calendar', 'economic-calendar', 'features', 'impressum', 'inbox',
  'ipo-calendar', 'kongress', 'lexikon', 'login', 'marktindikatoren', 'news', 'notifications',
  'politiker', 'preise', 'pricing', 'privacy', 'profil', 'profile', 'settings', 'superinvestor',
  'terminal', 'terms',
])

const RESERVED_SLUGS = new Set<string>([
  ...SEGMENT_TO_VIEW.keys(),
  ...PORTFOLIO_SUBROUTES,
  ...MAIN_SITE_SEGMENTS,
  'all',
  'alle',
])

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

/** Alte ?view=-Werte (englische Schlüssel) */
export function parseViewKey(value: string | null | undefined): WorkspaceView {
  return value && value in VIEW_SEGMENTS ? (value as WorkspaceView) : 'overview'
}

export interface WorkspaceRoute {
  /** 'all', ein Kurzname oder eine Depot-ID */
  depotKey: string
  view: WorkspaceView
}

/** Segmente nach /analyse/portfolio (bzw. nach "/" auf dem Depot-Host) */
export function parseWorkspaceSegments(segments: string[]): WorkspaceRoute {
  const [first, second] = segments.map(segment => {
    try {
      return decodeURIComponent(segment).toLowerCase()
    } catch {
      return segment.toLowerCase()
    }
  })
  if (!first) return { depotKey: 'all', view: 'overview' }
  const firstView = SEGMENT_TO_VIEW.get(first)
  if (firstView) return { depotKey: 'all', view: firstView }
  return { depotKey: first, view: (second && SEGMENT_TO_VIEW.get(second)) || 'overview' }
}

/**
 * Route aus dem Browser-Pfad, egal ob Hauptseite (/analyse/portfolio/…) oder
 * Depot-Host (/…). Nur im Workspace selbst aufrufen.
 */
export function parseWorkspacePathname(pathname: string): WorkspaceRoute {
  const rest =
    pathname === WORKSPACE_PATH || pathname.startsWith(`${WORKSPACE_PATH}/`)
      ? pathname.slice(WORKSPACE_PATH.length)
      : pathname
  return parseWorkspaceSegments(rest.split('/').filter(Boolean))
}

/** Ist das (auf der Hauptseite) ein Workspace-Pfad? Altadresse eingeschlossen. */
export function isWorkspacePathname(pathname: string): boolean {
  if (pathname === WORKSPACE_PATH || pathname.startsWith(LEGACY_WORKSPACE_PATH)) return true
  if (!pathname.startsWith(`${WORKSPACE_PATH}/`)) return false
  const first = pathname.slice(WORKSPACE_PATH.length + 1).split('/')[0]
  return !PORTFOLIO_SUBROUTES.has(first)
}

/** Pfad auf der Hauptseite. depot: 'all', Kurzname oder Depot-ID */
export function workspacePath(depot?: string | null, view: WorkspaceView = 'overview'): string {
  const parts = [WORKSPACE_PATH]
  if (depot && depot !== 'all') parts.push(encodeURIComponent(depot))
  const viewSegment = VIEW_SEGMENTS[view]
  if (viewSegment) parts.push(viewSegment)
  return parts.join('/')
}

/** Ziel einer Altadresse /analyse/portfolio/workspace?depot=…&view=…, übrige Parameter bleiben */
export function legacyWorkspaceTarget(searchParams: URLSearchParams): { pathname: string; search: string } {
  const rest = new URLSearchParams(searchParams)
  const depot = rest.get('depot')
  const view = parseViewKey(rest.get('view'))
  rest.delete('depot')
  rest.delete('view')
  const search = rest.toString()
  return { pathname: workspacePath(depot, view), search: search ? `?${search}` : '' }
}

/** "Trade Republic" → "trade-republic", "Beispieldepot: Warren Buffett" → "beispieldepot-warren-buffett" */
export function slugifyDepotName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  return slug || 'depot'
}

interface SluggableDepot {
  id: string
  name?: string | null
  created_at?: string | null
}

/**
 * Eindeutige Kurznamen je Nutzer. Reihenfolge nach Anlagedatum, damit ein
 * neues Depot mit gleichem Namen ("-2") die Adresse des älteren nicht ändert.
 */
export function assignDepotSlugs(portfolios: SluggableDepot[]): Map<string, string> {
  const ordered = [...portfolios]
    .filter(p => p.id && p.id !== 'all')
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id))
  const used = new Set<string>()
  const slugs = new Map<string, string>()
  for (const portfolio of ordered) {
    const base = slugifyDepotName(portfolio.name ?? '')
    let slug = base
    let suffix = 2
    while (RESERVED_SLUGS.has(slug) || used.has(slug) || isUuid(slug)) {
      slug = `${base}-${suffix++}`
    }
    used.add(slug)
    slugs.set(portfolio.id, slug)
  }
  return slugs
}

/** Depot-ID zum Schlüssel aus der URL, 'all' oder null (unbekannt) */
export function resolveDepotKey(key: string, portfolios: SluggableDepot[]): string | null {
  const wanted = key.toLowerCase()
  if (wanted === 'all') return 'all'
  const byId = portfolios.find(p => p.id.toLowerCase() === wanted)
  if (byId) return byId.id
  for (const [id, slug] of assignDepotSlugs(portfolios)) {
    if (slug === wanted) return id
  }
  return null
}
