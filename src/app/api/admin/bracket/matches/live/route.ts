import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication (same as other admin routes)
    const cookieStore = await cookies()
    const adminToken = cookieStore.get('admin_token')
    
    if (!adminToken) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { matchId, isLive } = body

    if (!matchId || typeof isLive !== 'boolean') {
      return NextResponse.json(
        { error: 'Match ID und Live-Status erforderlich' },
        { status: 400 }
      )
    }

    // Update match live status using raw SQL to avoid TypeScript issues
    await prisma.$executeRaw`UPDATE Match SET isLive = ${isLive} WHERE id = ${matchId}`
    
    // Get updated match
    const updatedMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team1: true,
        team2: true
      }
    })

    console.log(`🔴 Match ${matchId} Live-Status: ${isLive ? 'LIVE' : 'STOPPED'}`)

    return NextResponse.json({ 
      success: true, 
      match: updatedMatch
    })

  } catch (error) {
    console.error('Error updating match live status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
