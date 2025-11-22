import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const investorSlug = params.slug
    const { searchParams } = new URL(req.url)
    const quarter = searchParams.get('quarter')
    
    if (!quarter) {
      return NextResponse.json({ error: 'Quarter parameter required' }, { status: 400 })
    }

    // Get the specific holdings file for this investor and quarter
    const filePath = join(process.cwd(), 'src', 'data', 'holdings', investorSlug, `${quarter}.json`)
    
    try {
      const fileContent = readFileSync(filePath, 'utf8')
      const holdingsData = JSON.parse(fileContent)

      return NextResponse.json(holdingsData)

    } catch (error) {
      // File doesn't exist or can't be read
      return NextResponse.json({ error: 'Holdings data not found' }, { status: 404 })
    }

  } catch (error) {
    console.error('Error fetching holdings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch holdings' },
      { status: 500 }
    )
  }
}