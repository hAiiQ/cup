import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { setMatchScore } from '@/lib/matchState'

const getBracketMeta = (matchId: string) => {
  if (matchId === 'GF') {
    return { bracket: 'grand', round: 6 }
  }

  const roundRegex = matchId.match(/R(\d+)/)
  const round = roundRegex ? parseInt(roundRegex[1], 10) : 1

  if (matchId.startsWith('LB')) {
    return { bracket: 'loser', round }
  }

  return { bracket: 'winner', round }
}

// Helper function to verify admin
async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value
  
  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded || !decoded.userId.startsWith('admin_')) {
    return null
  }

  const adminId = decoded.userId.replace('admin_', '')
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  })

  return admin
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🏆 Score update request received')
    console.log('🔑 Checking admin authentication...')
    
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      console.log('❌ Admin verification failed - not authorized')
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    console.log('✅ Admin verified successfully:', admin.username)

    const { matchId, team1Score, team2Score } = await request.json()
    
    if (!matchId || team1Score === undefined || team2Score === undefined) {
      return NextResponse.json(
        { error: 'Match ID und Scores sind erforderlich' },
        { status: 400 }
      )
    }

    console.log(`🏆 Updating match ${matchId}: ${team1Score} - ${team2Score}`)

    // Update in-memory state for immediate response
    const updatedState = setMatchScore(matchId, parseInt(team1Score), parseInt(team2Score))
    console.log('📝 Updated match state:', updatedState)

    // Persist scores and status
    try {
      const { bracket, round } = getBracketMeta(matchId)
      await prisma.match.upsert({
        where: { id: matchId },
        update: {
          team1Score: updatedState.team1Score,
          team2Score: updatedState.team2Score,
          isFinished: updatedState.isFinished,
          isLive: updatedState.isLive,
          winnerId: null,
          updatedAt: new Date()
        },
        create: {
          id: matchId,
          bracket,
          round,
          matchNumber: 1,
          team1Score: updatedState.team1Score,
          team2Score: updatedState.team2Score,
          isFinished: updatedState.isFinished,
          isLive: updatedState.isLive
        }
      })
      console.log('💾 Match state persisted to database')
    } catch (dbError) {
      console.error('⚠️ Failed to persist match state:', dbError)
    }
    
    // Determine winner
    return NextResponse.json({ 
      success: true, 
      message: `Match-Ergebnis gespeichert: ${team1Score} - ${team2Score}`,
      matchId: matchId,
      state: updatedState
    })

  } catch (error) {
    console.error('Update match score error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
