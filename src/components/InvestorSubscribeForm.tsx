// src/components/InvestorSubscribeForm.tsx
'use client'

import { useState } from 'react'
import { EnvelopeIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'

interface Props {
  investorId: string
}

export default function InvestorSubscribeForm({ investorId }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch(`/api/investor/${investorId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) throw new Error('Fehler beim Speichern')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-gray-700">
        {status === 'success' ? (
          <div className="flex flex-col items-center gap-4 text-brand-light">
            <CheckCircleIcon className="w-12 h-12" />
            <h3 className="text-xl font-semibold">Vielen Dank!</h3>
            <p>Du erhältst in Kürze Updates per E-Mail.</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-4 text-center">
              Updates erhalten
            </h3>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <EnvelopeIcon className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  required
                  placeholder="Deine E-Mail"
                  className="w-full pl-10 pr-4 py-2 bg-transparent border border-gray-700 rounded-xl focus:border-accent focus:ring-1 focus:ring-accent text-white placeholder-gray-500 transition"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-2 bg-accent hover:bg-accent/90 text-black font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-wait"
              >
                {status === 'loading' ? '…' : 'Abonnieren'}
              </button>
            </form>
            {status === 'error' && (
              <div className="mt-3 flex items-center gap-2 text-red-400">
                <XCircleIcon className="w-5 h-5" />
                <span>Da ist etwas schiefgelaufen. Versuch es nochmal.</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}