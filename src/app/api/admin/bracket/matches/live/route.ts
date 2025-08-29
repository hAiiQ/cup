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
    console.log('🔴 Live status toggle request received')
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

    const { matchId, isLive } = await request.json()
    
    if (!matchId || isLive === undefined) {
      return NextResponse.json(
        { error: 'Match ID und Live-Status sind erforderlich' },
        { status: 400 }
      )
    }

    console.log(`🔴 Setting match ${matchId} live status: ${isLive}`)

    // PERSISTENT DATABASE UPDATE with fallback
    let dbSuccess = false
    try {
      // First try to update existing match
      let match = await prisma.match.findUnique({
        where: { id: matchId }
      })

      if (match) {
        // Update existing match in database
        match = await prisma.match.update({
          where: { id: matchId },
          data: { 
            isLive,
            updatedAt: new Date()
          }
        })
        console.log('✅ Updated existing match in database:', matchId, 'isLive:', isLive)
      } else {
        // Create new match record if it doesn't exist
        match = await prisma.match.create({
          data: {
            id: matchId,
            round: 1, // Default values, will be updated later
            bracket: 'winner',
            isLive,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log('✅ Created new match in database:', matchId, 'isLive:', isLive)
      }
      dbSuccess = true
    } catch (dbError) {
      console.log('⚠️ Database update failed, using in-memory only:', dbError instanceof Error ? dbError.message : String(dbError))
    }

    // Also update in-memory state for immediate response
    const updatedState = setMatchLive(matchId, isLive)
    console.log('📝 Updated in-memory state:', updatedState)
    
    return NextResponse.json({ 
      success: true, 
      message: `Match ${isLive ? 'gestartet' : 'gestoppt'}`,
      matchId,
      isLive,
      state: updatedState,
      persistent: dbSuccess,
      dbStatus: dbSuccess ? 'saved' : 'memory-only'
    })

  } catch (error) {
    console.error('Set live status error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
