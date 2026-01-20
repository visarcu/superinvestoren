import type { Stock } from './stocks'

// Japan Stocks - Tokyo Stock Exchange (.T suffix)
// Note: Japanese stocks use numeric ticker codes
export const stocks: Stock[] = [
  // Consumer Cyclical
  { ticker: '7203.T', cusip: '', name: 'Toyota Motor Corporation', sector: 'Consumer Cyclical', metrics: [] },
  { ticker: '7267.T', cusip: '', name: 'Honda Motor Co., Ltd.', sector: 'Consumer Cyclical', metrics: [] },
  { ticker: '9983.T', cusip: '', name: 'Fast Retailing Co., Ltd.', sector: 'Consumer Cyclical', metrics: [] },

  // Financial Services
  { ticker: '8306.T', cusip: '', name: 'Mitsubishi UFJ Financial Group, Inc.', sector: 'Financial Services', metrics: [] },
  { ticker: '8316.T', cusip: '', name: 'Sumitomo Mitsui Financial Group, Inc.', sector: 'Financial Services', metrics: [] },
  { ticker: '8411.T', cusip: '', name: 'Mizuho Financial Group, Inc.', sector: 'Financial Services', metrics: [] },
  { ticker: '8766.T', cusip: '', name: 'Tokio Marine Holdings, Inc.', sector: 'Financial Services', metrics: [] },
  { ticker: '7182.T', cusip: '', name: 'JAPAN POST BANK Co., Ltd.', sector: 'Financial Services', metrics: [] },

  // Technology
  { ticker: '6758.T', cusip: '', name: 'Sony Group Corporation', sector: 'Technology', metrics: [] },
  { ticker: '7974.T', cusip: '', name: 'Nintendo Co., Ltd.', sector: 'Technology', metrics: [] },
  { ticker: '8035.T', cusip: '', name: 'Tokyo Electron Limited', sector: 'Technology', metrics: [] },
  { ticker: '6857.T', cusip: '', name: 'Advantest Corporation', sector: 'Technology', metrics: [] },
  { ticker: '6861.T', cusip: '', name: 'Keyence Corporation', sector: 'Technology', metrics: [] },
  { ticker: '6701.T', cusip: '', name: 'NEC Corporation', sector: 'Technology', metrics: [] },
  { ticker: '6702.T', cusip: '', name: 'Fujitsu Limited', sector: 'Technology', metrics: [] },
  { ticker: '6146.T', cusip: '', name: 'Disco Corporation', sector: 'Technology', metrics: [] },

  // Industrials
  { ticker: '6501.T', cusip: '', name: 'Hitachi, Ltd.', sector: 'Industrials', metrics: [] },
  { ticker: '7011.T', cusip: '', name: 'Mitsubishi Heavy Industries, Ltd.', sector: 'Industrials', metrics: [] },
  { ticker: '8058.T', cusip: '', name: 'Mitsubishi Corporation', sector: 'Industrials', metrics: [] },
  { ticker: '8031.T', cusip: '', name: 'Mitsui & Co., Ltd.', sector: 'Industrials', metrics: [] },
  { ticker: '8001.T', cusip: '', name: 'ITOCHU Corporation', sector: 'Industrials', metrics: [] },
  { ticker: '6098.T', cusip: '', name: 'Recruit Holdings Co., Ltd.', sector: 'Industrials', metrics: [] },
  { ticker: '6503.T', cusip: '', name: 'Mitsubishi Electric Corporation', sector: 'Industrials', metrics: [] },
  { ticker: '8002.T', cusip: '', name: 'Marubeni Corporation', sector: 'Industrials', metrics: [] },
  { ticker: '8053.T', cusip: '', name: 'Sumitomo Corporation', sector: 'Industrials', metrics: [] },

  // Communication Services
  { ticker: '9984.T', cusip: '', name: 'SoftBank Group Corp.', sector: 'Communication Services', metrics: [] },
  { ticker: '9432.T', cusip: '', name: 'NTT, Inc.', sector: 'Communication Services', metrics: [] },
  { ticker: '9434.T', cusip: '', name: 'SoftBank Corp.', sector: 'Communication Services', metrics: [] },
  { ticker: '9433.T', cusip: '', name: 'KDDI Corporation', sector: 'Communication Services', metrics: [] },

  // Healthcare
  { ticker: '4519.T', cusip: '', name: 'Chugai Pharmaceutical Co., Ltd.', sector: 'Healthcare', metrics: [] },
  { ticker: '7741.T', cusip: '', name: 'HOYA Corporation', sector: 'Healthcare', metrics: [] },
  { ticker: '4502.T', cusip: '', name: 'Takeda Pharmaceutical Company Limited', sector: 'Healthcare', metrics: [] },

  // Basic Materials
  { ticker: '4063.T', cusip: '', name: 'Shin-Etsu Chemical Co., Ltd.', sector: 'Basic Materials', metrics: [] },

  // Consumer Defensive
  { ticker: '2914.T', cusip: '', name: 'Japan Tobacco Inc.', sector: 'Consumer Defensive', metrics: [] },
]
