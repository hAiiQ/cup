'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Team {
  id: string
  name: string
  position: number
}

interface Match {
  id: string
  round: number
  bracket: string
  team1?: Team
  team2?: Team
  team1Score: number
  team2Score: number
  winner?: Team
  isFinished: boolean
  isLive?: boolean
}

export default function BracketPage() {
  const [bracket, setBracket] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    
    // Auto-refresh alle 3 Sekunden für Live-Updates
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        fetch('/api/bracket/teams'),
        fetch('/api/bracket/matches')
      ])
      
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        const sortedTeams = teamsData.teams.sort((a: Team, b: Team) => a.position - b.position)
        setTeams(sortedTeams)
      }

      if (matchesRes.ok) {
        const matchesData = await matchesRes.json()
        console.log('Database matches:', matchesData.matches)
        setBracket(matchesData.matches || [])
      } else {
        setBracket([])
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
      setBracket([])
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
  const getTeamName = (team?: Team, fallback: string = 'TBD') => {
    return team?.name || fallback
  }

  // Read-only MatchBox component (same as admin but without onClick)
  const MatchBox = ({ 
    match, 
    className = ""
  }: {
    match?: Match
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
    
    // Determine winner and styling
    const team1IsWinner = match.isFinished && match.team1Score > match.team2Score
    const team2IsWinner = match.isFinished && match.team2Score > match.team1Score
    
    const team1Style = team1IsWinner ? "text-green-400 font-bold" : 
                      team2IsWinner ? "text-gray-400" : "text-white"
    const team2Style = team2IsWinner ? "text-green-400 font-bold" : 
                      team1IsWinner ? "text-gray-400" : "text-white"

    return (
      <div className={`bg-gray-700/90 border border-gray-600 rounded-lg p-3 w-full min-h-[60px] flex items-center justify-center ${
        match.isFinished ? 'border-green-500 bg-green-900/20' : isLive ? 'border-yellow-500 bg-yellow-900/20' : ''
      } ${className}`}>
        <div className="text-center text-sm font-medium w-full">
          {match.team1 && match.team2 ? (
            <div className="space-y-1">
              {/* Horizontal Score Display - Echte Zentrierung mit festen Spalten */}
              <div className="grid grid-cols-5 gap-1 items-center w-full max-w-xs mx-auto">
                <div className={`${team1Style} text-right`}>{team1Name}</div>
                <div className={`${team1Style} font-bold text-center`}>{match.team1Score}</div>
                <div className="text-white text-center font-medium">vs</div>
                <div className={`${team2Style} font-bold text-center`}>{match.team2Score}</div>
                <div className={`${team2Style} text-left`}>{team2Name}</div>
              </div>
              {/* Live Indicator */}
              {isLive && (
                <div className="text-yellow-400 text-xs">🔴 LIVE</div>
              )}
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

          {bracket.length === 0 && (
            <div className="mt-4 text-center text-yellow-300">
              ⚠️ Das Turnier wurde noch nicht gestartet. Bitte warte auf den Admin.
            </div>
          )}
        </div>

        {/* Tournament Bracket - Same layout as admin but read-only */}
        {bracket.length > 0 && (
          <div className="relative bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/50 w-full">
            
            {/* Lines Background Image - Absolute positioned overlay */}
            <div className="absolute" style={{top: '175px', left: '365px', zIndex: 1}}>
              <img 
                src="/lines.png" 
                alt="Bracket Lines" 
                className="select-none pointer-events-none"
                style={{
                  userSelect: 'none', 
                  WebkitUserSelect: 'none', 
                  MozUserSelect: 'none', 
                  msUserSelect: 'none',
                  width: 'auto',
                  height: 'auto',
                  maxWidth: 'none',
                  maxHeight: 'none'
                }}
                draggable={false}
              />
            </div>
            
            <div className="w-full relative" style={{height: '600px'}}>
              
              {/* Quarter Finals */}
              <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '21px', top: '135px', zIndex: 2, width: '320px'}}>
                <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                  RUNDE 1 - QUARTER FINALS
                </div>
                <div className="space-y-2">
                  <MatchBox match={findMatchById('wb-qf-1')} />
                  <MatchBox match={findMatchById('wb-qf-2')} />
                  <MatchBox match={findMatchById('wb-qf-3')} />
                  <MatchBox match={findMatchById('wb-qf-4')} />
                </div>
              </div>

              {/* Semi Finals */}
              <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '387px', top: '55px', zIndex: 2, width: '320px'}}>
                <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                  RUNDE 2 - SEMI FINALS
                </div>
                <div className="space-y-3">
                  <MatchBox match={findMatchById('wb-sf-1')} />
                  <MatchBox match={findMatchById('wb-sf-2')} />
                </div>
              </div>

              {/* Winner Bracket Final */}
              <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '1117px', top: '91px', zIndex: 2, width: '320px'}}>
                <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                  WINNER BRACKET FINAL
                </div>
                <div>
                  <MatchBox match={findMatchById('wb-final')} />
                </div>
              </div>

              {/* Loser Bracket Round 1 */}
              <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '387px', top: '323px', zIndex: 2, width: '320px'}}>
                <div className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                  LOSER BRACKET R1
                </div>
                <div className="space-y-3">
                  <MatchBox match={findMatchById('lb-r1-1')} />
                  <MatchBox match={findMatchById('lb-r1-2')} />
                </div>
              </div>

              {/* Loser Bracket Round 2 */}
              <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '752px', top: '323px', zIndex: 2, width: '320px'}}>
                <div className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                  LOSER BRACKET R2
                </div>
                <div className="space-y-3">
                  <MatchBox match={findMatchById('lb-r2-1')} />
                  <MatchBox match={findMatchById('lb-r2-2')} />
                </div>
              </div>

              {/* Loser Bracket Round 3 */}
              <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '1117px', top: '359px', zIndex: 2, width: '320px'}}>
                <div className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                  LOSER BRACKET R3
                </div>
                <div>
                  <MatchBox match={findMatchById('lb-r3')} />
                </div>
              </div>

              {/* Loser Bracket Final */}
              <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '1482px', top: '359px', zIndex: 2, width: '320px'}}>
                <div className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                  LOSER BRACKET FINAL
                </div>
                <div>
                  <MatchBox match={findMatchById('lb-final')} />
                </div>
              </div>

              {/* Grand Final */}
              <div className="absolute bg-black/30 rounded-lg border border-yellow-500/50 p-4" style={{left: '1482px', top: '91px', zIndex: 2, width: '320px'}}>
                <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3 flex items-center justify-center">
                  🏆 GRAND FINAL
                </div>
                <div>
                  <MatchBox match={findMatchById('grand-final')} />
                </div>
              </div>

            </div>
          </div>
        )}

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
              ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Echo', 'Team Foxtrot', 'Team Golf', 'Team Hotel'].map((teamName, index) => (
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
