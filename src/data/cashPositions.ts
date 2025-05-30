// src/data/cashPositions.ts

interface CashSnapshot {
    date: string  // z. B. "2025-03-31"
    cash: number  // Gesamt-Cash/Treasuries in USD
  }
  
  const cashPositions: Record<string, CashSnapshot[]> = {
    buffett: [
      { date: "2024-12-31", cash: 334_200_000_000 },
      { date: "2023-12-31", cash: 167_640_000_000 },
      { date: "2022-12-31", cash: 128_580_000_000 },
      { date: "2021-12-31", cash: 146_710_000_000 },
      { date: "2020-12-31", cash: 138_290_000_000 },
      { date: "2019-12-31", cash: 127_990_000_000 },
      { date: "2018-12-31", cash: 111_860_000_000 },
      { date: "2017-12-31", cash: 115_950_000_000 },
      { date: "2016-12-31", cash:  86_370_000_000 },
      { date: "2015-12-31", cash:  97_710_000_000 },
      { date: "2014-12-31", cash:  90_660_000_000 },
      { date: "2013-12-31", cash:  76_970_000_000 },
      { date: "2012-12-31", cash:  83_700_000_000 },
      { date: "2011-12-31", cash:  68_520_000_000 },
      { date: "2010-12-31", cash:  38_220_000_000 },
      { date: "2009-12-31", cash:  66_280_000_000 },
      { date: "2008-12-31", cash:  25_530_000_000 },
      { date: "2007-12-31", cash:  44_320_000_000 },
      { date: "2006-12-31", cash:  43_740_000_000 },
      { date: "2005-12-31", cash:  44_660_000_000 },
      { date: "2004-12-31", cash:  74_730_000_000 },
      { date: "2003-12-31", cash:  35_950_000_000 },
      { date: "2002-12-31", cash:  12_740_000_000 },
      { date: "2001-12-31", cash:  67_840_000_000 },
      { date: "2000-12-31", cash:  39_050_000_000 },
      { date: "1999-12-31", cash:   5_450_000_000 },
      { date: "1998-12-31", cash:  15_230_000_000 },
      { date: "1997-12-31", cash:   1_050_000_000 },
      { date: "1996-12-31", cash:   1_350_000_000 },
    ],
    // später evtl. für andere Investoren
  }
  
  export default cashPositions