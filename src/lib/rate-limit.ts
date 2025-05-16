// src/lib/rate-limit.ts

import { NextApiResponse } from 'next'
import { LRUCache } from 'lru-cache'

const ONE_MINUTE = 60 * 1000

export interface RateLimitOptions {
  uniqueTokenPerInterval?: number
}

export function rateLimit(options: RateLimitOptions = {}) {
  // ← use the LRUCache class
  const tokenCache = new LRUCache<string, number>({
    max: options.uniqueTokenPerInterval ?? 500,
    ttl: ONE_MINUTE,
  })

  return {
    /**
     * Checks if `token` (e.g. an IP address) has exceeded
     * its allowed number of requests in the current interval.
     */
    check: (res: NextApiResponse, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = tokenCache.get(token) ?? 0

        if (tokenCount >= limit) {
          res.setHeader('Retry-After', String(ONE_MINUTE / 1000))
          res.status(429).json({ error: 'Rate limit exceeded' })
          return reject()
        }

        tokenCache.set(token, tokenCount + 1)
        resolve()
      }),
  }
}