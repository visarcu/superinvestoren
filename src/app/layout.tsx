// src/app/layout.tsx - ROOT LAYOUT (FONT-FIX)
import './globals.css'

export const metadata = {
  title: 'Finclue',
  description: 'Professionelle Aktien-Analyse Platform',
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
        {children}
      </body>
    </html>
  )
}
