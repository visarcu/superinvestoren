// Re-export der zentralen Portfolio-Types aus dem Hook,
// damit Subkomponenten nicht direkt vom Hook-Pfad importieren müssen.
export type { Portfolio, Holding, Transaction, RealizedGainInfo } from '@/hooks/usePortfolio'

export type Tab = 'holdings' | 'transaktionen' | 'dividenden' | 'analyse'
