import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { setMatchLive } from '@/lib/matchState'

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

    const { matchId, isLive } = await request.json()
    
    if (!matchId || isLive === undefined) {
      return NextResponse.json(
        { error: 'Match ID und Live-Status sind erforderlich' },
        { status: 400 }
      )
    }

    console.log(`🔴 Setting match ${matchId} live status: ${isLive}`)

    // Update in-memory state for immediate response
    const updatedState = setMatchLive(matchId, isLive)
    
    return NextResponse.json({ 
      success: true, 
      message: `Match ${isLive ? 'gestartet' : 'gestoppt'}`,
      matchId,
      isLive,
      state: updatedState
    })

  } catch (error) {
    console.error('Set live status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
