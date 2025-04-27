// src/data/stocks.ts

export interface StockMetrics {
  label: string
  value: string
}

export interface Stock {
  ticker: string
  cusip: string
  name: string
 sector: string
  metrics: StockMetrics[]
}

export const stocks: Stock[] = [
  {
    ticker: 'AAPL',
    cusip:  '037833100',
    name:   'Apple Inc.',
    sector: 'Technologie',
    metrics: [
      { label: 'Marktkapitalisierung', value: '2,8 Bio. €' },
      { label: 'KGV',                  value: '28,5'       },
      { label: 'YTD Performance',      value: '+12,3 %'   },
    ],
  },
  {
    ticker: 'BRK.B',
    cusip:  '084670702',
    name:   'Berkshire Hathaway B',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '640 Mrd. €' },
      { label: 'KGV',                  value: '18,2'      },
      { label: 'YTD Performance',      value: '+7,8 %'   },
    ],
  },
  {
    ticker: 'AMZN',
    cusip:  '023135106',
    name:   'Amazon.com Inc.',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '1,7 Bio. €' },
      { label: 'KGV',                  value: '65,4'      },
      { label: 'YTD Performance',      value: '+3,1 %'   },
    ],
  },
  {
    ticker: 'GOOGL',
    cusip:  '02079K305',
    name:   'Alphabet Inc.',
    sector: 'Kommunikationsdienste',
    metrics: [
      { label: 'Marktkapitalisierung', value: '1,6 Bio. €' },
      { label: 'KGV',                  value: '27,8'      },
      { label: 'YTD Performance',      value: '+8,2 %'   },
    ],
  },
  {
    ticker: 'AXP',
    cusip:  '025816109',
    name:   'American Express Co.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '180 Mrd. €' },
      { label: 'KGV',                  value: '12,3'      },
      { label: 'YTD Performance',      value: '+5,0 %'   },
    ],
  },
  {
    ticker: 'BAC',
    cusip:  '060505104',
    name:   'Bank of America Corp.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '250 Mrd. €' },
      { label: 'KGV',                  value: '9,1'       },
      { label: 'YTD Performance',      value: '+6,7 %'   },
    ],
  },
  {
    ticker: 'KO',
    cusip:  '191216100',
    name:   'The Coca-Cola Company',
    sector: 'Basiskonsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '260 Mrd. €' },
      { label: 'KGV',                  value: '23,4'      },
      { label: 'YTD Performance',      value: '+2,2 %'   },
    ],
  },
  {
    ticker: 'CVX',
    cusip:  '166764100',
    name:   'Chevron Corp.',
    sector: 'Energie',
    metrics: [
      { label: 'Marktkapitalisierung', value: '300 Mrd. €' },
      { label: 'KGV',                  value: '15,6'      },
      { label: 'YTD Performance',      value: '+4,5 %'   },
    ],
  },
  {
    ticker: 'MCO',
    cusip:  '615369105',
    name:   'Moody’s Corp.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '120 Mrd. €' },
      { label: 'KGV',                  value: '14,0'      },
      { label: 'YTD Performance',      value: '+7,1 %'   },
    ],
  },
  {
    ticker: 'KHC',
    cusip:  '500754106',
    name:   'Kraft Heinz Co.',
    sector: 'Basiskonsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '45 Mrd. €'  },
      { label: 'KGV',                  value: '18,9'      },
      { label: 'YTD Performance',      value: '-1,2 %'   },
    ],
  },
  {
    ticker: 'CB',
    cusip:  'H1467J104',
    name:   'Chubb Ltd.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '95 Mrd. €'  },
      { label: 'KGV',                  value: '10,7'      },
      { label: 'YTD Performance',      value: '+4,6 %'   },
    ],
  },
  {
    ticker: 'DVA',
    cusip:  '23918K108',
    name:   'DaVita Inc.',
    sector: 'Gesundheitswesen',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'OXY',
    cusip:  '674599105',
    name:   'Occidental Petroleum',
    sector: 'Energie',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'KR',
    cusip:  '501044101',
    name:   'Kroger Co.',
    sector: 'Basiskonsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'VRSN',
    cusip:  '92343E102',
    name:   'Verisign Inc.',
    sector: 'Technologie',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'SIRI',
    cusip:  '829933100',
    name:   'Sirius XM Holdings Inc.',
    sector: 'Kommunikationsdienste',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'V',
    cusip:  '92826C839',
    name:   'Visa Inc.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'MA',
    cusip:  '57636Q104',
    name:   'Mastercard Inc.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'AON',
    cusip:  'G0403H108',
    name:   'Aon PLC',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'COF',
    cusip:  '14040H105',
    name:   'Capital One Financial Corp.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'STZ',
    cusip:  '21036P108',
    name:   'Constellation Brands Inc.',
    sector: 'Basiskonsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'ALLY',
    cusip:  '02005N100',
    name:   'Ally Financial Inc.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'C',
    cusip:  '172967424',
    name:   'Citigroup Inc.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'DPZ',
    cusip:  '25754A201',
    name:   'Domino’s Pizza Inc.',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'TMUS',
    cusip:  '872590104',
    name:   'T-Mobile US Inc.',
    sector: 'Kommunikationsdienste',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'CHTR',
    cusip:  '16119P108',
    name:   'Charter Communications Inc.',
    sector: 'Kommunikationsdienste',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'LPX',
    cusip:  '546347105',
    name:   'Louisiana-Pacific Corp.',
    sector: 'Industrie',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'NU',
    cusip:  'G6683N103',
    name:   'Nu Holdings Ltd.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'POOL',
    cusip:  '73278L105',
    name:   'Pool Corp.',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'HEI',
    cusip:  '422806208',
    name:   'Heico Corp.',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'NVR',
    cusip:  '62944T105',
    name:   'NVR Inc.',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'DEO',
    cusip:  '25243Q205',
    name:   'Diageo PLC',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'LEN',
    cusip:  '526057302',
    name:   'Lennar Corp.',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'JEF',
    cusip:  '47233W109',
    name:   'Jefferies Financial Group Inc.',
    sector: 'Finanzwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'LILA',
    cusip:  'G9001E102',
    name:   'Liberty Latin America Ltd.',
    sector: 'Kommunikationsdienste',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'LILAK',
    cusip:  'G9001E128',
    name:   'Liberty Latin America Cl. C',
    sector: 'Kommunikationsdienste',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'BATRA',
    cusip:  '047726302',
    name:   'Atlanta Braves Holdings Inc.',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   },
    ],
  },
  {
    ticker: 'LBTYA',
    cusip:  '531229722',
    name:   'Liberty Media Corp Cl. A',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   }
    ]
  },
  {
    ticker: 'LBTYB',
    cusip:  '531229722',
    name:   'Liberty Media Corp Cl. B',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   }
    ]
  },
  {
    ticker: 'LBTYK',
    cusip:  '531229748',
    name:   'Liberty Media Corp Cl. C',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   }
    ]
  },

  {
    ticker: 'BN',
    cusip:  '11261Q109',
    name:   'Brookfield Corporation',
    sector: 'Finanzen',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   }
    ]
  },
  {
    ticker: 'QSR',
    cusip:  '761763109',
    name:   'Restaurant Brands International',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   }
    ]
  },
  {
    ticker: 'CMG',
    cusip:  '169656105',
    name:   'Chipotle Mexican Grill',
    sector: 'Konsumwerte',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   }
    ]
  },

  {
    ticker: 'HHH',
    cusip:  '44106V108',
    name:   'Howard Hughes Holdings Inc.',
    sector: 'Finanzen',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   }
    ]
  },

  {
    ticker: 'GOOG',
    cusip:  '02079K107',
    name:   'Alphabet Inc.',
    sector: 'Finanzen',
    metrics: [
      { label: 'Marktkapitalisierung', value: '20 Mrd. €'  },
      { label: 'KGV',                  value: '12,8'      },
      { label: 'YTD Performance',      value: '+3,9 %'   }
    ]
  }

]