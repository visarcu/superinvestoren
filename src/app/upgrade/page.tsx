// src/app/upgrade/page.tsx
import Link from 'next/link'

export default function UpgradePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4">Premium freischalten</h1>
      <p className="max-w-xl text-center mb-6">
        Mit Premium erhältst du Zugriff auf alle Charts, unbegrenzte Historie und exklusives Screening.
      </p>
      <a
        href="https://patreon.com/deinProjekt" 
        target="_blank" 
        rel="noopener noreferrer"
        className="px-6 py-3 bg-accent text-black rounded-lg font-semibold hover:bg-accent/90 transition"
      >
        Werde jetzt Patron auf Patreon
      </a>
      <p className="mt-4 text-sm text-gray-500">
        Nach deiner Patreon Anmeldung verifizieren wir dein Abo automatisch.
      </p>
    </main>
  )
}