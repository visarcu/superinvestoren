// lib/getDomain.ts
export function getDomain(website?: string): string | null {
    if (!website) return null
    try {
      // new URL() wirft, wenn kein gültiges Format
      const url = new URL(website)
      return url.hostname.replace(/^www\./, '')
    } catch {
      return null
    }
  }