import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'
import { sendMail } from '@/lib/mailer'   
import { rateLimit } from '@/lib/rate-limit'

// 1) Gleiches Schema wie Client
const SignupSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
  firstName: z.string().optional(),
  lastName:  z.string().optional(),
})

const limiter = rateLimit({ uniqueTokenPerInterval: 500 })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1️⃣ Rate-Limit
  const forwarded = req.headers['x-forwarded-for']
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : Array.isArray(forwarded)
      ? forwarded[0]
      : req.socket.remoteAddress || ''

  try {
    await limiter.check(res, 3, ip)
  } catch {
    return res
      .status(429)
      .json({ error: 'Zu viele Versuche. Bitte in einer Minute erneut versuchen.' })
  }

  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  // ─── 2) Zod-Validierung ───────────────────────────────────
  const parsed = SignupSchema.safeParse(req.body)
  if (!parsed.success) {
    // Nur die erste Fehlermeldung zurückgeben
    const msg = parsed.error.issues[0].message
    return res.status(400).json({ error: msg })
  }
  const { email, password, firstName, lastName } = parsed.data
  
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(409).json({ error: 'E-Mail ist bereits registriert' })
    }
  
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        isPremium: false,
        firstName,
        lastName,
        emailVerified: false,   
      },
    })
  
  // 1) Erzeuge einen Token
 const token = crypto.randomBytes(32).toString('hex')
 const expires = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 h

 // 2) Speichere ihn in deiner EmailVerificationToken-Tabelle
 await prisma.emailVerificationToken.create({
   data: {
     token,
     user: { connect: { id: user.id } },
     expiresAt: expires,
   },
 })

  // 3) E-Mail zum Verifizieren verschicken
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`
  try {
  await sendMail({
       to: email,
       subject: 'Bitte bestätige deine E-Mail bei SuperInvestor',
       html: `
         <p>Hi ${firstName},</p>
         <p>klicke <a href="${verifyUrl}">hier</a>, um deine E-Mail-Adresse zu bestätigen.</p>
         <p>Der Link ist 24 Stunden gültig.</p>
       `,
     })
    } catch (err) {
      console.error('❌ Fehler beim Versand der Bestätigungsmail:', err)
      // optional: return res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden.' })
    }
  

  return res.status(201).json({ success: true })
}