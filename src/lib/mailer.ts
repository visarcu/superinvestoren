// src/lib/mailer.ts
import nodemailer from 'nodemailer'


const {
  MAIL_HOST,
  MAIL_PORT,
  MAIL_SECURE,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM,
} = process.env

if (!MAIL_HOST || !MAIL_PORT || !MAIL_USER || !MAIL_PASS || !MAIL_FROM) {
  throw new Error(
    'Missing mail config in .env – bitte MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS und MAIL_FROM setzen.'
  )
}

export const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: Number(MAIL_PORT),
  secure: MAIL_SECURE === 'true',
  auth: {
    user: MAIL_USER,
    pass: MAIL_PASS,
  },
})

transporter
  .verify()
  .then(() => console.log('✅ SMTP-Verbindung OK'))
  .catch(err =>
    console.error('❌ SMTP-Verbindungsfehler:', err.message ?? err)
  )


// universelle Send-Funktion mit Objekt-API
export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const info = await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    html,
  })
  console.log(`✉️ Mail gesendet an ${to}, Message-ID: ${info.messageId}`)
  return info
}

// vorhandene Spezial-Funktion bleibt natürlich erhalten
export async function sendInvestorUpdate(
  to: string,
  subject: string,
  html: string
) {
  return sendMail({ to, subject, html })
}