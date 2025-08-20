'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    inGameName: '',
    inGameRank: '',
    discordName: '',
    twitchName: '',
    instagramName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    if (formData.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein')
      return
    }

    // Show rules instead of submitting directly
    setShowRules(true)
  }

  const handleFinalRegistration = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          inGameName: formData.inGameName,
          inGameRank: formData.inGameRank,
          discordName: formData.discordName,
          twitchName: formData.twitchName,
          instagramName: formData.instagramName,
          rulesAccepted: true,
        }),
        credentials: 'include' // Include cookies
      })

      const data = await response.json()

      if (response.ok && data.token && data.user) {
        // Use AuthContext login function
        login(data.token, data.user)
        
        // Navigate to dashboard
        router.push('/dashboard')
      } else {
        setError(data.error || 'Ein Fehler ist aufgetreten')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-image flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Registrierung</h1>
          <p className="text-white/80">Erstelle deinen Tournament Account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-white mb-2">
              Benutzername *
            </label>
            <input
              type="text"
              id="username"
              required
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Dein Benutzername"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-white mb-2">
              Passwort *
            </label>
            <input
              type="password"
              id="password"
              required
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Mindestens 6 Zeichen"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-white mb-2">
              Passwort bestätigen *
            </label>
            <input
              type="password"
              id="confirmPassword"
              required
              className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Passwort wiederholen"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="inGameName" className="block text-white mb-2">
                Spielername *
              </label>
              <input
                type="text"
                id="inGameName"
                required
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Marvel Rivals Name"
                value={formData.inGameName}
                onChange={(e) => setFormData({ ...formData, inGameName: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="inGameRank" className="block text-white mb-2">
                Höchster Rank *
              </label>
              <select
                id="inGameRank"
                required
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.inGameRank}
                onChange={(e) => setFormData({ ...formData, inGameRank: e.target.value })}
              >
                <option value="" className="bg-gray-800">Wähle deinen Rank</option>
                <option value="Gold" className="bg-gray-800">Gold</option>
                <option value="Platinum" className="bg-gray-800">Platinum</option>
                <option value="Diamond" className="bg-gray-800">Diamond</option>
                <option value="Grandmaster" className="bg-gray-800">Grandmaster</option>
                <option value="Celestial" className="bg-gray-800">Celestial</option>
                <option value="Eternity" className="bg-gray-800">Eternity</option>
                <option value="One Above All" className="bg-gray-800">One Above All</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="discordName" className="block text-white mb-2">
                Discord Name
              </label>
              <input
                type="text"
                id="discordName"
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="dein_discord_name"
                value={formData.discordName}
                onChange={(e) => setFormData({ ...formData, discordName: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="twitchName" className="block text-white mb-2">
                Twitch Name
              </label>
              <input
                type="text"
                id="twitchName"
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="dein_twitch_name"
                value={formData.twitchName}
                onChange={(e) => setFormData({ ...formData, twitchName: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="instagramName" className="block text-white mb-2">
                Instagram Name
              </label>
              <input
                type="text"
                id="instagramName"
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="dein_instagram_name"
                value={formData.instagramName}
                onChange={(e) => setFormData({ ...formData, instagramName: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Weiter zu den Regeln
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-white/80">
            Bereits einen Account?{' '}
            <Link href="/login" className="text-purple-300 hover:text-purple-200 font-semibold">
              Hier anmelden
            </Link>
          </p>
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 max-w-6xl max-h-[90vh] overflow-y-auto border border-white/20">
            
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-white mb-4">
                🏆 Tournament Regeln
              </h2>
              <p className="text-xl text-white/80">
                JOEDOM'S PATH OF LOKI - Marvel Rivals Tournament
              </p>
              <div className="mt-4 inline-block bg-purple-600/30 border border-purple-400 rounded-lg px-6 py-2">
                <span className="text-purple-200 font-medium">📅 Double Elimination • 8 Teams • Marvel Rivals</span>
              </div>
            </div>

            {/* Prerequisites */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="text-red-400 mr-3 text-3xl">⚠️</span>
                  Teilnahme-Voraussetzungen
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div className="bg-white/10 rounded-lg p-4 border border-purple-500/30 text-center">
                    <div className="text-2xl mb-2">📺</div>
                    <h4 className="text-white font-semibold text-sm mb-1">Twitch Follow</h4>
                    <p className="text-white/80 text-xs">JoeDom folgen</p>
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-4 border border-blue-500/30 text-center">
                    <div className="text-2xl mb-2">💬</div>
                    <h4 className="text-white font-semibold text-sm mb-1">Discord Join</h4>
                    <p className="text-white/80 text-xs">JoeDom's Discord</p>
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-4 border border-pink-500/30 text-center">
                    <div className="text-2xl mb-2">📸</div>
                    <h4 className="text-white font-semibold text-sm mb-1">Instagram Follow</h4>
                    <p className="text-white/80 text-xs">OXS folgen</p>
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-4 border border-green-500/30 text-center">
                    <div className="text-2xl mb-2">🏦</div>
                    <h4 className="text-white font-semibold text-sm mb-1">Bankkonto</h4>
                    <p className="text-white/80 text-xs">IBAN für Gewinn</p>
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-4 border border-red-500/30 text-center">
                    <div className="text-2xl mb-2">🔴</div>
                    <h4 className="text-white font-semibold text-sm mb-1">Live Stream</h4>
                    <p className="text-white/80 text-xs">Anwesenheit Pflicht</p>
                  </div>
                </div>
                
                <div className="bg-yellow-500/20 rounded-lg p-3 border border-yellow-500/30">
                  <p className="text-yellow-200 font-medium text-center text-sm">
                    <span className="text-yellow-400 text-lg mr-2">⚡</span> 
                    Diese Voraussetzungen werden bei der Verifikation überprüft!
                  </p>
                </div>
              </div>
            </div>

            {/* Rules Grid */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              
              {/* Allgemeine Regeln */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-3 text-2xl">📋</span>
                  1. Allgemeine Regeln
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <span className="text-green-400 mr-2 text-lg mt-1">✓</span>
                    <span className="text-white/90 text-sm">Alle Teilnehmer müssen fair play befolgen und respektvoll miteinander umgehen</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-red-400 mr-2 text-lg mt-1">✗</span>
                    <span className="text-white/90 text-sm">Beleidigungen oder toxisches Verhalten führen zur sofortigen Disqualifikation</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-400 mr-2 text-lg mt-1">👥</span>
                    <span className="text-white/90 text-sm">Teams bestehen aus maximal 6 Spielern pro Team</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-purple-400 mr-2 text-lg mt-1">🔒</span>
                    <span className="text-white/90 text-sm">Jeder Spieler kann nur in einem Team teilnehmen</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-orange-400 mr-2 text-lg mt-1">📊</span>
                    <span className="text-white/90 text-sm"><strong>Die In-Game Karriere in Marvel Rivals muss öffentlich sichtbar sein</strong></span>
                  </div>
                </div>
              </div>

              {/* Tournament Format */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-3 text-2xl">🏆</span>
                  2. Tournament Format
                </h3>
                <div className="space-y-3">
                  <div className="bg-yellow-500/20 rounded-lg p-2 border border-yellow-500/30">
                    <div className="flex items-start">
                      <span className="text-yellow-400 mr-2 text-lg mt-1">⚡</span>
                      <span className="text-white/90 text-sm"><strong>Jeder Tier 1 Spieler muss Loki spielen</strong></span>
                    </div>
                  </div>
                  <div className="bg-red-500/20 rounded-lg p-2 border border-red-500/30">
                    <div className="flex items-start">
                      <span className="text-red-400 mr-2 text-lg mt-1">🚫</span>
                      <span className="text-white/90 text-sm"><strong>Loki darf nicht gebannt werden</strong></span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-400 mr-2 text-lg mt-1">🔄</span>
                    <span className="text-white/90 text-sm">Double Elimination System mit 8 Teams</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-400 mr-2 text-lg mt-1">🏅</span>
                    <span className="text-white/90 text-sm">Winner Bracket und Loser Bracket</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-purple-400 mr-2 text-lg mt-1">⚔️</span>
                    <span className="text-white/90 text-sm">Best of 3 in allen Runden außer dem Finale</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-pink-400 mr-2 text-lg mt-1">👑</span>
                    <span className="text-white/90 text-sm">Finale ist Best of 5 für den ultimativen Champion</span>
                  </div>
                </div>
              </div>

              {/* Tier System */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-3 text-2xl">🎯</span>
                  3. Tier System
                </h3>
                <div className="space-y-3">
                  <div className="bg-yellow-500/20 rounded-lg p-2 border border-yellow-500/30">
                    <div className="flex items-center">
                      <span className="text-yellow-400 mr-2 text-lg">🥇</span>
                      <div>
                        <span className="text-white font-semibold text-sm">Tier 1:</span>
                        <span className="text-white/90 ml-1 text-sm">Höchste Skill-Kategorie</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-500/20 rounded-lg p-2 border border-orange-500/30">
                    <div className="flex items-center">
                      <span className="text-orange-400 mr-2 text-lg">🥈</span>
                      <div>
                        <span className="text-white font-semibold text-sm">Tier 2:</span>
                        <span className="text-white/90 ml-1 text-sm">Mittlere Skill-Kategorie</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-500/20 rounded-lg p-2 border border-gray-500/30">
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2 text-lg">🥉</span>
                      <div>
                        <span className="text-white font-semibold text-sm">Tier 3:</span>
                        <span className="text-white/90 ml-1 text-sm">Niedrigste Skill-Kategorie</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-500/20 rounded-lg p-2 border border-purple-500/30">
                    <div className="flex items-center">
                      <span className="text-purple-400 mr-2 text-lg">⚖️</span>
                      <span className="text-white/90 text-sm">Teams werden fair über alle Tiers verteilt</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verifikation & Teilnahme */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-3 text-2xl">🔍</span>
                  4. Verifikation & Teilnahme
                </h3>
                <div className="space-y-3">
                  <div className="bg-blue-500/20 rounded-lg p-2 border border-blue-500/30">
                    <div className="text-white/90 text-sm">
                      <span className="font-semibold">Zu verifizieren:</span> In-Game Name, Rank, Discord, Twitch und Instagram
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-400 mr-2 text-lg mt-1">✅</span>
                    <span className="text-white/90 text-sm">Nur verifizierte Spieler können Teams zugelost werden</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-red-400 mr-2 text-lg mt-1">❌</span>
                    <span className="text-white/90 text-sm">Falsche Angaben führen zur Disqualifikation</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-yellow-400 mr-2 text-lg mt-1">🕐</span>
                    <span className="text-white/90 text-sm">Pünktliches Erscheinen zu den Matches ist Pflicht</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-orange-400 mr-2 text-lg mt-1">⚠️</span>
                    <span className="text-white/90 text-sm">Bei Verspätung von mehr als 5 Minuten droht Disqualifikation</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6 mb-6">
              <div className="text-center">
                <div className="text-3xl mb-3">📝</div>
                <p className="text-yellow-200 font-semibold text-lg mb-2">
                  Regelakzeptierung
                </p>
                <p className="text-yellow-300 text-sm">
                  Mit der Registrierung akzeptierst du automatisch alle Tournament Regeln.
                  Verstöße können zur Disqualifikation führen.
                </p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowRules(false)}
                className="px-8 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all hover:scale-105"
              >
                ← Zurück
              </button>
              <button
                onClick={handleFinalRegistration}
                disabled={loading}
                className="px-10 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    Registrierung abschließen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
