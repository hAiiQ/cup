'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  type BracketMatch,
  type BracketTeam,
  COMBINED_BRACKET_LAYOUT,
  COMBINED_BRACKET_CONNECTIONS
} from '@/lib/bracketStructure'
import BracketDiagram from '@/components/bracket/BracketDiagram'

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

  // Helper function to get team name or fallback
  const getTeamName = (team?: BracketTeam, fallback: string = 'TBD') => {
    return team?.name || fallback
  }

  // Read-only MatchBox component (simplified display)
  const MatchBox = ({ 
    match, 
    className = ""
  }: {
    match?: BracketMatch
    className?: string
  }) => {
    if (!match) {
      return (
        <div className={`bg-gray-800/80 border border-white/10 rounded-lg p-3 w-full h-full flex items-center justify-center text-gray-400 text-sm ${className}`}>
          Match folgt
        </div>
      )
    }

    const team1Name = getTeamName(match.team1, 'TBD')
    const team2Name = getTeamName(match.team2, 'TBD')
    const team1Score = match.team1Score ?? 0
    const team2Score = match.team2Score ?? 0

    return (
      <div className={`bg-gray-900/70 border border-white/10 rounded-lg px-3 py-4 w-full h-full flex items-center justify-center ${className}`}>
        <div className="flex items-center gap-3 text-white text-sm font-semibold w-full justify-center">
          <span className="flex-1 min-w-0 truncate text-right">{team1Name}</span>
          <span className="flex-none w-16 text-center text-purple-200 whitespace-nowrap">{team1Score} - {team2Score}</span>
          <span className="flex-1 min-w-0 truncate text-left">{team2Name}</span>
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
      <div className="w-full px-4 py-6 max-w-[1800px] mx-auto">
        
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-5 border border-purple-500/50 mb-5">
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

        {/* Combined Tournament Bracket */}
        <section className="bg-black/20 backdrop-blur-sm rounded-xl p-5 border border-purple-500/50">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end mb-6">
            <span className="text-sm text-purple-200">Alle Matches Best-of-3 • Grand Final Best-of-5</span>
          </div>
          <div className="overflow-x-auto pb-2">
            <BracketDiagram
              matches={bracket}
              layout={COMBINED_BRACKET_LAYOUT}
              connections={COMBINED_BRACKET_CONNECTIONS}
              renderMatch={(match) => <MatchBox match={match} className="h-full" />}
              className="mx-auto"
            />
          </div>
        </section>

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
