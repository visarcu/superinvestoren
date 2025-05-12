'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function AuthButton() {
  const { data: session } = useSession()

  return session ? (
    <button
      onClick={() => signOut()}
      className="ml-4 px-4 py-2 bg-red-600 rounded hover:bg-red-700"
    >
      Abmelden
    </button>
  ) : (
    <Link
      href="/auth/signin"
      className="ml-4 px-4 py-2 bg-accent text-black rounded hover:bg-accent/90"
    >
      Anmelden
    </Link>
  )
}