import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { setMatchScore } from '@/lib/matchState'

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
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

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
    
    // Determine winner
    const winner = parseInt(team1Score) > parseInt(team2Score) ? 'Team 1' : 
                   parseInt(team2Score) > parseInt(team1Score) ? 'Team 2' : 'Tie'
    console.log(`🏆 Winner: ${winner}`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Match-Ergebnis gespeichert: ${team1Score} - ${team2Score}`,
      winner: winner,
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
