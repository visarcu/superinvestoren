// scripts/delete-test-users.js
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1) Wähle alle User aus, die du löschen möchtest
  //    Hier im Beispiel: alle mit E-Mail, die auf "@example.com" endet:
  const usersToDelete = await prisma.user.findMany({
    where: {
      email: {
        endsWith: 'vc17@vc17.de',
      },
    },
    select: {
      id: true,
      email: true,
    },
  })

  if (usersToDelete.length === 0) {
    console.log('Keine Test‐User gefunden, die gelöscht werden müssten.')
    return
  }

  for (const u of usersToDelete) {
    console.log(`Lösche Abhängigkeiten für User "${u.email}" (ID=${u.id}) …`)
    // 2) Lösche zuerst alle WatchlistItem-Einträge, die auf diesen User verweisen
    await prisma.watchlistItem.deleteMany({
      where: { userId: u.id },
    })

    // 3) Lösche alle EmailVerificationToken‐Einträge für diesen User
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: u.id },
    })

    // 4) Lösche alle PasswordResetToken‐Einträge für diesen User
    await prisma.passwordResetToken.deleteMany({
      where: { userId: u.id },
    })

    // (Falls ihr in Zukunft weitere relations habt, die zwingend zuerst gelöscht werden müssen,
    //  solltet ihr sie hier analog entfernen, bevor ihr den User selbst löscht.)

    // 5) Erst jetzt darf der User selbst gelöscht werden
    await prisma.user.delete({
      where: { id: u.id },
    })

    console.log(`→ User "${u.email}" und alle Abhängigkeiten wurden erfolgreich gelöscht.`)
  }

  console.log(`Insgesamt ${usersToDelete.length} Test‐User gelöscht.`)
}

main()
  .catch((err) => {
    console.error('Fehler beim Löschen der Test‐User:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })