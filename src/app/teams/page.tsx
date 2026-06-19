'use client'

import { useState, useEffect } from 'react'
import { MAX_TEAMS, getDefaultTeamName, normalizeTeamName } from '@/lib/teamDefaults'
import { TEAM_PLAYER_LIMIT } from '@/lib/teamCapacity'

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

const createPlaceholderTeam = (position: number): Team => ({
  id: `placeholder-${position}`,
  name: getDefaultTeamName(position),
  position,
  members: []
})

const ensureFullTeamList = (inputTeams: Team[] = [], slotLimit: number = MAX_TEAMS): Team[] => {
  const targetSlots = Math.min(Math.max(Math.floor(slotLimit) || MAX_TEAMS, 1), MAX_TEAMS)
  const normalized = inputTeams
    .filter(Boolean)
    .map((team, index) => {
      const position = typeof team.position === 'number' && team.position > 0 ? team.position : index + 1

      return {
        ...team,
        name: normalizeTeamName(position, team.name),
        position,
        members: Array.isArray(team.members) ? team.members : []
      }
    })

  const seenPositions = new Set(normalized.map(team => team.position))

  for (let position = 1; position <= targetSlots; position++) {
    if (!seenPositions.has(position)) {
      normalized.push(createPlaceholderTeam(position))
    }
  }

  return normalized
    .sort((a, b) => a.position - b.position)
    .slice(0, targetSlots)
}

const clampSlotLimit = (value?: number): number => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) {
    return MAX_TEAMS
  }
  return Math.min(Math.max(Math.floor(numericValue), 2), MAX_TEAMS)
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamSlots, setTeamSlots] = useState(MAX_TEAMS)
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
        const slotLimit = clampSlotLimit(data.teamSlots)
        setTeamSlots(slotLimit)
        const normalizedTeams = ensureFullTeamList(data.teams || [], slotLimit)
        setTeams(normalizedTeams)
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
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
      case 2:
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
      case 3:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
      default:
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
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

  const totalPlayers = teams.reduce((sum, team) => sum + team.members.length, 0)
  const verifiedPlayers = teams.reduce((sum, team) => sum + team.members.filter(m => m.isVerified).length, 0)
  const fullTeamsCount = teams.filter(team => team.members.length >= TEAM_PLAYER_LIMIT).length
  const totalCapacity = teamSlots * TEAM_PLAYER_LIMIT
  const freeSlots = Math.max(totalCapacity - totalPlayers, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">❌</div>
          <div className="text-red-400 text-xl mb-6 font-semibold">{error}</div>
          <button 
            onClick={fetchTeams}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            🔄 Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="bg-black/70 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50 mb-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4">
              🏆 TOURNAMENT TEAMS
            </h1>
            <p className="text-xl text-white/80">
              {teams.length > 0 ? `${teamSlots} Team-Slots konfiguriert – ${teams.length} Plätze sichtbar` : 'Teams werden vom Admin-System erstellt'}
            </p>
            <p className="text-white/60 text-sm mt-2">Konfiguration durch Admin: {teamSlots} Teams · automatische Platzhalter füllen leere Slots</p>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="text-center">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl border border-white/20 p-12 max-w-md mx-auto">
              <div className="text-8xl mb-6">🎯</div>
              <h3 className="text-3xl font-bold text-white mb-4">Noch keine Teams</h3>
              <p className="text-gray-300 mb-8 text-lg">
                Die Teams werden vom Admin-System über das Glücksrad erstellt und hier angezeigt.
              </p>
              <button 
                onClick={fetchTeams}
                className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 transform hover:scale-105 font-semibold text-lg"
              >
                🔄 Teams aktualisieren
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Teams Grid */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {teams.map((team) => (
                <div key={team.id} className="bg-black/70 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02]">
                  
                  {/* Team Header */}
                  <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 border-b border-white/10">
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-2xl font-bold text-white flex items-center">
                        <span className="mr-3 text-3xl">🛡️</span>
                        {team.name}
                      </h2>
                    </div>
                    
                    {/* Team Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/70">Team-Stärke</span>
                        <span className="text-white/90">{team.members.length}/{TEAM_PLAYER_LIMIT} Mitglieder</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            team.members.length >= TEAM_PLAYER_LIMIT ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            team.members.length >= TEAM_PLAYER_LIMIT - 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                          style={{width: `${Math.min((team.members.length / TEAM_PLAYER_LIMIT) * 100, 100)}%`}}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-black/40 rounded-lg p-2 text-center">
                        <div className="text-blue-400 font-bold text-lg">{team.members.length}</div>
                        <div className="text-white/60 text-xs">Mitglieder</div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2 text-center">
                        <div className="text-green-400 font-bold text-lg">
                          {team.members.filter(m => m.isVerified).length}
                        </div>
                        <div className="text-white/60 text-xs">Verifiziert</div>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2 text-center">
                        <div className={`font-bold text-lg ${
                          team.members.length >= TEAM_PLAYER_LIMIT ? 'text-green-400' :
                          team.members.length >= TEAM_PLAYER_LIMIT - 1 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {team.members.length >= TEAM_PLAYER_LIMIT ? '✅' :
                           team.members.length >= TEAM_PLAYER_LIMIT - 1 ? '⚠️' :
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
                            key={member.id}
                            className="bg-black/55 rounded-xl p-4 border border-white/20 hover:border-purple-400/50 transition-all duration-300"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="text-white font-semibold text-lg">
                                      {member.username}
                                    </h3>
                                  </div>
                                </div>
                                
                                {member.inGameName && (
                                  <div className="bg-blue-600/20 border border-blue-400/30 rounded-lg px-3 py-1 mb-2 inline-block">
                                    <span className="text-blue-200 text-sm font-medium">
                                      🎮 {member.inGameName}
                                    </span>
                                  </div>
                                )}
                                
                                {member.discord && (
                                  <div className="mb-2 text-sm text-indigo-200">
                                    Discord: <span className="font-semibold text-white">{member.discord}</span>
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
                                  {member.tier && member.tier >= 1 && member.tier <= 3 && (
                                    <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center ${getTierColor(member.tier)}`}>
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
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Empty slots with better design */}
                        {Array.from({ length: Math.max(TEAM_PLAYER_LIMIT - team.members.length, 0) }).map((_, index) => (
                          <div
                            key={`empty-${index}`}
                            className="bg-black/35 rounded-xl p-4 border-2 border-dashed border-white/20 hover:border-purple-400/50 transition-all duration-300"
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
            <div className="mt-12 bg-black/70 backdrop-blur-sm rounded-lg p-6 border border-white/20">
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
                    left: '0px',
                    top: '0px',
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
                    {totalPlayers}
                  </p>
                  <p className="text-white/70">Gesamte Spieler</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-400">
                    {fullTeamsCount}
                  </p>
                  <p className="text-white/70">Vollständige Teams</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">
                    {verifiedPlayers}
                  </p>
                  <p className="text-white/70">Verifizierte Spieler</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-400">
                    {freeSlots}
                  </p>
                  <p className="text-white/70">Freie Plätze</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-purple-200 text-sm">
            📡 Live Updates • Letzte Aktualisierung: {new Date().toLocaleTimeString()}
          </p>
          <p className="text-purple-300 text-xs mt-1">
            Teams werden automatisch vom Admin-System synchronisiert · Konfigurierte Slots: {teamSlots}
          </p>
        </div>

      </div>
    </div>
  )
}
