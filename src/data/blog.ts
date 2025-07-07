// src/data/blog.ts - Erweiterte Blog/Newsletter Datenstruktur

export interface BlogPost {
    id: string
    slug: string // für SEO-freundliche URLs
    title: string
    excerpt: string
    content: string // Markdown oder HTML
    author: {
      name: string
      image: string
      bio: string
      social?: {
        twitter?: string
        linkedin?: string
      }
    }
    publishedDate: string
    updatedDate?: string
    readTime: string
    category: 'newsletter' | 'analysis' | 'market-news' | 'education' | 'interview'
    tags: string[]
    image: {
      url: string
      alt: string
      caption?: string
    }
    featured: boolean
    premium: boolean // für Premium-Content
    seo: {
      metaTitle?: string
      metaDescription?: string
    }
    relatedStocks?: string[] // ticker symbols
    newsletter?: {
      issue: number
      subscribers?: number
    }
  }
  
  export interface NewsletterIssue {
    issue: number
    title: string
    sendDate: string
    subject: string
    previewText: string
    content: string
    stats: {
      sent: number
      opens: number
      clicks: number
    }
    sections: {
      marketUpdate: boolean
      portfolioChanges: boolean
      stockSpotlight: boolean
      education: boolean
    }
  }
  
  // Mock Data - erweitert
  export const blogPosts: BlogPost[] = [
    {
      id: '1',
      slug: 'warren-buffett-q4-2024-portfolio-analyse',
      title: 'Warren Buffetts Q4 2024 Portfolio: Die wichtigsten Änderungen im Detail',
      excerpt: 'Eine tiefgreifende Analyse der neuesten 13F-Filing von Berkshire Hathaway und was diese Moves für Privatanleger bedeuten.',
      content: `
  # Warren Buffetts Q4 2024 Portfolio-Analyse
  
  Warren Buffett hat mit seinem Q4 2024 13F-Filing wieder für Schlagzeilen gesorgt. Die wichtigsten Änderungen im Überblick:
  
  ## Die größten Verkäufe
  
  **Apple (AAPL)**: Berkshire hat weitere 25% seiner Apple-Position verkauft...
  
  **Bank of America (BAC)**: Fortsetzung der Verkaufsserie...
  
  ## Neue Positionen
  
  **Heico Corporation (HEI)**: Eine interessante neue Aerospace-Wette...
  
  ## Was bedeutet das für Privatanleger?
  
  1. **Cash-Position steigt**: Mit $325B Cash zeigt Buffett extreme Vorsicht
  2. **Bewertung spielt eine Rolle**: Selbst bei Lieblings-Aktien wie Apple
  3. **Opportunität wartet**: Die hohe Cash-Position deutet auf kommende Deals hin
  
  [Weiterlesen...]
      `,
      author: {
        name: 'FinClue Research Team',
        image: '/images/team-research.png',
        bio: 'Unser Research-Team analysiert täglich die Portfolios der erfolgreichsten Investoren weltweit.',
        social: {
          twitter: '@finclue_research',
          linkedin: 'company/finclue'
        }
      },
      publishedDate: '2024-12-15T09:00:00Z',
      readTime: '8 min',
      category: 'analysis',
      tags: ['Warren Buffett', 'Berkshire Hathaway', '13F Filing', 'Portfolio Analysis', 'Apple', 'Bank of America'],
      image: {
        url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&h=600&fit=crop',
        alt: 'Warren Buffett Portfolio Analysis Chart',
        caption: 'Berkshire Hathaways Portfolio-Entwicklung Q4 2024'
      },
      featured: true,
      premium: false,
      seo: {
        metaTitle: 'Warren Buffett Q4 2024 Portfolio: Vollständige Analyse | FinClue',
        metaDescription: 'Detaillierte Analyse von Warren Buffetts Q4 2024 Portfolio-Änderungen. Apple-Verkäufe, neue Positionen und was Privatanleger lernen können.'
      },
      relatedStocks: ['AAPL', 'BAC', 'HEI', 'BRK.A']
    },
    {
      id: '2',
      slug: 'newsletter-47-tech-aktien-value-chancen',
      title: 'Newsletter #47: Tech-Aktien unter Druck - Chancen für Value Investoren?',
      excerpt: 'Unser wöchentlicher Newsletter mit den wichtigsten Marktbewegungen, Super-Investor Updates und einer Deep-Dive Analyse zu aktuellen Markttrends.',
      content: `
  # FinClue Newsletter #47
  
  Liebe FinClue Community,
  
  diese Woche steht ganz im Zeichen der Tech-Korrektur und den sich daraus ergebenden Chancen für Value-orientierte Investoren.
  
  ## 📈 Markt-Update
  
  - **NASDAQ**: -3.2% diese Woche
  - **S&P 500**: -1.8%
  - **VIX**: Anstieg auf 18.5
  
  ## 🏛️ Super-Investor Moves
  
  ### Warren Buffett
  - Weitere Apple-Verkäufe bestätigt
  - Cash-Position auf Rekordniveau
  
  ### Bill Ackman  
  - Erhöht Universal Music Position um 15%
  - Netflix-Stake bleibt unverändert
  
  ## 🎯 Stock Spotlight: Meta (META)
  
  Nach dem 20% Rückgang sehen wir interessante Value-Eigenschaften...
  
  ## 📚 Diese Woche gelernt
  
  "Time is the friend of the wonderful business, the enemy of the mediocre." - Warren Buffett
  
  [Vollständiger Newsletter...]
      `,
      author: {
        name: 'Max Steinberg',
        image: '/images/author-max.png',
        bio: 'Senior Analyst bei FinClue mit 12 Jahren Erfahrung in der Fundamentalanalyse.',
        social: {
          twitter: '@max_finclue',
          linkedin: 'in/maxsteinberg'
        }
      },
      publishedDate: '2024-12-10T08:00:00Z',
      readTime: '5 min',
      category: 'newsletter',
      tags: ['Newsletter', 'Tech Stocks', 'Value Investing', 'Market Update', 'META'],
      image: {
        url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=600&fit=crop',
        alt: 'Tech stocks chart analysis',
        caption: 'Tech-Aktien Entwicklung KW 50/2024'
      },
      featured: false,
      premium: false,
      seo: {
        metaTitle: 'Newsletter #47: Tech-Korrektur bietet Value-Chancen | FinClue',
        metaDescription: 'Wöchentlicher Investment-Newsletter: Tech-Aktien unter Druck, Super-Investor Updates und Value-Chancen im aktuellen Marktumfeld.'
      },
      relatedStocks: ['META', 'AAPL', 'UMG.AS', 'NFLX'],
      newsletter: {
        issue: 47,
        subscribers: 52340
      }
    },
    {
      id: '3',
      slug: 'bill-ackman-media-strategie-2024',
      title: 'Bill Ackmans größte Bets 2024: Universal Music und Netflix im Fokus',
      excerpt: 'Warum setzt der Star-Investor weiterhin auf Media-Aktien und was können wir aus seiner Strategie lernen?',
      content: `
  # Bill Ackmans Media-Strategie: Ein Deep Dive
  
  Bill Ackman von Pershing Square Capital Management ist bekannt für seine konzentrierten, langfristigen Investments. 2024 setzt er stark auf den Medien-Sektor.
  
  ## Die Media-Thesis
  
  ### Universal Music Group (UMG)
  - **Position**: 28% des Portfolios  
  - **Thesis**: Streaming-Revolution treibt Musik-Rechte
  - **Katalog-Wert**: Unterschätzt in der Bewertung
  
  ### Netflix (NFLX)
  - **Position**: 12% des Portfolios
  - **Thesis**: Content-Monopol mit Pricing Power
  - **Moat**: Schwer replizierbare Content-Bibliothek
  
  ## Warum Media-Aktien?
  
  1. **Skalierbarkeit**: Einmal produziert, unendlich reproduzierbar
  2. **Pricing Power**: Premium-Content rechtfertigt höhere Preise  
  3. **Netzwerkeffekte**: Je mehr Nutzer, desto wertvoller die Plattform
  
  ## Risiken der Konzentration
  
  Ackmans Portfolio ist extrem konzentriert - Top 5 Positionen machen 80%+ aus...
  
  [Vollständige Analyse...]
      `,
      author: {
        name: 'Sarah Johnson',
        image: '/images/author-sarah.png',
        bio: 'Spezialistin für Hedge Fund Strategien und Medien-Investments.',
        social: {
          linkedin: 'in/sarahjohnson-finclue'
        }
      },
      publishedDate: '2024-12-08T10:30:00Z',
      readTime: '12 min',
      category: 'analysis',
      tags: ['Bill Ackman', 'Pershing Square', 'Media Stocks', 'UMG', 'Netflix', 'Concentration Risk'],
      image: {
        url: 'https://images.unsplash.com/photo-1611532736853-04841ac2c85b?w=1200&h=600&fit=crop',
        alt: 'Bill Ackman Media Strategy Analysis',
        caption: 'Pershing Squares Media-Portfolio Allokation'
      },
      featured: false,
      premium: true, // Premium Content
      seo: {
        metaTitle: 'Bill Ackmans Media-Strategie 2024: UMG & Netflix Analyse | FinClue',
        metaDescription: 'Detaillierte Analyse von Bill Ackmans Media-Investments: Warum Universal Music und Netflix, Risiken der Konzentration und Lessons für Privatanleger.'
      },
      relatedStocks: ['UMG.AS', 'NFLX', 'PSH.L']
    }
  ]
  
  // Newsletter Issues für Newsletter-Archiv
  export const newsletterIssues: NewsletterIssue[] = [
    {
      issue: 47,
      title: 'Tech-Aktien unter Druck - Value-Chancen?',
      sendDate: '2024-12-10T08:00:00Z',
      subject: '📉 Tech-Korrektur: Jetzt zugreifen oder warten?',
      previewText: 'NASDAQ -3.2%, Buffett verkauft weiter Apple, Ackman erhöht UMG...',
      content: '...',
      stats: {
        sent: 52340,
        opens: 28743,
        clicks: 4521
      },
      sections: {
        marketUpdate: true,
        portfolioChanges: true,
        stockSpotlight: true,
        education: false
      }
    },
    {
      issue: 46,
      title: 'Fed-Entscheidung: Was jetzt wichtig wird',
      sendDate: '2024-12-03T08:00:00Z',
      subject: '🏛️ Fed hält Zinsen - Markt reagiert positiv',
      previewText: 'Powell signalisiert Pause, Growth-Aktien erholen sich...',
      content: '...',
      stats: {
        sent: 51987,
        opens: 31204,
        clicks: 5103
      },
      sections: {
        marketUpdate: true,
        portfolioChanges: true,
        stockSpotlight: false,
        education: true
      }
    }
  ]
  
  // Kategorien für Filter
  export const categories = [
    { id: 'all', name: 'Alle', count: 0 },
    { id: 'newsletter', name: 'Newsletter', count: 0 },
    { id: 'analysis', name: 'Analyse', count: 0 },
    { id: 'market-news', name: 'Markt News', count: 0 },
    { id: 'education', name: 'Bildung', count: 0 },
    { id: 'interview', name: 'Interviews', count: 0 }
  ]
  
  // Helper Functions
  export function getBlogPostBySlug(slug: string): BlogPost | undefined {
    return blogPosts.find(post => post.slug === slug)
  }
  
  export function getBlogPostsByCategory(category: string): BlogPost[] {
    if (category === 'all') return blogPosts
    return blogPosts.filter(post => post.category === category)
  }
  
  export function getFeaturedPosts(): BlogPost[] {
    return blogPosts.filter(post => post.featured)
  }
  
  export function getRelatedPosts(currentPostId: string, limit: number = 3): BlogPost[] {
    const currentPost = blogPosts.find(post => post.id === currentPostId)
    if (!currentPost) return []
    
    return blogPosts
      .filter(post => 
        post.id !== currentPostId && 
        (post.category === currentPost.category || 
         post.tags.some(tag => currentPost.tags.includes(tag)))
      )
      .slice(0, limit)
  }
  
  export function getNewsletterByIssue(issue: number): NewsletterIssue | undefined {
    return newsletterIssues.find(newsletter => newsletter.issue === issue)
  }