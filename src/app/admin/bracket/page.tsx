'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  name: string
  position: number
}

interface Match {
  id: string
  round: number
  matchNumber: number
  bracket: string
  team1?: Team
  team2?: Team
  team1Score: number
  team2Score: number
  winner?: Team
  isFinished: boolean
  isLive?: boolean
}

export default function AdminBracketPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [bracket, setBracket] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [scoreInput, setScoreInput] = useState({ team1: 0, team2: 0 })
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const router = useRouter()

  // Admin Authentication Check
  useEffect(() => {
    checkAdminAuth()
  }, [])

  const checkAdminAuth = async () => {
    try {
      console.log('🔍 Admin auth check starting...')
      const response = await fetch('/api/admin/auth/check', {
        credentials: 'include'
      })
      
      console.log('🔍 Auth response status:', response.status)
      
      if (response.ok) {
        console.log('✅ Admin authenticated successfully')
        setIsAuthenticated(true)
        // Add a small delay to ensure state is set before calling fetchData
        setTimeout(() => {
          console.log('🚀 Calling fetchData after auth success')
          fetchData()
        }, 100)
      } else {
        console.log('❌ Admin not authenticated, redirecting to login with redirect parameter')
        setLoading(false)  // WICHTIG: Loading beenden auch bei Auth-Fehler
        setIsAuthenticated(false)  // Explizit auf false setzen
        // Force immediate redirect
        window.location.href = '/admin?redirect=' + encodeURIComponent('/admin/bracket')
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error)
      setLoading(false)  // WICHTIG: Loading beenden auch bei Auth-Fehler  
      setIsAuthenticated(false)  // Explizit auf false setzen
      // Force immediate redirect
      window.location.href = '/admin?redirect=' + encodeURIComponent('/admin/bracket')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const fetchData = async () => {
    // Remove the authentication check - this is already verified before calling
    console.log('🔄 Admin fetchData started')
    setLoading(true)  // WICHTIG: Loading state setzen
    
    // ALWAYS generate fallback bracket with teams to ensure teams are always visible
    const fallbackBracket = generateFullBracket([])
    setBracket(fallbackBracket)
    console.log('✅ Admin Fallback Bracket set with teams always visible:', fallbackBracket.length, 'matches')
    
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        fetch('/api/admin/teams'),
        fetch('/api/bracket/matches')  // Use the SAME API as public bracket
      ])
      
      let teamsData = { teams: [] }
      if (teamsRes.ok) {
        teamsData = await teamsRes.json()
        const sortedTeams = teamsData.teams.sort((a: Team, b: Team) => a.position - b.position)
        setTeams(sortedTeams)
        console.log('✅ Admin teams loaded:', sortedTeams.length)
      }

      // Update bracket with API data if available, but keep fallback teams
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json()
        console.log('✅ Admin using bracket API matches:', matchesData.matches?.length || 0)
        
        if (matchesData.matches && matchesData.matches.length > 0) {
          // Merge API matches with fallback bracket to preserve team names
          const mergedBracket = fallbackBracket.map(fallbackMatch => {
            const apiMatch = matchesData.matches.find((m: any) => m.id === fallbackMatch.id)
            return apiMatch ? { ...fallbackMatch, ...apiMatch } : fallbackMatch
          })
          setBracket(mergedBracket)
          console.log('🎯 Admin Bracket updated with API data while preserving teams:', mergedBracket.length, 'matches')
        }
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
      // Fallback is already set above
      console.log('🔥 Admin using fallback bracket due to error')
    } finally {
      console.log('🏁 Admin fetchData finished - setting loading to false')
      setLoading(false)
    }
  }
  }

  const generateFullBracket = (teams: Team[]): Match[] => {
    const matches: Match[] = []
    
    // Use fixed team names like the public page
    const sampleTeams = [
      { id: 'alpha', name: 'Team Alpha', position: 1 },
      { id: 'beta', name: 'Team Beta', position: 2 },
      { id: 'gamma', name: 'Team Gamma', position: 3 },
      { id: 'delta', name: 'Team Delta', position: 4 },
      { id: 'echo', name: 'Team Echo', position: 5 },
      { id: 'foxtrot', name: 'Team Foxtrot', position: 6 },
      { id: 'golf', name: 'Team Golf', position: 7 },
      { id: 'hotel', name: 'Team Hotel', position: 8 }
    ]

    // Use actual teams if available, otherwise use sample teams
    const paddedTeams = teams.length >= 8 ? teams.slice(0, 8) : sampleTeams

    // WINNER BRACKET
    // Winner Bracket Round 1 (Quarter Finals) - 4 Matches
    const quarterFinals = [
      { team1: paddedTeams[0], team2: paddedTeams[1] }, // Alpha vs Beta
      { team1: paddedTeams[2], team2: paddedTeams[3] }, // Gamma vs Delta  
      { team1: paddedTeams[4], team2: paddedTeams[5] }, // Echo vs Foxtrot
      { team1: paddedTeams[6], team2: paddedTeams[7] }, // Golf vs Hotel
    ]

    quarterFinals.forEach((match, index) => {
      matches.push({
        id: `WB-Q${index + 1}`,
        round: 1,
        matchNumber: index + 1,
        team1: match.team1,
        team2: match.team2,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        bracket: 'winner'
      })
    })

    // Winner Bracket Semi Finals (Round 2) - 2 Matches
    for (let i = 0; i < 2; i++) {
      matches.push({
        id: `WB-S${i + 1}`,
        round: 2,
        matchNumber: i + 1,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        bracket: 'winner'
      })
    }

    // Winner Bracket Final (Round 3) - 1 Match
    matches.push({
      id: 'WB-F',
      round: 3,
      matchNumber: 1,
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      bracket: 'winner'
    })

    // LOSER BRACKET
    // Loser Bracket Round 1 - 2 Matches
    for (let i = 0; i < 2; i++) {
      matches.push({
        id: `LB-1-${i + 1}`,
        round: 1,
        matchNumber: i + 1,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        bracket: 'loser'
      })
    }

    // Loser Bracket Round 2 - 2 Matches
    for (let i = 0; i < 2; i++) {
      matches.push({
        id: `LB-2-${i + 1}`,
        round: 2,
        matchNumber: i + 1,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        bracket: 'loser'
      })
    }

    // Loser Bracket Round 3 - 1 Match
    matches.push({
      id: 'LB-3',
      round: 3,
      matchNumber: 1,
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      bracket: 'loser'
    })

    // Loser Bracket Final - 1 Match
    matches.push({
      id: 'LB-F',
      round: 4,
      matchNumber: 1,
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      bracket: 'loser'
    })

    // GRAND FINAL - 1 Match
    matches.push({
      id: 'GF',
      round: 4,
      matchNumber: 1,
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      bracket: 'grand'
    })

    return matches
  }

  const generateBracket = (teams: Team[]) => {
    const matches: Match[] = []
    
    // Use fixed team names like the public page
    const sampleTeams = [
      { id: 'alpha', name: 'Team Alpha', position: 1 },
      { id: 'beta', name: 'Team Beta', position: 2 },
      { id: 'gamma', name: 'Team Gamma', position: 3 },
      { id: 'delta', name: 'Team Delta', position: 4 },
      { id: 'echo', name: 'Team Echo', position: 5 },
      { id: 'foxtrot', name: 'Team Foxtrot', position: 6 },
      { id: 'golf', name: 'Team Golf', position: 7 },
      { id: 'hotel', name: 'Team Hotel', position: 8 }
    ]

    // Use actual teams if available, otherwise use sample teams
    const paddedTeams = teams.length >= 8 ? teams.slice(0, 8) : sampleTeams

    // WINNER BRACKET
    // Winner Bracket Round 1 (Quarter Finals) - 4 Matches
    const quarterFinals = [
      { team1: paddedTeams[0], team2: paddedTeams[1] }, // Alpha vs Beta
      { team1: paddedTeams[2], team2: paddedTeams[3] }, // Gamma vs Delta  
      { team1: paddedTeams[4], team2: paddedTeams[5] }, // Echo vs Foxtrot
      { team1: paddedTeams[6], team2: paddedTeams[7] }, // Golf vs Hotel
    ]

    quarterFinals.forEach((match, index) => {
      matches.push({
        id: `WB-Q${index + 1}`,
        round: 1,
        matchNumber: index + 1,
        team1: match.team1,
        team2: match.team2,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        bracket: 'winner'
      })
    })

    // Winner Bracket Semi Finals (Round 2) - 2 Matches
    for (let i = 0; i < 2; i++) {
      matches.push({
        id: `WB-S${i + 1}`,
        round: 2,
        matchNumber: i + 1,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        bracket: 'winner'
      })
    }

    // Winner Bracket Final (Round 3) - 1 Match
    matches.push({
      id: 'WB-F',
      round: 3,
      matchNumber: 1,
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      bracket: 'winner'
    })

    // LOSER BRACKET
    // Loser Bracket Round 1 - 2 Matches (losers from WB QF 1&2 vs losers from WB QF 3&4)
    for (let i = 0; i < 2; i++) {
      matches.push({
        id: `LB-1-${i + 1}`,
        round: 1,
        matchNumber: i + 1,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        bracket: 'loser'
      })
    }

    // Loser Bracket Round 2 - 2 Matches (winners from LB R1 vs losers from WB SF)
    for (let i = 0; i < 2; i++) {
      matches.push({
        id: `LB-2-${i + 1}`,
        round: 2,
        matchNumber: i + 1,
        team1Score: 0,
        team2Score: 0,
        isFinished: false,
        bracket: 'loser'
      })
    }

    // Loser Bracket Round 3 - 1 Match (LB R2 winners)
    matches.push({
      id: 'LB-3',
      round: 3,
      matchNumber: 1,
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      bracket: 'loser'
    })

    // Loser Bracket Final - 1 Match (LB R3 winner vs loser from WB Final)
    matches.push({
      id: 'LB-F',
      round: 4,
      matchNumber: 1,
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      bracket: 'loser'
    })

    // GRAND FINAL - 1 Match (WB Final winner vs LB Final winner)
    matches.push({
      id: 'GF',
      round: 4,
      matchNumber: 1,
      team1Score: 0,
      team2Score: 0,
      isFinished: false,
      bracket: 'grand'
    })

    setBracket(matches)
  }

  const updateMatchScore = async (matchId: string, team1Score: number, team2Score: number) => {
    try {
      // Update match score via API
      const updateResponse = await fetch('/api/admin/bracket/matches/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId,
          team1Score,
          team2Score
        }),
      })

      if (updateResponse.ok) {
        const result = await updateResponse.json()
        
        // Show success message
        alert(`✅ ${result.message || 'Match-Score gespeichert!'}`)
        
        // Close modal
        setSelectedMatch(null)
        
        // FIXED: Update local state instead of fetchData() to prevent matches disappearing
        setBracket(prevBracket => 
          prevBracket.map(m => 
            m.id === matchId 
              ? { ...m, team1Score, team2Score, isFinished: (team1Score > 0 || team2Score > 0) }
              : m
          )
        )
        console.log(`🔄 Admin: Updated local match ${matchId} scores: ${team1Score}-${team2Score}`)
        
        // Success - modal closed with visible feedback
      } else {
        alert('Fehler beim Speichern des Ergebnisses')
      }
    } catch (error) {
      console.error('Error updating match:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const resetTournament = async () => {
    if (!confirm('Möchtest du wirklich das gesamte Tournament zurücksetzen? Alle Ergebnisse gehen verloren!')) {
      return
    }

    try {
      // Delete all matches from database
      const response = await fetch('/api/admin/bracket/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Reset local state
        const freshBracket = generateFullBracket(teams)
        setBracket(freshBracket)
        alert('Tournament erfolgreich zurückgesetzt!')
      } else {
        alert('Fehler beim Zurücksetzen des Tournaments')
      }
    } catch (error) {
      console.error('Error resetting tournament:', error)
      alert('Ein Fehler ist aufgetreten')
    }
  }

  const updateNextRound = (bracket: Match[], completedMatch: Match) => {
    if (completedMatch.bracket === 'winner') {
      // Winner Bracket progression
      if (completedMatch.round === 1) {
        // WB Quarter Final to WB Semi Final
        const qfNumber = completedMatch.matchNumber
        const sfIndex = Math.ceil(qfNumber / 2) - 1
        const sfMatch = bracket.find(m => m.bracket === 'winner' && m.round === 2 && m.matchNumber === sfIndex + 1)
        
        if (sfMatch) {
          if (qfNumber % 2 === 1) {
            sfMatch.team1 = completedMatch.winner
          } else {
            sfMatch.team2 = completedMatch.winner
          }
        }

        // Send loser to Loser Bracket
        const loser = completedMatch.team1Score > completedMatch.team2Score ? completedMatch.team2 : completedMatch.team1
        const lbR1Index = Math.ceil(qfNumber / 2) - 1
        const lbR1Match = bracket.find(m => m.bracket === 'loser' && m.round === 1 && m.matchNumber === lbR1Index + 1)
        
        if (lbR1Match && loser) {
          if (qfNumber <= 2) {
            lbR1Match.team1 = loser
          } else {
            lbR1Match.team2 = loser
          }
        }

      } else if (completedMatch.round === 2) {
        // WB Semi Final to WB Final
        const finalMatch = bracket.find(m => m.bracket === 'winner' && m.round === 3)
        if (finalMatch) {
          if (completedMatch.matchNumber === 1) {
            finalMatch.team1 = completedMatch.winner
          } else {
            finalMatch.team2 = completedMatch.winner
          }
        }

        // Send loser to Loser Bracket Round 2
        const loser = completedMatch.team1Score > completedMatch.team2Score ? completedMatch.team2 : completedMatch.team1
        const lbR2Match = bracket.find(m => m.bracket === 'loser' && m.round === 2 && m.matchNumber === completedMatch.matchNumber)
        
        if (lbR2Match && loser) {
          lbR2Match.team2 = loser
        }

      } else if (completedMatch.round === 3) {
        // WB Final to Grand Final
        const grandFinal = bracket.find(m => m.bracket === 'grand')
        if (grandFinal) {
          grandFinal.team1 = completedMatch.winner
        }

        // Send loser to Loser Bracket Final
        const loser = completedMatch.team1Score > completedMatch.team2Score ? completedMatch.team2 : completedMatch.team1
        const lbFinal = bracket.find(m => m.bracket === 'loser' && m.round === 4)
        
        if (lbFinal && loser) {
          lbFinal.team2 = loser
        }
      }

    } else if (completedMatch.bracket === 'loser') {
      // Loser Bracket progression
      if (completedMatch.round === 1) {
        // LB Round 1 to LB Round 2
        const lbR2Match = bracket.find(m => m.bracket === 'loser' && m.round === 2 && m.matchNumber === completedMatch.matchNumber)
        if (lbR2Match) {
          lbR2Match.team1 = completedMatch.winner
        }

      } else if (completedMatch.round === 2) {
        // LB Round 2 to LB Round 3
        const lbR3Match = bracket.find(m => m.bracket === 'loser' && m.round === 3)
        if (lbR3Match) {
          if (completedMatch.matchNumber === 1) {
            lbR3Match.team1 = completedMatch.winner
          } else {
            lbR3Match.team2 = completedMatch.winner
          }
        }

      } else if (completedMatch.round === 3) {
        // LB Round 3 to LB Final
        const lbFinal = bracket.find(m => m.bracket === 'loser' && m.round === 4)
        if (lbFinal) {
          lbFinal.team1 = completedMatch.winner
        }

      } else if (completedMatch.round === 4) {
        // LB Final to Grand Final
        const grandFinal = bracket.find(m => m.bracket === 'grand')
        if (grandFinal) {
          grandFinal.team2 = completedMatch.winner
        }
      }

    } else if (completedMatch.bracket === 'grand') {
      // Grand Final completed - tournament over
      console.log('Tournament completed! Winner:', completedMatch.winner?.name)
    }
  }

  const getMatchesByBracketAndRound = (bracketType: string, round: number) => {
    const filtered = bracket.filter(match => match.bracket === bracketType && match.round === round)
    console.log(`🔍 Admin Bracket Filter: ${bracketType} round ${round} → ${filtered.length} matches`, filtered.map(m => m.id))
    return filtered
  }

  const getWinnerMatches = () => {
    return bracket.filter(match => match.bracket === 'winner')
  }

  const getLoserMatches = () => {
    return bracket.filter(match => match.bracket === 'loser')
  }

  const getGrandFinal = () => {
    return bracket.find(match => match.bracket === 'grand')
  }

  const openScoreModal = (match: Match) => {
    setSelectedMatch(match)
    setScoreInput({ team1: match.team1Score, team2: match.team2Score })
  }

  const MatchBox = ({ match, className = "", onClick }: {
    match?: Match
    className?: string
    onClick?: (match: Match) => void
  }) => {
    const displayTeam1 = match?.team1?.name || 'TBD'
    const displayTeam2 = match?.team2?.name || 'TBD'
    const hasScore = match && (match.team1Score > 0 || match.team2Score > 0)
    const team1Score = match?.team1Score || 0
    const team2Score = match?.team2Score || 0
    const isLive = match?.isLive || false
    
    // Determine winner and styling
    const team1IsWinner = hasScore && team1Score > team2Score
    const team2IsWinner = hasScore && team2Score > team1Score
    
    const team1Style = team1IsWinner ? "text-green-400 font-bold" : 
                      team2IsWinner ? "text-gray-500" : "text-white"
    const team2Style = team2IsWinner ? "text-green-400 font-bold" : 
                      team1IsWinner ? "text-gray-500" : "text-white"

    const handleMatchClick = () => {
      if (match && onClick) {
        onClick(match)
      }
    }

    const toggleLiveStatus = async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!match) return
      
      try {
        const response = await fetch('/api/admin/bracket/matches/live', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            matchId: match.id,
            isLive: !isLive
          }),
        })

        if (response.ok) {
          const result = await response.json()
          
          // Show success message
          alert(`✅ ${result.message || (isLive ? 'Match gestoppt' : 'Match gestartet')}`)
          
          // FIXED: Update local state instead of fetchData() to prevent matches disappearing
          setBracket(prevBracket => 
            prevBracket.map(m => 
              m.id === match.id 
                ? { ...m, isLive: !isLive }
                : m
            )
          )
          console.log(`🔄 Admin: Updated local match ${match.id} isLive to ${!isLive}`)
        } else {
          alert('Fehler beim Ändern des Live-Status')
        }
      } catch (error) {
        console.error('Error toggling live status:', error)
        alert('Fehler beim Ändern des Live-Status')
      }
    }

    return (
      <div className={`bg-gray-700/90 border border-gray-600 rounded-lg p-3 w-full min-h-[80px] flex flex-col justify-center cursor-pointer hover:border-purple-500 transition-colors ${isLive ? 'border-red-500 bg-red-900/20' : ''} ${className}`}>
        {/* Live indicator and controls */}
        {match && (
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2">
              {isLive && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-400 text-xs font-bold">LIVE</span>
                </div>
              )}
            </div>
            <button
              onClick={toggleLiveStatus}
              className={`px-2 py-1 text-xs rounded ${
                isLive 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isLive ? 'STOP' : 'START'}
            </button>
          </div>
        )}
        
        {/* Match content */}
        <div 
          className="text-center text-sm font-medium flex-1 flex items-center justify-center cursor-pointer hover:bg-gray-600/50 transition-colors p-2 rounded"
          onClick={handleMatchClick}
        >
          {hasScore ? (
            <div className="flex items-center justify-center space-x-2">
              <span className={`${team1Style}`}>{team1Score}</span>
              <span className={team1Style}>{displayTeam1}</span>
              <span className="text-white">VS</span>
              <span className={team2Style}>{displayTeam2}</span>
              <span className={`${team2Style}`}>{team2Score}</span>
            </div>
          ) : (
            <div className="text-white">{displayTeam1} VS {displayTeam2}</div>
          )}
        </div>
      </div>
    )
  }

  const TeamBox = ({ team, className = "" }: {
    team: string
    className?: string
  }) => (
    <div className={`bg-gray-700/90 border border-gray-600 rounded-lg p-3 w-full h-14 flex items-center justify-center ${className}`}>
      <div className="text-center text-white text-sm font-medium">
        {team}
      </div>
    </div>
  )

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Überprüfe Admin-Berechtigung...</p>
        </div>
      </div>
    )
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAuthenticated) {
    console.log('🔍 Admin not authenticated, forcing redirect immediately')
    // Force immediate redirect without waiting
    if (typeof window !== 'undefined') {
      window.location.href = '/admin?redirect=' + encodeURIComponent('/admin/bracket')
    }
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Weiterleitung zum Admin-Login...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Lade Tournament Bracket...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-image">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex justify-between items-center">
            <div className="text-2xl font-bold text-purple-400">
              🏆 MARVEL RIVALS TOURNAMENT BRACKET (ADMIN)
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-gray-300 text-sm">
                {teams.length} Teams registriert
              </div>
              <div className="text-green-400 text-sm font-semibold">
                ✓ Auto-Update aktiv
              </div>
              <button
                onClick={resetTournament}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                🔄 Tournament zurücksetzen
              </button>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Zurück zum Dashboard
              </button>
            </div>
          </nav>
        </div>
      </header>

      <div className="w-full px-4 py-8">
        {/* Tournament Bracket - Grouped Layout */}
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
            
            {/* Starter Bracket Container */}
            <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '21px', top: '135px', zIndex: 2, width: '320px'}}>
              <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                RUNDE 1 - STARTER BRACKET
              </div>
              <div className="space-y-2">
                {getMatchesByBracketAndRound('winner', 1).map((match, index) => {
                  const teamPairs = [
                    ['Team Alpha', 'Team Beta'],
                    ['Team Gamma', 'Team Delta'],
                    ['Team Echo', 'Team Foxtrot'],
                    ['Team Golf', 'Team Hotel']
                  ]
                  const [team1Name, team2Name] = teamPairs[index] || ['TBD', 'TBD']
                  
                  // Create a complete match object with team names
                  const enhancedMatch = {
                    ...match,
                    team1: match.team1 || { id: `temp-team1-${match.id}`, name: team1Name, position: 1 },
                    team2: match.team2 || { id: `temp-team2-${match.id}`, name: team2Name, position: 2 }
                  }
                  
                  return (
                    <MatchBox
                      key={match.id}
                      match={enhancedMatch}
                      className="w-full h-auto"
                      onClick={(m) => openScoreModal(m)}
                    />
                  )
                })}
              </div>
            </div>

            {/* Upper Bracket Round 2 Container */}
            <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '387px', top: '55px', zIndex: 2, width: '320px'}}>
              <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                RUNDE 2 - UPPER BRACKET
              </div>
              <div className="space-y-3">
                {getMatchesByBracketAndRound('winner', 2).map((match, index) => (
                  <MatchBox 
                    key={match.id} 
                    match={match} 
                    onClick={(m) => openScoreModal(m)}
                  />
                ))}
              </div>
            </div>

            {/* Upper Bracket Finals Container */}
            <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '1117px', top: '93px', zIndex: 2, width: '320px'}}>
              <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                RUNDE 5 - UPPER BRACKET
              </div>
              <div>
                {getMatchesByBracketAndRound('winner', 3).map(match => (
                  <MatchBox 
                    key={match.id} 
                    match={match} 
                    onClick={(m) => openScoreModal(m)}
                  />
                ))}
              </div>
            </div>

            {/* Lower Bracket Round 1 Container */}
            <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '387px', top: '323px', zIndex: 2, width: '320px'}}>
              <div className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                RUNDE 3 - LOWER BRACKET
              </div>
              <div className="space-y-3">
                {getMatchesByBracketAndRound('loser', 1).map(match => (
                  <MatchBox 
                    key={match.id} 
                    match={match} 
                    onClick={(m) => openScoreModal(m)}
                  />
                ))}
              </div>
            </div>

            {/* Lower Bracket Round 2 Container */}
            <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '752px', top: '323px', zIndex: 2, width: '320px'}}>
              <div className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                RUNDE 4 - LOWER BRACKET
              </div>
              <div className="space-y-3">
                {getMatchesByBracketAndRound('loser', 2).map(match => (
                  <MatchBox 
                    key={match.id} 
                    match={match} 
                    onClick={(m) => openScoreModal(m)}
                  />
                ))}
              </div>
            </div>

            {/* Lower Bracket Round 3 Container */}
            <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '1117px', top: '361px', zIndex: 2, width: '320px'}}>
              <div className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                RUNDE 6 - LOWER BRACKET
              </div>
              <div>
                {getMatchesByBracketAndRound('loser', 3).map(match => (
                  <MatchBox 
                    key={match.id} 
                    match={match} 
                    onClick={(m) => openScoreModal(m)}
                  />
                ))}
              </div>
            </div>

            {/* Lower Bracket Finals Container */}
            <div className="absolute bg-black/30 rounded-lg border border-purple-500/30 p-4" style={{left: '1482px', top: '361px', zIndex: 2, width: '320px'}}>
              <div className="bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3">
                RUNDE 7 - LOWER BRACKET FINALS
              </div>
              <div>
                {getMatchesByBracketAndRound('loser', 4).map(match => (
                  <MatchBox 
                    key={match.id} 
                    match={match} 
                    onClick={(m) => openScoreModal(m)}
                  />
                ))}
              </div>
            </div>

            {/* Grand Finals Container */}
            <div className="absolute bg-black/30 rounded-lg border border-yellow-500/50 p-4" style={{left: '1482px', top: '93px', zIndex: 2, width: '320px'}}>
              <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-center w-full text-sm mb-3 flex items-center justify-center">
                RUNDE 8 - 🏆 GRAND FINALS
              </div>
              <div>
                {getGrandFinal() && (
                  <MatchBox 
                    match={getGrandFinal()!} 
                    onClick={(m) => openScoreModal(m)}
                  />
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Teams Overview */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-white text-center mb-4">TEILNEHMENDE TEAMS</h2>
          <div className="grid md:grid-cols-4 gap-3">
            {teams.length >= 8 ? teams.slice(0, 8).map((team, index) => (
              <div key={team.id} className="bg-purple-600/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
                <h3 className="text-white font-semibold text-center text-base">{team.name}</h3>
                <p className="text-purple-200 text-center text-xs">Position {team.position}</p>
              </div>
            )) : [
              'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta',
              'Team Echo', 'Team Foxtrot', 'Team Golf', 'Team Hotel'
            ].map((teamName, index) => (
              <div key={index} className="bg-purple-600/20 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
                <h3 className="text-white font-semibold text-center text-base">{teamName}</h3>
                <p className="text-purple-200 text-center text-xs">Position {index + 1}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score Input Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-600">
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              {selectedMatch.bracket === 'winner' ? 'Winner Bracket' : selectedMatch.bracket === 'loser' ? 'Loser Bracket' : 'Grand Final'} - Round {selectedMatch.round} #{selectedMatch.matchNumber}
            </h3>
            
            {selectedMatch.team1 && selectedMatch.team2 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-gray-300 font-semibold">
                    {selectedMatch.team1.name}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={scoreInput.team1}
                    onChange={(e) => setScoreInput(prev => ({ ...prev, team1: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-gray-300 font-semibold">
                    {selectedMatch.team2.name}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={scoreInput.team2}
                    onChange={(e) => setScoreInput(prev => ({ ...prev, team2: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="text-center text-gray-400 text-sm">
                  Best of 3 - Erstes Team auf 2 Punkte gewinnt
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => updateMatchScore(selectedMatch.id, scoreInput.team1, scoreInput.team2)}
                    className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors font-semibold"
                  >
                    💾 Speichern
                  </button>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 transition-colors"
                  >
                    ❌ Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p>Teams noch nicht verfügbar</p>
                <p className="text-sm mt-2">Vorherige Matches müssen erst abgeschlossen werden</p>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="mt-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  Schließen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
