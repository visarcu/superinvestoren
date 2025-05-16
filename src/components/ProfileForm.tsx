// components/ProfileForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  initialEmail: string
  initialFirstName: string
  initialLastName: string
}

export default function ProfileForm({
  initialEmail,
  initialFirstName,
  initialLastName,
}: Props) {
  const [email, setEmail] = useState(initialEmail)
  const [firstName, setFirstName] = useState(initialFirstName)
  const [lastName, setLastName] = useState(initialLastName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || 'Update fehlgeschlagen')
      }
      setSuccess(true)
      // Optional: Seite neu laden, damit session.email u.ä. aktualisiert werden
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card-dark p-6 rounded-lg">
      {error && <p className="text-red-400">{error}</p>}
      {success && <p className="text-green-400">Profil aktualisiert!</p>}

      <div>
        <label className="block mb-1">E-Mail</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 bg-transparent border border-gray-600 rounded"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Vorname</label>
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="w-full p-2 bg-transparent border border-gray-600 rounded"
          />
        </div>
        <div>
          <label className="block mb-1">Nachname</label>
          <input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="w-full p-2 bg-transparent border border-gray-600 rounded"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-accent text-black rounded hover:bg-accent/90 disabled:opacity-50"
      >
        {loading ? 'Speichern…' : 'Speichern'}
      </button>
    </form>
  )
}