'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import PromoAd from '@/components/PromoAd'

export default function HomePage() {
  const { isLoggedIn, loading } = useAuth()

  return (
    <>
      {/* Hero Section */}
      <main className="min-h-screen flex flex-col justify-center items-center px-4 py-20 relative">
        {/* Promo Ad - Links positioniert */}
        <PromoAd className="absolute left-4 top-1/2 transform -translate-y-1/2 w-80 hidden xl:block z-10" />
        
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold text-white mb-6 no-text-shadow">
              TOURNAMENT
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 no-text-shadow">
                ROADMAP
              </span>
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Nimm teil am ultimativen Marvel Rivals Tournament. Registriere dich, entdecke neue Spieler und kämpfe um den Sieg!
            </p>
            
            <div className="space-y-4 mb-12">
              {!loading && !isLoggedIn && (
                <Link href="/register" className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105">
                  Jetzt Registrieren
                </Link>
              )}
              {!loading && isLoggedIn && (
                <Link href="/dashboard" className="inline-block bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all transform hover:scale-105">
                  Zum Dashboard
                </Link>
              )}
              <div className="flex justify-center space-x-8 mt-8">
                <Link href="/bracket" className="text-white/80 hover:text-white transition-colors">
                  Tournament Bracket
                </Link>
                <Link href="/teams" className="text-white/80 hover:text-white transition-colors">
                  Teams
                </Link>
                <Link href="/rules" className="text-white/80 hover:text-white transition-colors">
                  Regeln
                </Link>
              </div>
            </div>
          </div>

          {/* Tournament Info Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
              <h3 className="text-xl font-semibold text-white mb-4">Double Elimination</h3>
              <p className="text-white/80">
                Faires Turniersystem mit Winner und Loser Bracket. Jeder bekommt eine zweite Chance!
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
              <h3 className="text-xl font-semibold text-white mb-4">8 Teams</h3>
              <p className="text-white/80">
                Maximal 8 Teams mit je 6 Spielern. Die Teams werden zufällig durch ein Tier-System fair zusammengestellt.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
              <h3 className="text-xl font-semibold text-white mb-4">Live Updates</h3>
              <p className="text-white/80">
                Verfolge das Tournament live mit automatischen Updates des Brackets und Ergebnissen.
              </p>
            </div>
          </div>
          
          {/* Mobile Promo Ad */}
          <div className="xl:hidden mt-16">
            <PromoAd className="max-w-md mx-auto" />
          </div>
        </div>
      </main>
    </>
  )
}
