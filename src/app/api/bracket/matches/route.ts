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

    // Helper function to get match state
    const getMatchData = (matchId: string, defaultTeam1: any, defaultTeam2: any) => {
      const state = combinedStates.get(matchId)
      return {
        id: matchId,
        team1: defaultTeam1,
        team2: defaultTeam2,
        team1Score: state?.team1Score || 0,
        team2Score: state?.team2Score || 0,
        isLive: state?.isLive || false,
        isFinished: state?.isFinished || false,
        winnerId: state?.winnerId || null
      }
    }

    // WINNER BRACKET - Quarterfinals (REAL TEAMS)
    for (let i = 0; i < 4; i++) {
      const team1 = paddedTeams[i * 2] || { id: `team-${i * 2 + 1}`, name: `Team ${i * 2 + 1}` }
      const team2 = paddedTeams[i * 2 + 1] || { id: `team-${i * 2 + 2}`, name: `Team ${i * 2 + 2}` }
      
      console.log(`🏆 Quarter ${i + 1}: ${team1.name} vs ${team2.name}`)
      
      const matchData = getMatchData(`WB-Q${i + 1}`, team1, team2)
      matches.push({
        ...matchData,
        round: 'Quarterfinals',
        bracket: 'winner'
      })
    }

    // WINNER BRACKET - Semifinals
    for (let i = 0; i < 2; i++) {
      const matchData = getMatchData(`WB-S${i + 1}`, 
        { id: `wb-q${i * 2 + 1}-winner`, name: `WB Q${i * 2 + 1} Winner` },
        { id: `wb-q${i * 2 + 2}-winner`, name: `WB Q${i * 2 + 2} Winner` }
      )
      matches.push({
        ...matchData,
        round: 'Semifinals',
        bracket: 'winner'
      })
    }

    // WINNER BRACKET - Final
    const wbFinalData = getMatchData('WB-F',
      { id: 'wb-s1-winner', name: 'WB S1 Winner' },
      { id: 'wb-s2-winner', name: 'WB S2 Winner' }
    )
    matches.push({
      ...wbFinalData,
      round: 'Winner Final',
      bracket: 'winner'
    })

    // LOSER BRACKET - First Round
    for (let i = 0; i < 2; i++) {
      const matchData = getMatchData(`LB-1-${i + 1}`,
        { id: `wb-q${i * 2 + 1}-loser`, name: `WB Q${i * 2 + 1} Loser` },
        { id: `wb-q${i * 2 + 2}-loser`, name: `WB Q${i * 2 + 2} Loser` }
      )
      matches.push({
        ...matchData,
        round: 'Loser Round 1',
        bracket: 'loser'
      })
    }

    // LOSER BRACKET - Second Round
    for (let i = 0; i < 2; i++) {
      const matchData = getMatchData(`LB-2-${i + 1}`,
        { id: `lb-1-${i + 1}-winner`, name: `LB 1-${i + 1} Winner` },
        { id: `wb-s${i + 1}-loser`, name: `WB S${i + 1} Loser` }
      )
      matches.push({
        ...matchData,
        round: 'Loser Round 2',
        bracket: 'loser'
      })
    }

    // LOSER BRACKET - Semifinal
    const lbSemiData = getMatchData('LB-S',
      { id: 'lb-2-1-winner', name: 'LB 2-1 Winner' },
      { id: 'lb-2-2-winner', name: 'LB 2-2 Winner' }
    )
    matches.push({
      ...lbSemiData,
      round: 'Loser Semifinal',
      bracket: 'loser'
    })

    // LOSER BRACKET - Final
    const lbFinalData = getMatchData('LB-F',
      { id: 'lb-s-winner', name: 'LB Semi Winner' },
      { id: 'wb-f-loser', name: 'WB Final Loser' }
    )
    matches.push({
      ...lbFinalData,
      round: 'Loser Final',
      bracket: 'loser'
    })

    // GRAND FINAL
    const grandFinalData = getMatchData('GF',
      { id: 'wb-f-winner', name: 'WB Final Winner' },
      { id: 'lb-f-winner', name: 'LB Final Winner' }
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
