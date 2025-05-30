// src/app/profile/page.tsx
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/db'
import ProfileForm from '@/components/ProfileForm'
import CancelButton from '@/components/CancelButton'
import { FaCrown, FaUserSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export const metadata = { title: 'Mein Profil – FinClue' }

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      isPremium: true,
      emailVerified: true,
      premiumSince: true,     
    },
  })
  if (!user) redirect('/auth/signin')

  // formatiere Datum, falls vorhanden
  const memberSince = user.premiumSince
    ? format(user.premiumSince, 'dd.MM.yyyy', { locale: de })
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6 flex justify-center">
      <div className="max-w-lg w-full space-y-8">
        <h1 className="text-3xl font-orbitron text-white text-center">Mein Profil</h1>

        {/* Status-Badges */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-4">
            {user.isPremium ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500 text-black rounded-full">
                <FaCrown /> Premium-User
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full">
                <FaUserSlash /> Kostenloser Account
              </span>
            )}
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-black rounded-full">
                <FaCheckCircle /> E-Mail bestätigt
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-700 text-white rounded-full">
                <FaTimesCircle /> E-Mail nicht bestätigt
              </span>
            )}
          </div>
<br></br>
          {/* Nur wenn Premium */}
          {user.isPremium && memberSince && (
            <p className="text-gray-400 text-sm">
              Mitglied seit <span className="font-medium text-gray-200">{memberSince}</span>
            </p>
          )}
        </div>

        {/* Profil-Form & Kündigen-Button */}
        <div className="bg-gray-800/70 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-lg p-6 space-y-6">
          <ProfileForm
            initialEmail={user.email}
            initialFirstName={user.firstName || ''}
            initialLastName={user.lastName || ''}
          />
          {user.isPremium && <CancelButton />}
        </div>
      </div>
    </div>
  )
}