// src/app/(website)/blog/[slug]/page.tsx - Light Theme Quartr Style with Gradient Header
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeftIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { getPostBySlug, getPostContent, getRelatedPosts, getAllPosts } from '@/lib/blog'
import NewsletterSignup from '@/components/NewsletterSignup'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Category mapping
const categoryMap: Record<string, string> = {
  'superinvestor-news': 'Superinvestor Updates',
  'portfolio-moves': 'Superinvestor Updates',
  'insider-trading': 'Superinvestor Updates',
  'analysis': 'Aktienanalysen',
  'education': 'Guides',
  'newsletter': 'Guides',
  'market-news': 'Aktienanalysen',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function getCategoryLabel(category: string): string {
  return categoryMap[category] || 'Artikel'
}

export async function generateStaticParams() {
  const posts = getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Artikel nicht gefunden | Finclue Blog',
    }
  }

  return {
    title: `${post.title} | Finclue Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.imageUrl],
      type: 'article',
      publishedTime: post.publishedDate,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.imageUrl],
    }
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const content = await getPostContent(slug)
  const relatedPosts = getRelatedPosts(slug, 3)

  return (
    <div className="min-h-screen bg-white">
      {/* Gradient Header Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white pt-32 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Zurück zum Blog
          </Link>

          {/* Category */}
          <div className="mb-4">
            <span className="text-sm font-medium text-emerald-600">
              {getCategoryLabel(post.category)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Image
                src={post.authorImage}
                alt={post.author}
                width={28}
                height={28}
                className="rounded-full"
              />
              <span className="text-gray-700">{post.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              <span>{formatDate(post.publishedDate)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4" />
              <span>{post.readTime} Lesezeit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-gray-100">
          <Image
            src={post.imageUrl}
            alt={post.imageAlt}
            fill
            className="object-cover"
            priority
          />
        </div>
        {post.imageCaption && (
          <p className="text-sm text-gray-500 mt-3 text-center">
            {post.imageCaption}
          </p>
        )}
      </div>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div
          className="prose prose-lg max-w-none
            [&>h1]:text-gray-900 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mt-8 [&>h1]:mb-6
            [&>h2]:text-gray-900 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-12 [&>h2]:mb-4
            [&>h3]:text-gray-900 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-8 [&>h3]:mb-3
            [&>h4]:text-gray-900 [&>h4]:text-lg [&>h4]:font-semibold [&>h4]:mt-6 [&>h4]:mb-2
            [&>p]:text-gray-600 [&>p]:leading-relaxed [&>p]:mb-4
            [&>a]:text-gray-900 [&>a]:font-medium [&>a]:underline hover:[&>a]:text-gray-600
            [&>strong]:text-gray-900 [&>strong]:font-semibold
            [&>em]:text-gray-700
            [&>ul]:text-gray-600 [&>ul]:my-4
            [&>ol]:text-gray-600 [&>ol]:my-4
            [&>li]:text-gray-600 [&>li]:my-1
            [&>blockquote]:border-l-4 [&>blockquote]:border-gray-300 [&>blockquote]:pl-4 [&>blockquote]:text-gray-500 [&>blockquote]:italic
            [&>pre]:bg-gray-50 [&>pre]:border [&>pre]:border-gray-200 [&>pre]:rounded-lg [&>pre]:p-4
            [&>code]:text-gray-800 [&>code]:bg-gray-100 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded
            [&>img]:rounded-xl"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Newsletter CTA - Quartr Style */}
      <section className="border-t border-gray-200 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">
                Keine Analyse verpassen
              </h3>
              <p className="text-gray-500 mt-2">
                Erhalte die neuesten Superinvestor Updates und Aktienanalysen direkt in dein Postfach.
              </p>
            </div>
            <div className="flex-shrink-0">
              <NewsletterSignup variant="light" />
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Weitere Artikel
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {relatedPosts.map((relatedPost) => (
              <Link
                key={relatedPost.slug}
                href={`/blog/${relatedPost.slug}`}
                className="group block"
              >
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 mb-4">
                  <Image
                    src={relatedPost.imageUrl}
                    alt={relatedPost.imageAlt}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-emerald-600">
                    {getCategoryLabel(relatedPost.category)}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-400">
                    {formatDate(relatedPost.publishedDate)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
                  {relatedPost.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {relatedPost.excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
