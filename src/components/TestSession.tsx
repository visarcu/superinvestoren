'use client'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function TestSession() {
  const { data: session, status } = useSession()
  if (status === 'loading') return <p>Lade …</p>
  if (!session) {
    return <button onClick={() => signIn()}>Anmelden</button>
  }
  return (
    <div>
      <p>Hallo {session.user.email}!</p>
      <p>Premium: {session.user.isPremium ? 'Ja' : 'Nein'}</p>
      <button onClick={() => signOut()}>Abmelden</button>
    </div>
  )
}