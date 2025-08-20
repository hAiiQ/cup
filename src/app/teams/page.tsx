'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface User {
  id: string
  username: string
  inGameName?: string
  tier?: string
  isStreamer: boolean
  isVerified: boolean
}

interface TeamMember {
  user: User
  role: string
}

interface Team {
  id: string
  name: string
  position: number
  members: TeamMember[]
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams)
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'tier1':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
      case 'tier2':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
      case 'tier3':
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
      default:
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
    }
  }

  const getTierIcon = (tier?: string) => {
    switch (tier) {
      case 'tier1':
        return '🥇'
      case 'tier2':
        return '🥈'
      case 'tier3':
        return '🥉'
      default:
        return '❓'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-image flex items-center justify-center">
        <div className="text-white text-xl">Lade Teams...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-image">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-8 border border-purple-500/50 mb-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4">
              🏆 TOURNAMENT TEAMS
            </h1>
            <p className="text-xl text-white/80 mb-4">
              Alle 8 Teams • Double Elimination • Marvel Rivals
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
        </div>

        {/* Teams Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {teams.map((team) => (
            <div key={team.id} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02]">
              
              {/* Team Header */}
              <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 border-b border-white/10">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <span className="mr-3 text-3xl">🛡️</span>
                    {team.name}
                  </h2>
                  <div className="bg-purple-600/30 border border-purple-400 rounded-lg px-3 py-1">
                    <span className="text-purple-200 font-medium text-sm">
                      #{team.position}
                    </span>
                  </div>
                </div>
                
                {/* Team Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Team-Stärke</span>
                    <span className="text-white/90">{team.members.length}/6 Mitglieder</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        team.members.length === 6 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                        team.members.length >= 4 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                        'bg-gradient-to-r from-red-500 to-pink-500'
                      }`}
                      style={{width: `${(team.members.length / 6) * 100}%`}}
                    ></div>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <div className="text-blue-400 font-bold text-lg">{team.members.length}</div>
                    <div className="text-white/60 text-xs">Mitglieder</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <div className="text-green-400 font-bold text-lg">
                      {team.members.filter(m => m.user.isVerified).length}
                    </div>
                    <div className="text-white/60 text-xs">Verifiziert</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <div className={`font-bold text-lg ${
                      team.members.length === 6 ? 'text-green-400' :
                      team.members.length >= 4 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {team.members.length === 6 ? '✅' :
                       team.members.length >= 4 ? '⚠️' :
                       '❌'}
                    </div>
                    <div className="text-white/60 text-xs">Status</div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="p-6">
                {team.members.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎲</div>
                    <h3 className="text-white font-semibold text-lg mb-2">Warten auf Zulosung</h3>
                    <p className="text-white/60">Admins werden die Teams bald zusammenstellen</p>
                    <div className="mt-4 inline-block bg-yellow-500/20 border border-yellow-400 rounded-lg px-4 py-2">
                      <span className="text-yellow-300 font-medium text-sm">🕐 Zulosung ausstehend</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {team.members.map((member) => (
                      <div
                        key={member.user.id}
                        className="bg-gradient-to-r from-white/10 to-white/5 rounded-xl p-4 border border-white/20 hover:border-purple-400/50 transition-all duration-300"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="flex items-center space-x-2">
                                <h3 className="text-white font-semibold text-lg">
                                  {member.user.username}
                                </h3>
                                {member.role === 'captain' && (
                                  <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-2 py-1 rounded-lg text-xs font-bold flex items-center">
                                    👑 CAPTAIN
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {member.user.inGameName && (
                              <div className="bg-blue-600/20 border border-blue-400/30 rounded-lg px-3 py-1 mb-2 inline-block">
                                <span className="text-blue-200 text-sm font-medium">
                                  🎮 {member.user.inGameName}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-2 flex-wrap gap-2">
                              {/* Verification Status */}
                              <div className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center ${
                                member.user.isVerified 
                                  ? 'bg-green-500/20 border border-green-400/50 text-green-300' 
                                  : 'bg-yellow-500/20 border border-yellow-400/50 text-yellow-300'
                              }`}>
                                {member.user.isVerified ? '✅ Verifiziert' : '⏳ Ausstehend'}
                              </div>
                              
                              {/* Tier Badge */}
                              {member.user.tier && (
                                <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center ${getTierColor(member.user.tier)}`}>
                                  <span className="mr-1">{getTierIcon(member.user.tier)}</span>
                                  {member.user.tier.replace('tier', 'TIER ')}
                                </div>
                              )}
                              
                              {/* Streamer Badge */}
                              {member.user.isStreamer && (
                                <div className="px-3 py-1 rounded-lg text-xs font-bold flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                  <span className="mr-1">🎥</span>
                                  STREAMER
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Empty slots with better design */}
                    {Array.from({ length: 6 - team.members.length }).map((_, index) => (
                      <div
                        key={`empty-${index}`}
                        className="bg-white/5 rounded-xl p-4 border-2 border-dashed border-white/20 hover:border-purple-400/50 transition-all duration-300"
                      >
                        <div className="text-center text-white/40">
                          <div className="text-3xl mb-2">👤</div>
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

        {/* Summary */}
        <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <h2 className="text-2xl font-bold mb-4 no-text-shadow">
            <span className="text-white" style={{textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'}}>📊 </span>
            <span 
              className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent relative"
              style={{
                textShadow: 'none',
                position: 'relative'
              }}
            >
              <span style={{
                position: 'absolute',
                left: '2px',
                top: '2px',
                color: 'rgba(0, 0, 0, 0.6)',
                zIndex: -1
              }}>
                Tournament Statistiken
              </span>
              Tournament Statistiken
            </span>
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400">
                {teams.reduce((sum, team) => sum + team.members.length, 0)}
              </p>
              <p className="text-white/70">Gesamte Spieler</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400">
                {teams.filter(team => team.members.length === 6).length}
              </p>
              <p className="text-white/70">Vollständige Teams</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-400">
                {teams.reduce((sum, team) => sum + team.members.filter(m => m.user.isVerified).length, 0)}
              </p>
              <p className="text-white/70">Verifizierte Spieler</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-400">
                {48 - teams.reduce((sum, team) => sum + team.members.length, 0)}
              </p>
              <p className="text-white/70">Freie Plätze</p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-purple-200 text-sm">
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
