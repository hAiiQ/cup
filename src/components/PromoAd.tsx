'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface PromoAdProps {
  className?: string
}

const promoVideos = [
  '/OXS/promo/A2 Video-EN Subtitles-Original.mp4',
  '/OXS/promo/S2-EN.mp4',
  '/OXS/promo/S3-EN.mp4',
  '/OXS/promo/S5-EN.mp4',
  '/OXS/promo/Storm G2  高清 有字幕.mp4',
  '/OXS/promo/TP-EN.mov'
]

export default function PromoAd({ className = '' }: PromoAdProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Wechsle automatisch zwischen Videos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % promoVideos.length)
    }, 30000) // 30 Sekunden pro Video

    return () => clearInterval(interval)
  }, [])

  const handleVideoClick = () => {
    window.open('https://de.oxsaudio.com', '_blank')
  }

  return (
    <div className={className}>
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 hover:bg-white/15 transition-all duration-300">
        <div className="text-center mb-3">
          <h3 className="text-lg font-semibold text-white mb-2">SPONSORED BY</h3>
          <div className="flex justify-center">
            <Image
              src="/OXS/OXS_Logo_rot.png"
              alt="OXS Gaming"
              width={120}
              height={40}
              className="object-contain"
            />
          </div>
        </div>
        
        <div className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group" onClick={handleVideoClick}>
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            key={currentVideoIndex}
          >
            <source src={promoVideos[currentVideoIndex]} type="video/mp4" />
            Video wird nicht unterstützt
          </video>
          
          {/* Link Overlay */}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </div>
          
          {/* Video Counter */}
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {currentVideoIndex + 1}/{promoVideos.length}
          </div>
        </div>
        
        <div className="mt-3 text-center">
          <p className="text-white/80 text-xs">Heimkino & Gaming Audio </p>
        </div>
      </div>
    </div>
  )
}
