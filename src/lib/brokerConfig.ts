// src/lib/brokerConfig.ts

export type BrokerType =
  | 'manual'
  | 'trade_republic'
  | 'scalable_capital'
  | 'finanzen_zero'
  | 'flatex'
  | 'smartbroker'
  | 'freedom24'
  | 'ing'
  | 'comdirect'
  | 'interactive_brokers'
  | 'andere'

export interface BrokerConfig {
  id: BrokerType
  displayName: string
  color: string
  iconName: string // Heroicon name (Legacy für Badges)
  description?: string
}

export const BROKER_CONFIGS: BrokerConfig[] = [
  {
    id: 'trade_republic',
    displayName: 'Trade Republic',
    color: '#1A1A1A',
    iconName: 'DevicePhoneMobileIcon',
    description: 'Mobiler Neobroker aus Berlin'
  },
  {
    id: 'scalable_capital',
    displayName: 'Scalable Capital',
    color: '#00D09C',
    iconName: 'ChartBarIcon',
    description: 'Digitale Vermögensverwaltung'
  },
  {
    id: 'finanzen_zero',
    displayName: 'finanzen.net zero',
    color: '#E4007F',
    iconName: 'DevicePhoneMobileIcon',
    description: 'Neobroker mit 0€ Order-Gebühren'
  },
  {
    id: 'flatex',
    displayName: 'Flatex / DEGIRO',
    color: '#F06400',
    iconName: 'BuildingLibraryIcon',
    description: 'Etablierter Online-Broker'
  },
  {
    id: 'smartbroker',
    displayName: 'Smartbroker+',
    color: '#0066CC',
    iconName: 'ChartBarIcon',
    description: 'Online-Broker der wallstreet:online'
  },
  {
    id: 'freedom24',
    displayName: 'Freedom24',
    color: '#10D070',
    iconName: 'GlobeAltIcon',
    description: 'Internationaler Broker mit Zugang zu US/EU-Märkten'
  },
  {
    id: 'ing',
    displayName: 'ING',
    color: '#FF6200',
    iconName: 'BuildingLibraryIcon',
    description: 'Direktbank mit Depot'
  },
  {
    id: 'comdirect',
    displayName: 'Comdirect',
    color: '#FFD700',
    iconName: 'BanknotesIcon',
    description: 'Online-Broker der Commerzbank'
  },
  {
    id: 'interactive_brokers',
    displayName: 'Interactive Brokers',
    color: '#D41A1F',
    iconName: 'GlobeAltIcon',
    description: 'Internationaler Profi-Broker'
  },
  {
    id: 'andere',
    displayName: 'Anderer Broker',
    color: '#8B5CF6',
    iconName: 'BuildingOffice2Icon',
    description: 'Sonstiger Broker mit eigenem Namen'
  },
  {
    id: 'manual',
    displayName: 'Manuelles Depot',
    color: '#6B7280',
    iconName: 'PencilSquareIcon',
    description: 'Eigene Verwaltung ohne Broker-Zuordnung'
  },
]

export function getBrokerConfig(brokerId: BrokerType | string | null | undefined): BrokerConfig {
  const config = BROKER_CONFIGS.find(b => b.id === brokerId)
  return config || BROKER_CONFIGS.find(b => b.id === 'manual')!
}

export function getBrokerDisplayName(brokerId: BrokerType | string | null | undefined, customName?: string | null): string {
  if (brokerId === 'andere' && customName) {
    return customName
  }
  return getBrokerConfig(brokerId).displayName
}

export function getBrokerColor(brokerId: BrokerType | string | null | undefined, customColor?: string | null): string {
  if (customColor) {
    return customColor
  }
  return getBrokerConfig(brokerId).color
}

/**
 * Mapping BrokerType → ImportBrokerId für die BrokerLogo-Komponente.
 * Liefert null, wenn kein Logo-Äquivalent existiert (z.B. manuell/andere/Comdirect/IB).
 */
export function brokerTypeToLogoId(brokerId: BrokerType | string | null | undefined):
  'scalable' | 'traderepublic' | 'flatex' | 'smartbroker' | 'freedom24' | 'zero' | 'ing' | null {
  switch (brokerId) {
    case 'trade_republic': return 'traderepublic'
    case 'scalable_capital': return 'scalable'
    case 'finanzen_zero': return 'zero'
    case 'flatex': return 'flatex'
    case 'smartbroker': return 'smartbroker'
    case 'freedom24': return 'freedom24'
    case 'ing': return 'ing'
    default: return null
  }
}
