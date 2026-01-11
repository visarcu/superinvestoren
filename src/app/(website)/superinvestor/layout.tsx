// app/superinvestor/layout.tsx
import SuperinvestorSidebar from '@/components/SuperinvestorSidebar'
import SuperinvestorNavbar from '@/components/SuperinvestorNavbar'

export default function SuperinvestorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0F0F11]">
      {/* Sidebar */}
      <SuperinvestorSidebar />

      {/* Top Navbar - offset by sidebar width on desktop */}
      <SuperinvestorNavbar />

      {/* Main Content - offset by sidebar width on desktop, and navbar height */}
      <main className="lg:ml-60">
        {children}
      </main>
    </div>
  )
}
