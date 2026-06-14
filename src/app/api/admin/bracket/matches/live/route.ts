import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getMatchState, setMatchLive } from '@/lib/matchState'
import { getRandomValorantMap } from '@/lib/valorantMaps'

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

const getBracketMeta = (matchId: string) => {
  if (matchId === 'GF') {
    return { bracket: 'grand', round: 6 }
  }

  const roundRegex = matchId.match(/R(\d+)/)
  const round = roundRegex ? parseInt(roundRegex[1], 10) : 1

  if (matchId.startsWith('GP-')) {
    return { bracket: 'group', round }
  }

  if (matchId.startsWith('LB')) {
    return { bracket: 'loser', round }
  }

  return { bracket: 'winner', round }
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
    let mapName: string | undefined
    try {
      // First try to update existing match
      let match = await prisma.match.findUnique({
        where: { id: matchId }
      })

      const { bracket, round } = getBracketMeta(matchId)
      mapName = match?.mapName || getMatchState(matchId).mapName || (isLive ? getRandomValorantMap() : undefined)

      if (match) {
        // Update existing match in database
        match = await prisma.match.update({
          where: { id: matchId },
          data: { 
            isLive,
            ...(isLive ? { isFinished: false } : {}),
            ...(mapName ? { mapName } : {}),
            updatedAt: new Date()
          }
        })
        console.log('✅ Updated existing match in database:', matchId, 'isLive:', isLive)
      } else {
        // Create new match record if it doesn't exist
        match = await prisma.match.create({
          data: {
            id: matchId,
            round,
            bracket,
            matchNumber: 1,
            isLive,
            isFinished: false,
            mapName,
            team1Score: 0,
            team2Score: 0,
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
    if (isLive && !mapName) {
      mapName = getRandomValorantMap()
    }
    const updatedState = setMatchLive(matchId, isLive, mapName)
    console.log('📝 Updated in-memory state:', updatedState)
    
    return NextResponse.json({ 
      success: true, 
      message: `Match ${isLive ? 'gestartet' : 'gestoppt'}`,
      matchId,
      isLive,
      mapName,
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
