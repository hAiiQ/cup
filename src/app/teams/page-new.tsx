'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface TeamMember {
  id: string
  username: string
  inGameName?: string
  rank?: string
  tier?: number | null
  isVerified: boolean
  discord?: string
  twitch?: string
  isStreamer: boolean
  role: string
}

interface Team {
  id: string
  name: string
  position: number
  imageUrl?: string
  members: TeamMember[]
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Fetching teams...')
      
      const response = await fetch('/api/teams')
      const data = await response.json()
      
      console.log('📥 API Response:', data)
      
      if (response.ok) {
        setTeams(data.teams || [])
      } else {
        console.error('❌ API Error:', data.error)
        setError(data.error || 'Fehler beim Laden der Teams')
        setTeams([])
      }
    } catch (error) {
      console.error('❌ Fetch Error:', error)
      setError('Netzwerkfehler beim Laden der Teams')
      setTeams([])
    } finally {
      setLoading(false)
    }
  }

  const getTierColor = (tier?: number | null) => {
    switch (tier) {
      case 1:
        return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30'
      case 2:
        return 'text-gray-300 bg-gray-300/20 border-gray-300/30'
      case 3:
        return 'text-orange-500 bg-orange-500/20 border-orange-500/30'
      default:
        return 'text-gray-500 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getTierIcon = (tier?: number | null) => {
    switch (tier) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return '❓'
    }
  }

  const getTierName = (tier?: number | null) => {
    switch (tier) {
      case 1:
        return 'TIER 1'
      case 2:
        return 'TIER 2'
      case 3:
        return 'TIER 3'
      default:
        return 'UNRANKED'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-20 relative">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-6"></div>
          <div className="text-white text-2xl font-semibold">Teams werden geladen...</div>
          <div className="text-gray-400 mt-2">Bitte warten Sie einen Moment</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-20 relative">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">❌</div>
          <div className="text-red-400 text-xl mb-6 font-semibold">{error}</div>
          <button 
            onClick={fetchTeams}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 font-medium"
          >
            🔄 Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-20 relative">
      <div className="container mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6 no-text-shadow">
            TOURNAMENT
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 no-text-shadow">
              TEAMS
            </span>
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            {teams.length > 0 ? `${teams.length} Teams bereit für das Double Elimination Tournament` : 'Teams werden vom Admin-System erstellt'}
          </p>
          
          <div className="flex justify-center gap-4 mt-6">
            <div className="bg-purple-600/30 border border-purple-400 rounded-lg px-4 py-2">
              <span className="text-purple-200 font-medium">📊 Live Team Updates</span>
            </div>
            <div className="bg-green-600/30 border border-green-400 rounded-lg px-4 py-2">
              <span className="text-green-200 font-medium">⚡ Echtzeit Synchronisation</span>
            </div>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-12 max-w-md mx-auto">
              <div className="text-8xl mb-6">🎯</div>
              <h3 className="text-3xl font-bold text-white mb-4">Noch keine Teams</h3>
              <p className="text-gray-300 mb-8 text-lg">
                Die Teams werden vom Admin-System über das Glücksrad erstellt und hier angezeigt.
              </p>
              <button 
                onClick={fetchTeams}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 font-semibold text-lg"
              >
                🔄 Teams aktualisieren
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Teams Grid */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              {teams.map((team) => (
                <div key={team.id} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
                  
                  {/* Team Header */}
                  <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 border-b border-white/10">
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-3xl font-bold text-white flex items-center">
                        <span className="mr-3 text-4xl">🛡️</span>
                        {team.name}
                      </h2>
                      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg px-4 py-2">
                        <span className="text-white font-bold text-lg">
                          #{team.position}
                        </span>
                      </div>
                    </div>
                    
                    {/* Team Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/80 font-medium">Team-Stärke</span>
                        <span className="text-white font-bold">{team.members.length}/6 Mitglieder</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            team.members.length === 6 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            team.members.length >= 4 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                          style={{width: `${(team.members.length / 6) * 100}%`}}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <div className="text-blue-400 font-bold text-xl">{team.members.length}</div>
                        <div className="text-white/60 text-sm">Mitglieder</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <div className="text-green-400 font-bold text-xl">
                          {team.members.filter(m => m.isVerified).length}
                        </div>
                        <div className="text-white/60 text-sm">Verifiziert</div>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3 text-center">
                        <div className={`font-bold text-xl ${
                          team.members.length === 6 ? 'text-green-400' :
                          team.members.length >= 4 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {team.members.length === 6 ? '✅' :
                           team.members.length >= 4 ? '⚠️' :
                           '❌'}
                        </div>
                        <div className="text-white/60 text-sm">Status</div>
                      </div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="p-6">
                    {team.members.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🎲</div>
                        <h3 className="text-white font-semibold text-xl mb-3">Warten auf Zulosung</h3>
                        <p className="text-white/70 text-lg">Admins werden die Teams bald zusammenstellen</p>
                        <div className="mt-6 inline-block bg-yellow-500/20 border border-yellow-400 rounded-lg px-6 py-3">
                          <span className="text-yellow-300 font-medium">🕐 Zulosung ausstehend</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="text-xl font-bold text-white mb-4 flex items-center">
                          <span className="mr-2">👥</span>
                          Team Roster ({team.members.length}/6)
                        </h4>
                        
                        {team.members.map((member, index) => (
                          <div
                            key={member.id}
                            className="bg-gradient-to-r from-white/10 to-white/5 rounded-xl p-4 border border-white/20 hover:border-purple-400/50 transition-all duration-300 hover:bg-white/15"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-white font-bold text-lg">
                                      {(member.inGameName || member.username).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <h3 className="text-white font-bold text-lg">
                                        {member.inGameName || member.username}
                                      </h3>
                                      {member.role === 'captain' && (
                                        <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-3 py-1 rounded-lg text-sm font-bold flex items-center">
                                          👑 CAPTAIN
                                        </span>
                                      )}
                                      {index === 0 && member.role !== 'captain' && (
                                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-bold">
                                          LEADER
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-gray-400 text-sm">
                                      @{member.username}
                                    </div>
                                  </div>
                                </div>
                                
                                {member.inGameName && (
                                  <div className="bg-blue-600/20 border border-blue-400/30 rounded-lg px-4 py-2 mb-3 inline-block">
                                    <span className="text-blue-200 text-sm font-medium">
                                      🎮 {member.inGameName}
                                    </span>
                                  </div>
                                )}
                                
                                <div className="flex items-center space-x-2 flex-wrap gap-2">
                                  {/* Verification Status */}
                                  <div className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center ${
                                    member.isVerified 
                                      ? 'bg-green-500/20 border border-green-400/50 text-green-300' 
                                      : 'bg-yellow-500/20 border border-yellow-400/50 text-yellow-300'
                                  }`}>
                                    {member.isVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                                  </div>
                                  
                                  {/* Tier Badge */}
                                  {member.tier && (
                                    <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center border ${getTierColor(member.tier)}`}>
                                      <span className="mr-1">{getTierIcon(member.tier)}</span>
                                      {getTierName(member.tier)}
                                    </div>
                                  )}
                                  
                                  {/* Rank Badge */}
                                  {member.rank && (
                                    <div className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/20 border border-indigo-400/50 text-indigo-300">
                                      🎯 {member.rank}
                                    </div>
                                  )}
                                  
                                  {/* Streamer Badge */}
                                  {member.isStreamer && (
                                    <div className="px-3 py-1 rounded-lg text-xs font-bold flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                      <span className="mr-1">🎥</span>
                                      STREAMER
                                    </div>
                                  )}
                                </div>
                                
                                {/* Social Links */}
                                {(member.discord || member.twitch) && (
                                  <div className="flex space-x-2 mt-3">
                                    {member.discord && (
                                      <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md" title="Discord verfügbar">
                                        <span className="text-white text-xs font-bold">D</span>
                                      </div>
                                    )}
                                    {member.twitch && (
                                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center shadow-md" title="Twitch verfügbar">
                                        <span className="text-white text-xs font-bold">T</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Empty slots */}
                        {Array.from({ length: 6 - team.members.length }).map((_, index) => (
                          <div
                            key={`empty-${index}`}
                            className="bg-white/5 rounded-xl p-4 border-2 border-dashed border-white/20 hover:border-purple-400/50 transition-all duration-300"
                          >
                            <div className="text-center text-white/50 py-4">
                              <div className="text-4xl mb-2">👤</div>
                              <p className="text-sm font-medium">Freier Platz #{team.members.length + index + 1}</p>
                              <p className="text-xs text-white/30 mt-1">Warten auf Zulosung</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tournament Statistics */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-8 mb-8">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">
                📊 Tournament Statistiken
              </h2>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-400 mb-2">
                    {teams.reduce((sum, team) => sum + team.members.length, 0)}
                  </p>
                  <p className="text-white/70 font-medium">Gesamte Spieler</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-400 mb-2">
                    {teams.filter(team => team.members.length === 6).length}
                  </p>
                  <p className="text-white/70 font-medium">Vollständige Teams</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-yellow-400 mb-2">
                    {teams.reduce((sum, team) => sum + team.members.filter(m => m.isVerified).length, 0)}
                  </p>
                  <p className="text-white/70 font-medium">Verifizierte Spieler</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-400 mb-2">
                    {48 - teams.reduce((sum, team) => sum + team.members.length, 0)}
                  </p>
                  <p className="text-white/70 font-medium">Freie Plätze</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Navigation Footer */}
        <div className="text-center mt-12">
          <div className="flex justify-center space-x-8">
            <Link href="/bracket" className="text-white/80 hover:text-white transition-colors font-medium">
              Tournament Bracket
            </Link>
            <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors font-medium">
              Dashboard
            </Link>
            <Link href="/rules" className="text-white/80 hover:text-white transition-colors font-medium">
              Regeln
            </Link>
          </div>
          <p className="text-purple-200 text-sm mt-4">
            📡 Live Updates • Letzte Aktualisierung: {new Date().toLocaleTimeString()}
          </p>
          <p className="text-purple-300 text-xs mt-1">
            Teams werden automatisch vom Admin-System synchronisiert
          </p>
        </div>
      </div>
    </div>
  )
}
