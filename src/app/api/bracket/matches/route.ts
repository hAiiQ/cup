import { NextResponse } from 'next/server'
import { getAllMatchStates } from '@/lib/matchState'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🔄 Fetching matches for bracket with persistent live states...')
    
    // Try to get persistent match states from database
    let dbMatches: any[] = []
    let dbError = null
    
    try {
      dbMatches = await prisma.match.findMany({
        select: {
          id: true,
          isLive: true,
          team1Score: true,
          team2Score: true,
          isFinished: true,
          winnerId: true,
          updatedAt: true
        }
      })
      console.log(`✅ Database connected: ${dbMatches.length} persistent matches found`)
    } catch (error) {
      dbError = error
      console.log('⚠️ Database not available, falling back to in-memory states')
      console.log('Database error:', error instanceof Error ? error.message : String(error))
    }
    
    // Get in-memory states (always available as fallback)
    const memoryStates = getAllMatchStates()
    console.log(`📊 In-memory states: ${memoryStates.size} matches`)
    
    // Create combined match states map
    const combinedStates = new Map()
    
    // Add database states first (higher priority) if available
    if (dbMatches.length > 0) {
      for (const dbMatch of dbMatches) {
        combinedStates.set(dbMatch.id, {
          isLive: dbMatch.isLive,
          team1Score: dbMatch.team1Score || 0,
          team2Score: dbMatch.team2Score || 0,
          isFinished: dbMatch.isFinished || false,
          winnerId: dbMatch.winnerId,
          source: 'database'
        })
      }
    }
    
    // Add in-memory states for matches not in database
    Array.from(memoryStates.entries()).forEach(([matchId, memoryState]) => {
      if (!combinedStates.has(matchId)) {
        combinedStates.set(matchId, {
          ...memoryState,
          source: 'memory'
        })
      }
    })
    
    console.log(`📊 Combined states: ${combinedStates.size} total matches (${dbMatches.length} from DB, ${memoryStates.size} from memory)`)
    
    // Get teams for bracket display - DIRECT PRISMA CALL
    let teams: any[] = []
    try {
      console.log('🔍 Fetching teams directly from database...')
      
      // Import prisma here to avoid circular dependency
      const { prisma } = await import('@/lib/prisma')
      
      const teamsFromDB = await prisma.team.findMany({
        orderBy: { position: 'asc' }
      })
      
      teams = teamsFromDB.map((team: any) => ({
        id: team.id,
        name: team.name,
        position: team.position
      }))
      
      console.log(`📋 Loaded ${teams.length} teams directly from database:`, teams.map((t: any) => t.name))
      
    } catch (error) {
      console.log('💡 Database fetch error, using fallback teams:', error)
    }

    // Use sample teams if none available BUT KEEP REAL TEAM NAMES
    if (teams.length === 0) {
      teams = [
        { id: 'alpha', name: 'Team Alpha', position: 1 },
        { id: 'beta', name: 'Team Beta', position: 2 },
        { id: 'gamma', name: 'Team Gamma', position: 3 },
        { id: 'delta', name: 'Team Delta', position: 4 },
        { id: 'echo', name: 'Team Echo', position: 5 },
        { id: 'foxtrot', name: 'Team Foxtrot', position: 6 },
        { id: 'golf', name: 'Team Golf', position: 7 },
        { id: 'hotel', name: 'Team Hotel', position: 8 }
      ]
      console.log('🎯 Using sample teams for consistent bracket display')
    }

    // Ensure we have 8 teams for complete bracket
    while (teams.length < 8) {
      teams.push({ 
        id: `placeholder-${teams.length + 1}`, 
        name: `Team ${teams.length + 1}`, 
        position: teams.length + 1 
      })
    }

    // Generate complete bracket with real admin states
    const matches = []
    const paddedTeams = teams.slice(0, 8)

    // Helper function to get match state and determine teams based on progression
    const getMatchData = (matchId: string, defaultTeam1: any, defaultTeam2: any) => {
      const state = combinedStates.get(matchId)
      
      // Determine actual teams based on previous match results
      let team1 = defaultTeam1
      let team2 = defaultTeam2
      
      // Team progression logic
      if (matchId.startsWith('WB-S')) {
        // Winner Bracket Semifinals - get winners from quarters
        const matchNum = parseInt(matchId.split('WB-S')[1])
        if (matchNum === 1) {
          const winner1 = getWinnerFromMatch('WB-Q1', new Set())
          const winner2 = getWinnerFromMatch('WB-Q2', new Set())
          team1 = winner1 || { id: 'wb-q1-winner', name: 'TBD' }
          team2 = winner2 || { id: 'wb-q2-winner', name: 'TBD' }
        } else if (matchNum === 2) {
          const winner1 = getWinnerFromMatch('WB-Q3', new Set())
          const winner2 = getWinnerFromMatch('WB-Q4', new Set())
          team1 = winner1 || { id: 'wb-q3-winner', name: 'TBD' }
          team2 = winner2 || { id: 'wb-q4-winner', name: 'TBD' }
        }
      } else if (matchId === 'WB-F') {
        // Winner Bracket Final - get winners from semis
        const winner1 = getWinnerFromMatch('WB-S1', new Set())
        const winner2 = getWinnerFromMatch('WB-S2', new Set())
        team1 = winner1 || { id: 'wb-s1-winner', name: 'TBD' }
        team2 = winner2 || { id: 'wb-s2-winner', name: 'TBD' }
      } else if (matchId.startsWith('LB-1-')) {
        // Loser Bracket Round 1 - get losers from quarters
        const matchNum = parseInt(matchId.split('LB-1-')[1])
        if (matchNum === 1) {
          const loser1 = getLoserFromMatch('WB-Q1', new Set())
          const loser2 = getLoserFromMatch('WB-Q2', new Set())
          team1 = loser1 || { id: 'wb-q1-loser', name: 'TBD' }
          team2 = loser2 || { id: 'wb-q2-loser', name: 'TBD' }
        } else if (matchNum === 2) {
          const loser1 = getLoserFromMatch('WB-Q3', new Set())
          const loser2 = getLoserFromMatch('WB-Q4', new Set())
          team1 = loser1 || { id: 'wb-q3-loser', name: 'TBD' }
          team2 = loser2 || { id: 'wb-q4-loser', name: 'TBD' }
        }
      } else if (matchId.startsWith('LB-2-')) {
        // Loser Bracket Round 2 - winners from LB-1 vs losers from WB Semis
        const matchNum = parseInt(matchId.split('LB-2-')[1])
        if (matchNum === 1) {
          const winner = getWinnerFromMatch('LB-1-1', new Set())
          const loser = getLoserFromMatch('WB-S1', new Set())
          team1 = winner || { id: 'lb-1-1-winner', name: 'TBD' }
          team2 = loser || { id: 'wb-s1-loser', name: 'TBD' }
        } else if (matchNum === 2) {
          const winner = getWinnerFromMatch('LB-1-2', new Set())
          const loser = getLoserFromMatch('WB-S2', new Set())
          team1 = winner || { id: 'lb-1-2-winner', name: 'TBD' }
          team2 = loser || { id: 'wb-s2-loser', name: 'TBD' }
        }
      } else if (matchId === 'LB-3') {
        // Loser Bracket Round 3 (Semifinal) - winners from LB-2
        const winner1 = getWinnerFromMatch('LB-2-1', new Set())
        const winner2 = getWinnerFromMatch('LB-2-2', new Set())
        team1 = winner1 || { id: 'lb-2-1-winner', name: 'TBD' }
        team2 = winner2 || { id: 'lb-2-2-winner', name: 'TBD' }
      } else if (matchId === 'LB-F') {
        // Loser Bracket Final - winner from LB-3 vs loser from WB Final
        const winner = getWinnerFromMatch('LB-3', new Set())
        const loser = getLoserFromMatch('WB-F', new Set())
        team1 = winner || { id: 'lb-3-winner', name: 'TBD' }
        team2 = loser || { id: 'wb-f-loser', name: 'TBD' }
      } else if (matchId === 'GF') {
        // Grand Final - winner from WB Final vs winner from LB Final
        const wbWinner = getWinnerFromMatch('WB-F', new Set())
        const lbWinner = getWinnerFromMatch('LB-F', new Set())
        team1 = wbWinner || { id: 'wb-f-winner', name: 'TBD' }
        team2 = lbWinner || { id: 'lb-f-winner', name: 'TBD' }
      }
      
      return {
        id: matchId,
        team1: team1,
        team2: team2,
        team1Score: state?.team1Score || 0,
        team2Score: state?.team2Score || 0,
        isLive: state?.isLive || false,
        isFinished: state?.isFinished || false,
        winnerId: state?.winnerId || null
      }
    }
    
    // Helper function to get winner from a finished match
    const getWinnerFromMatch = (matchId: string, visited = new Set()): any => {
      // Prevent infinite recursion
      if (visited.has(matchId)) {
        console.log(`⚠️ Recursion detected for match ${matchId}`)
        return { id: `${matchId}-winner`, name: 'TBD' }
      }
      visited.add(matchId)
      
      const state = combinedStates.get(matchId)
      if (!state || !state.isFinished || !state.winnerId) return null
      
      // For quarter finals, get actual team data (base case)
      if (matchId.startsWith('WB-Q')) {
        const matchNum = parseInt(matchId.split('WB-Q')[1])
        const team1 = paddedTeams[(matchNum - 1) * 2] || { id: `team-${(matchNum - 1) * 2 + 1}`, name: `Team ${(matchNum - 1) * 2 + 1}` }
        const team2 = paddedTeams[(matchNum - 1) * 2 + 1] || { id: `team-${(matchNum - 1) * 2 + 2}`, name: `Team ${(matchNum - 1) * 2 + 2}` }
        
        if (state.winnerId === 'team1') return team1
        if (state.winnerId === 'team2') return team2
      }
      
      // For all other matches, recursively find the actual team
      return getActualTeamFromMatch(matchId, state.winnerId, visited)
    }
    
    // Helper function to get loser from a finished match
    const getLoserFromMatch = (matchId: string, visited = new Set()): any => {
      // Prevent infinite recursion
      if (visited.has(matchId)) {
        console.log(`⚠️ Recursion detected for match ${matchId}`)
        return { id: `${matchId}-loser`, name: 'TBD' }
      }
      visited.add(matchId)
      
      const state = combinedStates.get(matchId)
      if (!state || !state.isFinished || !state.winnerId) return null
      
      // For quarter finals, get actual team data (base case)
      if (matchId.startsWith('WB-Q')) {
        const matchNum = parseInt(matchId.split('WB-Q')[1])
        const team1 = paddedTeams[(matchNum - 1) * 2] || { id: `team-${(matchNum - 1) * 2 + 1}`, name: `Team ${(matchNum - 1) * 2 + 1}` }
        const team2 = paddedTeams[(matchNum - 1) * 2 + 1] || { id: `team-${(matchNum - 1) * 2 + 2}`, name: `Team ${(matchNum - 1) * 2 + 2}` }
        
        if (state.winnerId === 'team1') return team2  // Loser is the opposite
        if (state.winnerId === 'team2') return team1
      }
      
      // For all other matches, recursively find the actual team (opposite of winner)
      const loserPosition = state.winnerId === 'team1' ? 'team2' : 'team1'
      return getActualTeamFromMatch(matchId, loserPosition, visited)
    }
    
    // Helper function to recursively find the actual team name
    const getActualTeamFromMatch = (matchId: string, position: string, visited = new Set()): any => {
      // Prevent infinite recursion
      if (visited.has(`${matchId}-${position}`)) {
        console.log(`⚠️ Recursion detected for ${matchId}-${position}`)
        return { id: `${matchId}-${position}`, name: 'TBD' }
      }
      visited.add(`${matchId}-${position}`)
      
      // Base case: Quarter finals have real teams
      if (matchId.startsWith('WB-Q')) {
        const matchNum = parseInt(matchId.split('WB-Q')[1])
        const team1 = paddedTeams[(matchNum - 1) * 2] || { id: `team-${(matchNum - 1) * 2 + 1}`, name: `Team ${(matchNum - 1) * 2 + 1}` }
        const team2 = paddedTeams[(matchNum - 1) * 2 + 1] || { id: `team-${(matchNum - 1) * 2 + 2}`, name: `Team ${(matchNum - 1) * 2 + 2}` }
        
        if (position === 'team1') return team1
        if (position === 'team2') return team2
      }
      
      // For non-quarter final matches, trace back to the source
      try {
        if (matchId === 'WB-S1') {
          if (position === 'team1') return getWinnerFromMatch('WB-Q1', new Set(visited))
          if (position === 'team2') return getWinnerFromMatch('WB-Q2', new Set(visited))
        } else if (matchId === 'WB-S2') {
          if (position === 'team1') return getWinnerFromMatch('WB-Q3', new Set(visited))
          if (position === 'team2') return getWinnerFromMatch('WB-Q4', new Set(visited))
        } else if (matchId === 'WB-F') {
          if (position === 'team1') return getWinnerFromMatch('WB-S1', new Set(visited))
          if (position === 'team2') return getWinnerFromMatch('WB-S2', new Set(visited))
        } else if (matchId === 'LB-1-1') {
          if (position === 'team1') return getLoserFromMatch('WB-Q1', new Set(visited))
          if (position === 'team2') return getLoserFromMatch('WB-Q2', new Set(visited))
        } else if (matchId === 'LB-1-2') {
          if (position === 'team1') return getLoserFromMatch('WB-Q3', new Set(visited))
          if (position === 'team2') return getLoserFromMatch('WB-Q4', new Set(visited))
        } else if (matchId === 'LB-2-1') {
          if (position === 'team1') return getWinnerFromMatch('LB-1-1', new Set(visited))
          if (position === 'team2') return getLoserFromMatch('WB-S1', new Set(visited))
        } else if (matchId === 'LB-2-2') {
          if (position === 'team1') return getWinnerFromMatch('LB-1-2', new Set(visited))
          if (position === 'team2') return getLoserFromMatch('WB-S2', new Set(visited))
        } else if (matchId === 'LB-3') {
          if (position === 'team1') return getWinnerFromMatch('LB-2-1', new Set(visited))
          if (position === 'team2') return getWinnerFromMatch('LB-2-2', new Set(visited))
        } else if (matchId === 'LB-F') {
          if (position === 'team1') return getWinnerFromMatch('LB-3', new Set(visited))
          if (position === 'team2') return getLoserFromMatch('WB-F', new Set(visited))
        } else if (matchId === 'GF') {
          if (position === 'team1') return getWinnerFromMatch('WB-F', new Set(visited))
          if (position === 'team2') return getWinnerFromMatch('LB-F', new Set(visited))
        }
      } catch (error) {
        console.log(`⚠️ Error in getActualTeamFromMatch for ${matchId}-${position}:`, error)
        return { id: `${matchId}-${position}`, name: 'TBD' }
      }
      
      // Fallback
      return { id: `${matchId}-${position}`, name: 'TBD' }
    }

    // WINNER BRACKET - Quarterfinals (REAL TEAMS)
    for (let i = 0; i < 4; i++) {
      const team1 = paddedTeams[i * 2] || { id: `team-${i * 2 + 1}`, name: `Team ${i * 2 + 1}` }
      const team2 = paddedTeams[i * 2 + 1] || { id: `team-${i * 2 + 2}`, name: `Team ${i * 2 + 2}` }
      
      console.log(`🏆 Quarter ${i + 1}: ${team1.name} vs ${team2.name}`)
      
      // Use simple match data for quarters since teams are fixed
      const state = combinedStates.get(`WB-Q${i + 1}`)
      const matchData = {
        id: `WB-Q${i + 1}`,
        team1: team1,
        team2: team2,
        team1Score: state?.team1Score || 0,
        team2Score: state?.team2Score || 0,
        isLive: state?.isLive || false,
        isFinished: state?.isFinished || false,
        winnerId: state?.winnerId || null
      }
      
      matches.push({
        ...matchData,
        round: 'Quarterfinals',
        bracket: 'winner'
      })
    }

    // WINNER BRACKET - Semifinals (TBD until quarters finish)
    for (let i = 0; i < 2; i++) {
      const matchData = getMatchData(`WB-S${i + 1}`, 
        { id: 'tbd', name: 'TBD' },  // Will be determined by getMatchData logic
        { id: 'tbd', name: 'TBD' }
      )
      matches.push({
        ...matchData,
        round: 'Semifinals',
        bracket: 'winner'
      })
    }

    // WINNER BRACKET - Final (TBD until semis finish)
    const wbFinalData = getMatchData('WB-F',
      { id: 'tbd', name: 'TBD' },  // Will be determined by getMatchData logic
      { id: 'tbd', name: 'TBD' }
    )
    matches.push({
      ...wbFinalData,
      round: 'Winner Final',
      bracket: 'winner'
    })

    // LOSER BRACKET - First Round (TBD until quarters finish)
    for (let i = 0; i < 2; i++) {
      const matchData = getMatchData(`LB-1-${i + 1}`,
        { id: 'tbd', name: 'TBD' },  // Will be determined by getMatchData logic
        { id: 'tbd', name: 'TBD' }
      )
      matches.push({
        ...matchData,
        round: 'Loser Round 1',
        bracket: 'loser'
      })
    }

    // LOSER BRACKET - Second Round (TBD until LB-1 and WB semis finish)
    for (let i = 0; i < 2; i++) {
      const matchData = getMatchData(`LB-2-${i + 1}`,
        { id: 'tbd', name: 'TBD' },  // Will be determined by getMatchData logic
        { id: 'tbd', name: 'TBD' }
      )
      matches.push({
        ...matchData,
        round: 'Loser Round 2',
        bracket: 'loser'
      })
    }

    // LOSER BRACKET - Semifinal (RUNDE 6 - LB Round 3) (TBD until LB-2 finishes)
    const lbSemiData = getMatchData('LB-3',  // Changed from LB-S to LB-3 to match admin
      { id: 'tbd', name: 'TBD' },  // Will be determined by getMatchData logic
      { id: 'tbd', name: 'TBD' }
    )
    matches.push({
      ...lbSemiData,
      round: 'Loser Semifinal',
      bracket: 'loser'
    })

    // LOSER BRACKET - Final (TBD until LB-3 and WB Final finish)
    const lbFinalData = getMatchData('LB-F',
      { id: 'tbd', name: 'TBD' },  // Will be determined by getMatchData logic
      { id: 'tbd', name: 'TBD' }
    )
    matches.push({
      ...lbFinalData,
      round: 'Loser Final',
      bracket: 'loser'
    })

    // GRAND FINAL (TBD until both finals finish)
    const grandFinalData = getMatchData('GF',
      { id: 'tbd', name: 'TBD' },  // Will be determined by getMatchData logic
      { id: 'tbd', name: 'TBD' }
    )
    matches.push({
      ...grandFinalData,
      round: 'Grand Final',
      bracket: 'final'
    })

    console.log(`✅ Generated ${matches.length} matches with persistent control states`)
    
    return NextResponse.json({
      matches,
      teams: paddedTeams,
      lastUpdated: new Date().toISOString(),
      adminControlled: combinedStates.size > 0,
      persistentMatches: dbMatches.length,
      memoryMatches: memoryStates.size
    })

  } catch (error) {
    console.error('❌ Bracket matches error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch bracket matches',
        matches: [],
        teams: []
      },
      { status: 500 }
    )
  }
}
