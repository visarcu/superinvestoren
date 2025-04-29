// src/app/realtime/page.tsx
import fs   from 'fs/promises'
import path from 'path'
import Link from 'next/link'
import React from 'react'

interface Filing {
  form:      string
  date:      string
  accession: string
  href:      string
  slug:      string
}

export default async function RealtimePage() {
  const dir = path.join(process.cwd(), 'src/data/realtime')
  const files = await fs.readdir(dir)
  const all: Filing[] = []

  await Promise.all(
    files.map(async file => {
      if (!file.endsWith('.json')) return
      const slug = file.replace(/\.json$/, '')
      const raw  = await fs.readFile(path.join(dir, file), 'utf-8')
      let arr: any[] = []
      try { arr = JSON.parse(raw) } catch { return }
      arr.forEach(f => {
        if (!f.form || !f.date) return
        all.push({ ...f, slug })
      })
    })
  )

  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Echtzeit-Filings</h1>
      <table className="w-full table-auto border-collapse">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">Datum</th>
            <th className="px-4 py-2 text-left">Investor</th>
            <th className="px-4 py-2 text-left">Form</th>
            <th className="px-4 py-2 text-left">Link</th>
          </tr>
        </thead>
        <tbody>
          {all.map(f => (
            <tr key={f.slug + f.accession} className="even:bg-gray-50">
              <td className="px-4 py-2">
                {new Date(f.date).toLocaleDateString('de-DE')}
              </td>
              <td className="px-4 py-2 capitalize">{f.slug}</td>
              <td className="px-4 py-2">{f.form}</td>
              <td className="px-4 py-2">
                <Link
                  href={f.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  öffnen
                </Link>
              </td>
            </tr>
          ))}
          {all.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-2 text-center text-gray-500">
                Keine Echtzeit-Filings.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}