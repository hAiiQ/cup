import { NextResponse } from 'next/server'
import { getAllMatchStates, determineWinnerSlot, type MatchState } from '@/lib/matchState'
import { prisma } from '@/lib/prisma'
import { buildBracketMatches, type BracketTeam } from '@/lib/bracketStructure'
import { MAX_TEAMS } from '@/lib/teamDefaults'

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
    const combinedStates = new Map<string, MatchState>()
    
    // Add database states first (higher priority) if available
    if (dbMatches.length > 0) {
      for (const dbMatch of dbMatches) {
        const team1Score = dbMatch.team1Score || 0
        const team2Score = dbMatch.team2Score || 0
        const derivedWinner = determineWinnerSlot(dbMatch.id, team1Score, team2Score)

        combinedStates.set(dbMatch.id, {
          isLive: dbMatch.isLive,
          team1Score,
          team2Score,
          isFinished: dbMatch.isFinished || false,
          winnerId: dbMatch.winnerId || derivedWinner,
          lastUpdated: dbMatch.updatedAt?.getTime() || Date.now(),
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
    
    // Load teams and build bracket
    let dbTeams: BracketTeam[] = []
    try {
      console.log('🔍 Fetching teams for bracket...')
      const teamsFromDB = await prisma.team.findMany({
        orderBy: { position: 'asc' },
        take: MAX_TEAMS
      })

      dbTeams = teamsFromDB.map(team => ({
        id: team.id,
        name: team.name,
        position: team.position || 0
      }))

      console.log(`📋 Loaded ${dbTeams.length} teams from database`)
    } catch (error) {
      console.log('💡 Database fetch error, falling back to placeholder teams:', error)
    }

    const { matches, layout, connections, slotCount } = buildBracketMatches(dbTeams, combinedStates)

    console.log(`✅ Generated ${matches.length} matches for a ${slotCount}-slot bracket`)
    
    return NextResponse.json({
      matches,
      layout,
      connections,
      slotCount,
      teams: dbTeams,
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
        teams: [],
        layout: [],
        connections: [],
        slotCount: 0
      },
      { status: 500 }
    )
  }
}
