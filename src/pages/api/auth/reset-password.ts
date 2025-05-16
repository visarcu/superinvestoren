// src/pages/api/auth/reset-password.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Body-Schema
const ResetSchema = z.object({
  token:           z.string().min(1),
  password:        z.string().min(8)
                        .regex(/[A-Z]/)
                        .regex(/[0-9]/),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // 1) validieren
  const parse = ResetSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.issues[0].message })
  }
  const { token, password } = parse.data

  // 2) Token prüfen
  const rec = await prisma.passwordResetToken.findUnique({
    where:   { token },
    include: { user: true },
  })
  if (!rec || rec.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Link ungültig oder abgelaufen' })
  }

  // 3) Passwort hashen & updaten
  const hash = await bcrypt.hash(password, 10)
  await prisma.user.update({
    where: { id: rec.userId },
    data:  { passwordHash: hash },
  })

  // 4) Token löschen
  await prisma.passwordResetToken.delete({ where: { token } })

  return res.status(200).json({ success: true })
}