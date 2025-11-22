import { NextRequest, NextResponse } from 'next/server'
import { readdirSync } from 'fs'
import { join } from 'path'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const investorSlug = params.slug

    // Get the holdings directory for this investor
    const holdingsDir = join(process.cwd(), 'src', 'data', 'holdings', investorSlug)
    
    try {
      // Read all files in the investor's holdings directory
      const files = readdirSync(holdingsDir)
      
      // Extract quarters from filenames (e.g., "2016-Q2.json" -> "2016-Q2")
      const quarters = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
        .sort((a, b) => {
          const [yearA, qA] = a.split('-')
          const [yearB, qB] = b.split('-')
          
          if (yearA !== yearB) {
            return parseInt(yearA) - parseInt(yearB)
          }
          
          return parseInt(qA.replace('Q', '')) - parseInt(qB.replace('Q', ''))
        })

      return NextResponse.json({
        investor: investorSlug,
        quarters,
        total: quarters.length
      })

    } catch (error) {
      // Directory doesn't exist or can't be read
      return NextResponse.json({
        investor: investorSlug,
        quarters: [],
        total: 0
      })
    }

  } catch (error) {
    console.error('Error fetching quarters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quarters' },
      { status: 500 }
    )
  }
}