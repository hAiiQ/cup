'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RulesPage() {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userRulesAccepted, setUserRulesAccepted] = useState<boolean | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in and their rules status
    const checkUserStatus = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setIsLoggedIn(false)
        return
      }

      try {
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setIsLoggedIn(true)
          setUserRulesAccepted(data.user.rulesAccepted)
        } else {
          setIsLoggedIn(false)
        }
      } catch (error) {
        setIsLoggedIn(false)
      }
    }

    checkUserStatus()
  }, [])

  const handleAccept = async () => {
    if (!accepted) return
    
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/accept-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      })

      if (response.ok) {
        // Trigger auth change event (user data might have changed)
        window.dispatchEvent(new Event('authChange'))
        // Hard navigation für bessere Zuverlässigkeit
        window.location.href = '/dashboard'
      } else {
        alert('Fehler beim Akzeptieren der Regeln')
      }
    } catch (error) {
      alert('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-image">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-xl p-8 border border-purple-500/30">
              <h1 className="text-5xl font-bold text-white mb-4">
                🏆 Tournament Regeln
              </h1>
              <p className="text-xl text-white/80 max-w-3xl mx-auto">
                JOEDOM'S PATH OF LOKI - Marvel Rivals Tournament
              </p>
              <div className="mt-4 inline-block bg-purple-600/30 border border-purple-400 rounded-lg px-6 py-2">
                <span className="text-purple-200 font-medium">📅 Double Elimination • 8 Teams • Marvel Rivals</span>
              </div>
            </div>
          </div>

          {/* Prerequisites Section */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-8 border border-red-500/30">
              <h2 className="text-3xl font-bold text-white mb-6 flex items-center">
                <span className="text-red-400 mr-4 text-4xl">⚠️</span>
                Teilnahme-Voraussetzungen
              </h2>
              
              <div className="bg-red-500/10 rounded-lg p-6 mb-6 border border-red-500/20">
                <p className="text-white font-medium text-xl mb-4">
                  🎯 Um am Tournament teilnehmen zu können, musst du folgende Voraussetzungen erfüllen:
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-purple-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📺</div>
                    <h3 className="text-lg font-semibold text-white mb-3">Twitch Follow</h3>
                    <p className="text-white/80 mb-4">Du musst JoeDom auf Twitch folgen</p>
                    <a 
                      href="https://www.twitch.tv/joedom_" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                    >
                      Zu Twitch
                    </a>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-blue-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="text-lg font-semibold text-white mb-3">Discord Join</h3>
                    <p className="text-white/80 mb-4">Du musst in JoeDom's Discord sein</p>
                    <a 
                      href="https://discord.gg/uvkuf4Vscy" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                    >
                      Zu Discord
                    </a>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-pink-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📸</div>
                    <h3 className="text-lg font-semibold text-white mb-3">Instagram Follow</h3>
                    <p className="text-white/80 mb-4">Du musst OXS auf Instagram folgen</p>
                    <a 
                      href="https://www.instagram.com/oxsaudio/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                    >
                      Zu Instagram
                    </a>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-green-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🏦</div>
                    <h3 className="text-lg font-semibold text-white mb-3">Bankkonto</h3>
                    <p className="text-white/80 mb-4">Für den Gewinn benötigst du ein Bankkonto mit IBAN</p>
                    <div className="text-green-400 text-sm font-medium">
                      💰 Auszahlung erforderlich
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-red-500/30">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🔴</div>
                    <h3 className="text-lg font-semibold text-white mb-3">Live Stream</h3>
                    <p className="text-white/80 mb-4">Am Spieltag musst du im Twitch Live Stream dabei sein</p>
                    <div className="text-red-400 text-sm font-medium">
                      📡 Anwesenheit Pflicht
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/30">
                <p className="text-yellow-200 font-medium text-center">
                  <span className="text-yellow-400 text-xl mr-2">⚡</span> 
                  Diese Voraussetzungen werden bei der Verifikation überprüft!
                </p>
              </div>
            </div>
          </div>

          {/* Rules Grid */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            
            {/* Allgemeine Regeln */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <span className="mr-3 text-3xl">📋</span>
                1. Allgemeine Regeln
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="text-green-400 mr-3 text-xl mt-1">✓</span>
                  <span className="text-white/90">Alle Teilnehmer müssen fair play befolgen und respektvoll miteinander umgehen</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-400 mr-3 text-xl mt-1">✗</span>
                  <span className="text-white/90">Beleidigungen oder toxisches Verhalten führen zur sofortigen Disqualifikation</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-400 mr-3 text-xl mt-1">👥</span>
                  <span className="text-white/90">Teams bestehen aus maximal 6 Spielern pro Team</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-400 mr-3 text-xl mt-1">🔒</span>
                  <span className="text-white/90">Jeder Spieler kann nur in einem Team teilnehmen</span>
                </div>
                <div className="flex items-start">
                  <span className="text-orange-400 mr-3 text-xl mt-1">📊</span>
                  <span className="text-white/90"><strong>Die In-Game Karriere in Marvel Rivals muss öffentlich sichtbar sein</strong></span>
                </div>
              </div>
            </div>

            {/* Tournament Format */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <span className="mr-3 text-3xl">🏆</span>
                2. Tournament Format
              </h2>
              <div className="space-y-4">
                <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/30">
                  <div className="flex items-start">
                    <span className="text-yellow-400 mr-3 text-xl mt-1">⚡</span>
                    <span className="text-white/90"><strong>Jeder Tier 1 Spieler muss Loki spielen</strong></span>
                  </div>
                </div>
                <div className="bg-red-500/20 rounded-lg p-3 border border-red-500/30">
                  <div className="flex items-start">
                    <span className="text-red-400 mr-3 text-xl mt-1">🚫</span>
                    <span className="text-white/90"><strong>Loki darf nicht gebannt werden</strong></span>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-green-400 mr-3 text-xl mt-1">🔄</span>
                  <span className="text-white/90">Double Elimination System mit 8 Teams</span>
                </div>
                <div className="flex items-start">
                  <span className="text-blue-400 mr-3 text-xl mt-1">🏅</span>
                  <span className="text-white/90">Winner Bracket und Loser Bracket</span>
                </div>
                <div className="flex items-start">
                  <span className="text-purple-400 mr-3 text-xl mt-1">⚔️</span>
                  <span className="text-white/90">Best of 3 in allen Runden außer dem Finale</span>
                </div>
                <div className="flex items-start">
                  <span className="text-pink-400 mr-3 text-xl mt-1">👑</span>
                  <span className="text-white/90">Finale ist Best of 5 für den ultimativen Champion</span>
                </div>
              </div>
            </div>

            {/* Tier System */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <span className="mr-3 text-3xl">🎯</span>
                3. Tier System
              </h2>
              <div className="space-y-4">
                <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/30">
                  <div className="flex items-center">
                    <span className="text-yellow-400 mr-3 text-xl">🥇</span>
                    <div>
                      <span className="text-white font-semibold">Tier 1:</span>
                      <span className="text-white/90 ml-2">Höchste Skill-Kategorie</span>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-500/20 rounded-lg p-3 border border-orange-500/30">
                  <div className="flex items-center">
                    <span className="text-orange-400 mr-3 text-xl">🥈</span>
                    <div>
                      <span className="text-white font-semibold">Tier 2:</span>
                      <span className="text-white/90 ml-2">Mittlere Skill-Kategorie</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-500/20 rounded-lg p-3 border border-gray-500/30">
                  <div className="flex items-center">
                    <span className="text-gray-400 mr-3 text-xl">🥉</span>
                    <div>
                      <span className="text-white font-semibold">Tier 3:</span>
                      <span className="text-white/90 ml-2">Niedrigste Skill-Kategorie</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-purple-500/20 rounded-lg p-3 border border-purple-500/30">
                  <div className="flex items-center">
                    <span className="text-purple-400 mr-3 text-xl">⚖️</span>
                    <span className="text-white/90">Teams werden fair über alle Tiers verteilt</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verifikation */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
              <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
                <span className="mr-3 text-3xl">🔍</span>
                4. Verifikation
              </h2>
              <div className="space-y-4">
                <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
                  <div className="text-white/90">
                    <span className="font-semibold">Zu verifizieren:</span> In-Game Name, Rank, Discord, Twitch und Instagram
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-green-400 mr-3 text-xl mt-1">✅</span>
                  <span className="text-white/90">Nur verifizierte Spieler können Teams zugelost werden</span>
                </div>
                <div className="flex items-start">
                  <span className="text-red-400 mr-3 text-xl mt-1">❌</span>
                  <span className="text-white/90">Falsche Angaben führen zur Disqualifikation</span>
                </div>
                <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/30">
                  <div className="flex items-center">
                    <span className="text-yellow-400 mr-3 text-xl">⏱️</span>
                    <span className="text-white/90">Admin-Verifikation erforderlich</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Participation Rules */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-xl p-8 border border-blue-500/30">
              <h2 className="text-3xl font-semibold text-white mb-6 flex items-center">
                <span className="mr-4 text-4xl">⏰</span>
                5. Teilnahme & Pünktlichkeit
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-3">🕐</div>
                  <h3 className="text-white font-semibold mb-2">Pünktlichkeit</h3>
                  <p className="text-white/80 text-sm">Pünktliches Erscheinen zu den Matches ist Pflicht</p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-3">⚠️</div>
                  <h3 className="text-white font-semibold mb-2">5 Minuten Regel</h3>
                  <p className="text-white/80 text-sm">Bei Verspätung von mehr als 5 Minuten droht Disqualifikation</p>
                </div>
                
                <div className="bg-white/10 rounded-lg p-6 text-center">
                  <div className="text-3xl mb-3">🔧</div>
                  <h3 className="text-white font-semibold mb-2">Tech Support</h3>
                  <p className="text-white/80 text-sm">Technische Probleme müssen sofort gemeldet werden</p>
                </div>
              </div>
            </div>
          </div>

          {/* Accept Rules Section */}
          {isLoggedIn && userRulesAccepted === false && (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-6 mb-6 border border-green-500/30">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-3 text-2xl">📝</span>
                  Regelakzeptierung
                </h3>
                
                <label className="flex items-start space-x-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    className="mt-1 w-6 h-6 text-green-600 bg-transparent border-2 border-white/30 rounded focus:ring-green-500 transition-all"
                  />
                  <div className="text-white group-hover:text-green-200 transition-colors">
                    <p className="font-medium text-lg mb-2">
                      ✅ Ich habe die Tournament Regeln vollständig gelesen und verstanden
                    </p>
                    <p className="text-white/80">
                      Ich akzeptiere alle Regeln und verstehe, dass Verstöße zur Disqualifikation führen können.
                    </p>
                  </div>
                </label>
              </div>

              <div className="text-center">
                <button
                  onClick={handleAccept}
                  disabled={!accepted || loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-12 py-4 rounded-xl text-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 flex items-center mx-auto"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Wird verarbeitet...
                    </>
                  ) : (
                    <>
                      <span className="mr-3 text-xl">🚀</span>
                      Regeln akzeptieren und fortfahren
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Already Accepted Message */}
          {isLoggedIn && userRulesAccepted === true && (
            <div className="bg-green-500/20 backdrop-blur-sm rounded-xl p-8 border border-green-500/30 text-center">
              <div className="text-4xl mb-4">✅</div>
              <div className="text-green-200 text-2xl font-semibold mb-4">
                Regeln bereits akzeptiert
              </div>
              <p className="text-green-300 text-lg mb-6">
                Du hast die Tournament Regeln bereits akzeptiert und kannst am Tournament teilnehmen.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all hover:scale-105"
              >
                Zum Dashboard
              </button>
            </div>
          )}

          {/* Not Logged In Message */}
          {!isLoggedIn && (
            <div className="bg-blue-500/20 backdrop-blur-sm rounded-xl p-8 border border-blue-500/30 text-center">
              <div className="text-4xl mb-4">🔐</div>
              <div className="text-blue-200 text-2xl font-semibold mb-4">
                Anmeldung erforderlich
              </div>
              <p className="text-blue-300 text-lg mb-6">
                Du musst dich anmelden oder registrieren, um die Regeln zu akzeptieren und am Tournament teilzunehmen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => router.push('/login')}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all hover:scale-105"
                >
                  🔑 Anmelden
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all hover:scale-105"
                >
                  📝 Registrieren
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
