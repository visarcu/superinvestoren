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
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="
        space-y-6
        bg-gray-800/60 backdrop-blur-xl
        border border-gray-700 rounded-2xl shadow-lg
        p-6
      "
    >
      {/* Fehler / Erfolg */}
      {error && (
        <p className="bg-red-900 text-red-300 px-4 py-2 rounded text-center">
          {error}
        </p>
      )}
      {success && (
        <p className="bg-green-800 text-green-200 px-4 py-2 rounded text-center">
          Profil aktualisiert!
        </p>
      )}

      {/* E-Mail */}
      <div className="flex flex-col">
        <label className="mb-1 text-gray-300">E-Mail</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="
            w-full px-4 py-3
            bg-gray-900/50 backdrop-blur-md
            border border-gray-600 rounded-lg
            text-gray-100 placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-accent
            transition
          "
        />
      </div>

      {/* Vor- und Nachname */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col">
          <label className="mb-1 text-gray-300">Vorname</label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="
              w-full px-4 py-3
              bg-gray-900/50 backdrop-blur-md
              border border-gray-600 rounded-lg
              text-gray-100 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-accent
              transition
            "
          />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-gray-300">Nachname</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="
              w-full px-4 py-3
              bg-gray-900/50 backdrop-blur-md
              border border-gray-600 rounded-lg
              text-gray-100 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-accent
              transition
            "
          />
        </div>
      </div>

      {/* Speichern-Button */}
      <button
        type="submit"
        disabled={loading}
        className="
          w-full py-3
          bg-accent text-black font-semibold
          rounded-lg hover:bg-accent/90
          disabled:opacity-50
          transition
        "
      >
        {loading ? 'Speichern…' : 'Speichern'}
      </button>
    </form>
  )
}