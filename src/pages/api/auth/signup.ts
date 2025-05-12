import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password } = req.body
  if (!email || !password)
    return res.status(400).json({ error: 'Missing fields' })

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'User exists' })

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      isPremium: false,     // <-- neu: jeder registrierte User ist Premium
    },
  })

  return res.status(201).json({ id: user.id, email: user.email })
}