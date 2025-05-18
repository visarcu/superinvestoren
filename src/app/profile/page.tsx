// src/app/profile/page.tsx
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/db'
import ProfileForm from '@/components/ProfileForm'
import { FaCrown, FaUserSlash, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'

export const metadata = {
  title: 'Mein Profil – SuperInvestor',
}

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
      emailVerified: true,   // neu
    },
  })
  if (!user) redirect('/auth/signin')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden p-6">
      {/* Hintergrundkreise */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[28rem] h-[28rem] bg-accent/25 rounded-full blur-2xl animate-[pulse_12s_ease-in-out_infinite]" />

      <div className="relative z-10 max-w-2xl w-full space-y-6">
        <h1 className="text-3xl font-bold text-white text-center">Mein Profil</h1>

        {/* Premium-Status */}
        <div className="flex justify-center space-x-4">
          {user.isPremium ? (
            <span className="inline-flex items-center space-x-2 px-4 py-1 bg-yellow-500 text-black font-medium rounded-full">
              <FaCrown /> <span>Premium-User</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-2 px-4 py-1 bg-red-600 text-white font-medium rounded-full">
              <FaUserSlash /> <span>Kostenloser Account</span>
            </span>
          )}

          {/* E-Mail-Verifiziert? */}
          {user.emailVerified ? (
            <span className="inline-flex items-center space-x-2 px-4 py-1 bg-green-600 text-black font-medium rounded-full">
              <FaCheckCircle /> <span>E-Mail bestätigt</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-2 px-4 py-1 bg-red-700 text-white font-medium rounded-full">
              <FaTimesCircle /> <span>E-Mail nicht bestätigt</span>
            </span>
          )}
        </div>

        {/* Glas/Blur-Box fürs Formular */}
        <div className="
          bg-gray-800/70 backdrop-blur-xl
          border border-gray-700
          rounded-3xl shadow-lg
          p-8
        ">
          <ProfileForm
            initialEmail={user.email}
            initialFirstName={user.firstName || ''}
            initialLastName={user.lastName || ''}
          />
        </div>
      </div>
    </div>
  )
}