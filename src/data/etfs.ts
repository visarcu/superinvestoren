export interface ETF {
  symbol: string
  symbol_de?: string  // Deutsche Börse Symbol
  name: string
  issuer: string  // Vanguard, iShares, etc.
  assetClass: 'Equity' | 'Fixed Income' | 'Commodity' | 'Mixed'
  category: string  // Large Cap, S&P 500, etc.
  isin?: string
  ter?: number  // Total Expense Ratio für EU
}

export const etfs: ETF[] = [
  // === BELIEBTE DEUTSCHE ETFs (XETRA) ===
  {
    symbol: 'VWCE.DE',
    name: 'Vanguard FTSE All-World UCITS ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity', 
    category: 'Global All-World',
    isin: 'IE00BK5BQT80',
    ter: 0.22
  },
  {
    symbol: 'EUNL.DE',
    name: 'iShares Core MSCI World UCITS ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global Developed',
    isin: 'IE00B4L5Y983', 
    ter: 0.20
  },
  {
    symbol: 'EXS1.DE',
    name: 'iShares Core DAX UCITS ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany',
    isin: 'DE0005933931',
    ter: 0.16
  },
  {
    symbol: 'XMME.DE', 
    name: 'Xtrackers MSCI Emerging Markets UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Emerging Markets',
    isin: 'IE00BTJRMP35',
    ter: 0.18
  },
  {
    symbol: 'VUSA.DE',
    name: 'Vanguard S&P 500 UCITS ETF',
    issuer: 'Vanguard', 
    assetClass: 'Equity',
    category: 'US Large Cap',
    isin: 'IE00B3XXRP09',
    ter: 0.07
  },
  {
    symbol: 'XEON.DE',
    name: 'Xtrackers EURO STOXX 50 UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe',
    isin: 'LU0274211480',
    ter: 0.09
  },
  {
    symbol: 'EQQQ.DE',
    name: 'Invesco EQQQ NASDAQ-100 UCITS ETF',
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology',
    isin: 'IE0032077012',
    ter: 0.30
  },
  {
    symbol: 'VGWL.DE',
    name: 'Vanguard ESG Global All Cap UCITS ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'ESG Global',
    isin: 'IE00BNG8L278',
    ter: 0.24
  },
  {
    symbol: 'XMEU.DE',
    name: 'Xtrackers MSCI Europe UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe',
    isin: 'IE00BFNM3G45',
    ter: 0.12
  },
  {
    symbol: 'VDEV.DE',
    name: 'Vanguard FTSE Developed Markets UCITS ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Global Developed',
    isin: 'IE00BKX55T58',
    ter: 0.12
  },
  {
    symbol: 'XDWT.DE',
    name: 'Xtrackers MSCI World Technology UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology',
    isin: 'IE00BM67HK77',
    ter: 0.25
  },
  {
    symbol: 'XCS6.DE',
    name: 'Xtrackers MSCI USA UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US Broad Market',
    isin: 'IE00BJ0KDR00',
    ter: 0.07
  },
  {
    symbol: 'A1JX52',
    name: 'Vanguard FTSE All-World UCITS ETF (Thesaurierend)',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Global All-World',
    isin: 'IE00B3RBWM25',
    ter: 0.22
  },
  {
    symbol: 'A12CX1',
    name: 'Amundi MSCI World UCITS ETF',
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global Developed',
    isin: 'LU1681043599',
    ter: 0.38
  },
  {
    symbol: 'LYX0YD.DE',
    name: 'Lyxor Core STOXX Europe 600 UCITS ETF',
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe',
    isin: 'LU0908500753',
    ter: 0.07
  },
  {
    symbol: 'XDWD.DE',
    name: 'Xtrackers MSCI World High Dividend Yield UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Dividend',
    isin: 'IE00BZ0PKV06',
    ter: 0.29
  },
  {
    symbol: 'IQQH.DE',
    name: 'iShares Core S&P 500 UCITS ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US Large Cap',
    isin: 'IE00B5BMR087',
    ter: 0.07
  },
  {
    symbol: 'DBXD.DE',
    name: 'Xtrackers DAX UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Germany',
    isin: 'LU0274211838',
    ter: 0.09
  },
  {
    symbol: 'LYXE.DE',
    name: 'Lyxor MSCI World UCITS ETF',
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global Developed',
    isin: 'FR0010315770',
    ter: 0.30
  },
  {
    symbol: 'EXSA.DE',
    name: 'iShares STOXX Europe 600 UCITS ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe',
    isin: 'DE0002635307',
    ter: 0.20
  },
  {
    symbol: 'XCS7.DE',
    name: 'Xtrackers S&P 500 UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US Large Cap',
    isin: 'IE00BJ0KDQ92',
    ter: 0.07
  },
  {
    symbol: 'WSML.DE',
    name: 'iShares Core MSCI World IMI UCITS ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global All Cap',
    isin: 'IE00B4L5YC18',
    ter: 0.18
  },
  {
    symbol: 'IQQY.DE',
    name: 'iShares Core MSCI Europe UCITS ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe',
    isin: 'IE00B1YZSC51',
    ter: 0.12
  },
  {
    symbol: 'SXR7.DE',
    name: 'iShares Core MSCI EMU UCITS ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Eurozone',
    isin: 'IE00B53L3W79',
    ter: 0.12
  },
  {
    symbol: 'SPYI.DE',
    name: 'SPDR MSCI ACWI IMI UCITS ETF',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Global All Cap',
    isin: 'IE00B3YLTY66',
    ter: 0.17
  },
  {
    symbol: 'XUTC.DE',
    name: 'Xtrackers MSCI USA Information Technology UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology',
    isin: 'IE00BM67HL84',
    ter: 0.25
  },
  {
    symbol: 'IS3S.DE',
    name: 'iShares Edge MSCI World Value Factor UCITS ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Value Factor',
    isin: 'IE00BP3QZB59',
    ter: 0.30
  },
  {
    symbol: 'XZW0.DE',
    name: 'Xtrackers MSCI World ESG UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'ESG Global',
    isin: 'IE00BZ02LR44',
    ter: 0.19
  },
  {
    symbol: '18MP.DE',
    name: 'Amundi MSCI World ex EMU UCITS ETF',
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'World ex Eurozone',
    isin: 'FR0013412020',
    ter: 0.35
  },
  {
    symbol: 'SC0J.DE',
    name: 'Invesco MSCI World UCITS ETF',
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Global Developed',
    isin: 'IE00B60SX394',
    ter: 0.19
  },
  {
    symbol: 'DBX2.DE',
    name: 'Xtrackers MSCI EM Asia UCITS ETF',
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Asia Emerging Markets',
    isin: 'IE00BTJRMP35',
    ter: 0.65
  },
  
  // === TOP US ETFs ===
  {
    symbol: 'SPY',
    symbol_de: 'SPY5.DE',
    name: 'SPDR S&P 500 ETF Trust',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Large Cap',
    isin: 'US78462F1030',
    ter: 0.0945
  },
  {
    symbol: 'QQQ',
    symbol_de: 'QQQ.DE',
    name: 'Invesco QQQ Trust',
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology',
    isin: 'US46090E1038',
    ter: 0.20
  },
  {
    symbol: 'IWM',
    name: 'iShares Russell 2000 ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Small Cap',
    isin: 'US4642876555',
    ter: 0.19
  },
  {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Total Market',
    isin: 'US9229087690',
    ter: 0.03
  },
  {
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Large Cap',
    isin: 'US9229087328',
    ter: 0.03
  },
  
  // Technology Sector ETFs
  {
    symbol: 'XLK',
    name: 'Technology Select Sector SPDR Fund',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Technology',
    isin: 'US81369Y5069',
    ter: 0.10
  },
  {
    symbol: 'VGT',
    name: 'Vanguard Information Technology ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology',
    isin: 'US9229086249',
    ter: 0.10
  },
  {
    symbol: 'IGV',
    name: 'iShares Expanded Tech-Software Sector ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology',
    isin: 'US4642865095',
    ter: 0.45
  },
  
  // Healthcare ETFs
  {
    symbol: 'XLV',
    name: 'Health Care Select Sector SPDR Fund',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Healthcare',
    isin: 'US81369Y4040',
    ter: 0.10
  },
  {
    symbol: 'VHT',
    name: 'Vanguard Health Care ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Healthcare',
    isin: 'US9229086835',
    ter: 0.10
  },
  
  // Financial Sector ETFs
  {
    symbol: 'XLF',
    name: 'Financial Select Sector SPDR Fund',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Financials',
    isin: 'US81369Y2967',
    ter: 0.10
  },
  {
    symbol: 'VFH',
    name: 'Vanguard Financials ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Financials',
    isin: 'US9229086751',
    ter: 0.10
  },
  
  // Energy Sector ETFs
  {
    symbol: 'XLE',
    name: 'Energy Select Sector SPDR Fund',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Energy',
    isin: 'US81369Y2885',
    ter: 0.10
  },
  {
    symbol: 'VDE',
    name: 'Vanguard Energy ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Energy',
    isin: 'US9229086587',
    ter: 0.10
  },
  
  // International Equity ETFs
  {
    symbol: 'VEA',
    name: 'Vanguard FTSE Developed Markets ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'International Developed',
    isin: 'US9229085538',
    ter: 0.05
  },
  {
    symbol: 'VWO',
    name: 'Vanguard FTSE Emerging Markets ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Emerging Markets',
    isin: 'US9229087294',
    ter: 0.08
  },
  {
    symbol: 'EFA',
    name: 'iShares MSCI EAFE ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'International Developed',
    isin: 'US4642874576',
    ter: 0.32
  },
  {
    symbol: 'EEM',
    name: 'iShares MSCI Emerging Markets ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets',
    isin: 'US4642863926',
    ter: 0.68
  },
  
  // Fixed Income ETFs
  {
    symbol: 'AGG',
    name: 'iShares Core U.S. Aggregate Bond ETF',
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Aggregate Bond',
    isin: 'US4642863018',
    ter: 0.03
  },
  {
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Aggregate Bond',
    isin: 'US9229087427',
    ter: 0.03
  },
  {
    symbol: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Treasury',
    isin: 'US4642874251',
    ter: 0.15
  },
  
  // Real Estate ETFs
  {
    symbol: 'VNQ',
    name: 'Vanguard Real Estate ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Real Estate',
    isin: 'US9229087203',
    ter: 0.12
  },
  {
    symbol: 'XLRE',
    name: 'Real Estate Select Sector SPDR Fund',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Real Estate',
    isin: 'US81369Y8047',
    ter: 0.10
  },
  
  // Commodity ETFs
  {
    symbol: 'GLD',
    name: 'SPDR Gold Shares',
    issuer: 'State Street',
    assetClass: 'Commodity',
    category: 'Gold',
    isin: 'US78463V1070',
    ter: 0.40
  },
  {
    symbol: 'SLV',
    name: 'iShares Silver Trust',
    issuer: 'iShares',
    assetClass: 'Commodity',
    category: 'Silver',
    isin: 'US4642851053',
    ter: 0.50
  },
  {
    symbol: 'USO',
    name: 'United States Oil Fund',
    issuer: 'United States Commodity Funds',
    assetClass: 'Commodity',
    category: 'Oil',
    isin: 'US91232N2071',
    ter: 0.75
  },
  
  // Growth/Value Style ETFs
  {
    symbol: 'VUG',
    name: 'Vanguard Growth ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Large Cap Growth',
    isin: 'US9229087245',
    ter: 0.04
  },
  {
    symbol: 'VTV',
    name: 'Vanguard Value ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Large Cap Value',
    isin: 'US9229087161',
    ter: 0.04
  },
  
  // Dividend ETFs
  {
    symbol: 'VYM',
    name: 'Vanguard High Dividend Yield ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Dividend',
    isin: 'US9229087567',
    ter: 0.06
  },
  {
    symbol: 'SCHD',
    name: 'Schwab US Dividend Equity ETF',
    issuer: 'Schwab',
    assetClass: 'Equity',
    category: 'Dividend',
    isin: 'US8085247976',
    ter: 0.06
  },
  
  // Emerging Technology ETFs
  {
    symbol: 'ARKK',
    name: 'ARK Innovation ETF',
    issuer: 'ARK',
    assetClass: 'Equity',
    category: 'Innovation',
    isin: 'US00214Q1040',
    ter: 0.75
  },
  {
    symbol: 'ARKQ',
    name: 'ARK Autonomous Technology & Robotics ETF',
    issuer: 'ARK',
    assetClass: 'Equity',
    category: 'Technology',
    isin: 'US00214Q2018',
    ter: 0.75
  },
  
  // Additional Popular ETFs
  {
    symbol: 'IEFA',
    name: 'iShares Core MSCI EAFE IMI Index ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'International Developed',
    isin: 'US4642874220',
    ter: 0.07
  },
  {
    symbol: 'IJH',
    name: 'iShares Core S&P Mid-Cap ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Mid Cap',
    isin: 'US4642873255',
    ter: 0.05
  },
  {
    symbol: 'IJR',
    name: 'iShares Core S&P Small-Cap ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Small Cap',
    isin: 'US4642872265',
    ter: 0.06
  },
  {
    symbol: 'VTEB',
    name: 'Vanguard Tax-Exempt Bond ETF',
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Municipal Bond',
    isin: 'US9229087880',
    ter: 0.05
  },
  {
    symbol: 'VXUS',
    name: 'Vanguard Total International Stock ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Total International',
    isin: 'US92204A8630',
    ter: 0.08
  },
  
  // Sector Specific ETFs
  {
    symbol: 'XLI',
    name: 'Industrial Select Sector SPDR Fund',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Industrials',
    isin: 'US81369Y3047',
    ter: 0.10
  },
  {
    symbol: 'XLP',
    name: 'Consumer Staples Select Sector SPDR Fund',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Consumer Staples',
    isin: 'US81369Y3807',
    ter: 0.10
  },
  {
    symbol: 'XLY',
    name: 'Consumer Discretionary Select Sector SPDR Fund',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Consumer Discretionary',
    isin: 'US81369Y4824',
    ter: 0.10
  },
  {
    symbol: 'XLB',
    name: 'Materials Select Sector SPDR Fund',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Materials',
    isin: 'US81369Y2125',
    ter: 0.10
  },
  {
    symbol: 'XLU',
    name: 'Utilities Select Sector SPDR Fund',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Utilities',
    isin: 'US81369Y4063',
    ter: 0.10
  },
  
  // European ETFs
  {
    symbol: 'VGK',
    name: 'Vanguard FTSE Europe ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Europe',
    isin: 'US9229086751',
    ter: 0.08
  },
  {
    symbol: 'EWG',
    name: 'iShares MSCI Germany ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany',
    isin: 'US4642874915',
    ter: 0.50
  },
  {
    symbol: 'FEZ',
    name: 'SPDR EURO STOXX 50 ETF',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Europe',
    isin: 'US78463X5088',
    ter: 0.29
  },
  
  // Bond ETFs
  {
    symbol: 'TIP',
    name: 'iShares TIPS Bond ETF',
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'TIPS',
    isin: 'US4642872877',
    ter: 0.19
  },
  {
    symbol: 'LQD',
    name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF',
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Corporate Bond',
    isin: 'US4642874766',
    ter: 0.14
  },
  {
    symbol: 'HYG',
    name: 'iShares iBoxx $ High Yield Corporate Bond ETF',
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'High Yield',
    isin: 'US4642875334',
    ter: 0.49
  },
  
  // Thematic/ARK ETFs
  {
    symbol: 'ARKW',
    name: 'ARK Next Generation Internet ETF',
    issuer: 'ARK',
    assetClass: 'Equity',
    category: 'Internet',
    isin: 'US00214Q3020',
    ter: 0.75
  },
  {
    symbol: 'ARKG',
    name: 'ARK Genomics Revolution ETF',
    issuer: 'ARK',
    assetClass: 'Equity',
    category: 'Genomics',
    isin: 'US00214Q1999',
    ter: 0.75
  },
  
  // Clean Energy ETFs
  {
    symbol: 'ICLN',
    name: 'iShares Global Clean Energy ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Clean Energy',
    isin: 'US4642874683',
    ter: 0.42
  },
  {
    symbol: 'PBW',
    name: 'Invesco WilderHill Clean Energy ETF',
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Clean Energy',
    isin: 'US46090E2046',
    ter: 0.70
  },
  
  // Emerging Markets by Region
  {
    symbol: 'FXI',
    name: 'iShares China Large-Cap ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'China',
    isin: 'US4642874329',
    ter: 0.72
  },
  {
    symbol: 'EWJ',
    name: 'iShares MSCI Japan ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan',
    isin: 'US4642874998',
    ter: 0.50
  },
  
  // Popular Low-Cost ETFs
  {
    symbol: 'FXNAX',
    name: 'Fidelity U.S. Bond Index Fund',
    issuer: 'Fidelity',
    assetClass: 'Fixed Income',
    category: 'Aggregate Bond',
    isin: 'US3160928657',
    ter: 0.025
  },
  {
    symbol: 'FZROX',
    name: 'Fidelity ZERO Total Market Index Fund',
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Total Market',
    isin: 'US31635T8060',
    ter: 0.00
  },
  
  // ESG/Sustainable ETFs
  {
    symbol: 'ESGV',
    name: 'Vanguard ESG U.S. Stock ETF',
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'ESG',
    isin: 'US92206C6003',
    ter: 0.09
  },
  {
    symbol: 'SUSA',
    name: 'iShares MSCI USA ESG Select ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'ESG',
    isin: 'US4642868398',
    ter: 0.25
  },
  
  // More Sector ETFs
  {
    symbol: 'ITA',
    name: 'iShares U.S. Aerospace & Defense ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Aerospace & Defense',
    isin: 'US4642867735',
    ter: 0.40
  },
  {
    symbol: 'IBB',
    name: 'iShares Biotechnology ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Biotechnology',
    isin: 'US4642876282',
    ter: 0.44
  },
  {
    symbol: 'XBI',
    name: 'SPDR S&P Biotech ETF',
    issuer: 'State Street',
    assetClass: 'Equity',
    category: 'Biotechnology',
    isin: 'US78464A6982',
    ter: 0.35
  },
  
  // Factor-Based ETFs
  {
    symbol: 'MTUM',
    name: 'iShares MSCI USA Momentum Factor ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Momentum',
    isin: 'US4642868216',
    ter: 0.15
  },
  {
    symbol: 'QUAL',
    name: 'iShares MSCI USA Quality Factor ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Quality',
    isin: 'US4642868380',
    ter: 0.15
  },
  {
    symbol: 'SIZE',
    name: 'iShares MSCI USA Size Factor ETF',
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Size',
    isin: 'US4642868307',
    ter: 0.15
  },
  
  // Currency ETFs
  {
    symbol: 'UUP',
    name: 'Invesco DB US Dollar Index Bullish Fund',
    issuer: 'Invesco',
    assetClass: 'Mixed',
    category: 'Currency',
    isin: 'US46090E4057',
    ter: 0.75
  }
];