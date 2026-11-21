// Rahmen der Depot-Startseite auf depot.finclue.de (für Abgemeldete): eigene,
// schlanke Kopfzeile "Finclue Depot" statt der Finclue-Navigation, damit sich
// der Tracker wie eine eigene App anfühlt. Links zur Hauptseite sind absolut.

import Link from 'next/link'
import { mainSiteHref } from '@/lib/siteHosts'
import { WORKSPACE_PATH } from '@/lib/depotRoutes'
import { landingFontVars, DISPLAY } from '@/components/landing/landingFonts'

const signupHref = mainSiteHref(`/auth/signup?redirect=${encodeURIComponent(WORKSPACE_PATH)}`)
const signinHref = mainSiteHref(`/auth/signin?redirect=${encodeURIComponent(WORKSPACE_PATH)}`)

function DepotMark() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 12 12" className="shrink-0">
      <rect x="0" y="0" width="5" height="5" rx="1.2" fill="currentColor" />
      <rect x="7" y="0" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.35" />
      <rect x="0" y="7" width="5" height="5" rx="1.2" fill="currentColor" opacity="0.35" />
      <rect x="7" y="7" width="5" height="5" rx="1.2" fill="currentColor" />
    </svg>
  )
}

export default function DepotSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${landingFontVars} flex min-h-screen flex-col bg-[#0D0E0C] text-[#ECEDE8]`}>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1F211D] bg-[#0D0E0C]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold text-[#ECEDE8]" style={DISPLAY}>
            <DepotMark />
            Finclue Depot
          </Link>
          <nav className="flex items-center gap-2">
            <a href={signinHref} className="rounded-lg px-3 py-2 text-sm text-[#B4B6AE] transition-colors hover:text-white">
              Anmelden
            </a>
            <a
              href={signupHref}
              className="rounded-lg bg-[#ECEDE8] px-3.5 py-2 text-sm font-medium text-[#0D0E0C] transition-colors hover:bg-white"
            >
              Kostenlos starten
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-grow pt-16">{children}</main>

      <footer className="border-t border-[#1F211D] py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-xs text-[#7C7F76] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            Finclue Depot ist Teil von{' '}
            <a href={mainSiteHref('/')} className="text-[#B4B6AE] hover:text-white">
              Finclue
            </a>
            . Keine Anlageberatung.
          </p>
          <div className="flex gap-4">
            <a href={mainSiteHref('/impressum')} className="hover:text-white">Impressum</a>
            <a href={mainSiteHref('/privacy')} className="hover:text-white">Datenschutz</a>
            <a href={mainSiteHref('/terms')} className="hover:text-white">AGB</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
