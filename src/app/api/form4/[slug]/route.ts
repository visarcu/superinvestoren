import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET({ params: { slug } }) {
  const dir = path.resolve('src/data/form4', slug)
  let files = await fs.readdir(dir).catch(() => [])
  files = files.filter(f => f.endsWith('.json')).sort().reverse()
  const data = await Promise.all(
    files.map(f => fs.readFile(path.join(dir, f), 'utf-8').then(JSON.parse))
  )
  return NextResponse.json(data)
}