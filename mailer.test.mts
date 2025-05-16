// mailer.test.mts
import 'dotenv/config'
import { verifyTransporter } from './src/lib/mailer.ts'

(async () => {
  try {
    const result = await verifyTransporter()
    console.log('✔ SMTP-Verbindung erfolgreich:', result)
    process.exit(0)
  } catch (err) {
    console.error('❌ SMTP-Verbindungscheck fehlgeschlagen:')
    if (err instanceof Error) {
      console.error('  Message:', err.message)
      console.error('  Stack:  ', err.stack)
    } else {
      console.error('  Unknown error object:', err)
    }
    process.exit(1)
  }
})()