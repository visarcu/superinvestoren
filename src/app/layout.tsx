// src/app/layout.tsx - ROOT LAYOUT (FONT-FIX)
import './globals.css'

export const metadata = {
  title: 'FinClue',
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
                // Light Theme temporär deaktiviert - immer Dark Mode
                try {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add('dark');
                  localStorage.setItem('finclue-terminal-theme', 'dark');
                } catch (e) {}
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
