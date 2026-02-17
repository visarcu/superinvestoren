// src/app/layout.tsx - ROOT LAYOUT (FONT-FIX)
import './globals.css'
import { CookieConsent } from '@/components/CookieConsent'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://finclue.de'),
  title: {
    default: 'Finclue | Professionelle Aktienanalyse & Super-Investor Tracking',
    template: '%s | Finclue',
  },
  description: 'Professionelle Aktienanalyse-Plattform mit 10.000+ Aktien, 90+ Super-Investor Portfolios aus SEC 13F Filings, KI-Analysen und fundamentalen Kennzahlen. Kostenlos testen.',
  keywords: ['Aktienanalyse', 'Super-Investor', '13F Filing', 'Portfolio Tracking', 'Value Investing', 'Warren Buffett', 'Aktien', 'Börse', 'Finanzanalyse'],
  authors: [{ name: 'Finclue' }],
  creator: 'Finclue',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://finclue.de',
    siteName: 'Finclue',
    title: 'Finclue | Professionelle Aktienanalyse & Super-Investor Tracking',
    description: 'Verfolge die Portfolios von Warren Buffett, Bill Ackman und 90+ weiteren Super-Investoren. Quartalsweise Updates aus SEC 13F Filings.',
    images: [
      {
        url: '/laptop-finclue-preview.png',
        width: 1200,
        height: 630,
        alt: 'Finclue - Professionelle Aktienanalyse-Plattform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Finclue | Professionelle Aktienanalyse & Super-Investor Tracking',
    description: 'Verfolge die Portfolios von Warren Buffett, Bill Ackman und 90+ weiteren Super-Investoren.',
    images: ['/laptop-finclue-preview.png'],
  },
  alternates: {
    canonical: 'https://finclue.de',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Lade gespeichertes Theme oder verwende 'dark' als Standard
                  var savedTheme = localStorage.getItem('finclue-terminal-theme');
                  var theme = savedTheme || 'dark';

                  // Wende Theme an
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(theme);
                } catch (e) {
                  // Fallback zu dark
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans bg-theme-primary text-theme-primary" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://finclue.de/#organization',
                  name: 'Finclue',
                  url: 'https://finclue.de',
                  logo: {
                    '@type': 'ImageObject',
                    url: 'https://finclue.de/icon.png',
                  },
                  description: 'Professionelle Aktienanalyse-Plattform mit Super-Investor Portfolio Tracking aus SEC 13F Filings.',
                  sameAs: [
                    'https://www.instagram.com/loeweinvest/',
                  ],
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://finclue.de/#website',
                  url: 'https://finclue.de',
                  name: 'Finclue',
                  publisher: { '@id': 'https://finclue.de/#organization' },
                  inLanguage: 'de-DE',
                },
              ],
            }),
          }}
        />
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}
