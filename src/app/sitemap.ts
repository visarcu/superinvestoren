import { MetadataRoute } from 'next'
import { readdirSync } from 'fs'
import { join } from 'path'
import { getAllPosts } from '@/lib/blog'
import { LEARN_DEFINITIONS } from '@/data/learnDefinitions'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://finclue.de'

  // Statische Seiten
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/superinvestor`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/superinvestor/investors`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/superinvestor/activity`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/superinvestor/sectors`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/superinvestor/trends`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/superinvestor/momentum`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/superinvestor/insights`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/superinvestor/insider`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/superinvestor/news`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/lexikon`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/impressum`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]

  // Investor-Seiten dynamisch aus dem Holdings-Verzeichnis
  let investorPages: MetadataRoute.Sitemap = []
  try {
    const holdingsDir = join(process.cwd(), 'src', 'data', 'holdings')
    const investorSlugs = readdirSync(holdingsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)

    investorPages = investorSlugs.map(slug => ({
      url: `${baseUrl}/superinvestor/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    // Falls Verzeichnis nicht lesbar
  }

  // Blog-Posts
  let blogPages: MetadataRoute.Sitemap = []
  try {
    const posts = getAllPosts()
    blogPages = posts.map(post => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.publishedDate),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }))
  } catch {
    // Falls Blog nicht lesbar
  }

  // Lexikon-Einträge
  const lexikonPages: MetadataRoute.Sitemap = Object.keys(LEARN_DEFINITIONS)
    .filter(key => !['bewertung', 'bilanz', 'dividenden', 'effizienz', 'risiko'].includes(key))
    .map(term => ({
      url: `${baseUrl}/lexikon/${term}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))

  return [...staticPages, ...investorPages, ...blogPages, ...lexikonPages]
}
