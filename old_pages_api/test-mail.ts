import type { NextApiRequest, NextApiResponse } from 'next'
import { sendMail } from '@/lib/mailer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const info = await sendMail({
      to: 'finanzfreund1@gmail.com',
      subject: 'FINCLUE Test',
      html: '<p>🚀 Test-Mail!</p>',
    })
    res.status(200).json({ success: true, messageId: info.messageId })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
}