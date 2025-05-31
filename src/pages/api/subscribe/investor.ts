// src/pages/api/subscribe/investor.ts
import type { NextApiRequest, NextApiResponse } from 'next'

// Wir geben sofort einen 404‐Fehler zurück – damit die Route zwar existiert, aber deaktiviert ist.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: 'Diese Funktion ist momentan deaktiviert.' })
}