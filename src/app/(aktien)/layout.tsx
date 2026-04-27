// Fullscreen Layout für Fey-Style Aktien-Seiten
// Kein Sidebar, kein Terminal-Navigation, minimalistisch

import '@/app/globals.css'
import FeyBottomNav from '@/components/FeyBottomNav'
import FeyTopBar from '@/components/FeyTopBar'

export default function AktienLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <FeyTopBar />
      {children}
      <FeyBottomNav />
    </div>
  )
}
