'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { SOCIAL_REQUIREMENTS } from '@/lib/socialRequirements'
import { MIN_VALORANT_LEVEL } from '@/lib/valorantRequirements'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    inGameName: '',
    inGameRank: '',
    valorantLevel: '',
    discordName: '',
    twitchName: '',
    instagramName: '',
    tiktokName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rankError, setRankError] = useState('')
  const [rankLoading, setRankLoading] = useState(false)
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

    if (!formData.inGameName.includes('#')) {
      setError('Bitte gib deinen In-Game Namen inklusive #Tag ein')
      return
    }

    if (!formData.inGameRank) {
      setError('Rank konnte noch nicht ermittelt werden. Bitte überprüfe deinen In-Game Namen.')
      return
    }

    if (!formData.valorantLevel || Number(formData.valorantLevel) < MIN_VALORANT_LEVEL) {
      setError(`Dein Valorant Account muss mindestens Level ${MIN_VALORANT_LEVEL} sein.`)
      return
    }

    if (!formData.twitchName.trim() || !formData.discordName.trim() || !formData.instagramName.trim() || !formData.tiktokName.trim()) {
      setError('Twitch, Discord, Instagram und TikTok sind Pflichtfelder.')
      return
    }

    // Show rules instead of submitting directly
    setShowRules(true)
  }

  const handleFinalRegistration = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: formData.password,
          inGameName: formData.inGameName,
          inGameRank: formData.inGameRank,
          valorantLevel: formData.valorantLevel,
          discordName: formData.discordName,
          twitchName: formData.twitchName,
          instagramName: formData.instagramName,
          tiktokName: formData.tiktokName,
          rulesAccepted: true,
        }),
        credentials: 'include' // Include cookies
      })

      const data = await response.json()

      if (response.ok && data.token && data.user) {
        login(data.token, data.user)
        router.push('/dashboard')
      } else {
        setShowRules(false)
        setError(data.error || 'Ein Fehler ist aufgetreten')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setShowRules(false)
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  const loadRankFromHenrikdev = async (fullName: string) => {
    setRankError('')
    setRankLoading(true)
    setFormData((prev) => ({ ...prev, inGameRank: '', valorantLevel: '' }))

    const hashIndex = fullName.indexOf('#')
    const name = fullName.slice(0, hashIndex).trim()
    const tag = fullName.slice(hashIndex + 1).trim()

    if (!name || !tag) {
      setRankError('Ungültiger Name. Bitte im Format Name#Tag eingeben.')
      setRankLoading(false)
      return
    }

    try {
      const response = await fetch(
        `/api/valorant-rank?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`
      )
      const data = await response.json()

      if (!response.ok) {
        const message =
          data.code === 'API_KEY_MISSING'
            ? 'Rank-API ist auf dem Server nicht eingerichtet (HENRIKDEV_API_KEY).'
            : data.error || 'Rank konnte nicht ermittelt werden'
        setRankError(message)
        return
      }

      const nextLevel = typeof data.level === 'number' ? String(data.level) : ''
      setFormData((prev) => ({
        ...prev,
        inGameRank: data.rank,
        valorantLevel: nextLevel,
      }))

      if (typeof data.level === 'number' && data.level < MIN_VALORANT_LEVEL) {
        setRankError(
          `Dein Valorant Account ist Level ${data.level}. Für die Teilnahme brauchst du mindestens Level ${MIN_VALORANT_LEVEL}.`
        )
      }
    } catch (error) {
      console.error('Rank lookup failed:', error)
      setRankError('Rank konnte nicht ermittelt werden.')
    } finally {
      setRankLoading(false)
    }
  }

  useEffect(() => {
    const name = formData.inGameName.trim()
    if (!name || !name.includes('#')) {
      setFormData((prev) => ({ ...prev, inGameRank: '', valorantLevel: '' }))
      setRankError('')
      setRankLoading(false)
      return
    }

    const timeout = setTimeout(() => {
      loadRankFromHenrikdev(name)
    }, 500)

    return () => clearTimeout(timeout)
  }, [formData.inGameName])

  return (
    <div className="min-h-screen bg-image flex items-center justify-center px-4">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 w-full max-w-2xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Registrierung</h1>
          <p className="text-white/80">Erstelle deinen Tournament Account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                In-Game Name *
              </label>
              <input
                type="text"
                id="inGameName"
                required
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Name#Tag"
                value={formData.inGameName}
                onChange={(e) => setFormData({ ...formData, inGameName: e.target.value })}
              />
              <p className="text-xs text-white/60 mt-2">
                Gib deinen In-Game Namen inklusive Hashtag ein, damit dein Rank automatisch geladen wird.
              </p>
            </div>

            <div>
              <label htmlFor="inGameRank" className="block text-white mb-2">
                Höchster Rank *
              </label>
              <input
                type="text"
                id="inGameRank"
                readOnly
                required
                value={rankLoading ? 'Rank wird geladen...' : formData.inGameRank}
                className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Rank wird automatisch ausgefüllt"
              />
              {rankError ? (
                <p className="text-xs text-red-300 mt-2">{rankError}</p>
              ) : (
                <p className="text-xs text-white/60 mt-2">
                  Peak-Rank wird automatisch ermittelt (Name#Tag muss öffentlich sein).
                </p>
              )}
              <div className="mt-4">
                <label htmlFor="valorantLevel" className="block text-white mb-2">
                  Valorant Level *
                </label>
                <input
                  type="text"
                  id="valorantLevel"
                  readOnly
                  required
                  value={rankLoading ? 'Level wird geladen...' : formData.valorantLevel}
                  className={`w-full px-4 py-3 rounded-lg bg-white/20 border text-white placeholder-white/60 focus:outline-none focus:ring-2 ${
                    formData.valorantLevel && Number(formData.valorantLevel) < MIN_VALORANT_LEVEL
                      ? 'border-red-400 focus:ring-red-500'
                      : 'border-white/30 focus:ring-purple-500'
                  }`}
                  placeholder={`Mindestens Level ${MIN_VALORANT_LEVEL}`}
                />
                <p className="text-xs text-white/60 mt-2">
                  Mindestlevel für die Teilnahme: {MIN_VALORANT_LEVEL}.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/20 rounded-lg p-4 mb-2">
            <p className="text-white font-medium mb-3">Social Media (Pflicht - Twitch & Discord werden vor der Registrierung geprüft)</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="twitchName" className="block text-white mb-2">
                  Twitch Name *
                </label>
                <input
                  type="text"
                  id="twitchName"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="dein_twitch_name"
                  value={formData.twitchName}
                  onChange={(e) => setFormData({ ...formData, twitchName: e.target.value })}
                />
                <p className="text-xs text-white/60 mt-2">
                  Dein Twitch Name wird automatisch dein Login-Name.
                </p>
                <a href={SOCIAL_REQUIREMENTS.twitch.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-300 hover:underline mt-1 inline-block">
                  → {SOCIAL_REQUIREMENTS.twitch.action}
                </a>
              </div>

              <div>
                <label htmlFor="discordName" className="block text-white mb-2">
                  Discord Name *
                </label>
                <input
                  type="text"
                  id="discordName"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="dein_discord_name"
                  value={formData.discordName}
                  onChange={(e) => setFormData({ ...formData, discordName: e.target.value })}
                />
                <a href={SOCIAL_REQUIREMENTS.discord.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-300 hover:underline mt-1 inline-block">
                  → {SOCIAL_REQUIREMENTS.discord.action}
                </a>
              </div>

              <div>
                <label htmlFor="instagramName" className="block text-white mb-2">
                  Instagram Name *
                </label>
                <input
                  type="text"
                  id="instagramName"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="dein_instagram_name"
                  value={formData.instagramName}
                  onChange={(e) => setFormData({ ...formData, instagramName: e.target.value })}
                />
                <a href={SOCIAL_REQUIREMENTS.instagram.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-300 hover:underline mt-1 inline-block">
                  → {SOCIAL_REQUIREMENTS.instagram.action}
                </a>
              </div>

              <div>
                <label htmlFor="tiktokName" className="block text-white mb-2">
                  TikTok Name *
                </label>
                <input
                  type="text"
                  id="tiktokName"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="dein_tiktok_name"
                  value={formData.tiktokName}
                  onChange={(e) => setFormData({ ...formData, tiktokName: e.target.value })}
                />
                <a href={SOCIAL_REQUIREMENTS.tiktok.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-300 hover:underline mt-1 inline-block">
                  → {SOCIAL_REQUIREMENTS.tiktok.action}
                </a>
              </div>
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
                Summer Cup
              </p>
              <div className="mt-4 inline-block bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-pink-500/20 border border-orange-300 rounded-lg px-6 py-2">
                <span className="text-orange-200 font-medium">Format & Teamanzahl werden noch bekanntgegeben</span>
              </div>
            </div>

            {/* Prerequisites */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="text-red-400 mr-3 text-3xl">⚠️</span>
                  Teilnahme-Voraussetzungen
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white/10 rounded-lg p-4 border border-purple-500/30 text-center">
                    <div className="text-2xl mb-2">📺</div>
                    <h4 className="text-white font-semibold text-sm mb-1">Twitch</h4>
                    <p className="text-white/80 text-xs">JoeDom folgen</p>
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-4 border border-blue-500/30 text-center">
                    <div className="text-2xl mb-2">💬</div>
                    <h4 className="text-white font-semibold text-sm mb-1">Discord</h4>
                    <p className="text-white/80 text-xs">Boss Gang Server</p>
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-4 border border-pink-500/30 text-center">
                    <div className="text-2xl mb-2">📸</div>
                    <h4 className="text-white font-semibold text-sm mb-1">Instagram</h4>
                    <p className="text-white/80 text-xs">@joetothedom folgen</p>
                  </div>

                  <div className="bg-white/10 rounded-lg p-4 border border-cyan-500/30 text-center">
                    <div className="text-2xl mb-2">🎵</div>
                    <h4 className="text-white font-semibold text-sm mb-1">TikTok</h4>
                    <p className="text-white/80 text-xs">@joetothedom folgen</p>
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
                    <span className="text-white/90 text-sm">Teams bestehen aus 5 Spielern plus 2 Reserve-Slots</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-purple-400 mr-2 text-lg mt-1">🔒</span>
                    <span className="text-white/90 text-sm">Jeder Spieler kann nur in einem Team teilnehmen</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-orange-400 mr-2 text-lg mt-1">📊</span>
                    <span className="text-white/90 text-sm"><strong>Die In-Game Karriere im Sommer Cup muss öffentlich sichtbar sein</strong></span>
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
                  <div className="bg-blue-500/20 rounded-lg p-2 border border-blue-500/30">
                    <div className="flex items-start">
                      <span className="text-blue-400 mr-2 text-lg mt-1">ℹ️</span>
                      <span className="text-white/90 text-sm"><strong>Tournament Format:</strong> Noch unbekannt - das finale Format wird noch bekanntgegeben</span>
                    </div>
                  </div>
                  <div className="bg-yellow-500/20 rounded-lg p-2 border border-yellow-500/30">
                    <div className="flex items-start">
                      <span className="text-yellow-400 mr-2 text-lg mt-1">⚡</span>
                      <span className="text-white/90 text-sm"><strong>Jeder Tier 1 Spieler muss Gambit spielen</strong></span>
                    </div>
                  </div>
                  <div className="bg-red-500/20 rounded-lg p-2 border border-red-500/30">
                    <div className="flex items-start">
                      <span className="text-red-400 mr-2 text-lg mt-1">🚫</span>
                      <span className="text-white/90 text-sm"><strong>Gambit darf nicht gebannt werden</strong></span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-400 mr-2 text-lg mt-1">🔄</span>
                    <span className="text-white/90 text-sm">Turnierformat und Teamanzahl werden noch bekanntgegeben</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-blue-400 mr-2 text-lg mt-1">🏅</span>
                    <span className="text-white/90 text-sm">Bracket Details werden vor Turnierstart bekanntgegeben</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-purple-400 mr-2 text-lg mt-1">⚔️</span>
                    <span className="text-white/90 text-sm">Matchlängen werden vor Turnierstart bekanntgegeben</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-pink-400 mr-2 text-lg mt-1">👑</span>
                    <span className="text-white/90 text-sm">Finale-Regeln werden vor Turnierstart bekanntgegeben</span>
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
                        <span className="text-white/90 ml-1 text-sm">Obere Mittelkategorie</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-500/20 rounded-lg p-2 border border-gray-500/30">
                    <div className="flex items-center">
                      <span className="text-gray-400 mr-2 text-lg">🥉</span>
                      <div>
                        <span className="text-white font-semibold text-sm">Tier 3:</span>
                        <span className="text-white/90 ml-1 text-sm">Untere Mittelkategorie</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-cyan-500/20 rounded-lg p-2 border border-cyan-500/30">
                    <div className="flex items-center">
                      <span className="text-cyan-300 mr-2 text-lg">🏅</span>
                      <div>
                        <span className="text-white font-semibold text-sm">Tier 4:</span>
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
                      <span className="font-semibold">Zu verifizieren:</span> In-Game Name, Rank, Twitch, Discord, Instagram und TikTok
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

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 mb-6">
                {error}
              </div>
            )}

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
