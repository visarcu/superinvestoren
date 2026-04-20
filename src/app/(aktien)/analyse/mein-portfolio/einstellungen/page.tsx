// /analyse/mein-portfolio/einstellungen – Portfolio-Einstellungen (Server Component)
import type { Metadata } from 'next'
import EinstellungenClient from './_components/EinstellungenClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Einstellungen',
  description: 'Bearbeite Name, Cash-Position und Wertpapierkredit deines Depots.',
}

export default function EinstellungenPage() {
  return <EinstellungenClient />
}
