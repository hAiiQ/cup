'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function Navigation() {
  const router = useRouter()
  const { user, isLoggedIn, logout } = useAuth()
  const [oxsLogoError, setOxsLogoError] = useState(false)

  const handleLogout = async () => {
    // Use the logout function from AuthContext which handles everything
    await logout()
    
    // Navigate to home page
    router.push('/')
  }

  return (
    <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Link href="/" className="group flex items-center space-x-3 hover:scale-105 transition-all duration-300">
              {/* Logo */}
              <Image
                src="/logo.png"
                alt="PATH OF LOKI Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              
              {/* Title */}
              <div className="flex flex-col">
                <div className="text-lg font-bold">
                  <span 
                    className="text-transparent bg-clip-text no-text-shadow group-hover:opacity-80 transition-all duration-500"
                    style={{
                      background: 'linear-gradient(to right, #2A7B9B, #57C785, #EDDD53)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text'
                    }}
                  >
                    PATH OF LOKI
                  </span>
                </div>
                <div className="text-xs font-medium text-white/70 group-hover:text-purple-300 transition-colors">
                  by JoeDom
                </div>
              </div>
            </Link>
            
            {/* Discord, Twitch & OXS Website Buttons */}
            <div className="flex items-center space-x-2 ml-6">
              <a 
                href="https://de.oxsaudio.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center group hover:scale-110"
                title="OXS Audio Website"
              >
                <img
                  src="/OXS_Logo.png"
                  alt="OXS"
                  width="32"
                  height="32"
                  className="group-hover:scale-110 transition-transform object-contain rounded-lg"
                  onError={(e) => {
                    console.log('OXS Logo failed to load, using fallback')
                    setOxsLogoError(true)
                  }}
                  onLoad={() => console.log('OXS Logo loaded successfully')}
                />
                {oxsLogoError && (
                  <div className="w-5 h-5 text-white group-hover:scale-110 transition-transform font-bold text-xs flex items-center justify-center absolute">
                    OXS
                  </div>
                )}
              </a>
              <a 
                href="https://discord.gg/uvkuf4Vscy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center transition-colors group hover:scale-110"
                title="Discord Server"
              >
                <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
              <a 
                href="https://www.twitch.tv/joedom_" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center transition-colors group hover:scale-110"
                title="Twitch Channel"
              >
                <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/oxsaudio/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center group"
                title="OXS Audio Instagram"
              >
                <img
                  src="/OXS_instagram.png"
                  alt="Instagram"
                  width="32"
                  height="32"
                  className="group-hover:scale-110 transition-transform object-contain rounded-lg"
                />
              </a>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Always visible links */}
            <Link href="/bracket" className="text-white hover:text-purple-300 transition-colors px-3 py-1 rounded">
              Bracket
            </Link>
            <Link href="/teams" className="text-white hover:text-purple-300 transition-colors px-3 py-1 rounded">
              Teams
            </Link>
            
            {isLoggedIn ? (
              <>
                {/* Logged in user links */}
                <Link href="/dashboard" className="text-white hover:text-purple-300 transition-colors px-3 py-1 rounded">
                  Dashboard
                </Link>
                <Link href="/rules" className="text-white hover:text-purple-300 transition-colors px-3 py-1 rounded">
                  Regeln
                </Link>
                
                {/* Logout button */}
                <button 
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                {/* Not logged in links */}
                <Link href="/login" className="bg-white/20 text-white px-4 py-2 rounded hover:bg-white/30 transition-colors">
                  Anmelden
                </Link>
                <Link href="/register" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors">
                  Registrieren
                </Link>
              </>
            )}
            
            {/* Admin Panel Button - Ganz rechts */}
            <Link href="/admin" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors text-sm">
              🔧 Admin
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
