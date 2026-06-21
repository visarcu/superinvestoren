// mobile/lib/brokerConfig.ts
// Mirror of src/lib/brokerConfig.ts — Ionicons statt Heroicons.

export type BrokerType =
  | 'manual'
  | 'trade_republic'
  | 'scalable_capital'
  | 'finanzen_zero'
  | 'flatex'
  | 'smartbroker'
  | 'freedom24'
  | 'ing'
  | 'trading212'
  | 'comdirect'
  | 'interactive_brokers'
  | 'andere';

export interface BrokerConfig {
  id: BrokerType;
  displayName: string;
  color: string;
  ionIcon: string;
  description?: string;
}

export const BROKER_CONFIGS: BrokerConfig[] = [
  { id: 'trade_republic',      displayName: 'Trade Republic',      color: '#1A1A1A', ionIcon: 'phone-portrait-outline', description: 'Mobiler Neobroker aus Berlin' },
  { id: 'scalable_capital',    displayName: 'Scalable Capital',    color: '#00D09C', ionIcon: 'bar-chart-outline',      description: 'Digitale Vermögensverwaltung' },
  { id: 'finanzen_zero',       displayName: 'finanzen.net zero',   color: '#E4007F', ionIcon: 'phone-portrait-outline', description: 'Neobroker mit 0€ Order-Gebühren' },
  { id: 'flatex',              displayName: 'Flatex / DEGIRO',     color: '#F06400', ionIcon: 'business-outline',       description: 'Etablierter Online-Broker' },
  { id: 'smartbroker',         displayName: 'Smartbroker+',        color: '#0066CC', ionIcon: 'bar-chart-outline',      description: 'Online-Broker der wallstreet:online' },
  { id: 'freedom24',           displayName: 'Freedom24',           color: '#10D070', ionIcon: 'globe-outline',          description: 'Internationaler Broker (US/EU)' },
  { id: 'ing',                 displayName: 'ING',                 color: '#FF6200', ionIcon: 'business-outline',       description: 'Direktbank mit Depot' },
  { id: 'trading212',          displayName: 'Trading 212',         color: '#0ea5e9', ionIcon: 'bar-chart-outline',      description: 'Mobiler Neobroker aus UK' },
  { id: 'comdirect',           displayName: 'Comdirect',           color: '#FFD700', ionIcon: 'cash-outline',           description: 'Online-Broker der Commerzbank' },
  { id: 'interactive_brokers', displayName: 'Interactive Brokers', color: '#D41A1F', ionIcon: 'globe-outline',          description: 'Internationaler Profi-Broker' },
  { id: 'andere',              displayName: 'Anderer Broker',      color: '#8B5CF6', ionIcon: 'business-outline',       description: 'Sonstiger Broker mit eigenem Namen' },
  { id: 'manual',              displayName: 'Manuelles Depot',     color: '#6B7280', ionIcon: 'create-outline',         description: 'Eigene Verwaltung ohne Broker-Zuordnung' },
];

export function getBrokerConfig(brokerId: BrokerType | string | null | undefined): BrokerConfig {
  const config = BROKER_CONFIGS.find(b => b.id === brokerId);
  return config || BROKER_CONFIGS.find(b => b.id === 'manual')!;
}

export function getBrokerDisplayName(brokerId: BrokerType | string | null | undefined, customName?: string | null): string {
  if (brokerId === 'andere' && customName) return customName;
  return getBrokerConfig(brokerId).displayName;
}

export function getBrokerColor(brokerId: BrokerType | string | null | undefined, customColor?: string | null): string {
  if (customColor) return customColor;
  return getBrokerConfig(brokerId).color;
}

// Preset-Farben für Custom-Color-Picker (passend zum App-Theme)
export const CUSTOM_COLOR_PRESETS = [
  '#34C759', '#0A84FF', '#FF9F0A', '#FF453A',
  '#BF5AF2', '#FF375F', '#5E5CE6', '#64D2FF',
  '#FFD60A', '#30D158', '#A78BFA', '#F472B6',
];
