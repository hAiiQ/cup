import { NextResponse } from 'next/server'
import { getAllMatchStates } from '@/lib/matchState'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔄 Fetching live states for admin bracket...')
    
    // Get persistent match states from database
    const dbMatches = await prisma.match.findMany({
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
    
    console.log(`📊 Found ${dbMatches.length} matches in database`)
    
    // Get current in-memory match states as fallback
    const memoryStates = getAllMatchStates()
    console.log(`📊 Found ${memoryStates.size} in-memory match states`)
    
    // Merge database states with in-memory states (database takes priority)
    const states = []
    
    // Add database states
    for (const dbMatch of dbMatches) {
      states.push({
        matchId: dbMatch.id,
        isLive: dbMatch.isLive,
        team1Score: dbMatch.team1Score,
        team2Score: dbMatch.team2Score,
        isFinished: dbMatch.isFinished,
        winnerId: dbMatch.winnerId,
        lastUpdated: dbMatch.updatedAt.getTime(),
        source: 'database'
      })
    }
    
    // Add in-memory states that aren't in database
    Array.from(memoryStates.entries()).forEach(([matchId, memoryState]) => {
      const hasDbState = dbMatches.some(dbMatch => dbMatch.id === matchId)
      if (!hasDbState) {
        states.push({
          matchId,
          ...memoryState,
          source: 'memory'
        })
      }
    })
    
    console.log(`✅ Returning ${states.length} combined match states`)
    
    return NextResponse.json({
      states,
      count: states.length,
      dbCount: dbMatches.length,
      memoryCount: memoryStates.size
    })
    
  } catch (error) {
    console.error('Error fetching live states:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live states' },
      { status: 500 }
    )
  }
}
