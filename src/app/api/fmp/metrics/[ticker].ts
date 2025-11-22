// /api/fmp/metrics/[ticker].ts (falls du die auch brauchst)
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ticker } = req.query
  
  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/key-metrics/${ticker}?apikey=${process.env.FMP_API_KEY}`
    )
    const data = await response.json()
    res.status(200).json(data)
  } catch (error) {
    console.error('Metrics API Error:', error)
    res.status(500).json({ error: 'Failed to fetch metrics data' })
  }
}