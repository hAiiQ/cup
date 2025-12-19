'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  WINNER_ROUND_GROUPS,
  LOSER_ROUND_GROUPS,
  type BracketMatch,
  type BracketTeam
} from '@/lib/bracketStructure'

export default function BracketPage() {
  const [bracket, setBracket] = useState<BracketMatch[]>([])
  const [teams, setTeams] = useState<BracketTeam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    
    // Auto-refresh alle 3 Sekunden für Live-Updates
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching bracket data...')
      
      // Only fetch matches API - it contains both teams and matches
      const matchesRes = await fetch('/api/bracket/matches')
      
      if (matchesRes.ok) {
        const data = await matchesRes.json()
        console.log('✅ Bracket data loaded:', data)
        console.log(`🎮 Admin controlled matches: ${data.adminControlled ? 'YES' : 'NO'}`)
        
        // Set teams from the matches API response
        if (data.teams && data.teams.length > 0) {
          setTeams(data.teams)
          console.log(`📋 Teams loaded: ${data.teams.map((t: Team) => t.name).join(', ')}`)
        }
        
        // Set matches
        if (data.matches && data.matches.length > 0) {
          setBracket(data.matches)
          console.log(`🏆 Matches loaded: ${data.matches.length} matches`)
          
          // Debug: Show live matches
          const liveMatches = data.matches.filter((m: any) => m.isLive)
          if (liveMatches.length > 0) {
            console.log(`🔴 LIVE MATCHES FOUND:`, liveMatches.map((m: any) => `${m.id} (${m.team1?.name} vs ${m.team2?.name})`))
          } else {
            console.log('⚪ No live matches currently')
          }
        } else {
          console.log('⚠️ No matches in response')
          setBracket([])
        }
      } else {
        console.error('❌ Failed to fetch bracket data:', matchesRes.status)
        setBracket([])
        setTeams([])
      }
      
    } catch (error) {
      console.error('❌ Error fetching bracket data:', error)
      setBracket([])
      setTeams([])
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh every 5 seconds to get live updates from admin changes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Helper function to find match by ID
  const findMatchById = (matchId: string) => {
    return bracket.find(m => m.id === matchId)
  }

  // Helper function to get team name or fallback
  const getTeamName = (team?: BracketTeam, fallback: string = 'TBD') => {
    return team?.name || fallback
  }

  // Read-only MatchBox component (same as admin but without onClick)
  const MatchBox = ({ 
    match, 
    className = ""
  }: {
    match?: BracketMatch
    className?: string
  }) => {
    if (!match) {
      return (
        <div className={`bg-gray-700/90 border border-gray-600 rounded-lg p-3 w-full h-16 flex items-center justify-center ${className}`}>
          <div className="text-gray-400 text-sm">Kein Match</div>
        </div>
      )
    }

    const team1Name = getTeamName(match.team1, 'TBD')
    const team2Name = getTeamName(match.team2, 'TBD')
    const hasScore = (match.team1Score > 0 || match.team2Score > 0) // Zeige Scores auch bei laufenden Matches
    const isLive = match.isLive || false // Live Status kommt jetzt aus der Datenbank
    
    // Determine winner and styling based on scoring rules
    // Grand Final: First to 3 points wins, All other matches: First to 2 points wins
    const isGrandFinal = match.id === 'GF'
    const winningScore = isGrandFinal ? 3 : 2
    
    const team1IsWinner = match.isFinished && match.team1Score >= winningScore
    const team2IsWinner = match.isFinished && match.team2Score >= winningScore
    
    const team1Style = team1IsWinner ? "text-green-400 font-bold" : 
                      team2IsWinner ? "text-gray-400" : "text-white"
    const team2Style = team2IsWinner ? "text-green-400 font-bold" : 
                      team1IsWinner ? "text-gray-400" : "text-white"

    return (
      <div className={`bg-gray-700/90 border border-gray-600 rounded-lg p-4 w-full flex flex-col gap-3 ${
        match.isFinished ? 'border-green-500 bg-green-900/20' : isLive ? 'border-yellow-500 bg-yellow-900/20' : ''
      } ${className}`}>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-purple-200">
          <span>{match.roundLabel}</span>
          {isLive && <span className="text-yellow-300 font-semibold">LIVE</span>}
        </div>
        <div className="text-center text-sm font-semibold text-white">{match.label}</div>
        <div className="text-center text-sm font-medium w-full">
          {match.team1 && match.team2 ? (
            <div className="space-y-1">
              <div className="grid grid-cols-5 gap-1 items-center w-full max-w-xs mx-auto">
                <div className={`${team1Style} text-right`}>{team1Name}</div>
                <div className={`${team1Style} font-bold text-center`}>{match.team1Score}</div>
                <div className="text-white text-center font-medium">vs</div>
                <div className={`${team2Style} font-bold text-center`}>{match.team2Score}</div>
                <div className={`${team2Style} text-left`}>{team2Name}</div>
              </div>
            </div>
          ) : (
            <div className="text-white">{team1Name} vs {team2Name}</div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-image flex items-center justify-center">
        <div className="text-white text-xl">Lade Tournament Bracket...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-image">
      <div className="w-full px-4 py-8">
        
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50 mb-6">
          <h1 className="text-4xl font-bold text-white text-center mb-4">🏆 TOURNAMENT BRACKET</h1>
          
          <div className="text-center">
            <p className="text-purple-200 mb-2">
              {teams.length > 0 ? `${teams.length} Teams • Double Elimination Format` : 'Teams werden geladen...'}
            </p>
            <div className="text-sm text-purple-300 flex items-center justify-center gap-4">
              🔄 Live Updates alle 3 Sekunden
              <button 
                onClick={fetchData}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white text-xs font-medium transition-colors"
              >
                🔄 Jetzt Aktualisieren
              </button>
            </div>
          </div>
        </div>

        {/* Tournament Bracket */}
        <div className="space-y-10">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50">
            <h2 className="text-2xl font-bold text-white mb-6">Winner Bracket</h2>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {WINNER_ROUND_GROUPS.map(group => (
                <div key={group.title} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{group.title}</h3>
                    <p className="text-purple-200 text-sm">{group.description}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {group.matchIds.map(matchId => (
                      <MatchBox key={matchId} match={findMatchById(matchId)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Loser Bracket</h2>
              <span className="text-sm text-purple-200">Double elimination • Jede Niederlage zählt</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {LOSER_ROUND_GROUPS.map(group => (
                <div key={group.title} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{group.title}</h3>
                    <p className="text-purple-200 text-sm">{group.description}</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {group.matchIds.map(matchId => (
                      <MatchBox key={matchId} match={findMatchById(matchId)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Teams Overview */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white text-center mb-4">TEILNEHMENDE TEAMS</h2>
          <div className="grid md:grid-cols-4 gap-3">
            {teams.length > 0 ? teams.map((team, index) => (
              <div key={team.id} className="bg-purple-600/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
                <h3 className="text-white font-semibold text-center text-base">{team.name}</h3>
                <p className="text-purple-200 text-center text-xs">Position {team.position}</p>
              </div>
            )) : (
              // Fallback teams if no teams are loaded
              ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Echo', 'Team Foxtrot', 'Team Golf', 'Team Hotel', 'Team Indigo', 'Team Jade'].map((teamName, index) => (
                <div key={index} className="bg-purple-600/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
                  <h3 className="text-white font-semibold text-center text-base">{teamName}</h3>
                  <p className="text-purple-200 text-center text-xs">Position {index + 1}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <div className="flex justify-center space-x-8">
            <Link href="/" className="text-white/80 hover:text-white transition-colors font-medium">
              Home
            </Link>
            <Link href="/teams" className="text-white/80 hover:text-white transition-colors font-medium">
              Teams
            </Link>
            <Link href="/dashboard" className="text-white/80 hover:text-white transition-colors font-medium">
              Dashboard
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
