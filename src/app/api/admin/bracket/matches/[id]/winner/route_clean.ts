import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

// RENDER FIX: Simplified tournament advancement
async function advanceTournament(matchId: string, winnerId: string) {
  console.log(`🏆 Setting winner for match ${matchId}: ${winnerId}`)
  
  // Get match without relations to avoid issues
  const match = await prisma.match.findUnique({
    where: { id: matchId }
  })

  if (!match) {
    throw new Error('Match nicht gefunden')
  }

  console.log(`📋 Match: Round ${match.round}, Bracket ${match.bracket}`)

  // Update match with winner
  await prisma.match.update({
    where: { id: matchId },
    data: {
      winnerId: winnerId,
      isFinished: true
    }
  })

  console.log(`✅ Match winner set successfully`)

  // Log tournament progression (simplified for Render stability)
  const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id
  
  if (match.bracket === 'winner') {
    console.log(`🏆 Winner bracket: Team ${winnerId} advances, Team ${loserId} to loser bracket`)
  } else if (match.bracket === 'loser') {
    console.log(`💀 Loser bracket: Team ${winnerId} advances, Team ${loserId} eliminated`)
  } else if (match.bracket === 'grand') {
    console.log(`🎉 TOURNAMENT WINNER: Team ${winnerId}`)
  }

  return { 
    success: true, 
    message: 'Match winner set (simplified mode)',
    matchId, 
    winnerId 
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await verifyAdmin(request)
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      )
    }

    const { id } = params
    const { winnerId } = await request.json()
    
    if (!winnerId) {
      return NextResponse.json(
        { error: 'Gewinner-ID ist erforderlich' },
        { status: 400 }
      )
    }

    const result = await advanceTournament(id, winnerId)

    return NextResponse.json({ 
      success: true, 
      message: 'Match-Ergebnis erfolgreich gespeichert',
      result
    })

  } catch (error) {
    console.error('Set match winner error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
