import type { NextApiRequest, NextApiResponse } from 'next';
import { transporter } from '@/lib/mailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: 'deine@inbox.mailtrap.io',   // deine Mailtrap-Inbox-Adresse
      subject: 'Test-Mail von SuperInvestor',
      text: '🚀 SMTP läuft!',
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Mail konnte nicht gesendet werden.' });
  }
}