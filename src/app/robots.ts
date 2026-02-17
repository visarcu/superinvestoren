import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/terminal/',
          '/analyse/',
          '/settings/',
          '/profile/',
          '/notifications/',
          '/portfolio/',
        ],
      },
    ],
    sitemap: 'https://finclue.de/sitemap.xml',
  }
}
