import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🔍 Debug: Fetching matches...')
    
    // RENDER FIX: Try with relations first, fallback to basic query
    try {
      const matches = await prisma.match.findMany({
        include: {
          team1: true,
          team2: true,
          winner: true
        },
        orderBy: [
          { bracket: 'asc' },
          { round: 'asc' }
        ]
      })

      return NextResponse.json({ 
        debug: true,
        matchCount: matches.length,
        withRelations: true,
        matches: matches.map(m => ({
          id: m.id,
          bracket: m.bracket,
          round: m.round,
          team1Name: m.team1?.name || 'NULL',
          team2Name: m.team2?.name || 'NULL',
          winnerName: m.winner?.name || 'NULL',
          hasScore: (m as any).team1Score > 0 || (m as any).team2Score > 0
        }))
      })
      
    } catch (relationError) {
      console.log('⚠️ Debug: Relations failed, using basic query')
      
      const basicMatches = await prisma.match.findMany({
        orderBy: [
          { bracket: 'asc' },
          { round: 'asc' }
        ]
      })

      return NextResponse.json({ 
        debug: true,
        matchCount: basicMatches.length,
        withRelations: false,
        note: 'Relations not available - using basic match data',
        matches: basicMatches.map(m => ({
          id: m.id,
          bracket: m.bracket,
          round: m.round,
          team1Id: m.team1Id || 'NULL',
          team2Id: m.team2Id || 'NULL',
          winnerId: m.winnerId || 'NULL',
          hasScore: (m as any).team1Score > 0 || (m as any).team2Score > 0
        }))
      })
    }

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug error' },
      { status: 500 }
    )
  }
}
