/**
 * Portfolio News Generator - konvertiert Portfolio-Änderungen in News-Artikel
 */

import { 
  PortfolioChange, 
  PortfolioAnalysis, 
  formatCurrency, 
  formatShares 
} from './portfolioChangeDetection';

export interface GeneratedNewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  timestamp: string;
  investor: string;
  type: 'NEW_POSITION' | 'INCREASED' | 'DECREASED' | 'SOLD' | 'PORTFOLIO_SUMMARY';
  ticker?: string;
  cusip: string;
  value: number;
  change: number;
  significance: 'MAJOR' | 'SIGNIFICANT' | 'MINOR';
  tags: string[];
  source: '13F_FILING';
}

const INVESTOR_DISPLAY_NAMES: Record<string, string> = {
  'buffett': 'Warren Buffett',
  'berkshire': 'Berkshire Hathaway',
  'icahn': 'Carl Icahn',
  'ackman': 'Bill Ackman',
  'dalio': 'Ray Dalio',
  'einhorn': 'David Einhorn',
  'loeb': 'Daniel Loeb',
  'paulson': 'John Paulson',
  'soros': 'George Soros',
  'druckenmiller': 'Stanley Druckenmiller'
};

const NEWS_TEMPLATES = {
  NEW_POSITION: {
    major: {
      title: '{investor} nimmt massive ${value} Position in {company} ein',
      summary: '{investor} initiierte eine neue Position im Wert von {valueFormatted} in {company} und erwarb {sharesFormatted} Aktien laut aktuellem 13F-Filing.',
      content: 'In einem bedeutenden Schritt, der im aktuellen 13F-Filing offengelegt wurde, hat {investor} eine substanzielle ${value} Position in {company} ({ticker}) eingenommen und {sharesFormatted} Aktien erworben. Dies stellt eine neue Ergänzung des legendären Investor-Portfolios dar und signalisiert starke Überzeugung bezüglich der Unternehmensaussichten.'
    },
    significant: {
      title: '{investor} fügt {company} mit ${value} Investment zum Portfolio hinzu',
      summary: '{investor} etablierte eine neue {valueFormatted} Position in {company} und fügte {sharesFormatted} Aktien zum Portfolio hinzu.',
      content: '{investor} hat eine neue Position in {company} ({ticker}) initiiert und {valueFormatted} durch den Erwerb von {sharesFormatted} Aktien investiert, wie im aktuellen 13F-Filing offengelegt wurde.'
    },
    minor: {
      title: '{investor} nimmt neue Position in {company} ein',
      summary: '{investor} fügte {company} mit {sharesFormatted} Aktien im Wert von {valueFormatted} zum Portfolio hinzu.',
      content: '{investor} etablierte eine neue Position in {company} ({ticker}) durch den Kauf von {sharesFormatted} Aktien im Wert von {valueFormatted}, laut aktuellem 13F-Filing.'
    }
  },
  INCREASED: {
    major: {
      title: '{investor} erhöht {company} Position dramatisch um ${value}',
      summary: '{investor} verstärkte {company} Beteiligungen um {changePercent}% durch Hinzufügung von {sharesChangeFormatted} Aktien im Wert von {valueChangeFormatted}.',
      content: 'Mit gesteigertem Vertrauen hat {investor} die {company} ({ticker}) Position signifikant um {changePercent}% erweitert, indem {sharesChangeFormatted} Aktien im Wert von {valueChangeFormatted} hinzugefügt wurden. Die Gesamtposition ist nun {totalValueFormatted} wert mit {totalSharesFormatted} Aktien.'
    },
    significant: {
      title: '{investor} erhöht {company} Position um {changePercent}%',
      summary: '{investor} fügte {sharesChangeFormatted} Aktien von {company} hinzu und erhöhte die Position um {changePercent}%.',
      content: '{investor} baute die {company} ({ticker}) Position weiter aus, indem {sharesChangeFormatted} Aktien im Wert von {valueChangeFormatted} hinzugefügt wurden. Diese {changePercent}% Erhöhung bringt die Gesamtbeteiligung auf {totalSharesFormatted} Aktien im Wert von {totalValueFormatted}.'
    },
    minor: {
      title: '{investor} stockt {company} Beteiligung auf',
      summary: '{investor} erhöhte {company} Position um {sharesChangeFormatted} zusätzliche Aktien.',
      content: '{investor} erweiterte die {company} ({ticker}) Beteiligung durch den Kauf von {sharesChangeFormatted} zusätzlichen Aktien, was eine {changePercent}% Positionserhöhung darstellt.'
    }
  },
  DECREASED: {
    major: {
      title: '{investor} reduziert {company} Position drastisch um ${value}',
      summary: '{investor} verringerte {company} Beteiligungen um {changePercent}% durch Verkauf von {sharesChangeFormatted} Aktien im Wert von {valueChangeFormatted}.',
      content: 'In einer bemerkenswerten Portfolio-Anpassung hat {investor} die {company} ({ticker}) Position substanziell um {changePercent}% reduziert und {sharesChangeFormatted} Aktien im Wert von {valueChangeFormatted} veräußert. Die verbleibende Position ist {totalValueFormatted} wert.'
    },
    significant: {
      title: '{investor} kürzt {company} Position um {changePercent}%',
      summary: '{investor} reduzierte {company} Beteiligungen durch Verkauf von {sharesChangeFormatted} Aktien im Wert von {valueChangeFormatted}.',
      content: '{investor} verringerte die {company} ({ticker}) Position um {changePercent}%, indem {sharesChangeFormatted} Aktien für etwa {valueChangeFormatted} verkauft wurden. Die reduzierte Beteiligung umfasst nun {totalSharesFormatted} Aktien.'
    },
    minor: {
      title: '{investor} reduziert {company} Beteiligung',
      summary: '{investor} kürzte {company} Position durch Verkauf von {sharesChangeFormatted} Aktien.',
      content: '{investor} tätigte eine kleine Anpassung der {company} ({ticker}) Position und reduzierte die Beteiligung um {sharesChangeFormatted} Aktien, eine {changePercent}% Verringerung.'
    }
  },
  SOLD: {
    major: {
      title: '{investor} steigt komplett aus ${value} {company} Position aus',
      summary: '{investor} verkaufte gesamte {company} Beteiligung und veräußerte {sharesFormatted} Aktien im Wert von {valueFormatted}.',
      content: 'In einem bedeutenden Portfolio-Move ist {investor} komplett aus der {company} ({ticker}) Position ausgestiegen und verkaufte alle {sharesFormatted} Aktien, die zuvor {valueFormatted} wert waren. Dies stellt eine komplette Umkehrung zur Beteiligung des vorherigen Quartals dar.'
    },
    significant: {
      title: '{investor} steigt aus {company} Position aus',
      summary: '{investor} verkaufte gesamte {valueFormatted} Beteiligung in {company} und veräußerte alle {sharesFormatted} Aktien.',
      content: '{investor} ist vollständig aus {company} ({ticker}) ausgestiegen und verkaufte die komplette Position von {sharesFormatted} Aktien, die im vorherigen Quartal {valueFormatted} wert war.'
    },
    minor: {
      title: '{investor} schließt {company} Position',
      summary: '{investor} stieg aus {company} aus durch Verkauf aller {sharesFormatted} Aktien.',
      content: '{investor} schloss die {company} ({ticker}) Position durch Verkauf aller {sharesFormatted} Aktien und beendete das Investment, das {valueFormatted} wert war.'
    }
  }
};

/**
 * Bestimmt die Bedeutung einer Portfolio-Änderung
 */
function getSignificance(change: PortfolioChange): 'MAJOR' | 'SIGNIFICANT' | 'MINOR' {
  if (change.isMajorMove) return 'MAJOR';
  if (change.isSignificant) return 'SIGNIFICANT';
  return 'MINOR';
}

/**
 * Extrahiert Ticker-Symbol aus Company-Namen (vereinfacht)
 */
function extractTicker(companyName: string): string {
  // Vereinfachte Ticker-Extraktion - in Realität würde man eine Mapping-Tabelle verwenden
  const tickerMap: Record<string, string> = {
    'APPLE INC': 'AAPL',
    'AMERICAN EXPRESS CO': 'AXP',
    'COCA COLA CO': 'KO',
    'BANK AMER CORP': 'BAC',
    'OCCIDENTAL PETE CORP': 'OXY',
    'CHEVRON CORP NEW': 'CVX',
    'KRAFT HEINZ CO': 'KHC',
    'CHUBB LIMITED': 'CB',
    'MOODYS CORP': 'MCO',
    'VISA INC': 'V',
    'AMAZON COM INC': 'AMZN'
  };
  
  return tickerMap[companyName] || companyName.split(' ')[0];
}

/**
 * Generiert News-Item aus Portfolio-Änderung
 */
function generateNewsFromChange(
  change: PortfolioChange,
  analysis: PortfolioAnalysis
): GeneratedNewsItem {
  const investor = INVESTOR_DISPLAY_NAMES[analysis.investor] || analysis.investor;
  const significance = getSignificance(change);
  const ticker = extractTicker(change.name);
  
  // Skip UNCHANGED changes as they don't have templates
  if (change.type === 'UNCHANGED') {
    console.warn(`Skipping UNCHANGED change for ${change.name}`);
    return {
      id: `${analysis.investor}-${change.cusip}-${analysis.currentQuarter}`,
      title: `${investor} Maintains ${change.name} Position`,
      summary: `${investor} holds steady position in ${change.name}`,
      content: `${investor} maintained their position in ${change.name}, with no significant changes in the latest 13F filing for ${analysis.currentQuarter}.`,
      timestamp: new Date().toISOString(),
      investor: analysis.investor,
      type: 'NEW_POSITION', // Convert to valid type
      ticker,
      cusip: change.cusip,
      value: change.currentValue,
      change: 0,
      significance,
      tags: [analysis.investor, 'unchanged', significance.toLowerCase(), ticker],
      source: '13F_FILING'
    };
  }
  
  // Ensure template exists, fallback to default if needed
  const templateSet = NEWS_TEMPLATES[change.type as keyof typeof NEWS_TEMPLATES];
  const templateKey = significance.toLowerCase() as 'major' | 'significant' | 'minor';
  if (!templateSet || !templateSet[templateKey]) {
    console.warn(`Missing template for ${change.type} ${significance}, using fallback`);
    
    // Create a fallback template
    return {
      id: `${analysis.investor}-${change.cusip}-${analysis.currentQuarter}`,
      title: `${investor} Updates ${change.name} Position`,
      summary: `${investor} made changes to ${change.name} holdings`,
      content: `${investor} has adjusted their position in ${change.name}, according to the latest 13F filing for ${analysis.currentQuarter}.`,
      timestamp: new Date().toISOString(),
      investor: analysis.investor,
      type: change.type as 'NEW_POSITION' | 'INCREASED' | 'DECREASED' | 'SOLD' | 'PORTFOLIO_SUMMARY',
      ticker,
      cusip: change.cusip,
      value: Math.abs(change.type === 'SOLD' ? change.previousValue : change.currentValue),
      change: change.valueChange,
      significance,
      tags: [analysis.investor, change.type.toLowerCase(), significance.toLowerCase(), ticker],
      source: '13F_FILING'
    };
  }
  
  const template = templateSet[templateKey];
  
  // Template-Variablen
  const vars = {
    investor,
    company: change.name,
    ticker,
    value: Math.abs(change.type === 'SOLD' ? change.previousValue : change.currentValue),
    valueFormatted: formatCurrency(Math.abs(change.type === 'SOLD' ? change.previousValue : change.currentValue), true),
    changeValue: Math.abs(change.valueChange),
    valueChangeFormatted: formatCurrency(Math.abs(change.valueChange), true),
    sharesFormatted: formatShares(change.type === 'SOLD' ? change.previousShares : change.currentShares, true),
    sharesChangeFormatted: formatShares(Math.abs(change.shareChange), true),
    totalValueFormatted: formatCurrency(change.currentValue, true),
    totalSharesFormatted: formatShares(change.currentShares, true),
    changePercent: Math.abs(change.percentChange).toFixed(1)
  };
  
  // Template-Replacement
  const replaceTemplate = (text: string) => {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return vars[key as keyof typeof vars]?.toString() || match;
    });
  };
  
  const title = replaceTemplate(template.title);
  const summary = replaceTemplate(template.summary);
  const content = replaceTemplate(template.content);
  
  return {
    id: `${analysis.investor}-${change.cusip}-${analysis.currentQuarter}`,
    title,
    summary,
    content,
    timestamp: new Date().toISOString(),
    investor: analysis.investor,
    type: change.type,
    ticker,
    cusip: change.cusip,
    value: Math.abs(change.type === 'SOLD' ? change.previousValue : change.currentValue),
    change: change.valueChange,
    significance,
    tags: [
      analysis.investor,
      change.type.toLowerCase(),
      significance.toLowerCase(),
      ticker
    ],
    source: '13F_FILING'
  };
}

/**
 * Generiert Portfolio-Summary News
 */
function generatePortfolioSummary(analysis: PortfolioAnalysis): GeneratedNewsItem {
  const investor = INVESTOR_DISPLAY_NAMES[analysis.investor] || analysis.investor;
  const majorChanges = analysis.changes.filter(c => c.isMajorMove);
  const portfolioChangePercent = ((analysis.summary.totalValueChange / analysis.summary.portfolioValuePrevious) * 100);
  
  let title: string;
  let summary: string;
  let significance: 'MAJOR' | 'SIGNIFICANT' | 'MINOR' = 'MINOR';
  
  if (majorChanges.length > 0 || Math.abs(portfolioChangePercent) > 10) {
    significance = 'MAJOR';
    title = `${investor} nimmt bedeutende Portfolio-Anpassungen in ${analysis.currentQuarter} vor`;
    summary = `${investor} meldete ${majorChanges.length} große Bewegungen und ${analysis.changes.length} gesamte Positionsveränderungen, wobei sich der Portfolio-Wert um ${Math.abs(portfolioChangePercent).toFixed(1)}% ${portfolioChangePercent >= 0 ? 'erhöhte' : 'verringerte'}.`;
  } else if (analysis.changes.length > 5) {
    significance = 'SIGNIFICANT';
    title = `${investor} aktualisiert Portfolio mit ${analysis.changes.length} Positionsveränderungen`;
    summary = `${investor} tätigte ${analysis.changes.length} Portfolio-Anpassungen inklusive ${analysis.summary.newPositions} neuer Positionen und ${analysis.summary.soldPositions} Ausstiegen.`;
  } else {
    title = `${investor} reicht ${analysis.currentQuarter} 13F mit kleineren Anpassungen ein`;
    summary = `${investor} meldete ${analysis.changes.length} Positionsveränderungen in der aktuellen Quartalsabreichung.`;
  }
  
  const content = `${investor} hat den ${analysis.currentQuarter} 13F-Bericht mit ${analysis.changes.length} Portfolio-Veränderungen eingereicht. Die Einreichung zeigt ${analysis.summary.newPositions} neue Positionen, ${analysis.summary.increasedPositions} erhöhte Beteiligungen, ${analysis.summary.decreasedPositions} reduzierte Positionen und ${analysis.summary.soldPositions} komplette Ausstiege. Der gesamte Portfolio-Wert ${portfolioChangePercent >= 0 ? 'stieg' : 'fiel'} um ${formatCurrency(Math.abs(analysis.summary.totalValueChange), true)} (${Math.abs(portfolioChangePercent).toFixed(1)}%) auf ${formatCurrency(analysis.summary.portfolioValueCurrent, true)}.`;
  
  return {
    id: `${analysis.investor}-summary-${analysis.currentQuarter}`,
    title,
    summary,
    content,
    timestamp: new Date().toISOString(),
    investor: analysis.investor,
    type: 'PORTFOLIO_SUMMARY',
    cusip: 'PORTFOLIO',
    value: analysis.summary.portfolioValueCurrent,
    change: analysis.summary.totalValueChange,
    significance,
    tags: [
      analysis.investor,
      'portfolio_summary',
      significance.toLowerCase(),
      analysis.currentQuarter
    ],
    source: '13F_FILING'
  };
}

/**
 * Generiert alle News-Items aus Portfolio-Analyse
 */
export function generateNewsFromPortfolioAnalysis(
  analysis: PortfolioAnalysis,
  maxNewsItems = 10
): GeneratedNewsItem[] {
  const newsItems: GeneratedNewsItem[] = [];
  
  // Portfolio Summary (immer dabei)
  newsItems.push(generatePortfolioSummary(analysis));
  
  // Individual Changes (sortiert nach Wichtigkeit, exclude UNCHANGED)
  const significantChanges = analysis.changes
    .filter(change => change.type !== 'UNCHANGED' && (change.isMajorMove || change.isSignificant))
    .slice(0, maxNewsItems - 1);
  
  significantChanges.forEach(change => {
    newsItems.push(generateNewsFromChange(change, analysis));
  });
  
  return newsItems;
}