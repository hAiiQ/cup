import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { clearMatchState, determineWinnerSlot, setMatchScore } from '@/lib/matchState'

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

    const parsedTeam1Score = Number(team1Score)
    const parsedTeam2Score = Number(team2Score)
    const scoresAreValid =
      Number.isInteger(parsedTeam1Score) &&
      Number.isInteger(parsedTeam2Score) &&
      parsedTeam1Score >= 0 &&
      parsedTeam2Score >= 0 &&
      parsedTeam1Score <= 99 &&
      parsedTeam2Score <= 99

    if (!scoresAreValid) {
      return NextResponse.json(
        { error: 'Die Rundenscores müssen zwischen 0 und 99 liegen.' },
        { status: 400 }
      )
    }

    if (!determineWinnerSlot(matchId, parsedTeam1Score, parsedTeam2Score)) {
      return NextResponse.json(
        { error: 'Das Ergebnis darf nicht unentschieden sein.' },
        { status: 400 }
      )
    }

    console.log(`🏆 Updating match ${matchId}: ${parsedTeam1Score} - ${parsedTeam2Score}`)

    const { bracket, round } = getBracketMeta(matchId)
    const now = new Date()

    // An admin correction is authoritative. Remove any older IGL report so its
    // winner cannot override the corrected score when the bracket is rebuilt.
    await prisma.$transaction([
      prisma.match.upsert({
        where: { id: matchId },
        update: {
          team1Score: parsedTeam1Score,
          team2Score: parsedTeam2Score,
          isFinished: true,
          isLive: false,
          winnerId: null,
          playedAt: now,
          updatedAt: now
        },
        create: {
          id: matchId,
          bracket,
          round,
          matchNumber: 1,
          team1Score: parsedTeam1Score,
          team2Score: parsedTeam2Score,
          isFinished: true,
          isLive: false,
          playedAt: now
        }
      }),
      prisma.matchResultReport.deleteMany({ where: { matchId } })
    ])

    const updatedState = setMatchScore(matchId, parsedTeam1Score, parsedTeam2Score)
    console.log('💾 Corrected match state persisted to database:', updatedState)
    
    // Determine winner
    return NextResponse.json({ 
      success: true, 
      message: `Match-Ergebnis gespeichert: ${parsedTeam1Score} - ${parsedTeam2Score}`,
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

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const { matchId } = await request.json().catch(() => ({}))
    if (!matchId || typeof matchId !== 'string') {
      return NextResponse.json({ error: 'Match ID ist erforderlich' }, { status: 400 })
    }

    const { bracket, round } = getBracketMeta(matchId)
    await prisma.$transaction([
      prisma.match.upsert({
        where: { id: matchId },
        update: {
          team1Score: 0,
          team2Score: 0,
          winnerId: null,
          isFinished: false,
          isLive: false,
          mapName: null,
          playedAt: null,
          updatedAt: new Date()
        },
        create: {
          id: matchId,
          bracket,
          round,
          matchNumber: 1,
          team1Score: 0,
          team2Score: 0,
          isFinished: false,
          isLive: false
        }
      }),
      prisma.matchResultReport.deleteMany({ where: { matchId } })
    ])

    clearMatchState(matchId)

    return NextResponse.json({
      success: true,
      message: 'Match wurde zurückgesetzt.',
      matchId
    })
  } catch (error) {
    console.error('Reset match error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Match konnte nicht zurückgesetzt werden.' },
      { status: 500 }
    )
  }
}
