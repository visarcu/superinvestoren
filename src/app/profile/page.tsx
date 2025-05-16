// src/app/profile/page.tsx
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/db'
import ProfileForm from '@/components/ProfileForm'

export const metadata = {
  title: 'Mein Profil – SuperInvestor',
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { email: true, firstName: true, lastName: true },
  })
  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Mein Profil</h1>
      <ProfileForm
        initialEmail={user.email}
        initialFirstName={user.firstName || ''}
        initialLastName={user.lastName || ''}
      />
    </main>
  )
}