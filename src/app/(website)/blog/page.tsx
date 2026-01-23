// src/app/(website)/blog/page.tsx - Light Theme Quartr Style with Gradient Header
import { Metadata } from 'next'
import BlogPageClient from '@/components/BlogPageClient'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog | Finclue',
  description: 'Aktienanalysen, Superinvestor Updates und Investment-Guides von Finclue. Fundierte Einblicke für bessere Anlageentscheidungen.',
  openGraph: {
    title: 'Blog | Finclue',
    description: 'Aktienanalysen, Superinvestor Updates und Investment-Guides von Finclue.',
  }
}

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section - white background */}
      <div className="bg-white pt-32 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            Blog
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl">
            Aktienanalysen, Superinvestor Updates und Investment-Guides
          </p>
        </div>
      </div>

      {/* Gradient transition */}
      <div className="h-8 bg-gradient-to-b from-white to-gray-50"></div>

      {/* Cards Section - gray background like Quartr */}
      <div className="bg-gray-50 min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <BlogPageClient posts={posts} />
        </div>
      </div>
    </div>
  )
}
