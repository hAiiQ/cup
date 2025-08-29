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
          team1 = getWinnerFromMatch('WB-Q1') || { id: 'tbd-1', name: 'TBD' }
          team2 = getWinnerFromMatch('WB-Q2') || { id: 'tbd-2', name: 'TBD' }
        } else if (matchNum === 2) {
          team1 = getWinnerFromMatch('WB-Q3') || { id: 'tbd-3', name: 'TBD' }
          team2 = getWinnerFromMatch('WB-Q4') || { id: 'tbd-4', name: 'TBD' }
        }
      } else if (matchId === 'WB-F') {
        // Winner Bracket Final - get winners from semis
        team1 = getWinnerFromMatch('WB-S1') || { id: 'tbd-5', name: 'TBD' }
        team2 = getWinnerFromMatch('WB-S2') || { id: 'tbd-6', name: 'TBD' }
      } else if (matchId.startsWith('LB-1-')) {
        // Loser Bracket Round 1 - get losers from quarters
        const matchNum = parseInt(matchId.split('LB-1-')[1])
        if (matchNum === 1) {
          team1 = getLoserFromMatch('WB-Q1') || { id: 'tbd-7', name: 'TBD' }
          team2 = getLoserFromMatch('WB-Q2') || { id: 'tbd-8', name: 'TBD' }
        } else if (matchNum === 2) {
          team1 = getLoserFromMatch('WB-Q3') || { id: 'tbd-9', name: 'TBD' }
          team2 = getLoserFromMatch('WB-Q4') || { id: 'tbd-10', name: 'TBD' }
        }
      } else if (matchId.startsWith('LB-2-')) {
        // Loser Bracket Round 2 - winners from LB-1 vs losers from WB Semis
        const matchNum = parseInt(matchId.split('LB-2-')[1])
        if (matchNum === 1) {
          team1 = getWinnerFromMatch('LB-1-1') || { id: 'tbd-11', name: 'TBD' }
          team2 = getLoserFromMatch('WB-S1') || { id: 'tbd-12', name: 'TBD' }
        } else if (matchNum === 2) {
          team1 = getWinnerFromMatch('LB-1-2') || { id: 'tbd-13', name: 'TBD' }
          team2 = getLoserFromMatch('WB-S2') || { id: 'tbd-14', name: 'TBD' }
        }
      } else if (matchId === 'LB-3') {
        // Loser Bracket Round 3 (Semifinal) - winners from LB-2
        team1 = getWinnerFromMatch('LB-2-1') || { id: 'tbd-15', name: 'TBD' }
        team2 = getWinnerFromMatch('LB-2-2') || { id: 'tbd-16', name: 'TBD' }
      } else if (matchId === 'LB-F') {
        // Loser Bracket Final - winner from LB-3 vs loser from WB Final
        team1 = getWinnerFromMatch('LB-3') || { id: 'tbd-17', name: 'TBD' }
        team2 = getLoserFromMatch('WB-F') || { id: 'tbd-18', name: 'TBD' }
      } else if (matchId === 'GF') {
        // Grand Final - winner from WB Final vs winner from LB Final
        team1 = getWinnerFromMatch('WB-F') || { id: 'tbd-19', name: 'TBD' }
        team2 = getWinnerFromMatch('LB-F') || { id: 'tbd-20', name: 'TBD' }
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
    const getWinnerFromMatch = (matchId: string) => {
      const state = combinedStates.get(matchId)
      if (!state || !state.isFinished || !state.winnerId) return null
      
      // For quarter finals, get actual team data
      if (matchId.startsWith('WB-Q')) {
        const matchNum = parseInt(matchId.split('WB-Q')[1])
        const team1 = paddedTeams[(matchNum - 1) * 2] || { id: `team-${(matchNum - 1) * 2 + 1}`, name: `Team ${(matchNum - 1) * 2 + 1}` }
        const team2 = paddedTeams[(matchNum - 1) * 2 + 1] || { id: `team-${(matchNum - 1) * 2 + 2}`, name: `Team ${(matchNum - 1) * 2 + 2}` }
        
        if (state.winnerId === 'team1') return team1
        if (state.winnerId === 'team2') return team2
      }
      
      // For other matches, return placeholder winner
      return { id: `${matchId}-winner`, name: `${matchId} Winner` }
    }
    
    // Helper function to get loser from a finished match
    const getLoserFromMatch = (matchId: string) => {
      const state = combinedStates.get(matchId)
      if (!state || !state.isFinished || !state.winnerId) return null
      
      // For quarter finals, get actual team data
      if (matchId.startsWith('WB-Q')) {
        const matchNum = parseInt(matchId.split('WB-Q')[1])
        const team1 = paddedTeams[(matchNum - 1) * 2] || { id: `team-${(matchNum - 1) * 2 + 1}`, name: `Team ${(matchNum - 1) * 2 + 1}` }
        const team2 = paddedTeams[(matchNum - 1) * 2 + 1] || { id: `team-${(matchNum - 1) * 2 + 2}`, name: `Team ${(matchNum - 1) * 2 + 2}` }
        
        if (state.winnerId === 'team1') return team2  // Loser is the opposite
        if (state.winnerId === 'team2') return team1
      }
      
      // For other matches, return placeholder loser
      return { id: `${matchId}-loser`, name: `${matchId} Loser` }
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
