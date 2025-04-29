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
    metrics: [],
  },
  {
    ticker: 'BRK.B',
    cusip:  '084670702',
    name:   'Berkshire Hathaway B',
    sector: 'Finanzwerte',
    metrics: [
     
    ],
  },
  {
    ticker: 'AMZN',
    cusip:  '023135106',
    name:   'Amazon.com Inc.',
    sector: 'Konsumwerte',
    metrics: [
    
    ],
  },
  {
    ticker: 'GOOGL',
    cusip:  '02079K305',
    name:   'Alphabet Inc.',
    sector: 'Kommunikationsdienste',
    metrics: [
      
    ],
  },
  {
    ticker: 'AXP',
    cusip:  '025816109',
    name:   'American Express Co.',
    sector: 'Finanzwerte',
    metrics: [

    ],
  },
  {
    ticker: 'BAC',
    cusip:  '060505104',
    name:   'Bank of America Corp.',
    sector: 'Finanzwerte',
    metrics: [
 
    ],
  },
  {
    ticker: 'KO',
    cusip:  '191216100',
    name:   'The Coca-Cola Company',
    sector: 'Basiskonsumwerte',
    metrics: [
     
    ],
  },
  {
    ticker: 'CVX',
    cusip:  '166764100',
    name:   'Chevron Corp.',
    sector: 'Energie',
    metrics: [

    ],
  },
  {
    ticker: 'MCO',
    cusip:  '615369105',
    name:   'Moody’s Corp.',
    sector: 'Finanzwerte',
    metrics: [
    
    ],
  },
  {
    ticker: 'KHC',
    cusip:  '500754106',
    name:   'Kraft Heinz Co.',
    sector: 'Basiskonsumwerte',
    metrics: [
     
    ],
  },
  {
    ticker: 'CB',
    cusip:  'H1467J104',
    name:   'Chubb Ltd.',
    sector: 'Finanzwerte',
    metrics: [
  
    ],
  },
  {
    ticker: 'DVA',
    cusip:  '23918K108',
    name:   'DaVita Inc.',
    sector: 'Gesundheitswesen',
    metrics: [
     
    ],
  },
  {
    ticker: 'OXY',
    cusip:  '674599105',
    name:   'Occidental Petroleum',
    sector: 'Energie',
    metrics: [
     
    ],
  },
  {
    ticker: 'KR',
    cusip:  '501044101',
    name:   'Kroger Co.',
    sector: 'Basiskonsumwerte',
    metrics: [
      
    ],
  },
  {
    ticker: 'VRSN',
    cusip:  '92343E102',
    name:   'Verisign Inc.',
    sector: 'Technologie',
    metrics: [

    ],
  },
  {
    ticker: 'SIRI',
    cusip:  '829933100',
    name:   'Sirius XM Holdings Inc.',
    sector: 'Kommunikationsdienste',
    metrics: [
      
    ],
  },
  {
    ticker: 'V',
    cusip:  '92826C839',
    name:   'Visa Inc.',
    sector: 'Finanzwerte',
    metrics: [
    
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
 
    ],
  },
  {
    ticker: 'STZ',
    cusip:  '21036P108',
    name:   'Constellation Brands Inc.',
    sector: 'Basiskonsumwerte',
    metrics: [
     
    ],
  },
  {
    ticker: 'ALLY',
    cusip:  '02005N100',
    name:   'Ally Financial Inc.',
    sector: 'Finanzwerte',
    metrics: [
   
    ],
  },
  {
    ticker: 'C',
    cusip:  '172967424',
    name:   'Citigroup Inc.',
    sector: 'Finanzwerte',
    metrics: [
      
    ],
  },
  {
    ticker: 'DPZ',
    cusip:  '25754A201',
    name:   'Domino’s Pizza Inc.',
    sector: 'Konsumwerte',
    metrics: [
    
    ],
  },
  {
    ticker: 'TMUS',
    cusip:  '872590104',
    name:   'T-Mobile US Inc.',
    sector: 'Kommunikationsdienste',
    metrics: [

    ],
  },
  {
    ticker: 'CHTR',
    cusip:  '16119P108',
    name:   'Charter Communications Inc.',
    sector: 'Kommunikationsdienste',
    metrics: [
 
    ],
  },
  {
    ticker: 'LPX',
    cusip:  '546347105',
    name:   'Louisiana-Pacific Corp.',
    sector: 'Industrie',
    metrics: [
  
    ],
  },
  {
    ticker: 'NU',
    cusip:  'G6683N103',
    name:   'Nu Holdings Ltd.',
    sector: 'Finanzwerte',
    metrics: [
    
    ],
  },
  {
    ticker: 'POOL',
    cusip:  '73278L105',
    name:   'Pool Corp.',
    sector: 'Konsumwerte',
    metrics: [

    ],
  },
  {
    ticker: 'HEI',
    cusip:  '422806208',
    name:   'Heico Corp.',
    sector: 'Konsumwerte',
    metrics: [

    ],
  },
  {
    ticker: 'NVR',
    cusip:  '62944T105',
    name:   'NVR Inc.',
    sector: 'Konsumwerte',
    metrics: [

    ],
  },
  {
    ticker: 'DEO',
    cusip:  '25243Q205',
    name:   'Diageo PLC',
    sector: 'Konsumwerte',
    metrics: [
     
    ],
  },
  {
    ticker: 'LEN',
    cusip:  '526057302',
    name:   'Lennar Corp.',
    sector: 'Konsumwerte',
    metrics: [
   
    ],
  },
  {
    ticker: 'JEF',
    cusip:  '47233W109',
    name:   'Jefferies Financial Group Inc.',
    sector: 'Finanzwerte',
    metrics: [

    ],
  },
  {
    ticker: 'LILA',
    cusip:  'G9001E102',
    name:   'Liberty Latin America Ltd.',
    sector: 'Kommunikationsdienste',
    metrics: [

    ],
  },
  {
    ticker: 'LILAK',
    cusip:  'G9001E128',
    name:   'Liberty Latin America Cl. C',
    sector: 'Kommunikationsdienste',
    metrics: [
    ],
  },
  {
    ticker: 'BATRA',
    cusip:  '047726302',
    name:   'Atlanta Braves Holdings Inc.',
    sector: 'Konsumwerte',
    metrics: [
    ],
  },
  {
    ticker: 'LBTYA',
    cusip:  '531229722',
    name:   'Liberty Media Corp Cl. A',
    sector: 'Konsumwerte',
    metrics: [
 
    ]
  },
  {
    ticker: 'LBTYB',
    cusip:  '531229722',
    name:   'Liberty Media Corp Cl. B',
    sector: 'Konsumwerte',
    metrics: [
  
    ]
  },
  {
    ticker: 'LBTYK',
    cusip:  '531229748',
    name:   'Liberty Media Corp Cl. C',
    sector: 'Konsumwerte',
    metrics: [

    ]
  },

  {
    ticker: 'BN',
    cusip:  '11271J107',
    name:   'Brookfield Corporation',
    sector: 'Finanzen',
    metrics: [
   
    ]
  },
  {
    ticker: 'QSR',
    cusip:  '76131D103',
    name:   'Restaurant Brands International',
    sector: 'Konsumwerte',
    metrics: [
   
    ]
  },
  {
    ticker: 'CMG',
    cusip:  '169656105',
    name:   'Chipotle Mexican Grill',
    sector: 'Konsumwerte',
    metrics: [
 
    ]
  },

  {
    ticker: 'HHH',
    cusip:  '44267T102',
    name:   'Howard Hughes Holdings Inc.',
    sector: 'Finanzen',
    metrics: [
    ]
  },

  {
    ticker: 'GOOG',
    cusip:  '02079K107',
    name:   'Alphabet Inc.',
    sector: 'Finanzen',
    metrics: [

    ]
  },

  {
    ticker: 'NKE',
    cusip:  '654106103',
    name:   'Nike',
    sector: 'Finanzen',
    metrics: [

  
    ]
  },
  {
    ticker: 'HLT',
    cusip:  '43300A203',
    name:   'Hilton Worldwilde Holdings',
    sector: 'Finanzen',
    metrics: [
     
    ]
  },

  {
    ticker: 'CP',
    cusip:  '13646K108',
    name:   'Canadian Pacific Kansas City Limited',
    sector: 'Finanzen',
    metrics: [
   
    ]
  },

  {
    ticker: 'SEG',
    cusip:  '812215200',
    name:   'Seaport Entertainment Group',
    sector: 'Finanzen',
    metrics: [

    ]
  },

  {
    ticker: 'HTZ',
    cusip:  '428046109',
    name:   'Hertz Global Holdings',
    sector: 'Finanzen',
    metrics: [
  
    ]
  }
,
  {
    ticker: 'MSFT',
    cusip:  '594918104',
    name:   'Microsoft',
    sector: 'Technologie',
    metrics: [
  
    ]
  },
  {
    ticker: 'WM',
    cusip:  '94106L109',
    name:   'Waste Management',
    sector: 'Industrie',
    metrics: [
  
    ]
  },
  {
    ticker: 'CAT',
    cusip:  '149123101',
    name:   'Caterpillar Inc.',
    sector: 'Industrie',
    metrics: [
  
    ]
  },
  {
    ticker: 'DE',
    cusip:  '244199105',
    name:   'Deere & Company',
    sector: 'Industrie',
    metrics: [
  
    ]
  },
  {
    ticker: 'ECL',
    cusip:  '278865100',
    name:   'Ecolab Inc.',
    sector: 'Materialien',
    metrics: [
  
    ]
  },
  {
    ticker: 'WMT',
    cusip:  '931142103',
    name:   'Walmart Inc.',
    sector: 'Basiskonsumwerte',
    metrics: [
  
    ]
  },
  {
    ticker: 'FDX',
    cusip:  '31428X106',
    name:   'FedEx Corporation',
    sector: 'Industrie',
    metrics: [
  
    ]
  },

  {
    ticker: 'ABNB',
    cusip:  '009066101',
    name:   'Airbnb',
    sector: 'Industrie',
    metrics: [
  
    ]
  },

  {
    ticker: 'DHR',
    cusip:  '235851102',
    name:   'Danaher Corporation',
    sector: 'Industrie',
    metrics: [
  
    ]
  },
  {
    ticker: 'KKR',
    cusip:  '48251w104',
    name:   'KKR & Co. Inc.',
    sector: 'Industrie',
    metrics: [
  
    ]
  },
  {
    ticker: 'WCN',
    cusip:  '94106B101',
    name:   'Waste Connections',
    sector: 'Industrie',
    metrics: [
  
    ]
  },
  {
    ticker: 'CPNG',
    cusip:  '22266T109',
    name:   'Coupang',
    sector: 'Industrie',
    metrics: [
  
    ]
  }



]