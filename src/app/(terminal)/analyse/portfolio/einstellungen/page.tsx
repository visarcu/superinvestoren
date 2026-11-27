// src/app/(terminal)/analyse/portfolio/einstellungen/page.tsx
//
// Hier lag bis November 2026 eine Platzhalterseite aus der Anfangszeit:
// Positionsliste mit erfundenen Kursen (Math.random), Schalter ohne Wirkung,
// Broker-Liste "Geplant". Sie war weiterhin erreichbar, auch aus der
// Trial-Mail ("Abo kündigen") und über /analyse/mein-portfolio/einstellungen.
// Abo und Einstellungen liegen im Profil; Depot-Einstellungen im Workspace.
import { redirect } from 'next/navigation'

export default function PortfolioEinstellungenRedirect() {
  redirect('/profile')
}
