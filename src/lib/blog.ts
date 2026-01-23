// 📁 lib/blog.ts (ERWEITERT FÜR SUPERINVESTOR-NEWS)
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  author: string
  authorImage: string
  publishedDate: string
  readTime: string
  category: 'newsletter' | 'analysis' | 'market-news' | 'education' | 'superinvestor-news' | 'portfolio-moves' | 'insider-trading' // 🆕 ERWEITERT
  tags: string[]
  imageUrl: string
  imageAlt: string
  imageCaption?: string
  featured: boolean
  premium?: boolean
  relatedStocks?: string[]
  relatedInvestors?: string[] // 🆕 NEU für Superinvestor-Artikel
  content: string
  newsletter?: {
    issue: number
    subscribers?: number
  }
  superinvestorData?: { // 🆕 NEU für erweiterte Daten
    investor: string
    investorSlug: string
    portfolioChange?: {
      action: 'bought' | 'sold' | 'increased' | 'decreased'
      amount?: string
      percentage?: number
    }
  }
}

const postsDirectory = path.join(process.cwd(), 'content/blog')

// Default values for required fields
const getDefaultPost = (slug: string): Partial<BlogPost> => ({
  slug,
  title: 'Untitled',
  excerpt: '',
  author: 'Finclue Research', // 🔧 Besserer Default
  authorImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
  publishedDate: new Date().toISOString().split('T')[0],
  readTime: '5 min',
  category: 'analysis',
  tags: [],
  imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=400&fit=crop',
  imageAlt: 'Blog post image',
  featured: false,
  premium: false,
  relatedStocks: [],
  relatedInvestors: [], // 🆕 NEU
  content: ''
})

export function getAllPosts(): BlogPost[] {
  try {
    // Check if directory exists
    if (!fs.existsSync(postsDirectory)) {
      console.warn(`Blog directory not found: ${postsDirectory}`)
      return []
    }

    const fileNames = fs.readdirSync(postsDirectory)
    
    const allPostsData = fileNames
      .filter(fileName => fileName.endsWith('.md'))
      .map((fileName) => {
        const slug = fileName.replace(/\.md$/, '')
        
        try {
          const fullPath = path.join(postsDirectory, fileName)
          const fileContents = fs.readFileSync(fullPath, 'utf8')
          const matterResult = matter(fileContents)
          
          // Merge defaults with actual data
          const postData = {
            ...getDefaultPost(slug),
            ...matterResult.data,
            slug,
            content: matterResult.content,
            // Ensure arrays are always arrays
            tags: Array.isArray(matterResult.data.tags) ? matterResult.data.tags : [],
            relatedStocks: Array.isArray(matterResult.data.relatedStocks) ? matterResult.data.relatedStocks : [],
            relatedInvestors: Array.isArray(matterResult.data.relatedInvestors) ? matterResult.data.relatedInvestors : [] // 🆕 NEU
          } as BlogPost

          return postData
        } catch (error) {
          console.error(`Error reading post ${fileName}:`, error)
          return null
        }
      })
      .filter(Boolean) as BlogPost[]

    // Sort posts by date
    return allPostsData.sort((a, b) => {
      if (a.publishedDate < b.publishedDate) {
        return 1
      } else {
        return -1
      }
    })
  } catch (error) {
    console.error('Error reading blog posts:', error)
    return []
  }
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`)
    
    if (!fs.existsSync(fullPath)) {
      return null
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const matterResult = matter(fileContents)

    // Merge defaults with actual data
    const postData = {
      ...getDefaultPost(slug),
      ...matterResult.data,
      slug,
      content: matterResult.content,
      // Ensure arrays are always arrays
      tags: Array.isArray(matterResult.data.tags) ? matterResult.data.tags : [],
      relatedStocks: Array.isArray(matterResult.data.relatedStocks) ? matterResult.data.relatedStocks : [],
      relatedInvestors: Array.isArray(matterResult.data.relatedInvestors) ? matterResult.data.relatedInvestors : [] // 🆕 NEU
    } as BlogPost

    return postData
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error)
    return null
  }
}

export async function getPostContent(slug: string): Promise<string> {
  const post = getPostBySlug(slug)
  if (!post) return ''

  try {
    // Use remark to convert markdown into HTML string
    const processedContent = await remark()
      .use(html)
      .process(post.content)
    
    return processedContent.toString()
  } catch (error) {
    console.error(`Error processing content for ${slug}:`, error)
    return post.content // Fallback to raw content
  }
}

export function getFeaturedPosts(): BlogPost[] {
  const allPosts = getAllPosts()
  return allPosts.filter(post => post.featured)
}

export function getPostsByCategory(category: string): BlogPost[] {
  const allPosts = getAllPosts()
  if (category === 'all') return allPosts
  return allPosts.filter(post => post.category === category)
}

// 🆕 NEU: Posts by Investor
export function getPostsByInvestor(investorSlug: string): BlogPost[] {
  const allPosts = getAllPosts()
  return allPosts.filter(post => 
    post.relatedInvestors?.includes(investorSlug) ||
    post.superinvestorData?.investorSlug === investorSlug
  )
}

// 🆕 NEU: Superinvestor News specifically
export function getSuperinvestorNews(limit?: number): BlogPost[] {
  const allPosts = getAllPosts()
  const superinvestorPosts = allPosts.filter(post => 
    ['superinvestor-news', 'portfolio-moves', 'insider-trading'].includes(post.category)
  )
  
  return limit ? superinvestorPosts.slice(0, limit) : superinvestorPosts
}

export function getRelatedPosts(currentSlug: string, limit: number = 3): BlogPost[] {
  const allPosts = getAllPosts()
  const currentPost = allPosts.find(post => post.slug === currentSlug)
  
  if (!currentPost) return []
  
  return allPosts
    .filter(post => 
      post.slug !== currentSlug && 
      (post.category === currentPost.category || 
       (currentPost.tags.length > 0 && post.tags.some(tag => currentPost.tags.includes(tag))) ||
       (currentPost.relatedInvestors && post.relatedInvestors && 
        currentPost.relatedInvestors.some(inv => post.relatedInvestors?.includes(inv))) // 🆕 NEU: Related by investor
      )
    )
    .slice(0, limit)
}