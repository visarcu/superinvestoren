// XETRA ETFs extracted from FMP API
// Total: 1852 ETFs trading on XETRA exchange
// Generated on 2025-09-03

export interface ETF {
  symbol: string;
  name: string;
  price?: number;
  issuer: string;
  assetClass: 'Equity' | 'Fixed Income' | 'Commodity' | 'Mixed';
  category: string;
  isin?: string;
  ter?: number;
  exchange?: string;
}

export const xetraETFs: ETF[] = [
  {
    symbol: '0GZA.DE',
    name: 'RICI Enhanced Natural Gas Excess Return Index',
    price: 11.17,
    issuer: 'RICI',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '0GZB.DE',
    name: 'BNPP RICI Enhanced Kupfer',
    price: 96.17,
    issuer: 'BNPP',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '0GZC.DE',
    name: 'RICI Enhanced Nickel',
    price: 57.215,
    issuer: 'RICI',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '0GZE.DE',
    name: 'RICI Enhanced Diesel',
    price: 48.29,
    issuer: 'RICI',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '0GZF.DE',
    name: 'RICI Enhanced Benzin',
    price: 155.29,
    issuer: 'RICI',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '0GZG.DE',
    name: 'RICI Enhanced Heating Oil',
    price: 63.5,
    issuer: 'RICI',
    assetClass: 'Commodity',
    category: 'Energy'
  },
  {
    symbol: '0GZH.DE',
    name: 'RICI Enhanced Aluminum Excess Return Index',
    price: 12.925,
    issuer: 'RICI',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '0GZI.DE',
    name: 'RICI Enhanced Zinc Excess Return Index',
    price: 27.016,
    issuer: 'RICI',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '0GZJ.DE',
    name: 'RICI Enhanced Tin Excess Return Index',
    price: 85.11,
    issuer: 'RICI',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '0GZK.DE',
    name: 'RICI Enhanced Lead Excess Return Index',
    price: 34.316,
    issuer: 'RICI',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '0GZL.DE',
    name: 'BNPP RICI Enhanced Metals (ER) Index EUR Hedge ETC',
    price: 56.11,
    issuer: 'BNPP',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '0NS.DE',
    name: 'Amundi Index Solutions - Amundi Prime US Treasury Bond 0-1 Y UCITS ETF',
    price: 25.443,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '0P00006DAQ.F',
    name: 'Fidelity Funds - US High Yield Fund A-Acc-EUR',
    price: 29.88,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '0P00015OFP.F',
    name: 'Fidelity Global Technology A-Acc-EUR',
    price: 53.34,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '10AH.DE',
    name: 'Amundi Index Solutions - Amundi Index MSCI World',
    price: 80.61,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '10AI.DE',
    name: 'Amundi Index Solutions - Amundi Index MSCI Europe UCITS ETF DR EUR',
    price: 70.23,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '10AJ.DE',
    name: 'Amundi Index Solutions - Amundi Index FTSE EPRA NAREIT Global',
    price: 51.2,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '10AK.DE',
    name: 'Amundi Index Solutions - Amundi Index J.P. Morgan GBI Global Govies',
    price: 43.826,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '10AK.F',
    name: 'Amundi Index Solutions - Amundi Index J.P. Morgan GBI Global Govies',
    price: 46.346,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '10AL.DE',
    name: 'Amundi Index Solutions - Amundi Index JP Morgan EMU Govies',
    price: 42.314,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '10AM.DE',
    name: 'Amundi Index Solutions - Amundi Index Barclays Global AGG 500M UCITS ETF DR EUR',
    price: 45.211,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '18M0.DE',
    name: 'Amundi ETF Govt Bond Euro Broad Investment Grade 7-10 UCITS ETF DR',
    price: 238.47,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '18M1.DE',
    name: 'Amundi ETF Govies 0-6 Months Euro Investment Grade UCITS ETF DR',
    price: 124.72,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '18M2.DE',
    name: 'Amundi ETF MSCI EMU High Dividend UCITS ETF',
    price: 174.28,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '18M3.DE',
    name: 'Amundi ETF MSCI Europe Banks UCITS ETF',
    price: 100.4,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '18M4.DE',
    name: 'Amundi ETF MSCI Europe Consumer Discretionary UCITS ETF',
    price: 174.42,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '18M6.DE',
    name: 'Amundi ETF MSCI Europe Healthcare UCITS ETF',
    price: 416.8,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '18MF.DE',
    name: 'Amundi ETF Leveraged MSCI USA Daily UCITS ETF',
    price: 22.59,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '18MG.DE',
    name: 'Amundi Index Solutions - Amundi MSCI China',
    price: 218.85,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: '18MK.DE',
    name: 'Amundi Index Solutions - Amundi MSCI India',
    price: 857.9,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '18MM.DE',
    name: 'Amundi Index MSCI Pacific ex Japan SRI - UCITS ETF DR - EUR (C)',
    price: 618.6,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: '18MP.DE',
    name: 'Amundi ETF MSCI World ex EMU UCITS ETF',
    price: 385,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '18MS.DE',
    name: 'Amundi ETF Short Euro Stoxx 50 Daily UCITS ETF',
    price: 6.862,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '18MU.DE',
    name: 'Amundi ETF Euro Inflation UCITS ETF DR',
    price: 236.3,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '18MW.DE',
    name: 'Amundi ETF Govt Bond Euro Broad Investment Grade 10-15 UCITS ETF',
    price: 245.79,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '18MX.DE',
    name: 'Amundi ETF Govt Bond Euro Broad Investment Grade 1-3 UCITS ETF DR',
    price: 162.215,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '18MY.DE',
    name: 'Amundi ETF Govt Bond Euro Broad Investment Grade 3-5 UCITS ETF',
    price: 188.53,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '18MZ.DE',
    name: 'Amundi ETF Govt Bond EuroMTS Broad Investment Grade 5-7 UCITS ETF DR C',
    price: 215.59,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '2B70.DE',
    name: 'iShares Nasdaq US Biotechnology UCITS ETF USD (Acc)',
    price: 5.96,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '2B76.DE',
    name: 'iShares Automation & Robotics UCITS ETF',
    price: 12.944,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '2B77.DE',
    name: 'iShares Ageing Population UCITS ETF',
    price: 7.633,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '2B78.DE',
    name: 'iShares Healthcare Innovation UCITS ETF',
    price: 6.915,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '2B79.DE',
    name: 'iShares Digitalisation UCITS ETF',
    price: 9.755,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '2B7A.DE',
    name: 'iShares V PLC - iShares S&P 500 Utilities Sector UCITS ETF',
    price: 8.74,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '2B7B.DE',
    name: 'iShares V PLC - iShares S&P 500 Materials Sector UCITS ETF',
    price: 8.723,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '2B7C.DE',
    name: 'iShares V PLC - iShares S&P 500 Industrials Sector UCITS ETF',
    price: 10.828,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '2B7D.DE',
    name: 'iShares V PLC - iShares S&P 500 Consumer Staples Sector UCITS ETF',
    price: 8.066,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '2B7F.DE',
    name: 'iShares Automation & Robotics UCITS ETF',
    price: 8.663,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '2B7J.DE',
    name: 'iShares MSCI World SRI UCITS ETF',
    price: 8.559,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '2B7K.DE',
    name: 'iShares MSCI World SRI UCITS ETF EUR (Acc)',
    price: 11.458,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '2B7S.DE',
    name: 'iShares $ Treasury Bond 1-3yr UCITS ETF',
    price: 5.0478,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '36B1.DE',
    name: 'iShares J.P. Morgan ESG $ EM Bond UCITS ETF',
    price: 3.756,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: '36B3.DE',
    name: 'iShares MSCI Europe SRI UCITS ETF',
    price: 7.119,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '36B4.DE',
    name: 'iShares MSCI Japan SRI UCITS ETF',
    price: 5.509,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: '36B5.DE',
    name: 'iShares MSCI EM SRI UCITS ETF',
    price: 5.065,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: '36B6.DE',
    name: 'iShares MSCI USA SRI UCITS ETF USD (Dist)',
    price: 9.776,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '36B7.DE',
    name: 'iShares Global Corp Bond UCITS ETF',
    price: 4.2937,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: '36B7.F',
    name: 'iShares Global Corp Bond UCITS ETF',
    price: 4.2345,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: '36BA.DE',
    name: 'iShares $ Corp Bond ESG UCITS ETF',
    price: 4.01,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '36BA.F',
    name: 'iShares $ Corp Bond ESG UCITS ETF',
    price: 4.082,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '36BB.DE',
    name: 'iShares MSCI World Consumer Discretionary Sector UCITS ETF',
    price: 7.511,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '36BB.F',
    name: 'iShares MSCI World Consumer Discretionary Sector UCITS ETF',
    price: 6.474,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '36BE.DE',
    name: 'iShares $ Corp Bond ESG UCITS ETF',
    price: 3.7078,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '36BZ.DE',
    name: 'iShares MSCI China A UCITS ETF',
    price: 4.6525,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: '3DEL.DE',
    name: 'WisdomTree DAX 3x Daily Leveraged',
    price: 477.34,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: '3DIE.DE',
    name: 'Leverage Shares PLC E',
    price: 0.2388,
    issuer: 'Leverage',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '3LV.DE',
    name: 'WisdomTree CAC 40 3x Daily Leveraged',
    price: 51.025,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '3NFE.F',
    name: 'Leverage Shares 3x Netflix ETC',
    price: 0.134,
    issuer: 'Leverage',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: '3SUD.DE',
    name: 'iShares J.P. Morgan $ EM Bond UCITS ETF',
    price: 5.0354,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: '3SUD.F',
    name: 'iShares J.P. Morgan $ EM Bond UCITS ETF',
    price: 4.3144,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: '3SUE.DE',
    name: 'iShares MSCI World Consumer Staples Sector UCITS ETF',
    price: 5.11,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '3SUE.F',
    name: 'iShares MSCI World Consumer Staples Sector UCITS ETF',
    price: 5.238,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '3SUR.DE',
    name: 'iShares MSCI USA SRI UCITS ETF',
    price: 1881.8,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '4BRZ.DE',
    name: 'iShares MSCI Brazil UCITS ETF (DE)',
    price: 39.285,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '4COP.F',
    name: 'Global X Copper Miners UCITS ETF',
    price: 29.55,
    issuer: 'Global',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '4UB1.F',
    name: 'UBS (Irl) ETF plc - MSCI World Socially Responsible UCITS ETF',
    price: 12.26,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '4UB9.F',
    name: 'UBS (Irl) Fund Solutions plc - MSCI World Socially Responsible Ucits ETF',
    price: 15.674,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '4UBK.F',
    name: 'UBS (Irl) ETF plc - MSCI USA Socially Responsible UCITS ETF',
    price: 13.66,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '4UBR.F',
    name: 'Ubs Etf - Bloomberg Barclays Msci Global Liquid Corporates Sustainable Ucits ETF',
    price: 10.909,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '540F.DE',
    name: 'Amundi Index Solutions - Amundi ETF MSCI Brazil UCITS ETF',
    price: 41.585,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '540G.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Eastern Europe Ex Russia',
    price: 261.8,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '540H.DE',
    name: 'Amundi ETF MSCI Europe ex EMU UCITS ETF',
    price: 372.95,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '540J.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Switzerland',
    price: 11.808,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '540J.F',
    name: 'Amundi Index Solutions - Amundi MSCI Switzerland',
    price: 10.218,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '540K.DE',
    name: 'Amundi ETF MSCI UK UCITS ETF',
    price: 235.3,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '5ESE.DE',
    name: 'Invesco S&P 500 ESG UCITS ETF',
    price: 74.5,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '5ESG.DE',
    name: 'Invesco S&P 500 ESG UCITS ETF',
    price: 75.7,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '5HED.DE',
    name: 'Ossiam ESG Low Carbon Shiller Barclays CAPE US Sector UCITS ETF',
    price: 123.5,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '5HEE.DE',
    name: 'Ossiam ESG Low Carbon Shiller Barclays CAPE US Sector UCITS ETF 1A (EUR)',
    price: 105.92,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '5HEU.F',
    name: 'Ossiam ESG Shiller Barclays CAPE Europe Sector UCITS ETF',
    price: 98.17,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '5MVL.DE',
    name: 'iShares Edge MSCI EM Value Factor UCITS ETF',
    price: 52.62,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: '5MVW.DE',
    name: 'iShares MSCI World Energy Sector UCITS ETF',
    price: 6.228,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '5MVW.F',
    name: 'iShares MSCI World Energy Sector UCITS ETF',
    price: 5.838,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '5UOA.DE',
    name: 'iShares $ Corp Bond ESG UCITS ETF USD Acc',
    price: 4.4093,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: '5X62.DE',
    name: 'Lyxor Bund Future Daily (-1x) Inverse UCITS ETF',
    price: 63.1,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '5XYE.DE',
    name: 'HAN-GINS Cloud Technology Equal Weight UCITS ETF',
    price: 10.684,
    issuer: 'HAN-GINS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '6AQQ.DE',
    name: 'Amundi Index Solutions - Amundi Nasdaq-100',
    price: 229.4,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '6FIN.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Financial Services UCITS ETF',
    price: 164.22,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '6PSA.DE',
    name: 'Invesco FTSE RAFI US 1000 UCITS ETF',
    price: 31.065,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: '6PSC.DE',
    name: 'Invesco FTSE RAFI Europe UCITS ETF',
    price: 13.436,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '6PSC.F',
    name: 'Invesco FTSE RAFI Europe UCITS ETF',
    price: 10.47,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '6PSK.DE',
    name: 'Invesco FTSE RAFI Emerging Markets UCITS ETF',
    price: 9.049,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: '6TVL.DE',
    name: 'Amundi STOXX Europe 600 Consumer Discretionary UCITS ETF Distribution',
    price: 38.28,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: '6TVM.DE',
    name: 'Amundi S&P 500 UCITS ETF - D-USD',
    price: 57.068,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: '7USH.DE',
    name: 'Amundi Index Solutions - Amundi US Treasury 7-10',
    price: 42.715,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Government Bonds'
  },
  {
    symbol: '8522.DE',
    name: 'Lyxor iBOXX Euro Sovereigns Germany Capped 5-10 UCITS ETF',
    price: 145.98,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: '8523.DE',
    name: 'Lyxor iBOXX Euro Sovereigns Germany Capped 10+ UCITS ETF',
    price: 204.69,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: '8OUU.DE',
    name: 'Amundi Index Solutions - Amundi Global AGG SRI',
    price: 41.36,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: '9E0E.DE',
    name: 'Amundi Index Solutions - Amundi Index Euro AGG SRI',
    price: 45.376,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'ABN3.DE',
    name: 'Leverage Shares 3x Airbnb ETP',
    price: 32.062,
    issuer: 'Leverage',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'ACU2.DE',
    name: 'Amundi Index Solutions - Amundi MSCI USA UCITS ETF-C EUR',
    price: 667.68,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'AE50.DE',
    name: 'Amundi ETF Stoxx Europe 50 UCITS ETF',
    price: 124.58,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'AEMD.DE',
    name: 'Amundi Index Solutions - Amundi Index MSCI Emerging Markets',
    price: 55.132,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'AEMD.F',
    name: 'Amundi Index Solutions - Amundi Index MSCI Emerging Markets',
    price: 45.925,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'AFI1.F',
    name: 'Amundi Index Breakeven Inflation USD 10Y UCITS ETF',
    price: 54.842,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'AFIN.DE',
    name: 'Amundi Index Solutions - Amundi EURO Corporate Financials ESG',
    price: 124.46,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Financials'
  },
  {
    symbol: 'AH50.DE',
    name: 'Xtrackers Harvest FTSE China A-H 50 UCITS ETF',
    price: 26.945,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'AHYE.DE',
    name: 'Amundi Index Solutions - Amundi EURO High Yield Bond ESG',
    price: 260.65,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Dividend'
  },
  {
    symbol: 'AHYQ.DE',
    name: 'Amundi Index Solutions - Amundi MSCI World III UCITS ETF USD',
    price: 101.39,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'AKWA.F',
    name: 'Global X Clean Water UCITS ETF',
    price: 22.02,
    issuer: 'Global',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'ALQD.DE',
    name: 'Xtrackers II - USD Asia ex Japan Corporate Bond UCITS ETF',
    price: 107.61,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Asia'
  },
  {
    symbol: 'AME6.DE',
    name: 'Amundi Index Solutions - Amundi STOXX Europe 600',
    price: 135.8,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'AMEA.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Em Asia',
    price: 40.955,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'AMEC.DE',
    name: 'Amundi Index Solutions - Amundi Smart City ETF',
    price: 63.21,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'AMED.DE',
    name: 'Amundi Index Solutions-Amundi MSCI EMU ESG Leaders Select',
    price: 322.25,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'ESG'
  },
  {
    symbol: 'AMEE.DE',
    name: 'Amundi ETF MSCI Europe Energy UCITS ETF',
    price: 502.2,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'AMEI.DE',
    name: 'Amundi Index Solutions - Amundi Index MSCI Emerging Markets SRI PAB',
    price: 55.89,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'AMEL.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Em Latin America',
    price: 15.76,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'AMEM.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Emerging Markets',
    price: 5.5592,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'AMEQ.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Europe Quality Factor',
    price: 108.42,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'AMES.DE',
    name: 'Amundi ETF MSCI Spain UCITS ETF',
    price: 369.3,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'AMEW.DE',
    name: 'Amundi Index Solutions - Amundi MSCI World UCITS ETF',
    price: 571.16,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'APXJ.DE',
    name: 'Amundi Index MSCI Pacific Ex Japan SRI PAB - UCITS ETF DR - EUR (D)',
    price: 9.294,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'ASR3.DE',
    name: 'BNP Paribas Easy Corp Bond SRI PAB 1-3Y',
    price: 9.6882,
    issuer: 'BNP Paribas',
    assetClass: 'Fixed Income',
    category: 'Mixed'
  },
  {
    symbol: 'ASR5.DE',
    name: 'BNP Paribas Easy € Corp Bond SRI PAB 3-5Y',
    price: 9.263,
    issuer: 'BNP Paribas',
    assetClass: 'Fixed Income',
    category: 'Mixed'
  },
  {
    symbol: 'ASRI.DE',
    name: 'BNP Paribas Easy € Corp Bond SRI Fossil Free',
    price: 10.502,
    issuer: 'BNP Paribas',
    assetClass: 'Fixed Income',
    category: 'Mixed'
  },
  {
    symbol: 'ASRR.DE',
    name: 'BNP Paribas Easy MSCI Europe SRI S-Series PAB 5% Capped',
    price: 33.95,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ASRS.F',
    name: 'BNP Paribas Easy ECPI Global ESG Hydrogen Economy',
    price: 9.822,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'ASWA.DE',
    name: 'HANetf ICAV - European Green Deal UCITS ETF',
    price: 7.847,
    issuer: 'HANetf',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'AUM5.DE',
    name: 'Amundi Index Solutions - Amundi S&P 500 UCITS ETF',
    price: 109.44,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'AW10.F',
    name: 'UBS (Irl) ETF plc - MSCI World Climate Paris Aligned UCITS ETF',
    price: 14.212,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'AW1B.F',
    name: 'UBS (Irl) ETF plc - S&P 500 ESG ELITE UCITS ETF',
    price: 12.02,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'AW1Q.DE',
    name: 'UBS (Irl) ETF plc MSCI Japan Climate Paris Aligned UCITS ETF',
    price: 18.514,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'AW1R.DE',
    name: 'UBS (Irl) ETF plc - MSCI ACWI Socially Responsible UCITS ETF Hedged EUR A Acc',
    price: 17.982,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'AYE2.DE',
    name: 'iShares € High Yield Corp Bond ESG UCITS ETF',
    price: 5.7278,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'AYEM.DE',
    name: 'iShares IV Public Limited Company - iShares MSCI EM IMI ESG Screened UCITS ETF',
    price: 6.72,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'AYEP.DE',
    name: 'iShares Asia Property Yield UCITS ETF',
    price: 4.6595,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'AYEP.F',
    name: 'iShares Asia Property Yield UCITS ETF',
    price: 4.245,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'AYEU.DE',
    name: 'iShares Smart City Infrastructure UCITS ETF',
    price: 7.595,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'AYEW.DE',
    name: 'iShares MSCI World Information Technology Sector ESG UCITS ETF',
    price: 13.218,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'B500.DE',
    name: 'Amundi Index Solutions - Amundi S&P 500 Buyback',
    price: 301.55,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'B500.F',
    name: 'Amundi Index Solutions - Amundi S&P 500 Buyback',
    price: 229.7,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'BATE.DE',
    name: 'L&G Battery Value-Chain UCITS ETF',
    price: 18.508,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'BBCK.DE',
    name: 'Invesco Global Buyback Achievers UCITS ETF',
    price: 55.27,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'BBEG.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV BetaBuilders EUR Govt Bond UCITS ETF',
    price: 93.068,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'BBLL.DE',
    name: 'JPM BetaBuilders US Treasury Bond 0-1 yr UCITS ETF',
    price: 100.155,
    issuer: 'JPM',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'BBTR.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV BetaBuilders US Treasury Bond UCITS ETF',
    price: 90.126,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'BBUD.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - BetaBuilders US Equity UCITS ETF',
    price: 35.32,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'BBUS.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - BetaBuilders US Equity UCITS ETF',
    price: 52.46,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'BCFE.DE',
    name: 'UBS (Irl) Fund Solutions plc - Bloomberg Commodity CMCI SF UCITS ETF (hedged to EUR) A-acc',
    price: 14.506,
    issuer: 'UBS',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'BCFU.DE',
    name: 'UBS (Irl) Fund Solutions plc - Bloomberg Commodity CMCI SF UCITS ETF',
    price: 17.504,
    issuer: 'UBS',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'BGX.DE',
    name: 'Expat Bulgaria SOFIX UCITS ETF',
    price: 0.7551,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'BGX.F',
    name: 'Expat Bulgaria SOFIX UCITS ETF',
    price: 0.4979,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'BLUM.DE',
    name: 'Rize UCITS ICAV - Rize Medical Cannabis and Life Sciences UCITS ETF',
    price: 1.8746,
    issuer: 'Rize',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'BNXG.DE',
    name: 'Invesco CoinShares Global Blockchain UCITS ETF',
    price: 123.7,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'BUNH.DE',
    name: 'Lyxor Nasdaq-100 Ucits ETF',
    price: 11.746,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'C001.DE',
    name: 'Amundi Index Solutions SICAV - Dax ETF',
    price: 180.52,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'C003.DE',
    name: 'Amundi Index Solutions - Amundi DivDAX I UCITS ETF EUR Distributing',
    price: 35.83,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'C004.DE',
    name: 'Lyxor ShortDAX Daily (-1x) Inverse UCITS ETF',
    price: 13.93,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'C005.DE',
    name: 'Amundi Index Solutions - Amundi SDAX UCITS ETF EUR Distributing',
    price: 129.98,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'C006.DE',
    name: 'Amundi Index Solutions - Amundi F.A.Z. 100 UCITS ETF EUR Distributing',
    price: 36.195,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'C006.F',
    name: 'Lyxor F.A.Z. 100 Index (DR) UCITS ETF',
    price: 28.795,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'C007.DE',
    name: 'Amundi Index Solutions - Amundi MDAX ESG UCITS ETF EUR Distributing',
    price: 24.69,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'C007.F',
    name: 'Lyxor MDAX ESG UCITS ETF',
    price: 24.48,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'C010.DE',
    name: 'Lyxor Dow Jones Industrial Average (LUX) UCITS ETF',
    price: 362.65,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'C020.DE',
    name: 'Lyxor Nikkei 225 UCITS ETF',
    price: 21.335,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'C024.DE',
    name: 'Amundi MSCI China A II UCITS ETF',
    price: 147.72,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'C029.DE',
    name: 'Lyxor SPI UCITS ETF',
    price: 114.94,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'C030.DE',
    name: 'Amundi Index Solutions - Amundi DJ Switzerland Titans 30 UCITS ETF CHF Distributing',
    price: 171.36,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'C051.DE',
    name: 'Lyxor EURO STOXX Select Dividend 30 UCITS ETF',
    price: 43.275,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'C060.DE',
    name: 'Lyxor STOXX Europe 600 UCITS ETF',
    price: 94.05,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'C071.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Media UCITS ETF',
    price: 86.16,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'C090.DE',
    name: 'Lyxor Bloomberg Equal-weight Commodity ex-Agriculture UCITS ETF',
    price: 146.36,
    issuer: 'Lyxor',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'C099.DE',
    name: 'Lyxor Bloomberg Equal-weight Commodity ex-Agriculture EUR hedged UCITS ETF',
    price: 28.09,
    issuer: 'Lyxor',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'C101.DE',
    name: 'Amundi US Fed Funds Rate UCITS ETF Dist',
    price: 91.2745,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CAB3.DE',
    name: 'Amundi Index Solutions - Amundi BBB EURO Corporate Investment Grade ESG',
    price: 14.1,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'ESG'
  },
  {
    symbol: 'CASH.DE',
    name: 'L&GE Fund MSCI China A UCITS ETF',
    price: 15.852,
    issuer: 'L&GE',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'CB3G.DE',
    name: 'Amundi Index Solutions - Amundi Govt Bond Euro Broad Investment Grade',
    price: 218.48,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Mixed'
  },
  {
    symbol: 'CBSX.DE',
    name: 'The Medical Cannabis and Wellness UCITS ETF',
    price: 2.609,
    issuer: 'The',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CBU0.DE',
    name: 'iShares Core GBP Corp Bond UCITS ETF Hedged EUR',
    price: 5.3148,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'CBU2.DE',
    name: 'iShares € Aggregate Bond ESG UCITS ETF EUR (Dist)',
    price: 5.3982,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'CBUC.DE',
    name: 'iShares MSCI USA ESG Enhanced UCITS ETF',
    price: 6.652,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'CBUC.F',
    name: 'iShares MSCI USA ESG Enhanced UCITS ETF',
    price: 4.7655,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'CBUD.DE',
    name: 'iShares MSCI Europe SRI UCITS ETF',
    price: 5.02,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'CBUE.DE',
    name: 'iShares VII PLC - iShares VII PLC - iShares $ Treasury Bond 3-7yr UCITS ETF',
    price: 4.2416,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'CBUE.F',
    name: 'iShares $ Treasury Bond 3-7yr UCITS ETF EUR Hedged (Dist)',
    price: 4.3554,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'CBUF.DE',
    name: 'iShares MSCI World Health Care Sector UCITS ETF USD Inc',
    price: 6.045,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CBUF.F',
    name: 'iShares MSCI World Health Care Sector UCITS ETF USD Inc',
    price: 6.422,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CBUG.DE',
    name: 'iShares MSCI World Small Cap ESG Enhanced UCITS ETF',
    price: 4.951,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CBUH.DE',
    name: 'iShares MSCI World Momentum Factor ESG UCITS ETF',
    price: 5.396,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CBUI.DE',
    name: 'iShares MSCI World Value Factor ESG UCITS ETF',
    price: 6.067,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CBUJ.DE',
    name: 'iShares € Corp Bond ESG Paris-Aligned Climate UCITS ETF',
    price: 4.9846,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'CBUJ.F',
    name: 'iShares EUR Corp Bond ESG Paris-Aligned Climate UCITS ETF',
    price: 4.8207,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'CBUL.DE',
    name: 'iShares $ TIPS 0-5 UCITS ETF',
    price: 4.553,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CBUL.F',
    name: 'iShares $ TIPS 0-5 UCITS ETF',
    price: 4.7625,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CBUM.DE',
    name: 'Shares S&P 500 ESG UCITS ETF',
    price: 7.499,
    issuer: 'Shares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'CBUP.DE',
    name: 'iShares € Green Bond UCITS ETF',
    price: 244,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'CBUS.DE',
    name: 'iShares Core UK Gilts UCITS ETF GBP (Dist)',
    price: 4.5341,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CBUX.DE',
    name: 'iShares Global Infrastructure UCITS ETF Accum USD',
    price: 5.26,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CBUY.DE',
    name: 'iShares MSCI ACWI SRI UCITS ETF',
    price: 6.117,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CCNV.DE',
    name: 'UC AXI Global Coco Bonds UCITS ETF',
    price: 107818,
    issuer: 'UC',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'CD91.DE',
    name: 'Amundi Index Solutions - Amundi NYSE Arca Gold BUGS UCITS ETF USD Distributing',
    price: 44.745,
    issuer: 'Amundi',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'CE8G.DE',
    name: 'Amundi Index Solutions - Amundi MSCI World Ex Europe',
    price: 638.3,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CEBB.DE',
    name: 'iShares VII PLC - iShares MSCI Russia ADR/GDR UCITS ETF USD (Acc)',
    price: 28.4,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CEBD.DE',
    name: 'iShares V PLC - iShares iBonds Dec 2027 Term € Corp UCITS ETF EUR Inc',
    price: 5.2018,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'CEBG.DE',
    name: 'iShares VII PLC - iShares MSCI Mexico Capped UCITS ETF',
    price: 150.24,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CEBL.DE',
    name: 'iShares VII PLC - iShares MSCI EM Asia UCITS ETF USD (Acc)',
    price: 184.04,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'CEBP.DE',
    name: 'iShares VII PLC - iShares MSCI EMU USD Hedged UCITS ETF (Acc)',
    price: 10.3,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CEBU.DE',
    name: 'iShares USD Short Duration Corp Bond UCITS ETF Accum-Hedged- EUR',
    price: 5.4768,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'CEMG.DE',
    name: 'iShares V PLC - iShares MSCI EM Consumer Growth UCITS ETF USD (Acc)',
    price: 32.605,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'CEMQ.DE',
    name: 'iShares Edge MSCI Europe Quality Factor UCITS ETF',
    price: 10.402,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'CEMR.DE',
    name: 'iShares Edge MSCI Europe Momentum Factor UCITS ETF',
    price: 13.34,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'CEMS.DE',
    name: 'iShares Edge MSCI Europe Value Factor UCITS ETF',
    price: 10.566,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'CEMT.DE',
    name: 'iShares Edge MSCI Europe Size Factor UCITS ETF',
    price: 9.718,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'CEUG.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Europe ESG Broad CTB',
    price: 364.8,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'CG1G.DE',
    name: 'Amundi ETF DAX UCITS ETF DR',
    price: 420.1,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'CGB.DE',
    name: 'Xtrackers II Harvest China Government Bond UCITS ETF',
    price: 18.4325,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'China'
  },
  {
    symbol: 'CMTX.F',
    name: 'Lyxor Core Euro Government Bond',
    price: 136.365,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Government Bonds'
  },
  {
    symbol: 'CN1G.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Nordic',
    price: 609.1,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'CNAA.DE',
    name: 'Lyxor MSCI China A (DR) UCITS ETF',
    price: 152.58,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'CNUA.DE',
    name: 'UBS (Irl) Fund Solutions plc - MSCI China A SF UCITS ETF',
    price: 130.32,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'COVR.DE',
    name: 'PIMCO ETFs plc PIMCO Covered Bond UCITS ETF',
    price: 105.9,
    issuer: 'PIMCO',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'CSTA.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Technology UCITS ETF',
    price: 113.9,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'CSTD.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Construction & Materials UCITS ETF',
    price: 135.3,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'CSY1.DE',
    name: 'UBS - CSIF (IE) MSCI USA Blue UCITS - ETF B USD',
    price: 218.97,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'CSY2.DE',
    name: 'UBS - CSIF (IE) MSCI USA ESG Leaders Blue UCITS - ETF B USD',
    price: 217.25,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'CSY5.DE',
    name: 'UBS - MSCI World ESG Leaders UCITS USD A- Acc',
    price: 201.65,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CSY5.F',
    name: 'MSCI World ESG Leaders UCITS USD A- Acc',
    price: 150,
    issuer: 'MSCI',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CSY7.DE',
    name: 'UBS - CSIF (IE) MSCI World ESG Leaders Blue UCITS - ETF',
    price: 219.65,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CSY7.F',
    name: 'Credit Suisse Index Fund Ie ETF ICAV - CSIF Ie Msci World Esg Leaders Blue Ucits ETF',
    price: 158.22,
    issuer: 'Credit',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CSY8.F',
    name: 'Credit Suisse Index Fund (IE) ETF ICAV - CSIF (IE) MSCI USA Small Cap ESG Leaders Blue UCITS ETF',
    price: 138.72,
    issuer: 'Credit',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'CSY9.F',
    name: 'Credit Suisse Index Fund (IE) ETF ICAV - CSIF (IE) MSCI World ESG Leaders Minimum Vol Bl UCITS ETF',
    price: 104.62,
    issuer: 'Credit',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'CSYU.F',
    name: 'Credit Suisse Index Fund (IE) ETF ICAV - CSIF (IE) MSCI USA Tech 125 ESG Universal Blue UCITS ETF',
    price: 9.598,
    issuer: 'Credit',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'CSYZ.DE',
    name: 'UBS - CSIF (IE) FTSE EPRA Nareit Developed Green Blue UCITS - ETF',
    price: 99.45,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CUIK.F',
    name: 'Amundi Index Solutions - Uk Imi SRI Ucits ETF',
    price: 13.202,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'CZX.DE',
    name: 'Expat Czech PX UCITS ETF',
    price: 1.9392,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'D100.F',
    name: 'Multi Units Luxembourg - Lyxor FTSE 100 UCITS Fund',
    price: 133.78,
    issuer: 'Lyxor',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'D3V3.DE',
    name: 'Xtrackers EUR Credit 12.5 Swap UCITS ETF',
    price: 236.97,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'D500.DE',
    name: 'Invesco S&P 500 UCITS ETF',
    price: 51.362,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'D5BB.DE',
    name: 'Xtrackers II Germany Government Bond UCITS ETF 1D',
    price: 167.045,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Germany'
  },
  {
    symbol: 'D5BC.DE',
    name: 'Xtrackers II Germany Government Bond 1-3 UCITS ETF',
    price: 138.755,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Germany'
  },
  {
    symbol: 'D5BE.DE',
    name: 'Xtrackers II US Treasuries 1-3 UCITS ETF',
    price: 143.43,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'D5BG.DE',
    name: 'Xtrackers II EUR Corporate Bond UCITS ETF',
    price: 160.865,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'D5BH.DE',
    name: 'Xtrackers MSCI Canada ESG Screened UCITS ETF',
    price: 90.32,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'D5BI.DE',
    name: 'Xtrackers MSCI Mexico UCITS ETF',
    price: 6.176,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'D5BK.DE',
    name: 'Xtrackers FTSE Developed Europe Real Estate UCITS ETF',
    price: 22.95,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'D5BL.DE',
    name: 'Xtrackers MSCI Europe Value UCITS ETF',
    price: 39.275,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'D5BM.DE',
    name: 'Xtrackers S&P 500 Swap UCITS ETF',
    price: 110.68,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'D6RA.DE',
    name: 'Deka MSCI EUR Corporates Climate Change ESG UCITS ETF',
    price: 88.93,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'D6RP.F',
    name: 'Deka MSCI World Climate Change ESG UCITS ETF',
    price: 26.01,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'DBPD.DE',
    name: 'Xtrackers ShortDAX x2 Daily Swap UCITS ETF',
    price: 0.555,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'DBPE.DE',
    name: 'Xtrackers LevDAX Daily Swap UCITS ETF',
    price: 266.9,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'DBPG.DE',
    name: 'Xtrackers S&P 500 2x Leveraged Daily Swap UCITS ETF',
    price: 228,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'DBPK.DE',
    name: 'Xtrackers S&P 500 2x Inverse Daily Swap UCITS ETF',
    price: 0.1797,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'DBX0.DE',
    name: 'Xtrackers Portfolio UCITS ETF',
    price: 310,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBX1.DE',
    name: 'Xtrackers - MSCI Emerging Markets Swap UCITS ETF',
    price: 50.988,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'DBX2.DE',
    name: 'Xtrackers MSCI EM Asia Swap UCITS ETF 1C',
    price: 59.91,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'DBX2.F',
    name: 'Xtrackers MSCI EM Asia Swap UCITS ETF 1C',
    price: 46.955,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'DBX3.DE',
    name: 'Xtrackers MSCI EM Latin America ESG Swap UCITS ETF',
    price: 39.225,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'DBX4.DE',
    name: 'Xtrackers MSCI EM Europe, Middle East & Africa ESG Swap UCITS ETF',
    price: 34.635,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DBX5.DE',
    name: 'Xtrackers MSCI Taiwan UCITS ETF',
    price: 66.86,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBX6.DE',
    name: 'Xtrackers MSCI Brazil UCITS ETF',
    price: 39.69,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBX7.DE',
    name: 'Xtrackers Nifty 50 Swap UCITS ETF',
    price: 230.9,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBX8.DE',
    name: 'Xtrackers MSCI Korea UCITS ETF',
    price: 76.56,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBX9.DE',
    name: 'Xtrackers FTSE China 50 UCITS ETF',
    price: 31.535,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'DBXA.DE',
    name: 'Xtrackers MSCI Europe UCITS ETF 1C',
    price: 97.95,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DBXB.DE',
    name: 'Xtrackers II Eurozone Government Bond 7-10 UCITS ETF',
    price: 249.82,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DBXD.DE',
    name: 'Xtrackers DAX UCITS ETF',
    price: 221.65,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'DBXE.DE',
    name: 'Xtrackers Euro Stoxx 50 UCITS ETF',
    price: 57.01,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBXF.DE',
    name: 'Xtrackers II Eurozone Government Bond 15-30 UCITS ETF',
    price: 267.93,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DBXG.DE',
    name: 'Xtrackers II Eurozone Government Bond 25+ UCITS ETF',
    price: 244.82,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DBXH.DE',
    name: 'Xtrackers II Global Inflation-Linked Bond UCITS ETF',
    price: 215.4,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'DBXI.DE',
    name: 'Xtrackers FTSE MIB UCITS ETF',
    price: 40.795,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBXJ.DE',
    name: 'Xtrackers MSCI Japan UCITS ETF 1C',
    price: 80.048,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'DBXK.DE',
    name: 'Xtrackers II Eurozone Inflation-Linked Bond UCITS ETF',
    price: 238.64,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DBXM.DE',
    name: 'Xtrackers II iTraxx Crossover Swap UCITS ETF',
    price: 197.465,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBXN.DE',
    name: 'Xtrackers II Eurozone Government Bond UCITS ETF',
    price: 221.58,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DBXP.DE',
    name: 'Xtrackers II Eurozone Government Bond 1-3 UCITS ETF 1C',
    price: 172.78,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DBXQ.DE',
    name: 'Xtrackers II Eurozone Government Bond 3-5 UCITS ETF 1C',
    price: 205.68,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DBXR.DE',
    name: 'Xtrackers II Eurozone Government Bond 5-7 UCITS ETF',
    price: 230.68,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DBXR.F',
    name: 'Xtrackers II Eurozone Government Bond 5-7 UCITS ETF',
    price: 217.33,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DBXS.DE',
    name: 'Xtrackers Switzerland UCITS ETF',
    price: 133.02,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBXT.DE',
    name: 'Xtrackers II EUR Overnight Rate Swap UCITS ETF',
    price: 147.114,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBXU.DE',
    name: 'Xtrackers MSCI USA Swap UCITS ETF',
    price: 173.335,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'DBXV.DE',
    name: 'Xtrackers MSCI Russia Capped Swap UCITS ETF',
    price: 7.9,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBXW.DE',
    name: 'Xtrackers MSCI World Swap UCITS ETF',
    price: 112.23,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'DBXX.DE',
    name: 'Xtrackers FTSE 100 Income UCITS ETF',
    price: 10.19,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBXY.DE',
    name: 'Xtrackers FTSE 250 UCITS ETF',
    price: 23.685,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBXZ.DE',
    name: 'Xtrackers MSCI UK ESG UCITS ETF',
    price: 5.244,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DBZB.DE',
    name: 'Xtrackers II Global Government Bond UCITS ETF 1C - EUR Hedged',
    price: 208.54,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'DBZN.DE',
    name: 'Xtrackers Bloomberg Commodity Swap UCITS ETF',
    price: 21.59,
    issuer: 'Xtrackers',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'DDOC.DE',
    name: 'Global X Telemedicine & Digital Health UCITS ETF',
    price: 7.801,
    issuer: 'Global',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'DE5A.DE',
    name: 'Amundi Index Solutions - Amundi Govt Bond Highest Rated Euro Investment Grade',
    price: 201.98,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Mixed'
  },
  {
    symbol: 'DEAM.DE',
    name: 'Invesco Markets II plc - Invesco MDAX UCITS ETF',
    price: 49.345,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'DECD.F',
    name: 'Amundi DAX 50 ESG UCITS ETF',
    price: 57.93,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'DECR.DE',
    name: 'Amundi Index Solutions - Amundi Index Euro Corporate SRI',
    price: 47.241,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Corporate Bonds'
  },
  {
    symbol: 'DECR.F',
    name: 'Amundi Index Solutions - Amundi Index Euro Corporate SRI',
    price: 43.624,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Corporate Bonds'
  },
  {
    symbol: 'DEL2.DE',
    name: 'L&G DAX Daily 2x Long UCITS ETF',
    price: 662.2,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'DELF.DE',
    name: 'L&G Europe Equity (Responsible Exclusions) UCITS ETF',
    price: 16.888,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DELG.DE',
    name: 'L&G US Equity (Responsible Exclusions) UCITS ETF',
    price: 19.936,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DES2.DE',
    name: 'L&G DAX Daily 2x Short UCITS ETF',
    price: 0.641,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'DFEN.DE',
    name: 'VanEck Defense ETF',
    price: 50.19,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'DFOA.DE',
    name: 'Lyxor Index Fund - Lyxor Stoxx Europe 600 Automobiles & Parts UCITS ETF',
    price: 106.64,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DFOB.DE',
    name: 'Amundi Euro Government Bond 25+Y - UCITS ETF Dist',
    price: 127.445,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DFOP.DE',
    name: 'Amundi STOXX Europe 600 Consumer Staples UCITS ETF Dist',
    price: 128.3,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DJAD.DE',
    name: 'Amundi US Treasury Bond Long Dated UCITS ETF Dist',
    price: 87.008,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DJAM.DE',
    name: 'Lyxor Dow Jones Industrial Average UCITS ETF',
    price: 393.95,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DNRA.DE',
    name: 'Amundi Index Solutions - Amundi Index MSCI North America UCITS ETF DR EUR',
    price: 88.9,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DRGE.F',
    name: 'L&G ESG China CNY Bond UCITS ETF',
    price: 9.9268,
    issuer: 'L&G',
    assetClass: 'Fixed Income',
    category: 'China'
  },
  {
    symbol: 'DRUP.DE',
    name: 'Amundi MSCI Disruptive Technology UCITS ETF Acc',
    price: 14.87,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DX22.DE',
    name: 'Xtrackers II EUR Overnight Rate Swap UCITS ETF',
    price: 127.406,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DX2D.DE',
    name: 'Xtrackers LPX Private Equity Swap UCITS ETF',
    price: 132.2,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DX2E.DE',
    name: 'Xtrackers S&P Global Infrastructure Swap UCITS ETF',
    price: 60.93,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'DX2G.DE',
    name: 'Xtrackers CAC 40 UCITS ETF',
    price: 78.33,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DX2I.DE',
    name: 'Xtrackers MSCI Europe ESG Screened UCITS ETF',
    price: 173.66,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DX2J.DE',
    name: 'Xtrackers MSCI Europe Small Cap UCITS ETF',
    price: 61.67,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DX2K.DE',
    name: 'Xtrackers FTSE 100 Short Daily Swap UCITS ETF',
    price: 3.364,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DX2S.DE',
    name: 'Xtrackers S&P ASX 200 UCITS ETF',
    price: 40.325,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'DX2X.DE',
    name: 'Xtrackers Stoxx Europe 600 UCITS ETF 1C',
    price: 137.1,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DX2Z.DE',
    name: 'Xtrackers S&P Select Frontier Swap UCITS ETF',
    price: 21.69,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'DXET.DE',
    name: 'Xtrackers Euro Stoxx 50 UCITS ETF',
    price: 62.96,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DXS0.DE',
    name: 'Xtrackers SLI UCITS ETF',
    price: 222.7,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DXS1.DE',
    name: 'Xtrackers II GBP Overnight Rate Swap UCITS ETF',
    price: 207.4,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DXS3.DE',
    name: 'Xtrackers S&P 500 Inverse Daily Swap UCITS ETF',
    price: 5.379,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'DXS5.DE',
    name: 'Xtrackers MSCI AC Asia ex Japan ESG Swap UCITS ETF',
    price: 47.275,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'DXS6.DE',
    name: 'Xtrackers MSCI Pacific ex Japan ESG Screened UCITS ETF',
    price: 74.69,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'DXS7.DE',
    name: 'Xtrackers FTSE Vietnam Swap UCITS ETF',
    price: 23.04,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DXSA.DE',
    name: 'Xtrackers Euro Stoxx Quality Dividend UCITS ETF',
    price: 25.415,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DXSB.DE',
    name: 'Xtrackers Stoxx Global Select Dividend 100 Swap UCITS ETF',
    price: 29.91,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'DXSC.DE',
    name: 'XtrackersMSCI Europe Materials ESG Screened UCITS ETF',
    price: 160.86,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DXSD.DE',
    name: 'Xtrackers MSCI Europe Energy ESG Screened UCITS ETF',
    price: 112.1,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DXSE.DE',
    name: 'Xtrackers MSCI Europe Health Care ESG Screened UCITS ETF',
    price: 209.1,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DXSF.DE',
    name: 'Xtrackers MSCI Europe Financials ESG Screened UCITS ETF',
    price: 36.795,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DXSG.DE',
    name: 'Xtrackers MSCI Europe Communication Services ESG Screened UCITS ETF',
    price: 93.41,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DXSH.DE',
    name: 'Xtrackers MSCI Europe Information Technology ESG Screened UCITS ETF',
    price: 97.25,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DXSI.DE',
    name: 'Xtrackers MSCI Europe Utilities ESG Screened UCITS ETF',
    price: 139.04,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DXSK.DE',
    name: 'Xtrackers MSCI Europe Consumer Staples ESG Screened UCITS ETF',
    price: 140.08,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DXSL.DE',
    name: 'Xtrackers MSCI Europe Industrial ESG Screened UCITS ETF',
    price: 183.3,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DXSM.DE',
    name: 'Xtrackers Bloomberg Commodity ex-Agriculture & Livestock Swap UCITS ETF 1C EUR Hedged',
    price: 26.17,
    issuer: 'Xtrackers',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'DXSM.F',
    name: 'Xtrackers Bloomberg Commodity ex-Agriculture & Livestock Swap UCITS ETF 1C EUR Hedged',
    price: 26.25,
    issuer: 'Xtrackers',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'DXSN.DE',
    name: 'Xtrackers ShortDAX Daily Swap UCITS ETF',
    price: 9.648,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'DXSP.DE',
    name: 'Xtrackers Euro Stoxx 50 Short Daily Swap UCITS ETF',
    price: 6.21,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DXSQ.DE',
    name: 'Xtrackers II iTraxx Europe Swap UCITS ETF',
    price: 119.705,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'DXST.DE',
    name: 'Xtrackers II iTraxx Crossover Short Daily Swap UCITS ETF',
    price: 30.664,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'DXSU.DE',
    name: 'Xtrackers II USD Emerging Markets Bond UCITS ETF 1C - EUR Hedged',
    price: 293.74,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'DXSV.DE',
    name: 'Xtrackers II Eurozone Government Bond Short Daily Swap UCITS ETF',
    price: 86.348,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'DXSW.DE',
    name: 'Xtrackers II iBoxx Germany Covered Bond Swap UCITS ETF',
    price: 187.65,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Germany'
  },
  {
    symbol: 'DXSZ.DE',
    name: 'Xtrackers II USD Overnight Rate Swap UCITS ETF',
    price: 194.17,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'E127.DE',
    name: 'Lyxor MSCI Emerging Markets (LUX) UCITS ETF',
    price: 40.241,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'E15G.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 15+Y (DR) UCITS ETF',
    price: 144.6,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'E15H.DE',
    name: 'Lyxor Core Euro Government Inflation-Linked Bond (DR) UCITS ETF',
    price: 140.7,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'E500.DE',
    name: 'Invesco S&P 500 UCITS ETF (EUR Hdg)',
    price: 49.531,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'E500.F',
    name: 'Invesco S&P 500 UCITS ETF (EUR Hdg)',
    price: 34.5,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'E6BR.F',
    name: 'Lyxor Index Fund - Lyxor Stoxx Europe 600 Basic Resources UCITS ETF',
    price: 111.34,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'E903.DE',
    name: 'Lyxor 1 DivDAX (DR) UCITS ETF',
    price: 196.54,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'E903.F',
    name: 'Lyxor 1 DivDAX (DR) UCITS ETF',
    price: 189.4,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'E905.DE',
    name: 'Lyxor 1 SDAX (DR) UCITS ETF',
    price: 51.86,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'E907.DE',
    name: 'Amundi MDAX ESG II UCITS ETF -I-',
    price: 141.84,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'E907.F',
    name: 'Lyxor 1 MDAX (DR) UCITS ETF',
    price: 143.3,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'E908.DE',
    name: 'Lyxor 1 TecDAX (DR) UCITS ETF',
    price: 26.375,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'E909.DE',
    name: 'Lyxor 1 DAX 50 ESG (DR) UCITS ETF',
    price: 46.88,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'E909.F',
    name: 'Lyxor 1 DAX 50 ESG (DR) UCITS ETF',
    price: 46.64,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'E950.DE',
    name: 'Lyxor 1 EURO STOXX 50 (DR) UCITS ETF',
    price: 35.39,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'E950.F',
    name: 'Lyxor 1 EURO STOXX 50 (DR) UCITS ETF',
    price: 34.995,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'E960.DE',
    name: 'Lyxor 1 STOXX Europe 600 ESG (DR) UCITS ETF',
    price: 54.18,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EB3M.DE',
    name: 'iShares J.P. Morgan € EM Bond UCITS ETF',
    price: 4.2537,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EB3M.F',
    name: 'iShares J.P. Morgan € EM Bond UCITS ETF',
    price: 3.9397,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EBUY.DE',
    name: 'Amundi MSCI Digital Economy -UCITS ETF Acc- Capitalisation',
    price: 16.61,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ECBC.DE',
    name: 'SI UCITS ETF - UC Refinitiv European Convertible Bond UCITS ETF',
    price: 88.49,
    issuer: 'SI',
    assetClass: 'Fixed Income',
    category: 'Europe'
  },
  {
    symbol: 'ECBD.DE',
    name: 'SI UCITS ETF - UC Refinitiv European Convertible Bond UCITS ETF',
    price: 83.048,
    issuer: 'SI',
    assetClass: 'Fixed Income',
    category: 'Europe'
  },
  {
    symbol: 'ECBI.DE',
    name: 'SI UCITS ETF - UC MSCI European Green Bond EUR UCITS ETF Acc EUR',
    price: 84.986,
    issuer: 'SI',
    assetClass: 'Fixed Income',
    category: 'Europe'
  },
  {
    symbol: 'ECBI.F',
    name: 'SI UCITS ETF - UC MSCI European Green Bond EUR UCITS ETF Acc EUR',
    price: 84.7,
    issuer: 'SI',
    assetClass: 'Fixed Income',
    category: 'Europe'
  },
  {
    symbol: 'ECDC.DE',
    name: 'Expat Croatia Crobex UCITS ETF',
    price: 1.2358,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ECR1.F',
    name: 'Amundi Index Solutions Amundi Euro Corp 0-1Y ESG',
    price: 50.156,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'ESG'
  },
  {
    symbol: 'ECR3.DE',
    name: 'Amundi Index Solutions - Amundi Index Euro Corporate Sri 0-3 Y',
    price: 53.556,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Corporate Bonds'
  },
  {
    symbol: 'EDEU.DE',
    name: 'BNP Paribas Easy ESG Equity Dividend Europe',
    price: 155.42,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EDM2.DE',
    name: 'iShares MSCI EM ESG Enhanced UCITS ETF USD Acc',
    price: 6.009,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EDM4.DE',
    name: 'iShares MSCI EMU ESG Enhanced UCITS ETF',
    price: 8.625,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EDM6.DE',
    name: 'iShares MSCI Europe ESG Enhanced UCITS ETF',
    price: 8.048,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EDMJ.DE',
    name: 'iShares MSCI Japan ESG Enhanced UCITS ETF',
    price: 6.756,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'EDMU.DE',
    name: 'iShares MSCI USA ESG Enhanced UCITS ETF',
    price: 9.97,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'EDMW.DE',
    name: 'iShares MSCI World ESG Enhanced UCITS ETF',
    price: 8.876,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'EEAA.DE',
    name: 'BNP Paribas Easy FTSE EPRA/NAREIT Eurozone Capped',
    price: 8.992,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EEP.DE',
    name: 'BNP Paribas Easy FTSE EPRA/NAREIT Developed Europe',
    price: 7.282,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EEPG.DE',
    name: 'BNP Paribas Easy FTSE EPRA Nareit Developed Europe ex UK Green CTB',
    price: 6.504,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EESM.DE',
    name: 'BNP Paribas Easy MSCI Europe Small Caps SRI S-Series PAB 5% Capped',
    price: 293.6,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EEUX.DE',
    name: 'BNPP E MSCI Europe ESG Filtered Min TE',
    price: 17.046,
    issuer: 'BNPP',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EEXU.DE',
    name: 'BNP Paribas Easy - MSCI Europe ex UK ex Controversial Weapons',
    price: 203.95,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EFQ2.DE',
    name: 'Deka Deutsche Börse EUROGOV France UCITS ETF',
    price: 80.616,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EFQ8.DE',
    name: 'Deka iBoxx EUR Liquid Non-Financials Diversified UCITS ETF',
    price: 98.07,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EFRN.DE',
    name: 'iShares € Floating Rate Bond ESG UCITS ETF',
    price: 5.0694,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EGV1.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Insurance UCITS ETF',
    price: 98.2,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EGV2.DE',
    name: 'Multi Units Luxembourg - Amundi Smart Overnight Return UCITS ETF Dist',
    price: 102.364,
    issuer: 'Amundi',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'EGV3.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 1-3Y (DR) UCITS ETF',
    price: 123.02,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EGV3.F',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 1-3Y (DR) UCITS ETF',
    price: 117.125,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EGV5.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 3-5Y (DR) UCITS ETF',
    price: 133.12,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EGV5.F',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 3-5Y (DR) UCITS ETF',
    price: 125.975,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EGV7.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 5-7Y (DR) UCITS ETF',
    price: 151.14,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EGV7.F',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 5-7Y (DR) UCITS ETF',
    price: 143.255,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EH1Y.DE',
    name: 'iShares Broad € High Yield Corp Bond UCITS ETF',
    price: 4.9338,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EH1Y.F',
    name: 'iShares Broad € High Yield Corp Bond UCITS ETF',
    price: 4.7167,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EHBA.DE',
    name: 'Invesco Euro Corporate Hybrid Bond UCITS ETF',
    price: 44.709,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EHDL.DE',
    name: 'Invesco FTSE Emerging Markets High Dividend Low Volatility UCITS ETF',
    price: 22.27,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EHDV.DE',
    name: 'Invesco EURO STOXX High Dividend Low Volatility UCITS ETF',
    price: 30.13,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EHF1.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Europe High Dividend Factor',
    price: 205,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EHLT.DE',
    name: 'Lyxor Index Fund - Lyxor Stoxx Europe 600 Healthcare UCITS ETF',
    price: 179.8,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EIB3.DE',
    name: 'Invesco Euro Government Bond 1-3 Year UCITS ETF',
    price: 38.04,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EIB3.F',
    name: 'Invesco Euro Government Bond 1-3 Year UCITS ETF',
    price: 37.231,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EIB5.DE',
    name: 'Invesco Euro Government Bond 3-5 Year UCITS ETF',
    price: 36.735,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EIB5.F',
    name: 'Invesco Euro Government Bond 3-5 Year UCITS ETF',
    price: 35.599,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EIB7.DE',
    name: 'Invesco Euro Government Bond 5-7 Year UCITS ETF',
    price: 34.984,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EIB7.F',
    name: 'Invesco Euro Government Bond 5-7 Year UCITS ETF',
    price: 33.948,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EIBB.DE',
    name: 'Invesco Euro Government Bond UCITS ETF',
    price: 32.446,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EIBB.F',
    name: 'Invesco Euro Government Bond UCITS ETF',
    price: 32.403,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EIBX.DE',
    name: 'Invesco Euro Government Bond 7-10 Year UCITS ETF',
    price: 32.314,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EIBX.F',
    name: 'Invesco Euro Government Bond 7-10 Year UCITS ETF',
    price: 31.887,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EJAH.DE',
    name: 'BNPP E MSCI Japan ESG Filtered Min TE',
    price: 21.345,
    issuer: 'BNPP',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'EJAP.DE',
    name: 'BNP Paribas Easy MSCI Japan ex CW UCITS ETF Cap',
    price: 15.932,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'EKLD.DE',
    name: 'BNP Paribas Easy MSCI USA SRI S-Series 5% Capped UCITS ETF Capitalisation',
    price: 22.395,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'EKUS.DE',
    name: 'BNP Paribas Easy MSCI USA SRI S-Series 5% Capped UCITS ETF EUR Distribution',
    price: 19.958,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'EL40.DE',
    name: 'Deka MSCI Emerging Markets UCITS ETF',
    price: 50.558,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EL41.DE',
    name: 'Deka MSCI USA MC UCITS ETF',
    price: 28.705,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'EL42.DE',
    name: 'Deka MSCI Europe UCITS ETF',
    price: 18.564,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EL43.DE',
    name: 'Deka MSCI Europe MC UCITS ETF',
    price: 14.486,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EL44.DE',
    name: 'Deka MSCI Japan UCITS ETF',
    price: 10.6705,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'EL45.DE',
    name: 'Deka MSCI Japan Climate Change ESG UCITS ETF',
    price: 9.648,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'EL46.DE',
    name: 'Deka MSCI China ex A Shares UCITS ETF',
    price: 9.177,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'EL48.DE',
    name: 'Deka iBoxx € Liquid Germany Covered Diversified UCITS ETF',
    price: 100.57,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EL49.DE',
    name: 'Deka iBoxx € Liquid Corporates Diversified UCITS ETF',
    price: 100.945,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EL4A.DE',
    name: 'Deka DAX UCITS ETF',
    price: 207.8,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EL4B.DE',
    name: 'Deka EURO STOXX 50 UCITS ETF',
    price: 54.02,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EL4C.DE',
    name: 'Deka STOXX Europe Strong Growth 20 UCITS ETF',
    price: 41.89,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EL4D.DE',
    name: 'Deka STOXX Europe Strong Value 20 UCITS ETF',
    price: 32.66,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EL4E.DE',
    name: 'Deka STOXX Europe Strong Style Composite 40 UCITS ETF',
    price: 40.24,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EL4F.DE',
    name: 'Deka DAX (ausschüttend) UCITS ETF',
    price: 89.28,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EL4G.DE',
    name: 'Deka EURO STOXX Select Dividend 30 UCITS ETF',
    price: 20.91,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EL4H.DE',
    name: 'Deka MSCI Europe LC UCITS ETF',
    price: 116.54,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EL4I.DE',
    name: 'Deka MSCI USA LC UCITS ETF',
    price: 376.5,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'EL4J.DE',
    name: 'Deka MSCI Japan LC UCITS ETF',
    price: 84.47,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'EL4K.DE',
    name: 'Deka iBoxx EUR Liquid Sovereign Diversified 1-10 UCITS ETF',
    price: 101.985,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EL4L.DE',
    name: 'Deka iBoxx EUR Liquid Sovereign Diversified 1-3 UCITS ETF',
    price: 93.91,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EL4M.DE',
    name: 'Deka iBoxx EUR Liquid Sovereign Diversified 3-5 UCITS ETF',
    price: 95.058,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EL4N.DE',
    name: 'Deka iBoxx EUR Liquid Sovereign Diversified 5-7 UCITS ETF',
    price: 103.8,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EL4P.DE',
    name: 'Deka iBoxx EUR Liquid Sovereign Diversified 7-10 UCITS ETF',
    price: 109.85,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EL4Q.DE',
    name: 'Deka iBoxx EUR Liquid Sovereign Diversified 10+ UCITS ETF',
    price: 92.766,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EL4R.DE',
    name: 'Deka Deutsche Börse EUROGOV Germany UCITS ETF',
    price: 90.07,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EL4S.DE',
    name: 'Deka Deutsche Börse EUROGOV Germany 1-3 UCITS ETF',
    price: 76.674,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EL4T.DE',
    name: 'Deka Deutsche Börse EUROGOV Germany 3-5 UCITS ETF',
    price: 89.51,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EL4U.DE',
    name: 'Deka Deutsche Börse EUROGOV Germany 5-10 UCITS ETF',
    price: 105.14,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EL4V.DE',
    name: 'Deka Deutsche Börse EUROGOV Germany 10+ UCITS ETF',
    price: 100.05,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EL4W.DE',
    name: 'Deka Deutsche Börse EUROGOV Germany Money Market UCITS ETF',
    price: 69.3155,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EL4X.DE',
    name: 'Deka DAXplus Maximum Dividend UCITS ETF',
    price: 54.38,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EL4Y.DE',
    name: 'Deka STOXX Europe 50 UCITS ETF',
    price: 45.825,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EL4Z.DE',
    name: 'Deka MSCI USA UCITS ETF',
    price: 52.438,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ELCR.DE',
    name: 'Amundi MSCI Smart Mobility UCITS ETF Capitalisation',
    price: 19.616,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ELEC.F',
    name: 'Electric Vehicle Charging Infrastructure UCITS ETF',
    price: 3.206,
    issuer: 'Electric',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ELF0.DE',
    name: 'Deka DAX ex Financials 30 UCITS ETF',
    price: 33.67,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'ELF1.DE',
    name: 'Deka MDAX UCITS ETF',
    price: 278.2,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'ELF5.DE',
    name: 'Deka MSCI Europe ex EMU UCITS ETF',
    price: 166.54,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ELFA.DE',
    name: 'Deka EURO STOXX 50 ESG UCITS ETF',
    price: 121.24,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ELFB.DE',
    name: 'Deka Oekom Euro Nachhaltigkeit UCITS ETF',
    price: 26.32,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ELFC.DE',
    name: 'Deka EURO iSTOXX ex Fin Dividend+ UCITS ETF',
    price: 24.75,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ELFD.DE',
    name: 'Deka Eurozone Rendite Plus 1-10 UCITS ETF',
    price: 83.838,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ELFE.DE',
    name: 'Deka US Treasury 7-10 UCITS ETF',
    price: 783.88,
    issuer: 'Deka',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'ELFF.DE',
    name: 'Deka Euro Corporates 0-3 Liquid UCITS ETF',
    price: 956.2,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ELFG.DE',
    name: 'Deka Germany 30 UCITS ETF',
    price: 1607.2,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'ELFG.F',
    name: 'Deka Germany 30 UCITS ETF',
    price: 1537.4,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'ELFW.DE',
    name: 'Deka MSCI World UCITS ETF',
    price: 36.498,
    issuer: 'Deka',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'EM1C.DE',
    name: 'VanEck J.P. Morgan EM Local Currency Bond UCITS ETF',
    price: 56.124,
    issuer: 'VanEck',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EMEC.DE',
    name: 'BNP Paribas Easy ECPI Circular Economy Leaders',
    price: 19.114,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'EMEH.DE',
    name: 'BNP Paribas Easy Energy & Metals Enhanced Roll',
    price: 12.088,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Energy'
  },
  {
    symbol: 'EMEH.F',
    name: 'BNP Paribas Easy Energy & Metals Enhanced Roll',
    price: 10.34,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Energy'
  },
  {
    symbol: 'EMIE.DE',
    name: 'UBS (Lux) Fund Solutions – J.P. Morgan USD EM IG ESG Diversified Bond UCITS ETF',
    price: 11.136,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EMIE.F',
    name: 'UBS (Lux) Fund Solutions – J.P. Morgan USD EM IG ESG Diversified Bond UCITS ETF',
    price: 10.403,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EMIG.DE',
    name: 'UBS(Lux)Fund Solutions – J.P. Morgan USD EM IG ESG Diversified Bond UCITS ETF(USD)A-acc',
    price: 11.8305,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EMKX.DE',
    name: 'BNP Paribas Easy MSCI Emerging ESG Filtered Min TE',
    price: 12.34,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EMND.DE',
    name: 'iShares MSCI World ESG Enhanced UCITS ETF',
    price: 8.38,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'EMNE.DE',
    name: 'iShares MSCI EMU ESG Enhanced UCITS ETF',
    price: 7.637,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EMNJ.DE',
    name: 'iShares MSCI Japan ESG Enhanced UCITS ETF',
    price: 6.102,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'EMNU.DE',
    name: 'iShares MSCI Europe ESG Enhanced UCITS ETF',
    price: 7,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EMQQ.DE',
    name: 'EMQQ Emerging Markets Internet & Ecommerce UCITS ETF',
    price: 10.634,
    issuer: 'EMQQ',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EMSM.DE',
    name: 'Invesco MSCI Emerging Markets UCITS ETF',
    price: 53.278,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EMSV.DE',
    name: 'Invesco MSCI Europe Value UCITS ETF',
    price: 262.15,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EMSV.F',
    name: 'Invesco MSCI Europe Value UCITS ETF',
    price: 261.5,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EMUS.DE',
    name: 'BNP Paribas Easy MSCI EMU SRI S-Series PAB 5% Capped',
    price: 15.76,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'EMUX.DE',
    name: 'BNP Paribas Easy MSCI EMU ex CW',
    price: 16.88,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'EMWE.DE',
    name: 'BNP Paribas Easy MSCI World SRI S-Series PAB 5% Capped',
    price: 20.615,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'EMXC.DE',
    name: 'Lyxor MSCI Emerging Markets Ex China UCITS ETF',
    price: 25.75,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EN4C.F',
    name: 'L&G Multi-Strategy Enhanced Commodities UCITS ETF',
    price: 11.958,
    issuer: 'L&G',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'ENDH.F',
    name: 'L&G ESG Emerging Markets Government Bond (USD) 0-5 Year UCITS ETF',
    price: 9.91,
    issuer: 'L&G',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'ENOA.DE',
    name: 'BNP Paribas Easy MSCI North America ESG Filtered Min TE',
    price: 25.255,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'ESG'
  },
  {
    symbol: 'EQEU.DE',
    name: 'Invesco EQQQ NASDAQ-100 UCITS ETF (EUR Hdg)',
    price: 410.65,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'EQQQ.DE',
    name: 'Invesco EQQQ NASDAQ-100 UCITS ETF',
    price: 491.05,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'EQQX.F',
    name: 'Invesco NASDAQ-100 Swap UCITS ETF',
    price: 42.49,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ERNX.DE',
    name: 'iShares € Ultrashort Bond UCITS ETF',
    price: 5.4874,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'ES5R.DE',
    name: 'Europe SectorTrend UCITS ETF',
    price: 97.25,
    issuer: 'Europe',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESAP.DE',
    name: 'BNP Paribas Easy S&P 500 UCITS ETF USD C',
    price: 25.906,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ESEA.DE',
    name: 'BNP Paribas Easy S&P 500 UCITS ETF',
    price: 23.467,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ESEE.DE',
    name: 'BNP Paribas Easy S&P 500 UCITS ETF',
    price: 27.828,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ESEH.DE',
    name: 'BNP Paribas Easy S&P 500 UCITS ETF',
    price: 20.9,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ESGE.DE',
    name: 'Invesco MSCI Europe ESG Universal Screened UCITS ETF',
    price: 67.42,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESGU.DE',
    name: 'Invesco MSCI USA ESG Universal Screened UCITS ETF',
    price: 82.91,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ESGW.DE',
    name: 'Invesco MSCI World ESG Universal Screened UCITS ETF',
    price: 75.47,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'ESGX.DE',
    name: 'Invesco Markets II plc - Invesco MSCI Europe Ex UK ESG Universal Screened UCITS ETF',
    price: 61.68,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESIC.DE',
    name: 'iShares MSCI Europe Consumer Discretionary Sector UCITS ETF',
    price: 6.151,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESIC.F',
    name: 'iShares MSCI Europe Consumer Discretionary Sector UCITS ETF',
    price: 6.698,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESIE.DE',
    name: 'iShares MSCI Europe Energy Sector UCITS ETF',
    price: 10.97,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESIF.DE',
    name: 'iShares MSCI Europe Financials Sector UCITS ETF',
    price: 12.758,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESIH.DE',
    name: 'iShares MSCI Europe Health Care Sector UCITS ETF',
    price: 6.539,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESIN.DE',
    name: 'iShares MSCI Europe Industrials Sector UCITS ETF',
    price: 8.227,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESIS.DE',
    name: 'iShares MSCI Europe Consumer Staples Sector UCITS ETF',
    price: 5.72,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESIT.DE',
    name: 'iShares MSCI Europe Information Technology Sector UCITS ETF',
    price: 7.14,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ESNB.DE',
    name: 'Expat Serbia Belex15 UCITS ETF',
    price: 0.9155,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ESNB.F',
    name: 'Expat Serbia Belex15 UCITS ETF',
    price: 0.9037,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ESP0.DE',
    name: 'VanEck Video Gaming and eSports UCITS ETF',
    price: 63.33,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ESRI.DE',
    name: 'BNP Paribas Easy MSCI Emerging SRI S-Series 5% Capped UCITS ETF Capitalisation',
    price: 163.24,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'ESTE.F',
    name: 'Multi Units Luxembourg - Lyxor MSCI Eastern Europe Ex Russia UCITS ETF',
    price: 29.69,
    issuer: 'Lyxor',
    assetClass: 'Mixed',
    category: 'Europe'
  },
  {
    symbol: 'ETBB.DE',
    name: 'BNP Paribas Easy Euro Stoxx 50 UCITS ETF EUR C/D',
    price: 13.208,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ETDD.DE',
    name: 'BNP Paribas Easy Euro Stoxx 50 UCITS ETF',
    price: 17.14,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ETL2.DE',
    name: 'L&G Longer Dated All Commodities UCITS ETF',
    price: 21.18,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ETLE.DE',
    name: 'L&G Longer Dated All Commodities ex-Agriculture and Livestock UCITS ETF',
    price: 13.78,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ETLF.DE',
    name: 'L&G All Commodities UCITS ETF',
    price: 12.864,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ETLH.DE',
    name: 'L&G Ecommerce Logistics UCITS ETF',
    price: 15.682,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ETLI.DE',
    name: 'L&G Pharma Breakthrough UCITS ETF',
    price: 10.65,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ETLK.DE',
    name: 'L&G Asia Pacific ex Japan Equity UCITS ETF',
    price: 13.842,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'ETLN.DE',
    name: 'L&G Europe ex UK Equity UCITS ETF',
    price: 18.356,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ETLQ.DE',
    name: 'L&G Global Equity UCITS ETF',
    price: 19.84,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'ETLR.DE',
    name: 'L&G Japan Equity UCITS ETF',
    price: 14.208,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'ETLS.DE',
    name: 'L&G US Equity UCITS ETF',
    price: 22.27,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ETLX.DE',
    name: 'L&G Gold Mining UCITS ETF',
    price: 69.15,
    issuer: 'L&G',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'ETLZ.DE',
    name: 'L&G Russell 2000 US Small Cap UCITS ETF',
    price: 96.4,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ETSA.DE',
    name: 'BNP Paribas Easy Stoxx Europe 600 UCITS ETF EUR C/D',
    price: 15.816,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ETSZ.DE',
    name: 'BNP Paribas Easy Stoxx Europe 600 UCITS ETF',
    price: 17.588,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EUED.DE',
    name: 'iShares € Ultrashort Bond ESG UCITS ETF EUR Inc',
    price: 5.0466,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUHA.DE',
    name: 'PIMCO Euro Short-Term High Yield Corporate Bond UCITS ETF EUR Accumulation',
    price: 12.049,
    issuer: 'PIMCO',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUHA.F',
    name: 'PIMCO Euro Short-Term High Yield Corporate Bond UCITS ETF EUR Accumulation',
    price: 10.328,
    issuer: 'PIMCO',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUHI.DE',
    name: 'PIMCO ETFs plc PIMCO Euro Short-Term High Yield Corporate Bond UCITS ETF',
    price: 9.3702,
    issuer: 'PIMCO',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUHI.F',
    name: 'PIMCO ETFs plc PIMCO Euro Short-Term High Yield Corporate Bond UCITS ETF',
    price: 8.8736,
    issuer: 'PIMCO',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUIN.DE',
    name: 'Lyxor US$ 10Y Inflation Expectations UCITS ETF',
    price: 116.6,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EUN0.DE',
    name: 'iShares Edge MSCI Europe Minimum Volatility UCITS ETF',
    price: 66.11,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EUN1.DE',
    name: 'iShares STOXX Europe 50 UCITS ETF',
    price: 46.26,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EUN2.DE',
    name: 'iShares EURO STOXX 50 UCITS ETF',
    price: 54.17,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EUN3.DE',
    name: 'iShares Global Govt Bond UCITS ETF USD (Dist)',
    price: 77.608,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'EUN4.DE',
    name: 'iShares € Aggregate Bond ESG UCITS ETF EUR (Dist)',
    price: 107.785,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUN5.DE',
    name: 'iShares Core € Corp Bond UCITS ETF EUR (Dist)',
    price: 119.98,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUN6.DE',
    name: 'iShares € Govt Bond 0-1yr UCITS ETF',
    price: 98.76,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUN8.DE',
    name: 'iShares € Govt Bond 10-15yr UCITS ETF EUR (Dist)',
    price: 146.88,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUN9.DE',
    name: 'iShares € Govt Bond 5-7yr UCITS ETF',
    price: 144.38,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUNA.DE',
    name: 'iShares Core Global Aggregate Bond UCITS ETF',
    price: 4.8814,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'EUNH.DE',
    name: 'iShares Core € Govt Bond UCITS ETF EUR (Dist)',
    price: 109.4,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUNI.DE',
    name: 'iShares MSCI EM Small Cap UCITS ETF USD (Dist)',
    price: 84.58,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EUNJ.DE',
    name: 'iShares MSCI Pacific ex-Japan UCITS ETF USD (Dist)',
    price: 43.865,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'EUNK.DE',
    name: 'iShares Core MSCI Europe UCITS ETF EUR (Acc)',
    price: 86.38,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EUNL.DE',
    name: 'iShares Core MSCI World UCITS ETF USD (Acc)',
    price: 104.62,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'EUNM.DE',
    name: 'iShares MSCI EM UCITS ETF USD (Acc)',
    price: 40.357,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EUNN.DE',
    name: 'iShares Core MSCI Japan IMI UCITS ETF USD (Acc)',
    price: 55.408,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'EUNR.DE',
    name: 'iShares € Corp Bond ex-Financials UCITS ETF',
    price: 109.14,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUNS.DE',
    name: 'iShares € Corp Bond ex-Financials 1-5yr ESG UCITS ETF EUR (Dist)',
    price: 106.77,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUNT.DE',
    name: 'iShares € Corp Bond 1-5yr UCITS ETF EUR (Dist)',
    price: 107.615,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUNU.DE',
    name: 'iShares Core Global Aggregate Bond UCITS ETF',
    price: 3.7806,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'EUNW.DE',
    name: 'iShares € High Yield Corp Bond UCITS ETF EUR (Dist)',
    price: 94.372,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUNX.DE',
    name: 'iShares US Aggregate Bond UCITS ETF USD (Dist)',
    price: 80.89,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EUNY.DE',
    name: 'iShares V PLC - iShares EM Dividend UCITS ETF USD (Dist)',
    price: 14.242,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EUNZ.DE',
    name: 'iShares Edge MSCI EM Minimum Volatility UCITS ETF USD (Acc)',
    price: 31.875,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'EUPE.DE',
    name: 'Ossiam Shiller Barclays Cape Europe Sector Value TR',
    price: 517,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EWRD.DE',
    name: 'BNP Paribas Easy MSCI World SRI S-Series PAB 5% Capped',
    price: 19.696,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'EXAG.DE',
    name: 'WisdomTree Enhanced Commodity ex-Agriculture UCITS ETF',
    price: 11.658,
    issuer: 'WisdomTree',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'EXH1.DE',
    name: 'iShares STOXX Europe 600 Oil & Gas UCITS ETF (DE)',
    price: 38.1,
    issuer: 'iShares',
    assetClass: 'Commodity',
    category: 'Europe'
  },
  {
    symbol: 'EXH2.DE',
    name: 'iShares STOXX Europe 600 Financial Services UCITS ETF (DE)',
    price: 85.94,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXH3.DE',
    name: 'iShares STOXX Europe 600 Food & Beverage UCITS ETF (DE)',
    price: 62.42,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXH4.DE',
    name: 'iShares STOXX Europe 600 Industrial Goods & Services UCITS ETF (DE)',
    price: 102.9,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXH5.DE',
    name: 'iShares STOXX Europe 600 Insurance UCITS ETF (DE)',
    price: 47.125,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXH6.DE',
    name: 'iShares STOXX Europe 600 Media UCITS ETF (DE)',
    price: 35.065,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXH7.DE',
    name: 'iShares STOXX Europe 600 Personal & Household Goods UCITS ETF (DE)',
    price: 97.29,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXH8.DE',
    name: 'iShares STOXX Europe 600 Retail UCITS ETF (DE)',
    price: 39.15,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXH9.DE',
    name: 'iShares STOXX Europe 600 Utilities UCITS ETF (DE)',
    price: 43.77,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXHA.DE',
    name: 'iShares eb.rexx Government Germany UCITS ETF (DE)',
    price: 124.445,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXHB.DE',
    name: 'iShares eb.rexx Government Germany 1.5-2.5yr UCITS ETF (DE)',
    price: 80.55,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXHC.DE',
    name: 'iShares eb.rexx Government Germany 2.5-5.5yr UCITS ETF (DE)',
    price: 94.368,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXHD.DE',
    name: 'iShares eb.rexx Government Germany 5.5-10.5yr UCITS ETF (DE)',
    price: 117.335,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXHE.DE',
    name: 'iShares Pfandbriefe UCITS ETF (DE)',
    price: 97.27,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXHE.F',
    name: 'iShares Pfandbriefe UCITS ETF (DE)',
    price: 91.388,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXHF.DE',
    name: 'iShares Euro Government Bond Capped 1.5-10.5yr UCITS ETF (DE)',
    price: 110.155,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'EXI1.DE',
    name: 'iShares SLI UCITS ETF (DE)',
    price: 147.82,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXI2.DE',
    name: 'iShares Dow Jones Global Titans 50 UCITS ETF (DE)',
    price: 90.61,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'EXI3.DE',
    name: 'iShares Dow Jones Industrial Average UCITS ETF (DE)',
    price: 386.9,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXI3.F',
    name: 'iShares Dow Jones Industrial Average UCITS ETF (DE)',
    price: 312.7,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXI5.DE',
    name: 'iShares STOXX Europe 600 Real Estate UCITS ETF (DE)',
    price: 13.4,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXI5.F',
    name: 'iShares STOXX Europe 600 Real Estate UCITS ETF (DE)',
    price: 11.338,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXIA.DE',
    name: 'iShares DAX ESG UCITS ETF (DE)',
    price: 7.336,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXIA.F',
    name: 'iShares DAX ESG UCITS ETF (DE)',
    price: 5.114,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXIB.DE',
    name: 'iShares TecDAX UCITS ETF (DE)',
    price: 5.011,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXIC.DE',
    name: 'iShares Core DAX UCITS ETF (DE)',
    price: 6.907,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXIC.F',
    name: 'iShares Core DAX UCITS ETF (DE)',
    price: 4.978,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXID.DE',
    name: 'iShares MDAX UCITS ETF (DE)',
    price: 4.221,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXID.F',
    name: 'iShares MDAX UCITS ETF (DE)',
    price: 4.0305,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXIE.DE',
    name: 'iShares STOXX Europe 600 UCITS ETF (DE) EUR (Dist). Units',
    price: 6.425,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXS1.DE',
    name: 'iShares Core DAX UCITS ETF (DE)',
    price: 196,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXS2.DE',
    name: 'iShares TecDAX UCITS ETF (DE)',
    price: 32.265,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXS3.DE',
    name: 'iShares MDAX UCITS ETF (DE)',
    price: 243.65,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXSA.DE',
    name: 'iShares STOXX Europe 600 UCITS ETF (DE)',
    price: 54.63,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXSB.DE',
    name: 'iShares DivDAX UCITS ETF (DE)',
    price: 21.19,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXSC.DE',
    name: 'iShares STOXX Europe Large 200 UCITS ETF (DE)',
    price: 56.7,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXSC.F',
    name: 'iShares STOXX Europe Large 200 UCITS ETF (DE)',
    price: 47.51,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXSD.DE',
    name: 'iShares STOXX Europe Mid 200 UCITS ETF (DE)',
    price: 57.77,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXSD.F',
    name: 'iShares STOXX Europe Mid 200 UCITS ETF (DE)',
    price: 48.02,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXSE.DE',
    name: 'iShares STOXX Europe Small 200 UCITS ETF (DE)',
    price: 34.615,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXSE.F',
    name: 'iShares STOXX Europe Small 200 UCITS ETF (DE)',
    price: 30.01,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXSG.DE',
    name: 'iShares EURO STOXX Select Dividend 30 UCITS ETF (DE)',
    price: 19.94,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXSH.DE',
    name: 'iShares STOXX Europe Select Dividend 30 UCITS ETF (DE)',
    price: 20.675,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXSI.DE',
    name: 'iShares EURO STOXX UCITS ETF (DE)',
    price: 57.15,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXSI.F',
    name: 'iShares EURO STOXX UCITS ETF (DE)',
    price: 46.545,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXV1.DE',
    name: 'iShares STOXX Europe 600 Banks UCITS ETF (DE)',
    price: 29.265,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXV2.DE',
    name: 'iShares STOXX Europe 600 Telecommunications UCITS ETF (DE)',
    price: 24.695,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXV3.DE',
    name: 'iShares STOXX Europe 600 Technology UCITS ETF (DE)',
    price: 74.55,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXV4.DE',
    name: 'iShares STOXX Europe 600 Health Care UCITS ETF (DE)',
    price: 105.64,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXV5.DE',
    name: 'iShares STOXX Europe 600 Automobiles & Parts UCITS ETF (DE)',
    price: 48.365,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXV6.DE',
    name: 'iShares STOXX Europe 600 Basic Resources UCITS ETF (DE)',
    price: 52.18,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXV7.DE',
    name: 'iShares STOXX Europe 600 Chemicals UCITS ETF (DE)',
    price: 116.62,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXV8.DE',
    name: 'iShares STOXX Europe 600 Construction & Materials UCITS ETF (DE)',
    price: 82.39,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXV9.DE',
    name: 'iShares STOXX Europe 600 Travel & Leisure UCITS ETF (DE)',
    price: 24.045,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXVM.DE',
    name: 'iShares eb.rexxGovernment Germany 0-1yr UCITS ETF (DE)',
    price: 76.1285,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXW1.DE',
    name: 'iShares Core EURO STOXX 50 UCITS ETF (DE)',
    price: 54.4,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXW3.DE',
    name: 'iShares STOXX Europe 50 UCITS ETF (DE)',
    price: 45.515,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'EXX1.DE',
    name: 'iShares EURO STOXX Banks 30-15 UCITS ETF (DE)',
    price: 21.49,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXX5.DE',
    name: 'iShares Dow Jones U.S. Select Dividend UCITS ETF (DE)',
    price: 85.84,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXX6.DE',
    name: 'iShares eb.rexx Government Germany 10.5+yr UCITS ETF (DE)',
    price: 116.055,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'EXX7.DE',
    name: 'iShares Nikkei 225 UCITS ETF (DE)',
    price: 24.335,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'EXXT.DE',
    name: 'iShares NASDAQ-100 UCITS ETF (DE)',
    price: 195.14,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'EXXU.DE',
    name: 'iShares Dow Jones China Offshore 50 UCITS ETF (DE)',
    price: 43.715,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'EXXV.DE',
    name: 'iShares Dow Jones Eurozone Sustainability Screened UCITS ETF (DE)',
    price: 20.285,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXXW.DE',
    name: 'iShares Dow Jones Asia Pacific Select Dividend 50 UCITS ETF (DE)',
    price: 26.315,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'EXXX.DE',
    name: 'iShares ATX UCITS ETF (DE)',
    price: 50.51,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'EXXY.DE',
    name: 'iShares Diversified Commodity Swap UCITS ETF (DE)',
    price: 25.31,
    issuer: 'iShares',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'F4DE.DE',
    name: 'Ossiam Food for Biodiversity UCITS ETF',
    price: 110.24,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'F500.DE',
    name: 'Amundi Index Solutions - Amundi S&P 500 ESG UCITS ETF DR-C',
    price: 158.72,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'F701.DE',
    name: 'Amundi Multi-Asset Portfolio UCITS ETF Anteile -Dist-',
    price: 163.62,
    issuer: 'Amundi',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'F702.DE',
    name: 'Amundi Multi-Asset Portfolio Defensive UCITS ETF Units -Dist-',
    price: 134.16,
    issuer: 'Amundi',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'F703.DE',
    name: 'Amundi Multi-Asset Portfolio Offensive UCITS ETF Units -Dist-',
    price: 160.96,
    issuer: 'Amundi',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'FAEU.DE',
    name: 'Invesco US High Yield Fallen Angels UCITS ETF (EUR Hdg)',
    price: 27.292,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FAHY.DE',
    name: 'Invesco US High Yield Fallen Angels UCITS ETF',
    price: 18.848,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FEEM.DE',
    name: 'Invesco Goldman Sachs Equity Factor Index Emerging Markets UCITS ETF',
    price: 36.31,
    issuer: 'Invesco',
    assetClass: 'Commodity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'FESD.F',
    name: 'Fidelity Sustainable USD EM Bond UCITS ETF',
    price: 3.583,
    issuer: 'Fidelity',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'FEUI.DE',
    name: 'Fidelity Europe Quality Income UCITS ETF EUR Inc',
    price: 6.206,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'FEUQ.DE',
    name: 'Fidelity Europe Quality Income UCITS ETF',
    price: 8.141,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'FGEQ.DE',
    name: 'Fidelity Global Quality Income ETF',
    price: 8.446,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'FGEU.DE',
    name: 'Fidelity Global Quality Income ETF',
    price: 8.45,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'FGEU.F',
    name: 'Fidelity Global Quality Income ETF',
    price: 6.816,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'FLRG.DE',
    name: 'Franklin Liberty Euro Green Bond UCITS ETF',
    price: 23.671,
    issuer: 'Franklin',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'FLXB.DE',
    name: 'Franklin FTSE Brazil UCITS ETF',
    price: 22.77,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FLXB.F',
    name: 'Franklin FTSE Brazil UCITS ETF',
    price: 23.22,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FLXC.DE',
    name: 'Franklin FTSE China UCITS ETF',
    price: 27.815,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'FLXC.F',
    name: 'Franklin FTSE China UCITS ETF',
    price: 20.49,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'FLXD.DE',
    name: 'Franklin LibertyQ European Dividend UCITS ETF',
    price: 32.28,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'FLXE.DE',
    name: 'Franklin LibertyQ Emerging Markets UCITS ETF',
    price: 27.875,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'FLXG.DE',
    name: 'Franklin LibertyQ Global Equity SRI UCITS ETF',
    price: 34.39,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'FLXI.DE',
    name: 'Franklin FTSE India UCITS ETF',
    price: 37.645,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FLXK.DE',
    name: 'Franklin FTSE Korea UCITS ETF',
    price: 32.86,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FLXP.F',
    name: 'Franklin STOXX Europe 600 Paris Aligned Climate UCITS ETF',
    price: 33.585,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'FLXT.F',
    name: 'Franklin FTSE Taiwan UCITS ETF',
    price: 21.43,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FLXU.DE',
    name: 'Franklin LibertyQ U.S. Equity UCITS ETF',
    price: 55.32,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FLXX.DE',
    name: 'Franklin LibertyQ Global Dividend UCITS ETF',
    price: 33.15,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'FRC3.DE',
    name: 'UBS (Lux) Fund Solutions – Bloomberg Euro Inflation Linked 1-10 UCITS ETF',
    price: 14.3855,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FRC4.DE',
    name: 'UBS (Lux) Fund Solutions – Bloomberg Euro Inflation Linked 10+ UCITS ETF',
    price: 15.1735,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FRCJ.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI Japan Socially Responsible UCITS ETF',
    price: 23.575,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'FRCK.DE',
    name: 'UBS(Lux)Fund Solutions – Bloomberg Barclays USD Emerging Markets Sovereign UCITS ETF(hedgedEUR)A-acc',
    price: 12.338,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'FRNE.DE',
    name: 'Amundi Index Solutions - Amundi Floating Rate EURO Corporate ESG',
    price: 110.38,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'ESG'
  },
  {
    symbol: 'FRNH.DE',
    name: 'Amundi Index Solutions - Amundi Floating Rate USD Corporate ESG',
    price: 55.148,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'ESG'
  },
  {
    symbol: 'FRNU.DE',
    name: 'Amundi Index Solutions - Amundi Floating Rate USD Corporate ESG',
    price: 113.86,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'ESG'
  },
  {
    symbol: 'FTGG.DE',
    name: 'First Trust Germany AlphaDEX UCITS ETF',
    price: 31.725,
    issuer: 'First Trust',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'FTGG.F',
    name: 'First Trust Germany AlphaDEX UCITS ETF',
    price: 23.59,
    issuer: 'First Trust',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'FTGT.F',
    name: 'First Trust Global Funds PLC - First Trust Alerian Disruptive Technology Real Estate Ucits ETF',
    price: 17.832,
    issuer: 'First Trust',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'FTGU.DE',
    name: 'First Trust US Large Cap Core AlphaDEX UCITS ETF',
    price: 80.98,
    issuer: 'First Trust',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FTWD.DE',
    name: 'Invesco FTSE All-World UCITS ETF USD Distribution',
    price: 6.475,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'FUSA.DE',
    name: 'Fidelity US Quality Income ETF Acc',
    price: 12.066,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FUSD.DE',
    name: 'Fidelity US Quality Income ETF',
    price: 10.028,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FUSU.DE',
    name: 'Fidelity US Quality Income ETF',
    price: 10.538,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FUSU.F',
    name: 'Fidelity US Quality Income ETF',
    price: 7.961,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'FVSJ.DE',
    name: 'Franklin LibertyQ AC Asia ex Japan UCITS ETF',
    price: 23.52,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'FVUE.DE',
    name: 'Franklin LibertyQ European Equity UCITS ETF',
    price: 34.425,
    issuer: 'Franklin',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'FYEM.DE',
    name: 'Fidelity Emerging Markets Quality Income UCITS ETF USD Acc',
    price: 6.234,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'FYEQ.DE',
    name: 'Fidelity Emerging Markets Quality Income UCITS ETF',
    price: 5.132,
    issuer: 'Fidelity',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'G1CE.DE',
    name: 'Invesco Markets II plc - Invesco Global Clean Energy UCITS ETF',
    price: 16.148,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'G2X.DE',
    name: 'VanEck Gold Miners UCITS ETF',
    price: 62.99,
    issuer: 'VanEck',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'G2XJ.DE',
    name: 'VanEck Junior Gold Miners UCITS ETF',
    price: 64.87,
    issuer: 'VanEck',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'GACA.DE',
    name: 'Goldman Sachs ActiveBeta US Large Cap Equity UCITS ETF',
    price: 76.7,
    issuer: 'Goldman',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'GACB.DE',
    name: 'Goldman Sachs ActiveBeta Emerging Market Equity UCITS ETF',
    price: 28.88,
    issuer: 'Goldman',
    assetClass: 'Commodity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'GASF.DE',
    name: 'Goldman Sachs Access China Government Bond UCITS ETF',
    price: 46.248,
    issuer: 'Goldman',
    assetClass: 'Fixed Income',
    category: 'China'
  },
  {
    symbol: 'GC2U.DE',
    name: 'Amundi ETF Short MSCI USA Daily UCITS ETF',
    price: 5.138,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'GC40.DE',
    name: 'Amundi Index Solutions - Amundi CAC 40',
    price: 135.86,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'GENY.DE',
    name: 'Amundi MSCI Millennials Capitalisation',
    price: 15.682,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'GFEA.DE',
    name: 'VanEck Global Fallen Angel High Yield Bond UCITS ETF',
    price: 62.192,
    issuer: 'VanEck',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'GGUE.DE',
    name: 'UBS (Irl) ETF plc - Global Gender Equality UCITS ETF',
    price: 24.705,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'GLUX.DE',
    name: 'Amundi Index Solutions - Amundi S&P Global Luxury',
    price: 208.8,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'GMVM.DE',
    name: 'VanEck Morningstar US Sustainable Wide Moat UCITS ETF',
    price: 52.31,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'GNAR.DE',
    name: 'Amundi Index Solutions - Amundi MSCI USA SRI UCITS ETF DR',
    price: 90.42,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'GOAI.DE',
    name: 'Amundi MSCI Robotics & AI ESG Screened UCITS ETF',
    price: 106.22,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'GRID.F',
    name: 'First Trust Nasdaq Clean Edge Smart Grid Infrastructure UCITS ETF',
    price: 32.275,
    issuer: 'First Trust',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'GRX.DE',
    name: 'Expat Greece ASE UCITS ETF',
    price: 1.6666,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'GSDE.DE',
    name: 'BNP Paribas Easy Energy & Metals Enhanced Roll',
    price: 14.904,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Energy'
  },
  {
    symbol: 'GSDE.F',
    name: 'BNP Paribas Easy Energy & Metals Enhanced Roll',
    price: 13.034,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Energy'
  },
  {
    symbol: 'H1D5.DE',
    name: 'Amundi Index Solutions - Amundi S&P 500 UCITS ETF',
    price: 154.085,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'H1D5.F',
    name: 'Amundi Index Solutions - Amundi S&P 500 UCITS ETF',
    price: 108.25,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'H410.DE',
    name: 'HSBC MSCI Emerging Markets UCITS ETF',
    price: 10.8725,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'H411.DE',
    name: 'HSBC MSCI AC FAR EAST ex JAPAN UCITS ETF',
    price: 53.88,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'H41J.DE',
    name: 'HSBC Multi Factor Worldwide Equity UCITS ETF',
    price: 22.525,
    issuer: 'HSBC',
    assetClass: 'Mixed',
    category: 'Global'
  },
  {
    symbol: 'H41K.DE',
    name: 'HSBC MSCI CHINA A UCITS ETF',
    price: 9.82,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'H41K.F',
    name: 'HSBC MSCI CHINA A UCITS ETF',
    price: 9.083,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'H4ZA.DE',
    name: 'HSBC EURO STOXX 50 UCITS ETF',
    price: 55.91,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'H4ZB.DE',
    name: 'HSBC FTSE 100 UCITS ETF',
    price: 86.95,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'H4ZC.DE',
    name: 'HSBC MSCI JAPAN UCITS ETF',
    price: 32.791,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'H4ZD.DE',
    name: 'HSBC MSCI USA UCITS ETF',
    price: 38.88,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'H4ZE.DE',
    name: 'HSBC MSCI Europe UCITS ETF',
    price: 18.6,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'H4ZF.DE',
    name: 'HSBC S&P 500 UCITS ETF',
    price: 55.8,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'H4ZH.DE',
    name: 'HSBC MSCI Pacific ex Japan UCITS ETF',
    price: 12.012,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'H4ZI.DE',
    name: 'HSBC MSCI EM Far East UCITS ETF',
    price: 43.7,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'H4ZJ.DE',
    name: 'HSBC MSCI World UCITS ETF',
    price: 35.801,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'H4ZK.DE',
    name: 'HSBC Euro Lower Carbon Government 1-3 Year Bond UCITS ETF',
    price: 10.179,
    issuer: 'HSBC',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'H4ZP.DE',
    name: 'HSBC MSCI China UCITS ETF',
    price: 7.154,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'H4ZR.DE',
    name: 'HSBC MSCI Canada UCITS ETF',
    price: 19.082,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'H4ZS.DE',
    name: 'HSBC MSCI Mexico Capped UCITS ETF',
    price: 42.88,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'H4ZT.DE',
    name: 'HSBC MSCI Indonesia UCITS ETF',
    price: 53,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'H4ZU.DE',
    name: 'HSBC MSCI Taiwan Capped UCITS ETF',
    price: 76.48,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'H4ZV.DE',
    name: 'HSBC MSCI Malaysia UCITS ETF',
    price: 25.655,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'H4ZW.DE',
    name: 'HSBC MSCI EM Latin America UCITS ETF',
    price: 22.785,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'HAB.DE',
    name: 'Hamborner REIT AG',
    price: 9.013,
    issuer: 'Hamborner',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'HDLV.DE',
    name: 'Invesco S&P 500 High Dividend Low Volatility UCITS ETF',
    price: 31.475,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'HJAP.F',
    name: 'HSBC MSCI Japan Climate Paris Aligned UCITS ETF',
    price: 12.818,
    issuer: 'HSBC',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'HNDX.DE',
    name: 'Amundi Index Solutions - Amundi Nasdaq-100',
    price: 538.5,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'HNDX.F',
    name: 'Amundi Index Solutions - Amundi Nasdaq-100',
    price: 505.2,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'HTMW.DE',
    name: 'L&G Hydrogen Economy UCITS ETF',
    price: 4.508,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'HUBE.DE',
    name: 'Expat Hungary BUX UCITS ETF',
    price: 1.151,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'HUBE.F',
    name: 'Expat Hungary BUX UCITS ETF',
    price: 0.6477,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'HVJ9.F',
    name: 'DWS Concept SICAV - DWS Concept Kaldemorgen',
    price: 174.665,
    issuer: 'DWS',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'HY3M.DE',
    name: 'VanEck Emerging Markets High Yield Bond UCITS ETF',
    price: 113.025,
    issuer: 'VanEck',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'HYLE.DE',
    name: 'iShares Global High Yield Corp Bond UCITS ETF',
    price: 4.4619,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'HYLE.F',
    name: 'iShares Global High Yield Corp Bond UCITS ETF',
    price: 4.2568,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'IBB1.DE',
    name: 'iShares $ Treasury Bond 7-10yr UCITS ETF EUR Hedged (Dist)',
    price: 4.032,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBB1.F',
    name: 'iShares $ Treasury Bond 7-10yr UCITS ETF EUR Hedged (Dist)',
    price: 4.2273,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBC0.DE',
    name: 'iShares Edge MSCI Europe Multifactor UCITS ETF EUR (Acc)',
    price: 10.544,
    issuer: 'iShares',
    assetClass: 'Mixed',
    category: 'Europe'
  },
  {
    symbol: 'IBC2.DE',
    name: 'iShares $ High Yield Corp Bond UCITS ETF',
    price: 4.0399,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBC3.DE',
    name: 'iShares Core MSCI EM IMI UCITS ETF',
    price: 4.8179,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IBC3.F',
    name: 'iShares Core MSCI EM IMI UCITS ETF',
    price: 4.009,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IBC4.DE',
    name: 'iShares MSCI South Africa UCITS ETF',
    price: 40.895,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IBC5.DE',
    name: 'iShares $ TIPS UCITS ETF',
    price: 5.379,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IBC6.DE',
    name: 'iShares MSCI Australia UCITS ETF',
    price: 48.025,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IBC7.DE',
    name: 'iShares Fallen Angels High Yield Corp Bond UCITS ETF',
    price: 4.6499,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBC9.DE',
    name: 'iShares Global High Yield Corp Bond UCITS ETF USD (Dist)',
    price: 79.24,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'IBCA.DE',
    name: 'iShares € Govt Bond 1-3yr UCITS ETF EUR (Dist)',
    price: 142.825,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBCC.DE',
    name: 'iShares $ Treasury Bond 0-1yr UCITS ETF USD (Dist)',
    price: 4.32,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBCD.DE',
    name: 'iShares $ Corp Bond UCITS ETF USD (Dist)',
    price: 88.248,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBCF.DE',
    name: 'iShares V PLC - iShares S&P 500 EUR Hedged UCITS ETF (Acc)',
    price: 134.07,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'IBCG.DE',
    name: 'iShares V PLC - iShares MSCI Japan EUR Hedged UCITS ETF (Acc)',
    price: 103.625,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'IBCH.DE',
    name: 'iShares V PLC - iShares MSCI World EUR Hedged UCITS ETF (Acc)',
    price: 100.845,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IBCI.DE',
    name: 'iShares € Inflation Linked Govt Bond UCITS ETF',
    price: 228.49,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBCJ.DE',
    name: 'iShares V PLC - iShares MSCI Poland UCITS ETF',
    price: 24.32,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IBCK.DE',
    name: 'iShares Edge S&P 500 Minimum Volatility UCITS ETF',
    price: 89.68,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'IBCL.DE',
    name: 'iShares € Govt Bond 15-30yr UCITS ETF',
    price: 164.44,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBCM.DE',
    name: 'iShares € Govt Bond 7-10yr UCITS ETF',
    price: 186.93,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBCN.DE',
    name: 'iShares € Govt Bond 3-5yr UCITS ETF',
    price: 162.27,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBCQ.DE',
    name: 'iShares Global Corp Bond EUR Hedged UCITS ETF (Dist)',
    price: 86.528,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'IBCS.DE',
    name: 'iShares € Corp Bond Large Cap UCITS ETF',
    price: 125.575,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IBCY.DE',
    name: 'iShares Edge MSCI USA Multifactor UCITS ETF USD (Acc)',
    price: 12.466,
    issuer: 'iShares',
    assetClass: 'Mixed',
    category: 'US'
  },
  {
    symbol: 'IBCZ.DE',
    name: 'iShares Edge MSCI World Multifactor UCITS ETF USD (Acc)',
    price: 11.284,
    issuer: 'iShares',
    assetClass: 'Mixed',
    category: 'Global'
  },
  {
    symbol: 'ICFP.DE',
    name: 'Invesco MSCI Europe ESG Leaders Catholic Principles UCITS ETF',
    price: 58.46,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ICGA.DE',
    name: 'iShares MSCI China UCITS ETF',
    price: 5.286,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'ICGA.F',
    name: 'iShares MSCI China UCITS ETF',
    price: 3.872,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'ICGB.DE',
    name: 'iShares China CNY Bond UCITS ETF',
    price: 4.6002,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'China'
  },
  {
    symbol: 'ICNT.F',
    name: 'Invesco MSCI China Technology All Shares Stock Connect UCITS ETF',
    price: 21.57,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'ICW5.DE',
    name: 'ICBC Credit Suisse WisdomTree S&P China 500 UCITS ETF',
    price: 10.054,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'IE1A.DE',
    name: 'iShares € Corp Bond 1-5yr UCITS ETF EUR (Dist)',
    price: 5.4268,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IE3E.DE',
    name: 'iShares € Corp Bond 0-3yr ESG UCITS ETF',
    price: 5.4632,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IE3E.F',
    name: 'iShares € Corp Bond 0-3yr ESG UCITS ETF',
    price: 4.9624,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IEVD.DE',
    name: 'iShares Electric Vehicles and Driving Technology UCITS ETF',
    price: 7.453,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IEXA.DE',
    name: 'iShares € Corp Bond ex-Financials UCITS ETF',
    price: 5.3568,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IM2A.DE',
    name: 'BNP Paribas Easy FTSE EPRA/NAREIT Eurozone Capped',
    price: 6.852,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'INDA.DE',
    name: 'Lyxor Index Fund - Lyxor Stoxx Europe 600 Banks UCITS ETF',
    price: 70.58,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'INDU.DE',
    name: 'Amundi STOXX Europe 600 Industrials UCITS ETF Distribution',
    price: 182.84,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'IPAB.DE',
    name: 'iShares € Corp Bond ESG Paris-Aligned Climate UCITS ETF',
    price: 5.5282,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IPAB.F',
    name: 'iShares € Corp Bond ESG Paris-Aligned Climate UCITS ETF',
    price: 4.898,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IPRE.DE',
    name: 'iShares European Property Yield UCITS ETF',
    price: 4.66,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'IPRE.F',
    name: 'iShares European Property Yield UCITS ETF',
    price: 3.4325,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'IQCY.DE',
    name: 'Lyxor Index Fund - Lyxor MSCI Smart Cities ESG Filtered (DR) UCITS ETF',
    price: 13.664,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQ0.DE',
    name: 'iShares Edge MSCI World Minimum Volatility UCITS ETF USD (Acc)',
    price: 62.88,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IQQ4.DE',
    name: 'iShares Asia Property Yield UCITS ETF USD (Dist)',
    price: 19.53,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'IQQ5.DE',
    name: 'iShares MSCI Turkey UCITS ETF',
    price: 15.94,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQ6.DE',
    name: 'iShares Developed Markets Property Yield UCITS ETF USD (Dist)',
    price: 20.555,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQ7.DE',
    name: 'iShares US Property Yield UCITS ETF',
    price: 25.22,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQ9.DE',
    name: 'iShares BRIC 50 UCITS ETF',
    price: 22.24,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQA.DE',
    name: 'iShares Euro Dividend UCITS ETF',
    price: 22.32,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQB.DE',
    name: 'iShares MSCI Brazil UCITS ETF USD (Dist)',
    price: 20.165,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQC.DE',
    name: 'iShares China Large Cap UCITS ETF',
    price: 95.78,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'IQQD.DE',
    name: 'iShares UK Dividend UCITS ETF',
    price: 9.712,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQE.DE',
    name: 'iShares MSCI EM UCITS ETF USD (Dist)',
    price: 42.76,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IQQF.DE',
    name: 'iShares MSCI AC Far East ex-Japan UCITS ETF',
    price: 56.58,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'IQQG.DE',
    name: 'iShares Euro Total Market Growth Large UCITS ETF',
    price: 60.6,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQH.DE',
    name: 'iShares Global Clean Energy UCITS ETF USD (Dist)',
    price: 7.036,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IQQI.DE',
    name: 'iShares Global Infrastructure UCITS ETF',
    price: 29.665,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IQQJ.DE',
    name: 'iShares MSCI Japan UCITS ETF USD (Dist)',
    price: 16.986,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'IQQK.DE',
    name: 'iShares MSCI Korea UCITS ETF (Dist)',
    price: 43.78,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQL.DE',
    name: 'iShares Listed Private Equity UCITS ETF',
    price: 32.425,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQM.DE',
    name: 'iShares EURO STOXX Mid UCITS ETF',
    price: 75.58,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQN.DE',
    name: 'iShares MSCI North America UCITS ETF',
    price: 102.86,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQP.DE',
    name: 'iShares European Property Yield UCITS ETF',
    price: 29.89,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'IQQQ.DE',
    name: 'iShares Global Water UCITS ETF USD (Dist)',
    price: 63.88,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IQQR.DE',
    name: 'iShares MSCI Eastern Europe Capped UCITS ETF',
    price: 4.7,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'IQQS.DE',
    name: 'iShares EURO STOXX Small UCITS ETF',
    price: 45.88,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQT.DE',
    name: 'iShares MSCI Taiwan UCITS ETF',
    price: 89.97,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IQQU.DE',
    name: 'iShares MSCI Europe ex-UK UCITS ETF',
    price: 46.9,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'IQQW.DE',
    name: 'iShares MSCI World UCITS ETF',
    price: 76.084,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IQQX.DE',
    name: 'iShares Asia Pacific Dividend UCITS ETF',
    price: 22.62,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'IQQY.DE',
    name: 'iShares Core MSCI Europe UCITS ETF EUR (Dist)',
    price: 33.95,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'IQSA.DE',
    name: 'Invesco Quantitative Strategies ESG Global Equity Multi-Factor UCITS ETF',
    price: 74.48,
    issuer: 'Invesco',
    assetClass: 'Mixed',
    category: 'Global'
  },
  {
    symbol: 'IQSE.DE',
    name: 'Invesco Quantitative Strategies ESG Global Equity Multi-Factor UCITS ETF',
    price: 80.64,
    issuer: 'Invesco',
    assetClass: 'Mixed',
    category: 'Global'
  },
  {
    symbol: 'IROB.DE',
    name: 'L&G ROBO Global Robotics and Automation UCITS ETF',
    price: 21.7,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IS04.DE',
    name: 'iShares $ Treasury Bond 20+yr UCITS ETF USD (Dist)',
    price: 2.7369,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS05.DE',
    name: 'iShares € Govt Bond 20yr Target Duration UCITS ETF',
    price: 3.2484,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS06.DE',
    name: 'iShares € Corp Bond BBB-BB UCITS ETF EUR (Dist)',
    price: 4.8675,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS07.DE',
    name: 'iShares Edge MSCI World Multifactor UCITS ETF',
    price: 9.879,
    issuer: 'iShares',
    assetClass: 'Mixed',
    category: 'Global'
  },
  {
    symbol: 'IS0D.DE',
    name: 'iShares V PLC - iShares Oil & Gas Exploration & Production UCITS ETF USD (Acc)',
    price: 22.865,
    issuer: 'iShares',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'IS0E.DE',
    name: 'iShares V PLC - iShares Gold Producers UCITS ETF USD (Acc)',
    price: 25.795,
    issuer: 'iShares',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'IS0L.DE',
    name: 'iShares V PLC - iShares Germany Govt Bond UCITS ETF EUR (Dist)',
    price: 119.705,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Germany'
  },
  {
    symbol: 'IS0M.DE',
    name: 'iShares V PLC - iShares Italy Govt Bond UCITS ETF EUR (Dist)',
    price: 151.195,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS0P.DE',
    name: 'iShares V PLC - iShares Spain Govt Bond UCITS ETF EUR (Dist)',
    price: 150.8,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS0Q.DE',
    name: 'iShares V PLC - iShares J.P. Morgan $ EM Corp Bond UCITS ETF',
    price: 78.342,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IS0R.DE',
    name: 'iShares $ High Yield Corp Bond UCITS ETF USD (Dist)',
    price: 82.858,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS0S.DE',
    name: 'iShares Emerging Asia Local Govt Bond UCITS ETF USD (Dist)',
    price: 76.268,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IS0X.DE',
    name: 'iShares Global Corp Bond UCITS ETF USD (Dist)',
    price: 78.27,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'IS0Y.DE',
    name: 'iShares V PLC - iShares € Corp Bond Interest Rate Hedged ESG UCITS ETF',
    price: 98.726,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS0Z.DE',
    name: 'iShares Global AAA-AA Govt Bond UCITS ETF USD (Dist)',
    price: 69.032,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'IS31.DE',
    name: 'iShares Edge S&P 500 Minimum Volatility UCITS ETF',
    price: 10.078,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'IS3B.DE',
    name: 'iShares € Corp Bond Financials UCITS ETF EUR (Dist)',
    price: 102.53,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS3C.DE',
    name: 'iShares J.P. Morgan $ EM Bond EUR Hedged UCITS ETF (Dist)',
    price: 67.924,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IS3F.DE',
    name: 'iShares $ Corp Bond Interest Rate Hedged UCITS ETF USD (Dist)',
    price: 90.274,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS3G.DE',
    name: 'iShares MSCI EMU Large Cap UCITS ETF',
    price: 63.81,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IS3H.DE',
    name: 'iShares MSCI EMU Mid Cap UCITS ETF',
    price: 65.98,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IS3J.DE',
    name: 'iShares $ Short Duration Corp Bond UCITS ETF USD (Dist)',
    price: 87.114,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS3K.DE',
    name: 'iShares $ Short Duration High Yield Corp Bond UCITS ETF',
    price: 76.178,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS3L.DE',
    name: 'iShares $ Ultrashort Bond UCITS ETF',
    price: 86.38,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS3M.DE',
    name: 'iShares € Ultrashort Bond UCITS ETF',
    price: 101.435,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IS3N.DE',
    name: 'iShares Core MSCI EM IMI UCITS ETF',
    price: 35.085,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IS3Q.DE',
    name: 'iShares Edge MSCI World Quality Factor UCITS ETF',
    price: 64.12,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IS3R.DE',
    name: 'iShares Edge MSCI World Momentum Factor UCITS ETF',
    price: 78.17,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IS3S.DE',
    name: 'iShares Edge MSCI World Value Factor UCITS ETF USD (Acc)',
    price: 45.04,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IS3T.DE',
    name: 'iShares Edge MSCI World Size Factor UCITS ETF',
    price: 45.3,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IS3U.DE',
    name: 'iShares MSCI France UCITS ETF',
    price: 59.02,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IS3V.DE',
    name: 'iShares Global Inflation Linked Govt Bond UCITS ETF EUR Hedged (Acc)',
    price: 4.4774,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'IS4S.DE',
    name: 'iShares Digital Security UCITS ETF',
    price: 9.343,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ISPA.DE',
    name: 'iShares STOXX Global Select Dividend 100 UCITS ETF (DE)',
    price: 31.745,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IU0E.DE',
    name: 'iShares $ Corp Bond 0-3yr ESG UCITS ETF',
    price: 5.3562,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IU5C.DE',
    name: 'iShares V PLC - iShares S&P 500 Communication Sector UCITS ETF',
    price: 11.462,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'IUS2.DE',
    name: 'iShares V PLC - iShares S&P U.S. Banks UCITS ETF',
    price: 6.156,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'IUS3.DE',
    name: 'iShares S&P Small Cap 600 UCITS ETF USD (Dist)',
    price: 81.16,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'IUS4.DE',
    name: 'iShares MSCI Japan Small Cap UCITS ETF USD (Dist)',
    price: 43.32,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'IUS5.DE',
    name: 'iShares Global Inflation Linked Govt Bond UCITS ETF USD (Acc)',
    price: 138.33,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'IUS6.DE',
    name: 'iShares € Covered Bond UCITS ETF',
    price: 142.41,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IUS7.DE',
    name: 'iShares J.P. Morgan $ EM Bond UCITS ETF USD (Dist)',
    price: 77.892,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IUS8.DE',
    name: 'iShares Emerging Market Infrastructure UCITS ETF',
    price: 15.084,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IUSA.DE',
    name: 'iShares Core S&P 500 UCITS ETF USD Dist',
    price: 55.128,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'IUSC.DE',
    name: 'iShares MSCI EM Latin America UCITS ETF',
    price: 14.212,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IUSK.DE',
    name: 'iShares MSCI Europe SRI UCITS ETF EUR (Acc)',
    price: 67,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'IUSL.DE',
    name: 'iShares Dow Jones Global Sustainability Screened UCITS ETF',
    price: 71.54,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IUSM.DE',
    name: 'iShares $ Treasury Bond 7-10yr UCITS ETF USD (Dist)',
    price: 150.295,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IUSN.DE',
    name: 'iShares MSCI World Small Cap UCITS ETF',
    price: 7.344,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IUSP.DE',
    name: 'iShares J.P. Morgan EM Local Govt Bond UCITS ETF',
    price: 39.125,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'IUSQ.DE',
    name: 'iShares V PLC - iShares MSCI ACWI UCITS ETF USD (Acc)',
    price: 86.78,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IUSS.DE',
    name: 'iShares MSCI Saudi Arabia Capped UCITS ETF',
    price: 5.114,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IUST.DE',
    name: 'iShares $ TIPS UCITS ETF USD (Acc)',
    price: 217.2,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IUSU.DE',
    name: 'iShares $ Treasury Bond 1-3yr UCITS ETF USD (Dist)',
    price: 111.62,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'IUSW.DE',
    name: 'iShares MSCI Saudi Arabia Capped UCITS ETF',
    price: 4.2725,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IUSZ.DE',
    name: 'iShares Core FTSE 100 UCITS ETF GBP (Dist)',
    price: 10.338,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'IWLE.DE',
    name: 'iShares Core MSCI World UCITS ETF',
    price: 9.2346,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'IWLE.F',
    name: 'iShares III Public Limited Company - iShares Core MSCI World UCITS ETF',
    price: 6.847,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'J1GR.DE',
    name: 'Amundi Index Solutions - Amundi Index MSCI Japan',
    price: 278.12,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JA13.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - BetaBuilders US Treasury Bond 1-3 yr UCITS ETF',
    price: 98.938,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'JARH.F',
    name: 'Amundi Index Solutions - Amundi Index MSCI Japan SRI PAB',
    price: 66.16,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JARI.F',
    name: 'Amundi Index Solutions - Amundi Index MSCI Japan SRI PAB',
    price: 44.675,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JBEM.DE',
    name: 'BNP Paribas Easy JPM ESG EMU Government Bond IG',
    price: 9.3882,
    issuer: 'BNP Paribas',
    assetClass: 'Fixed Income',
    category: 'ESG'
  },
  {
    symbol: 'JC11.DE',
    name: 'UBS (Lux) Fund Solutions – J.P. Morgan CNY China Government 1-10 Year Bond UCITS ETF',
    price: 11.0805,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'China'
  },
  {
    symbol: 'JCHE.F',
    name: 'JPMorgan ETFs (Ireland) ICAV - BetaBuilders China Aggregate Bond UCITS ETF',
    price: 95.154,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'China'
  },
  {
    symbol: 'JE13.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - BetaBuilders EUR Govt Bond 1-3 yr UCITS ETF',
    price: 102.365,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'JER5.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - EUR Corporate Bond 1-5 yr Research Enhanced Index (ESG) UCITS ETF',
    price: 107.985,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'JEST.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - EUR Ultra-Short Income UCITS ETF',
    price: 108.15,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'JGHY.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV Global High Yield Corporate Bond Multi-Factor UCITS ETF',
    price: 106,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'JGPI.DE',
    name: 'JPM Global Equity Premium Income Active UCITS ETF - USD (dist)',
    price: 23.04,
    issuer: 'JPM',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'JMBA.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - USD Emerging Markets Sovereign Bond UCITS ETF',
    price: 96.152,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'JMBE.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - USD Emerging Markets Sovereign Bond UCITS ETF EUR (acc) Hedged',
    price: 93.226,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'JNHA.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Retail UCITS ETF',
    price: 73.99,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'JNHD.DE',
    name: 'Amundi MSCI Japan UCITS ETF - Daily Hedged to EUR - Dist',
    price: 31.385,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JNHD.F',
    name: 'Amundi MSCI Japan UCITS ETF - Daily Hedged to EUR - Dist',
    price: 22.41,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JP40.DE',
    name: 'Amundi Index Solutions - Amundi JPX-Nikkei 400 UCITS ETF-C EUR',
    price: 195.92,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JP4H.DE',
    name: 'Amundi Index Solutions - Amundi JPX-Nikkei 400 UCITS ETF-C EUR Hedged',
    price: 242.9,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JPBM.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - USD Emerging Markets Sovereign Bond UCITS ETF',
    price: 71.286,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'JPGL.DE',
    name: 'JPM Global Equity Multi-Factor UCITS ETF',
    price: 37.59,
    issuer: 'JPM',
    assetClass: 'Mixed',
    category: 'Global'
  },
  {
    symbol: 'JPNE.DE',
    name: 'Lyxor MSCI Japan ESG Leaders Extra (DR) UCITS ETF',
    price: 30.49,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JPNE.F',
    name: 'Lyxor MSCI Japan ESG Leaders Extra (DR) UCITS ETF',
    price: 26.435,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JPNH.DE',
    name: 'Amundi Japan TOPIX II UCITS ETF',
    price: 249.45,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JPPA.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - USD Ultra-Short Income UCITS ETF',
    price: 104.37,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'JPPS.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - USD Ultra-Short Income UCITS ETF',
    price: 87.322,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'JREB.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - EUR Corporate Bond Research Enhanced Index (ESG) UCITS ETF',
    price: 107.16,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'JREE.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - Europe Research Enhanced Index Equity (ESG) UCITS ETF',
    price: 45.745,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'JREG.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - Global Research Enhanced Index Equity UCITS ETF - USD (acc)',
    price: 48.4,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'JREM.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - Global Emerging Markets Research Enhanced Index Equity(ESG) UCITS ETF',
    price: 31.615,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'JREU.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - US Research Enhanced Index Equity (ESG) UCITS ETF',
    price: 55,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'JREZ.DE',
    name: 'JPM Eurozone Research Enhanced Index Equity (ESG) UCITS ETF',
    price: 36.865,
    issuer: 'JPM',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'JRUB.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - USD Corporate Bond Research Enhanced Index (ESG) UCITS ETF',
    price: 104.795,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'JRUD.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - US Research Enhanced Index Equity (ESG) UCITS ETF',
    price: 51.41,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'JRUE.DE',
    name: 'JPMorgan ETFs Ireland ICAV - USD Corporate Bond Research Enhanced Index ESG UCITS ETF EUR Hedged Acc',
    price: 95.15,
    issuer: 'JPMorgan',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'JRZD.F',
    name: 'JPM Eurozone Research Enhanced Index Equity (ESG) UCITS ETF',
    price: 27.8,
    issuer: 'JPM',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'JSRI.DE',
    name: 'BNP Paribas Easy MSCI Japan SRI S-Series PAB 5% Capped',
    price: 21.345,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'JUHE.DE',
    name: 'JPMorgan ETFs (Ireland) ICAV - US Research Enhanced Index Equity UCITS ETF - EUR Hedged (acc)',
    price: 51.4,
    issuer: 'JPMorgan',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'JUMF.DE',
    name: 'JPM US Equity Multi-Factor UCITS ETF',
    price: 32.63,
    issuer: 'JPM',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'JUPI.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Japan ESG Broad CTB',
    price: 53.02,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'KFTK.DE',
    name: 'Invesco KBW NASDAQ Fintech UCITS ETF',
    price: 53.91,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'KLMH.DE',
    name: 'Amundi Global Aggregate Green Bond UCITS ETF',
    price: 46.775,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'KLMH.F',
    name: 'Amundi Global Aggregate Green Bond UCITS ETF',
    price: 43.581,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'KLMT.DE',
    name: 'Amundi Global Aggregate Green Bond UCITS ETF',
    price: 48.396,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'KROP.F',
    name: 'Global X AgTech & Food Innovation UCITS ETF',
    price: 9.269,
    issuer: 'Global',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'KX1G.DE',
    name: 'Amundi Index Solutions - Amundi Govt Bond Lowest Rated Euromts Investment Grade',
    price: 229.47,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Mixed'
  },
  {
    symbol: 'L0CK.DE',
    name: 'iShares Digital Security UCITS ETF',
    price: 8.482,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'L0CK.F',
    name: 'iShares Digital Security UCITS ETF',
    price: 6.221,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'L4K3.DE',
    name: 'Lyxor MSCI China UCITS ETF',
    price: 19.638,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'L8I3.DE',
    name: 'Lyxor Euro Overnight Return UCITS ETF',
    price: 112.116,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LASI.DE',
    name: 'Amundi MSCI AC Asia Ex Japan ETF Capitalisation',
    price: 144.02,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'LASP.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor MSCI AC Asia Pacific Ex Japan UCITS ETF',
    price: 73.57,
    issuer: 'Lyxor',
    assetClass: 'Mixed',
    category: 'Asia'
  },
  {
    symbol: 'LAUT.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Automobiles & Parts UCITS ETF',
    price: 92.32,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LBNK.DE',
    name: 'Lyxor Index Fund - Lyxor Stoxx Europe 600 Banks UCITS ETF Acc',
    price: 49.47,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LBRA.DE',
    name: 'Lyxor MSCI Brazil UCITS ETF',
    price: 19.32,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LBRE.DE',
    name: 'Lyxor Index Fund - Lyxor Stoxx Europe 600 Basic Resources UCITS ETF Acc',
    price: 85.13,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LCEU.DE',
    name: 'BNP Paribas Easy Low Carbon 100 Europe PAB',
    price: 259.25,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LCHI.DE',
    name: 'Lyxor MSCI China ESG Leaders Extra (DR) UCITS ETF',
    price: 108.22,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'LCHI.F',
    name: 'Lyxor MSCI China ESG Leaders Extra (DR) UCITS ETF',
    price: 83.59,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'LCHM.DE',
    name: 'Amundi STOXX Europe 600 Basic Materials UCITS ETF Unhedged Capitalisation',
    price: 153.12,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LCST.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Construction & Materials UCITS ETF',
    price: 93.42,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LCTR.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Commodities Refinitiv/CoreCommodity CRB EX-Energy TR UCITS ETF',
    price: 25.08,
    issuer: 'Lyxor',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'LCUA.DE',
    name: 'Amundi MSCI EM Asia ESG Broad Transition UCITS ETF Acc Shs Capitalisation',
    price: 11.892,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'LCUJ.DE',
    name: 'Amundi MSCI Japan UCITS ETF',
    price: 17.691,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'LCUK.DE',
    name: 'Amundi UK Equity All Cap UCITS ETF',
    price: 15.092,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LCUS.DE',
    name: 'Lyxor Core US Equity (DR) UCITS ETF - Dist',
    price: 21.115,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LCUW.DE',
    name: 'Lyxor Core MSCI World (DR) UCITS ETF',
    price: 19.6045,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LCVB.DE',
    name: 'Lyxor Index Fund - Lyxor EuroMTS Covered Bond Aggregate UCITS ETF',
    price: 127.33,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LCVB.F',
    name: 'Lyxor Index Fund - Lyxor EuroMTS Covered Bond Aggregate UCITS ETF',
    price: 120.18,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LDCE.DE',
    name: 'PIMCo Low Duration Euro Corporate Bond Source Ucits ETF',
    price: 103.185,
    issuer: 'PIMCo',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LEER.DE',
    name: 'Lyxor MSCI Eastern Europe ex Russia UCITS ETF Acc',
    price: 32.14,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LEEU.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Real Estate UCITS ETF',
    price: 29.405,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LERN.DE',
    name: 'Rize Education Tech and Digital Learning UCITS ETF',
    price: 2.067,
    issuer: 'Rize',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LESE.DE',
    name: 'Lyxor MSCI EMU ESG Leaders Extra (DR) UCITS ETF',
    price: 23.865,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LESG.DE',
    name: 'Lyxor MSCI EM ESG Leaders Extra UCITS ETF',
    price: 16.214,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'LESU.DE',
    name: 'Lyxor MSCI USA ESG Leaders Extra (DR) UCITS ETF',
    price: 44.49,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'LESW.DE',
    name: 'Lyxor MSCI World ESG Leaders Extra (DR) UCITS ETF',
    price: 32.48,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LFIN.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Financial Services UCITS ETF',
    price: 107.28,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LFOD.DE',
    name: 'Amundi STOXX Europe 600 Consumer Staples UCITS ETF Acc',
    price: 90.31,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LGQG.DE',
    name: 'Amundi MSCI EMU ESG Broad Transition -UCITS ETF Acc- Capitalisation',
    price: 303.6,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LGQI.DE',
    name: 'Lyxor SG Global Quality Income NTR UCITS ETF',
    price: 142.44,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LGQK.DE',
    name: 'Lyxor MSCI Pacific Ex Japan UCITS ETF',
    price: 97.03,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'LGQM.DE',
    name: 'Amundi Pan Africa ETF -Acc- Capitalisation',
    price: 12.06,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LGWS.DE',
    name: 'Amundi MSCI EMU Value Factor - UCITS ETF Dist',
    price: 157.9,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LGWT.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Europe Growth UCITS ETF Dist',
    price: 190.08,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LGWU.DE',
    name: 'Lyxor Index Fund - Lyxor MSCI EMU Small Cap UCITS ETF',
    price: 383.35,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LHKG.DE',
    name: 'Amundi MSCI China ESG Selection Extra -Dist- Distribution',
    price: 25.27,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'LHTC.DE',
    name: 'Lyxor Index Fund - Lyxor Stoxx Europe 600 Healthcare UCITS ETF',
    price: 139.94,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LI7U.F',
    name: 'Global X Lithium & Battery Tech UCITS ETF',
    price: 10.48,
    issuer: 'Global',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LIGS.DE',
    name: 'Amundi STOXX Europe 600 Industrials UCITS ETF Unhedged Capitalisation',
    price: 133.28,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LIRU.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Insurance UCITS ETF',
    price: 81.55,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LKOR.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor MSCI Korea UCITS ETF',
    price: 66.97,
    issuer: 'Lyxor',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'LLAM.DE',
    name: 'Lyxor MSCI EM Latin America UCITS ETF',
    price: 30.815,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'LMDA.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Media UCITS ETF',
    price: 61.9,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LMVF.DE',
    name: 'Amundi MSCI EMU UCITS ETF',
    price: 70.49,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LMWE.DE',
    name: 'Lyxor FTSE Epra/Nareit Global Developed UCITS ETF D EUR Inc',
    price: 38.765,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LOGS.DE',
    name: 'Amundi STOXX Europe 600 Energy Screened Acc Capitalization',
    price: 71.2,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LPHG.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Personal & Household Goods UCITS ETF',
    price: 142.28,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LRET.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Retail UCITS ETF',
    price: 50.7,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LRUS.DE',
    name: 'Lyxor MSCI Russia UCITS ETF Acc',
    price: 7.4,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LSK7.DE',
    name: 'Lyxor Euro Stoxx 50 Daily (-1x) Inverse UCITS ETF',
    price: 7.955,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LSK8.DE',
    name: 'Lyxor Euro Stoxx 50 Daily (-2x) Inverse UCITS ETF',
    price: 0.6116,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LSMC.DE',
    name: 'Amundi MSCI Semiconductors ESG Screened UCITS ETF',
    price: 56.99,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LTCM.DE',
    name: 'Lyxor Index Fund - Lyxor Stoxx Europe 600 Telecommunications UCITS ETF',
    price: 45.63,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LTUG.DE',
    name: 'Lyxor Index Fund - Lyxor Stoxx Europe 600 Technology UCITS ETF',
    price: 89.49,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LTUR.DE',
    name: 'Lyxor MSCI Turkey UCITS ETF',
    price: 39.67,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LTVL.DE',
    name: 'Amundi STOXX Europe 600 Consumer Discretionary UCITS ETF Unhedged- Capitalisation',
    price: 26.61,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LTWN.DE',
    name: 'Amundi MSCI Semiconductors ESG Screened UCITS ETF',
    price: 54.52,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LUTI.DE',
    name: 'Lyxor Index Fund - Lyxor Stoxx Europe 600 Utilities UCITS ETF',
    price: 77.11,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LWCR.DE',
    name: 'Amundi MSCI World Climate Transition CTB - UCITS ETF DR - EUR-C',
    price: 519,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYBF.DE',
    name: 'Lyxor ESG Euro Corporate Bond Ex Financials (DR) UCITS ETF',
    price: 126.03,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYBK.DE',
    name: 'Amundi Euro Stoxx Banks UCITS ETF Acc',
    price: 268.4,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LYEB.DE',
    name: 'Lyxor ESG Euro Corporate Bond UCITS ETF - Acc',
    price: 153.58,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYM7.DE',
    name: 'Lyxor MSCI Emerging Markets UCITS ETF',
    price: 13.679,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'LYM8.DE',
    name: 'Amundi MSCI Water ESG Screened UCITS ETF Dist',
    price: 68.7,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LYM9.DE',
    name: 'Amundi MSCI New Energy UCITS ETF Act Dist',
    price: 28.27,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LYMD.DE',
    name: 'Lyxor MSCI India UCITS ETF Acc EUR',
    price: 27.145,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LYMH.DE',
    name: 'Lyxor MSCI Greece UCITS ETF',
    price: 2.2525,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LYMS.DE',
    name: 'Amundi Nasdaq-100 II UCITS ETF Acc',
    price: 81.38,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'LYMZ.DE',
    name: 'Lyxor Euro Stoxx 50 Daily (2x) Leveraged UCITS ETF',
    price: 61.26,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LYP2.DE',
    name: 'Amundi S&P 500 II UCITS ETF EUR Hedged Dist',
    price: 317.62,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'LYP6.DE',
    name: 'Amundi STOXX Europe 600 ETF Acc- Capitalisation',
    price: 262.1,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LYPA.DE',
    name: 'Lyxor MSCI World Consumer Discretionary TR UCITS ETF',
    price: 436.05,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYPB.DE',
    name: 'Lyxor MSCI World Consumer Staples TR UCITS ETF - C-EUR',
    price: 396.7,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYPC.DE',
    name: 'Lyxor MSCI World Energy TR UCITS ETF - C-EUR',
    price: 367.55,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYPD.DE',
    name: 'Lyxor MSCI World Financials TR UCITS ETF',
    price: 340.25,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYPE.DE',
    name: 'Lyxor MSCI World Health Care TR UCITS ETF - C-EUR',
    price: 434.8,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYPF.DE',
    name: 'Lyxor MSCI World Industrials TR UCITS ETF',
    price: 440.3,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYPG.DE',
    name: 'Lyxor MSCI World Information Technology TR UCITS ETF',
    price: 880.9,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYPH.DE',
    name: 'Lyxor MSCI World Materials TR UCITS ETF - C-EUR',
    price: 472.8,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYPI.DE',
    name: 'Lyxor MSCI World Communication Services TR UCITS ETF',
    price: 143.4,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYPQ.DE',
    name: 'Lyxor MSCI World Utilities TR UCITS ETF',
    price: 272.65,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYPS.DE',
    name: 'Amundi S&P 500 II ETF Dist (EUR)- Distribution',
    price: 57.002,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'LYPU.DE',
    name: 'Lyxor Australia (S&P/ASX 200) UCITS ETF',
    price: 51.02,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'LYQ1.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond (DR) UCITS ETF',
    price: 163.145,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYQ2.DE',
    name: 'Amundi Euro Government Bond 1-3Y UCITS ETF Acc',
    price: 127.015,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYQ3.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 3-5Y (DR) UCITS ETF',
    price: 151.385,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYQ6.DE',
    name: 'Amundi Euro Government Bond 10-15Y UCITS ETF Acc',
    price: 197.005,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYQ7.DE',
    name: 'Lyxor Core Euro Government Inflation-Linked Bond (DR) UCITS ETF',
    price: 165.04,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYQK.DE',
    name: 'Lyxor Bund Daily (-2x) Inverse UCITS ETF',
    price: 43.401,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LYQL.DE',
    name: 'Amundi ShortDAX Daily (-2x) Inverse UCITS ETF',
    price: 0.5657,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'LYQS.DE',
    name: 'Amundi Index Solutions - Amundi J.P. Morgan USD Emerging Markets Bond UCITS ETF Dist',
    price: 68.716,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'LYQY.DE',
    name: 'Amundi Index Solution - Amundi EUR High Yield Corporate Bond ESG UCITS ETF Dist',
    price: 109.19,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYS4.DE',
    name: 'Lyxor EuroMTS Highest Rated Macro-Weighted Govt Bond 1-3Y (DR) UCITS ETF',
    price: 100.9,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYS5.DE',
    name: 'Lyxor EuroMTS Highest Rated Macro-Weighted Govt Bond 3-5Y (DR) UCITS ETF',
    price: 107.11,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYSX.DE',
    name: 'Lyxor Euro Stoxx 50 (DR) UCITS ETF Acc',
    price: 59.22,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LYTR.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Commodities Refinitiv/CoreCommodity CRB TR UCITS ETF',
    price: 23.685,
    issuer: 'Lyxor',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'LYX7.DE',
    name: 'Lyxor Core US Treasury 7-10Y (DR) UCITS ETF',
    price: 77.044,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYXA.DE',
    name: 'Amundi Euro Highest Rated Macro-Weighted Government Bond UCITS ETF Acc',
    price: 125.395,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYXC.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 5-7Y (DR) UCITS ETF - Acc',
    price: 159.015,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYXD.DE',
    name: 'Amundi Euro Government Bond 7-10Y UCITS ETF Acc',
    price: 167.495,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYXF.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 15+Y (DR) UCITS ETF - Acc',
    price: 171.47,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'LYXI.DE',
    name: 'Lyxor MSCI Indonesia UCITS ETF',
    price: 107.86,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'LYY0.DE',
    name: 'Lyxor Msci All Country World Ucits ETF',
    price: 494.4,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYY4.DE',
    name: 'Lyxor Japan (Topix) (DR) UCITS ETF Dist EUR',
    price: 173.735,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'LYY5.DE',
    name: 'Lyxor MSCI Europe (DR) UCITS ETF',
    price: 203.85,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'LYY7.DE',
    name: 'Amundi DAX III UCITS ETF Acc',
    price: 216.35,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'LYY8.DE',
    name: 'Amundi LevDax Daily (2x) leveraged UCITS ETF Acc',
    price: 242.6,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'LYY8.F',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor DAILY LevDAX UCITS ETF',
    price: 131.68,
    issuer: 'Lyxor',
    assetClass: 'Mixed',
    category: 'Germany'
  },
  {
    symbol: 'LYYA.DE',
    name: 'Lyxor MSCI World UCITS ETF Dist',
    price: 357.02,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'LYYB.DE',
    name: 'Amundi MSCI USA ESG Broad Transition UCITS ETF Dist',
    price: 515.2,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'M9SA.DE',
    name: 'Market Access Rogers International Commodity Index UCITS ETF',
    price: 26.915,
    issuer: 'Market',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'M9SD.DE',
    name: 'Market Access NYSE Arca Gold BUGS Index UCITS ETF',
    price: 189.02,
    issuer: 'Market',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'M9SV.DE',
    name: 'Market Access Stoxx China A Minimum Variance Index UCITS ETF',
    price: 135.02,
    issuer: 'Market',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'MACV.DE',
    name: 'BlackRock ESG Multi-Asset Conservative Portfolio UCITS ETF',
    price: 5.089,
    issuer: 'BlackRock',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'MAGR.DE',
    name: 'BlackRock ESG Multi-Asset Growth Portfolio UCITS ETF',
    price: 7.101,
    issuer: 'BlackRock',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'MD4X.DE',
    name: 'Amundi MDAX UCITS ETF Dist',
    price: 143.02,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'MDBA.DE',
    name: 'UBS (Lux) Fund Solutions – Sustainable Development Bank Bonds UCITS ETF',
    price: 10.548,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'MDBE.DE',
    name: 'UBS (Lux) Fund Solutions – Sustainable Development Bank Bonds UCITS ETF',
    price: 10.1215,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'MDBU.DE',
    name: 'UBS(Lux)Fund Solutions – Sustainable Development Bank Bonds UCITS ETF(USD)A-dis',
    price: 9.2774,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'MIVA.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Europe Minimum Volatility Factor',
    price: 149.46,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'MIVB.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Europe SRI UCITS ETF DR',
    price: 81.3,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'MIVU.DE',
    name: 'Amundi Index Solutions - Amundi MSCI USA Minimum Volatility Factor',
    price: 92.03,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'MJMT.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Europe Momentum Factor',
    price: 126.8,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'MKK1.DE',
    name: 'Expat Macedonia Mbi10 Ucits Etf',
    price: 2.5385,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'MKK1.F',
    name: 'Expat Macedonia Mbi10 Ucits Etf',
    price: 1.555,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'MODR.DE',
    name: 'BlackRock ESG Multi-Asset Moderate Portfolio UCITS ETF',
    price: 6.155,
    issuer: 'BlackRock',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'MOED.DE',
    name: 'BNP Paribas Easy ESG Equity Momentum Europe',
    price: 151.1,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'MOED.F',
    name: 'BNP Paribas Easy ESG Equity Momentum Europe',
    price: 115.66,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'MOEU.DE',
    name: 'BNP Paribas Easy Equity Momentum Europe UCITS ETF Cap',
    price: 192.7,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'MSED.DE',
    name: 'Lyxor EURO STOXX 50 (DR)',
    price: 226.85,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'MTDA.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe 600 Personal & Household Goods UCITS ETF',
    price: 202.7,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'MTDB.DE',
    name: 'Lyxor Index Fund - Lyxor Euro Stoxx 50 (DR)',
    price: 87.49,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'MTDD.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 7-10Y (DR) UCITS ETF',
    price: 155.325,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'MVEA.DE',
    name: 'iShares Edge MSCI USA Minimum Volatility ESG UCITS ETF',
    price: 7.231,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'MVEE.DE',
    name: 'iShares Edge MSCI Europe Minimum Volatility ESG UCITS ETF EUR (Acc)',
    price: 7.751,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'MVEE.F',
    name: 'iShares Edge MSCI Europe Minimum Volatility ESG UCITS ETF EUR (Acc)',
    price: 6.661,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'MVEW.DE',
    name: 'iShares Edge MSCI World Minimum Volatility ESG UCITS ETF USD (Acc)',
    price: 6.8,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'MWSH.DE',
    name: 'Amundi MSCI World SRI Climate Net Zero Ambition PAB UCITS ETF EUR Acc',
    price: 71.74,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'MWSH.F',
    name: 'Amundi MSCI World SRI Climate Net Zero Ambition PAB UCITS ETF EUR Acc',
    price: 59.53,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'MXUK.DE',
    name: 'Invesco MSCI Europe ex-UK UCITS ETF',
    price: 39.535,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'NADA.DE',
    name: 'Amundi MSCI Japan UCITS ETF 2',
    price: 70.57,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'NADB.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 10-15Y (DR) UCITS ETF',
    price: 139.105,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'NADB.F',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Euro Government Bond 10-15Y (DR) UCITS ETF',
    price: 137.41,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'NADQ.DE',
    name: 'Lyxor Nasdaq-100 Ucits ETF',
    price: 212.4,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'NK4L.DE',
    name: 'MULTI UNITS LUXEMBOURG–Lyxor Euro Floating Rate Note UCITS ETF',
    price: 101.605,
    issuer: 'Lyxor',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'NQSE.DE',
    name: 'iShares VII PLC - iShares NASDAQ 100 UCITS ETF',
    price: 13.844,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'NQSE.F',
    name: 'iShares VII PLC - iShares NASDAQ 100 UCITS ETF',
    price: 9.29,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'NS4E.DE',
    name: 'Invesco JPX-Nikkei 400 UCITS ETF',
    price: 33.86,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'OIGS.DE',
    name: 'Amundi STOXX Europe 600 Energy Screened Distribution',
    price: 98.05,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'OM3F.DE',
    name: 'iShares € Corp Bond ESG UCITS ETF',
    price: 4.7758,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'OM3L.DE',
    name: 'iShares MSCI USA ESG Enhanced UCITS ETF',
    price: 9.673,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'OM3M.DE',
    name: 'iShares VII PLC - iShares VII PLC - iShares $ Treasury Bond 3-7yr UCITS ETF',
    price: 4.1724,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'OM3M.F',
    name: 'iShares VII PLC - iShares VII PLC - iShares $ Treasury Bond 3-7yr UCITS ETF',
    price: 4.3995,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'OM3X.DE',
    name: 'iShares OMX Stockholm Capped UCITS ETF',
    price: 88.38,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'OM3Y.DE',
    name: 'iShares MSCI EM IMI ESG Screened UCITS ETF',
    price: 5.833,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'OPEN.DE',
    name: 'iShares Refinitiv Inclusion and Diversity UCITS ETF',
    price: 8.113,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'OSX2.DE',
    name: 'Ossiam US Minimum Variance ESG NR UCITS ETF',
    price: 287.55,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'OSX4.DE',
    name: 'Ossiam Europe ESG Machine Learning',
    price: 273.7,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'OSX6.DE',
    name: 'Ossiam STOXX Europe 600 Equal Weight NR UCITS ETF',
    price: 134.9,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'OSX9.DE',
    name: 'Ossiam Lux - Ossiam Emerging Markets Minimum Variance NR',
    price: 105.1,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'OSXC.DE',
    name: 'Ossiam Risk Weighted Enhanced Commodity Ex Grains TR UCITS ETF',
    price: 110.5,
    issuer: 'Ossiam',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'OSXF.DE',
    name: 'Ossiam Solactive Moody`s Analytics IG EUR Select Credit',
    price: 168.9,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'OSXM.DE',
    name: 'Ossiam Global Multi-Asset Risk-Control ETF',
    price: 253.7,
    issuer: 'Ossiam',
    assetClass: 'Mixed',
    category: 'Global'
  },
  {
    symbol: 'OUFE.DE',
    name: 'Ossiam US ESG Low Carbon Equity Factors UCITS ETF',
    price: 193.32,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'OUFE.F',
    name: 'Ossiam US ESG Low Carbon Equity Factors UCITS ETF',
    price: 155.08,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'OUFU.DE',
    name: 'Ossiam US ESG Low Carbon Equity Factors UCITS ETF',
    price: 201.45,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'OWLE.DE',
    name: 'OSSIAM World ESG Machine Learning UCITS ETF',
    price: 114.48,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'OWLU.DE',
    name: 'OSSIAM World ESG Machine Learning UCITS ETF',
    price: 111.66,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'P500.DE',
    name: 'Invesco S&P 500 UCITS ETF',
    price: 1098.4,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'PABC.F',
    name: 'Amundi Index Solutions - Amundi iCPR Euro Corp Climate Paris Aligned PAB',
    price: 44.729,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'PABV.F',
    name: 'Amundi MSCI World Climate Paris Aligned Pab Umwelt ETF',
    price: 44.11,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'PABW.DE',
    name: 'Amundi Index Solutions - Amundi MSCI World Climate Paris Aligned Pab',
    price: 79.4,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'PAC.DE',
    name: 'BNP Paribas Easy MSCI Pacific ex Japan ESG Filtered Min TE',
    price: 15.102,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'PAC5.F',
    name: 'BNP Paribas Funds - Climate Impact',
    price: 265.63,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'PAUD.F',
    name: 'Invesco MSCI World ESG Climate Paris Aligned UCITS ETF',
    price: 3.9585,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'PAUE.F',
    name: 'Invesco MSCI Europe ESG Climate Paris Aligned UCITS ETF',
    price: 4.5055,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'PAUJ.F',
    name: 'Invesco MSCI Japan ESG Climate Paris Aligned UCITS ETF',
    price: 3.7685,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'PAUS.F',
    name: 'Invesco MSCI USA ESG Climate Paris Aligned UCITS ETF',
    price: 4.0485,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'PDSE.DE',
    name: 'Invesco Preferred Shares UCITS ETF',
    price: 13.4645,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'PDSE.F',
    name: 'Invesco Preferred Shares UCITS ETF',
    price: 13.605,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'PJEU.DE',
    name: 'Invesco EuroMTS Cash 3 Months UCITS ETF',
    price: 107.225,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'PJS1.DE',
    name: 'PIMCO ETFs plc PIMCO Euro Short Maturity UCITS ETF',
    price: 98.056,
    issuer: 'PIMCO',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'PJSR.DE',
    name: 'PIMCO ETFs plc PIMCO Euro Short Maturity UCITS ETF',
    price: 105.435,
    issuer: 'PIMCO',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'PJSR.F',
    name: 'PIMCO ETFs plc PIMCO Euro Short Maturity UCITS ETF',
    price: 96.6,
    issuer: 'PIMCO',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'PLGS.DE',
    name: 'Leverage Shares -1x Short Plug Power ETC',
    price: 3.5608,
    issuer: 'Leverage',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'PLX.DE',
    name: 'Expat Poland WIG20 UCITS ETF',
    price: 0.772,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'PR1C.DE',
    name: 'Amundi Index Solutions - Amundi Prime Euro Corporates',
    price: 19.0935,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Corporate Bonds'
  },
  {
    symbol: 'PR1E.DE',
    name: 'Amundi Index Solutions - Amundi Prime Europe',
    price: 31.21,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'PR1E.F',
    name: 'Amundi Index Solutions - Amundi Prime Europe',
    price: 26.43,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'PR1G.DE',
    name: 'Amundi Index Solutions - Amundi Prime Global Govies',
    price: 16.6575,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'PR1H.DE',
    name: 'Amundi Index Solutions - Amundi Prime US Treasury Bond 0-1 Y UCITS ETF',
    price: 21.058,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'PR1J.DE',
    name: 'Amundi Index Solutions - Amundi Prime Japan',
    price: 29.74,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'PR1P.DE',
    name: 'Amundi Index Solutions - Amundi Prime US Corporates',
    price: 15.4775,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Corporate Bonds'
  },
  {
    symbol: 'PR1R.DE',
    name: 'Amundi Index Solutions - Amundi Prime Euro Govies UCITS ETF DR',
    price: 17.211,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'PR1S.DE',
    name: 'Amundi Index Solutions - Amundi Prime US Treasury UCITS ETF DR',
    price: 16.361,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'PR1U.DE',
    name: 'Amundi Index Solutions - Amundi Prime USA UCITS ETF DR',
    price: 35.435,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'PR1W.DE',
    name: 'Amundi Index Solutions - Amundi Prime Global UCITS ETF DR',
    price: 36.17,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'PR1Z.DE',
    name: 'Amundi Index Solutions - Amundi Prime Eurozone',
    price: 33.475,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'PRAB.F',
    name: 'Amundi Index Solutions - Amundi Prime Euro Govies Bonds 0-1Y',
    price: 21.072,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Mixed'
  },
  {
    symbol: 'PRAC.DE',
    name: 'Amundi Index Solutions - Amundi Prime Euro Corporates',
    price: 19.9305,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Corporate Bonds'
  },
  {
    symbol: 'PRAE.DE',
    name: 'Amundi Index Solutions - Amundi Prime Europe',
    price: 30.185,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'PRAG.DE',
    name: 'Amundi Index Solutions - Amundi Prime Global Govies',
    price: 17.093,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'PRAJ.DE',
    name: 'Amundi Index Solutions - Amundi Prime Japan',
    price: 28.85,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'PRAJ.F',
    name: 'Amundi Index Solutions - Amundi Prime Japan',
    price: 23.05,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'PRAP.DE',
    name: 'Amundi Index Solutions - Amundi Prime US Corporates',
    price: 18.077,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Corporate Bonds'
  },
  {
    symbol: 'PRAR.DE',
    name: 'Amundi Index Solutions - Amundi Prime Euro Govies',
    price: 17.826,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'PRAR.F',
    name: 'Amundi Index Solutions - Amundi Prime Euro Govies',
    price: 16.834,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'PRAS.DE',
    name: 'Amundi Index Solutions - Amundi Prime US Treasury',
    price: 17.1745,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Government Bonds'
  },
  {
    symbol: 'PRAS.F',
    name: 'Amundi Index Solutions - Amundi Prime US Treasury',
    price: 17.048,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Government Bonds'
  },
  {
    symbol: 'PRAU.DE',
    name: 'Amundi Index Solutions - Amundi Prime USA',
    price: 29.645,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'PRAU.F',
    name: 'Amundi Index Solutions - Amundi Prime USA',
    price: 25.39,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'PRAW.DE',
    name: 'Amundi Index Solutions - Amundi Prime Global',
    price: 31.945,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'PRAZ.DE',
    name: 'Amundi Index Solutions - Amundi Prime Eurozone',
    price: 31.58,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'PSFE.DE',
    name: 'Invesco Euro IG Corporate Bond ESG UCITS ETF',
    price: 18.617,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'PSWD.DE',
    name: 'Invesco FTSE RAFI All World 3000 UCITS ETF',
    price: 27.85,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'PUIG.DE',
    name: 'Invesco USD Corporate Bond ESG UCITS ETF',
    price: 15.9515,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'QDV5.DE',
    name: 'iShares MSCI India UCITS ETF',
    price: 8.128,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'QDVA.DE',
    name: 'iShares Edge MSCI USA Momentum Factor UCITS ETF USD (Acc)',
    price: 14.24,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVB.DE',
    name: 'iShares Edge MSCI USA Quality Factor UCITS ETF USD (Acc)',
    price: 13.52,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVC.DE',
    name: 'iShares Edge MSCI USA Size Factor UCITS ETF',
    price: 10.34,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVD.DE',
    name: 'iShares MSCI USA Quality Dividend ESG UCITS ETF',
    price: 47.025,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVE.DE',
    name: 'iShares V PLC - iShares S&P 500 Information Technology Sector UCITS ETF USD (Acc)',
    price: 32.83,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVF.DE',
    name: 'iShares V PLC - iShares S&P 500 Energy Sector UCITS ETF USD (Acc)',
    price: 7.901,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVG.DE',
    name: 'iShares V PLC - iShares S&P 500 Health Care Sector UCITS ETF USD (Acc)',
    price: 9.382,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVH.DE',
    name: 'iShares V PLC - iShares S&P 500 Financials Sector UCITS ETF USD (Acc)',
    price: 13.416,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVI.DE',
    name: 'iShares Edge MSCI USA Value Factor UCITS ETF USD (Acc)',
    price: 9.587,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVK.DE',
    name: 'iShares V PLC - iShares S&P 500 Consumer Discretionary Sector UCITS ETF USD (Acc)',
    price: 13.774,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVL.DE',
    name: 'iShares € Corp Bond 0-3yr ESG UCITS ETF',
    price: 5.0056,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'QDVN.DE',
    name: 'iShares MSCI Japan SRI EUR Hedged UCITS ETF',
    price: 13,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'QDVN.F',
    name: 'iShares MSCI Japan SRI EUR Hedged UCITS ETF',
    price: 9.135,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'QDVP.DE',
    name: 'iShares US Mortgage Backed Securities UCITS ETF USD (Dist)',
    price: 3.5727,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'QDVQ.DE',
    name: 'iShares Fallen Angels High Yield Corp Bond UCITS ETF',
    price: 4.7173,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'QDVR.DE',
    name: 'iShares MSCI USA SRI UCITS ETF USD (Acc)',
    price: 14.604,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'QDVS.DE',
    name: 'iShares MSCI EM SRI UCITS ETF',
    price: 7.368,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'QDVW.DE',
    name: 'iShares MSCI World Quality Dividend ESG UCITS ETF',
    price: 6.554,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'QDVX.DE',
    name: 'iShares MSCI Europe Quality Dividend ESG UCITS ETF',
    price: 6.199,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'QDVX.F',
    name: 'iShares MSCI Europe Quality Dividend ESG UCITS ETF',
    price: 5.426,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'QDVY.DE',
    name: 'iShares $ Floating Rate Bond UCITS ETF',
    price: 4.3655,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'QUED.DE',
    name: 'BNP Paribas Easy ESG Equity Quality Europe',
    price: 133.94,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'QUEU.DE',
    name: 'BNP Paribas Easy ESG Equity Quality Europe',
    price: 172.8,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'QVMP.DE',
    name: 'Invesco S&P 500 QVM UCITS ETF',
    price: 57.33,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'RA7Z.F',
    name: 'Global X Solar UCITS ETF',
    price: 13.48,
    issuer: 'Global',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'RCRS.DE',
    name: 'Rize UCITS ICAV - Rize Cybersecurity Data Privacy UCITS ETF',
    price: 7.604,
    issuer: 'Rize',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'REAL.DE',
    name: 'Amundi Index Solutions - Amundi FTSE EPRA Europe Real Estate',
    price: 293.25,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'RENW.DE',
    name: 'L&G Clean Energy UCITS ETF',
    price: 10.156,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'RIZF.DE',
    name: 'Rize Sustainable Future of Food UCITS ETF',
    price: 3.3635,
    issuer: 'Rize',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'RM8U.DE',
    name: 'The Royal Mint Physical Gold ETC Securities',
    price: 15.544,
    issuer: 'The',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'ROAI.DE',
    name: 'Lyxor MSCI Robotics & AI ESG Filtered UCITS ETF',
    price: 28.835,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ROX.DE',
    name: 'Expat Romania BET - BK UCITS ETF',
    price: 2.493,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'RQFI.DE',
    name: 'Xtrackers Harvest CSI300 UCITS ETF',
    price: 10.416,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'RS2K.DE',
    name: 'Amundi Index Solutions - Amundi Russell 2000',
    price: 301.2,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'RXRGEX.DE',
    name: 'iShares eb.rexx Government Germany UCITS ETF (DE)',
    price: 121.68,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'S0LR.F',
    name: 'Invesco Solar Energy UCITS ETF',
    price: 33.205,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'S5SD.DE',
    name: 'UBS (Irl) ETF plc - S&P 500 ESG UCITS ETF',
    price: 37.155,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'S5SG.DE',
    name: 'UBS (Irl) ETF plc - S&P 500 ESG UCITS ETF Hedged to EUR A Acc',
    price: 35.795,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'S6DW.DE',
    name: 'iShares MSCI World ESG Screened UCITS ETF',
    price: 8.904,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'S6X0.DE',
    name: 'Invesco EURO STOXX 50 UCITS ETF',
    price: 51.85,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'S7XE.DE',
    name: 'Invesco EURO STOXX Optimised Banks UCITS ETF',
    price: 167.32,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'S7XE.F',
    name: 'Invesco EURO STOXX Optimised Banks UCITS ETF',
    price: 72.91,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SADE.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Europe ESG Leaders Select',
    price: 75.42,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SADH.F',
    name: 'Amundi Index Solutions - Amundi MSCI USA ESG Leaders Select',
    price: 61.48,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SADM.DE',
    name: 'Amundi Index Solutions - Amundi MSCI Emerging ESG Leaders',
    price: 58.7,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SADU.F',
    name: 'Amundi Index Solutions - Amundi MSCI USA ESG Leaders Select Ucits ETF DR Cap',
    price: 72.65,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SBIE.F',
    name: 'Amundi Index Solutions - Amundi MSCI Europe ESG Universal Select',
    price: 74.71,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SBIU.DE',
    name: 'Amundi Index Solutions - Amundi MSCI USA ESG Universal Select',
    price: 84.18,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SBIU.F',
    name: 'Amundi Index Solutions - Amundi MSCI USA ESG Universal Select',
    price: 71.55,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SBIW.F',
    name: 'Amundi Index Solutions - Amundi MSCI World ESG Universal Select',
    price: 69.51,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SBU3.DE',
    name: 'WisdomTree Bund 10Y 3x Daily Short',
    price: 35.488,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'SC00.DE',
    name: 'Invesco STOXX Europe 600 Optimised Chemicals UCITS ETF',
    price: 575.3,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC00.F',
    name: 'Invesco STOXX Europe 600 Optimised Chemicals UCITS ETF',
    price: 567.4,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC01.DE',
    name: 'Invesco STOXX Europe 600 Optimised Construction & Materials UCITS ETF',
    price: 683.5,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC01.F',
    name: 'Invesco STOXX Europe 600 Optimised Construction & Materials UCITS ETF',
    price: 484.65,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC02.DE',
    name: 'Invesco STOXX Europe 600 Optimised Financial Services UCITS ETF',
    price: 463.65,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC02.F',
    name: 'Invesco STOXX Europe 600 Optimised Financial Services UCITS ETF',
    price: 305.45,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC03.DE',
    name: 'Invesco STOXX Europe 600 Optimised Food & Beverage UCITS ETF',
    price: 390.15,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC03.F',
    name: 'Invesco STOXX Europe 600 Optimised Food & Beverage UCITS ETF',
    price: 446.7,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC04.DE',
    name: 'Invesco STOXX Europe 600 Optimised Personal & Household Goods UCITS ETF',
    price: 706.1,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC04.F',
    name: 'Invesco STOXX Europe 600 Optimised Personal & Household Goods UCITS ETF',
    price: 687.1,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC05.DE',
    name: 'Invesco STOXX Europe 600 Optimised Retail UCITS ETF',
    price: 223.6,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC05.F',
    name: 'Invesco STOXX Europe 600 Optimised Retail UCITS ETF',
    price: 196.96,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC06.DE',
    name: 'Invesco STOXX Europe 600 Optimised Media UCITS ETF',
    price: 170.4,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC06.F',
    name: 'Invesco STOXX Europe 600 Optimised Media UCITS ETF',
    price: 144.4,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0C.DE',
    name: 'Invesco STOXX Europe 600 UCITS ETF',
    price: 136.56,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0C.F',
    name: 'Invesco STOXX Europe 600 UCITS ETF',
    price: 107.88,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0D.DE',
    name: 'Invesco EURO STOXX 50 UCITS ETF',
    price: 135.86,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SC0E.DE',
    name: 'Invesco MSCI Europe UCITS ETF',
    price: 369.65,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0F.DE',
    name: 'Invesco STOXX Europe Small 200 UCITS ETF',
    price: 63.43,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0G.DE',
    name: 'Invesco STOXX Europe Mid 200 UCITS ETF',
    price: 102.58,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0H.DE',
    name: 'Invesco MSCI USA UCITS ETF',
    price: 161.53,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SC0I.DE',
    name: 'Invesco MSCI Japan UCITS ETF',
    price: 80.284,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'SC0I.F',
    name: 'Invesco MSCI Japan UCITS ETF',
    price: 64.598,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'SC0J.DE',
    name: 'Invesco MSCI World UCITS ETF',
    price: 112.355,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SC0J.F',
    name: 'Invesco MSCI World UCITS ETF',
    price: 82.656,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SC0K.DE',
    name: 'Invesco Russell 2000 UCITS ETF',
    price: 102.48,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SC0P.DE',
    name: 'Invesco STOXX Europe 600 Optimised Automobiles & Parts UCITS ETF',
    price: 462.25,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0P.F',
    name: 'Invesco STOXX Europe 600 Optimised Automobiles & Parts UCITS ETF',
    price: 518.8,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0Q.DE',
    name: 'Invesco STOXX Europe 600 Optimised Telecommunications UCITS ETF',
    price: 119.6,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0Q.F',
    name: 'Invesco STOXX Europe 600 Optimised Telecommunications UCITS ETF',
    price: 87,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0R.DE',
    name: 'Invesco STOXX Europe 600 Optimised Travel & Leisure UCITS ETF',
    price: 267.55,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0R.F',
    name: 'Invesco STOXX Europe 600 Optimised Travel & Leisure UCITS ETF',
    price: 229.1,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0S.DE',
    name: 'Invesco STOXX Europe 600 Optimised Industrial Goods & Services UCITS ETF',
    price: 495.55,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0S.F',
    name: 'Invesco STOXX Europe 600 Optimised Industrial Goods & Services UCITS ETF',
    price: 337.1,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0T.DE',
    name: 'Invesco STOXX Europe 600 Optimised Health Care UCITS ETF',
    price: 391.55,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0T.F',
    name: 'Invesco STOXX Europe 600 Optimised Health Care UCITS ETF',
    price: 362.35,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0U.DE',
    name: 'Invesco STOXX Europe 600 Optimised Banks UCITS ETF',
    price: 169.54,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0U.F',
    name: 'Invesco STOXX Europe 600 Optimised Banks UCITS ETF',
    price: 77.19,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0V.DE',
    name: 'Invesco STOXX Europe 600 Optimised Oil & Gas UCITS ETF',
    price: 289.2,
    issuer: 'Invesco',
    assetClass: 'Commodity',
    category: 'Europe'
  },
  {
    symbol: 'SC0V.F',
    name: 'Invesco STOXX Europe 600 Optimised Oil & Gas UCITS ETF',
    price: 234.85,
    issuer: 'Invesco',
    assetClass: 'Commodity',
    category: 'Europe'
  },
  {
    symbol: 'SC0W.DE',
    name: 'Invesco STOXX Europe 600 Optimised Basic Resources UCITS ETF',
    price: 528.8,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0X.DE',
    name: 'Invesco STOXX Europe 600 Optimised Technology UCITS ETF',
    price: 131.82,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0X.F',
    name: 'Invesco STOXX Europe 600 Optimised Technology UCITS ETF',
    price: 117.6,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0Y.DE',
    name: 'Invesco STOXX Europe 600 Optimised Insurance UCITS ETF',
    price: 218.6,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0Y.F',
    name: 'Invesco STOXX Europe 600 Optimised Insurance UCITS ETF',
    price: 138.06,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SC0Z.DE',
    name: 'Invesco STOXX Europe 600 Optimised Utilities UCITS ETF',
    price: 306.75,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SDIE.DE',
    name: 'Leverage Shares PLC E',
    price: 4.8152,
    issuer: 'Leverage',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'SEAA.DE',
    name: 'UBS (Lux) Fund Solutions – J.P. Morgan USD EM Diversified Bond 1-5 UCITS ETF',
    price: 9.3388,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SEAA.F',
    name: 'UBS (Lux) Fund Solutions – J.P. Morgan USD EM Diversified Bond 1-5 UCITS ETF',
    price: 9.5332,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SEAB.DE',
    name: 'UBS (Lux) Fund Solutions – J.P. Morgan USD EM Diversified Bond 1-5 UCITS ETF',
    price: 12.4035,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SEAC.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI World Socially Responsible UCITS ETF',
    price: 30.49,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SEC0.F',
    name: 'iShares MSCI Global Semiconductors UCITS ETF',
    price: 5.051,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SECA.DE',
    name: 'iShares € Govt Bond Climate UCITS ETF',
    price: 4.331,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SECD.DE',
    name: 'iShares € Govt Bond Climate UCITS ETF EUR (Dist)',
    price: 4.0697,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SECD.F',
    name: 'IShares III Public Limited Company - IShares Global Government Bond Climate UCITS ETF',
    price: 4.1582,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'SELD.DE',
    name: 'Lyxor Index Fund - Lyxor STOXX Europe Select Dividend 30 UCITS ETF',
    price: 19.476,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SGAJ.DE',
    name: 'iShares MSCI Japan ESG Screened UCITS ETF',
    price: 6.609,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'SGAS.DE',
    name: 'iShares MSCI USA ESG Screened UCITS ETF',
    price: 11.418,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SJD.DE',
    name: 'Leverage Shares PLC E',
    price: 2.457,
    issuer: 'Leverage',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'SK9A.DE',
    name: 'Expat Slovakia Sax UCITS ETF',
    price: 0.4799,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SLMA.DE',
    name: 'iShares MSCI EMU ESG Screened UCITS ETF EUR (Acc)',
    price: 9.274,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SLMB.DE',
    name: 'iShares MSCI EMU ESG Screened UCITS ETF',
    price: 7.768,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SLMC.DE',
    name: 'iShares MSCI Europe ESG Screened UCITS ETF EUR (Acc)',
    price: 9.149,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SLMD.DE',
    name: 'iShares MSCI Europe ESG Screened UCITS ETF',
    price: 7.647,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SLMG.DE',
    name: 'iShares J.P. Morgan ESG $ EM Bond UCITS ETF',
    price: 4.7414,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SLQX.DE',
    name: 'Expat Slovenia SBI Top UCITS ETF',
    price: 2.709,
    issuer: 'Expat',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SLUS.DE',
    name: 'iShares MSCI USA ESG Screened UCITS ETF',
    price: 10.574,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SLVR.F',
    name: 'Global X Silver Miners UCITS ETF',
    price: 10.802,
    issuer: 'Global',
    assetClass: 'Commodity',
    category: 'Global'
  },
  {
    symbol: 'SM8T.DE',
    name: 'Amundi Index Solutions - Amundi Index Equity Global Multi Smart Allocation Scientific Beta',
    price: 670.1,
    issuer: 'Amundi',
    assetClass: 'Mixed',
    category: 'Global'
  },
  {
    symbol: 'SMLD.DE',
    name: 'Invesco Morningstar US Energy Infrastructure MLP UCITS ETF',
    price: 44.275,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SMLN.DE',
    name: 'Invesco JPX-Nikkei 400 UCITS ETF',
    price: 196.22,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'SMLP.DE',
    name: 'Invesco Morningstar US Energy Infrastructure MLP UCITS ETF',
    price: 118.28,
    issuer: 'Invesco',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SMLU.DE',
    name: 'Invesco Goldman Sachs Equity Factor Index Europe UCITS ETF',
    price: 175.62,
    issuer: 'Invesco',
    assetClass: 'Commodity',
    category: 'Europe'
  },
  {
    symbol: 'SMLW.DE',
    name: 'Invesco Goldman Sachs Equity Factor Index World UCITS ETF',
    price: 164.86,
    issuer: 'Invesco',
    assetClass: 'Commodity',
    category: 'Global'
  },
  {
    symbol: 'SMRE.DE',
    name: 'Amundi Index Solutions - Amundi Europe Equity Multi Smart Allocation Scientific Beta',
    price: 48.905,
    issuer: 'Amundi',
    assetClass: 'Mixed',
    category: 'Europe'
  },
  {
    symbol: 'SMRN.DE',
    name: 'Amundi ETF iStoxx Europe Multi-Factor Market Neutral UCITS ETF',
    price: 20.175,
    issuer: 'Amundi',
    assetClass: 'Mixed',
    category: 'Europe'
  },
  {
    symbol: 'SNA2.DE',
    name: 'iShares $ Treasury Bond UCITS ETF',
    price: 3.7263,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SNAV.DE',
    name: 'iShares $ Corp Bond SRI 0-3yr UCITS ETF USD (Dist)',
    price: 4.3402,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SNAW.DE',
    name: 'iShares MSCI World ESG Screened UCITS ETF USD (Acc)',
    price: 9.837,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SNAZ.DE',
    name: 'iShares V PLC - iShares J.P. Morgan $ EM Corp Bond UCITS ETF',
    price: 5.021,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SODJ.DE',
    name: 'iShares MSCI Japan ESG Screened UCITS ETF',
    price: 5.859,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'SPF1.DE',
    name: 'SPDR Refinitiv Global Convertible Bond UCITS ETF',
    price: 43.772,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'SPF2.DE',
    name: 'SPDR Refinitiv Global Convertible Bond UCITS ETF',
    price: 36.846,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'SPF5.F',
    name: 'SPDR MSCI Europe Climate Paris Aligned UCITS ETF',
    price: 10.926,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPF6.F',
    name: 'SPDR MSCI Japan Climate Paris Aligned UCITS ETF',
    price: 7.605,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'SPFA.DE',
    name: 'SPDR Bloomberg Emerging Markets Local Bond USD Base CCY Hdg to EUR UCITS ETF Acc',
    price: 29.298,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SPFB.DE',
    name: 'SPDR Bloomberg Barclays Global Aggregate Bond UCITS ETF GBP Hedged',
    price: 28.343,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'SPFD.DE',
    name: 'SPDR Bloomberg Emerging Markets Local Bond USD Base CCY Hdg to EUR UCITS ETF Acc',
    price: 27.614,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SPFE.DE',
    name: 'SPDR Bloomberg Barclays Global Aggregate Bond UCITS ETF EUR Hedged',
    price: 26.052,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'SPFU.DE',
    name: 'SPDR Bloomberg Global Aggregate Bond USD Hdg UCITS ETF Acc',
    price: 30.247,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'SPFV.DE',
    name: 'SPDR Bloomberg Global Aggregate Bond USD Hdg UCITS ETF Acc',
    price: 31.061,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'SPFW.F',
    name: 'SPDR MSCI World Climate Paris Aligned UCITS ETF',
    price: 9.331,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SPP1.DE',
    name: 'SPDR MSCI ACWI UCITS ETF',
    price: 22.265,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SPP3.DE',
    name: 'SPDR Bloomberg 3-7 Year U.S. Treasury Bond UCITS ETF',
    price: 24.166,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SPP7.DE',
    name: 'SPDR Bloomberg 7-10 Year U.S. Treasury Bond UCITS ETF',
    price: 22.187,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SPP8.F',
    name: 'SSGA SPDR ETFs Europe I Plc - SPDR Bloomberg Barclays China Treasury Bond UCITS ETF',
    price: 25.825,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Europe'
  },
  {
    symbol: 'SPPD.DE',
    name: 'SPDR S&P US Dividend Aristocrats UCITS ETF',
    price: 8.504,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SPPE.DE',
    name: 'SPDR S&P 500 UCITS ETF',
    price: 15.7955,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SPPQ.F',
    name: 'SPDR Bloomberg SASB U.S. High Yield Corporate ESG UCITS ETF',
    price: 28.651,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SPPR.F',
    name: 'SPDR Bloomberg SASB Euro Corporate ESG UCITS ETF',
    price: 26.443,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SPPW.DE',
    name: 'SPDR MSCI World UCITS ETF',
    price: 38.222,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SPPX.DE',
    name: 'SPDR Bloomberg 10+ Year U.S. Treasury Bond UCITS ETF',
    price: 17.747,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SPPY.DE',
    name: 'SPDR S&P 500 ESG Leaders UCITS ETF',
    price: 39.48,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SPY1.DE',
    name: 'SPDR S&P 500 Low Volatility UCITS ETF',
    price: 70.55,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SPY2.DE',
    name: 'SPDR Dow Jones Global Real Estate UCITS ETF',
    price: 17.438,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SPY4.DE',
    name: 'SPDR S&P 400 US Mid Cap UCITS ETF',
    price: 85.69,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SPY5.DE',
    name: 'SPDR S&P 500 UCITS ETF',
    price: 553.24,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SPYA.DE',
    name: 'SPDR MSCI EM Asia UCITS ETF',
    price: 79.84,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SPYC.DE',
    name: 'SPDR MSCI Europe Consumer Staples UCITS ETF',
    price: 225.75,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPYD.DE',
    name: 'SPDR S&P US Dividend Aristocrats UCITS ETF',
    price: 66.41,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SPYE.DE',
    name: 'SPDR MSCI Europe UCITS ETF',
    price: 338.9,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPYF.DE',
    name: 'SPDR FTSE UK All Share UCITS ETF Acc',
    price: 89.04,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SPYG.DE',
    name: 'SPDR S&P UK Dividend Aristocrats UCITS ETF',
    price: 13.402,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SPYH.DE',
    name: 'SPDR MSCI Europe Health Care UCITS ETF',
    price: 207.3,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPYI.DE',
    name: 'SPDR MSCI ACWI IMI UCITS ETF',
    price: 232.45,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SPYJ.DE',
    name: 'SPDR Dow Jones Global Real Estate UCITS ETF',
    price: 29.575,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SPYK.DE',
    name: 'SPDR MSCI Europe Technology UCITS ETF',
    price: 124.94,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPYM.DE',
    name: 'SPDR MSCI Emerging Markets UCITS ETF',
    price: 65.604,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SPYN.DE',
    name: 'SPDR MSCI Europe Energy UCITS ETF',
    price: 205.3,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPYP.DE',
    name: 'SPDR MSCI Europe Materials UCITS ETF',
    price: 300.35,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPYQ.DE',
    name: 'SPDR MSCI Europe Industrials UCITS ETF',
    price: 379.05,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPYR.DE',
    name: 'SPDR MSCI Europe Consumer Discretionary UCITS ETF',
    price: 162.58,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPYT.DE',
    name: 'SPDR MSCI Europe Communication Services UCITS ETF',
    price: 78.69,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPYU.DE',
    name: 'SPDR MSCI Europe Utilities UCITS ETF',
    price: 193.2,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SPYV.DE',
    name: 'SPDR S&P Emerging Markets Dividend Aristocrats UCITS ETF',
    price: 13.99,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SPYW.DE',
    name: 'SPDR S&P Euro Dividend Aristocrats UCITS ETF',
    price: 26.98,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SPYX.DE',
    name: 'SPDR MSCI Emerging Markets Small Cap UCITS ETF',
    price: 114.8,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SPYY.DE',
    name: 'SPDR MSCI ACWI UCITS ETF',
    price: 230.3,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SPYZ.DE',
    name: 'SPDR MSCI Europe Financials UCITS ETF',
    price: 119.74,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SRHE.DE',
    name: 'Amundi Index Solutions - Amundi Index MSCI EMU SRI PAB',
    price: 90.27,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'STXH.DE',
    name: 'Amundi Stoxx Europe 600 UCITS ETF Monthly Hedged to EUR D',
    price: 142.42,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SUA0.DE',
    name: 'iShares € Corp Bond ESG UCITS ETF EUR (Acc)',
    price: 5.3242,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SX3PEX.DE',
    name: 'iShares STOXX Europe 600 Food & Beverage UCITS ETF (DE)',
    price: 70.9,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SX4PEX.DE',
    name: 'iShares STOXX Europe 600 Chemicals UCITS ETF (DE)',
    price: 130.86,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SX6PEX.DE',
    name: 'iShares STOXX Europe 600 Utilities UCITS ETF (DE)',
    price: 37.5,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SX7EEX.DE',
    name: 'iShares EURO STOXX Banks 30-15 UCITS ETF (DE)',
    price: 14.14,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SX7PEX.DE',
    name: 'iShares STOXX Europe 600 Banks UCITS ETF (DE)',
    price: undefined,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SX8PEX.DE',
    name: 'iShares STOXX Europe 600 Technology UCITS ETF (DE)',
    price: 78.43,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXAPEX.DE',
    name: 'iShares STOXX Europe 600 Automobiles & Parts UCITS ETF (DE)',
    price: 64.87,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXDPEX.DE',
    name: 'iShares STOXX Europe 600 Health Care UCITS ETF (DE)',
    price: 113.78,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXEPEX.DE',
    name: 'iShares STOXX Europe 600 Oil & Gas UCITS ETF (DE)',
    price: 38.6,
    issuer: 'iShares',
    assetClass: 'Commodity',
    category: 'Europe'
  },
  {
    symbol: 'SXFPEX.DE',
    name: 'iShares STOXX Europe 600 Financial Services UCITS ETF (DE)',
    price: 71.61,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXIPEX.DE',
    name: 'iShares STOXX Europe 600 Insurance UCITS ETF (DE)',
    price: 37.41,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXKPEX.DE',
    name: 'iShares STOXX Europe 600 Telecommunications UCITS ETF (DE)',
    price: 18.86,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXMPEX.DE',
    name: 'iShares STOXX Europe 600 Media UCITS ETF (DE)',
    price: 38.71,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXNPEX.DE',
    name: 'iShares STOXX Europe 600 Industrial Goods & Services UCITS ETF (DE)',
    price: 84.39,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXOPEX.DE',
    name: 'iShares STOXX Europe 600 Construction & Materials UCITS ETF (DE)',
    price: 70.65,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXPPEX.DE',
    name: 'iShares STOXX Europe 600 Basic Resources UCITS ETF (DE)',
    price: 58.49,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXQPEX.DE',
    name: 'iShares STOXX Europe 600 Personal & Household Goods UCITS ETF (DE)',
    price: 101.42,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXR0.DE',
    name: 'iShares Edge MSCI World Minimum Volatility UCITS ETF',
    price: 8.349,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'SXR1.DE',
    name: 'iShares VII PLC - iShares Core MSCI Pacific ex-Japan UCITS ETF',
    price: 184.78,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'SXR2.DE',
    name: 'iShares VII PLC - iShares MSCI Canada UCITS ETF',
    price: 214.15,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SXR3.DE',
    name: 'iShares VII PLC - iShares MSCI UK UCITS ETF GBP (Acc)',
    price: 193.68,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SXR4.DE',
    name: 'iShares VII PLC - iShares MSCI USA UCITS ETF USD (Acc)',
    price: 569.8,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SXR5.DE',
    name: 'iShares VII PLC - iShares MSCI Japan UCITS ETF USD (Acc)',
    price: 197.29,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'SXR6.DE',
    name: 'iShares MSCI Japan SRI UCITS ETF',
    price: 6.709,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'SXR7.DE',
    name: 'iShares VII PLC -iShares Core MSCI EMU UCITS ETF EUR (Acc)',
    price: 200.6,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SXR8.DE',
    name: 'iShares Core S&P 500 UCITS ETF USD (Acc)',
    price: 590.46,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SXRD.DE',
    name: 'iShares VII PLC - iShares MSCI UK Small Cap UCITS ETF GBP (Acc)',
    price: 281.4,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SXRF.DE',
    name: 'iShares $ Intermediate Credit Bond UCITS ETF',
    price: 4.207,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SXRG.DE',
    name: 'iShares VII PLC - iShares MSCI USA Small Cap ESG Enhanced UCITS ETF USD (Acc)',
    price: 480.35,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SXRH.DE',
    name: 'iShares $ TIPS 0-5 UCITS ETF USD (Dist)',
    price: 4.3498,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SXRJ.DE',
    name: 'iShares VII PLC - iShares MSCI EMU Small Cap UCITS ETF EUR (Acc)',
    price: 317.2,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SXRL.DE',
    name: 'iShares $ Treasury Bond 3-7yr UCITS ETF USD (Acc)',
    price: 141.05,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SXRM.DE',
    name: 'iShares VII PLC - iShares $ Treasury Bond 7-10yr UCITS ETF USD (Acc)',
    price: 151.45,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SXRP.DE',
    name: 'iShares VII PLC - iShares € Govt Bond 3-7yr UCITS ETF EUR (Acc)',
    price: 133.015,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SXRPEX.DE',
    name: 'iShares STOXX Europe 600 Retail UCITS ETF (DE)',
    price: 41.76,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SXRQ.DE',
    name: 'iShares VII PLC - iShares € Govt Bond 7-10yr UCITS ETF EUR (Acc)',
    price: 151.255,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SXRR.DE',
    name: 'iShares $ Floating Rate Bond UCITS ETF',
    price: 4.3548,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SXRS.DE',
    name: 'iShares Diversified Commodity Swap UCITS ETF',
    price: 6.37,
    issuer: 'iShares',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'SXRT.DE',
    name: 'iShares VII PLC - iShares Core EURO STOXX 50 UCITS ETF',
    price: 202.55,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SXRU.DE',
    name: 'iShares VII PLC - iShares Dow Jones Industrial Average UCITS ETF',
    price: 468.5,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SXRV.DE',
    name: 'iShares NASDAQ 100 UCITS ETF USD (Acc)',
    price: 1150.6,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'SXRW.DE',
    name: 'iShares VII PLC - iShares Core FTSE 100 UCITS ETF',
    price: 209.95,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SXRY.DE',
    name: 'iShares VII PLC - iShares FTSE MIB UCITS ETF EUR (Acc)',
    price: 199.68,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SXRZ.DE',
    name: 'iShares VII PLC - iShares Nikkei 225 UCITS ETF JPY (Acc)',
    price: 246.55,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'SXTPEX.DE',
    name: 'iShares STOXX Europe 600 Travel & Leisure UCITS ETF (DE)',
    price: 23.05,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'SYB3.DE',
    name: 'SPDR Bloomberg 1-3 Year Euro Government Bond UCITS ETF',
    price: 52.412,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYB4.DE',
    name: 'SPDR Bloomberg 3-5 Year Euro Government Bond UCITS ETF',
    price: 29.248,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYB4.F',
    name: 'SPDR Bloomberg 3-5 Year Euro Government Bond UCITS ETF',
    price: 28.332,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYB5.DE',
    name: 'SPDR Bloomberg 1-5 Year Gilt UCITS ETF',
    price: 55.91,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SYBA.DE',
    name: 'SPDR Bloomberg Euro Aggregate Bond UCITS ETF',
    price: 54.462,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBB.DE',
    name: 'SPDR Bloomberg Euro Government Bond UCITS ETF Acc',
    price: 55.896,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBB.F',
    name: 'SPDR Bloomberg Euro Government Bond UCITS ETF Acc',
    price: 54.92,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBC.DE',
    name: 'SPDR Bloomberg Euro Corporate Bond UCITS ETF',
    price: 53.342,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBD.DE',
    name: 'SPDR Bloomberg 0-3 Year Euro Corporate Bond UCITS ETF',
    price: 30.017,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBF.DE',
    name: 'SPDR Bloomberg 0-3 Year U.S. Corporate Bond UCITS ETF',
    price: 42.575,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBG.DE',
    name: 'SPDR Bloomberg UK Gilt UCITS ETF',
    price: 47.706,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SYBI.DE',
    name: 'SPDR Bloomberg EM Inflation Linked Local Bond UCITS ETF Dist',
    price: 42.002,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SYBJ.DE',
    name: 'SPDR Bloomberg Euro High Yield Bond UCITS ETF',
    price: 51.59,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBK.DE',
    name: 'SPDR Bloomberg SASB U.S. High Yield Corporate ESG UCITS ETF',
    price: 35.272,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SYBL.DE',
    name: 'SPDR Bloomberg 15+ Year Gilt UCITS ETF',
    price: 38.476,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SYBM.DE',
    name: 'SPDR Bloomberg Barclays Emerging Markets Local Bond UCITS ETF (Dist)',
    price: 49.778,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'SYBN.DE',
    name: 'SPDR Bloomberg 10+ Year U.S. Corporate Bond UCITS ETF',
    price: 22.526,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBQ.DE',
    name: 'SPDR Bloomberg 0-5 Year Sterling Corporate Bond UCITS ETF',
    price: 33.414,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBR.DE',
    name: 'SPDR Bloomberg 1-10 Year U.S. Corporate Bond UCITS ETF',
    price: 25.713,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBS.DE',
    name: 'SPDR Bloomberg Sterling Corporate Bond UCITS ETF',
    price: 58.03,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBT.DE',
    name: 'SPDR Bloomberg U.S. Treasury Bond UCITS ETF',
    price: 83.12,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBU.DE',
    name: 'SPDR Bloomberg U.S. Aggregate Bond UCITS ETF',
    price: 81.026,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBV.DE',
    name: 'SPDR Bloomberg 10+ Year Euro Government Bond UCITS ETF',
    price: 22.666,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBW.DE',
    name: 'SPDR Bloomberg 1-3 Year U.S. Treasury Bond UCITS ETF',
    price: 41.41,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'SYBY.DE',
    name: 'SPDR Bloomberg U.S. TIPS UCITS ETF',
    price: 24.868,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'SYBZ.DE',
    name: 'SPDR Bloomberg Global Aggregate Bond USD Hdg UCITS ETF Acc',
    price: 22.181,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'T1EU.DE',
    name: 'Invesco US Treasury Bond 0-1 Year UCITS ETF',
    price: 43.064,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'T1EU.F',
    name: 'Invesco US Treasury Bond 0-1 Year UCITS ETF',
    price: 40.244,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'T3KE.DE',
    name: 'HAN-GINS Tech Megatrend Equal Weight UCITS ETF',
    price: 14.51,
    issuer: 'HAN-GINS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'T3RE.F',
    name: 'Invesco US Treasury Bond 1-3 Year UCITS ETF',
    price: 36.395,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'T6ET.DE',
    name: 'VanEck Vectors ETFs N.V. - VanEck Vectors Global Equal Weight UCITS ETF',
    price: 26.37,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'T7EU.DE',
    name: 'Invesco US Treasury Bond 3-7 Year UCITS ETF',
    price: 34.121,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TAB1.DE',
    name: 'Tabula Us Enhanced Inflation UCITS ETF',
    price: 111.3,
    issuer: 'Tabula',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'TABC.F',
    name: 'Tabula EUR IG Bond Paris-aligned Climate UCITS ETF (EUR)',
    price: 8.7482,
    issuer: 'Tabula',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TABD.DE',
    name: 'Tabula European Performance Credit UCITS ETF (EUR) Class G EUR Distributing',
    price: 99.298,
    issuer: 'Tabula',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'TABX.DE',
    name: 'Tabula iTraxx IG Bond Index UCITS ETF (EUR)',
    price: 88.45,
    issuer: 'Tabula',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TCBT.DE',
    name: 'VanEck iBoxx EUR Corporates UCITS ETF',
    price: 17.068,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'TCC4.DE',
    name: 'Amundi Index Solutions - Amundi EURO Corporates {d}',
    price: 224.9,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Corporate Bonds'
  },
  {
    symbol: 'TCRS.DE',
    name: 'Tabula Global IG Credit Curve Steepener UCITS ETF (EUR)',
    price: 110.32,
    issuer: 'Tabula',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'TGBT.DE',
    name: 'VanEck iBoxx EUR Sovereign Diversified 1-10 UCITS ETF',
    price: 12.346,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'THEP.F',
    name: 'Tabula EUR HY Bond Paris-Aligned Climate UCITS ETF (EUR)',
    price: 9.1448,
    issuer: 'Tabula',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TIUP.DE',
    name: 'Amundi US TIPS Government Inflation-Linked Bond UCITS ETF Dist',
    price: 100.26,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TRD1.DE',
    name: 'Invesco US Treasury Bond 0-1 Year UCITS ETF USD Dist',
    price: 35.092,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TRD3.DE',
    name: 'Invesco US Treasury Bond 1-3 Year UCITS ETF',
    price: 33.55,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TRD7.DE',
    name: 'Invesco US Treasury Bond 3-7 Year UCITS ETF',
    price: 33.052,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TRDE.DE',
    name: 'Invesco US Treasury Bond 7-10 Year UCITS ETF',
    price: 31.418,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TRDE.F',
    name: 'Invesco Markets II PLC - Invesco Us Treasury Bond 7-10 Year Ucits ETF',
    price: 32.989,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TRDS.DE',
    name: 'Invesco US Treasury Bond UCITS ETF USD Dist',
    price: 31.267,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TRDX.DE',
    name: 'Invesco US Treasury Bond 7-10 Year UCITS ETF',
    price: 30.919,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TRET.DE',
    name: 'VanEck Global Real Estate UCITS ETF',
    price: 37.08,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'TRFE.DE',
    name: 'Invesco US Treasury Bond UCITS ETF',
    price: 32.027,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'TS3S.F',
    name: 'Leverage Shares -3x Short Tesla ETC',
    price: 0.1768,
    issuer: 'Leverage',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'TSWE.DE',
    name: 'VanEck Sustainable World Equal Weight UCITS ETF',
    price: 34.185,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'TTPX.DE',
    name: 'Amundi Index Solutions - Amundi Japan Topix UCITS ETF-C EUR Hedged',
    price: 457.33,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'TY3S.DE',
    name: 'WisdomTree US Treasuries 10Y 3x Daily Short',
    price: 45.618,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'U1FB.DE',
    name: 'UBS(Lux)Fund Solutions – MSCI Japan Socially Responsible UCITS ETF(hedged EUR)A-acc',
    price: 25.185,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'U1FB.F',
    name: 'UBS(Lux)Fund Solutions – MSCI Japan Socially Responsible UCITS ETF(hedged EUR)A-acc',
    price: 18.016,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'UBF6.F',
    name: 'UBS (Irl) Fund Solutions plc - CMCI Commodity Carry Ex-Agriculture SF UCITS ETF',
    price: 117.88,
    issuer: 'UBS',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'UBF7.F',
    name: 'UBS (Irl) Fund Solutions plc – CMCI Commodity Carry Ex-Agriculture SF UCITS ETF(hedged to EUR) A-acc',
    price: 122.46,
    issuer: 'UBS',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'UBU3.DE',
    name: 'UBS (Irl) ETF plc - MSCI USA UCITS ETF (USD) A-dis',
    price: 134.82,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UBU5.DE',
    name: 'UBS (Irl) ETF plc - MSCI USA Value UCITS ETF',
    price: 101.88,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UBU7.DE',
    name: 'UBS (Irl) ETF plc - MSCI World UCITS ETF',
    price: 89.384,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'UBU9.DE',
    name: 'UBS (Irl) ETF plc - S&P 500 UCITS ETF',
    price: 89.234,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UBUD.DE',
    name: 'UBS (Irl) ETF plc - Solactive Global Pure Gold Miners UCITS ETF',
    price: 33.55,
    issuer: 'UBS',
    assetClass: 'Commodity',
    category: 'Global'
  },
  {
    symbol: 'UBUJ.DE',
    name: 'UBS (Irl) ETF plc - MSCI USA hedged to EUR UCITS ETF',
    price: 49.512,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UBUM.DE',
    name: 'UBS (Irl) ETF plc – S&P Dividend Aristocrats ESG Elite UCITS ETF',
    price: 9.723,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UBUR.DE',
    name: 'UBS (Irl) ETF plc - Factor MSCI USA Low Volatility UCITS ETF',
    price: 29.145,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UBUS.DE',
    name: 'UBS (Irl) ETF plc - Factor MSCI USA Prime Value UCITS ETF',
    price: 31.615,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UBUT.DE',
    name: 'UBS (Irl) ETF plc - Factor MSCI USA Quality UCITS ETF',
    price: 48.61,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UBUV.DE',
    name: 'UBS (Irl) ETF plc - Factor MSCI USA Low Volatility UCITS ETF',
    price: 29.975,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UBUW.DE',
    name: 'UBS (Irl) ETF plc - Factor MSCI USA Prime Value UCITS ETF (hedged to EUR) A-acc',
    price: 30.37,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UBUX.DE',
    name: 'UBS (Irl) ETF plc - Factor MSCI USA Quality UCITS ETF',
    price: 44.25,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UCRH.F',
    name: 'Amundi Index Solutions - Amundi Index US Corp SRI UCITS ETF DR Hedged EUR Inc',
    price: 40.094,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UCRP.DE',
    name: 'Amundi Index Solutions - Amundi Index US Corp SRI',
    price: 52.312,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'UCT2.DE',
    name: 'Amundi US Curve steepening 2-10Y ETF -Acc- Capitalisation',
    price: 85.574,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UDIV.F',
    name: 'Global X SuperDividend UCITS ETF',
    price: 8.271,
    issuer: 'Global',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'UEEF.DE',
    name: 'iShares $ High Yield Corp Bond ESG UCITS ETF EUR Hedged (Acc)',
    price: 5.64,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'UEEF.F',
    name: 'iShares $ High Yield Corp Bond ESG UCITS ETF EUR Hedged (Acc)',
    price: 4.7765,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'UEEG.DE',
    name: 'iShares $ Development Bank Bonds UCITS ETF (Acc)',
    price: 4.6941,
    issuer: 'iShares',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'UEEH.DE',
    name: 'iShares Edge MSCI World Minimum Volatility UCITS ETF USD (Dist)',
    price: 5.615,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'UEEH.F',
    name: 'iShares Edge MSCI World Minimum Volatility UCITS ETF USD (Dist)',
    price: 4.8625,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'UEF0.DE',
    name: 'UBS(Lux)Fund Solutions – Bloomberg Barclays US Liquid Corporates UCITS ETF(hedged EUR)A-acc',
    price: 17.4435,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEF0.F',
    name: 'UBS (Lux) Fund Solutions – Bloomberg US Liquid Corporates UCITS ETF',
    price: 16.207,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEF5.DE',
    name: 'UBS ETF SICAV - MSCI Emerging Markets Socially Responsible UCITS ETF',
    price: 13.656,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'UEF6.DE',
    name: 'UBS (Lux) Fund Solutions – Bloomberg Euro Area Liquid Corporates 1-5 Year UCITS ETF',
    price: 13.218,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEF7.DE',
    name: 'UBS(Lux)Fund Solutions – Bloomberg Barclays US Liquid Corporates 1-5 Year UCITS ETF(USD)A-dis',
    price: 11.9005,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEF7.F',
    name: 'UBS(Lux)Fund Solutions – Bloomberg Barclays US Liquid Corporates 1-5 Year UCITS ETF(USD)A-dis',
    price: 12.515,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEF8.DE',
    name: 'UBS(Lux)Fund Solutions – Bloomberg Barclays US Liquid Corporates 1-5 Year UCITS ETF(hedged EUR)A-acc',
    price: 15.174,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEF9.DE',
    name: 'UBS(Lux)Fund Solutions – Bloomberg Barclays US Liquid Corporates UCITS ETF(USD)A-dis',
    price: 12.7115,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEFD.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI EMU Small Cap UCITS ETF',
    price: 133.94,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEFE.DE',
    name: 'UBS (Lux) Fund Solutions – J.P. Morgan EM Multi-Factor Enhanced Local Currency Bond UCITS ETF',
    price: 10.9695,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'UEFF.DE',
    name: 'UBS (Lux) Fund Solutions - Bloomberg Barclays US 1-3 Year Treasury Bond UCITS ETF',
    price: 20.862,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'UEFI.DE',
    name: 'UBS ETF - Bloomberg Barclays US 7-10 Year Treasury Bond UCITS ETF',
    price: 32.884,
    issuer: 'UBS',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'UEFR.DE',
    name: 'UBS (Lux) Fund Solutions – Bloomberg Euro Area Liquid Corporates UCITS ETF',
    price: 93.74,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEFS.DE',
    name: 'UBS (Lux) Fund Solutions – Bloomberg USD Emerging Markets Sovereign UCITS ETF',
    price: 7.8942,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'UEFY.DE',
    name: 'UBS (Lux) Fund Solutions – SBI Foreign AAA-BBB 1-5 ESG UCITS ETF',
    price: 12.446,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEFZ.DE',
    name: 'UBS (Lux) Fund Solutions – SBI Foreign AAA-BBB 5-10 ESG UCITS ETF',
    price: 14.843,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEQ3.DE',
    name: 'UBS (Irl) Fund Solutions plc - CMCI Composite SF UCITS ETF',
    price: 142.36,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UEQ7.DE',
    name: 'UBS (Irl) ETF Public Limited Company - S&P 500 UCITS ETF',
    price: 20.78,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UEQC.DE',
    name: 'UBS (Irl) Fund Solutions plc - CMCI Commodity Carry SF UCITS ETF',
    price: 140.86,
    issuer: 'UBS',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'UEQD.DE',
    name: 'UBS (Irl) ETF plc - S&P 500 UCITS ETF (hedged to EUR) A-acc',
    price: 30.442,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UEQU.DE',
    name: 'UBS (Irl) Fund Solutions plc - CMCI Ex-Agriculture SF UCITs ETF',
    price: 192.54,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UET0.DE',
    name: 'UBS (Lux) Fund Solutions – Bloomberg MSCI US Liquid Corporates Sustainable UCITS ETF',
    price: 15.1065,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UET1.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI USA Socially Responsible UCITS ETF',
    price: 28.7,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UET5.DE',
    name: 'UBS (Lux) Fund Solutions – EURO STOXX 50 ESG UCITS ETF',
    price: 19.022,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UET5.F',
    name: 'UBS (Lux) Fund Solutions – EURO STOXX 50 ESG UCITS ETF',
    price: 15.202,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UETC.DE',
    name: 'Ubs Etf - Msci China Esg Universal Ucits Etf',
    price: 9.807,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'UETE.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI Emerging Markets Socially Responsible UCITS ETF',
    price: 17.754,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'UETW.DE',
    name: 'UBS (Irl) ETF plc - MSCI World UCITS ETF',
    price: 32.558,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'UFMA.F',
    name: 'UBS (Lux) Fund Solutions - MSCI Japan UCITS ETF',
    price: 21.46,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'UFMB.F',
    name: 'UBS ETF SICAV - MSCI United Kingdom UCITS ETF',
    price: 14.794,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIC2.DE',
    name: 'UBS ETF - Solactive China Technology UCITS ETF',
    price: 7.655,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'UIFH.F',
    name: 'Amundi Index Solutions - Amundi Index US Gov Inflation-Linked Bond',
    price: 44.597,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Mixed'
  },
  {
    symbol: 'UIM1.DE',
    name: 'UBS (Lux) Fund Solutions – EURO STOXX 50 UCITS ETF',
    price: 53.58,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIM2.DE',
    name: 'UBS (Lux) Fund Solutions – Factor MSCI EMU Quality UCITS ETF',
    price: 24.955,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIM3.DE',
    name: 'UBS (Lux) Fund Solutions – FTSE 100 UCITS ETF',
    price: 97.03,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIM4.DE',
    name: 'UBS(Lux)Fund Solutions – MSCI EMU UCITS ETF(EUR)A-dis',
    price: 178.98,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIM5.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI Japan UCITS ETF',
    price: 53.392,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'UIM6.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI USA UCITS ETF',
    price: 536.06,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UIM7.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI World UCITS ETF',
    price: 357.78,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'UIM9.DE',
    name: 'UBS ETF SICAV - MSCI Canada UCITS ETF',
    price: 45.91,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIMA.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI Europe UCITS ETF',
    price: 89.89,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'UIMA.F',
    name: 'UBS (Lux) Fund Solutions – MSCI Europe UCITS ETF',
    price: 76.67,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'UIMB.DE',
    name: 'UBS (Lux) Fund Solutions - Bloomberg Barclays TIPS 10+ UCITS ETF',
    price: 8.2592,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIMC.DE',
    name: 'UBS (Lux) Fund Solutions – Bloomberg MSCI Euro Area Liquid Corporates Sustainable UCITS ETF',
    price: 13.0375,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIMD.DE',
    name: 'UBS ETF SICAV - MSCI Pacific (ex Japan) UCITS ETF',
    price: 42.57,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'UIME.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI EMU Value UCITS ETF',
    price: 52.61,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIME.F',
    name: 'UBS (Lux) Fund Solutions – MSCI EMU Value UCITS ETF',
    price: 40.94,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIMF.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI Europe UCITS ETF',
    price: 17.284,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'UIMI.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI Emerging Markets UCITS ETF',
    price: 107.47,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'UIMM.DE',
    name: 'UBS (Lux) Fund Solutions - MSCI World Socially Responsible UCITS ETF',
    price: 151.16,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'UIMP.DE',
    name: 'UBS ETF - MSCI USA Socially Responsible UCITS ETF',
    price: 209.2,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'UIMR.DE',
    name: 'UBS(Lux)Fund Solutions – MSCI EMU Socially Responsible UCITS ETF(EUR)A-dis',
    price: 126.62,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIMT.DE',
    name: 'UBS ETF SICAV - MSCI Pacific Socially Responsible UCITS ETF',
    price: 71.38,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIMY.DE',
    name: 'UBS (Lux) Fund Solutions – Factor MSCI EMU Low Volatility UCITS ETF',
    price: 16.856,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIMZ.DE',
    name: 'UBS (Lux) Fund Solutions – Factor MSCI EMU Prime Value UCITS ETF',
    price: 20.615,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UINE.DE',
    name: 'MULTI-UNITS LUXEMBOURG - Lyxor Inverse US$ 10Y Inflation Expectations UCITS ETF',
    price: 86.446,
    issuer: 'Lyxor',
    assetClass: 'Mixed',
    category: 'Technology'
  },
  {
    symbol: 'UINF.DE',
    name: 'Lyxor US$ 10Y Inflation Expectations UCITS ETF',
    price: 117.105,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIQ1.DE',
    name: 'UBS (Irl) Fund Solutions plc - CMCI Ex-Agriculture SF UCITs ETF (hedged to EUR) A-acc',
    price: 172.06,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIQI.DE',
    name: 'UBS (Irl) Fund Solutions plc - MSCI AC Asia Ex Japan SF UCITS ETF',
    price: 177.46,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'UIQK.DE',
    name: 'UBS (Irl) Fund Solutions plc - CMCI Composite SF UCITS ETF',
    price: 95.19,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIQL.DE',
    name: 'UBS (Lux) Fund Solutions – Bloomberg MSCI Euro Area Liquid Corporates 1-5 Year Sustainable UCITS ETF',
    price: 10.476,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIQN.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI EMU Select Factor Mix UCITS ETF',
    price: 15.726,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'UIW2.F',
    name: 'UBS (Lux) Fund Solutions – MSCI Europe Socially Responsible UCITS ETF',
    price: 12.934,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'UKPH.DE',
    name: 'iShares UK Property UCITS ETF',
    price: 3.5115,
    issuer: 'iShares',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'URNU.F',
    name: 'Global X Etfs Icav - Global X Uranium Ucits ETF',
    price: 10.328,
    issuer: 'Global',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'USAB.F',
    name: 'L&G ESG USD Corporate Bond UCITS ETF',
    price: 7.7502,
    issuer: 'L&G',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'USCP.DE',
    name: 'Ossiam Shiller Barclays Cape US Sector Value TR',
    price: 1377.6,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Value'
  },
  {
    symbol: 'USPY.DE',
    name: 'L&G Cyber Security UCITS ETF',
    price: 26.565,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'USTP.DE',
    name: 'Ossiam US Steepener',
    price: 115.81,
    issuer: 'Ossiam',
    assetClass: 'Equity',
    category: 'Mixed'
  },
  {
    symbol: 'USUE.DE',
    name: 'UBS (Irl) ETF plc - MSCI USA Select Factor Mix UCITS ETF (USD) A-acc',
    price: 35.2,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'USUP.DE',
    name: 'UBS (Lux) Fund Solutions – MSCI Pacific Socially Responsible UCITS ETF',
    price: 10.662,
    issuer: 'UBS',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V20A.DE',
    name: 'Vanguard LifeStrategy 20% Equity UCITS ETF',
    price: 24.895,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V20A.F',
    name: 'Vanguard LifeStrategy 20% Equity UCITS ETF',
    price: 22.36,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V20D.DE',
    name: 'Vanguard LifeStrategy 20% Equity UCITS ETF',
    price: 22.165,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V3AL.F',
    name: 'Vanguard ESG Global All Cap UCITS ETF',
    price: 4.4935,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'V3ET.DE',
    name: 'VanEck Sustainable European Equal Weight UCITS ETF',
    price: 81.69,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'V3GE.DE',
    name: 'Vanguard Funds PLC - Vanguard ESG Global Corporate Bond UCITS ETF',
    price: 4.0922,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'V3GF.F',
    name: 'Vanguard Funds PLC - Vanguard ESG Global Corporate Bond UCITS ETF EUR Hedged Acc',
    price: 4.3152,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'V40A.DE',
    name: 'Vanguard LifeStrategy 40% Equity UCITS ETF',
    price: 28.56,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V40D.DE',
    name: 'Vanguard LifeStrategy 40% Equity UCITS ETF',
    price: 25.615,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V50A.DE',
    name: 'Amundi Index Solutions - Amundi EURO STOXX 50 UCITS ETF-C EUR',
    price: 139.44,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V50D.DE',
    name: 'Amundi Index Solutions - Amundi EURO STOXX 50 UCITS ETF-D EUR',
    price: 86.16,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V60A.DE',
    name: 'Vanguard LifeStrategy 60% Equity UCITS ETF (EUR) Accumulating',
    price: 32.665,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V60A.F',
    name: 'Vanguard LifeStrategy 60% Equity UCITS ETF (EUR) Accumulating',
    price: 26.585,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V60D.DE',
    name: 'Vanguard LifeStrategy 60% Equity UCITS ETF',
    price: 29.505,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V80A.DE',
    name: 'Vanguard LifeStrategy 80% Equity UCITS ETF',
    price: 37.205,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'V80D.DE',
    name: 'Vanguard LifeStrategy 80% Equity UCITS ETF',
    price: 33.945,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VAGE.DE',
    name: 'Vanguard Global Aggregate Bond UCITS ETF',
    price: 20.864,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'VAGF.DE',
    name: 'Vanguard Global Aggregate Bond UCITS ETF',
    price: 23.517,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'VAGF.F',
    name: 'Vanguard Global Aggregate Bond UCITS ETF',
    price: 22.167,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'VALD.DE',
    name: 'BNP Paribas Easy ESG Equity Value Europe',
    price: 110.76,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'VALU.DE',
    name: 'BNP Paribas Easy ESG Equity Value Europe',
    price: 165.48,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'VCAV.F',
    name: 'VanEck Smart Home Active UCITS ETF',
    price: 10.874,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VDCE.DE',
    name: 'Vanguard USD Corporate Bond UCITS ETF',
    price: 54.896,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'VDIV.DE',
    name: 'VanEck Morningstar Developed Markets Dividend Leaders UCITS ETF',
    price: 43.655,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VDTE.DE',
    name: 'Vanguard USD Treasury Bond UCITS ETF',
    price: 25.261,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'VDXX.DE',
    name: 'Vanguard Funds Public Limited Company - Vanguard Dax UCITS ETF',
    price: 24.72,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'VECA.DE',
    name: 'Vanguard EUR Corporate Bond UCITS ETF',
    price: 52.682,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'VECP.DE',
    name: 'Vanguard EUR Corporate Bond UCITS ETF',
    price: 48.677,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'VERE.DE',
    name: 'Vanguard FTSE Developed Europe ex UK UCITS ETF',
    price: 50.11,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'VERX.DE',
    name: 'Vanguard FTSE Developed Europe ex UK UCITS ETF',
    price: 42.38,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'VFEA.DE',
    name: 'Vanguard FTSE Emerging Markets UCITS ETF',
    price: 63.27,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'VFEM.DE',
    name: 'Vanguard FTSE Emerging Markets UCITS ETF',
    price: 60.69,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'VGEA.DE',
    name: 'Vanguard EUR Eurozone Government Bond UCITS ETF',
    price: 23.705,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'VGEB.DE',
    name: 'Vanguard EUR Eurozone Government Bond UCITS ETF',
    price: 22.215,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'VGEJ.DE',
    name: 'Vanguard FTSE Developed Asia Pacific ex Japan UCITS ETF',
    price: 24.93,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'VGEK.DE',
    name: 'Vanguard FTSE Developed Asia Pacific ex Japan UCITS ETF',
    price: 31.015,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Asia'
  },
  {
    symbol: 'VGEM.DE',
    name: 'Vanguard USD Emerging Markets Government Bond UCITS ETF',
    price: 37.189,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'VGER.DE',
    name: 'Vanguard Germany All Cap UCITS ETF',
    price: 33.78,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'VGER.F',
    name: 'Vanguard Germany All Cap UCITS ETF',
    price: 25.07,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'VGEU.DE',
    name: 'Vanguard FTSE Developed Europe UCITS ETF',
    price: 42.37,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'VGOV.DE',
    name: 'Vanguard U.K. Gilt UCITS ETF',
    price: 18.0235,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VGTY.DE',
    name: 'Vanguard USD Treasury Bond UCITS ETF',
    price: 18.5315,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'VGUE.DE',
    name: 'Vanguard U.K. Gilt UCITS ETF',
    price: 19.8085,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VGUE.F',
    name: 'Vanguard U.K. Gilt UCITS ETF',
    price: 19.757,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VGVE.DE',
    name: 'Vanguard FTSE Developed World UCITS ETF',
    price: 103.12,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'VGVF.DE',
    name: 'Vanguard FTSE Developed World UCITS ETF',
    price: 107.36,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'VGWD.DE',
    name: 'Vanguard FTSE All-World High Dividend Yield UCITS ETF',
    price: 65.93,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'VGWE.DE',
    name: 'Vanguard FTSE All-World High Dividend Yield UCITS ETF USD Accumulation',
    price: 73.76,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'VGWL.DE',
    name: 'Vanguard FTSE All-World UCITS ETF',
    price: 133.2,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'VGWL.F',
    name: 'Vanguard FTSE All-World UCITS ETF',
    price: 102.7,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'VIGB.DE',
    name: 'VanEck iBoxx EUR Sovereign Capped AAA-AA 1-5 UCITS ETF',
    price: 19.0665,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VJPA.DE',
    name: 'Vanguard FTSE Japan UCITS ETF',
    price: 33.07,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'VJPE.DE',
    name: 'Vanguard FTSE Japan UCITS ETF EUR Hedged Accumulation',
    price: 53.24,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'VJPN.DE',
    name: 'Vanguard FTSE Japan UCITS ETF',
    price: 35.73,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'VLED.DE',
    name: 'BNP Paribas Easy ESG Equity Low Vol Europe',
    price: 151.18,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'VLEU.DE',
    name: 'BNP Paribas Easy ESG Equity Low Vol Europe',
    price: 192.44,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'VLUD.DE',
    name: 'BNP Paribas Easy ESG Equity Low Vol US',
    price: 167.76,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VLUS.DE',
    name: 'BNP Paribas Easy ESG Equity Low Vol US',
    price: 211.8,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VLUU.DE',
    name: 'BNP Paribas Easy ESG Equity Low Vol US',
    price: 201.75,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VMID.DE',
    name: 'Vanguard FTSE 250 UCITS ETF',
    price: 37.525,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VMUS.DE',
    name: 'VanEck Vectors ETFs N.V. - VanEck Vectors Morningstar North America Equal Weight UCITS ETF',
    price: 49.08,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VNRA.DE',
    name: 'Vanguard FTSE North America UCITS ETF',
    price: 138.36,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VNRT.DE',
    name: 'Vanguard FTSE North America UCITS ETF',
    price: 135.3,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VOOL.DE',
    name: 'Lyxor S&P 500 VIX Futures Enhanced Roll UCITS ETF',
    price: 0.833,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'VOOM.DE',
    name: 'Amundi Global Gender Equality UCITS ETF -Acc- Capitalisation',
    price: 15.6,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'VUAA.DE',
    name: 'Vanguard S&P 500 UCITS ETF',
    price: 105.895,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'VUCE.DE',
    name: 'Vanguard USD Corporate Bond UCITS ETF',
    price: 51.236,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'VUCP.DE',
    name: 'Vanguard Funds Public Limited Company - Vanguard USD Corporate Bond UCITS ETF',
    price: 40.845,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'VUKE.DE',
    name: 'Vanguard FTSE 100 UCITS ETF',
    price: 46.255,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VUSA.DE',
    name: 'Vanguard S&P 500 UCITS ETF',
    price: 104.905,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'VUSC.DE',
    name: 'Vanguard USD Corporate 1-3 year Bond UCITS ETF',
    price: 42.511,
    issuer: 'Vanguard',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'VVGM.F',
    name: 'VanEck Morningstar Global Wide Moat UCITS ETF',
    price: 23.235,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'VVSM.DE',
    name: 'VanEck Semiconductor UCITS ETF',
    price: 41.21,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'VWCE.DE',
    name: 'Vanguard FTSE All-World UCITS ETF',
    price: 135.66,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'VWCG.DE',
    name: 'Vanguard FTSE Developed Europe UCITS ETF',
    price: 49.475,
    issuer: 'Vanguard',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'W1TA.DE',
    name: 'WisdomTree Battery Solutions UCITS ETF',
    price: 32.175,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'W1TG.DE',
    name: 'WisdomTree European Union Bond UCITS ETF',
    price: 71.176,
    issuer: 'WisdomTree',
    assetClass: 'Fixed Income',
    category: 'Europe'
  },
  {
    symbol: 'W1TG.F',
    name: 'WisdomTree European Union Bond UCITS ETF',
    price: 70.338,
    issuer: 'WisdomTree',
    assetClass: 'Fixed Income',
    category: 'Europe'
  },
  {
    symbol: 'W311.DE',
    name: 'Harbor Health Care UCITS ETF Accum Shs -A- USD',
    price: 6.29,
    issuer: 'Harbor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WDFI.DE',
    name: 'Amundi Index Solutions - Amundi MSCI World Financials',
    price: 215.35,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'WDNR.DE',
    name: 'Amundi Index Solutions - Amundi MSCI World Energy',
    price: 348.75,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'WEBA.DE',
    name: 'Amundi US Tech 100 Equal Weight UCITS ETF',
    price: 12.848,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WELJ.DE',
    name: 'Amundi S&P Global Consumer Discretionary ESG UCITS ETF DR EUR Acc',
    price: 12.894,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'WELN.DE',
    name: 'Amundi S&P Global Energy Carbon Reduced UCITS ETF',
    price: 11.052,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'WGES.F',
    name: 'Lyxor MSCI World ESG Leaders Extra (DR) UCITS ETF',
    price: 17.194,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'WMIN.DE',
    name: 'VanEck Global Mining UCITS ETF',
    price: 37,
    issuer: 'VanEck',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'WRNA.F',
    name: 'Wisdomtree Issuer ICAV - Wisdomtree Biorevolution UCITS ETF',
    price: 17.018,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WTD7.DE',
    name: 'WisdomTree Europe SmallCap Dividend UCITS ETF',
    price: 22.06,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'WTD8.DE',
    name: 'WisdomTree Emerging Markets Equity Income UCITS ETF',
    price: 26.13,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'WTD9.DE',
    name: 'WisdomTree US Equity Income UCITS ETF - Acc',
    price: 28.005,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WTDF.DE',
    name: 'WisdomTree Europe Equity UCITS ETF',
    price: 27.83,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'WTDH.DE',
    name: 'WisdomTree Europe Equity UCITS ETF',
    price: 23.935,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'WTDI.DE',
    name: 'WisdomTree AT1 CoCo Bond UCITS ETF',
    price: 77.272,
    issuer: 'WisdomTree',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'WTDM.DE',
    name: 'WisdomTree US Quality Dividend Growth UCITS ETF',
    price: 44.18,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WTDP.DE',
    name: 'WisdomTree EUR Aggregate Bond ESG Enhanced Yield UCITS ETF',
    price: 43.827,
    issuer: 'WisdomTree',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'WTDQ.DE',
    name: 'WisdomTree EUR Aggregate Bond ESG Enhanced Yield UCITS ETF',
    price: 45.727,
    issuer: 'WisdomTree',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'WTDR.DE',
    name: 'WisdomTree EUR Government Bond ESG Enhanced Yield UCITS ETF',
    price: 43.556,
    issuer: 'WisdomTree',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'WTDX.DE',
    name: 'WisdomTree Japan Equity UCITS ETF',
    price: 33.8,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'WTDY.DE',
    name: 'WisdomTree US Equity Income UCITS ETF',
    price: 24.415,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WTEB.DE',
    name: 'WisdomTree AT1 CoCo Bond UCITS ETF - EUR Hedged',
    price: 84.99,
    issuer: 'WisdomTree',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'WTED.DE',
    name: 'WisdomTree Emerging Markets SmallCap Dividend UCITS ETF',
    price: 18.742,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'WTEE.DE',
    name: 'WisdomTree Europe Equity Income UCITS ETF',
    price: 13.374,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'WTEH.DE',
    name: 'WisdomTree Enhanced Commodity UCITS ETF - EUR Hedged Acc',
    price: 12.856,
    issuer: 'WisdomTree',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'WTEI.DE',
    name: 'WisdomTree Emerging Markets Equity Income UCITS ETF',
    price: 14.062,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'WTEJ.DE',
    name: 'WisdomTree Cloud Computing UCITS ETF',
    price: 29.675,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WTEM.DE',
    name: 'WisdomTree Global Quality Dividend Growth UCITS ETF',
    price: 37.38,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'WTER.F',
    name: 'Wisdomtree Issuer ICAV - Wisdomtree New Economy Real Estate Ucits ETF',
    price: 19.366,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WTES.DE',
    name: 'WisdomTree Europe SmallCap Dividend UCITS ETF',
    price: 19.66,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'WTEU.DE',
    name: 'WisdomTree US Equity Income UCITS ETF',
    price: 22.715,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WTI2.DE',
    name: 'WisdomTree Artificial Intelligence UCITS ETF',
    price: 65.03,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WTIC.DE',
    name: 'WisdomTree Enhanced Commodity UCITS ETF - USD Acc',
    price: 13.684,
    issuer: 'WisdomTree',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'WTIF.DE',
    name: 'WisdomTree Japan Equity UCITS ETF - EUR Hedged Acc',
    price: 39.515,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'WTIM.DE',
    name: 'WisdomTree Eurozone Quality Dividend Growth UCITS ETF',
    price: 24.51,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WTIZ.DE',
    name: 'WisdomTree Japan Equity UCITS ETF',
    price: 29.61,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'WTRD.F',
    name: 'WisdomTree Recycling Decarbonisation UCITS ETF',
    price: 19.292,
    issuer: 'WisdomTree',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'WYZ1.F',
    name: 'Comgest Growth plc - Comgest Growth China',
    price: 63.885,
    issuer: 'Comgest',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'X010.DE',
    name: 'Lyxor MSCI World (LUX) UCITS ETF',
    price: 72.99,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'X011.DE',
    name: 'Lyxor MSCI Europe UCITS ETF',
    price: 68.16,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'X013.DE',
    name: 'Lyxor MSCI North America UCITS ETF',
    price: 107.14,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'X014.DE',
    name: 'Amundi MSCI Pacific ESG Broad Transition UCITS ETF Dist',
    price: 65.85,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'X020.DE',
    name: 'Lyxor MSCI USA (LUX) UCITS ETF',
    price: 97.674,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'X022.DE',
    name: 'Lyxor S&P MidCap 400 UCITS ETF',
    price: 252.9,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'X023.DE',
    name: 'Lyxor S&P SmallCap 600 UCITS ETF',
    price: 55.33,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'X025.DE',
    name: 'Lyxor MSCI Europe Mid Cap UCITS ETF',
    price: 112.54,
    issuer: 'Lyxor',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'X026.DE',
    name: 'Amundi MSCI Europe Small Cap ESG Broad Transition UCITS ETF Dist',
    price: 54.92,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'X03B.DE',
    name: 'Xtrackers II Eurozone Government Bond 1-3 UCITS ETF',
    price: 158.75,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'X03C.DE',
    name: 'Xtrackers II Eurozone Government Bond 3-5 UCITS ETF',
    price: 186.03,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'X03F.DE',
    name: 'Xtrackers II Eurozone Government Bond UCITS ETF 1D EUR',
    price: 170.14,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'X03G.DE',
    name: 'Xtrackers II Germany Government Bond UCITS ETF',
    price: 175.095,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Germany'
  },
  {
    symbol: 'X03G.F',
    name: 'Xtrackers II Germany Government Bond UCITS ETF',
    price: 170.31,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Germany'
  },
  {
    symbol: 'X13G.DE',
    name: 'Amundi Index Solutions - Amundi Govt Bond Lowest Rated Euro Investment Grade 1-3',
    price: 111.33,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Mixed'
  },
  {
    symbol: 'X1GD.DE',
    name: 'Amundi Index Solutions - Amundi Govt Bond Lowest Rated Euro Investment Grade',
    price: 196.05,
    issuer: 'Amundi',
    assetClass: 'Fixed Income',
    category: 'Mixed'
  },
  {
    symbol: 'XAAG.DE',
    name: 'Invesco Bloomberg Commodity ex-Agriculture UCITS ETF',
    price: 28.035,
    issuer: 'Invesco',
    assetClass: 'Commodity',
    category: 'Technology'
  },
  {
    symbol: 'XAIN.DE',
    name: 'Xtrackers MSCI Indonesia Swap UCITS ETF',
    price: 11.566,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XAIX.DE',
    name: 'Xtrackers Artificial Intelligence & Big Data UCITS ETF',
    price: 139.6,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XAIX.F',
    name: 'Xtrackers Artificial Intelligence & Big Data UCITS ETF',
    price: 86.12,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XAMB.DE',
    name: 'Amundi Index Solutions - Amundi MSCI World SRI UCITS ETF DR',
    price: 97.21,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XAT1.DE',
    name: 'Invesco AT1 Capital Bond ETF',
    price: 16.55,
    issuer: 'Invesco',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XB4A.DE',
    name: 'Xtrackers ATX UCITS ETF',
    price: 94.1,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XB4F.DE',
    name: 'Xtrackers II ESG EUR Corporate Bond UCITS ETF',
    price: 142.995,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XBAE.DE',
    name: 'Xtrackers II ESG Global Aggregate Bond ETF',
    price: 20.694,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'XBAG.DE',
    name: 'Xtrackers II ESG Global Aggregate Bond ETF',
    price: 33.969,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'XBAI.DE',
    name: 'Xtrackers II - Eurozone AAA Government Bond Swap UCITS ETF',
    price: 228.27,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XBAK.DE',
    name: 'Xtrackers MSCI Pakistan Swap UCITS ETF',
    price: 1.3976,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XBAK.F',
    name: 'Xtrackers MSCI Pakistan Swap UCITS ETF',
    price: 0.522,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XBAS.DE',
    name: 'Xtrackers MSCI Singapore UCITS ETF',
    price: 1.9444,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XBAT.DE',
    name: 'Xtrackers II Eurozone AAA Government Bond Swap UCITS ETF',
    price: 204.32,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XBCD.DE',
    name: 'Xtrackers II - iBoxx Germany Covered Bond Swap UCITS ETF',
    price: 191.38,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Germany'
  },
  {
    symbol: 'XBO2.DE',
    name: 'Xtrackers II Italy Government Bond 0-1 Swap UCITS ETF',
    price: 33.601,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XCHA.DE',
    name: 'Xtrackers CSI300 Swap UCITS ETF',
    price: 15.57,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XCO2.DE',
    name: 'Lyxor Global Green Bond 1-10Y (DR) UCITS ETF - Acc',
    price: 18.8845,
    issuer: 'Lyxor',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'XCS2.DE',
    name: 'Xtrackers II Australia Government Bond UCITS ETF',
    price: 135.61,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XCS3.DE',
    name: 'Xtrackers MSCI Malaysia UCITS ETF',
    price: 10.726,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XCS4.DE',
    name: 'Xtrackers MSCI Thailand UCITS ETF',
    price: 18.802,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XCS5.DE',
    name: 'Xtrackers MSCI India Swap UCITS ETF',
    price: 17.412,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XCS6.DE',
    name: 'Xtrackers MSCI China UCITS ETF',
    price: 17.276,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'XCTE.F',
    name: 'Xtrackers Harvest MSCI China Tech 100 UCITS ETF',
    price: 24.325,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'China'
  },
  {
    symbol: 'XD5E.DE',
    name: 'Xtrackers MSCI EMU UCITS ETF',
    price: 57.06,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XD9D.DE',
    name: 'Xtrackers MSCI USA UCITS ETF',
    price: 21.458,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XD9E.DE',
    name: 'Xtrackers MSCI USA UCITS ETF',
    price: 130.235,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XD9U.DE',
    name: 'Xtrackers (IE) Plc - Xtrackers MSCI USA UCITS ETF 1C',
    price: 162.545,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XDDA.F',
    name: 'Xtrackers DAX UCITS ETF',
    price: 7.799,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'XDDX.DE',
    name: 'Xtrackers DAX Income UCITS ETF',
    price: 146.46,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'XDEB.DE',
    name: 'Xtrackers MSCI World Minimum Volatility UCITS ETF',
    price: 42.11,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDEE.DE',
    name: 'Xtrackers S&P 500 Equal Weight UCITS ETF 2C EUR Hedged',
    price: 10.668,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XDEM.DE',
    name: 'Xtrackers MSCI World Momentum UCITS ETF',
    price: 65.86,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDEP.DE',
    name: 'Xtrackers iBoxx EUR Corporate Bond Yield Plus UCITS ETF',
    price: 15.2125,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XDEQ.DE',
    name: 'Xtrackers MSCI World Quality UCITS ETF',
    price: 65.33,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDEV.DE',
    name: 'Xtrackers MSCI World Value UCITS ETF',
    price: 46.32,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDEW.DE',
    name: 'Xtrackers S&P 500 Equal Weight UCITS ETF',
    price: 88.01,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XDGE.DE',
    name: 'Xtrackers (IE) Plc - Xtrackers USD Corporate Bond UCITS ETF 2D - EUR Hedged',
    price: 10.423,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XDGM.DE',
    name: 'Xtrackers MDAX ESG Screened UCITS ETF',
    price: 22.275,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Germany'
  },
  {
    symbol: 'XDGU.DE',
    name: 'Xtrackers (IE) Plc - Xtrackers USD Corporate Bond UCITS ETF 1D',
    price: 10.9635,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XDJE.DE',
    name: 'Xtrackers Nikkei 225 UCITS ETF',
    price: 62.85,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'XDJP.DE',
    name: 'Xtrackers Nikkei 225 UCITS ETF 1D',
    price: 25.085,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'XDN0.DE',
    name: 'Xtrackers MSCI Nordic UCITS ETF',
    price: 46.77,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XDND.DE',
    name: 'Xtrackers MSCI North America High Dividend Yield UCITS ETF',
    price: 51.1,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XDNE.DE',
    name: 'Xtrackers MSCI Japan ESG Screened UCITS ETF',
    price: 32.235,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'XDNY.DE',
    name: 'Xtrackers (IE) Plc - Xtrackers JPX-Nikkei 400 UCITS ETF 1D',
    price: 15.912,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'XDNY.F',
    name: 'Xtrackers (IE) Plc - Xtrackers JPX-Nikkei 400 UCITS ETF 1D',
    price: 13.592,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'XDPD.DE',
    name: 'Xtrackers S&P 500 UCITS ETF',
    price: 84.372,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XDPD.F',
    name: 'Xtrackers S&P 500 UCITS ETF',
    price: 60.73,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XDPE.DE',
    name: 'Xtrackers (IE) Plc - Xtrackers S&P 500 UCITS ETF 1C - EUR Hedged',
    price: 91.116,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XDUK.DE',
    name: 'Xtrackers FTSE 100 UCITS ETF',
    price: 16.55,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XDW0.DE',
    name: 'Xtrackers MSCI World Energy UCITS ETF',
    price: 45.85,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWC.DE',
    name: 'Xtrackers MSCI World Consumer Discretionary UCITS ETF',
    price: 57.16,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWD.DE',
    name: 'Xtrackers MSCI World UCITS ETF',
    price: 114.385,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWF.DE',
    name: 'Xtrackers MSCI World Financials UCITS ETF',
    price: 35.04,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWH.DE',
    name: 'Xtrackers MSCI World Health Care UCITS ETF',
    price: 45.1,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWI.DE',
    name: 'Xtrackers MSCI World Industrials UCITS ETF',
    price: 62.59,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWL.DE',
    name: 'Xtrackers (IE) Plc - Xtrackers MSCI World UCITS ETF 1D',
    price: 95.514,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWM.DE',
    name: 'Xtrackers MSCI World Materials UCITS ETF',
    price: 55.17,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWS.DE',
    name: 'Xtrackers MSCI World Consumer Staples UCITS ETF',
    price: 44.205,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWT.DE',
    name: 'Xtrackers MSCI World Information Technology UCITS ETF',
    price: 92.07,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWU.DE',
    name: 'Xtrackers MSCI World Utilities UCITS ETF',
    price: 36.05,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XDWY.DE',
    name: 'Xtrackers MSCI World ESG Screened UCITS ETF',
    price: 23.255,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XEC1.F',
    name: 'Xtrackers II EUR Corporate Bond UCITS ETF',
    price: 7.6052,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XEIN.DE',
    name: 'Xtrackers II Eurozone Inflation-Linked Bond UCITS ETF',
    price: 237.32,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XESD.DE',
    name: 'Xtrackers Spain UCITS ETF',
    price: 33.54,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XESP.DE',
    name: 'Xtrackers Spain UCITS ETF',
    price: 45.71,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XETC.DE',
    name: 'Xtrackers Brent Crude Oil Optimum Yield EUR Hedged ETC',
    price: 109.55,
    issuer: 'Xtrackers',
    assetClass: 'Commodity',
    category: 'Energy'
  },
  {
    symbol: 'XG7S.DE',
    name: 'Xtrackers II Global Government Bond UCITS ETF',
    price: 216.46,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'XGBE.DE',
    name: 'Xtrackers EUR Corporate Green Bond UCITS ETF',
    price: 27.577,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XGII.DE',
    name: 'Xtrackers II Global Inflation-Linked Bond UCITS ETF 1D - EUR Hedged',
    price: 189.17,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'XGIU.DE',
    name: 'Xtrackers II Global Inflation-Linked Bond UCITS ETF',
    price: 21.71,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'XGIU.F',
    name: 'Xtrackers II Global Inflation-Linked Bond UCITS ETF',
    price: 21.813,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'XGLF.DE',
    name: 'Xtrackers MSCI GCC Select Swap UCITS ETF',
    price: 22.94,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XGVD.DE',
    name: 'Xtrackers II Global Government Bond UCITS ETF 1D - EUR Hedged',
    price: 173.945,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'XHY1.DE',
    name: 'Xtrackers II EUR High Yield Corporate Bond 1-3 Swap UCITS ETF',
    price: 8.5592,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XHYA.DE',
    name: 'Xtrackers II EUR High Yield Corporate Bond UCITS ETF',
    price: 23.661,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XHYG.DE',
    name: 'Xtrackers II EUR High Yield Corporate Bond UCITS ETF',
    price: 15.9745,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XIEE.DE',
    name: 'Xtrackers MSCI Europe UCITS ETF',
    price: 77.4,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'XIEE.F',
    name: 'Xtrackers MSCI Europe UCITS ETF',
    price: 66.55,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'XJSE.DE',
    name: 'Xtrackers II Japan Government Bond UCITS ETF',
    price: 6.695,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Japan'
  },
  {
    symbol: 'XLIQ.DE',
    name: 'Xtrackers II EUR Covered Bond Swap UCITS ETF',
    price: 147.615,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XMA1.F',
    name: 'Xtrackers MSCI EM Asia ESG Screened Swap UCITS ETF',
    price: 18.546,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'XMAE.F',
    name: 'Xtrackers MSCI AC World ESG Screened UCITS ETF',
    price: 32.25,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XMAW.DE',
    name: 'Xtrackers MSCI AC World ESG Screened UCITS ETF',
    price: 40.875,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XMK9.DE',
    name: 'Xtrackers MSCI Japan UCITS ETF',
    price: 43.853,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'XMKA.DE',
    name: 'Xtrackers MSCI Africa Top 50 Swap UCITS ETF',
    price: 8.469,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XMLC.DE',
    name: 'L&G Clean Water UCITS ETF',
    price: 17.564,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XMLD.DE',
    name: 'L&G Artificial Intelligence UCITS ETF',
    price: 22.175,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XMLH.DE',
    name: 'L&G Healthcare Breakthrough UCITS ETF',
    price: 10.848,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XMLP.DE',
    name: 'L&G US Energy Infrastructure MLP UCITS ETF',
    price: 5.176,
    issuer: 'L&G',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XMME.DE',
    name: 'Xtrackers MSCI Emerging Markets UCITS ETF',
    price: 58.418,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'XMME.F',
    name: 'Xtrackers MSCI Emerging Markets UCITS ETF',
    price: 46.257,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'XMOV.DE',
    name: 'Xtrackers Future Mobility UCITS ETF',
    price: 91.9,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XMVE.DE',
    name: 'Xtrackers MSCI EMU ESG Screened UCITS ETF 1D',
    price: 33.595,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XNAS.F',
    name: 'Xtrackers NASDAQ 100 UCITS ETF',
    price: 48.25,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XNKY.F',
    name: 'Xtrackers Nikkei 225 UCITS ETF',
    price: 67.02,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'XNZW.F',
    name: 'Xtrackers World Net Zero Pathway Paris Aligned UCITS ETF',
    price: 37.745,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XPQP.DE',
    name: 'Xtrackers MSCI Philippines UCITS ETF',
    price: 1.3314,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XQUA.DE',
    name: 'Xtrackers (IE) Plc - Xtrackers ESG USD Emerging Markets Bond Quality Weighted UCITS ETF 1D',
    price: 8.9204,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'XQUE.DE',
    name: 'Xtrackers ESG USD Emerging Markets Bond Quality Weighted UCITS ETF',
    price: 8.3078,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'XREA.DE',
    name: 'Xtrackers FTSE Developed Europe ex UK Real Estate UCITS ETF',
    price: 55.52,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'XRME.F',
    name: 'Xtrackers MSCI USA ESG Screened UCITS ETF',
    price: 7.823,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XRS2.DE',
    name: 'Xtrackers Russell 2000 UCITS ETF',
    price: 297.25,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XRS2.F',
    name: 'Xtrackers Russell 2000 UCITS ETF',
    price: 318.35,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XRSM.DE',
    name: 'Xtrackers (IE) Plc - Xtrackers Russell Midcap UCITS ETF 1C',
    price: 47.835,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XS5E.DE',
    name: 'Xtrackers S&P 500 Swap UCITS ETF',
    price: 9.5666,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XS7W.DE',
    name: 'Xtrackers Portfolio Income UCITS ETF',
    price: 12.97,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XSXE.DE',
    name: 'Xtrackers Stoxx Europe 600 UCITS ETF',
    price: 132.94,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'XSXE.F',
    name: 'Xtrackers Stoxx Europe 600 UCITS ETF',
    price: 106.72,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'XU61.DE',
    name: 'BNP Paribas Easy ECPI Global ESG Infrastructure',
    price: 82.63,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XU6C.DE',
    name: 'BNP Paribas Easy MSCI Emerging SRI S-Series 5% Capped UCITS ETF EUR Distribution',
    price: 106.32,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'XUCD.DE',
    name: 'Xtrackers MSCI USA Consumer Discretionary UCITS ETF',
    price: 79.7,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XUCM.DE',
    name: 'Xtrackers MSCI USA Communication Services UCITS ETF',
    price: 72.12,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XUCM.F',
    name: 'Xtrackers MSCI USA Communication Services UCITS ETF',
    price: 42.125,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XUCS.DE',
    name: 'Xtrackers MSCI USA Consumer Staples UCITS ETF',
    price: 40.3,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XUEK.DE',
    name: 'Xtrackers S&P Europe ex UK UCITS ETF',
    price: 75.83,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'XUEM.DE',
    name: 'Xtrackers II USD Emerging Markets Bond UCITS ETF',
    price: 9.965,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'XUEN.DE',
    name: 'Xtrackers MSCI USA Energy UCITS ETF',
    price: 40.03,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XUFN.DE',
    name: 'Xtrackers MSCI USA Financials UCITS ETF',
    price: 33.815,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XUHC.DE',
    name: 'Xtrackers MSCI USA Health Care UCITS ETF',
    price: 47.725,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XUHE.DE',
    name: 'Xtrackers USD High Yield Corporate Bond UCITS ETF',
    price: 16.217,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XUHY.DE',
    name: 'Xtrackers (IE) Plc - Xtrackers USD High Yield Corporate Bond UCITS ETF 1D',
    price: 11.1325,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XUIN.F',
    name: 'Xtrackers MSCI USA Industrials UCITS ETF',
    price: 62.91,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XUTC.DE',
    name: 'Xtrackers MSCI USA Information Technology UCITS ETF',
    price: 110.48,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XUTD.DE',
    name: 'Xtrackers II US Treasuries UCITS ETF 1D',
    price: 166.06,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XUTE.DE',
    name: 'Xtrackers II US Treasuries UCITS ETF',
    price: 91.466,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'XWD1.F',
    name: 'Xtrackers MSCI World Swap UCITS ETF',
    price: 16.5615,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XWEH.DE',
    name: 'Xtrackers MSCI World Swap UCITS ETF',
    price: 44.762,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XWEH.F',
    name: 'Xtrackers MSCI World Swap UCITS ETF',
    price: 32.014,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XWTS.DE',
    name: 'Xtrackers MSCI World Communication Services UCITS ETF',
    price: 26.665,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'XY1D.DE',
    name: 'Xtrackers II iBoxx Eurozone Government Bond Yield Plus 1-3 UCITS ETF 1D',
    price: 135.665,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XY4P.DE',
    name: 'Xtrackers II iBoxx Eurozone Government Bond Yield Plus UCITS ETF',
    price: 178.34,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XYLD.DE',
    name: 'Xtrackers ESG USD Corporate Bond Short Duration UCITS ETF',
    price: 15.7025,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XYLE.DE',
    name: 'Xtrackers ESG USD Corporate Bond Short Duration UCITS ETF',
    price: 19.4685,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XYP1.DE',
    name: 'Xtrackers II iBoxx Eurozone Government Bond Yield Plus 1-3 UCITS ETF',
    price: 149.475,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XYP1.F',
    name: 'Xtrackers II iBoxx Eurozone Government Bond Yield Plus 1-3 UCITS ETF',
    price: 137.635,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XYPD.DE',
    name: 'Xtrackers II iBoxx Eurozone Government Bond Yield Plus UCITS ETF',
    price: 144.3,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XZBE.F',
    name: 'Xtrackers ESG USD Corporate Bond UCITS ETF',
    price: 31.025,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XZBU.F',
    name: 'Xtrackers ESG USD Corporate Bond UCITS ETF',
    price: 35.577,
    issuer: 'Xtrackers',
    assetClass: 'Fixed Income',
    category: 'Technology'
  },
  {
    symbol: 'XZEC.DE',
    name: 'Xtrackers MSCI Europe Consumer Discretionary ESG Screened UCITS ETF',
    price: 57.55,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'XZEM.DE',
    name: 'Xtrackers MSCI Emerging Markets ESG UCITS ETF',
    price: 49.68,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Emerging Markets'
  },
  {
    symbol: 'XZEU.DE',
    name: 'Xtrackers MSCI Europe ESG UCITS ETF',
    price: 32.16,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'XZME.F',
    name: 'Xtrackers MSCI USA ESG UCITS ETF 2C EUR Hedged',
    price: 6.798,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XZMJ.DE',
    name: 'Xtrackers MSCI Japan ESG UCITS ETF',
    price: 22.6,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'XZMU.DE',
    name: 'Xtrackers MSCI USA ESG UCITS ETF',
    price: 60.09,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'XZW0.DE',
    name: 'Xtrackers MSCI World ESG UCITS ETF',
    price: 41.415,
    issuer: 'Xtrackers',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'ZPAB.DE',
    name: 'Amundi S&P Eurozone Climate Paris Aligned UCITS ETF Capitalisation',
    price: 35.7,
    issuer: 'Amundi',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPD6.F',
    name: 'SPDR S&P U.S. Dividend Aristocrats ESG UCITS ETF',
    price: 18.416,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPD9.F',
    name: 'SPDR S&P Euro Dividend Aristocrats ESG UCITS ETF',
    price: 19.476,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDD.DE',
    name: 'SPDR S&P U.S. Consumer Discretionary Select Sector UCITS ETF',
    price: 59.47,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDE.DE',
    name: 'SPDR S&P U.S. Energy Select Sector UCITS ETF',
    price: 30.25,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDF.DE',
    name: 'SPDR S&P U.S. Financials Select Sector UCITS ETF',
    price: 53.84,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDH.DE',
    name: 'SPDR S&P U.S. Health Care Select Sector UCITS ETF',
    price: 36.235,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDI.DE',
    name: 'SPDR S&P U.S. Industrials Select Sector UCITS ETF',
    price: 55.63,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDJ.DE',
    name: 'SPDR MSCI Japan UCITS ETF',
    price: 59.298,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'ZPDJ.F',
    name: 'SPDR MSCI Japan UCITS ETF',
    price: 47.736,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'ZPDK.DE',
    name: 'SPDR S&P U.S. Communication Services Select Sector UCITS ETF',
    price: 43.66,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDM.DE',
    name: 'SPDR S&P U.S. Materials Select Sector UCITS ETF',
    price: 39.215,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDS.DE',
    name: 'SPDR S&P U.S. Consumer Staples Select Sector UCITS ETF',
    price: 36.57,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDT.DE',
    name: 'SPDR S&P U.S. Technology Select Sector UCITS ETF',
    price: 120.2,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDU.DE',
    name: 'SPDR S&P U.S. Utilities Select Sector UCITS ETF',
    price: 44.54,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPDW.DE',
    name: 'SPDR MSCI Japan UCITS ETF',
    price: 79.22,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'ZPDW.F',
    name: 'SPDR MSCI Japan UCITS ETF',
    price: 54.716,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Japan'
  },
  {
    symbol: 'ZPDX.DE',
    name: 'SPDR STOXX Europe 600 SRI UCITS ETF',
    price: 32.245,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ZPR1.DE',
    name: 'SPDR Bloomberg 1-3 Month T-Bill UCITS ETF Acc',
    price: 116.605,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ZPR5.DE',
    name: 'SPDR ICE BofA 0-5 Year EM USD Government Bond UCITS ETF',
    price: 23.468,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'ZPR6.DE',
    name: 'SPDR ICE BofA 0-5 Year EM USD Government Bond UCITS ETF',
    price: 30.179,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Emerging Markets'
  },
  {
    symbol: 'ZPRA.DE',
    name: 'SPDR S&P Pan Asia Dividend Aristocrats UCITS ETF',
    price: 45.485,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPRC.DE',
    name: 'SPDR Refinitiv Global Convertible Bond UCITS ETF',
    price: 48.189,
    issuer: 'SPDR',
    assetClass: 'Fixed Income',
    category: 'Global'
  },
  {
    symbol: 'ZPRD.DE',
    name: 'SPDR FTSE UK All Share UCITS ETF',
    price: 6.029,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ZPRE.DE',
    name: 'SPDR MSCI EMU UCITS ETF',
    price: 85.93,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ZPRE.F',
    name: 'SPDR MSCI EMU UCITS ETF',
    price: 66.72,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ZPRG.DE',
    name: 'SPDR S&P Global Dividend Aristocrats UCITS ETF',
    price: 30.63,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'ZPRI.DE',
    name: 'SPDR Morningstar Multi-Asset Global Infrastructure UCITS ETF',
    price: 31.005,
    issuer: 'SPDR',
    assetClass: 'Mixed',
    category: 'Global'
  },
  {
    symbol: 'ZPRL.DE',
    name: 'SPDR EURO STOXX Low Volatility UCITS ETF',
    price: 55.46,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ZPRL.F',
    name: 'SPDR EURO STOXX Low Volatility UCITS ETF',
    price: 44.345,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ZPRM.DE',
    name: 'SPDR Bloomberg 1-3 Month T-Bill UCITS ETF Acc',
    price: 167.11,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ZPRP.DE',
    name: 'SPDR FTSE EPRA Europe ex UK Real Estate UCITS ETF',
    price: 28.395,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ZPRR.DE',
    name: 'SPDR Russell 2000 US Small Cap UCITS ETF',
    price: 58.45,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Technology'
  },
  {
    symbol: 'ZPRS.DE',
    name: 'SPDR MSCI World Small Cap UCITS ETF',
    price: 103.78,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Global'
  },
  {
    symbol: 'ZPRU.DE',
    name: 'SPDR MSCI USA Value UCITS ETF',
    price: 57.53,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPRV.DE',
    name: 'SPDR MSCI USA Small Cap Value Weighted UCITS ETF',
    price: 63.41,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'US'
  },
  {
    symbol: 'ZPRW.DE',
    name: 'SPDR MSCI Europe Value UCITS ETF',
    price: 58.95,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ZPRX.DE',
    name: 'SPDR MSCI Europe Small Cap Value Weighted UCITS ETF',
    price: 57.66,
    issuer: 'SPDR',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ZSRI.DE',
    name: 'BNP Paribas Easy MSCI Europe SRI S-Series PAB 5% Capped',
    price: 28.74,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ZSRL.DE',
    name: 'BNP Paribas Easy FTSE EPRA/NAREIT Developed Europe',
    price: 6.933,
    issuer: 'BNP Paribas',
    assetClass: 'Equity',
    category: 'Europe'
  },
  {
    symbol: 'ZZRG.F',
    name: 'Allianz Global Investors Fund - Allianz Global Artificial Intelligence Fund',
    price: 26.224,
    issuer: 'Allianz',
    assetClass: 'Equity',
    category: 'Global'
  }
];

export const xetraETFStats = {
  totalETFs: 1852,
  extractionDate: '2025-09-03',
  
  byIssuer: {
    "RICI": 9,
    "BNPP": 4,
    "Amundi": 233,
    "Fidelity": 14,
    "iShares": 426,
    "WisdomTree": 38,
    "Leverage": 7,
    "Global": 9,
    "UBS": 113,
    "Invesco": 129,
    "Ossiam": 19,
    "Lyxor": 149,
    "HAN-GINS": 2,
    "Xtrackers": 236,
    "BNP Paribas": 56,
    "HANetf": 1,
    "L&G": 29,
    "JPMorgan": 24,
    "JPM": 6,
    "Expat": 15,
    "Rize": 4,
    "L&GE": 1,
    "The": 2,
    "Shares": 1,
    "UC": 1,
    "PIMCO": 8,
    "MSCI": 1,
    "Credit": 4,
    "Deka": 50,
    "VanEck": 21,
    "SI": 4,
    "Electric": 1,
    "EMQQ": 1,
    "Europe": 1,
    "Franklin": 16,
    "First Trust": 5,
    "Goldman": 3,
    "HSBC": 23,
    "Hamborner": 1,
    "DWS": 1,
    "PIMCo": 1,
    "Market": 3,
    "BlackRock": 3,
    "SPDR": 111,
    "Tabula": 6,
    "Vanguard": 57,
    "Harbor": 1,
    "Comgest": 1,
    "Allianz": 1
},
  
  byAssetClass: {
    "Equity": 1408,
    "Commodity": 41,
    "Fixed Income": 374,
    "Mixed": 29
}
};
