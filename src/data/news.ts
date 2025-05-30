// src/data/news.ts

export interface NewsItem {
    date:    string   // z.B. "2025-04-15"
    title:   string
    description: string
    url:     string   // interne oder externe URL
    source?: string   // optional: Name der Quelle, z.B. "Der Aktionär"
  }
  
  export const superInvestorNews: NewsItem[] = [
    {
        date:   '2025-05-28',
        title:  'Warren Buffett erhöht Position bei Heico',
        description:
          'Bei einem Indexmitglied, in das selbst Investmentlegende Warren Buffett investiert ist, sorgten jüngst positive Nachrichten für Auftrieb. ',
        url:    'https://www.deraktionaer.de/artikel/indizes/warren-buffett-setzt-auf-ruestung-und-diese-aktie-liefert-ab-20380989.html',
        source: 'Der Aktionär',            // externe Quelle
      },
    {
      date: '2024-10-11',
      title: 'Warren Buffett verkauft erneut Anteile der Bank of America',
      description:
        'Die Verkäufe gehen weiter: Warren Buffett trennt sich von weiteren Aktien der Bank of America. Doch der Kurs könnte davon profitieren, meint ein Analyst.',
      url:   '/analyse/bofa',         // bleibt intern
    },
    {
      date:   '2025-04-10',
      title:  'Bill Ackman erklärt Uber-Kauf',
      description:
        'Bill Ackman kauft sich einen riesigen Anteil an Uber – was steckt hinter seiner Wette?',
      url:    '',
      source: 'Trading View',            // externe Quelle
    },

    {
      date:   '2025-04-10',
      title:  'Pershing Square Holdings, Ltd., 2024 Annual Report',
      description:
        'Pershing Square Holdings, Ltd. (“PSH”, or the “Company”) (LN:PSH) (LN:PSHD) is an investment holding company structured as a closed-ended fund principally engaged in the business of acquiring and holding significant positions in a concentrated number of large capitalization companies. PSH’s objective is to maximize its long-term compound annual rate of growth in intrinsic value per share.',
      url:    'https://assets.pershingsquareholdings.com/2025/03/14150847/Pershing-Square-Holdings-Ltd.-2024-Annual-Report.pdf',
      source: 'Pershing Square Holdings, Ltd., 2024 Annual Report',            // externe Quelle
    },

    // … weitere Items
  ]