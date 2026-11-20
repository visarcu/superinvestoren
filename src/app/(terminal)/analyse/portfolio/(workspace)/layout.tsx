// Depot-Workspace unter /analyse/portfolio/… (auf depot.finclue.de unter /…).
// Der Workspace sitzt im Layout statt in der Seite: Beim Wechsel von Depot
// oder Ansicht ändert sich nur der Pfad, das Layout bleibt stehen und lädt
// Positionen und Kurse nicht neu. Welche Ansicht gilt, liest der Workspace
// selbst aus dem Pfad (siehe lib/depotRoutes).

import PortfolioWorkspace from '@/components/portfolio/PortfolioWorkspace'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PortfolioWorkspace />
      {children}
    </>
  )
}
