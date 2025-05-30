'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CancelButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCancel = async () => {
    if (!confirm('Möchtest du dein Abo wirklich zum Periodenende kündigen?')) return
    setLoading(true)
    const res = await fetch('/api/stripe/cancel', { method: 'POST' })
    const json = await res.json()
    setLoading(false)

    if (json.canceled) {
      alert('Dein Abo wird zum Ende des aktuellen Abrechnungszeitraums gekündigt.')
      router.refresh()   // aktualisiert die Seite, damit isPremium neu geladen wird
    } else {
      alert('Kündigung fehlgeschlagen: ' + (json.error ?? 'Unbekannt'))
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className={`
        mt-6 px-5 py-2 rounded-lg transition
        ${loading ? 'opacity-50 cursor-wait' : ''}
        bg-gray-900 hover:bg-red-500 text-white
      `}
    >
      {loading ? '…' : 'Abo kündigen'}
    </button>
  )
}