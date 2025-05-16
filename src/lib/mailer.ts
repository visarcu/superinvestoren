// src/lib/mailer.ts
import nodemailer from 'nodemailer'

// ⚠️ Stelle sicher, dass dotenv in deinem Start-Skript (z.B. via `-r dotenv/config`) geladen wird,
// damit process.env.MAIL_… gesetzt ist.

const {
  MAIL_HOST,
  MAIL_PORT,
  MAIL_SECURE,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,
} = process.env

// prüfe nötige ENV-Variablen direkt beim Import
if (!MAIL_HOST || !MAIL_PORT || !MAIL_USER || !MAIL_PASS || !MAIL_FROM) {
  throw new Error(
    'Missing mail config in .env – bitte MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS und MAIL_FROM setzen.'
  )
}

// Transporter anlegen
export const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: Number(MAIL_PORT),
  secure: MAIL_SECURE === 'true',   // true für SSL/TLS (Port 465)
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
})

// Nur zum Testen: überprüft die Verbindung und loggt das Ergebnis
export async function verifyTransporter() {
  try {
    await transporter.verify()
    console.log('✅ SMTP-Verbindung OK')
  } catch (err: any) {
    console.error('❌ SMTP-Verbindungsfehler:', err.message ?? err)
    throw err
  }
}

// Eine Absender­konstante exportieren, damit alle Mails denselben "From:"-Header haben
export const MAIL_FROM_ADDRESS = MAIL_FROM

// Sendefunktion für deine Investor-Updates
export async function sendInvestorUpdate(
  to: string,
  subject: string,
  html: string
) {
  const info = await transporter.sendMail({
    from: MAIL_FROM_ADDRESS,
    to,
    subject,
    html,
  })
  console.log(`✉️ Update-Mail gesendet an ${to}, Message-ID: ${info.messageId}`)
  return info
}