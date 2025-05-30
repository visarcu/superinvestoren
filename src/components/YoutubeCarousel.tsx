// src/components/YouTubeCarousel.tsx
'use client'
import React from 'react'

interface Video { id: string; title?: string }
export default function YouTubeCarousel({ videos }: { videos: Video[] }) {
  return (
    <div className="flex overflow-x-auto space-x-4 py-4">
      {videos.map(v => (
        <div key={v.id} className="flex-shrink-0 w-64">
          <iframe
            className="w-full h-36 rounded-lg shadow"
            src={`https://www.youtube.com/embed/${v.id}`}
            title={v.title ?? 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {v.title && <p className="mt-2 text-sm text-gray-300">{v.title}</p>}
        </div>
      ))}
    </div>
  )
}