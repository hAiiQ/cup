import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🔄 Fetching matches for bracket...')
    
    // RENDER FIX: First try without relations to avoid potential issues
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
      
      console.log(`✅ Successfully fetched ${matches.length} matches with relations`)
      return NextResponse.json({ matches })
      
    } catch (relationError) {
      console.log('⚠️ Relations failed, trying basic match fetch:', relationError)
      
      // Fallback: Get matches without relations
      const basicMatches = await prisma.match.findMany({
        orderBy: [
          { bracket: 'asc' },
          { round: 'asc' }
        ]
      })
      
      // Transform to include empty team objects
      const transformedMatches = basicMatches.map(match => ({
        ...match,
        team1: match.team1Id ? { id: match.team1Id, name: 'Team Loading...' } : null,
        team2: match.team2Id ? { id: match.team2Id, name: 'Team Loading...' } : null,
        winner: match.winnerId ? { id: match.winnerId, name: 'Winner Loading...' } : null
      }))
      
      console.log(`✅ Fallback: fetched ${basicMatches.length} matches without relations`)
      return NextResponse.json({ matches: transformedMatches })
    }

  } catch (error) {
    console.error('Matches fetch error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
