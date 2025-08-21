'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface PromoAdProps {
  className?: string
}

// YouTube Video IDs - Deine echten OXS Gaming Videos
const promoVideos = [
  'MpIoBhY1_5k', // Video 1
  'iV3P_oDkUyE', // Video 2
  'XPeG0MZ2Yyo', // Video 3
  'UZUp1RVq-24', // Video 4
  '9KJVUelkaOM', // Video 5
  'gdBvwxqXQpA', // Video 6
]

export default function PromoAd({ className = '' }: PromoAdProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)

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
          {/* YouTube Embed - Hidden behind overlay */}
          <iframe
            width="100%"
            height="100%"
            src={`https://www.youtube.com/embed/${promoVideos[currentVideoIndex]}?autoplay=1&mute=1&loop=1&playlist=${promoVideos[currentVideoIndex]}&controls=0&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&fs=0&disablekb=1&start=1&enablejsapi=1`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full object-cover"
            style={{
              pointerEvents: 'none',
              border: 'none',
              outline: 'none',
              transform: 'scale(1.1)', // Zoom um YouTube UI zu verstecken
              transformOrigin: 'center center'
            }}
            key={currentVideoIndex}
            title="OXS Gaming Promo"
          />
          
          {/* KOMPLETTE UI-BLOCKER - Überdeckt alle YouTube Elements */}
          <div 
            className="absolute inset-0 bg-transparent"
            style={{ 
              zIndex: 50,
              pointerEvents: 'none',
              // Versteckt YouTube UI durch Crop-Effekt
              top: '-20px',
              left: '-20px', 
              right: '-20px',
              bottom: '-20px',
              overflow: 'hidden'
            }}
          />
          
          {/* Zusätzlicher Overlay für sauberen Look */}
          <div 
            className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" 
            style={{ zIndex: 60 }}
          />
          
          {/* Hover Scale Effect */}
          <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-300" style={{ zIndex: 70, pointerEvents: 'none' }} />
          
          {/* Link Overlay - nur sichtbar bei hover */}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ zIndex: 80 }}>
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </div>
          
          {/* Video Counter */}
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded pointer-events-none backdrop-blur-sm" style={{ zIndex: 90 }}>
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
