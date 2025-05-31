import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { sendMail } from '@/lib/mailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (typeof email !== 'string') return res.status(400).json({ error: 'Ungültige E-Mail' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // aus Datenschutzgründen nicht verraten, ob die Mail existiert
    return res.status(200).json({ ok: true });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 Std

  await prisma.passwordResetToken.create({
    data: { token, user: { connect: { id: user.id } }, expiresAt: expires },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
  await sendMail({
    to: email,
    subject: 'Passwort zurücksetzen – SuperInvestor',
    html: `<p>Hallo,</p>
           <p>Hier dein Link zum Zurücksetzen deines Passworts (1 Stunde gültig):</p>
           <p><a href="${resetUrl}">Passwort zurücksetzen</a></p>`,
  });

  return res.status(200).json({ ok: true });
}