'use client'

import React, { useState, FormEvent } from 'react'

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')

    try {
      // Hier würdest Du normalerweise an Deinen Newsletter-API-Endpoint posten,
      // z.B. fetch('/api/newsletter', { method: 'POST', body: JSON.stringify({ email }) })
      // Wir simulieren das hier nur mit einem Timeout:
      await new Promise(resolve => setTimeout(resolve, 1000))

      setStatus('success')
      setEmail('')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <p className="text-green-600 font-medium">
        Vielen Dank für Deine Anmeldung!
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-center justify-center gap-2"
    >
      <input
        type="email"
        placeholder="Deine E-Mail"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="
          w-full sm:w-auto flex-grow px-4 py-2 
          border border-gray-300 rounded 
          focus:outline-none focus:ring-2 focus:ring-accent
        "
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="
          px-6 py-2 bg-accent text-white font-medium 
          rounded hover:bg-green-500 
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {status === 'loading' ? '…' : 'Abonnieren'}
      </button>
      {status === 'error' && (
        <p className="text-red-600 mt-2 text-sm">
          Da ist etwas schiefgegangen. Bitte versuche es nochmal.
        </p>
      )}
    </form>
  )
}